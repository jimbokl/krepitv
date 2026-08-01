# Design Specification

## Context

После первой подтверждённой traffic cohort production содержит 149 canonical,
но gate остаётся 0 из 7 дней с 1 001+ легитимным пользователем. Wordstat-срез
1 августа 2026 подтвердил три следующие непересекающиеся формулировки с exact
demand 14 478, 14 476 и 5 627 запросов в месяц.

## Goal

Добавить три самостоятельных диагностических мастера, которые безопасно
локализуют наблюдаемый симптом и дают законченный план без регистрации, сервера,
покупки и партнёрской ссылки.

## Non-goals

- Не ставить диагноз подсветке, матрице, динамику, плате или блоку питания.
- Не советовать вскрытие, электрические измерения, пайку и покупку деталей.
- Не объединять запросы или частоты и не считать их прогнозом трафика.
- Не создавать варианты URL по бренду, модели, типу пульта или источнику.
- Не добавлять Market CTA, цену, redirector, форму или сервер.

## Inputs

- сохранённый Wordstat raw/normalized/contract, Россия 225, все устройства;
- официальный source/fail-closed manifest когорты;
- существующие Rust/WASM traffic dispatcher, React/Tailwind master и sitegen;
- утверждённый дизайн и production capture helper.

Закрытый контракт мастеров:

- `sound-but-no-picture`: `primary=yes|no|unknown` для собственного меню/OSD,
  `secondary=tv-speakers|external-audio|unknown`,
  `tertiary=tv-app|channels|hdmi|unknown`, `detail=yes|no|unknown` для других
  доступных источников;
- `no-sound`: `primary=tv-speakers|soundbar-receiver|headphones-bluetooth|unknown`,
  `secondary=tv-app|channels|hdmi|unknown`, `tertiary=yes|no|unknown` для
  Mute/нулевой громкости, `detail=yes|no|unknown` для выбранного внешнего выхода;
- `remote-not-working`: `primary=yes|no|unknown` для управления с корпуса или
  официального приложения, `secondary=original|universal|app|unknown`,
  `tertiary=yes|no|unknown` для новых батареек, `detail=yes|no|unknown` для
  частично работающих кнопок.

## Constraints

Только русский публичный текст. Один canonical на Core Job. Только закрытые
варианты ввода; fail-closed при неизвестном источнике, выходе звука, типе пульта
или недоступном self-test. Свободный текст, модель, сетевые данные и ПДн в Rust,
аналитику или URL не передаются. Длинные уточнения закрыты в `<details>`.

## States

- `empty/default`: обязательный первый ответ не выбран, следующий шаг объяснён;
- `disabled`: submit недоступен до двух обязательных ответов;
- `loading`: ответы сохранены, выполняется локальный расчёт;
- `success`: один безопасный plan/status, focus на H2 результата;
- `error`: русское сообщение, сохранённые ответы и рабочий retry;
- `focus`: видимый ring и логичная клавиатурная последовательность.

Во время `loading` поля заблокированы, а устаревший асинхронный ответ не может
заменить результат более нового расчёта. Успех принимает только известные
статусы `action-plan`, `needs-check`, `service-boundary`, `external-path`, от
одного до четырёх нормализованных шагов и разрешимые source ids. Первый шаг
открыт, остальные спрятаны под «Если не помогло»; пустой или неизвестный ответ
переходит в локальную ошибку, а не в догадку.

## Acceptance tests

1. Ровно три новых indexable canonical с одним H1, self-canonical, русским SSR,
   источниками, substantive `lastmod`, входящей ссылкой и уникальным интентом.
2. Rust валидирует все варианты и не выводит аппаратный диагноз. Неизвестный
   признак приводит к `needs-check`/`service-boundary`, а не к выдуманному repair.
3. Общий React master вызывает один WASM entrypoint и отправляет один bounded
   `result_completed` только после явного submit, без ответов пользователя.
   Контракт содержит `primary_step_id`, каждый шаг — `stop_condition`; мастер
   имеет `aria-busy`, а tri-state ответы складываются в одну колонку на 320 px.
4. «Нет сигнала» остаётся про видимое сообщение/вход; «настройка изображения» —
   про параметры видимого изображения; новые страницы — про отсутствующую пару
   звук/изображение или управление пультом.
5. На новых страницах нет Market/affiliate URL, цен, предложения деталей,
   вскрытия, электрических измерений или обещания ремонта.
6. На 320×800, 768×1024 и 1440×900 нет overflow/overlap/clipped focus; проходят
   loading/error/retry/disabled/success, text zoom 200% и WCAG text spacing.
7. Полный build, Rust/web tests, Russian UI, static/security/affiliate audits,
   design drift, независимое ревью и production hash/browser smoke проходят.

## Allowed files

Совпадают с `task.json`: Rust engine/sitegen, SEO/source data, общий traffic
master, SeoPage/HomePage/seoPages, тесты/verify/capture, generated `web` entrypoints
и `docs`, README, research/operations docs и этот harness run.

## Verification commands

- targeted Rust и web contract tests;
- `cargo fmt --check` и полный `npm run build`;
- companion security/static/affiliate audits;
- design drift и точные browser captures;
- production HTTPS/hash/browser smoke после deploy.

## Sources and claims

Demand берётся только из сохранённого Wordstat manifest; строки не суммируются.
Технические утверждения ограничены официальным source manifest и видимыми
ссылками. Конкретные source ids и claim mapping перечислены в `task.json`;
неизвестный source id является ошибкой формы результата.

## Asset contract

Выход — responsive HTML/React, а не растровый макет. Exact copy и данные
рендерятся детерминированно. Imagegen не используется. PNG допустимы только как
evidence точных viewport/state.

## Review and rollback

Независимый агент проверяет actual pages, code, screenshots и evidence. При
регрессии откатывается один release-коммит; удаляются только три новых URL и их
ссылки, существующий каталог, DNS, аналитика и affiliate snapshot не меняются.
