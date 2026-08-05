# Design Specification

## Context

Проверка всех модельных страниц после массового наполнения каталога Яндекс Маркета.

## Goal

Гарантировать, что индексируемая модельная страница не является заглушкой и никогда не рекламирует условно совместимый кронштейн как проверенный.

## Non-goals

Новые URL, новый дизайн, новые модели и изменения поисковой семантики.

## Inputs

Паспортный реестр, compatibility graph, модельные affiliate placements, утверждённый model-page reference.

## Constraints

Русский UI; Tailwind; SSR; direct Market links; no prices; fail-closed по VESA, нагрузке и диагонали; минимум 320 CSS px.

## States

Default/loading/empty/error/success/disabled/focus наследуются от существующей модельной страницы. Изменение затрагивает success: коммерческий CTA доступен только для verified-fit. В остальных состояниях оффер отсутствует или остаётся заблокированным.

## Acceptance tests

1. Все 131 индексируемые модели имеют минимум одно verified-fit ребро и ссылку на существующую карточку крепления.
2. Страница содержит один H1, VESA, диагональ, паспортную массу, источник, дату, минимум 350 слов и пять содержательных секций.
3. Каждая показанная verified-fit ссылка взаимна: mount page ведёт обратно на model page.
4. Conditional-fit не попадает в manifest, SSR-коммерческий блок или клиентский селектор.
5. На 320 и 1440 CSS px нет горизонтального переполнения; длинные группы закрыты.
6. Неподтверждённые наблюдения остаются noindex и без товарной рекомендации.

## Allowed files

Изменения ограничены генератором placements, клиентским/SSR фильтром, audit script, тестами, публичным snapshot и детерминированным `docs/` артефактом.

## Verification commands

`npm run verify`; `npm run catalog:audit-model-pages`; browser captures на 320 и 1440 CSS px.

## Sources and claims

Заявление о совместимости опирается на `data/tv_models.json` и `docs/data/compatibility-graph.json`; оба проверяются полным gate.

## Asset contract

Два PNG capture: 320×1400 и 1440×1200. Точный текст рендерится HTML, imagegen не используется.

## Review and rollback

Независимый subagent-review; откат — revert коммита с fail-closed изменением и повторная публикация предыдущего проверенного артефакта.
