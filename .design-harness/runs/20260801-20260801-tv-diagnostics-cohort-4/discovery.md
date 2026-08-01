# Discovery

## Existing Design System

Tailwind-токены `paper/ink/action/technical/verified/danger/line/muted`, display и
mono-роли уже утверждены и опубликованы. Общий `TvTrafficTaskWizard` реализует
закрытые radio-группы, optional `<details>`, disabled/loading/error/success/focus,
локальный вызов одного WASM entrypoint и bounded analytics. `SeoPage`, sitegen и
`seoPages.mjs` содержат явные route-, SSR- и related-карты диагностических страниц.

## Reuse Decisions

Переиспользовать мастер без новой композиции, цвета и изображения. Расширить
конфигурации, source registry, Rust dispatcher, SSR fallback, главную подборку и
внутреннюю карту ссылок синхронно. Сохранить текущий progressive disclosure:
два обязательных наблюдения видны, дополнительные убраны под кат.

## New Primitives And Rationale

None. Новые интенты выражаются данными и ветками существующих примитивов.

## Risks

Автоматический fallback related для `kind=calculator` уводит в крепёж и создаёт
нерелевантную перелинковку, поэтому каждый новый id требует явной карты и теста.
USB-интент легко смешать с телефоном, Android storage и HDD для записи: страница
ограничивается флешкой для просмотра медиа. Wordstat-головы «не включается» и
«завис» исключены: строгая фиксация словоформ дала `no_data`.
