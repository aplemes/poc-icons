export interface Scenario {
  id: string
  title: string
  /** Icons the application renders, which are the only ones expected to be downloaded. */
  icons: string[]
  /** Content of `src/App.vue`. */
  app: string
}

const TEN = [
  'search',
  'home',
  'cart',
  'profile',
  'notification',
  'settings',
  'arrow-next',
  'chevron-down',
  'cross',
  'check',
]

function appWith(icons: string[]): string {
  const tags = icons.map((icon) => `    <AzIcon icon="${icon}" size="24" />`).join('\n')
  return `<script setup lang="ts">
import { AzIcon } from '@azulejo/icons'
</script>

<template>
  <main>
${tags}
  </main>
</template>
`
}

export function createScenarios(allIcons: string[]): Scenario[] {
  const many = [...new Set([...TEN, ...allIcons])].slice(0, 100)
  const imports = allIcons.map(
    (icon, index) => `import i${index} from '@azulejo/icons/icons/${icon}'`,
  )
  const entries = allIcons.map((icon, index) => `  '${icon}': i${index},`)

  return [
    {
      id: 'baseline',
      title: 'Baseline: Vue application without the library',
      icons: [],
      app: `<template>\n  <main>no icons</main>\n</template>\n`,
    },
    {
      id: 'a-one-icon',
      title: 'A: one icon',
      icons: ['search'],
      app: appWith(['search']),
    },
    {
      id: 'b-ten-icons',
      title: 'B: 10 icons',
      icons: TEN,
      app: appWith(TEN),
    },
    {
      id: 'c-many-icons',
      title: `C: ${many.length} icons`,
      icons: many,
      app: appWith(many),
    },
    {
      id: 'eager-reference',
      title: 'Reference: every icon imported statically (what the library avoids)',
      icons: allIcons,
      app: `<script setup lang="ts">
import { AzIcon, registerIcons } from '@azulejo/icons'
${imports.join('\n')}

registerIcons({
${entries.join('\n')}
})
</script>

<template>
  <main>
    <AzIcon icon="search" size="24" />
  </main>
</template>
`,
    },
  ]
}
