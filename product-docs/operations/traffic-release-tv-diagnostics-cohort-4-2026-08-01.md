# Трафиковый релиз: диагностика телевизора, когорта 4

Статус: production опубликован и проверен.
Дата контентного изменения: 2026-08-01.

## Цель и честный baseline

Операционный gate — 1 001 легитимный уникальный посетитель из поиска в сутки
семь полных суток подряд. На контрольной точке 01.08.2026: GSC — 33 inspected
URL в состоянии indexed pass, 0 показов и 0 кликов; Яндекс — 2 показа и 0
кликов; Метрика — 0 органических посетителей. Прямые и внутренние визиты,
Wordstat, HTTP 200/202, sitemap, IndexNow и страницы в индексе трафиком не считаются.

## Состав релиза

- `/televizor-sam-vyklyuchaetsya/`;
- `/televizor-ne-podklyuchaetsya-k-internetu/`;
- `/televizor-ne-vidit-fleshku/`.

После сборки получено 155 индексируемых URL в sitemap и 45 SEO-материалов.
На каждой странице должны быть один H1, self-canonical, русский SSR-ответ,
официальные источники, FAQ, явная stop-boundary и ноль ссылок Яндекс Маркета.

## Release gate

- пройдены 82 Rust, 34 sitegen, 159 web, 10 catalog, 75 affiliate,
  10 IndexNow и 43 analytics-теста;
- production build прошёл: 156 HTML-страниц, из них 155 indexable;
- три каноника пройдены в empty/default/disabled/loading/error/retry/success,
  focus, needs-check, external-path и service-boundary на 320×800, 768×1024
  и 1440×900; отдельно проверены 200% text и WCAG text spacing;
- drift scan не нашёл отклонений от дизайн-системы;
- независимое review прошло без открытых P0–P2; production HTTPS,
  hash parity и browser smoke тоже пройдены.

## Индексация и измерение

После production-проверки можно уведомить поисковые системы ровно о трёх новых
canonical. Принятый IndexNow не является индексацией. Следующая контентная серия
выбирается по фактическим query/page signals; новые URL не размножаются по брендам
или моделям без отдельного спроса и собственного результата.

## Production evidence

Релиз опубликован из source commit
`becbbea29c99f530fa4a297ea61ba7b38c233133` через GitHub Pages run
`30707061918` со статусом success. Cloud.ru не использовался.

- HTTP перенаправляется на HTTPS кодом 301; HTTPS отвечает 200;
- TLS-сертификат содержит `krepitv.ru` и `www.krepitv.ru`, действует до
  28.10.2026;
- SHA-256 production побайтово совпал с локальным `docs/` для 8 из 8
  файлов: главная, sitemap, три HTML, JS, CSS и Rust/WASM;
- каждый live canonical имеет HTTP 200, `lang=ru`, один H1,
  self-canonical, один SSR-ответ, 2–4 официальных источника,
  stop-boundary, FAQ и ноль Market-ссылок;
- production browser smoke прошёл на 320×800, 768×1024 и 1440×900:
  danger/service-boundary, focus, default и USB success без overflow;
- после всех production-проверок ровно три canonical отправлены
  в IndexNow; HTTP 202 означает только приём уведомления.

Аналитический baseline не переименован в успех: до появления новых
данных подтверждённая органика остаётся 0, а gate — 0/7 суток.
