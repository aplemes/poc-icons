# Azulejo Icons

Workspace da biblioteca `@azulejo/icons`.

| Pasta                                        | Conteúdo                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| [`packages/icons`](packages/icons)           | A biblioteca. A documentação está no [README](packages/icons/README.md). |
| [`packages/playground`](packages/playground) | Aplicação Vue que consome a biblioteca pelo `exports` do pacote.         |
| [`benchmark`](benchmark)                     | Benchmark de bundle e verificação com Nuxt, usando o tarball do pacote.  |

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
