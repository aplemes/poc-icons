/**
 * Single source of truth for icon sizes.
 *
 * The design source ships one hand-tuned drawing per *source* size (stroke weight and
 * details change with the size). The public API exposes the Design System sizes and maps
 * each one to the closest drawing.
 *
 * To change the public sizes or the mapping, edit only this file and run `pnpm generate`.
 */
export const AZ_ICON_SIZE_MAP = {
  16: 20,
  24: 24,
  32: 32,
  48: 48,
  60: 64,
} as const

/** Sizes accepted by `<AzIcon size>`, in px. */
export type AzIconSize = keyof typeof AZ_ICON_SIZE_MAP

/** Sizes of the drawings available in the SVG source. */
export type AzIconSourceSize = (typeof AZ_ICON_SIZE_MAP)[AzIconSize]

export const AZ_ICON_SIZES = Object.keys(AZ_ICON_SIZE_MAP).map(Number) as AzIconSize[]

export const AZ_ICON_DEFAULT_SIZE = 24 satisfies AzIconSize
