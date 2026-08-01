# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Page shell and typography | `SeoPage`, Tailwind tokens | reuse | Existing Phone→TV and No-signal pages |
| Closed choice wizard | `ChoiceGrid`, `TriStateChoice` patterns | extend into shared component | Native radios, 48 px targets |
| Local deterministic result | Rust engine + `loadEngine` | extend | Existing WASM entrypoints |
| Loading/error/retry/focus | Existing traffic wizards | reuse | Same state transitions and focus contract |
| Analytics | `emitResultCompleted` | reuse | bounded `toolId`/`resultType` only |
| Crawlable answer | sitegen traffic static section | extend | initial HTML without JS |
| Source links | existing reference sections | extend | direct official URLs and checked date |
| Homepage discovery | `getHomeFeaturedPages` | extend limit to seven | one compact grid, no header growth |
