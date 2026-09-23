# Component map

- `data/internal_visual_pages.json`: явный пул из 100 ID, одиннадцать тематических групп, метаданные изображения и безопасная подпись.
- `web/src/lib/internalVisualPages.mjs`: lookup группы для React.
- `web/src/pages/SeoPage.jsx`: общий верхний визуальный блок и три конкретных шага для guide-страниц; существующие мастера и таблицы остаются ниже.
- `crates/sitegen/src/main.rs`: та же картинка, подпись, CTA и шаги в статическом HTML до гидратации.
- `web/src/styles.css`: адаптивный компонент, не затрагивающий глобальные токены.
- `scripts/qa/verify-internal-visual-pages.mjs`: контроль размера когорты, покрытия URL и артефактов.
- `product-docs/design-references/internal-visual-2026-09-23/`: происхождение восьми фото и ограничения.
