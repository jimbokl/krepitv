# KREPI TV: хостинг, DNS, HTTPS и восстановление

Дата фиксации: 13 августа 2026 года.

Этот плейбук описывает фактическую production-схему `krepitv.ru`. Сайт не
использует Cloud.ru, виртуальную машину, nginx, Certbot, базу данных или
постоянный backend. Production — статический артефакт в `docs/`, который
собирается и публикуется GitHub Actions на GitHub Pages. Хостинг и выпуск
TLS-сертификата не требуют отдельной оплаты.

## Коротко: как всё устроено

```text
исходники + данные
        │
        ▼
npm run build
        │
        ├── Rust sitegen → статический HTML
        ├── Rust → WASM
        ├── React/Vite/Tailwind → CSS и JS
        └── scripts/copy-dist.mjs → docs/
                                      │
                                      ▼
                           GitHub Actions pages.yml
                                      │
                                      ▼
                                GitHub Pages
                                      │
                     REG.RU DNS ──────┤
                                      ▼
                          https://krepitv.ru/
                    автоматический TLS Let’s Encrypt
```

Главный адрес — `https://krepitv.ru/`. Варианты `http://krepitv.ru/` и
`https://www.krepitv.ru/` перенаправляются на него.

## Текущее состояние production

Контроль 13 августа 2026 года:

| Проверка | Фактическое состояние |
|---|---|
| Репозиторий | `jimbokl/krepitv` |
| Ветка production | `main` |
| Способ публикации Pages | GitHub Actions, `build_type=workflow` |
| Публикуемый каталог | `docs/` |
| Пользовательский домен | `krepitv.ru` |
| HTTPS enforcement | включён |
| HTTP → HTTPS | `301` на `https://krepitv.ru/` |
| HTTPS apex | `200`, проверка цепочки TLS успешна |
| `www` | `301` на apex, проверка TLS успешна |
| Сертификат | Let’s Encrypt, `CN=krepitv.ru` |
| SAN | `krepitv.ru`, `www.krepitv.ru` |
| Действующий сертификат | 30.07.2026–28.10.2026; продлевает GitHub |

Дата окончания в таблице — только снимок состояния. Сертификат не нужно менять
в репозитории: GitHub Pages выпускает и продлевает его автоматически.

## DNS в REG.RU

Рабочая конфигурация зоны:

| Имя | Тип | Значение |
|---|---|---|
| `@` | `A` | `185.199.108.153` |
| `@` | `A` | `185.199.109.153` |
| `@` | `A` | `185.199.110.153` |
| `@` | `A` | `185.199.111.153` |
| `www` | `CNAME` | `jimbokl.github.io.` |

TTL можно оставить стандартным REG.RU. У apex сейчас нет `AAAA`, а в зоне нет
`CAA`; для действующей схемы они не требуются. Нельзя оставлять конкурирующие
`A`, `AAAA`, `ALIAS`, `ANAME` или переадресацию для `@` и второй `CNAME` для
`www`: GitHub предупреждает, что конфликтующие записи могут помешать выпуску
сертификата.

Если когда-нибудь будет добавлен `CAA`, он обязан разрешать выпуск для
`letsencrypt.org`, иначе GitHub не сможет обновить сертификат.

Проверка публичного DNS:

```bash
dig +short A krepitv.ru
dig +short AAAA krepitv.ru
dig +short CNAME www.krepitv.ru
dig +short CAA krepitv.ru
```

Ожидается четыре A-адреса из таблицы, пустой ответ для `AAAA` и `CAA`, а для
`www` — `jimbokl.github.io.`.

## Как был подключён домен и получен SSL-сертификат

1. В REG.RU для apex были созданы четыре A-записи GitHub Pages, а для `www` —
   CNAME на `jimbokl.github.io`.
2. В `Settings → Pages` репозитория выбран источник `GitHub Actions` и задан
   Custom domain `krepitv.ru`.
3. Генератор релиза сохраняет `krepitv.ru` в `docs/CNAME`:

   ```javascript
   await writeFile(new URL("CNAME", target), "krepitv.ru\n", "utf8");
   ```

   При текущем custom Actions workflow GitHub хранит домен в настройках Pages;
   файл `CNAME` не выпускает сертификат сам. Он остаётся в артефакте как явный
   источник домена и защита при возможном возврате к branch-based публикации.
4. После успешной проверки DNS GitHub Pages автоматически запросил сертификат
   Let’s Encrypt для `krepitv.ru` и `www.krepitv.ru`. Сертификат и его приватный
   ключ никогда не передавались в репозиторий.
5. В Pages включён `Enforce HTTPS`. После этого HTTP и `www` стали
   перенаправляться на канонический apex HTTPS.

Никаких команд `certbot`, cron для продления или файлов `.pem` в проекте нет и
добавлять их не нужно.

Официальные инструкции GitHub:

- [пользовательский домен для GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site);
- [HTTPS для GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https);
- [диагностика домена и сертификата](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages);
- [подтверждение владения доменом](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).

## Как собирается production

Корневая команда:

```bash
cd /Volumes/DevSim/Projects/krepitv
npm --prefix web ci --no-audit --no-fund
npm run build
```

`npm run build` выполняет:

1. `build:release`:
   - очищает предыдущий артефакт;
   - запускает Rust-генератор статического контента;
   - собирает Rust/WASM;
   - собирает React/Vite/Tailwind;
   - копирует готовый сайт в `docs/`;
   - добавляет `docs/CNAME` и `docs/.nojekyll`.
2. `verify`:
   - проверяет форматирование и тесты Rust;
   - проверяет воспроизводимость WASM;
   - проверяет русский публичный интерфейс;
   - проверяет каталог, источники, sitemap, canonical, данные и SEO-страницы;
   - проверяет партнёрские данные и отсутствие утечек приватных значений.

Закреплённые версии находятся в `.node-version`, `rust-toolchain.toml` и
workflow. На дату плейбука это Node.js 22.23.2, Rust 1.93.1 и `wasm-pack`
0.13.1.

## Как происходит деплой

Production workflow: `.github/workflows/pages.yml`.

1. Изменения source/data/build-контура и `docs/**` в `main` запускают workflow.
2. Build job получает только `contents: read`, устанавливает закреплённые
   Node.js, Rust и `wasm-pack`, затем заново выполняет `npm run build:release`.
3. Workflow требует, чтобы пересобранный артефакт совпал с файлами Git. Это
   защищает от ситуации «исходники изменены, а `docs/` забыли обновить».
4. Готовый `docs/` загружается как Pages artifact.
5. Только отдельный deploy job получает минимальные права `pages: write` и
   `id-token: write`, затем публикует именно проверенный artifact.
6. Независимый `.github/workflows/ci.yml` на том же production-изменении
   выполняет полный `npm run build` со всеми тестами.

Все сторонние Actions закреплены полными commit SHA. Верхнеуровневые права
workflow пусты; write-права выдаются только deploy job. Документация в
`product-docs/**` специально не запускает production-деплой и не меняет
`Last-Modified` всех страниц.

Обычный безопасный релиз:

```bash
cd /Volumes/DevSim/Projects/krepitv
git status --short --branch
npm run build
git diff --check
git status --short
git add -- <изменённые исходники> docs web/public web/index.html
git commit -m "описание изменения"
git push origin main
```

После push нужно дождаться обоих workflow:

```bash
gh run list --repo jimbokl/krepitv --workflow ci.yml --limit 3
gh run list --repo jimbokl/krepitv --workflow pages.yml --limit 3
gh run watch <RUN_ID> --repo jimbokl/krepitv --exit-status
```

Не следует публиковать `docs/` вручную поверх неуспешной сборки и не нужно
поднимать временный сервер в Cloud.ru.

## Обязательная проверка после релиза

```bash
curl -sS -o /dev/null \
  -w 'HTTP status=%{http_code} redirect=%{redirect_url}\n' \
  http://krepitv.ru/

curl -sS -o /dev/null \
  -w 'HTTPS status=%{http_code} verify=%{ssl_verify_result}\n' \
  https://krepitv.ru/

curl -sS -o /dev/null \
  -w 'WWW status=%{http_code} redirect=%{redirect_url} verify=%{ssl_verify_result}\n' \
  https://www.krepitv.ru/

printf '' | openssl s_client \
  -connect krepitv.ru:443 -servername krepitv.ru 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName

curl -fsS https://krepitv.ru/robots.txt >/dev/null
curl -fsS https://krepitv.ru/sitemap.xml >/dev/null

gh api repos/jimbokl/krepitv/pages \
  --jq '{status,cname,https_enforced,build_type,html_url}'
```

Критерии успеха:

- HTTP возвращает `301` на `https://krepitv.ru/`;
- apex HTTPS возвращает `200`, `ssl_verify_result=0`;
- `www` возвращает `301` на apex и `ssl_verify_result=0`;
- SAN сертификата содержит оба домена;
- Pages API показывает `status=built`, `cname=krepitv.ru`,
  `https_enforced=true`, `build_type=workflow`;
- `robots.txt`, `sitemap.xml` и несколько изменённых страниц отвечают `200`;
- при содержательном релизе production-файлы совпадают с локальным `docs/`.

Для побайтовой проверки одного файла:

```bash
curl -fsS https://krepitv.ru/sitemap.xml -o /tmp/krepitv-sitemap.xml
cmp -s docs/sitemap.xml /tmp/krepitv-sitemap.xml
```

Успешный workflow сам по себе ещё не доказывает, что CDN уже отдаёт новый
артефакт. Поэтому HTTPS smoke и сравнение файла выполняются после deploy.

## Если браузер пишет `ERR_CERT_COMMON_NAME_INVALID`

Это означает, что сертификат, полученный браузером, не содержит открываемое
имя. Порядок диагностики:

1. Проверить `dig`, что apex указывает только на четыре Pages IP, а `www` — на
   `jimbokl.github.io.`.
2. Проверить в `Settings → Pages`, что Custom domain ровно `krepitv.ru`, без
   схемы, пути и опечатки.
3. Проверить `docs/CNAME`: одна строка `krepitv.ru`.
4. Проверить SAN через `openssl`. Для текущей схемы там обязаны быть
   `krepitv.ru` и `www.krepitv.ru`.
5. Удалить конфликтующие DNS-записи. Если используется `CAA`, разрешить
   `letsencrypt.org`.
6. Если DNS уже корректен, а GitHub показывает `Certificate not yet created`,
   удалить Custom domain из Pages, сохранить, добавить его заново и дождаться
   повторного выпуска. GitHub предупреждает, что после DNS-изменений HTTPS
   появляется не мгновенно, а переключатель enforcement может созревать до
   24 часов.
7. Включать `Enforce HTTPS` только после появления корректного сертификата.
8. После исправления снова проверить CLI. Очистка кэша браузера уместна только
   после того, как `openssl` уже показывает правильный SAN.

## Если HTTPS есть, но браузер показывает «Не защищено»

При `ssl_verify_result=0` и правильном SAN проверить mixed content — загрузку
картинок, скриптов или стилей по `http://`:

```bash
rg -n "src=['\"]http://|href=['\"]http://" docs \
  -g '*.html' -g '*.js' -g '*.css'
```

Также проверить DevTools → Security/Console. Нельзя обходить проблему своим
прокси или отключением проверки сертификата.

## Восстановление после неудачного релиза

Для отката используется новый revert-коммит, а не `reset --hard`:

```bash
cd /Volumes/DevSim/Projects/krepitv
git status --short --branch
git revert <BAD_COMMIT>
npm run build
git add -- <изменённые файлы> docs web/public web/index.html
git commit --amend --no-edit
git push origin main
```

Изменение production-файлов автоматически запустит CI и Pages. Если нужен
повторный деплой уже существующего корректного артефакта без изменения кода:

```bash
gh workflow run pages.yml --repo jimbokl/krepitv --ref main
```

После восстановления обязательны проверки HTTP, HTTPS, SAN, sitemap и одной
затронутой страницы. Не считать откат завершённым до фактической проверки
production.

## Что нельзя делать

- Не переносить статический сайт обратно на платный VM без измеренной причины.
- Не запускать Certbot: ключом и продлением управляет GitHub Pages.
- Не класть сертификаты, токены GitHub или DNS-доступы в Git.
- Не маскировать production через временный прокси и не отключать TLS verify.
- Не добавлять wildcard DNS `*`: GitHub отдельно предупреждает о риске захвата
  поддоменов.
- Не смешивать `product-docs/` с production-каталогом `docs/`.
- Не считать успешный build, DNS propagation или выпущенный сертификат
  доказательством нового трафика или индексации.

## Быстрый аварийный чек-лист

```text
[ ] git status чист или изменения понятны
[ ] последние CI и Pages завершились success
[ ] Pages API: built + workflow + https_enforced=true
[ ] DNS apex: четыре IP GitHub Pages
[ ] DNS www: CNAME jimbokl.github.io
[ ] HTTP: 301 на apex HTTPS
[ ] HTTPS: 200 и ssl_verify_result=0
[ ] SAN: apex + www
[ ] robots.txt и sitemap.xml: 200
[ ] изменённый production-файл совпадает с локальным docs/
```
