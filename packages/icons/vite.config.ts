import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

const src = resolve(import.meta.dirname, 'src')
const icons = readdirSync(resolve(src, 'generated/icons')).filter((file) => file.endsWith('.ts'))

/** Icon modules are plain data: a source map for them only adds weight to the package. */
function skipIconSourcemaps(): Plugin {
  return {
    name: 'az-skip-icon-sourcemaps',
    writeBundle(options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk' || !file.fileName.startsWith('generated/icons/')) continue
        const target = resolve(options.dir!, file.fileName)
        rmSync(`${target}.map`, { force: true })
        writeFileSync(
          target,
          readFileSync(target, 'utf8').replace(/\n\/\/# sourceMappingURL=.*\s*$/, '\n'),
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [skipIconSourcemaps()],
  // The default report lists one line per icon.
  logLevel: 'warn',
  build: {
    target: 'es2022',
    sourcemap: true,
    minify: false,
    lib: {
      formats: ['es'],
      // Every icon is an entry so it gets a stable file name, which the
      // `@azulejo/icons/icons/*` export relies on.
      entry: {
        index: resolve(src, 'index.ts'),
        names: resolve(src, 'names.ts'),
        ...Object.fromEntries(
          icons.map((file) => [
            `generated/icons/${file.slice(0, -3)}`,
            resolve(src, 'generated/icons', file),
          ]),
        ),
      },
    },
    rolldownOptions: {
      external: ['vue'],
      output: {
        // One output file per source module: the dynamic imports stay as written and
        // the consumer's bundler decides how to split them.
        preserveModules: true,
        preserveModulesRoot: src,
        entryFileNames: '[name].js',
      },
    },
  },
})
