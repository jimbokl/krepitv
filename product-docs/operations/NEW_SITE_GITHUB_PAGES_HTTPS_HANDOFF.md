# Handoff: HTTPS для нового статического сайта на GitHub Pages

Проверено 27 сентября 2026 года. Это переносимая инструкция для **нового** сайта, а не команда менять DNS или настройки `krepitv.ru`. Замените `example.ru`, `OWNER` и `REPO` на значения нового проекта. Если сайту нужен постоянный сервер, GitHub Pages не подходит: здесь публикуются статические HTML/CSS/JS и клиентский WASM.

## Что передать исполнителю

| Поле | Значение нового проекта |
| --- | --- |
| Основной домен | `example.ru` |
| Вариант `www` | `www.example.ru` |
| GitHub-репозиторий | `OWNER/REPO` |
| GitHub Pages hostname | `OWNER.github.io` или hostname организации, **без `/REPO`** |
| Где управляется DNS | проверить `dig +short NS example.ru`; если NS REG.RU — править зону в REG.RU |
| Источник Pages | GitHub Actions либо ветка и каталог — выбрать один |
| Каталог готового сайта | например `dist/` или `docs/` |

Рекомендуемый канонический адрес — `https://example.ru/`; `www` должен перенаправляться на него. При другом выборе поменяйте домены местами во всех проверках.

## Порядок получения сертификата

1. Создать репозиторий и опубликовать рабочий статический артефакт: хотя бы `index.html`. Убедиться, что Pages deployment завершился успешно. Для GitHub Actions в `Settings → Pages → Build and deployment` выбрать **GitHub Actions**; workflow должен загружать и публиковать именно проверенный статический каталог. Для branch-based Pages выбрать ветку и каталог.
2. По возможности сначала подтвердить владение доменом в GitHub Pages через предложенную DNS TXT-запись. Это защита от захвата домена, а не сертификат.
3. В `Settings → Pages → Custom domain` вписать **`example.ru`**, без `https://`, `www` и пути; нажать **Save**. Сделать это **до** переключения DNS на GitHub Pages.
4. У авторитетного DNS-провайдера создать записи:

   | Имя | Тип | Значение |
   | --- | --- | --- |
   | `@` | `A` | `185.199.108.153` |
   | `@` | `A` | `185.199.109.153` |
   | `@` | `A` | `185.199.110.153` |
   | `@` | `A` | `185.199.111.153` |
   | `www` | `CNAME` | `OWNER.github.io.` |

   Для `www` не добавлять `/REPO`, не делать CNAME на `example.ru` и не оставлять конкурирующие записи. Удалить старые `A`/`AAAA`/переадресацию для `@` и лишние записи для `www`, если они конфликтуют. `AAAA` необязательны; если включаете IPv6, брать актуальные адреса из документации GitHub и сохранять `A`. Не создавать wildcard `*`. Если в зоне есть `CAA`, он должен разрешать `letsencrypt.org`.
5. Дождаться публичного обновления DNS. В Pages GitHub проверит DNS и **сам запросит сертификат Let's Encrypt**, установит его и будет обслуживать TLS. Не покупать отдельный SSL, не запускать Certbot, не загружать `.pem` или приватный ключ в репозиторий.
6. Когда рядом с Custom domain появится успешная проверка и станет доступен переключатель, включить **Enforce HTTPS**. У GitHub этот переключатель может появиться с задержкой до 24 часов после изменения DNS.

Для публикации через **GitHub Actions** файл `CNAME` в артефакте не обязателен и GitHub не использует его вместо значения `Settings → Pages → Custom domain`. При публикации **из ветки** `CNAME` хранится в корне публикуемого каталога и содержит ровно `example.ru` одной строкой.

## Проверка — сертификат действительно работает

```bash
dig +short NS example.ru
dig +short A example.ru
dig +short CNAME www.example.ru
dig +short CAA example.ru

curl -sS -o /dev/null \
  -w 'HTTP=%{http_code} redirect=%{redirect_url}\n' \
  http://example.ru/

curl -sS -o /dev/null \
  -w 'HTTPS=%{http_code} tls_verify=%{ssl_verify_result}\n' \
  https://example.ru/

curl -sS -o /dev/null \
  -w 'WWW=%{http_code} redirect=%{redirect_url} tls_verify=%{ssl_verify_result}\n' \
  https://www.example.ru/

openssl s_client -connect example.ru:443 -servername example.ru </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName

gh api repos/OWNER/REPO/pages \
  --jq '{status,cname,https_enforced,build_type,html_url}'
```

Готово, когда четыре `A` указывают на GitHub Pages, `www` ведёт на `OWNER.github.io`, `http://example.ru/` перенаправляет на `https://example.ru/`, HTTPS возвращает `200` и `tls_verify=0`, а SAN сертификата содержит **`example.ru` и `www.example.ru`**. В Pages API ожидаются `cname=example.ru`, `https_enforced=true`, `status=built` и нужный `build_type`. Проверить также несколько настоящих страниц и статические ресурсы, не только главную.

## Если сертификат не появился

1. Сверить `dig` с таблицей и убедиться, что редактировалась **авторитетная** DNS-зона; изменения DNS могут распространяться до 24 часов.
2. Убедиться, что в Pages сохранён ровно `example.ru`, а домен не занят другим репозиторием. Проверить конфликтующие `A`/`AAAA`/`ALIAS`/`ANAME`, `CNAME`, wildcard и `CAA`.
3. Если DNS уже верен, а Pages всё ещё показывает `Certificate not yet created`, удалить Custom domain в **новом** репозитории, сохранить и добавить его снова. Это перезапускает выдачу сертификата; делать только после исправления DNS.
4. При `ERR_CERT_COMMON_NAME_INVALID` смотреть SAN через `openssl`: браузер получает сертификат не для открытого имени. Не отключать проверку TLS и не считать HTTP `200` доказательством исправного сертификата.
5. Если сертификат правильный, но браузер пишет «Не защищено», проверить mixed content: изображения, скрипты и стили не должны загружаться через `http://`.

Для домена на REG.RU меняются **DNS-записи**, а не установка сертификата в панели REG.RU: сертификатом здесь управляет GitHub Pages. Если NS указывает на другого провайдера, записи нужно менять у него.

## Источники и проверенный пример

- [GitHub: подключение пользовательского домена и DNS](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub: HTTPS, автоматическая выдача сертификата и диагностика](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [GitHub: устранение ошибок пользовательского домена](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)
- Рабочий пример: [`hosting-tls-playbook-2026-08-13.md`](hosting-tls-playbook-2026-08-13.md). Не копировать оттуда `krepitv.ru` или `jimbokl.github.io` в новый проект.
