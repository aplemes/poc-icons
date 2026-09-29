import { defineComponent, h, onServerPrefetch, shallowRef, watch } from 'vue'
import type { PropType } from 'vue'
import { getLoadedIcon, loadIcon } from '../loader.js'
import { AZ_ICON_DEFAULT_SIZE, AZ_ICON_SIZE_MAP } from '../sizes.js'
import type { AzIconData, AzIconName, AzIconSize, AzIconSizeProp } from '../types.js'

function resolveSize(value: unknown): AzIconSize {
  const size = Number(value)
  if (Object.hasOwn(AZ_ICON_SIZE_MAP, size)) return size as AzIconSize
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[AzIcon] Invalid size "${String(value)}". ` +
        `Expected one of ${Object.keys(AZ_ICON_SIZE_MAP).join(', ')}. ` +
        `Using ${AZ_ICON_DEFAULT_SIZE}.`,
    )
  }
  return AZ_ICON_DEFAULT_SIZE
}

export const AzIcon = defineComponent({
  name: 'AzIcon',
  props: {
    /** Name of the icon. */
    icon: { type: String as PropType<AzIconName>, required: true },
    /** Size in px, one of the Design System sizes. */
    size: { type: [Number, String] as PropType<AzIconSizeProp>, default: AZ_ICON_DEFAULT_SIZE },
    /**
     * Accessible name. Set it when the icon carries meaning on its own; leave it out
     * for decorative icons, which are hidden from assistive technologies.
     */
    label: { type: String, default: undefined },
  },
  emits: {
    /** The icon chunk could not be downloaded. */
    error: (error: unknown) => error !== undefined,
  },
  setup(props, { attrs, emit }) {
    const data = shallowRef<AzIconData | undefined>(getLoadedIcon(props.icon))

    function load(name: string): Promise<void> {
      return loadIcon(name).then(
        (icon) => {
          // The prop may have changed while the chunk was downloading.
          if (name === props.icon) data.value = icon
        },
        (error: unknown) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[AzIcon] Failed to load the icon "${name}".`, error)
          }
          if (name === props.icon) emit('error', error)
        },
      )
    }

    if (!data.value) {
      const request = load(props.icon)
      // On the server the render waits for the icon, so the HTML already contains it.
      onServerPrefetch(() => request)
    }

    watch(
      () => props.icon,
      (name) => {
        data.value = getLoadedIcon(name)
        if (!data.value) void load(name)
      },
    )

    return () => {
      const size = resolveSize(props.size)
      const sourceSize = AZ_ICON_SIZE_MAP[size]
      const variant = data.value?.[sourceSize]
      const isTuple = typeof variant === 'object'
      const labelled = !!(props.label || attrs['aria-label'] || attrs['aria-labelledby'])

      // The element is rendered even before the icon arrives, so it reserves its space
      // and the layout does not shift.
      return h('svg', {
        class: 'az-icon',
        viewBox: isTuple ? variant[0] : `0 0 ${sourceSize} ${sourceSize}`,
        width: size,
        height: size,
        fill: 'currentColor',
        role: labelled ? 'img' : undefined,
        'aria-label': props.label,
        'aria-hidden': labelled ? undefined : 'true',
        innerHTML: isTuple ? variant[1] : variant,
      })
    }
  },
})
