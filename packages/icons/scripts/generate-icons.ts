/**
 * Generates `src/generated` from the SVG source.
 *
 *   node scripts/generate-icons.ts [--source <dir>] [--out <dir>]
 *
 * The source can also be set with the AZ_ICONS_SOURCE environment variable.
 */
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { AZ_ICON_SIZE_MAP } from '../src/sizes.ts'
import { GenerationError, generateIcons } from './lib/generate.ts'

const packageDir = resolve(import.meta.dirname, '..')
const { values } = parseArgs({
  options: { source: { type: 'string' }, out: { type: 'string' } },
})

const sourceDir = resolve(packageDir, values.source ?? process.env.AZ_ICONS_SOURCE ?? 'svg')
const outDir = resolve(packageDir, values.out ?? 'src/generated')
const sourceSizes = [...new Set(Object.values(AZ_ICON_SIZE_MAP))]

try {
  const started = performance.now()
  const report = generateIcons({ sourceDir, outDir, sourceSizes })
  const multicolor = report.icons.filter((icon) => icon.colorMode === 'multi')
  console.log(
    `Generated ${report.icons.length} icons (${sourceSizes.length} sizes each) from ${sourceDir}`,
  )
  console.log(
    `  ${report.written.length} files written, ${report.removed.length} removed, ` +
      `${multicolor.length} multicolor, ${Math.round(performance.now() - started)} ms`,
  )
  if (report.icons.length === 0) {
    console.error(`No SVG found in ${sourceDir}`)
    process.exitCode = 1
  }
} catch (error) {
  if (!(error instanceof GenerationError)) throw error
  console.error(`Icon generation failed. Nothing was written.\n\n${error.message}`)
  process.exitCode = 1
}
