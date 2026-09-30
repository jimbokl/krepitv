# Discovery

## Existing Design System

`DESIGN.md` задаёт editorial paper/ink/action/verified/technical, Roboto Condensed и IBM Plex Sans/Mono. В `web/src/components/WallPlannerDiagram.jsx`, `HeightPlanDiagram.jsx`, `MountTechnicalScheme.jsx` и `installation-kit/PlacementPanel.jsx` уже есть SVG, масштабные размеры и доступные подписи. `WallPlannerCalculator.jsx` использует Rust/WASM-расчёт и сохраняет SVG; `MountingMapCalculator.jsx` считает геометрию; подбор кронштейна уже проверяет совместимость. В `web/package.json` нет зависимости от готового 3D/animation runtime.

## Reuse Decisions

Расчёты, каталог, палитру и текущие SVG-геометрии переиспользовать. Сохранить фото на первом экране как бытовой контекст, а точные SVG-схемы как источник размеров. Поверх них добавить общую систему шагов и анимированных состояний.

## New Primitives And Rationale

Общий плеер шагов, декларативное состояние сцены и несколько повторно используемых визуальных объектов нужны, потому что сейчас каждый SVG/мастер живёт отдельно и не описывает сквозное изменение одной сцены.

## Risks

Псевдоточная графика может внушить ложную уверенность в точке сверления; перегруженная анимация — замедлить сайт или скрыть смысл; меню ТВ нельзя выдавать за точную копию для всех прошивок. Нужны подписи «пример/проверено/проверить», текстовый эквивалент и ручное управление.
