/**
 * Nuxt check.
 *
 * Installs the packed library in a Nuxt application, builds it, starts the server and
 * verifies that the icons are in the HTML and absent from the scripts the page loads.
 *
 *   pnpm benchmark:nuxt
 */
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const library = resolve(import.meta.dirname, '../packages/icons')
const work = join(import.meta.dirname, '.work/nuxt')
const port = 4173

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

rmSync(work, { recursive: true, force: true })
mkdirSync(join(work, 'app'), { recursive: true })
run('pnpm', ['pack', '--pack-destination', work], library)
const tarball = readdirSync(work).find((file) => file.endsWith('.tgz'))!

writeFileSync(
  join(work, 'package.json'),
  JSON.stringify(
    {
      name: 'azulejo-icons-nuxt-consumer',
      private: true,
      type: 'module',
      dependencies: { '@azulejo/icons': `file:./${tarball}`, nuxt: '^4.5.2', vue: '^3.5.43' },
    },
    null,
    2,
  ),
)
writeFileSync(join(work, 'pnpm-workspace.yaml'), 'packages: []\nallowBuilds:\n  esbuild: true\n')
writeFileSync(
  join(work, 'nuxt.config.ts'),
  `export default defineNuxtConfig({\n  compatibilityDate: '2026-09-01',\n  telemetry: false,\n` +
    `  devtools: { enabled: false },\n})\n`,
)
writeFileSync(
  join(work, 'app/app.vue'),
  `<script setup lang="ts">
import { AzIcon } from '@azulejo/icons'
</script>

<template>
  <main>
    <AzIcon icon="search" size="24" />
    <AzIcon icon="home" :size="48" label="Home" />
  </main>
</template>
`,
)

console.log('Installing and building the Nuxt application...')
run('pnpm', ['install', '--no-frozen-lockfile'], work)
run('pnpm', ['exec', 'nuxt', 'build'], work)

console.log('Starting the server...')
const server = spawn('node', ['.output/server/index.mjs'], {
  cwd: work,
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
})

let html = ''
try {
  for (let attempt = 0; attempt < 50 && !html; attempt++) {
    await new Promise((done) => setTimeout(done, 200))
    html = await fetch(`http://localhost:${port}/`).then(
      (response) => response.text(),
      () => '',
    )
  }
} finally {
  server.kill()
}

const drawn = html.match(/<svg [^>]*class="az-icon"[^>]*><(path|g)[ >]/g)?.length ?? 0
const scripts = [...html.matchAll(/(?:src|href)="\/_nuxt\/([^"]+\.js)"/g)].map((match) => match[1]!)
const initial = [...new Set(scripts)]
const clientDir = join(work, '.output/public/_nuxt')
const search = (
  (await import(join(work, 'node_modules/@azulejo/icons/dist/generated/icons/search.js'))) as {
    default: Record<number, string>
  }
).default[24]!
const pathData = / d="([^"]+)"/.exec(search)![1]!
const withIcon = initial.filter((file) =>
  readFileSync(join(clientDir, file), 'utf8').includes(pathData),
)
const initialSize = initial.reduce(
  (total, file) => total + readFileSync(join(clientDir, file)).length,
  0,
)

console.log(`
Nuxt check
  icons drawn in the server HTML:        ${drawn} of 2
  scripts loaded by the page:            ${initial.length} (${(initialSize / 1024).toFixed(2)} kB raw)
  of those, containing an icon drawing:  ${withIcon.length}
  JavaScript files in the client output: ${readdirSync(clientDir).filter((file) => file.endsWith('.js')).length}
`)

if (drawn !== 2 || initial.length === 0 || withIcon.length > 0) {
  console.error('The Nuxt check failed.')
  process.exitCode = 1
} else {
  console.log('The Nuxt check passed.')
}
