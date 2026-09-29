import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { vi } from 'vitest'
import { processSvg } from '../scripts/lib/svg.ts'
import type { AzIconData, AzIconLoader } from '../src/types.ts'

export type Library = typeof import('../src/index.ts')

/** Builds icon data from fixtures, the same way the generator does. */
export function iconFromFixture(name: string): AzIconData {
  const variant = (size: number) => {
    const file = resolve(import.meta.dirname, 'fixtures/valid', `${name}_${size}.svg`)
    return processSvg(readFileSync(file, 'utf8'), { idPrefix: `az-${name}-${size}` }).body
  }
  return { 20: variant(20), 24: variant(24), 32: variant(24), 48: variant(24), 64: variant(24) }
}

export function iconWith(body: string): AzIconData {
  return { 20: body, 24: body, 32: body, 48: body, 64: body }
}

/**
 * Imports a fresh copy of the library, with an empty icon cache. When loaders are given
 * they replace the generated registry.
 */
export async function freshLibrary(loaders?: Record<string, AzIconLoader>): Promise<Library> {
  vi.resetModules()
  if (loaders) {
    vi.doMock('../src/generated/icon-loaders.ts', () => ({ iconLoaders: loaders }))
  } else {
    vi.doUnmock('../src/generated/icon-loaders.ts')
  }
  return import('../src/index.ts')
}

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Markup as the DOM serializes it, so strings can be compared with `innerHTML`. */
export function asDom(markup: string): string {
  const container = document.createElement('div')
  container.innerHTML = markup
  return container.innerHTML
}

/**
 * Waits for the downloads in flight. Importing the registry and an icon chunk takes
 * longer than a microtask, so flushing promises is not enough.
 */
export async function settled(): Promise<void> {
  for (let turn = 0; turn < 5; turn++) await new Promise((resolve) => setTimeout(resolve))
}

/** Waits for specific icons and for the render that follows them. */
export async function whenLoaded(library: Library, ...names: string[]): Promise<void> {
  await Promise.all(names.map((name) => library.loadIcon(name).catch(() => undefined)))
  await settled()
}
