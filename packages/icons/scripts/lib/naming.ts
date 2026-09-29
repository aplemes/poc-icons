import { basename } from 'node:path'

export interface ParsedIconFile {
  /** Path as given to the parser, used in reports. */
  file: string
  category: string
  /** Public icon name, kebab-case. */
  name: string
  /** Size of the drawing, taken from the file name. */
  size: number
}

const FILE_PATTERN = /^([A-Za-z0-9]+)_([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)_(\d+)\.svg$/

/**
 * Parses `<category>_<Name>_<size>.svg`. The category is dropped from the public name
 * and everything is lower-cased, so `ui_Sort-down_24.svg` becomes `sort-down`.
 */
export function parseIconFileName(file: string): ParsedIconFile {
  const match = FILE_PATTERN.exec(basename(file))
  if (!match) {
    throw new Error(
      `file name must follow "<category>_<name>_<size>.svg" using letters, digits and "-"`,
    )
  }
  const [, category, name, size] = match as unknown as [string, string, string, string]
  return { file, category: category.toLowerCase(), name: name.toLowerCase(), size: Number(size) }
}

/** `arrow-right` → `AzArrowRight`. */
export function toComponentName(name: string): string {
  return 'Az' + name.replace(/(^|-)([a-z0-9])/g, (_, __, char: string) => char.toUpperCase())
}

export interface DuplicateIcon {
  name: string
  size: number
  files: string[]
}

/** Finds files that resolve to the same public name and size. */
export function findDuplicates(icons: ParsedIconFile[]): DuplicateIcon[] {
  const byKey = new Map<string, ParsedIconFile[]>()
  for (const icon of icons) {
    const key = `${icon.name}@${icon.size}`
    const list = byKey.get(key)
    if (list) list.push(icon)
    else byKey.set(key, [icon])
  }
  return [...byKey.values()]
    .filter((list) => list.length > 1)
    .map((list) => ({
      name: list[0]!.name,
      size: list[0]!.size,
      files: list.map((icon) => icon.file).sort(),
    }))
}
