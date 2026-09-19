# Design Specification

## Context
Спрос Wordstat и отсутствие специализированных страниц в текущем каталоге.

## Goal
Три самостоятельных мастера и проверка VESA на двух существующих посадочных.

## Non-goals
Редизайн, реклама, подбор случайных кодов пульта и неподтверждённой совместимости.

## Inputs
data/seo_pages.json, официальные источники, DESIGN.md, существующий VesaMatchCalculator.

## Constraints
Русский язык, Tailwind-токены, локальный Rust/WASM, без передачи пользовательских ответов. SSR с таблицей, источниками, конкретным ответом.

## States
Пустые select и недоступная кнопка до выбора; default, focus, loading, error с повтором, success. Смена ввода очищает старый результат.

## Acceptance tests
На 320/768/1440 px нет горизонтального overflow. Все label связаны с select. Tab и Enter работают. Результат объявляется aria-live. Loading исключает повторную отправку. Неизвестные параметры закрывают положительную рекомендацию. Новые canonical имеют входящие ссылки. VESA 300×200 не равно 200×300.

## Allowed files
web/src, web/tests, crates/engine/src, crates/sitegen/src, data, scripts/research, scripts/qa, .design-harness, product-docs, docs.

## Verification commands
npm run build
node scripts/qa/semantic-helpers.mjs

## Sources and claims
Google и Apple — точка доступа; Sony — локальные файлы; РТРС — эфир; One For All — инструкция конкретного пульта. Ссылки в task.json и на страницах. Общая инструкция не выдаётся за универсальное меню любой модели.

## Asset contract
HTML/JSX и текст Rust. Screenshots PNG 320×800, 768×1024, 1440×900. Никаких сгенерированных картинок или новых цветов.

## Review and rollback
Независимый reviewer проверяет реальные screenshots и код. Откат revert только коммита спринта, повторный build/deploy; чужие изменения сохраняются.
