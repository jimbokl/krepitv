# Design Specification

## Context

На сайте 85 SEO-материалов с общими и специализированными мастерами. SSR содержит ссылку на подбор внизу, но после React-гидратации часть страниц заменяет её контекстным переходом к другому справочнику, поэтому коммерческая цепочка не выглядит общей и проверяемой.

## Goal

После самостоятельного результата показать один общий блок: мастер → подбор по модели → карточка совместимого кронштейна → прямой Яндекс Маркет.

## Non-goals

Не менять расчёты, ранжирование совместимости, партнёрские URL, каталог, sitemap или число страниц. Не делать Маркет основным результатом диагностического мастера.

## Inputs

`SeoPage.jsx`, Rust SSR в `sitegen`, существующий `/podbor/`, карточки кронштейнов, compatibility graph и whole-site verify.

## Constraints

Только русский текст. Прямые ссылки Маркета остаются на карточках кронштейнов. CTA использует существующие Tailwind-токены и нативную ссылку. Результат мастера остаётся выше CTA и полезен без партнёрской ссылки.

## States

CTA статичен и одинаков для default/loading/empty/error/success/disabled; он не зависит от удалённых данных. В focus нативная ссылка получает существующий `focus-visible`-контур. В fail-closed результате `/podbor/` Маркет не показывается без совместимого кронштейна.

## Acceptance tests

- Все 85 SEO-страниц в SSR содержат `data-mount-funnel-next-step="true"` и явную кнопку `/podbor/` внутри блока.
- React-компонент содержит тот же marker, русский текст и ссылку.
- `/podbor/` в success показывает ссылки только на `/kronshteyny/{id}/` из compatibility graph.
- Каждая из 25 карточек кронштейнов содержит прямой `https://market.yandex.ru` переход или точный fail-closed поиск своей модели.
- На 320, 768 и 1440 px нет overflow, наложений и обрезанного текста; focus видим.
- Full build и design drift проходят.

## Allowed files

`web/src/pages/SeoPage.jsx`, `web/tests/seo-pages.test.mjs`, `crates/sitegen/src/main.rs`, `scripts/verify.mjs`, текущий design-harness run и сгенерированный `docs/**`.

## Verification commands

`npm run build`; design drift command из `task.json`; production browser smoke после deploy.

## Sources and claims

Локальные источники перечислены в `task.json`: GuidedSelectionPage, compatibility graph, MountPage и whole-site verify. Новых внешних продуктовых утверждений нет.

## Asset contract

HTML/Tailwind, точный русский текст рендерится детерминированно. Imagegen не используется: визуальный субстрат уже утверждён, задача — системный CTA-компонент.

## Review and rollback

Свежий независимый review проверяет реальные screenshots и цепочку. Rollback: откат release-коммита, пересборка `docs/`, повторный Pages deploy; состояния сервера и миграций нет.
