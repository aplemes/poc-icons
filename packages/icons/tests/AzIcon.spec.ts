import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { AzIconName, AzIconSize, AzIconSizeProp } from '../src/index.ts'
import { AZ_ICON_SIZES } from '../src/index.ts'
import { isAzIconName } from '../src/names.ts'
import type { AzIconData, AzIconLoader } from '../src/types.ts'
import {
  asDom,
  deferred,
  freshLibrary,
  iconFromFixture,
  iconWith,
  settled,
  whenLoaded,
} from './helpers.ts'
import type { Library } from './helpers.ts'

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Mounts AzIcon with values that may be invalid, as they can be at runtime. */
function mountIcon(library: Library, props: Record<string, unknown>, attrs = {}) {
  return mount(library.AzIcon, { props: props as { icon: AzIconName }, attrs })
}

describe('rendering', () => {
  it('renders the icon requested by name', async () => {
    const library = await freshLibrary()
    const search = (await import('../src/generated/icons/search.ts')).default
    const wrapper = mountIcon(library, { icon: 'search' })
    await whenLoaded(library, 'search')

    expect(wrapper.element.tagName.toLowerCase()).toBe('svg')
    expect(wrapper.attributes('viewBox')).toBe('0 0 24 24')
    expect(wrapper.element.innerHTML).toBe(asDom(search[24] as string))
    expect(wrapper.find('path').exists()).toBe(true)
  })

  it('renders different icons for different names', async () => {
    const library = await freshLibrary()
    const search = mountIcon(library, { icon: 'search' })
    const home = mountIcon(library, { icon: 'home' })
    await whenLoaded(library, 'search', 'home')

    expect(search.find('path').attributes('d')).toBeTruthy()
    expect(search.find('path').attributes('d')).not.toBe(home.find('path').attributes('d'))
  })

  it('switches icon when the name changes', async () => {
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'search' })
    await settled()
    const before = wrapper.element.innerHTML

    await wrapper.setProps({ icon: 'home' })
    await whenLoaded(library, 'home')

    expect(wrapper.element.innerHTML).not.toBe(before)
    expect(wrapper.element.innerHTML).toBe(
      asDom((await import('../src/generated/icons/home.ts')).default[24] as string),
    )
  })

  it('passes class and other attributes to the svg element', async () => {
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'search' }, { class: 'my-icon', 'data-test': 'x' })

    expect(wrapper.classes()).toEqual(['az-icon', 'my-icon'])
    expect(wrapper.attributes('data-test')).toBe('x')
  })

  it('paints with currentColor so CSS controls the color', async () => {
    const library = await freshLibrary()

    expect(mountIcon(library, { icon: 'search' }).attributes('fill')).toBe('currentColor')
  })
})

describe('sizes', () => {
  it('exposes the Design System sizes', () => {
    expect(AZ_ICON_SIZES).toEqual([16, 24, 32, 48, 60])
    expectTypeOf<AzIconSize>().toEqualTypeOf<16 | 24 | 32 | 48 | 60>()
    expectTypeOf<AzIconSizeProp>().toEqualTypeOf<
      16 | 24 | 32 | 48 | 60 | '16' | '24' | '32' | '48' | '60'
    >()
  })

  it.each([
    [16, '0 0 20 20'],
    [24, '0 0 24 24'],
    [32, '0 0 32 32'],
    [48, '0 0 48 48'],
    [60, '0 0 64 64'],
  ])('renders size %i with the drawing made for it', async (size, viewBox) => {
    const library = await freshLibrary()
    const search = (await import('../src/generated/icons/search.ts')).default
    const wrapper = mountIcon(library, { icon: 'search', size })
    await settled()

    expect(wrapper.attributes('width')).toBe(String(size))
    expect(wrapper.attributes('height')).toBe(String(size))
    expect(wrapper.attributes('viewBox')).toBe(viewBox)
    expect(wrapper.element.innerHTML).toBe(
      asDom(search[Number(viewBox.split(' ')[2]) as 20] as string),
    )
  })

  it('accepts the size as a string, as in size="32"', async () => {
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'search', size: '32' })

    expect(wrapper.attributes('width')).toBe('32')
    expect(wrapper.attributes('viewBox')).toBe('0 0 32 32')
    expect(warn).not.toHaveBeenCalled()
  })

  it('uses 24 when no size is given', async () => {
    const library = await freshLibrary()

    expect(mountIcon(library, { icon: 'search' }).attributes('width')).toBe('24')
  })

  it.each([20, 0, '25', 'large', null])(
    'falls back to 24 for the invalid size %j',
    async (size) => {
      const library = await freshLibrary()
      const wrapper = mountIcon(library, { icon: 'search', size })

      expect(wrapper.attributes('width')).toBe('24')
      expect(wrapper.attributes('viewBox')).toBe('0 0 24 24')
      expect(warn.mock.calls.flat().join(' ')).toContain('Invalid size')
    },
  )

  it('changes the drawing when the size changes, without another download', async () => {
    const loader = vi.fn<AzIconLoader>(() => import('../src/generated/icons/search.ts'))
    const library = await freshLibrary({ search: loader })
    const wrapper = mountIcon(library, { icon: 'search', size: 24 })
    await settled()
    const small = wrapper.element.innerHTML

    await wrapper.setProps({ size: 48 })

    expect(wrapper.element.innerHTML).not.toBe(small)
    expect(wrapper.attributes('viewBox')).toBe('0 0 48 48')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('renders a viewBox that differs from the standard one', async () => {
    const library = await freshLibrary()
    const wide: AzIconData = {
      ...iconWith('<path d="M0 0h1v1z"/>'),
      24: ['0 0 48 24', '<path d="M2 2h44v20z"/>'],
    }
    library.registerIcons({ ['wide' as AzIconName]: wide })
    const wrapper = mountIcon(library, { icon: 'wide' })

    expect(wrapper.attributes('viewBox')).toBe('0 0 48 24')
    expect(wrapper.find('path').attributes('d')).toBe('M2 2h44v20z')
  })
})

describe('unknown icon', () => {
  it('renders an empty placeholder and does not throw', async () => {
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'does-not-exist', size: 32 })
    await settled()

    expect(wrapper.element.tagName.toLowerCase()).toBe('svg')
    expect(wrapper.element.innerHTML).toBe('')
    expect(wrapper.attributes('width')).toBe('32')
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.emitted('error')).toBeUndefined()
  })

  it('warns once per name during development', async () => {
    const library = await freshLibrary()
    mountIcon(library, { icon: 'does-not-exist' })
    mountIcon(library, { icon: 'does-not-exist' })
    await settled()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('Unknown icon "does-not-exist"')
  })

  it('stays silent in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'does-not-exist' })
    await settled()
    vi.unstubAllEnvs()

    expect(wrapper.element.innerHTML).toBe('')
    expect(warn).not.toHaveBeenCalled()
  })

  it.each(['constructor', 'toString', '__proto__', '', '../index'])(
    'treats %j as unknown',
    async (icon) => {
      const library = await freshLibrary()
      const wrapper = mountIcon(library, { icon })
      await settled()

      expect(wrapper.element.innerHTML).toBe('')
      expect(isAzIconName(icon)).toBe(false)
    },
  )

  it('recovers when the name becomes valid', async () => {
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'does-not-exist' })
    await settled()

    await wrapper.setProps({ icon: 'search' })
    await whenLoaded(library, 'search')

    expect(wrapper.find('path').exists()).toBe(true)
  })

  it('clears the previous icon when the name becomes invalid', async () => {
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'search' })
    await settled()

    await wrapper.setProps({ icon: 'does-not-exist' as AzIconName })
    await settled()

    expect(wrapper.element.innerHTML).toBe('')
  })

  it('checks names received at runtime', () => {
    expect(isAzIconName('search')).toBe(true)
    expect(isAzIconName('nope')).toBe(false)
    expect(isAzIconName(42)).toBe(false)
  })
})

describe('accessibility', () => {
  it('hides a decorative icon from assistive technologies', async () => {
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'search' })

    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.attributes('role')).toBeUndefined()
    expect(wrapper.attributes('aria-label')).toBeUndefined()
  })

  it('exposes an icon with a label as an image', async () => {
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'search', label: 'Search' })

    expect(wrapper.attributes('role')).toBe('img')
    expect(wrapper.attributes('aria-label')).toBe('Search')
    expect(wrapper.attributes('aria-hidden')).toBeUndefined()
  })

  it.each([['aria-label'], ['aria-labelledby']])('honours a native %s attribute', async (name) => {
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'search' }, { [name]: 'value' })

    expect(wrapper.attributes('role')).toBe('img')
    expect(wrapper.attributes(name)).toBe('value')
    expect(wrapper.attributes('aria-hidden')).toBeUndefined()
  })

  it('adds no element besides the drawing', async () => {
    const library = await freshLibrary()
    const wrapper = mountIcon(library, { icon: 'search', label: 'Search' })
    await settled()

    expect(wrapper.element.children).toHaveLength(1)
    expect(wrapper.find('title').exists()).toBe(false)
  })
})

describe('colors', () => {
  it('renders a fill icon that follows currentColor', async () => {
    const library = await freshLibrary()
    library.registerIcons({ ['fill' as AzIconName]: iconFromFixture('ui_Fill-only') })
    const wrapper = mountIcon(library, { icon: 'fill' })

    expect(wrapper.find('path').attributes('fill')).toBe('currentColor')
    expect(wrapper.find('path').attributes('fill-rule')).toBe('evenodd')
  })

  it('renders a stroke icon that follows currentColor', async () => {
    const library = await freshLibrary()
    library.registerIcons({ ['stroke' as AzIconName]: iconFromFixture('ui_stroke-only') })
    const group = mountIcon(library, { icon: 'stroke' }).find('g')

    expect(group.attributes('stroke')).toBe('currentColor')
    expect(group.attributes('fill')).toBe('none')
    expect(group.attributes('stroke-width')).toBe('2')
    expect(group.findAll('path, circle')).toHaveLength(2)
  })

  it('renders a multicolor icon with its own colors', async () => {
    const library = await freshLibrary()
    library.registerIcons({ ['multi' as AzIconName]: iconFromFixture('business_multi-color') })
    const wrapper = mountIcon(library, { icon: 'multi' })
    const paths = wrapper.findAll('path')

    expect(paths.map((path) => path.attributes('fill'))).toEqual(['#e30613', '#78be20', undefined])
    expect(paths[1]!.attributes('stroke')).toBe('#003a5d')
    expect(wrapper.find('g').attributes('fill')).toBe('#000')
    expect(wrapper.element.innerHTML).not.toContain('currentColor')
  })
})

describe('loading on demand', () => {
  it('downloads only the requested icon', async () => {
    const search = vi.fn<AzIconLoader>(() => import('../src/generated/icons/search.ts'))
    const home = vi.fn<AzIconLoader>(() => import('../src/generated/icons/home.ts'))
    const library = await freshLibrary({ search, home })
    mountIcon(library, { icon: 'search' })
    await settled()

    expect(search).toHaveBeenCalledTimes(1)
    expect(home).not.toHaveBeenCalled()
  })

  it('reserves the space while the icon downloads, then renders it', async () => {
    const request = deferred<{ default: AzIconData }>()
    const library = await freshLibrary({ search: () => request.promise })
    const wrapper = mountIcon(library, { icon: 'search', size: 48 })

    expect(wrapper.element.innerHTML).toBe('')
    expect(wrapper.attributes('width')).toBe('48')
    expect(wrapper.attributes('height')).toBe('48')

    request.resolve({ default: iconWith('<path d="M0 0h1v1z"/>') })
    await settled()

    expect(wrapper.element.innerHTML).toBe('<path d="M0 0h1v1z"></path>')
  })

  it('downloads an icon once, however many times it is used', async () => {
    const loader = vi.fn<AzIconLoader>(() => import('../src/generated/icons/search.ts'))
    const library = await freshLibrary({ search: loader })
    const first = mountIcon(library, { icon: 'search' })
    const second = mountIcon(library, { icon: 'search' })
    await settled()
    const third = mountIcon(library, { icon: 'search' })

    expect(loader).toHaveBeenCalledTimes(1)
    expect(first.find('path').exists()).toBe(true)
    expect(second.find('path').exists()).toBe(true)
    // Already in memory: rendered synchronously, with no placeholder.
    expect(third.find('path').exists()).toBe(true)
  })

  it('ignores a download that finishes after the name changed', async () => {
    const slow = deferred<{ default: AzIconData }>()
    const library = await freshLibrary({
      slow: () => slow.promise,
      fast: () => Promise.resolve({ default: iconWith('<path d="M1 1"/>') }),
    })
    const wrapper = mountIcon(library, { icon: 'slow' })
    await wrapper.setProps({ icon: 'fast' as AzIconName })
    await settled()

    slow.resolve({ default: iconWith('<path d="M9 9"/>') })
    await settled()

    expect(wrapper.find('path').attributes('d')).toBe('M1 1')
  })

  it('survives a failed download, emits an error and retries later', async () => {
    const loader = vi
      .fn<AzIconLoader>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ default: iconWith('<path d="M1 1"/>') })
    const library = await freshLibrary({ search: loader })
    const failed = mountIcon(library, { icon: 'search' })
    await settled()

    expect(failed.element.innerHTML).toBe('')
    expect(failed.emitted('error')).toHaveLength(1)
    expect(warn.mock.calls[0]![0]).toContain('Failed to load the icon "search"')

    const retried = mountIcon(library, { icon: 'search' })
    await settled()

    expect(retried.find('path').exists()).toBe(true)
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('renders registered icons immediately, without a download', async () => {
    const loader = vi.fn<AzIconLoader>()
    const library = await freshLibrary({ search: loader })
    library.registerIcons({ search: iconWith('<path d="M1 1"/>') })
    const wrapper = mountIcon(library, { icon: 'search' })

    expect(wrapper.find('path').exists()).toBe(true)
    expect(loader).not.toHaveBeenCalled()
  })

  it('preloads icons ahead of their first render', async () => {
    const loader = vi.fn<AzIconLoader>(() => import('../src/generated/icons/search.ts'))
    const library = await freshLibrary({ search: loader })
    await library.preloadIcons(['search'])
    const wrapper = mountIcon(library, { icon: 'search' })

    expect(wrapper.find('path').exists()).toBe(true)
    expect(loader).toHaveBeenCalledTimes(1)
  })
})

describe('aliases', () => {
  it('renders the drawing of the target icon', async () => {
    const library = await freshLibrary()
    const alias = mountIcon(library, { icon: 'arrow-right' })
    const target = mountIcon(library, { icon: 'arrow-next' })
    await whenLoaded(library, 'arrow-right', 'arrow-next')

    expect(alias.find('path').exists()).toBe(true)
    expect(alias.element.innerHTML).toBe(target.element.innerHTML)
  })

  it('accepts the alias as an icon name', () => {
    expectTypeOf<'arrow-right' | 'arrow-left' | 'close'>().toExtend<AzIconName>()
    expect(isAzIconName('arrow-right')).toBe(true)
    expect(isAzIconName('close')).toBe(true)
  })
})

describe('registry', () => {
  it('has a loader for every generated icon and nothing loaded up front', async () => {
    await freshLibrary()
    const { iconLoaders } = await import('../src/generated/icon-loaders.ts')
    const { azIconAliases, azIconNames } = await import('../src/names.ts')

    expect(Object.keys(iconLoaders).sort()).toEqual(
      [...azIconNames, ...Object.keys(azIconAliases)].sort(),
    )
    expect(azIconNames.length).toBeGreaterThanOrEqual(400)
    for (const loader of Object.values(iconLoaders)) expect(loader).toBeTypeOf('function')
  })

  it('types the icon prop with the generated names', () => {
    expectTypeOf<'search'>().toExtend<AzIconName>()
    expectTypeOf<'arrow-next'>().toExtend<AzIconName>()
    expectTypeOf<'does-not-exist'>().not.toExtend<AzIconName>()
    expectTypeOf<string>().not.toExtend<AzIconName>()
  })
})
