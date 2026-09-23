# Programmatic SEO: карта 500 кандидатов, а не разрешение на 500 публикаций

Дата аудита: 23 сентября 2026 года. Статус: исследовательский backlog; перечисленные URL **не созданы, не опубликованы и не предложены к немедленной индексации**.

## Решение в одном абзаце

Приложенный разбор предлагает умножать общую задачу на модель, бренд, диагональ, способ подключения и режим работы. Это даёт адреса, но не 500 новых пользовательских задач. Текущий каталог содержит 161 точную модель ТВ с HTTPS-источником, VESA и массой, 25 кронштейнов и 147 SEO-страниц в рабочем дереве на момент аудита (включая пять отдельных страниц текущего монтажного спринта). Модельные паспорта уже существуют отдельно от SEO-страниц. Из 500 возможных ниже адресов **ни один не проходит все условия для выпуска как новый canonical сегодня**: 171 — дубль действующего ответа, 322 — нет необходимых структурированных первичных данных, 7 — отдельные гипотезы, требующие проверки. Это не означает, что тем «нет спроса»: означает, что 500 URL сейчас были бы контентной сеткой без доказанной самостоятельной ценности. Безопасное продолжение — выпускать небольшие проверенные когорты с собственным инструментом, источниками и измеримым интентом, а не индексировать 500 вариаций ради счётчика.

## Что проверено, а что пока лишь утверждается

- Проверен локальный инвентарь: `data/tv_models.json` — 161 уникальный `id`, у всех есть HTTPS-источник, числовой VESA и масса; источники различаются по авторитетности (производитель, руководство, продавец), и перед точным утверждением их надо проверять отдельно. `data/mounts.json` — 25 креплений; `data/seo_pages.json` — 147 страниц, включая пять текущего монтажного спринта. В `data/tv_models.json` **нет полей** с паспортной мощностью по режимам, ОС/версией прошивки и маршрутами отключения субтитров. VESA уже является содержанием паспортов `/modeli/{id}/`, а не новой задачей на каждый дополнительный URL.
- Приложенный текст утверждает «клики только по двум запросам» и приводит 141/113 показов по скрытым субтитрам. **Без датированной исходной query→page-выгрузки с определением фильтра эти строки не принимаются как полные данные сайта**. Отдельная проверенная выгрузка GSC `.private/mega-seo-niche-20260923-gsc.json` за финальное окно 25.08–21.09 содержит 3 008 показов и 62 клика по сайту; это не уникальные пользователи, и агрегат не подтверждает «только два клика». Приватную выгрузку и идентификаторы в публичный артефакт не копировать.
- Старые Wordstat-измерения и текущая разведка в [LOW_FREQUENCY_MOUNTING_SEO_2026-09-23.md](LOW_FREQUENCY_MOUNTING_SEO_2026-09-23.md) подтверждают часть монтажных тем, но **не спрос для каждой модельно-тематической комбинации**. Частоты, варианты и бренды не складывать в «размер рынка». Состояние неизвестных запросов — `unknown`, а не ноль.
- Вложения с SEO-советом — гипотезы, не Google Search Console, не карта SERP и не первичные паспорта. Их нельзя использовать как основание для утверждений «низкая конкуренция», «быстро вырастем» или публикации отдельного URL.

## Формальная карта 500 кандидатов

Кандидаты 001–483 — **161 точная модель × три предложенных в разборе новых дочерних интента**. Таблица ниже задаёт **каждый точный предполагаемый URL**, а не текстовый шаблон, пригодный к немедленной генерации. Все три адреса в каждой строке являются *новыми гипотетическими* дочерними URL, не ссылками на живые страницы.

| Пакет | Формула точного адреса | Предпосылка | Решение сегодня |
|---|---|---|---|
| 001–161 | `/modeli/{id}/vesa/` | У всех 161 моделей есть официальный VESA | **MERGE**: уже есть `/modeli/{id}/`; отдельная VESA-дочка повторит паспорт |
| 162–322 | `/modeli/{id}/potreblenie/` | Нужна паспортная мощность точной модели и режимов | **HOLD-DATA**: в `tv_models.json` этих значений нет; нельзя подставлять среднее по диагонали |
| 323–483 | `/modeli/{id}/subtitry/` | Нужны подтверждённые платформа/версия/путь меню конкретной модели | **HOLD-DATA**: модель сама по себе не задаёт субтитры приложения, HDMI-источника или телеканала |

Значение `id` ниже — реально существующий идентификатор из `data/tv_models.json`. Источники и паспортные характеристики доступны в этой записи и на существующей странице `/modeli/{id}/`. Для запроса без точной модели служат существующие хабы, а не 161 однотипный текст.

| Модель/ID | Кандидат VESA — MERGE | Кандидат потребления — HOLD-DATA | Кандидат субтитров — HOLD-DATA |
|---|---|---|---|
| TA32BH500 (akai-ta32bh500) | `/modeli/akai-ta32bh500/vesa/` | `/modeli/akai-ta32bh500/potreblenie/` | `/modeli/akai-ta32bh500/subtitry/` |
| 32LH1110T (asano-32lh1110t) | `/modeli/asano-32lh1110t/vesa/` | `/modeli/asano-32lh1110t/potreblenie/` | `/modeli/asano-32lh1110t/subtitry/` |
| 32LEM-1045/TS2C (bbk-32lem-1045-ts2c) | `/modeli/bbk-32lem-1045-ts2c/vesa/` | `/modeli/bbk-32lem-1045-ts2c/potreblenie/` | `/modeli/bbk-32lem-1045-ts2c/subtitry/` |
| 32LEM-1075/TS2C (bbk-32lem-1075-ts2c) | `/modeli/bbk-32lem-1075-ts2c/vesa/` | `/modeli/bbk-32lem-1075-ts2c/potreblenie/` | `/modeli/bbk-32lem-1075-ts2c/subtitry/` |
| 32LEX-7235/FTS2C (bbk-32lex-7235-fts2c) | `/modeli/bbk-32lex-7235-fts2c/vesa/` | `/modeli/bbk-32lex-7235-fts2c/potreblenie/` | `/modeli/bbk-32lex-7235-fts2c/subtitry/` |
| 32LEX-7244/TS2C (bbk-32lex-7244-ts2c) | `/modeli/bbk-32lex-7244-ts2c/vesa/` | `/modeli/bbk-32lex-7244-ts2c/potreblenie/` | `/modeli/bbk-32lex-7244-ts2c/subtitry/` |
| 40LEM-1030/FTS2C (bbk-40lem-1030-fts2c) | `/modeli/bbk-40lem-1030-fts2c/vesa/` | `/modeli/bbk-40lem-1030-fts2c/potreblenie/` | `/modeli/bbk-40lem-1030-fts2c/subtitry/` |
| 43LEX-7247/FTS2C (bbk-43lex-7247-fts2c) | `/modeli/bbk-43lex-7247-fts2c/vesa/` | `/modeli/bbk-43lex-7247-fts2c/potreblenie/` | `/modeli/bbk-43lex-7247-fts2c/subtitry/` |
| 32F40B (bq-32f40b) | `/modeli/bq-32f40b/vesa/` | `/modeli/bq-32f40b/potreblenie/` | `/modeli/bq-32f40b/subtitry/` |
| Bt 24FS34B (blackton-bt-24fs34b) | `/modeli/blackton-bt-24fs34b/vesa/` | `/modeli/blackton-bt-24fs34b/potreblenie/` | `/modeli/blackton-bt-24fs34b/subtitry/` |
| Uno 32 (candy-uno-32) | `/modeli/candy-uno-32/vesa/` | `/modeli/candy-uno-32/potreblenie/` | `/modeli/candy-uno-32/subtitry/` |
| Uno 43 UHD (candy-uno-43-uhd) | `/modeli/candy-uno-43-uhd/vesa/` | `/modeli/candy-uno-43-uhd/potreblenie/` | `/modeli/candy-uno-43-uhd/subtitry/` |
| DM-LED32SBB39 (digma-dm-led32sbb39) | `/modeli/digma-dm-led32sbb39/vesa/` | `/modeli/digma-dm-led32sbb39/potreblenie/` | `/modeli/digma-dm-led32sbb39/subtitry/` |
| 24R470T (harper-24r470t) | `/modeli/harper-24r470t/vesa/` | `/modeli/harper-24r470t/potreblenie/` | `/modeli/harper-24r470t/subtitry/` |
| 32R670T (harper-32r670t) | `/modeli/harper-32r670t/vesa/` | `/modeli/harper-32r670t/potreblenie/` | `/modeli/harper-32r670t/subtitry/` |
| 40F720T (harper-40f720t) | `/modeli/harper-40f720t/vesa/` | `/modeli/harper-40f720t/potreblenie/` | `/modeli/harper-40f720t/subtitry/` |
| 43F670TS (harper-43f670ts) | `/modeli/harper-43f670ts/vesa/` | `/modeli/harper-43f670ts/potreblenie/` | `/modeli/harper-43f670ts/subtitry/` |
| HS-32F01FB (hi-hs-32f01fb) | `/modeli/hi-hs-32f01fb/vesa/` | `/modeli/hi-hs-32f01fb/potreblenie/` | `/modeli/hi-hs-32f01fb/subtitry/` |
| HT-32H01FB (hi-ht-32h01fb) | `/modeli/hi-ht-32h01fb/vesa/` | `/modeli/hi-ht-32h01fb/potreblenie/` | `/modeli/hi-ht-32h01fb/subtitry/` |
| HX-24H01FB (hi-hx-24h01fb) | `/modeli/hi-hx-24h01fb/vesa/` | `/modeli/hi-hx-24h01fb/potreblenie/` | `/modeli/hi-hx-24h01fb/subtitry/` |
| HX-32H01FB (hi-hx-32h01fb) | `/modeli/hi-hx-32h01fb/vesa/` | `/modeli/hi-hx-32h01fb/potreblenie/` | `/modeli/hi-hx-32h01fb/subtitry/` |
| HX-43F01FB (hi-hx-43f01fb) | `/modeli/hi-hx-43f01fb/vesa/` | `/modeli/hi-hx-43f01fb/potreblenie/` | `/modeli/hi-hx-43f01fb/subtitry/` |
| HY-40F01FB (hi-hy-40f01fb) | `/modeli/hi-hy-40f01fb/vesa/` | `/modeli/hi-hy-40f01fb/potreblenie/` | `/modeli/hi-hy-40f01fb/subtitry/` |
| 32A4S (hisense-32a4s) | `/modeli/hisense-32a4s/vesa/` | `/modeli/hisense-32a4s/potreblenie/` | `/modeli/hisense-32a4s/subtitry/` |
| 32E44SL (hisense-32e44sl) | `/modeli/hisense-32e44sl/vesa/` | `/modeli/hisense-32e44sl/potreblenie/` | `/modeli/hisense-32e44sl/subtitry/` |
| 32E55SL (hisense-32e55sl) | `/modeli/hisense-32e55sl/vesa/` | `/modeli/hisense-32e55sl/potreblenie/` | `/modeli/hisense-32e55sl/subtitry/` |
| 40A4S (hisense-40a4s) | `/modeli/hisense-40a4s/vesa/` | `/modeli/hisense-40a4s/potreblenie/` | `/modeli/hisense-40a4s/subtitry/` |
| 40E44SL (hisense-40e44sl) | `/modeli/hisense-40e44sl/vesa/` | `/modeli/hisense-40e44sl/potreblenie/` | `/modeli/hisense-40e44sl/subtitry/` |
| 43E66SL (hisense-43e66sl) | `/modeli/hisense-43e66sl/vesa/` | `/modeli/hisense-43e66sl/potreblenie/` | `/modeli/hisense-43e66sl/subtitry/` |
| 43E7S (hisense-43e7s) | `/modeli/hisense-43e7s/vesa/` | `/modeli/hisense-43e7s/potreblenie/` | `/modeli/hisense-43e7s/subtitry/` |
| 50E77SL PRO (hisense-50e77sl-pro) | `/modeli/hisense-50e77sl-pro/vesa/` | `/modeli/hisense-50e77sl-pro/potreblenie/` | `/modeli/hisense-50e77sl-pro/subtitry/` |
| 50E7S (hisense-50e7s) | `/modeli/hisense-50e7s/vesa/` | `/modeli/hisense-50e7s/potreblenie/` | `/modeli/hisense-50e7s/subtitry/` |
| 50U77SL (hisense-50u77sl) | `/modeli/hisense-50u77sl/vesa/` | `/modeli/hisense-50u77sl/potreblenie/` | `/modeli/hisense-50u77sl/subtitry/` |
| 55E77SL (hisense-55e77sl) | `/modeli/hisense-55e77sl/vesa/` | `/modeli/hisense-55e77sl/potreblenie/` | `/modeli/hisense-55e77sl/subtitry/` |
| 55E7S (hisense-55e7s) | `/modeli/hisense-55e7s/vesa/` | `/modeli/hisense-55e7s/potreblenie/` | `/modeli/hisense-55e7s/subtitry/` |
| 55U7Q (hisense-55u7q) | `/modeli/hisense-55u7q/vesa/` | `/modeli/hisense-55u7q/potreblenie/` | `/modeli/hisense-55u7q/subtitry/` |
| 55U7S (hisense-55u7s) | `/modeli/hisense-55u7s/vesa/` | `/modeli/hisense-55u7s/potreblenie/` | `/modeli/hisense-55u7s/subtitry/` |
| 55U7S PRO (hisense-55u7s-pro) | `/modeli/hisense-55u7s-pro/vesa/` | `/modeli/hisense-55u7s-pro/potreblenie/` | `/modeli/hisense-55u7s-pro/subtitry/` |
| 55U8Q (hisense-55u8q) | `/modeli/hisense-55u8q/vesa/` | `/modeli/hisense-55u8q/potreblenie/` | `/modeli/hisense-55u8q/subtitry/` |
| 65U77SL (hisense-65u77sl) | `/modeli/hisense-65u77sl/vesa/` | `/modeli/hisense-65u77sl/potreblenie/` | `/modeli/hisense-65u77sl/subtitry/` |
| 65U7Q (hisense-65u7q) | `/modeli/hisense-65u7q/vesa/` | `/modeli/hisense-65u7q/potreblenie/` | `/modeli/hisense-65u7q/subtitry/` |
| 65U7S (hisense-65u7s) | `/modeli/hisense-65u7s/vesa/` | `/modeli/hisense-65u7s/potreblenie/` | `/modeli/hisense-65u7s/subtitry/` |
| 65U8Q (hisense-65u8q) | `/modeli/hisense-65u8q/vesa/` | `/modeli/hisense-65u8q/potreblenie/` | `/modeli/hisense-65u8q/subtitry/` |
| 65UR9S (hisense-65ur9s) | `/modeli/hisense-65ur9s/vesa/` | `/modeli/hisense-65ur9s/potreblenie/` | `/modeli/hisense-65ur9s/subtitry/` |
| 75U7Q (hisense-75u7q) | `/modeli/hisense-75u7q/vesa/` | `/modeli/hisense-75u7q/potreblenie/` | `/modeli/hisense-75u7q/subtitry/` |
| 85E7S (hisense-85e7s) | `/modeli/hisense-85e7s/vesa/` | `/modeli/hisense-85e7s/potreblenie/` | `/modeli/hisense-85e7s/subtitry/` |
| H-LED32BS5002 (hyundai-h-led32bs5002) | `/modeli/hyundai-h-led32bs5002/vesa/` | `/modeli/hyundai-h-led32bs5002/potreblenie/` | `/modeli/hyundai-h-led32bs5002/subtitry/` |
| H-LED32BS5003 (hyundai-h-led32bs5003) | `/modeli/hyundai-h-led32bs5003/vesa/` | `/modeli/hyundai-h-led32bs5003/potreblenie/` | `/modeli/hyundai-h-led32bs5003/subtitry/` |
| H-LED40BS5011 (hyundai-h-led40bs5011) | `/modeli/hyundai-h-led40bs5011/vesa/` | `/modeli/hyundai-h-led40bs5011/potreblenie/` | `/modeli/hyundai-h-led40bs5011/subtitry/` |
| 32LQ63006LA (lg-32lq63006la) | `/modeli/lg-32lq63006la/vesa/` | `/modeli/lg-32lq63006la/potreblenie/` | `/modeli/lg-32lq63006la/subtitry/` |
| 32LQ630B6LA (lg-32lq630b6la) | `/modeli/lg-32lq630b6la/vesa/` | `/modeli/lg-32lq630b6la/potreblenie/` | `/modeli/lg-32lq630b6la/subtitry/` |
| 32LQ63806LC (lg-32lq63806lc) | `/modeli/lg-32lq63806lc/vesa/` | `/modeli/lg-32lq63806lc/potreblenie/` | `/modeli/lg-32lq63806lc/subtitry/` |
| 43QNED70A6A (lg-43qned70a6a) | `/modeli/lg-43qned70a6a/vesa/` | `/modeli/lg-43qned70a6a/potreblenie/` | `/modeli/lg-43qned70a6a/subtitry/` |
| 43QNED80A6A (lg-43qned80a6a) | `/modeli/lg-43qned80a6a/vesa/` | `/modeli/lg-43qned80a6a/potreblenie/` | `/modeli/lg-43qned80a6a/subtitry/` |
| 43QNED80B6B (lg-43qned80b6b) | `/modeli/lg-43qned80b6b/vesa/` | `/modeli/lg-43qned80b6b/potreblenie/` | `/modeli/lg-43qned80b6b/subtitry/` |
| 43QNED82A6B (lg-43qned82a6b) | `/modeli/lg-43qned82a6b/vesa/` | `/modeli/lg-43qned82a6b/potreblenie/` | `/modeli/lg-43qned82a6b/subtitry/` |
| 50NANO81A6A (lg-50nano81a6a) | `/modeli/lg-50nano81a6a/vesa/` | `/modeli/lg-50nano81a6a/potreblenie/` | `/modeli/lg-50nano81a6a/subtitry/` |
| 50QNED70B6C (lg-50qned70b6c) | `/modeli/lg-50qned70b6c/vesa/` | `/modeli/lg-50qned70b6c/potreblenie/` | `/modeli/lg-50qned70b6c/subtitry/` |
| 50QNED80B6B (lg-50qned80b6b) | `/modeli/lg-50qned80b6b/vesa/` | `/modeli/lg-50qned80b6b/potreblenie/` | `/modeli/lg-50qned80b6b/subtitry/` |
| 50QNED82A6B (lg-50qned82a6b) | `/modeli/lg-50qned82a6b/vesa/` | `/modeli/lg-50qned82a6b/potreblenie/` | `/modeli/lg-50qned82a6b/subtitry/` |
| 50QNED85B6A (lg-50qned85b6a) | `/modeli/lg-50qned85b6a/vesa/` | `/modeli/lg-50qned85b6a/potreblenie/` | `/modeli/lg-50qned85b6a/subtitry/` |
| 55QNED83B6A (lg-55qned83b6a) | `/modeli/lg-55qned83b6a/vesa/` | `/modeli/lg-55qned83b6a/potreblenie/` | `/modeli/lg-55qned83b6a/subtitry/` |
| 55QNED85B6C (lg-55qned85b6c) | `/modeli/lg-55qned85b6c/vesa/` | `/modeli/lg-55qned85b6c/potreblenie/` | `/modeli/lg-55qned85b6c/subtitry/` |
| 55QNED86A6A (lg-55qned86a6a) | `/modeli/lg-55qned86a6a/vesa/` | `/modeli/lg-55qned86a6a/potreblenie/` | `/modeli/lg-55qned86a6a/subtitry/` |
| 55QNED93A6A (lg-55qned93a6a) | `/modeli/lg-55qned93a6a/vesa/` | `/modeli/lg-55qned93a6a/potreblenie/` | `/modeli/lg-55qned93a6a/subtitry/` |
| 65QNED80A6A (lg-65qned80a6a) | `/modeli/lg-65qned80a6a/vesa/` | `/modeli/lg-65qned80a6a/potreblenie/` | `/modeli/lg-65qned80a6a/subtitry/` |
| 65QNED86A6A (lg-65qned86a6a) | `/modeli/lg-65qned86a6a/vesa/` | `/modeli/lg-65qned86a6a/potreblenie/` | `/modeli/lg-65qned86a6a/subtitry/` |
| OLED42C5RLA (lg-oled42c5rla) | `/modeli/lg-oled42c5rla/vesa/` | `/modeli/lg-oled42c5rla/potreblenie/` | `/modeli/lg-oled42c5rla/subtitry/` |
| OLED48C5RLA (lg-oled48c5rla) | `/modeli/lg-oled48c5rla/vesa/` | `/modeli/lg-oled48c5rla/potreblenie/` | `/modeli/lg-oled48c5rla/subtitry/` |
| OLED55B5RLA (lg-oled55b5rla) | `/modeli/lg-oled55b5rla/vesa/` | `/modeli/lg-oled55b5rla/potreblenie/` | `/modeli/lg-oled55b5rla/subtitry/` |
| OLED55C4RLA (lg-oled55c4rla) | `/modeli/lg-oled55c4rla/vesa/` | `/modeli/lg-oled55c4rla/potreblenie/` | `/modeli/lg-oled55c4rla/subtitry/` |
| OLED55C5RLA (lg-oled55c5rla) | `/modeli/lg-oled55c5rla/vesa/` | `/modeli/lg-oled55c5rla/potreblenie/` | `/modeli/lg-oled55c5rla/subtitry/` |
| OLED55G5RLA (lg-oled55g5rla) | `/modeli/lg-oled55g5rla/vesa/` | `/modeli/lg-oled55g5rla/potreblenie/` | `/modeli/lg-oled55g5rla/subtitry/` |
| OLED65C5RLA (lg-oled65c5rla) | `/modeli/lg-oled65c5rla/vesa/` | `/modeli/lg-oled65c5rla/potreblenie/` | `/modeli/lg-oled65c5rla/subtitry/` |
| 50PUD7029/71 (philips-50pud7029) | `/modeli/philips-50pud7029/vesa/` | `/modeli/philips-50pud7029/potreblenie/` | `/modeli/philips-50pud7029/subtitry/` |
| QE43Q7FAAUXRU (samsung-qe43q7faauxru) | `/modeli/samsung-qe43q7faauxru/vesa/` | `/modeli/samsung-qe43q7faauxru/potreblenie/` | `/modeli/samsung-qe43q7faauxru/subtitry/` |
| QE43Q8FAAUXRU (samsung-qe43q8faauxru) | `/modeli/samsung-qe43q8faauxru/vesa/` | `/modeli/samsung-qe43q8faauxru/potreblenie/` | `/modeli/samsung-qe43q8faauxru/subtitry/` |
| QE43QEF1AUXRU (samsung-qe43qef1auxru) | `/modeli/samsung-qe43qef1auxru/vesa/` | `/modeli/samsung-qe43qef1auxru/potreblenie/` | `/modeli/samsung-qe43qef1auxru/subtitry/` |
| QE43QN90FAUXRU (samsung-qe43qn90fauxru) | `/modeli/samsung-qe43qn90fauxru/vesa/` | `/modeli/samsung-qe43qn90fauxru/potreblenie/` | `/modeli/samsung-qe43qn90fauxru/subtitry/` |
| QE50Q7FAAUXRU (samsung-qe50q7faauxru) | `/modeli/samsung-qe50q7faauxru/vesa/` | `/modeli/samsung-qe50q7faauxru/potreblenie/` | `/modeli/samsung-qe50q7faauxru/subtitry/` |
| QE50QN90FAUXRU (samsung-qe50qn90fauxru) | `/modeli/samsung-qe50qn90fauxru/vesa/` | `/modeli/samsung-qe50qn90fauxru/potreblenie/` | `/modeli/samsung-qe50qn90fauxru/subtitry/` |
| QE55Q70DAUXRU (samsung-qe55q70dauxru) | `/modeli/samsung-qe55q70dauxru/vesa/` | `/modeli/samsung-qe55q70dauxru/potreblenie/` | `/modeli/samsung-qe55q70dauxru/subtitry/` |
| QE55Q7F5AUXRU (samsung-qe55q7f5auxru) | `/modeli/samsung-qe55q7f5auxru/vesa/` | `/modeli/samsung-qe55q7f5auxru/potreblenie/` | `/modeli/samsung-qe55q7f5auxru/subtitry/` |
| QE55Q7FAAUXRU (samsung-qe55q7faauxru) | `/modeli/samsung-qe55q7faauxru/vesa/` | `/modeli/samsung-qe55q7faauxru/potreblenie/` | `/modeli/samsung-qe55q7faauxru/subtitry/` |
| QE55QN70FAUXRU (samsung-qe55qn70fauxru) | `/modeli/samsung-qe55qn70fauxru/vesa/` | `/modeli/samsung-qe55qn70fauxru/potreblenie/` | `/modeli/samsung-qe55qn70fauxru/subtitry/` |
| QE55S85FAEXRU (samsung-qe55s85faexru) | `/modeli/samsung-qe55s85faexru/vesa/` | `/modeli/samsung-qe55s85faexru/potreblenie/` | `/modeli/samsung-qe55s85faexru/subtitry/` |
| QE55S90FAUXRU (samsung-qe55s90fauxru) | `/modeli/samsung-qe55s90fauxru/vesa/` | `/modeli/samsung-qe55s90fauxru/potreblenie/` | `/modeli/samsung-qe55s90fauxru/subtitry/` |
| QE65Q7FAAUXRU (samsung-qe65q7faauxru) | `/modeli/samsung-qe65q7faauxru/vesa/` | `/modeli/samsung-qe65q7faauxru/potreblenie/` | `/modeli/samsung-qe65q7faauxru/subtitry/` |
| QE65QN70FAUXRU (samsung-qe65qn70fauxru) | `/modeli/samsung-qe65qn70fauxru/vesa/` | `/modeli/samsung-qe65qn70fauxru/potreblenie/` | `/modeli/samsung-qe65qn70fauxru/subtitry/` |
| QE65S85FAEXRU (samsung-qe65s85faexru) | `/modeli/samsung-qe65s85faexru/vesa/` | `/modeli/samsung-qe65s85faexru/potreblenie/` | `/modeli/samsung-qe65s85faexru/subtitry/` |
| QE65S90FAEXRU (samsung-qe65s90faexru) | `/modeli/samsung-qe65s90faexru/vesa/` | `/modeli/samsung-qe65s90faexru/potreblenie/` | `/modeli/samsung-qe65s90faexru/subtitry/` |
| QE75Q7FAAUXRU (samsung-qe75q7faauxru) | `/modeli/samsung-qe75q7faauxru/vesa/` | `/modeli/samsung-qe75q7faauxru/potreblenie/` | `/modeli/samsung-qe75q7faauxru/subtitry/` |
| QE77S85FAEXRU (samsung-qe77s85faexru) | `/modeli/samsung-qe77s85faexru/vesa/` | `/modeli/samsung-qe77s85faexru/potreblenie/` | `/modeli/samsung-qe77s85faexru/subtitry/` |
| QE85Q7FAAUXRU (samsung-qe85q7faauxru) | `/modeli/samsung-qe85q7faauxru/vesa/` | `/modeli/samsung-qe85q7faauxru/potreblenie/` | `/modeli/samsung-qe85q7faauxru/subtitry/` |
| QE85QEF1AUXRU (samsung-qe85qef1auxru) | `/modeli/samsung-qe85qef1auxru/vesa/` | `/modeli/samsung-qe85qef1auxru/potreblenie/` | `/modeli/samsung-qe85qef1auxru/subtitry/` |
| UE32F6000FUXRU (samsung-ue32f6000fuxru) | `/modeli/samsung-ue32f6000fuxru/vesa/` | `/modeli/samsung-ue32f6000fuxru/potreblenie/` | `/modeli/samsung-ue32f6000fuxru/subtitry/` |
| UE32H5000FUXRU (samsung-ue32h5000fuxru) | `/modeli/samsung-ue32h5000fuxru/vesa/` | `/modeli/samsung-ue32h5000fuxru/potreblenie/` | `/modeli/samsung-ue32h5000fuxru/subtitry/` |
| UE43F6000FUXRU (samsung-ue43f6000fuxru) | `/modeli/samsung-ue43f6000fuxru/vesa/` | `/modeli/samsung-ue43f6000fuxru/potreblenie/` | `/modeli/samsung-ue43f6000fuxru/subtitry/` |
| UE43U8000FUXRU (samsung-ue43u8000fuxru) | `/modeli/samsung-ue43u8000fuxru/vesa/` | `/modeli/samsung-ue43u8000fuxru/potreblenie/` | `/modeli/samsung-ue43u8000fuxru/subtitry/` |
| UE50U8000FUXRU (samsung-ue50u8000fuxru) | `/modeli/samsung-ue50u8000fuxru/vesa/` | `/modeli/samsung-ue50u8000fuxru/potreblenie/` | `/modeli/samsung-ue50u8000fuxru/subtitry/` |
| UE55DU7100UXRU (samsung-ue55du7100uxru) | `/modeli/samsung-ue55du7100uxru/vesa/` | `/modeli/samsung-ue55du7100uxru/potreblenie/` | `/modeli/samsung-ue55du7100uxru/subtitry/` |
| UE55U8000FUXRU (samsung-ue55u8000fuxru) | `/modeli/samsung-ue55u8000fuxru/vesa/` | `/modeli/samsung-ue55u8000fuxru/potreblenie/` | `/modeli/samsung-ue55u8000fuxru/subtitry/` |
| UE65U8000FUXRU (samsung-ue65u8000fuxru) | `/modeli/samsung-ue65u8000fuxru/vesa/` | `/modeli/samsung-ue65u8000fuxru/potreblenie/` | `/modeli/samsung-ue65u8000fuxru/subtitry/` |
| UE75U8000FUXRU (samsung-ue75u8000fuxru) | `/modeli/samsung-ue75u8000fuxru/vesa/` | `/modeli/samsung-ue75u8000fuxru/potreblenie/` | `/modeli/samsung-ue75u8000fuxru/subtitry/` |
| UE85U8000FUXRU (samsung-ue85u8000fuxru) | `/modeli/samsung-ue85u8000fuxru/vesa/` | `/modeli/samsung-ue85u8000fuxru/potreblenie/` | `/modeli/samsung-ue85u8000fuxru/subtitry/` |
| SDX-32F2139 (sber-sdx-32f2139) | `/modeli/sber-sdx-32f2139/vesa/` | `/modeli/sber-sdx-32f2139/potreblenie/` | `/modeli/sber-sdx-32f2139/subtitry/` |
| SDX-32F3112 (sber-sdx-32f3112) | `/modeli/sber-sdx-32f3112/vesa/` | `/modeli/sber-sdx-32f3112/potreblenie/` | `/modeli/sber-sdx-32f3112/subtitry/` |
| SDX-32H3113 (sber-sdx-32h3113) | `/modeli/sber-sdx-32h3113/vesa/` | `/modeli/sber-sdx-32h3113/potreblenie/` | `/modeli/sber-sdx-32h3113/subtitry/` |
| SDX-32H3114 (sber-sdx-32h3114) | `/modeli/sber-sdx-32h3114/vesa/` | `/modeli/sber-sdx-32h3114/potreblenie/` | `/modeli/sber-sdx-32h3114/subtitry/` |
| SDX-43F3000DBA (sber-sdx-43f3000dba) | `/modeli/sber-sdx-43f3000dba/vesa/` | `/modeli/sber-sdx-43f3000dba/potreblenie/` | `/modeli/sber-sdx-43f3000dba/subtitry/` |
| 43LST6575 (skyline-43lst6575) | `/modeli/skyline-43lst6575/vesa/` | `/modeli/skyline-43lst6575/potreblenie/` | `/modeli/skyline-43lst6575/subtitry/` |
| SW-LED24SG304 (starwind-sw-led24sg304) | `/modeli/starwind-sw-led24sg304/vesa/` | `/modeli/starwind-sw-led24sg304/potreblenie/` | `/modeli/starwind-sw-led24sg304/subtitry/` |
| SW-LED32BG200 (starwind-sw-led32bg200) | `/modeli/starwind-sw-led32bg200/vesa/` | `/modeli/starwind-sw-led32bg200/potreblenie/` | `/modeli/starwind-sw-led32bg200/subtitry/` |
| SW-LED40SG300 (starwind-sw-led40sg300) | `/modeli/starwind-sw-led40sg300/vesa/` | `/modeli/starwind-sw-led40sg300/potreblenie/` | `/modeli/starwind-sw-led40sg300/subtitry/` |
| 32A400 PRO (tcl-32a400-pro) | `/modeli/tcl-32a400-pro/vesa/` | `/modeli/tcl-32a400-pro/potreblenie/` | `/modeli/tcl-32a400-pro/subtitry/` |
| 32S4K (tcl-32s4k) | `/modeli/tcl-32s4k/vesa/` | `/modeli/tcl-32s4k/potreblenie/` | `/modeli/tcl-32s4k/subtitry/` |
| 43P7L (tcl-43p7l) | `/modeli/tcl-43p7l/vesa/` | `/modeli/tcl-43p7l/potreblenie/` | `/modeli/tcl-43p7l/subtitry/` |
| 43S5K (tcl-43s5k) | `/modeli/tcl-43s5k/vesa/` | `/modeli/tcl-43s5k/potreblenie/` | `/modeli/tcl-43s5k/subtitry/` |
| 50P7L (tcl-50p7l) | `/modeli/tcl-50p7l/vesa/` | `/modeli/tcl-50p7l/potreblenie/` | `/modeli/tcl-50p7l/subtitry/` |
| 50V6C (tcl-50v6c) | `/modeli/tcl-50v6c/vesa/` | `/modeli/tcl-50v6c/potreblenie/` | `/modeli/tcl-50v6c/subtitry/` |
| 55C6K (tcl-55c6k) | `/modeli/tcl-55c6k/vesa/` | `/modeli/tcl-55c6k/potreblenie/` | `/modeli/tcl-55c6k/subtitry/` |
| 55C745 (tcl-55c745) | `/modeli/tcl-55c745/vesa/` | `/modeli/tcl-55c745/potreblenie/` | `/modeli/tcl-55c745/subtitry/` |
| 55C755 (tcl-55c755) | `/modeli/tcl-55c755/vesa/` | `/modeli/tcl-55c755/potreblenie/` | `/modeli/tcl-55c755/subtitry/` |
| 55C765 (tcl-55c765) | `/modeli/tcl-55c765/vesa/` | `/modeli/tcl-55c765/potreblenie/` | `/modeli/tcl-55c765/subtitry/` |
| 55C7K (tcl-55c7k) | `/modeli/tcl-55c7k/vesa/` | `/modeli/tcl-55c7k/potreblenie/` | `/modeli/tcl-55c7k/subtitry/` |
| 55C7L (tcl-55c7l) | `/modeli/tcl-55c7l/vesa/` | `/modeli/tcl-55c7l/potreblenie/` | `/modeli/tcl-55c7l/subtitry/` |
| 55P6K (tcl-55p6k) | `/modeli/tcl-55p6k/vesa/` | `/modeli/tcl-55p6k/potreblenie/` | `/modeli/tcl-55p6k/subtitry/` |
| 55P7K (tcl-55p7k) | `/modeli/tcl-55p7k/vesa/` | `/modeli/tcl-55p7k/potreblenie/` | `/modeli/tcl-55p7k/subtitry/` |
| 55P7L (tcl-55p7l) | `/modeli/tcl-55p7l/vesa/` | `/modeli/tcl-55p7l/potreblenie/` | `/modeli/tcl-55p7l/subtitry/` |
| 55Q6C (tcl-55q6c) | `/modeli/tcl-55q6c/vesa/` | `/modeli/tcl-55q6c/potreblenie/` | `/modeli/tcl-55q6c/subtitry/` |
| 55Q6CS (tcl-55q6cs) | `/modeli/tcl-55q6cs/vesa/` | `/modeli/tcl-55q6cs/potreblenie/` | `/modeli/tcl-55q6cs/subtitry/` |
| 55T8D (tcl-55t8d) | `/modeli/tcl-55t8d/vesa/` | `/modeli/tcl-55t8d/potreblenie/` | `/modeli/tcl-55t8d/subtitry/` |
| 65C7K (tcl-65c7k) | `/modeli/tcl-65c7k/vesa/` | `/modeli/tcl-65c7k/potreblenie/` | `/modeli/tcl-65c7k/subtitry/` |
| 65P8L (tcl-65p8l) | `/modeli/tcl-65p8l/vesa/` | `/modeli/tcl-65p8l/potreblenie/` | `/modeli/tcl-65p8l/subtitry/` |
| 65Q7D (tcl-65q7d) | `/modeli/tcl-65q7d/vesa/` | `/modeli/tcl-65q7d/potreblenie/` | `/modeli/tcl-65q7d/subtitry/` |
| 65V6C (tcl-65v6c) | `/modeli/tcl-65v6c/vesa/` | `/modeli/tcl-65v6c/potreblenie/` | `/modeli/tcl-65v6c/subtitry/` |
| 75C6K (tcl-75c6k) | `/modeli/tcl-75c6k/vesa/` | `/modeli/tcl-75c6k/potreblenie/` | `/modeli/tcl-75c6k/subtitry/` |
| TDHTV24Y1HD_BK (topdevice-tdhtv24y1hd-bk) | `/modeli/topdevice-tdhtv24y1hd-bk/vesa/` | `/modeli/topdevice-tdhtv24y1hd-bk/potreblenie/` | `/modeli/topdevice-tdhtv24y1hd-bk/subtitry/` |
| TDHTV32GFD_BK (topdevice-tdhtv32gfd-bk) | `/modeli/topdevice-tdhtv32gfd-bk/vesa/` | `/modeli/topdevice-tdhtv32gfd-bk/potreblenie/` | `/modeli/topdevice-tdhtv32gfd-bk/subtitry/` |
| TDHTV32GHD_BK (topdevice-tdhtv32ghd-bk) | `/modeli/topdevice-tdhtv32ghd-bk/vesa/` | `/modeli/topdevice-tdhtv32ghd-bk/potreblenie/` | `/modeli/topdevice-tdhtv32ghd-bk/subtitry/` |
| TD100UFBHH12 (tuvio-td100ufbhh12) | `/modeli/tuvio-td100ufbhh12/vesa/` | `/modeli/tuvio-td100ufbhh12/potreblenie/` | `/modeli/tuvio-td100ufbhh12/subtitry/` |
| TD24HBCH11 (tuvio-td24hbch11) | `/modeli/tuvio-td24hbch11/vesa/` | `/modeli/tuvio-td24hbch11/potreblenie/` | `/modeli/tuvio-td24hbch11/subtitry/` |
| TD32HFBCH12 (tuvio-td32hfbch12) | `/modeli/tuvio-td32hfbch12/vesa/` | `/modeli/tuvio-td32hfbch12/potreblenie/` | `/modeli/tuvio-td32hfbch12/subtitry/` |
| TD43UFBHH13 (tuvio-td43ufbhh13) | `/modeli/tuvio-td43ufbhh13/vesa/` | `/modeli/tuvio-td43ufbhh13/potreblenie/` | `/modeli/tuvio-td43ufbhh13/subtitry/` |
| TD50UFBHH11 (tuvio-td50ufbhh11) | `/modeli/tuvio-td50ufbhh11/vesa/` | `/modeli/tuvio-td50ufbhh11/potreblenie/` | `/modeli/tuvio-td50ufbhh11/subtitry/` |
| TD50UFBHH12 (tuvio-td50ufbhh12) | `/modeli/tuvio-td50ufbhh12/vesa/` | `/modeli/tuvio-td50ufbhh12/potreblenie/` | `/modeli/tuvio-td50ufbhh12/subtitry/` |
| TD55UFBTH51 (tuvio-td55ufbth51) | `/modeli/tuvio-td55ufbth51/vesa/` | `/modeli/tuvio-td55ufbth51/potreblenie/` | `/modeli/tuvio-td55ufbth51/subtitry/` |
| TD65UFBHH12 (tuvio-td65ufbhh12) | `/modeli/tuvio-td65ufbhh12/vesa/` | `/modeli/tuvio-td65ufbhh12/potreblenie/` | `/modeli/tuvio-td65ufbhh12/subtitry/` |
| TM75UFGCH52 (tuvio-tm75ufgch52) | `/modeli/tuvio-tm75ufgch52/vesa/` | `/modeli/tuvio-tm75ufgch52/potreblenie/` | `/modeli/tuvio-tm75ufgch52/subtitry/` |
| TQ65UFGHH13 (tuvio-tq65ufghh13) | `/modeli/tuvio-tq65ufghh13/vesa/` | `/modeli/tuvio-tq65ufghh13/potreblenie/` | `/modeli/tuvio-tq65ufghh13/subtitry/` |
| TV A Pro 32 2026 (xiaomi-tv-a-pro-32-2026) | `/modeli/xiaomi-tv-a-pro-32-2026/vesa/` | `/modeli/xiaomi-tv-a-pro-32-2026/potreblenie/` | `/modeli/xiaomi-tv-a-pro-32-2026/subtitry/` |
| Xiaomi TV A 43 2025 (xiaomi-tv-a-43-2025) | `/modeli/xiaomi-tv-a-43-2025/vesa/` | `/modeli/xiaomi-tv-a-43-2025/potreblenie/` | `/modeli/xiaomi-tv-a-43-2025/subtitry/` |
| Xiaomi TV A 50 2025 (xiaomi-tv-a-50-2025) | `/modeli/xiaomi-tv-a-50-2025/vesa/` | `/modeli/xiaomi-tv-a-50-2025/potreblenie/` | `/modeli/xiaomi-tv-a-50-2025/subtitry/` |
| Xiaomi TV A 55 2025 (xiaomi-tv-a-55-2025) | `/modeli/xiaomi-tv-a-55-2025/vesa/` | `/modeli/xiaomi-tv-a-55-2025/potreblenie/` | `/modeli/xiaomi-tv-a-55-2025/subtitry/` |
| Xiaomi TV A Pro 43 2025 (xiaomi-tv-a-pro-43-2025) | `/modeli/xiaomi-tv-a-pro-43-2025/vesa/` | `/modeli/xiaomi-tv-a-pro-43-2025/potreblenie/` | `/modeli/xiaomi-tv-a-pro-43-2025/subtitry/` |
| Xiaomi TV A Pro 55 2025 (xiaomi-tv-a-pro-55-2025) | `/modeli/xiaomi-tv-a-pro-55-2025/vesa/` | `/modeli/xiaomi-tv-a-pro-55-2025/potreblenie/` | `/modeli/xiaomi-tv-a-pro-55-2025/subtitry/` |
| Xiaomi TV A Pro 55 2026 (xiaomi-tv-a-pro-55-2026) | `/modeli/xiaomi-tv-a-pro-55-2026/vesa/` | `/modeli/xiaomi-tv-a-pro-55-2026/potreblenie/` | `/modeli/xiaomi-tv-a-pro-55-2026/subtitry/` |
| Xiaomi TV A Pro 65 2025 (xiaomi-tv-a-pro-65-2025) | `/modeli/xiaomi-tv-a-pro-65-2025/vesa/` | `/modeli/xiaomi-tv-a-pro-65-2025/potreblenie/` | `/modeli/xiaomi-tv-a-pro-65-2025/subtitry/` |
| Xiaomi TV S Pro Mini LED 55 2026 (xiaomi-tv-s-pro-mini-led-55-2026) | `/modeli/xiaomi-tv-s-pro-mini-led-55-2026/vesa/` | `/modeli/xiaomi-tv-s-pro-mini-led-55-2026/potreblenie/` | `/modeli/xiaomi-tv-s-pro-mini-led-55-2026/subtitry/` |
| Xiaomi TV S Pro Mini LED 75 2026 (xiaomi-tv-s-pro-mini-led-75-2026) | `/modeli/xiaomi-tv-s-pro-mini-led-75-2026/vesa/` | `/modeli/xiaomi-tv-s-pro-mini-led-75-2026/potreblenie/` | `/modeli/xiaomi-tv-s-pro-mini-led-75-2026/subtitry/` |
| 32E9000 (yasin-32e9000) | `/modeli/yasin-32e9000/vesa/` | `/modeli/yasin-32e9000/potreblenie/` | `/modeli/yasin-32e9000/subtitry/` |

Кандидаты 484–500 — семнадцать конкретных межмодельных вариантов из тематик приложения. В колонке «перекрытие» указан уже живой canonical или отсутствующее доказательство. Ни один из этих вариантов не становится страницей из-за того, что у него получилось придумать slug.

| № | Потенциальный новый URL / отдельная задача | Перекрытие и решение сейчас | Что могло бы изменить решение |
|---:|---|---|---|
| 484 | `/skrytoe-subtitrirovanie-teleperedach/` — источник скрытых титров канала | **MERGE** с `/kak-ubrat-teletext-i-skrytye-subtitry/` | Устойчивый query→page сигнал другого результата, который действующий URL не способен дать |
| 485 | `/subtitry-okko-na-televizore/` — меню субтитров в Okko на ТВ | **HOLD-INTENT**: общий `/kak-otklyuchit-subtitry-na-televizore/`, путь приложения ещё не подтверждён | Актуальная справка Okko по платформам + спрос именно на приложение + отдельный интерактивный результат |
| 486 | `/audiodeskriptsiya-na-televizore/` — отличить аудиоописание от голосового помощника | **HOLD-INTENT**: не доказан отдельный ответ от уже имеющихся настроек звука | Официальные инструкции TV/платформы и query→page для этой проблемы |
| 487 | `/potreblenie-televizora-v-rezhime-ozhidaniya/` — расход standby | **MERGE** с `/skolko-elektroenergii-potreblyaet-televizor/` | Лишь подтверждённая несводимая модельная база режимов и самостоятельный инструмент |
| 488 | `/skolko-potreblyaet-oled-televizor/` — сравнение расхода OLED | **HOLD-DATA**: тип матрицы не равен паспортной мощности | Паспортные W для репрезентативных точных моделей, режимов, методика измерения и спрос |
| 489 | `/skolko-potreblyaet-televizor-55-dyuymov/` — расход по диагонали | **MERGE** с калькулятором `/skolko-elektroenergii-potreblyaet-televizor/` | Не выпускать по одной диагонали: без ватт конкретной модели это ложная точность |
| 490 | `/podklyuchit-saundbar-cherez-hdmi-arc/` — способ ARC | **MERGE** с `/kak-podklyuchit-saundbar-k-televizoru/` и `/net-zvuka-cherez-hdmi-arc/` | Только отдельная подтверждённая задача, не повтор шагов существующего мастера |
| 491 | `/podklyuchit-saundbar-cherez-opticheskiy-kabel/` — способ optical | **MERGE** с `/kak-podklyuchit-saundbar-k-televizoru/` | Отдельный URL возможен при проверенном уникальном диагностическом дереве и спросе |
| 492 | `/bluetooth-kolonka-k-televizoru/` — колонка через Bluetooth | **MERGE** с `/kak-podklyuchit-kolonki-k-televizoru/` | Дополнить существующий мастер источниками, не размножать похожий текст |
| 493 | `/bluetooth-mikrofon-k-televizoru/` — микрофон через Bluetooth | **MERGE** с `/kak-podklyuchit-mikrofon-k-televizoru/` | Если появятся паспортные ограничения/отдельные платформенные маршруты и спрос |
| 494 | `/televizor-ne-vidit-fleshku-64-gb/` — USB-накопитель 64 ГБ | **MERGE** с `/televizor-ne-vidit-fleshku/` и `/kakoy-format-fleshki-nuzhen-dlya-televizora/` | Размер накопителя сам по себе не гарантирует уникальный метод диагностики |
| 495 | `/televizor-zavis-na-zastavke/` — зависание при запуске | **MERGE** с `/televizor-zavis/` и `/televizor-postoyanno-perezagruzhaetsya/` | Доказанный самостоятельный сценарий и безопасная последовательность производителя |
| 496 | `/tv-pristavka-k-televizoru/` — подключение приставки | **MERGE** с `/kak-podklyuchit-smart-tv-pristavku-k-televizoru/` и `/kak-podklyuchit-tsifrovuyu-pristavku-k-televizoru/` | Сначала маршрутизировать по типу приставки в существующих URL |
| 497 | `/kak-proverit-bu-televizor-pered-pokupkoy/` — приёмка б/у ТВ | **HOLD-INTENT**: рядом `/proverka-televizora-pered-pokupkoy/` | Доказать иной job (скрытые дефекты/ресурс/комплект), уникальный проверяемый чек-лист и спрос |
| 498 | `/kak-nastroit-kanaly-na-samsung-tv/` — брендовый маршрут настройки | **HOLD-DATA**: общий `/kak-nastroit-tsifrovye-kanaly-na-televizore/` | Официальные инструкции Samsung по сериям/ОС, локальные меню и query→page сигнал |
| 499 | `/kak-otklyuchit-subtitry-na-lg-tv/` — брендовый маршрут субтитров | **HOLD-DATA**: общий `/kak-otklyuchit-subtitry-na-televizore/` | Точная версия webOS/источник титров, официальная инструкция и отдельный результат |
| 500 | `/vesa/400x200/` — проверка точного шаблона | **HOLD-DATA**: Wordstat `vesa 400x200` — 199, но пока одна точная ТВ-модель в нашем каталоге | Расширить проверенный модельный граф и доказать, что страницу не заменяет `/vesa/`/паспорт |

Итог арифметики: 161 модельный VESA-дубль + 322 модельные страницы без необходимых данных + 10 межмодельных дублей + 7 межмодельных исследовательских гипотез = **500 кандидатов, 0 готовых новых canonical**. Эта таблица не является списком sitemap и не должна использоваться как вход для генератора страниц.

## Release gate: из кандидата в отдельный canonical

Для любого из 500 переход от гипотезы к странице разрешён только при одновременном выполнении условий:

1. **Спрос:** датированный Wordstat с оператором/регионом либо релевантный query→page в GSC/Яндекс Вебмастере; не выводить частоту из похожей фразы и не суммировать пересекающиеся варианты. Ориентир `>=10` релевантных показов на query→page пригоден для *диагностики*, но не сам по себе для нового URL.
2. **Иная работа:** человек на новой странице получает результат, который существующий canonical не даёт без существенной потери качества. Перед этим письменно сравнить SERP и соседние URL, проверить пересечение title/H1, FAQ и внутренней навигации. Если результат тот же — улучшить существующую страницу.
3. **Первичные данные:** официальный паспорт или справка точной модели/платформы, регион и дата проверки, числовые поля с единицами; при конфликте источников — `нужно проверить`, без домысла. Для безопасности/электрики/монтажа — fail-closed и ссылка на инструкцию специалиста.
4. **Собственная ценность:** короткий ответ, работающий калькулятор/диагностика/подбор, не декоративный виджет; полезная таблица и источники в первоначальном HTML. Страница должна оставаться полезной без партнёрской кнопки и без цены Маркета.
5. **Операционный контур:** проверка отсутствия дублей, входящая ссылка, self-canonical, SSR, sitemap только индексируемых, тесты, мобильный QA, послерелизная проверка production. Регистрировать `result_completed` после явного завершения, затем `mount_detail_click`/`market_click`; не считать просмотры, показы, IndexNow или тесты посетителями.

Провал любого условия возвращает кандидата в **MERGE** или **HOLD**, а не в очередь публикации. При измерении использовать полные 7/28-дневные окна; ошибки обхода и каннибализацию исправлять до следующей когорты. Не ставить норму «N страниц в день» и не накручивать взаимодействия ради поведенческих сигналов.

## Безопасная первая когорта после текущего монтажного релиза

Пять **существующих** URL, не пятьдесят новых: `/kak-ubrat-teletext-i-skrytye-subtitry/`, `/kak-otklyuchit-subtitry-na-televizore/`, `/skolko-elektroenergii-potreblyaet-televizor/`, `/kak-podklyuchit-saundbar-k-televizoru/`, `/kak-podklyuchit-mikrofon-k-televizoru/`. На первом шаге получить свежий query→page отчёт с датой, страницей и реальным числом показов; затем проверить у каждой первое полезное действие, видимый ответ, точные официальные инструкции, мобильную работу, CTR и события завершения. Изменять только страницы с сигналом или дефектом и по одному проверяемому предположению за раз. Если после такой проверки отдельная задача действительно не помещается в существующий URL, проектировать **одну** новую страницу с самостоятельным инструментом, не 500-вариантную сетку.

В приложенном материале верно замечено, что спрос простирается за пределы кронштейнов. Но средний поисковый показ, Wordstat, модельный slug и время на странице не равны ценности для пользователя. Результат страницы — законченная проверка/диагностика, а коммерческий переход лишь следующий шаг после неё. [Google о полезном контенте](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) и [Яндекс об отличиях качественного сайта](https://yandex.ru/support/webmaster/ru/yandex-indexing/webmaster-advice) прямо поддерживают этот качественный, а не квотный подход.
