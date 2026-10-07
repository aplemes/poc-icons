# @azulejo/icons

Ícones SVG do Azulejo para Vue 3. Um único componente, `AzIcon`, que baixa cada ícone somente quando ele é usado.

- 449 ícones, cada um com 5 desenhos ajustados por tamanho.
- Importar `AzIcon` acrescenta cerca de 1,3 kB (gzip) ao bundle inicial, qualquer que seja o número de ícones da biblioteca.
- Nomes e tamanhos tipados, com autocomplete.
- Funciona em SPA, SSR e Nuxt.

## Instalação

```bash
pnpm add @azulejo/icons
# ou
npm install @azulejo/icons
```

`vue` (3.4 ou superior) é `peerDependency`: a biblioteca usa o Vue da aplicação.

## Utilização

```vue
<script setup lang="ts">
import { AzIcon } from '@azulejo/icons'
</script>

<template>
  <AzIcon icon="search" size="24" />
</template>
```

Não há CSS para importar nem plugin para registrar.

## API

### Props

| Prop    | Tipo             | Padrão | Descrição                                                       |
| ------- | ---------------- | ------ | --------------------------------------------------------------- |
| `icon`  | `AzIconName`     | —      | Obrigatória. Nome do ícone.                                     |
| `size`  | `AzIconSizeProp` | `24`   | Tamanho em px. Aceita o número ou a string equivalente.         |
| `label` | `string`         | —      | Nome acessível. Informe quando o ícone tem significado sozinho. |

Qualquer outro atributo (`class`, `style`, `data-*`, `aria-*`, listeners) é repassado ao `<svg>`.

### Eventos

| Evento  | Payload   | Quando                                 |
| ------- | --------- | -------------------------------------- |
| `error` | `unknown` | O chunk do ícone não pôde ser baixado. |

### Funções

| Função                 | Descrição                                                                         |
| ---------------------- | --------------------------------------------------------------------------------- |
| `preloadIcons(names)`  | Baixa ícones antes do primeiro uso. Retorna uma `Promise`.                        |
| `loadIcon(name)`       | Baixa um ícone e retorna seus dados. Resolve `undefined` se o nome não existe.    |
| `registerIcons(icons)` | Registra ícones importados estaticamente, que passam a renderizar sem requisição. |

### Entradas do pacote

| Import                        | Conteúdo                                                      |
| ----------------------------- | ------------------------------------------------------------- |
| `@azulejo/icons`              | `AzIcon`, funções, tipos e `AZ_ICON_SIZES`.                   |
| `@azulejo/icons/names`        | `azIconNames`, `azIconCategories` e `isAzIconName` (runtime). |
| `@azulejo/icons/icons/<nome>` | Dados de um ícone, para import estático com `registerIcons`.  |

### Tipos

```ts
import type { AzIconName, AzIconSize, AzIconSizeProp, AzIconData } from '@azulejo/icons'
```

`AzIconName` é a união de todos os nomes, gerada a partir dos SVGs.

## Tamanhos disponíveis

| `size` | Desenho usado |
| -----: | ------------: |
|     16 |            20 |
|     24 |            24 |
|     32 |            32 |
|     48 |            48 |
|     60 |            64 |

A fonte dos ícones tem um desenho por tamanho (20, 24, 32, 48 e 64), com espessura de traço ajustada. Os tamanhos 16 e 60 do Design System usam o desenho mais próximo, redimensionado. O mapeamento fica em [`src/sizes.ts`](src/sizes.ts).

As duas formas são válidas e verificadas pelo TypeScript:

```vue
<AzIcon icon="search" size="24" />
<AzIcon icon="search" :size="24" />
```

Um tamanho fora da lista é erro de tipo. Se chegar em runtime, o componente usa 24 e avisa no console em desenvolvimento.

## Cor

Os ícones pintam com `currentColor`, então a cor vem do CSS:

```vue
<AzIcon icon="cart" class="my-icon" />
```

```css
.my-icon {
  color: red;
}
```

Ícones multicoloridos mantêm as próprias cores e não são afetados por `color`.

## Acessibilidade

Sem `label`, o ícone é decorativo e fica oculto de leitores de tela:

```html
<svg aria-hidden="true" ...></svg>
```

Com `label`, ele é exposto como imagem:

```vue
<AzIcon icon="notification" label="Notificações" />
```

```html
<svg role="img" aria-label="Notificações" ...></svg>
```

`aria-label` e `aria-labelledby` passados como atributos têm o mesmo efeito. Em um botão que só contém o ícone, prefira dar o nome ao botão e manter o ícone decorativo:

```vue
<button type="button" aria-label="Fechar">
  <AzIcon icon="cross" />
</button>
```

## Exemplos

### Nome vindo de uma API

```vue
<script setup lang="ts">
import { AzIcon } from '@azulejo/icons'
import type { AzIconName } from '@azulejo/icons'

defineProps<{ iconFromApi: string }>()
</script>

<template>
  <AzIcon :icon="iconFromApi as AzIconName" />
</template>
```

Um nome inexistente não quebra a aplicação: o componente renderiza um `<svg>` vazio no tamanho pedido. Em desenvolvimento há um aviso no console, uma vez por nome. Em produção, nenhum.

Para validar antes de renderizar:

```ts
import { isAzIconName } from '@azulejo/icons/names'

if (isAzIconName(value)) {
  // value é AzIconName
}
```

`isAzIconName` fica em `@azulejo/icons/names` porque depende da lista completa de nomes (3,5 kB gzip).

### Ícones críticos sem requisição

Para ícones visíveis no primeiro paint de uma SPA, importe-os estaticamente. Eles entram no bundle da aplicação e renderizam de forma síncrona:

```ts
import { registerIcons } from '@azulejo/icons'
import menu from '@azulejo/icons/icons/menu'
import search from '@azulejo/icons/icons/search'

registerIcons({ menu, search })
```

### Pré-carregar ícones

```ts
import { preloadIcons } from '@azulejo/icons'

// Por exemplo, ao passar o mouse sobre o botão que abre um menu.
preloadIcons(['profile', 'settings', 'log-out'])
```

### Alinhamento

O `<svg>` recebe a classe `az-icon`, sem estilo associado. Para alinhar com texto:

```css
.az-icon {
  flex-shrink: 0;
  vertical-align: middle;
}
```

### Nuxt

Nenhuma configuração é necessária. No servidor, a renderização espera o ícone e o HTML já sai com o desenho. No cliente, a hidratação mantém esse desenho enquanto o chunk é baixado.

## Como adicionar novos ícones

1. Coloque os 5 SVGs em [`svg/`](svg), seguindo `<categoria>_<nome>_<tamanho>.svg`:

   ```text
   ui_arrow-right_20.svg
   ui_arrow-right_24.svg
   ui_arrow-right_32.svg
   ui_arrow-right_48.svg
   ui_arrow-right_64.svg
   ```

2. Execute `pnpm generate`.

O ícone passa a existir como `arrow-right`, com tipo, loader e chunk próprios. Nada mais precisa ser editado.

O guia completo, com as regras de nome e conteúdo, a verificação, os erros possíveis e como remover ou renomear, está em [docs/adicionar-icone.md](../../docs/adicionar-icone.md).

## Como executar a geração

```bash
pnpm generate
```

O script lê `svg/` e escreve `src/generated/`, que não é versionado:

```text
src/generated/
  icon-names.ts      type AzIconName
  icon-loaders.ts    um import() por ícone
  icon-list.ts       lista de nomes e categorias
  icons/<nome>.ts    dados de cada ícone
```

Se houver SVG inválido ou nome duplicado, o script lista todos os problemas, não escreve nada e termina com código 1:

```text
Icon generation failed. Nothing was written.

Duplicated icon names (1):
  "close" at size 20:
    - media_close_20.svg
    - ui_close_20.svg
Invalid SVGs (1):
  ui_no-viewbox_20.svg
    - missing viewBox
```

O que a geração normaliza:

| Normalização                                      | Motivo                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| Otimização com SVGO                               | Reduz o tamanho sem alterar o desenho.                               |
| Cor única vira `currentColor`                     | Permite controlar a cor por CSS.                                     |
| Ícone com duas ou mais cores fica intacto         | Preserva ícones multicoloridos, gradientes e padrões.                |
| Atributos do `<svg>` raiz vão para um `<g>`       | Preserva `fill="none"`, `stroke`, `stroke-width` de ícones de traço. |
| Prefixo nos `id`                                  | Evita colisão entre ícones na mesma página.                          |
| Remoção de `clip-path` igual ao `viewBox` inteiro | Artefato de exportação, sem efeito visual.                           |

`viewBox`, `fill-rule`, `opacity` e demais atributos de desenho são preservados.

A saída é determinística: depende só do conteúdo dos SVGs.

## Como executar os testes

```bash
pnpm test          # gera os ícones e roda a suíte
pnpm test:watch
pnpm typecheck
```

A suíte cobre renderização, resolução por nome, tamanhos, ícone inexistente, acessibilidade, `fill`, `stroke`, multicolorido, carregamento assíncrono, SSR, hidratação, geração e nomes duplicados.

## Como executar o benchmark

Na raiz do repositório:

```bash
pnpm benchmark        # bundle, com Vite
pnpm benchmark:nuxt   # SSR, com Nuxt
```

O benchmark empacota a biblioteca com `pnpm pack`, instala o tarball em uma aplicação fora do workspace, gera um build por cenário e executa cada build para registrar os arquivos requisitados. O relatório fica em `benchmark/results/report.md`.

Resultado com 449 ícones, Vite 8.3.1 e Vue 3.5.43:

| Cenário                                     | Bundle inicial (gzip) | Acima da base | Ícones no bundle inicial | Chunks de ícone requisitados |
| ------------------------------------------- | --------------------: | ------------: | -----------------------: | ---------------------------: |
| Base: aplicação Vue sem a biblioteca        |              23,00 kB |             — |                        0 |                            0 |
| A: 1 ícone                                  |              24,33 kB |       1,32 kB |                        0 |                            1 |
| B: 10 ícones                                |              24,39 kB |       1,38 kB |                        0 |                           10 |
| C: 100 ícones                               |              24,94 kB |       1,93 kB |                        0 |                          100 |
| Referência: os 449 importados estaticamente |             456,03 kB |     433,03 kB |                      449 |                            0 |

O crescimento entre A e C vem do template da própria aplicação, que tem 100 tags.

Além do bundle inicial, a aplicação baixa sob demanda:

- o registro de ícones, uma vez: 7,08 kB gzip;
- um chunk por ícone usado: 1,17 kB gzip em média.

## Como fazer build

```bash
pnpm build
```

Executa a geração, o build com Vite em library mode e a emissão dos `.d.ts` com `tsc`. A saída vai para `dist/`:

```text
dist/
  index.js, index.d.ts
  names.js, names.d.ts
  components/AzIcon.js
  loader.js, sizes.js
  generated/icon-loaders.js
  generated/icons/<nome>.js
```

Características do pacote:

- somente ESM, com `exports`, `main`, `module` e `types`;
- `"sideEffects": false`;
- `vue` externo, como `peerDependency`;
- sourcemaps para o código (os módulos de ícone são dados e não têm sourcemap);
- só `dist/` é publicado.

## Decisões arquiteturais

### Dados em vez de componentes

Cada ícone é um módulo que exporta strings com o conteúdo interno do `<svg>`. `AzIcon` é o único componente.

Gerar 449 componentes Vue colocaria em cada chunk uma render function e um import de `vue`. Com dados, o chunk tem só o desenho e o custo de runtime é uma instância de componente por ícone.

### Mapa explícito de `import()`

O registro é um objeto gerado com um `import('./icons/<nome>.js')` literal por ícone.

| Alternativa                     | Por que não                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `import.meta.glob`              | É resolvido no build da biblioteca. No pacote publicado sobra o mesmo mapa, então não há ganho.     |
| `import()` com template string  | Depende de cada bundler do consumidor analisar o caminho dentro de `node_modules`. Não é garantido. |
| Virtual module ou plugin de SVG | Exigiria que o consumidor instalasse e configurasse um plugin.                                      |
| Sprite SVG único                | Baixa todos os ícones para usar um.                                                                 |
| Imports estáticos em um objeto  | Coloca os 449 ícones no bundle inicial (456 kB gzip no benchmark).                                  |

Um `import()` literal com caminho relativo é ESM padrão: Vite, Rollup, webpack, esbuild e o próprio Node o entendem. Por isso o code splitting sobrevive ao build da biblioteca e ao segundo build, feito pelo consumidor.

### Registro carregado sob demanda

O mapa tem 449 entradas e, no build do consumidor, cada uma ganha um hash no nome do arquivo. Hashes não comprimem: o mapa pesa 7,08 kB gzip.

Na primeira versão ele fazia parte do bundle inicial, que ficava 8,48 kB acima da base. Como chunk separado, o custo caiu para 1,32 kB.

A contrapartida é uma requisição a mais antes do primeiro ícone de uma SPA. Ela acontece uma vez por sessão. Em SSR não tem efeito, porque o ícone já vem no HTML. Para ícones críticos em SPA, use `registerIcons`.

### Um chunk por ícone, com os 5 desenhos

| Alternativa                  | Resultado                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Um chunk por ícone (adotada) | Registro de 7 kB. Cada ícone usado custa 1,17 kB em média e traz os 5 tamanhos.                  |
| Um chunk por ícone e tamanho | 2 245 chunks. Registro estimado em 35 kB, 5 vezes o medido. Cada ícone custaria cerca de 0,3 kB. |
| Um chunk por categoria       | 4 chunks de cerca de 130 kB. Baixa mais de 100 ícones para usar um.                              |

Trocar o tamanho de um ícone já carregado não gera nova requisição.

### Loader próprio em vez de `defineAsyncComponent`

| Aspecto              | `defineAsyncComponent`                | Loader do `AzIcon`                         |
| -------------------- | ------------------------------------- | ------------------------------------------ |
| Durante o download   | Placeholder sem acesso às props       | `<svg>` no tamanho final, sem layout shift |
| Instâncias por ícone | 3 (AzIcon, wrapper assíncrono, ícone) | 1                                          |
| Ícone já carregado   | Renderização síncrona                 | Renderização síncrona                      |
| SSR                  | Suportado                             | `onServerPrefetch`                         |

O componente tem um `shallowRef` e um `watch`, ambos sobre `icon`.

### SSR e hidratação

- **Servidor.** `onServerPrefetch` faz a renderização esperar o ícone. O pacote é ESM com extensões explícitas, então o Node o carrega direto de `node_modules`, como Nuxt e Vite fazem com dependências externalizadas.
- **Cliente.** Na hidratação o ícone ainda não está em memória. O componente renderiza o `<svg>` sem `innerHTML`, e o Vue não toca nos filhos de um elemento nessa condição. O desenho enviado pelo servidor continua na tela. Quando o chunk chega, o conteúdo é substituído por outro idêntico.
- **Cache.** É um `Map` de dados imutáveis, igual para todas as requisições. Não guarda estado de usuário.

Esse comportamento é coberto por testes com `renderToString` e `createSSRApp` e pelo build real de Nuxt em `pnpm benchmark:nuxt`.

### `innerHTML`

O conteúdo vem de SVGs validados na geração, que rejeita `<script>`, handlers `on*` e referências externas. Nenhum valor de runtime é interpolado no markup.

### `AzIcon` em TypeScript, sem SFC

O componente usa `defineComponent` com render function. O build da biblioteca dispensa o plugin do Vue e o `vue-tsc`, e os `.d.ts` saem do `tsc`.

### Limitações conhecidas

- O build do consumidor emite os 449 chunks de ícone, mesmo que use poucos. Eles só são baixados quando usados.
- Os ícones `danger` e `warning-triangle` têm desenho idêntico no tamanho 64 na fonte.
