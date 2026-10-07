# Azulejo Icons

Ícones SVG do Azulejo para Vue 3, no pacote `@azulejo/icons`. Um único componente, `AzIcon`, que baixa cada ícone somente quando ele é usado.

## Como usar nos projetos

### 1. Instalar

```bash
pnpm add @azulejo/icons
# ou
npm install @azulejo/icons
```

O projeto precisa ter `vue` 3.4 ou superior. A biblioteca usa o Vue da aplicação.

### 2. Renderizar um ícone

```vue
<script setup lang="ts">
import { AzIcon } from '@azulejo/icons'
</script>

<template>
  <AzIcon icon="search" size="24" />
</template>
```

Não há CSS para importar nem plugin para registrar. O ícone é baixado na primeira vez que aparece e fica em cache.

### 3. Tamanho

`size` aceita 16, 24, 32, 48 ou 60, como número ou string. O padrão é 24. Outro valor é erro de compilação.

```vue
<AzIcon icon="search" size="32" />
<AzIcon icon="search" :size="32" />
```

### 4. Cor

O ícone usa a cor do texto (`currentColor`). Controle pelo CSS:

```vue
<AzIcon icon="cart" class="cart-icon" />
```

```css
.cart-icon {
  color: #78be20;
}
```

### 5. Acessibilidade

Sem `label`, o ícone é decorativo e fica oculto de leitores de tela. Com `label`, ele é lido como imagem:

```vue
<AzIcon icon="notification" label="Notificações" />
```

Em um botão só com ícone, dê o nome ao botão:

```vue
<button type="button" aria-label="Fechar">
  <AzIcon icon="cross" />
</button>
```

### 6. Nomes

O TypeScript sugere e valida os nomes. Um nome que chega em runtime, por exemplo de uma API, não quebra a aplicação: se não existir, o componente renderiza um espaço vazio do tamanho pedido.

```vue
<AzIcon :icon="iconFromApi as AzIconName" />
```

Para validar antes de renderizar:

```ts
import { isAzIconName } from '@azulejo/icons/names'
```

Os nomes seguem o Mozaic: `ui_arrow-next_24.svg` vira `arrow-next`, `ui_cross_24.svg` vira `cross`.

### 7. Nuxt e SSR

Funciona sem configuração. O servidor renderiza o ícone no HTML e o cliente mantém esse desenho durante a hidratação.

### Mais

Props, eventos, `preloadIcons`, `registerIcons` para ícones críticos, lista completa de nomes e decisões de arquitetura: [documentação da biblioteca](packages/icons/README.md).

## Estrutura do repositório

| Pasta                                        | Conteúdo                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| [`packages/icons`](packages/icons)           | A biblioteca. A documentação está no [README](packages/icons/README.md). |
| [`packages/playground`](packages/playground) | Aplicação Vue que consome a biblioteca pelo `exports` do pacote.         |
| [`benchmark`](benchmark)                     | Benchmark de bundle e verificação com Nuxt, usando o tarball do pacote.  |
| [`docs`](docs)                               | Guias: [como adicionar um novo ícone](docs/adicionar-icone.md).          |

## Requisitos

- Node.js 22.18 ou superior
- pnpm 12 (`corepack enable pnpm`)

## Comandos

```bash
pnpm install

pnpm generate         # gera src/generated a partir dos SVGs
pnpm build            # gera e faz o build da biblioteca
pnpm test             # testes
pnpm typecheck        # tipos da biblioteca e do playground
pnpm lint             # ESLint
pnpm format           # Prettier

pnpm playground       # build da biblioteca e playground em modo dev
pnpm benchmark        # benchmark de bundle
pnpm benchmark:nuxt   # verificação de SSR com Nuxt
```
