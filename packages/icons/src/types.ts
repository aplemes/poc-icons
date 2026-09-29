import type { AzIconSize, AzIconSourceSize } from './sizes.js'

export type { AzIconName } from './generated/icon-names.js'
export type { AzIconSize, AzIconSourceSize }

/**
 * Value accepted by the `size` prop: the number or its string form, so both
 * `size="24"` and `:size="24"` are valid and type-checked.
 */
export type AzIconSizeProp = AzIconSize | `${AzIconSize}`

/**
 * One drawing of an icon: the inner markup of the `<svg>`.
 * The tuple form carries a viewBox that differs from `0 0 <size> <size>`.
 */
export type AzIconVariant = string | readonly [viewBox: string, body: string]

/** All drawings of one icon, keyed by source size. This is what an icon chunk exports. */
export type AzIconData = Readonly<Record<AzIconSourceSize, AzIconVariant>>

export type AzIconLoader = () => Promise<{ default: AzIconData }>
