# Discovery

## Existing Design System

Tailwind-токены `paper`, `ink`, `action`, `technical`, `verified`, шрифты `font-display` и `font-mono`, жёсткие рамки, responsive grid, native `details` и общий footer. SSR создаётся Rust-генератором, React гидратирует тот же маршрут.

## Reuse Decisions

Переиспользованы существующие цвета, border/grid ритм, типографика, focus ring и native `details`. Footer и trust page расширяются без нового каркаса.

## New Primitives And Rationale

Создан только `EditorialAccountability`: единая смысловая граница, предотвращающая расхождение четырёх семейств страниц.

## Risks

Длинное основание может переноситься на 320 px; дата не должна браться из build time; общий блок обязан идти до Market CTA; disclosure не должен выглядеть заявлением физической экспертизы.
