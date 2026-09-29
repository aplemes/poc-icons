/**
 * Runs a built client bundle in Node with a simulated DOM and prints, as JSON, every file
 * of the bundle that the application actually requested.
 *
 *   node record-imports.mjs <dist dir> <entry file>
 */
import { registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

const [distDir, entry] = process.argv.slice(2)
const root = pathToFileURL(resolve(distDir) + '/').href
const requested = []

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith(root)) requested.push(fileURLToPath(url).slice(resolve(distDir).length + 1))
    return nextLoad(url, context)
  },
})

GlobalRegistrator.register({ url: 'http://localhost/' })
document.body.innerHTML = '<div id="app"></div>'

await import(pathToFileURL(resolve(distDir, entry)).href)
// Lets the dynamic imports triggered by the first render settle.
for (let i = 0; i < 20; i++) await new Promise((done) => setTimeout(done, 10))

const rendered = [...document.querySelectorAll('svg')]
const result = {
  requested,
  svgs: rendered.length,
  drawn: rendered.filter((svg) => svg.innerHTML !== '').length,
}
await GlobalRegistrator.unregister()
console.log(JSON.stringify(result))
process.exit(0)
