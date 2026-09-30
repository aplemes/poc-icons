/**
 * Compile-time checks of the public API, verified by `pnpm typecheck`.
 * Each `@ts-expect-error` fails the type check if the line below it stops being an error.
 */
import { AzIcon } from '@azulejo/icons'
import { h } from 'vue'

h(AzIcon, { icon: 'search' })
h(AzIcon, { icon: 'search', size: 24 })
h(AzIcon, { icon: 'search', size: '24' })
h(AzIcon, { icon: 'search', label: 'Search' })
// An alias is a valid name.
h(AzIcon, { icon: 'arrow-right' })

// @ts-expect-error unknown icon name
h(AzIcon, { icon: 'not-an-icon' })
// @ts-expect-error size outside the Design System
h(AzIcon, { icon: 'search', size: 20 })
// @ts-expect-error size outside the Design System
h(AzIcon, { icon: 'search', size: '18' })
// @ts-expect-error icon is required
h(AzIcon, { size: 24 })
