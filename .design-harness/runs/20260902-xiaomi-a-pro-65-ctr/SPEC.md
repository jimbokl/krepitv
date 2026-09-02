# Design Specification

## Context

Существующая модельная страница получила 48 показов, 0 кликов и среднюю позицию 5,69 в финальном окне Google Search Console 04.08–31.08. Контентный паспорт не менялся с 30 июля и не имеет model-specific поискового профиля.

## Goal

Усилить CTR и самостоятельную ценность существующей страницы точным, source-backed ответом по Xiaomi TV A Pro 65 2025.

## Non-goals

Новые URL, изменение каталога моделей или кронштейнов, утверждения о винтах, региональных ценах и наличие товара.

## Inputs

Официальная русскоязычная спецификация Xiaomi для Казахстана, локальный паспорт модели, граф совместимости, существующий design system и поисковый page-level сигнал.

## Constraints

Русский публичный текст; title ≤65 символов, description ≤160; ровно три FAQ; число verified-fit одновременно присутствует в description и answer; никаких цен и внешних affiliate-ссылок в профиле.

## States

`default`, `success` и `focus` проверяются рендером и скриншотами. `loading`, `empty`, `error`, `disabled` неприменимы: модельный профиль полностью SSR, не запрашивает сеть в браузере и является обязательным build-time объектом.

## Acceptance tests

1. Канонический URL и число sitemap URL не меняются.
2. Title, description и direct answer в точности совпадают с `task.json`.
3. Профиль содержит три FAQ и не заявляет конкретную резьбу/длину винтов.
4. Граф даёт ровно 14 verified-fit и 0 conditional-fit для модели.
5. Полный build проходит, generated artifact совпадает с tracked output.
6. На 320/768/1440 нет горизонтального переполнения; focus FAQ видим.

## Allowed files

Список указан в `task.json`; вне него разрешены только файлы самого design-harness run.

## Verification commands

Команды `model-profile-test`, `commercial-profile-tests` и `full-build` из `task.json`, затем screenshot QA и design-harness `scan-drift`, `check --phase final`, `seal`, `check --phase ship`.

## Sources and claims

Паспортные факты опираются на официальную Xiaomi-страницу и локальный паспорт; 14 verified-fit — на локальный сгенерированный граф. Регион источника указывается честно; точные винты не заявляются.

## Asset contract

Новый ассет отсутствует. Существующий responsive SVG остаётся неизменным. Exact content выводится deterministic overlay из JSON; ImageGen не используется.

## Review and rollback

Независимая проверка выполняется отдельными build/QA контурами. Rollback: revert одного commit, повторная сборка, публикация и уведомление только изменённого canonical URL.
