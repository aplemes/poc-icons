/**
 * Extra names for icons that already exist.
 *
 * An alias is a second public name for the same drawing: it points to the chunk of its
 * target, so nothing is duplicated. The name used in the SVG source stays valid.
 *
 * After editing, run `pnpm generate`.
 */
export const aliases: Record<string, string> = {
  'arrow-left': 'arrow-back',
  'arrow-right': 'arrow-next',
  'arrow-up': 'arrow-top',
  'arrow-down': 'arrow-bottom',
  close: 'cross',
}
