# Discovery

## Existing Design System

- `web/src/styles.css`: semantic Tailwind classes `primary-button`,
  `secondary-button`, `input-control`, ink/paper/action/muted tokens and print
  isolation through `data-print-map`.
- `HeightPlanDiagram`, `MountingMapCalculator`, `TvZoneSocketCalculator`:
  established SVG geometry, Russian warnings, print action and controlled
  analytics event.
- `SeoPage`: shared header, breadcrumb, facts, related jobs and exact-model
  search.
- `data/seo_pages.json`: deny-thin explicit indexability and canonical contract.
- Design reference `02-guided-selection.png`: approved internal-page hierarchy.
- Data contracts: 80 models with exact dimensions; 23 mounts and compatibility
  graph remain unchanged.

## Reuse Decisions

- Reuse global page shell, typography, colors, buttons, inputs, print CSS,
  `NumberField` visual behavior and `emitResultCompleted`.
- Extend `SeoPage` with one page-id branch and pass the current model catalog.
- Reuse exact catalog dimensions rather than adding a second model database.
- Reuse existing specialized pages as next-job links instead of duplicating
  their calculators.

## New Primitives And Rationale

- `WallPlannerCalculator`: required because no existing component owns wall
  dimensions, exact-model/manual-mode state and drag/keyboard coordination.
- `WallPlannerDiagram`: required for a focusable, draggable scale SVG with
  export-safe exact labels.
- `WallScenePlan` in Rust: required to keep validation, bounds and clearances in
  one tested source of truth.

## Risks

- Wide query is partly inspirational, so the utility needs visible examples.
- Dragging must not become the only input method.
- Exact model dimensions may not equal a perfect 16:9 outer chassis; use catalog
  dimensions and explain the difference.
- A scaled diagram cannot establish wall strength, fastener safety or exact
  plate offset; links and warnings must preserve that boundary.
