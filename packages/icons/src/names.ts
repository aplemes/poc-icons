/**
 * Runtime list of every icon, for galleries, documentation and validation of names
 * received at runtime.
 *
 * It lives in its own entry so applications that only render icons never pay for it.
 */
import { azIconAliases, azIconNames } from './generated/icon-list.js'
import type { AzIconName } from './types.js'

export { azIconAliases, azIconCategories, azIconNames } from './generated/icon-list.js'

const names: ReadonlySet<string> = new Set([...azIconNames, ...Object.keys(azIconAliases)])

/** Tells whether a value received at runtime is the name of an icon or of an alias. */
export function isAzIconName(value: unknown): value is AzIconName {
  return typeof value === 'string' && names.has(value)
}
