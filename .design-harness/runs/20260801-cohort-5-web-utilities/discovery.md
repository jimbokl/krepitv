# Discovery

## Existing Design System

Используются `TvTrafficTaskWizard`, `ChoiceGrid`, `TriStateChoice`,
`TrafficTaskResult`, `TvTrafficTaskReference`, общие Tailwind-классы
`paper/ink/action/technical/danger`, Phosphor Icons и SEO route mapping.

## Reuse Decisions

Расширить только `sourceRegistry` и `configs`; оставить структуру формы,
клавиатурный focus, loading/error/retry, result details и source links общими.
Related links расширить в существующей карте. Capture helper дополнить только
scenario tuples.

## New Primitives And Rationale

None. Новые визуальные примитивы не нужны.

## Risks

Главный риск — рассинхронизация строковых enum с Rust. Второй — ложное обещание
универсального ARC/HDMI или чистящего средства. Оба закрываются exact enum test,
source allowlist и модельной границей.
