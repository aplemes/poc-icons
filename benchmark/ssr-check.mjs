/**
 * Renders AzIcon on the server with the installed package, loaded by Node itself as
 * Nuxt and Vite do with externalized dependencies. Prints the result as JSON.
 */
import { AzIcon } from '@azulejo/icons'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const icons = ['search', 'home', 'does-not-exist']
const app = createSSRApp({
  render: () =>
    h(
      'main',
      icons.map((icon) => h(AzIcon, { icon, size: 32 })),
    ),
})
const html = await renderToString(app)

console.log(
  JSON.stringify({
    svgs: html.match(/<svg /g)?.length ?? 0,
    drawn: html.match(/<svg [^>]*>(?!<\/svg>)/g)?.length ?? 0,
    html,
  }),
)
