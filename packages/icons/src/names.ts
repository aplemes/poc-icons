/**
 * Runtime list of every icon, for galleries, documentation and validation of names
 * received at runtime.
 *
 * It lives in its own entry so applications that only render icons never pay for it.
 */
import { azIconNames } from './generated/icon-list.js'
import type { AzIconName } from './types.js'

export { azIconCategories, azIconNames } from './generated/icon-list.js'

const names: ReadonlySet<string> = new Set(azIconNames)

/** Tells whether a value received at runtime is the name of an existing icon. */
export function isAzIconName(value: unknown): value is AzIconName {
  return typeof value === 'string' && names.has(value)
}
