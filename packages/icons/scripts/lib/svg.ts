import { optimize } from 'svgo'
import type { CustomPlugin } from 'svgo'

interface XastElement {
  type: 'element'
  name: string
  attributes: Record<string, string>
  children: XastChild[]
}
type XastChild = XastElement | { type: string; children?: XastChild[] }
interface XastRoot {
  type: 'root'
  children: XastChild[]
}

export interface ProcessSvgOptions {
  /** Prefix applied to every id so icons cannot clash when inlined in the same page. */
  idPrefix: string
  /** Keep the colors of a single-color icon instead of mapping them to `currentColor`. */
  preserveColors?: boolean
}

export interface ProcessedSvg {
  viewBox: string
  /** Inner markup of the `<svg>` element. */
  body: string
  /** Concrete colors painted by the icon, after optimization and before normalization. */
  colors: string[]
  /** `mono` icons follow `currentColor`; `multi` icons keep their own colors. */
  colorMode: 'mono' | 'multi'
}

/** Thrown with every problem found in one SVG, so a report can list them all at once. */
export class SvgValidationError extends Error {
  readonly problems: string[]

  constructor(problems: string[]) {
    super(problems.join('; '))
    this.name = 'SvgValidationError'
    this.problems = problems
  }
}

const FORBIDDEN_ELEMENTS = new Set([
  'script',
  'foreignObject',
  'iframe',
  'embed',
  'object',
  'image',
  'audio',
  'video',
])
const DRAWABLE_ELEMENTS = new Set([
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'use',
])
const PAINT_SERVER_ELEMENTS = new Set(['linearGradient', 'radialGradient', 'pattern'])
/** Paint inside these elements defines geometry or luminance, never a visible color. */
const NON_PAINTING_CONTAINERS = new Set(['clipPath', 'mask'])
const PAINT_ATTRIBUTES = ['fill', 'stroke'] as const
const PAINT_KEYWORDS = new Set([
  'none',
  'currentcolor',
  'inherit',
  'transparent',
  'context-fill',
  'context-stroke',
])
/** Root attributes that describe the document, not how its content is painted. */
const ROOT_STRUCTURAL_ATTRIBUTES =
  /^(xmlns(:.+)?|viewBox|width|height|version|x|y|id|class|xml:space|preserveAspectRatio)$/

function isElement(node: XastChild): node is XastElement {
  return node.type === 'element'
}

function elementsOf(node: { children?: XastChild[] }): XastElement[] {
  return (node.children ?? []).filter(isElement)
}

function walk(
  node: { children?: XastChild[] },
  visit: (element: XastElement, parent: { children?: XastChild[] }) => void,
): void {
  for (const child of elementsOf(node)) {
    visit(child, node)
    walk(child, visit)
  }
}

function parseViewBox(value: string | undefined): [number, number, number, number] | undefined {
  if (!value) return undefined
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return undefined
  const [x, y, width, height] = parts as [number, number, number, number]
  return width > 0 && height > 0 ? [x, y, width, height] : undefined
}

function normalizeColor(value: string): string {
  const color = value.trim().toLowerCase()
  if (color === 'black' || color === '#000000') return '#000'
  if (color === 'white' || color === '#ffffff') return '#fff'
  return color
}

function isConcreteColor(value: string): boolean {
  const color = value.trim().toLowerCase()
  return color !== '' && !PAINT_KEYWORDS.has(color) && !color.startsWith('url(')
}

/** Reads `fill`/`stroke` from the attribute or, with higher priority, the inline style. */
function readPaint(element: XastElement, attribute: string): string | undefined {
  const style = element.attributes.style
  if (style) {
    const match = new RegExp(`(?:^|;)\\s*${attribute}\\s*:\\s*([^;]+)`, 'i').exec(style)
    if (match) return match[1]!.trim()
  }
  return element.attributes[attribute]
}

function validateSource(root: XastRoot, problems: string[]): void {
  const roots = elementsOf(root)
  const svg = roots[0]
  if (roots.length !== 1 || svg?.name !== 'svg') {
    problems.push('the document must have a single <svg> root element')
    return
  }
  if (!svg.attributes.viewBox) {
    problems.push('missing viewBox')
  } else if (!parseViewBox(svg.attributes.viewBox)) {
    problems.push(`invalid viewBox "${svg.attributes.viewBox}"`)
  }

  walk(root, (element) => {
    if (FORBIDDEN_ELEMENTS.has(element.name)) {
      problems.push(`<${element.name}> is not allowed in an icon`)
    }
    for (const [name, value] of Object.entries(element.attributes)) {
      if (/^on/i.test(name)) {
        problems.push(`event handler attribute "${name}" is not allowed`)
      }
      if ((name === 'href' || name === 'xlink:href') && !value.trim().startsWith('#')) {
        problems.push(`external reference ${name}="${value}" is not allowed`)
      }
    }
  })
}

/**
 * Design tools wrap the artwork in a clip-path that is just a rectangle covering the
 * whole viewBox. The `<svg>` element already clips to that area, so it is dropped.
 */
function removeNoopClipPaths(root: XastRoot): void {
  const svg = elementsOf(root)[0]
  const viewBox = parseViewBox(svg?.attributes.viewBox)
  if (!svg || !viewBox) return
  const [minX, minY, width, height] = viewBox

  const noopIds = new Set<string>()
  walk(root, (element, parent) => {
    if (element.name !== 'clipPath' || !element.attributes.id) return
    const { clipPathUnits, transform } = element.attributes
    if (clipPathUnits || transform) return
    const shapes = elementsOf(element)
    const rect = shapes[0]
    if (shapes.length !== 1 || rect?.name !== 'rect') return
    const attrs = rect.attributes
    if (attrs.transform || attrs.rx || attrs.ry) return
    const x = Number(attrs.x ?? 0)
    const y = Number(attrs.y ?? 0)
    const covers =
      x <= minX &&
      y <= minY &&
      x + Number(attrs.width) >= minX + width &&
      y + Number(attrs.height) >= minY + height
    if (!covers) return
    noopIds.add(element.attributes.id)
    parent.children = parent.children!.filter((child) => child !== element)
  })
  if (noopIds.size === 0) return

  walk(root, (element) => {
    const reference = /^url\(\s*['"]?#([^'")]+)['"]?\s*\)$/.exec(
      element.attributes['clip-path'] ?? '',
    )
    if (reference && noopIds.has(reference[1]!)) delete element.attributes['clip-path']
  })
}

interface PaintAnalysis {
  colors: Set<string>
  /** Gradients, patterns or `url()` paints: the icon is never treated as single-color. */
  hasPaintServer: boolean
  /** Some shape relies on the default black fill instead of declaring a color. */
  hasImplicitFill: boolean
}

function analyzePaint(svg: XastElement): PaintAnalysis {
  const analysis: PaintAnalysis = {
    colors: new Set(),
    hasPaintServer: false,
    hasImplicitFill: false,
  }

  const visit = (
    element: XastElement,
    inherited: { fill: string | undefined; stroke: string },
  ): void => {
    if (NON_PAINTING_CONTAINERS.has(element.name)) return
    if (PAINT_SERVER_ELEMENTS.has(element.name)) {
      analysis.hasPaintServer = true
      return
    }
    const ownFill = readPaint(element, 'fill')
    const ownStroke = readPaint(element, 'stroke')
    const paint = {
      fill: ownFill && ownFill !== 'inherit' ? ownFill : inherited.fill,
      stroke: ownStroke && ownStroke !== 'inherit' ? ownStroke : inherited.stroke,
    }
    if (DRAWABLE_ELEMENTS.has(element.name)) {
      if (paint.fill === undefined) analysis.hasImplicitFill = true
      for (const value of [paint.fill ?? '#000', paint.stroke]) {
        if (value.trim().startsWith('url(')) analysis.hasPaintServer = true
        else if (isConcreteColor(value)) analysis.colors.add(normalizeColor(value))
      }
    }
    for (const child of elementsOf(element)) visit(child, paint)
  }

  visit(svg, { fill: undefined, stroke: 'none' })
  return analysis
}

function useCurrentColor(svg: XastElement): void {
  const visit = (element: XastElement): void => {
    if (NON_PAINTING_CONTAINERS.has(element.name)) return
    for (const attribute of PAINT_ATTRIBUTES) {
      const value = element.attributes[attribute]
      if (value && isConcreteColor(value)) element.attributes[attribute] = 'currentColor'
    }
    if (element.attributes.style) {
      element.attributes.style = element.attributes.style.replace(
        /(^|;)(\s*(?:fill|stroke)\s*:\s*)([^;]+)/gi,
        (match, start: string, property: string, value: string) =>
          isConcreteColor(value) ? `${start}${property}currentColor` : match,
      )
    }
    for (const child of elementsOf(element)) visit(child)
  }
  visit(svg)
}

function wrapChildren(svg: XastElement, attributes: Record<string, string>): void {
  svg.children = [{ type: 'element', name: 'g', attributes, children: svg.children }]
}

/**
 * Optimizes and validates one SVG and returns the markup that goes inside `<svg>`.
 *
 * Only normalizations that cannot change the drawing are applied:
 * - ids are prefixed so inlined icons never clash;
 * - clip-paths equal to the whole viewBox are removed;
 * - single-color icons paint with `currentColor`;
 * - multicolor icons keep every color untouched.
 */
export function processSvg(source: string, options: ProcessSvgOptions): ProcessedSvg {
  const problems: string[] = []
  let analysis: PaintAnalysis | undefined

  const validate: CustomPlugin = {
    name: 'azValidate',
    fn: (root) => {
      validateSource(root as XastRoot, problems)
      return {}
    },
  }

  const dropNoopClipPaths: CustomPlugin = {
    name: 'azRemoveNoopClipPaths',
    fn: (root) => {
      if (problems.length === 0) removeNoopClipPaths(root as XastRoot)
      return {}
    },
  }

  const finalize: CustomPlugin = {
    name: 'azFinalize',
    fn: (root) => {
      const svg = elementsOf(root as XastRoot)[0]
      if (problems.length > 0 || !svg) return {}

      walk(svg, (element) => {
        if (element.name === 'style') {
          problems.push('<style> could not be inlined and would leak into the page')
        }
      })

      analysis = analyzePaint(svg)
      const isMono = !analysis.hasPaintServer && analysis.colors.size <= 1
      if (isMono && !options.preserveColors) {
        useCurrentColor(svg)
      } else if (analysis.hasImplicitFill && readPaint(svg, 'fill') === undefined) {
        // AzIcon sets fill="currentColor" on the root; shapes that relied on the default
        // black must keep it.
        wrapChildren(svg, { fill: '#000' })
      }

      const presentation: Record<string, string> = {}
      for (const [name, value] of Object.entries(svg.attributes)) {
        if (!ROOT_STRUCTURAL_ATTRIBUTES.test(name)) presentation[name] = value
      }
      if (Object.keys(presentation).length > 0) wrapChildren(svg, presentation)
      svg.attributes = { viewBox: svg.attributes.viewBox ?? '' }
      return {}
    },
  }

  // `finalize` is not idempotent, so it runs in its own single pass after the
  // multipass optimization.
  let output: string
  try {
    const optimized = optimize(source, {
      multipass: true,
      plugins: [
        validate,
        dropNoopClipPaths,
        'preset-default',
        { name: 'prefixIds', params: { prefix: options.idPrefix, delim: '-' } },
      ],
    }).data
    output = problems.length > 0 ? '' : optimize(optimized, { plugins: [finalize] }).data
  } catch (error) {
    throw new SvgValidationError([
      `cannot be parsed: ${(error as Error).message.split('\n')[0] ?? 'unknown error'}`,
    ])
  }

  const match = /^<svg viewBox="([^"]*)"(?:\/>|>([\s\S]*)<\/svg>)$/.exec(output)
  if (problems.length === 0) {
    if (!match) {
      problems.push('unexpected output after optimization')
    } else if (
      !match[2] ||
      !/<(path|rect|circle|ellipse|line|polyline|polygon|text|use)\b/.test(match[2])
    ) {
      problems.push('the icon has nothing to draw')
    }
  }
  if (problems.length > 0) throw new SvgValidationError([...new Set(problems)])

  const colors = [...analysis!.colors].sort()
  return {
    viewBox: match![1]!,
    body: match![2]!,
    colors,
    colorMode:
      !analysis!.hasPaintServer && colors.length <= 1 && !options.preserveColors ? 'mono' : 'multi',
  }
}
