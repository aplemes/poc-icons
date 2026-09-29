import type { AzIconData, AzIconLoader, AzIconName } from './types.js'

type Registry = Readonly<Record<string, AzIconLoader>>

const resolved = new Map<string, AzIconData>()
const pending = new Map<string, Promise<AzIconData | undefined>>()
const warned = new Set<string>()
let registry: Promise<Registry> | undefined

/**
 * The registry has one entry per icon, so it is a chunk of its own: importing AzIcon
 * costs the same however many icons the library has. It is downloaded once, when the
 * first icon is requested.
 */
function loadRegistry(): Promise<Registry> {
  registry ??= import('./generated/icon-loaders.js').then(
    (module) => module.iconLoaders,
    (error: unknown) => {
      registry = undefined
      throw error
    },
  )
  return registry
}

async function request(name: string): Promise<AzIconData | undefined> {
  const loaders = await loadRegistry()
  if (!Object.hasOwn(loaders, name)) {
    if (process.env.NODE_ENV !== 'production' && !warned.has(name)) {
      warned.add(name)
      console.warn(
        `[AzIcon] Unknown icon "${name}". Nothing is rendered for it. ` +
          `Check the name against the AzIconName type.`,
      )
    }
    return undefined
  }
  const icon = (await loaders[name]!()).default
  resolved.set(name, icon)
  return icon
}

/** Returns the icon when it is already in memory. Never triggers a download. */
export function getLoadedIcon(name: string): AzIconData | undefined {
  return resolved.get(name)
}

/**
 * Loads an icon, downloading its chunk on the first call only.
 *
 * Resolves to `undefined` for a name that does not exist. Rejects when the chunk cannot
 * be downloaded; a later call tries again.
 */
export function loadIcon(name: string): Promise<AzIconData | undefined> {
  const loaded = resolved.get(name)
  if (loaded) return Promise.resolve(loaded)

  let inFlight = pending.get(name)
  if (!inFlight) {
    inFlight = request(name).finally(() => pending.delete(name))
    pending.set(name, inFlight)
  }
  return inFlight
}

/** Downloads icons ahead of time, for example the ones behind a menu about to open. */
export function preloadIcons(names: readonly AzIconName[]): Promise<void> {
  return Promise.all(names.map(loadIcon)).then(() => undefined)
}

/**
 * Makes statically imported icons available synchronously, so they render on the first
 * paint with no request.
 *
 * ```ts
 * import search from '@azulejo/icons/icons/search'
 * registerIcons({ search })
 * ```
 */
export function registerIcons(icons: Partial<Record<AzIconName, AzIconData>>): void {
  for (const [name, data] of Object.entries(icons)) {
    if (data) resolved.set(name, data)
  }
}
