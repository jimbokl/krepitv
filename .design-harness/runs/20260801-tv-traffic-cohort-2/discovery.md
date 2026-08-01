# Discovery

## Existing Design System

Tailwind semantic tokens `paper`, `ink`, `line`, `muted`, `action`, `technical`,
`verified`, `danger`; Roboto Condensed/IBM Plex Sans/IBM Plex Mono; grid with
1 px separators; `primary-button`/`secondary-button`; native radio fieldsets,
`details`, visible focus rings. Reference implementation:
`PhoneTvConnectionWizard.jsx` and `TvNoSignalWizard.jsx`.

## Reuse Decisions

Reuse page shell, heading scale, two-column wizard composition, choice grid,
tri-state options, result focus, local WASM loader, `emitResultCompleted`, SSR
reference section and existing home/related-page cards. Extend the generic
traffic-utility flag instead of allowing generic catalog/affiliate blocks.

## New Primitives And Rationale

Create one `TvTrafficTaskWizard` configured for three tasks. A shared primitive
removes three copies of loading/error/result/focus behavior while Rust remains
the authority for plan logic. No new visual primitive or generated image.

## Risks

Generic UI must not flatten different jobs into identical copy. Each task keeps
its own questions, result labels, source mapping, safety boundaries and SSR.
The header remains unchanged to avoid a long navigation strip; incoming links
come from home featured tools and context-specific related pages.
