// @vitest-environment node
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { GenerationError, generateIcons } from '../scripts/lib/generate.ts'
import type { GenerationReport } from '../scripts/lib/generate.ts'
import { parseIconFileName, toComponentName } from '../scripts/lib/naming.ts'

const fixtures = resolve(import.meta.dirname, 'fixtures')
const sourceSizes = [20, 24]
const temporary: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'az-icons-'))
  temporary.push(dir)
  return dir
}

function snapshot(dir: string): Record<string, string> {
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
  return Object.fromEntries(
    files.map((file) => [file.slice(dir.length + 1), readFileSync(file, 'utf8')]),
  )
}

function failureOf(sourceDir: string, outDir = tempDir()): GenerationReport {
  try {
    generateIcons({ sourceDir, outDir, sourceSizes })
  } catch (error) {
    if (error instanceof GenerationError) return error.report
    throw error
  }
  throw new Error('generation was expected to fail')
}

afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('naming', () => {
  it('derives the public name from the file name', () => {
    expect(parseIconFileName('ui_Sort-down_24.svg')).toEqual({
      file: 'ui_Sort-down_24.svg',
      category: 'ui',
      name: 'sort-down',
      size: 24,
    })
    expect(parseIconFileName('nested/Media_ratio-16-9_64.svg').name).toBe('ratio-16-9')
  })

  it('derives the component name from the public name', () => {
    expect(toComponentName('arrow-right')).toBe('AzArrowRight')
    expect(toComponentName('ratio-16-9')).toBe('AzRatio169')
  })
})

describe('generateIcons', () => {
  it('generates one module per icon, the registry and the name type', () => {
    const outDir = tempDir()
    const report = generateIcons({ sourceDir: join(fixtures, 'valid'), outDir, sourceSizes })
    const files = snapshot(outDir)
    const names = ['clipped', 'fill-only', 'multi-color', 'stroke-only', 'two-tone', 'wide']

    expect(report.icons.map((icon) => icon.name)).toEqual(names)
    expect(Object.keys(files)).toEqual([
      'icon-list.ts',
      'icon-loaders.ts',
      'icon-names.ts',
      ...names.map((name) => `icons/${name}.ts`),
    ])
    for (const name of names) {
      expect(files['icon-names.ts']).toContain(`| '${name}'`)
      expect(files['icon-loaders.ts']).toContain(`'${name}': () => import('./icons/${name}.js'),`)
    }
    expect(files['icon-list.ts']).toContain(`'ui': ['fill-only', 'stroke-only'],`)
  })

  it('never imports an icon statically in the registry', () => {
    const outDir = tempDir()
    generateIcons({ sourceDir: join(fixtures, 'valid'), outDir, sourceSizes })
    const loaders = readFileSync(join(outDir, 'icon-loaders.ts'), 'utf8')

    expect(loaders).not.toMatch(/^import (?!type )/m)
  })

  it('writes every drawing of an icon, keeping a non-standard viewBox', () => {
    const outDir = tempDir()
    generateIcons({ sourceDir: join(fixtures, 'valid'), outDir, sourceSizes })
    const files = snapshot(outDir)

    expect(files['icons/fill-only.ts']).toMatch(/^ {2}20: '<path /m)
    expect(files['icons/fill-only.ts']).toMatch(/^ {2}24: '<path /m)
    expect(files['icons/fill-only.ts']).toContain('const AzFillOnly: AzIconData')
    expect(files['icons/wide.ts']).toContain(`20: ['0 0 40 20', '<path `)
  })

  it('gives each drawing its own id prefix', () => {
    const outDir = tempDir()
    generateIcons({ sourceDir: join(fixtures, 'valid'), outDir, sourceSizes })
    const clipped = readFileSync(join(outDir, 'icons/clipped.ts'), 'utf8')

    expect(clipped).toContain('id="az-clipped-20-')
    expect(clipped).toContain('id="az-clipped-24-')
  })

  it('reports the multicolor icons', () => {
    const report = generateIcons({
      sourceDir: join(fixtures, 'valid'),
      outDir: tempDir(),
      sourceSizes,
    })

    expect(report.icons.filter((icon) => icon.colorMode === 'multi').map((i) => i.name)).toEqual([
      'multi-color',
    ])
  })

  it('is deterministic', () => {
    const first = tempDir()
    const second = tempDir()
    generateIcons({ sourceDir: join(fixtures, 'valid'), outDir: first, sourceSizes })
    generateIcons({ sourceDir: join(fixtures, 'valid'), outDir: second, sourceSizes })

    expect(snapshot(first)).toEqual(snapshot(second))

    const again = generateIcons({ sourceDir: join(fixtures, 'valid'), outDir: first, sourceSizes })
    expect(again.written).toEqual([])
    expect(again.removed).toEqual([])
  })

  it('picks up a new SVG and drops a removed one without any other change', () => {
    const sourceDir = tempDir()
    const outDir = tempDir()
    cpSync(join(fixtures, 'valid'), sourceDir, { recursive: true })
    generateIcons({ sourceDir, outDir, sourceSizes })

    for (const size of sourceSizes) {
      writeFileSync(
        join(sourceDir, `ui_brand-new_${size}.svg`),
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><path d="M1 1h5v5H1z"/></svg>`,
      )
      rmSync(join(sourceDir, `media_two-tone_${size}.svg`))
    }
    const report = generateIcons({ sourceDir, outDir, sourceSizes })
    const files = snapshot(outDir)

    expect(report.written.sort()).toEqual([
      'icon-list.ts',
      'icon-loaders.ts',
      'icon-names.ts',
      'icons/brand-new.ts',
    ])
    expect(report.removed).toEqual(['icons/two-tone.ts'])
    expect(files['icon-names.ts']).toContain(`| 'brand-new'`)
    expect(files['icon-names.ts']).not.toContain('two-tone')
    expect(files['icon-loaders.ts']).toContain(`import('./icons/brand-new.js')`)
  })

  it('detects duplicated names, including across categories and letter case', () => {
    const report = failureOf(join(fixtures, 'duplicates'))

    expect(report.duplicates).toEqual([
      {
        name: 'close',
        size: 20,
        files: ['business_Close_20.svg', 'media_close_20.svg', 'ui_close_20.svg'],
      },
    ])
  })

  it('reports every invalid SVG with its problems', () => {
    const report = failureOf(join(fixtures, 'invalid'))
    const problems = Object.fromEntries(report.invalid.map((item) => [item.file, item.problems]))

    expect(Object.keys(problems)).toEqual([
      'bad name.svg',
      'ui_broken_20.svg',
      'ui_empty_20.svg',
      'ui_external_20.svg',
      'ui_no-viewbox_20.svg',
      'ui_odd-size_18.svg',
      'ui_only-small_20.svg',
      'ui_scripted_20.svg',
    ])
    expect(problems['bad name.svg']![0]).toContain('file name must follow')
    expect(problems['ui_odd-size_18.svg']).toEqual(['size 18 is not one of 20, 24'])
    expect(problems['ui_only-small_20.svg']).toEqual([
      'icon "only-small" is missing the drawings for size 24',
    ])
    expect(problems['ui_no-viewbox_20.svg']).toContain('missing viewBox')
  })

  it('writes nothing when the source has problems', () => {
    const outDir = tempDir()
    failureOf(join(fixtures, 'invalid'), outDir)

    expect(readdirSync(outDir)).toEqual([])
  })

  it('describes the problems in the error message', () => {
    expect(() =>
      generateIcons({ sourceDir: join(fixtures, 'duplicates'), outDir: tempDir(), sourceSizes }),
    ).toThrowError(/Duplicated icon names \(1\):\n {2}"close" at size 20:/)
  })
})

describe('aliases', () => {
  const generate = (aliases: Record<string, string>, outDir = tempDir()) =>
    generateIcons({ sourceDir: join(fixtures, 'valid'), outDir, sourceSizes, aliases })

  it('adds the alias to the names and points its loader to the chunk of the target', () => {
    const outDir = tempDir()
    const report = generate({ square: 'fill-only' }, outDir)
    const files = snapshot(outDir)

    expect(report.aliases).toEqual([['square', 'fill-only']])
    expect(files['icon-names.ts']).toContain(`| 'square'`)
    expect(files['icon-loaders.ts']).toContain(`'square': () => import('./icons/fill-only.js'),`)
    expect(files['icon-list.ts']).toContain(`'square': 'fill-only',`)
  })

  it('does not duplicate the drawing', () => {
    const outDir = tempDir()
    generate({ square: 'fill-only' }, outDir)

    expect(Object.keys(snapshot(outDir))).not.toContain('icons/square.ts')
  })

  it('keeps the names sorted, whatever the order of the aliases', () => {
    const first = tempDir()
    const second = tempDir()
    generate({ zebra: 'wide', apple: 'clipped' }, first)
    generate({ apple: 'clipped', zebra: 'wide' }, second)
    const names = [...snapshot(first)['icon-names.ts']!.matchAll(/\| '([^']+)'/g)].map((m) => m[1])

    expect(names).toEqual([...names].sort())
    expect(names[0]).toBe('apple')
    expect(snapshot(first)).toEqual(snapshot(second))
  })

  it.each([
    [{ square: 'missing' }, 'the target icon does not exist'],
    [{ wide: 'fill-only' }, 'an icon with this name already exists'],
    [{ Square_One: 'fill-only' }, 'the alias must be kebab-case'],
  ])('rejects %j: %s', (aliases, problem) => {
    const outDir = tempDir()

    expect(() => generate(aliases, outDir)).toThrowError(problem)
    expect(readdirSync(outDir)).toEqual([])
  })
})

describe('library source', () => {
  it('generates every icon of the real SVG source', () => {
    const report = generateIcons({
      sourceDir: resolve(import.meta.dirname, '../svg'),
      outDir: tempDir(),
      sourceSizes: [20, 24, 32, 48, 64],
    })

    expect(report.icons.length).toBeGreaterThanOrEqual(400)
    expect(report.icons.map((icon) => icon.name)).toContain('search')
    for (const icon of report.icons) expect(Object.keys(icon.variants)).toHaveLength(5)
  })
})
