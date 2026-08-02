# KREPI TV — воспроизводимая сборка исходников

Дата фиксации: 2 августа 2026 года.

## Контракт

Исходники проверяются отдельным workflow `.github/workflows/ci.yml` на push в
`main` и на pull request. Workflow имеет только `contents: read`, не получает
секреты, не коммитит артефакты и не выполняет deploy. Все GitHub Actions
закреплены полными commit SHA.

Сборочный стек закреплён файлами репозитория:

- Node.js 22.23.2 — `.node-version`;
- npm 10.9.8 — поле `packageManager` корневого `package.json`;
- Rust 1.93.1, `rustfmt` и `wasm32-unknown-unknown` — `rust-toolchain.toml`;
- `wasm-pack` 0.13.1 — явная проверка и установка в workflow.

CI устанавливает интерфейс строго через `web/package-lock.json` и запускает
единый `npm run build`. После него все tracked-артефакты, кроме скомпилированного
WASM, обязаны дать нулевой diff. WASM может побайтово различаться между
host-компиляторами macOS и Linux, поэтому для него действуют два более точных
инварианта: две последовательные сборки на одном runner имеют одинаковые
SHA-256, а собранный `web/public/pkg/krepitv_engine_bg.wasm` точно совпадает с
копией `docs/pkg/krepitv_engine_bg.wasm` текущей сборки.

Публикация остаётся отдельным workflow Pages, но больше не доверяет
cross-host-бинарнику из Git. На каждый production-relevant push она сама
повторяет закреплённый полный build на Ubuntu, проверяет tracked diff всех
артефактов кроме WASM и загружает именно созданный runner-ом `docs/`. Build job
имеет только `contents: read`; `pages: write` и `id-token: write` принадлежат
отдельному deploy job, который зависит от успешной сборки. Поэтому изменение
исходников не может опубликовать старый WASM.

## Воспроизводимость WASM

`scripts/build-wasm.mjs` передаёт Cargo зафиксированный lockfile и динамически
переназначает корень проекта и Cargo home в стабильные `/workspace` и `/cargo`.
После сборки он проверяет пакет на исходные абсолютные пути машины.
`scripts/verify-wasm-reproducibility.mjs` повторяет сборку и сравнивает SHA-256
всех пяти файлов пакета, включая бинарный `.wasm` и JavaScript glue.

Корневая MIT-лицензия явно наследуется обоими Rust-пакетами. Для локальной
проверки используются:

```bash
npm --prefix web ci --no-audit --no-fund
npm run build
cargo package -p krepitv-engine --allow-dirty --no-verify
```

## Текущий продуктовый масштаб и gate

Сборка валидирует 164 индексируемых URL, 54 SEO-материала, 80 моделей,
23 кронштейна и 1 405 связей совместимости. Эти объёмы не являются трафиком.
Операционная цель остаётся консервативной: не менее 1 001 легитимного
уникального посетителя в сутки в каждый из семи подряд полностью завершённых
дней. CI, HTTP 200, sitemap, индексирование и показы этот gate не заменяют.
