# Como adicionar um novo ícone

Este guia é para quem vai incluir, atualizar ou remover ícones na biblioteca `@azulejo/icons`. Não é preciso conhecer o código: o processo é colocar os SVGs na pasta certa e rodar um comando.

## Antes de começar

- Clone o repositório e rode `pnpm install` na raiz.
- Tenha os SVGs do ícone exportados do Figma (ou recebidos do Mozaic) nos **5 tamanhos**: 20, 24, 32, 48 e 64.

Cada tamanho é um desenho próprio, com a espessura de traço ajustada. A biblioteca não redimensiona um desenho para os outros tamanhos.

## 1. Nomear os arquivos

O nome do arquivo define tudo: a categoria, o nome público do ícone e o tamanho.

```text
<categoria>_<nome>_<tamanho>.svg
```

Exemplo para um ícone chamado `arrow-right` da categoria `ui`:

```text
ui_arrow-right_20.svg
ui_arrow-right_24.svg
ui_arrow-right_32.svg
ui_arrow-right_48.svg
ui_arrow-right_64.svg
```

Regras:

| Parte       | Regra                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- |
| `categoria` | `ui`, `business`, `media` ou `product`. Serve para organizar; não entra no nome público. |
| `nome`      | Letras, números e hífen. Vira minúsculo: `Sort-down` e `sort-down` são o mesmo ícone.    |
| `tamanho`   | Um de `20`, `24`, `32`, `48`, `64`.                                                      |

O nome público é só o trecho do meio: `ui_arrow-right_24.svg` vira `arrow-right`. Por isso **não pode existir o mesmo nome em duas categorias**: `ui_close` e `media_close` seriam o mesmo `close`, e a geração recusa.

## 2. Conferir o conteúdo dos SVGs

O que cada arquivo precisa ter:

- `viewBox` igual ao tamanho: `viewBox="0 0 24 24"` no arquivo `_24`.
- Só elementos de desenho (`path`, `rect`, `circle`, `g`, `defs`, `clipPath`, etc.).

O que não é aceito:

- `<script>`, `<foreignObject>`, `<image>`, `<iframe>`.
- Atributos de evento (`onclick`, `onload`, ...).
- Referências externas (`href="https://..."`).

Sobre cores, não é preciso fazer nada:

- Ícone com **uma cor** (o normal): a cor é trocada por `currentColor`, e a aplicação controla pelo CSS.
- Ícone com **duas ou mais cores**: as cores são mantidas como estão.

Também não é preciso otimizar o SVG nem limpar o que o Figma exporta. A geração cuida disso.

## 3. Colocar os arquivos na pasta

Copie os 5 arquivos para:

```text
packages/icons/svg/
```

Para **atualizar** um ícone existente, substitua os arquivos de mesmo nome.

## 4. Rodar a geração

Na raiz do repositório:

```bash
pnpm generate
```

Saída esperada:

```text
Generated 450 icons (5 sizes each) from .../packages/icons/svg
  4 files written, 0 removed, 0 multicolor, 2500 ms
```

Os 4 arquivos escritos são o módulo do ícone novo e os três índices (nomes, loaders e lista). Nenhum outro arquivo do projeto precisa ser editado: o componente `AzIcon` descobre os ícones por esses índices.

Se a saída for `0 files written`, os SVGs não estão na pasta certa ou já existiam iguais.

## 5. Verificar

```bash
pnpm test                       # roda a geração e os testes
pnpm playground                 # abre o playground em http://localhost:5173
```

No playground, clique em **Load every icon** e filtre pelo nome. Confira o ícone nos 5 tamanhos e troque a cor para ver se ele acompanha.

Para usar em código:

```vue
<AzIcon icon="arrow-right" size="24" />
```

O nome novo já aparece no autocomplete do editor.

## 6. Abrir o PR

Inclua no PR só os SVGs. A pasta `packages/icons/src/generated/` não é versionada; ela é recriada em qualquer máquina com `pnpm generate`.

Versão do pacote a publicar depois do merge:

| Mudança                       | Versão  | Motivo                                                   |
| ----------------------------- | ------- | -------------------------------------------------------- |
| Ícone novo                    | `minor` | Nome novo, nada quebra.                                  |
| Desenho de um ícone corrigido | `patch` | Mesmo nome, só o visual muda.                            |
| Ícone renomeado ou removido   | `major` | O nome antigo deixa de compilar nos projetos que o usam. |

## Quando a geração falha

Ela lista **todos** os problemas de uma vez, não escreve nada e termina com erro. Exemplos:

```text
Icon generation failed. Nothing was written.

Duplicated icon names (1):
  "close" at size 20:
    - media_close_20.svg
    - ui_close_20.svg
Invalid SVGs (2):
  ui_arrow-right_20.svg
    - icon "arrow-right" is missing the drawings for size 48, 64
  ui_new icon_24.svg
    - file name must follow "<category>_<name>_<size>.svg" using letters, digits and "-"
```

| Mensagem                                   | O que fazer                                            |
| ------------------------------------------ | ------------------------------------------------------ |
| `is missing the drawings for size ...`     | Faltam arquivos. Exporte os tamanhos indicados.        |
| `file name must follow ...`                | Renomeie o arquivo no padrão `categoria_nome_tamanho`. |
| `size 16 is not one of 20, 24, 32, 48, 64` | O tamanho no nome não é um dos aceitos.                |
| `Duplicated icon names`                    | Dois arquivos viram o mesmo nome. Renomeie um deles.   |
| `missing viewBox`                          | Exporte de novo com `viewBox`.                         |
| `<script> is not allowed in an icon`       | Remova o elemento do SVG.                              |
| `the icon has nothing to draw`             | O SVG está vazio.                                      |

Corrija e rode `pnpm generate` de novo.

## Remover ou renomear um ícone

- **Remover:** apague os 5 arquivos e rode `pnpm generate`. A saída mostra `1 removed`.
- **Renomear:** renomeie os 5 arquivos e rode `pnpm generate`. O nome antigo some e o novo aparece.

Nos dois casos, projetos que usavam o nome antigo passam a ter erro de tipo, então a publicação é `major`.

## Usar os SVGs direto do repositório do Mozaic

Para gerar a partir de outra pasta sem copiar os arquivos:

```bash
pnpm generate --source /caminho/para/mozaic-icons/src/icons/SVG
```

Isso serve para testar. A pasta `packages/icons/svg/` continua sendo a fonte oficial da biblioteca.
