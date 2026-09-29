/**
 * Bundle benchmark.
 *
 * Packs the library exactly as it would be published, installs the tarball in an
 * application outside the workspace, builds one application per scenario and inspects
 * what ended up in the initial bundle.
 *
 *   pnpm benchmark
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { createScenarios } from './scenarios.ts'
import type { Scenario } from './scenarios.ts'

const root = resolve(import.meta.dirname, '..')
const library = join(root, 'packages/icons')
const work = join(import.meta.dirname, '.work')
const app = join(work, 'app')
const results = join(import.meta.dirname, 'results')

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

interface Size {
  raw: number
  gzip: number
  brotli: number
}

function sizeOf(content: Buffer): Size {
  return {
    raw: content.length,
    gzip: gzipSync(content, { level: 9 }).length,
    brotli: brotliCompressSync(content).length,
  }
}

function sum(sizes: Size[]): Size {
  return sizes.reduce(
    (total, size) => ({
      raw: total.raw + size.raw,
      gzip: total.gzip + size.gzip,
      brotli: total.brotli + size.brotli,
    }),
    { raw: 0, gzip: 0, brotli: 0 },
  )
}

interface ManifestChunk {
  file: string
  isEntry?: boolean
  imports?: string[]
  dynamicImports?: string[]
}

interface ScenarioResult {
  id: string
  title: string
  expectedIcons: number
  /** Files downloaded before the application starts. */
  initialFiles: { file: string; size: Size }[]
  initial: Size
  /** Icon chunks that exist in the build output, downloaded only on demand. */
  iconChunks: number
  iconChunksSize: Size
  /** Icons whose drawing is inside the initial bundle. */
  iconsInInitial: string[]
  /** Files the running application requested. */
  requestedAtRuntime: string[]
  iconsRequestedAtRuntime: string[]
  /** Chunks requested on demand that are not icons: the icon registry. */
  otherRequestedAtRuntime: { file: string; size: Size }[]
  iconsDrawn: number
}

type Signatures = Map<string, string>

/** The 24px drawing of each icon, which identifies it inside any bundle. */
async function readSignatures(): Promise<Signatures> {
  const dir = join(app, 'node_modules/@azulejo/icons/dist/generated/icons')
  const signatures: Signatures = new Map()
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.js'))) {
    const icon = (await import(pathToFileURL(join(dir, file)).href)) as {
      default: Record<number, string | [string, string]>
    }
    signatures.set(file.slice(0, -3), [icon.default[24]!].flat().at(-1)!)
  }
  if (new Set(signatures.values()).size !== signatures.size) {
    throw new Error('icon signatures are not unique')
  }
  return signatures
}

function iconsIn(code: string, signatures: Signatures): string[] {
  // Bundlers may print the same string with escaped quotes.
  const normalized = code.replaceAll('\\"', '"').replaceAll("\\'", "'")
  return [...signatures].filter(([, drawing]) => normalized.includes(drawing)).map(([name]) => name)
}

function build(scenario: Scenario, signatures: Signatures): ScenarioResult {
  writeFileSync(join(app, 'src/App.vue'), scenario.app)
  const outDir = join(app, 'dist', scenario.id)
  rmSync(outDir, { recursive: true, force: true })
  run('pnpm', ['exec', 'vite', 'build', '--outDir', outDir, '--manifest'], app)

  const manifest = JSON.parse(readFileSync(join(outDir, '.vite/manifest.json'), 'utf8')) as Record<
    string,
    ManifestChunk
  >
  const entry = Object.values(manifest).find((chunk) => chunk.isEntry)!

  // The initial bundle is the entry plus everything it imports statically.
  const initial = new Set<string>()
  const visit = (chunk: ManifestChunk): void => {
    if (initial.has(chunk.file)) return
    initial.add(chunk.file)
    for (const key of chunk.imports ?? []) visit(manifest[key]!)
  }
  visit(entry)

  const read = (file: string) => readFileSync(join(outDir, file))
  const initialFiles = [...initial].map((file) => ({ file, size: sizeOf(read(file)) }))
  const initialCode = [...initial].map((file) => read(file).toString('utf8')).join('\n')
  const iconsInInitial = iconsIn(initialCode, signatures)

  const lazyFiles = readdirSync(join(outDir, 'assets'))
    .map((file) => `assets/${file}`)
    .filter((file) => file.endsWith('.js') && !initial.has(file))
  const iconOf = (file: string): string | undefined =>
    iconsIn(read(file).toString('utf8'), signatures)[0]
  const iconChunks = lazyFiles.filter((file) => iconOf(file) !== undefined)

  const runtime = JSON.parse(run('node', ['record-imports.mjs', outDir, entry.file], app)) as {
    requested: string[]
    svgs: number
    drawn: number
  }
  const requestedLazily = runtime.requested.filter((file) => !initial.has(file))

  return {
    id: scenario.id,
    title: scenario.title,
    expectedIcons: scenario.icons.length,
    initialFiles,
    initial: sum(initialFiles.map((file) => file.size)),
    iconChunks: iconChunks.length,
    iconChunksSize: sum(iconChunks.map((file) => sizeOf(read(file)))),
    iconsInInitial,
    requestedAtRuntime: runtime.requested,
    iconsRequestedAtRuntime: requestedLazily.flatMap((file) => iconOf(file) ?? []).sort(),
    otherRequestedAtRuntime: requestedLazily
      .filter((file) => iconOf(file) === undefined)
      .map((file) => ({ file, size: sizeOf(read(file)) })),
    iconsDrawn: runtime.drawn,
  }
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(2)} kB`

function report(
  all: ScenarioResult[],
  totalIcons: number,
  versions: Record<string, string>,
): string {
  const baseline = all.find((result) => result.id === 'baseline')!
  const lines: string[] = [
    '# Bundle benchmark',
    '',
    `Library: ${totalIcons} icons. Consumer built with Vite ${versions.vite} and Vue ${versions.vue}, ` +
      'installing the tarball produced by `pnpm pack`.',
    '',
    '## Initial bundle',
    '',
    'JavaScript downloaded before the application starts: the entry and its static imports.',
    '',
    '| Scenario | Raw | Gzip | Brotli | Over baseline (gzip) | Icons inside it |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
  ]
  for (const result of all) {
    lines.push(
      `| ${result.title} | ${kb(result.initial.raw)} | ${kb(result.initial.gzip)} | ` +
        `${kb(result.initial.brotli)} | ${kb(result.initial.gzip - baseline.initial.gzip)} | ` +
        `${result.iconsInInitial.length} |`,
    )
  }
  lines.push(
    '',
    '## Icons loaded on demand',
    '',
    'Measured by running each built application and recording the files it requested.',
    '',
    'The registry is the chunk that maps each name to its file, requested once.',
    '',
    '| Scenario | Icons used | Icon chunks requested | Icons drawn | Registry (gzip) | Icon chunks in the output | Size of all icon chunks (gzip) |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  )
  for (const result of all) {
    lines.push(
      `| ${result.title} | ${result.expectedIcons} | ${result.iconsRequestedAtRuntime.length} | ` +
        `${result.iconsDrawn} | ${kb(sum(result.otherRequestedAtRuntime.map((item) => item.size)).gzip)} | ` +
        `${result.iconChunks} | ${kb(result.iconChunksSize.gzip)} |`,
    )
  }
  lines.push('', '## Files per scenario', '')
  for (const result of all) {
    lines.push(`### ${result.title}`, '', 'Initial bundle:', '')
    for (const { file, size } of result.initialFiles) {
      lines.push(
        `- \`${file}\`: ${kb(size.raw)} raw, ${kb(size.gzip)} gzip, ${kb(size.brotli)} brotli`,
      )
    }
    const requested = result.iconsRequestedAtRuntime
    const shown = requested.slice(0, 12).join(', ') + (requested.length > 12 ? ', ...' : '')
    lines.push(
      '',
      `Icons inside the initial bundle: ${result.iconsInInitial.length}.`,
      `Icon chunks requested at runtime: ${requested.length}${requested.length ? ` (${shown})` : ''}.`,
      '',
    )
    for (const { file, size } of result.otherRequestedAtRuntime) {
      lines.push(
        `Also requested on demand: \`${file}\` (${kb(size.raw)} raw, ${kb(size.gzip)} gzip, ` +
          `${kb(size.brotli)} brotli).`,
        '',
      )
    }
  }
  return lines.join('\n')
}

function check(all: ScenarioResult[], totalIcons: number): string[] {
  const failures: string[] = []
  for (const result of all.filter((item) => item.id !== 'eager-reference')) {
    if (result.iconsInInitial.length > 0) {
      failures.push(
        `${result.id}: ${result.iconsInInitial.length} icons are inside the initial bundle`,
      )
    }
    if (result.iconsRequestedAtRuntime.length !== result.expectedIcons) {
      failures.push(
        `${result.id}: requested ${result.iconsRequestedAtRuntime.length} icon chunks, ` +
          `expected ${result.expectedIcons}`,
      )
    }
    if (result.iconsDrawn !== result.expectedIcons) {
      failures.push(
        `${result.id}: drew ${result.iconsDrawn} icons, expected ${result.expectedIcons}`,
      )
    }
    if (result.id !== 'baseline' && result.iconChunks !== totalIcons) {
      failures.push(
        `${result.id}: ${result.iconChunks} icon chunks in the output, expected ${totalIcons}`,
      )
    }
  }
  return failures
}

// 1. Pack the library as it would be published.
rmSync(work, { recursive: true, force: true })
mkdirSync(join(app, 'src'), { recursive: true })
run('pnpm', ['pack', '--pack-destination', work], library)
const tarball = readdirSync(work).find((file) => file.endsWith('.tgz'))!
console.log(`Packed ${tarball} (${kb(readFileSync(join(work, tarball)).length)})`)

// 2. Create a consumer outside the workspace and install the tarball.
const versions = { vue: '^3.5.43', vite: '^8.3.1' }
writeFileSync(
  join(app, 'package.json'),
  JSON.stringify(
    {
      name: 'azulejo-icons-consumer',
      private: true,
      type: 'module',
      dependencies: { '@azulejo/icons': `file:../${tarball}`, vue: versions.vue },
      devDependencies: {
        '@happy-dom/global-registrator': '^20.14.5',
        '@vitejs/plugin-vue': '^6.0.9',
        vite: versions.vite,
      },
    },
    null,
    2,
  ),
)
writeFileSync(join(app, 'pnpm-workspace.yaml'), 'packages: []\n')
writeFileSync(
  join(app, 'vite.config.js'),
  `import vue from '@vitejs/plugin-vue'\nimport { defineConfig } from 'vite'\n\n` +
    `export default defineConfig({ plugins: [vue()], logLevel: 'warn' })\n`,
)
writeFileSync(
  join(app, 'index.html'),
  `<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><title>Consumer</title></head>\n` +
    `  <body>\n    <div id="app"></div>\n    <script type="module" src="/src/main.js"></script>\n  </body>\n</html>\n`,
)
writeFileSync(
  join(app, 'src/main.js'),
  `import { createApp } from 'vue'\nimport App from './App.vue'\n\ncreateApp(App).mount('#app')\n`,
)
// Runs from the application so it resolves the application's dependencies.
for (const script of ['record-imports.mjs', 'ssr-check.mjs']) {
  copyFileSync(join(import.meta.dirname, script), join(app, script))
}
console.log('Installing the consumer application...')
run('pnpm', ['install', '--no-frozen-lockfile'], app)

const installed = (name: string) =>
  (
    JSON.parse(readFileSync(join(app, 'node_modules', name, 'package.json'), 'utf8')) as {
      version: string
    }
  ).version
versions.vue = installed('vue')
versions.vite = installed('vite')

// 3. Build and inspect each scenario.
const signatures = await readSignatures()
const all: ScenarioResult[] = []
for (const scenario of createScenarios([...signatures.keys()])) {
  console.log(`Building "${scenario.title}"...`)
  all.push(build(scenario, signatures))
}

// 4. Render on the server with the installed package.
console.log('Rendering on the server...')
const ssr = JSON.parse(run('node', ['ssr-check.mjs'], app)) as {
  svgs: number
  drawn: number
  html: string
}

mkdirSync(results, { recursive: true })
const markdown =
  report(all, signatures.size, versions) +
  [
    '## Server rendering',
    '',
    'Node loading the installed package directly, rendering `search`, `home` and an unknown name.',
    '',
    `- \`<svg>\` elements in the HTML: ${ssr.svgs}`,
    `- with the drawing inside: ${ssr.drawn}`,
    '',
  ].join('\n')
writeFileSync(join(results, 'report.md'), markdown + '\n')
writeFileSync(join(results, 'report.json'), JSON.stringify(all, null, 2) + '\n')
console.log(`\n${markdown}\n`)
console.log(`Report written to ${join(results, 'report.md')}`)

const failures = check(all, signatures.size)
if (ssr.svgs !== 3 || ssr.drawn !== 2) {
  failures.push(
    `server rendering: ${ssr.svgs} svg elements and ${ssr.drawn} drawn, expected 3 and 2`,
  )
}
if (failures.length > 0) {
  console.error(
    `\nThe benchmark found problems:\n${failures.map((item) => `  - ${item}`).join('\n')}`,
  )
  process.exitCode = 1
} else {
  console.log('All checks passed: no unused icon is part of an initial bundle.')
}
