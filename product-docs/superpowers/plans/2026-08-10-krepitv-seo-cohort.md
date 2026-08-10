# KREPI TV SEO-когорта 2026-08-10 — план реализации

**Цель:** выпустить десять evidence-backed SSR-руководств как одну проверяемую когорту.

**Архитектура:** `data/seo_pages.json` → Rust sitegen → статический SSR → React-гидратация существующего `SeoEvidenceGuide`; `scripts/verify.mjs` проверяет artifact, sitemap и funnel.

1. Сохранить Wordstat-срез и датированный manifest с решениями по каннибализации.
2. Добавить датированную когорту в Rust/Node до контента и подтвердить RED на отсутствующем canonical.
3. Добавить 10 страниц: 6 фактов, 6 FAQ, 3 ветки, stop, 2–3 первичных источника.
4. Замкнуть related-граф без изменения контрактных ссылок старых страниц.
5. Выполнить полный build, drift scan и screenshots 320/768/1440.
6. Закоммитить source + artifact, push в `main`, проверить Pages/HTTPS/sitemap и отправить IndexNow только 10 canonical.
