# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## KREPI TV binding decisions

- The public product is Russian-only. English UI copy, placeholders, errors,
  navigation, metadata, and accessibility labels are forbidden. Official model
  identifiers and standards such as VESA, HDMI and USB remain unchanged.
- Use `/Users/dmitrij/Documents/krepitv/DESIGN.md` as the binding token and
  rationale contract.
- Use `product-docs/design-references/01-homepage.png` for the home page,
  `02-guided-selection.png` for the guided matcher, and `03-model-page.png` for
  an exact model page.
- Use Tailwind CSS. Domain calculations and mount compatibility must come from
  the Rust/WASM engine; React owns interaction and presentation only.
- Keep the site static and compatible with free GitHub Pages hosting. Do not add
  a required application server or Cloud.ru dependency.
- Do not fabricate technical specifications, compatibility, review counts,
  prices, affiliate rewards, sources, ERID, or availability.
- Главная отвечает на широкий монтажный интент «как повесить телевизор на
  кронштейн»: сначала понятный порядок и проверка модели, затем стены, высоты
  и крепления. Она не подменяет подробную монтажную карту по адресу
  `/kak-povesit-televizor-na-stenu/` и не превращается в товарную витрину.
- Утверждённая обратная связь по UX (23.09.2026): интерфейс адресован человеку,
  который впервые вешает телевизор. На первом экране должно быть понятно одно
  следующее действие без знания VESA, «контрольной линии» и других терминов.
  Не собирать страницы из одинаковых карточек с плотными абзацами; давать
  короткий маршрут, разные по роли блоки и подробности по запросу. Техническую
  точность и предупреждения о безопасном монтаже сохранять.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
