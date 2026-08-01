# Трафиковый релиз: системные задачи Smart TV, когорта 7

Статус: production опубликован и проверен. Дата релиза: 2026-08-01.

## Цель и baseline

Операционный gate — не менее 1 001 легитимного уникального посетителя в сутки
семь полностью завершённых дней подряд. На момент релиза подтверждённый baseline
остаётся 0/7. Wordstat, sitemap, HTTP 200/202, IndexNow и наличие URL в поиске не
являются посетителями.

## Новые страницы

| Canonical | Exact fixed-wordform Wordstat, Россия |
|---|---:|
| `/kak-obnovit-televizor/` | 32 685 |
| `/kak-ustanovit-prilozhenie-na-televizor/` | 16 195 |
| `/kak-sbrosit-televizor-do-zavodskih-nastroek/` | 7 940 |

Непересекающаяся сумма трёх canonical — 56 820 запросов в месяц. Это оценка
спроса, а не прогноз переходов. После сборки сайт содержит 164 индексируемых URL,
165 HTML-страниц и 54 SEO-материала. Новые URL заморожены до появления измеримых
query-to-page сигналов.

## Собственная ценность

Три страницы дают самостоятельный SSR-ответ и локальный Rust/WASM-мастер с
закрытыми вариантами. Обновление разрешает только официальный модельный путь и
не предлагает прерывать уже идущий процесс. Установка приложения ограничена
официальным магазином платформы. Полный сброс требует явного подтверждения потери
настроек, каналов, аккаунтов/данных и приложений. На страницах нет цен, Market CTA,
форм свободного ввода, серверной отправки ответов или скрытых редиректов.

## Release evidence

- source commit: `dc2d3e1ae03744a7ff5e3a444545c240d45c71bc`;
- GitHub Pages run: `30714233634`, success;
- полный build: Rust engine 104, sitegen 37, web 186;
- verifier: 165 HTML, 54 SEO-материала, 164 URL в sitemap;
- security/static/affiliate audits: pass;
- независимый review: PASS, открытых P0–P2 нет;
- design packet: `20260801-cohort-7-smart-tv`, ship gate pass, packet hash
  `sha256:55a4d58c6ded30edc97ed81e659e32a63d7e3ccfb10a8a7972cb73ebd80c742a`;
- HTTP→HTTPS: 301; HTTPS: 200; сертификат покрывает apex и `www` до
  28 октября 2026 года;
- production совпал с локальным артефактом по SHA-256 для 8 из 8 файлов;
- browser smoke прошёл на 320×800, 768×1024 и 1440×900: WASM работает,
  horizontal overflow и Market-ссылки отсутствуют;
- ровно три новых canonical отправлены в IndexNow и приняты с HTTP 202; это
  только уведомление, не индексация и не трафик.

Контрольные SHA-256: главная
`dc2e0b566681af4556be621ee1775654028433514bff7ca0f0a264697268f966`,
sitemap `576d4eedc4f28f328ec8fcc53e7e2ad635b9fcfa17673495635547ee96b62851`,
обновление `e00eee4dcfb8141ef40c0c9b58122c1aabab518f85fc638175292986929ec87d`,
приложения `8d97bde802724402f1fb183c8f7d169b93b7726613c7cf3c32f0441adeaa47b3`,
сброс `276144762d03d6e08f135562262f0988d2ef360f1e8b7490990002a19ae92c80`,
JS `b0e28e9e0fc30f3d98a959c95fd7e17d794c3dc58cd1f4bea93983cdf16bacf0`,
CSS `8a674c143c03aa0f35b36330d849344ccc579e059352bc6787d0f9a9bd49ad32`,
WASM `80e669338006e38f4f9df70abf00876017202a96af67e45bca1b64411bd1b68d`.

## Остаточный риск

Два официальных документа Sony возвращают HTTP 403 автоматическому запросу, но
читаются в обычном браузере; ограничение явно записано в source manifest.

## Откат

Откатить source commit через `git revert dc2d3e1`, удалив три canonical, их
Rust/WASM-логику, source-map и generated pages, затем пересобрать артефакт. Это
вернёт verifier и sitemap к 161 URL. DNS, Метрику и affiliate-состояние не менять.
