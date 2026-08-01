# Design Specification

## Context

KREPI TV должен набрать более 1 000 реальных посетителей в сутки до повторной
модерации партнёрской площадки. Два первых самостоятельных traffic-first
canonical уже опубликованы. Wordstat-срез 01.08.2026 подтвердил ещё три
непересекающихся head-интента с частотой 14 262, 9 135 и 6 046 запросов в месяц.

## Goal

Добавить малую когорту из трёх полноценных локальных мастеров. Каждый должен
решать отдельную задачу лучше линейной статьи, сохранять полезный SSR без JS и
оставаться ценным при полном отсутствии партнёрских ссылок.

## Non-goals

- Не обещать позицию, CTR, 1 001 посетителя или доход фактом релиза.
- Не создавать варианты URL по бренду, ОС, кабелю, источнику или режиму.
- Не угадывать поддержку USB-C, Miracast, AirPlay, DVB-T2/C или пунктов меню.
- Не выдавать визуальную настройку без прибора за профессиональную калибровку.
- Не добавлять Market CTA, цену, redirector, форму регистрации или сервер.

## Inputs

- сохранённый Wordstat Top queries, Россия 225, все устройства, 01.08.2026;
- действующий дизайн KREPI TV и существующие мастера Phone→TV/«Нет сигнала»;
- официальные инструкции Microsoft, Apple, Samsung, Sony, LG и РТРС;
- существующие Rust/WASM loader, consent-gated `result_completed` и sitegen.

## Constraints

Только русский публичный текст. Один canonical на Core Job. Закрытые варианты
ввода, fail-closed результат, локальный расчёт, сохранение выбора при ошибке,
видимый focus, минимум 48 px для действий. Tailwind-токены и композиция
существующих мастеров переиспользуются без новых raw colors, градиентов и
изображений. Длинные варианты скрываются в `<details>`.

## States

- `empty/default`: ни один обязательный выбор не сделан, следующий шаг объяснён.
- `disabled`: кнопка результата недоступна до обязательных ответов.
- `loading`: выбор сохранён, показано локальное вычисление.
- `success`: заголовок результата получает focus, видны шаги и границы.
- `error`: полезное русское сообщение, ответы сохранены, есть повтор.
- `focus`: последовательность клавиатуры логична, ring не обрезан.

## Acceptance tests

1. Ровно три новых indexable canonical с одним H1, self-canonical, русским SSR,
   источниками, substantive `lastmod` и входящей внутренней ссылкой.
2. Rust валидирует все варианты; неизвестная поддержка не превращается в
   подтверждённый маршрут. Есть unit-тесты success/unknown/error для каждого.
3. React вызывает только один WASM entrypoint, не читает query/user text, не
   отправляет введённые значения и эмитит один bounded `result_completed` после
   явного submit.
4. На трёх страницах нет Market/affiliate URL, региональных цен и рекомендаций
   покупки до технической проверки.
5. На 320×800, 768×1024 и 1440×900 нет horizontal overflow, overlap или
   обрезанного focus. Отдельно проходит 200% text и WASM error/retry.
6. Полная сборка, static/security/affiliate audits, design drift и независимое
   ревью проходят; production-хеши совпадают с проверенным артефактом.

## Allowed files

Совпадают с `task.json`: Rust engine/sitegen, SEO data и source manifest,
один новый общий React-компонент, существующие catalog/SeoPage/HomePage/
seoPages, тесты, исследовательская и операционная документация, generated
`docs/`, README и этот harness run.

## Verification commands

- `cargo fmt --check`
- `npm run build`
- companion security/static/affiliate audits из SEO-affiliate harness
- design harness `scan-drift`, `check --phase final`, `seal`, `check --phase ship`
- browser captures/overflow/focus для всех состояний и размеров
- production HTTPS/hash/browser smoke после deploy

## Sources and claims

Спрос берётся только из `data/research/traffic-head-demand.json`, варианты не
складываются. Технические утверждения ограничиваются source manifest и видимыми
ссылками на первичные инструкции. Ключевые границы: Win+P/Win+K относятся к
Windows; AirPlay — к совместимому приёмнику; USB-C не гарантирует видео;
DVB-T2/C проверяется по точной модели; повторный поиск может заменить список;
режим изображения и доступность пунктов зависят от источника и модели.

## Asset contract

Выход — responsive HTML/React, а не растровый макет. Текст и численные данные
рендерятся детерминированно. Imagegen не используется: утверждённый reference и
все визуальные примитивы уже существуют. QA PNG допустимы только как evidence
на точных viewport.

## Review and rollback

Независимый агент проверяет фактические страницы и evidence. При ошибке
откатывается один release-коммит; из sitemap удаляются только три новых URL,
существующий каталог, affiliate snapshot, DNS и аналитика не меняются.
