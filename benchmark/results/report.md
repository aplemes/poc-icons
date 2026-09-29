# Bundle benchmark

Library: 449 icons. Consumer built with Vite 8.3.1 and Vue 3.5.43, installing the tarball produced by `pnpm pack`.

## Initial bundle

JavaScript downloaded before the application starts: the entry and its static imports.

| Scenario | Raw | Gzip | Brotli | Over baseline (gzip) | Icons inside it |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline: Vue application without the library | 59.01 kB | 23.00 kB | 20.99 kB | 0.00 kB | 0 |
| A: one icon | 62.10 kB | 24.27 kB | 22.10 kB | 1.26 kB | 0 |
| B: 10 icons | 62.43 kB | 24.33 kB | 22.15 kB | 1.33 kB | 0 |
| C: 100 icons | 65.84 kB | 24.89 kB | 22.70 kB | 1.89 kB | 0 |
| Reference: every icon imported statically (what the library avoids) | 1436.03 kB | 456.04 kB | 364.65 kB | 433.03 kB | 449 |

## Icons loaded on demand

Measured by running each built application and recording the files it requested.

The registry is the chunk that maps each name to its file, requested once.

| Scenario | Icons used | Icon chunks requested | Icons drawn | Registry (gzip) | Icon chunks in the output | Size of all icon chunks (gzip) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline: Vue application without the library | 0 | 0 | 0 | 0.00 kB | 0 | 0.00 kB |
| A: one icon | 1 | 1 | 1 | 7.08 kB | 449 | 523.37 kB |
| B: 10 icons | 10 | 10 | 10 | 7.08 kB | 449 | 523.37 kB |
| C: 100 icons | 100 | 100 | 100 | 7.07 kB | 449 | 523.37 kB |
| Reference: every icon imported statically (what the library avoids) | 449 | 0 | 1 | 0.00 kB | 0 | 0.00 kB |

## Files per scenario

### Baseline: Vue application without the library

Initial bundle:

- `assets/index-jtR8GLQR.js`: 59.01 kB raw, 23.00 kB gzip, 20.99 kB brotli

Icons inside the initial bundle: 0.
Icon chunks requested at runtime: 0.

### A: one icon

Initial bundle:

- `assets/index-CnHx997I.js`: 62.10 kB raw, 24.27 kB gzip, 22.10 kB brotli

Icons inside the initial bundle: 0.
Icon chunks requested at runtime: 1 (search).

Also requested on demand: `assets/icon-loaders-UxySXjv2.js` (26.91 kB raw, 7.08 kB gzip, 6.34 kB brotli).

### B: 10 icons

Initial bundle:

- `assets/index-5dEafQqx.js`: 62.43 kB raw, 24.33 kB gzip, 22.15 kB brotli

Icons inside the initial bundle: 0.
Icon chunks requested at runtime: 10 (arrow-next, cart, check, chevron-down, cross, home, notification, profile, search, settings).

Also requested on demand: `assets/icon-loaders--w0QnJTZ.js` (26.91 kB raw, 7.08 kB gzip, 6.34 kB brotli).

### C: 100 icons

Initial bundle:

- `assets/index-vCmfNjzO.js`: 65.84 kB raw, 24.89 kB gzip, 22.70 kB brotli

Icons inside the initial bundle: 0.
Icon chunks requested at runtime: 100 (a11y, admin, administration, ai, apartment, api, arrow-back, arrow-bottom, arrow-bottom-left, arrow-bottom-right, arrow-next, arrow-redo, ...).

Also requested on demand: `assets/icon-loaders-C1KVQOJb.js` (26.91 kB raw, 7.07 kB gzip, 6.33 kB brotli).

### Reference: every icon imported statically (what the library avoids)

Initial bundle:

- `assets/index-qZSIF-Ai.js`: 1436.03 kB raw, 456.04 kB gzip, 364.65 kB brotli

Icons inside the initial bundle: 449.
Icon chunks requested at runtime: 0.
## Server rendering

Node loading the installed package directly, rendering `search`, `home` and an unknown name.

- `<svg>` elements in the HTML: 3
- with the drawing inside: 2

