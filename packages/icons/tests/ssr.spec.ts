import { renderToString } from '@vue/server-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import type { AzIconData, AzIconName } from '../src/types.ts'
import { asDom, deferred, freshLibrary, iconWith, settled } from './helpers.ts'
import type { Library } from './helpers.ts'

let warn: ReturnType<typeof vi.spyOn>
let error: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  error = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

function page(library: Library, icons: string[]) {
  return defineComponent({
    render: () =>
      h(
        'main',
        icons.map((icon) =>
          h(library.AzIcon, { icon: icon as AzIconName, size: 32, class: 'ssr-icon' }),
        ),
      ),
  })
}

describe('server rendering', () => {
  it('waits for the icons and renders them in the HTML', async () => {
    const library = await freshLibrary()
    const search = (await import('../src/generated/icons/search.ts')).default
    const html = await renderToString(createSSRApp(page(library, ['search', 'home'])))

    expect(html).toContain(
      `<svg class="az-icon ssr-icon" viewBox="0 0 32 32" width="32" height="32" ` +
        `fill="currentColor" aria-hidden="true">${search[32]}</svg>`,
    )
    expect(html.match(/<svg /g)).toHaveLength(2)
    expect(html.match(/<path /g)).toHaveLength(2)
  })

  it('renders a placeholder for an unknown icon instead of failing the request', async () => {
    const library = await freshLibrary()
    const html = await renderToString(createSSRApp(page(library, ['does-not-exist', 'search'])))

    expect(html).toContain('aria-hidden="true"></svg>')
    expect(html.match(/<path /g)).toHaveLength(1)
  })

  it('does not fail the request when an icon cannot be loaded', async () => {
    const library = await freshLibrary({ search: () => Promise.reject(new Error('disk')) })
    const html = await renderToString(createSSRApp(page(library, ['search'])))

    expect(html).toContain('aria-hidden="true"></svg>')
  })
})

describe('hydration', () => {
  async function serverHtml(icons: string[]): Promise<string> {
    const library = await freshLibrary()
    return renderToString(createSSRApp(page(library, icons)))
  }

  it('keeps the server markup while the icon downloads and after it arrives', async () => {
    const html = await serverHtml(['search'])
    const search = (await import('../src/generated/icons/search.ts')).default
    const request = deferred<{ default: AzIconData }>()
    // A new library instance: on the client nothing is loaded yet.
    const client = await freshLibrary({ search: () => request.promise })
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const serverSvg = container.querySelector('svg')!
    const serverPath = container.querySelector('path')!

    createSSRApp(page(client, ['search'])).mount(container)
    await settled()

    // Still downloading: the drawing sent by the server stays on screen.
    expect(container.querySelector('svg')).toBe(serverSvg)
    expect(container.querySelector('path')).toBe(serverPath)

    request.resolve({ default: search })
    await settled()

    expect(container.querySelector('svg')).toBe(serverSvg)
    expect(container.innerHTML).toBe(asDom(html))
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('hydrates without mismatch when the icon is already in memory', async () => {
    const html = await serverHtml(['search', 'home'])
    const client = await freshLibrary()
    await client.preloadIcons(['search', 'home'])
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)

    createSSRApp(page(client, ['search', 'home'])).mount(container)
    await settled()

    expect(container.innerHTML).toBe(asDom(html))
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('stays interactive after hydration', async () => {
    const html = await serverHtml(['search'])
    const client = await freshLibrary({
      search: () => import('../src/generated/icons/search.ts'),
      home: () => Promise.resolve({ default: iconWith('<path d="M1 1"/>') }),
    })
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const Toggle = defineComponent({
      data: () => ({ icon: 'search' as AzIconName }),
      render() {
        return h('main', [
          h(client.AzIcon, {
            icon: this.icon,
            size: 32,
            class: 'ssr-icon',
            onClick: () => (this.icon = 'home'),
          }),
        ])
      },
    })

    createSSRApp(Toggle).mount(container)
    await settled()
    container.querySelector('svg')!.dispatchEvent(new Event('click'))
    await settled()

    expect(container.querySelector('path')!.getAttribute('d')).toBe('M1 1')
  })
})
