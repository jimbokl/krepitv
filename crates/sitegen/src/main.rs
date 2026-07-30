use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize, Serialize)]
struct TvModel {
    id: String,
    brand: String,
    model: String,
    title: String,
    diagonal_inches: f64,
    weight_kg: f64,
    width_mm: f64,
    height_mm: f64,
    depth_mm: f64,
    vesa_width_mm: u32,
    vesa_height_mm: u32,
    source_url: String,
    source_label: String,
    checked_at: String,
}

#[derive(Debug, Serialize)]
struct SearchItem<'a> {
    id: &'a str,
    title: &'a str,
    brand: &'a str,
    model: &'a str,
    href: String,
    search: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct SeoPage {
    id: String,
    path: String,
    kind: String,
    title: String,
    description: String,
    h1: String,
    lead: String,
    facts: Vec<String>,
    faq: Vec<(String, String)>,
}

#[derive(Debug, Deserialize, Serialize)]
struct TrustPage {
    id: String,
    path: String,
    title: String,
    description: String,
    kicker: String,
    h1: String,
    lead: String,
    updated_at: String,
    sections: Vec<TrustSection>,
    related_links: Vec<TrustLink>,
}

#[derive(Debug, Deserialize, Serialize)]
struct TrustSection {
    heading: String,
    paragraphs: Vec<String>,
    bullets: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct TrustLink {
    href: String,
    label: String,
}

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> T {
    let content = fs::read_to_string(path)
        .unwrap_or_else(|error| panic!("Не удалось прочитать {}: {error}", path.display()));
    serde_json::from_str(&content)
        .unwrap_or_else(|error| panic!("Некорректный JSON {}: {error}", path.display()))
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn html_shell(
    title: &str,
    description: &str,
    canonical: &str,
    page_kind: &str,
    model_id: Option<&str>,
    static_body: Option<&str>,
) -> String {
    let title = escape_html(title);
    let description = escape_html(description);
    let canonical = escape_html(canonical);
    let model_attribute = model_id
        .map(|id| format!(" data-model-id=\"{}\"", escape_html(id)))
        .unwrap_or_default();
    let static_body = static_body.unwrap_or_default();
    format!(
        "<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>{title}</title>\n<meta name=\"description\" content=\"{description}\">\n<link rel=\"canonical\" href=\"{canonical}\">\n<meta property=\"og:locale\" content=\"ru_RU\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:title\" content=\"{title}\">\n<meta property=\"og:description\" content=\"{description}\">\n<meta property=\"og:url\" content=\"{canonical}\">\n<meta name=\"theme-color\" content=\"#F7F5F0\">\n</head>\n<body>\n<div id=\"root\" data-page-kind=\"{page_kind}\"{model_attribute}>{static_body}</div>\n<script type=\"module\" src=\"/src/main.jsx\"></script>\n</body>\n</html>\n"
    )
}

fn static_header() -> &'static str {
    "<header class=\"border-b-2 border-ink bg-paper\"><div class=\"mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-8\"><a class=\"font-display text-xl font-extrabold\" href=\"/\">KREPI TV</a><nav class=\"flex flex-wrap gap-5 font-display text-sm font-bold uppercase\" aria-label=\"Основная навигация\"><a href=\"/podbor/\">Подбор</a><a href=\"/vesa/\">VESA</a><a href=\"/metodika/\">Методика</a></nav></div></header>"
}

fn static_footer() -> &'static str {
    "<footer class=\"border-t-2 border-ink bg-paper\"><nav class=\"mx-auto flex max-w-[1440px] flex-wrap gap-6 px-5 py-7 font-display text-sm font-bold uppercase sm:px-8\" aria-label=\"Информация о сервисе\"><a href=\"/o-proekte/\">О проекте</a><a href=\"/metodika/\">Методика</a><a href=\"/kontakty/\">Контакты</a><a href=\"/politika-konfidencialnosti/\">Конфиденциальность</a></nav></footer>"
}

fn static_layout(content: &str) -> String {
    format!(
        "{}<main class=\"min-h-screen bg-paper text-ink\">{content}</main>{}",
        static_header(),
        static_footer(),
    )
}

fn home_page_body(models: &[TvModel]) -> String {
    let model_links = models
        .iter()
        .map(|tv| {
            format!(
                "<a class=\"border border-line bg-white p-5\" href=\"/modeli/{}/\"><strong class=\"font-display text-xl\">{}</strong><span class=\"mt-2 block text-sm text-muted\">VESA {}×{} мм · {}″ · {} кг без подставки</span></a>",
                escape_html(&tv.id),
                escape_html(&tv.title),
                tv.vesa_width_mm,
                tv.vesa_height_mm,
                tv.diagonal_inches,
                tv.weight_kg,
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    static_layout(&format!(
        "<div class=\"mx-auto max-w-[1440px] px-5 pb-16 pt-8 sm:px-8\"><header class=\"border-b-2 border-ink pb-8\"><p class=\"font-mono text-xs uppercase text-action\">Независимый технический подбор</p><h1 class=\"mt-3 max-w-[1100px] font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold uppercase leading-[0.92]\">Кронштейн для вашего телевизора</h1><p class=\"mt-6 max-w-3xl text-lg leading-relaxed text-muted\">Введите точную модель: KREPI TV сверит VESA, диагональ и массу с характеристиками кронштейнов. Расчёт выполняется локально в браузере, а материал стены и крепёж всегда проверяются отдельно.</p><a class=\"primary-button mt-6\" href=\"/podbor/\">Начать подбор</a></header><section class=\"py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Модели с проверенными источниками</h2><div class=\"mt-5 grid gap-3 sm:grid-cols-2\">{model_links}</div></section><section class=\"border-t border-line py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Что даёт сервис без покупки</h2><ul class=\"mt-5 grid gap-3 text-base leading-relaxed sm:grid-cols-2\"><li>Точный VESA конкретной модели телевизора.</li><li>Проверку массы с запасом нагрузки 25%.</li><li>Калькулятор центра, нижнего и верхнего края экрана.</li><li>Ссылки на официальные источники характеристик.</li></ul></section></div>"
    ))
}

fn matcher_page_body(models: &[TvModel]) -> String {
    let model_links = models
        .iter()
        .map(|tv| {
            format!(
                "<li><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/modeli/{}/\">{}</a> — VESA {}×{}, масса {} кг</li>",
                escape_html(&tv.id),
                escape_html(&tv.title),
                tv.vesa_width_mm,
                tv.vesa_height_mm,
                tv.weight_kg,
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    static_layout(&format!(
        "<div class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Локальная проверка совместимости</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Подбор кронштейна по модели телевизора</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Выберите точную модель, затем укажите основание стены и нужный механизм. Сервис проверит VESA, диапазон диагоналей и запас нагрузки; решение о крепеже принимается после осмотра стены.</p><h2 class=\"mt-10 font-display text-3xl font-extrabold\">Проверенные модели</h2><ul class=\"mt-5 space-y-4 border-y border-line py-5\">{model_links}</ul><p class=\"mt-8\"><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Как устроена проверка и где её границы</a></p></div>"
    ))
}

fn model_page_body(tv: &TvModel) -> String {
    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенная модель</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Кронштейн для {title}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Сначала сопоставьте монтажные отверстия VESA и массу телевизора, затем проверьте стену, крепёж, доступ к разъёмам и геометрию монтажной пластины.</p><dl class=\"mt-8 grid gap-4 border-y-2 border-ink py-6 sm:grid-cols-3\"><div><dt class=\"font-mono text-xs uppercase text-muted\">VESA</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{vesa_w}×{vesa_h} мм</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{diagonal}″</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Масса без подставки</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{weight} кг</dd></div></dl><section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Размеры корпуса</h2><p class=\"mt-3 text-lg text-muted\">{width}×{height}×{depth} мм без подставки. Для безопасного подбора нагрузка кронштейна должна иметь запас не менее 25% относительно указанной массы.</p><a class=\"mt-5 inline-flex font-semibold text-technical underline underline-offset-4\" href=\"{source}\" rel=\"noreferrer\">Официальный источник: {source_label}</a></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Что сервис не подтверждает автоматически</h2><p class=\"mt-3 text-lg leading-relaxed text-muted\">Состояние стены, тип анкеров, скрытую проводку, перекрытие разъёмов и положение VESA относительно геометрического центра экрана необходимо проверить на месте.</p><a class=\"mt-5 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Открыть полную методику</a></section></article>",
        title = escape_html(&tv.title),
        vesa_w = tv.vesa_width_mm,
        vesa_h = tv.vesa_height_mm,
        diagonal = tv.diagonal_inches,
        weight = tv.weight_kg,
        width = tv.width_mm,
        height = tv.height_mm,
        depth = tv.depth_mm,
        source = escape_html(&tv.source_url),
        source_label = escape_html(&tv.source_label),
    ))
}

fn seo_page_body(page: &SeoPage) -> String {
    let facts = page
        .facts
        .iter()
        .map(|fact| format!("<li>{}</li>", escape_html(fact)))
        .collect::<Vec<_>>()
        .join("\n");
    let faq = page
        .faq
        .iter()
        .map(|(question, answer)| {
            format!(
                "<section class=\"border-t border-line py-5\"><h3 class=\"font-display text-xl font-extrabold\">{}</h3><p class=\"mt-2 leading-relaxed text-muted\">{}</p></section>",
                escape_html(question),
                escape_html(answer),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let calculator_note = if page.kind == "calculator" {
        "<section class=\"border-y-2 border-ink py-7\"><h2 class=\"font-display text-3xl font-extrabold\">Калькулятор высоты установки</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Интерактивный расчёт учитывает диагональ экрана, высоту глаз, расстояние просмотра, вертикальный угол, высоту мебели и обязательный зазор.</p></section>"
    } else {
        ""
    };

    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Технический справочник</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">{h1}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">{lead}</p><section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Что проверить</h2><ul class=\"mt-5 space-y-3 border-l-2 border-action pl-5 text-lg leading-relaxed\">{facts}</ul></section>{calculator_note}<section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Частые вопросы</h2><div class=\"mt-5 border-b border-line\">{faq}</div></section><p class=\"border-t-2 border-ink pt-7\"><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/podbor/\">Проверить точную модель телевизора</a></p></article>",
        h1 = escape_html(&page.h1),
        lead = escape_html(&page.lead),
    ))
}

fn trust_page_body(page: &TrustPage) -> String {
    let sections = page
        .sections
        .iter()
        .map(|section| {
            let paragraphs = section
                .paragraphs
                .iter()
                .map(|paragraph| format!("<p>{}</p>", escape_html(paragraph)))
                .collect::<Vec<_>>()
                .join("\n");
            let bullets = if section.bullets.is_empty() {
                String::new()
            } else {
                let items = section
                    .bullets
                    .iter()
                    .map(|item| format!("<li>{}</li>", escape_html(item)))
                    .collect::<Vec<_>>()
                    .join("\n");
                format!("<ul class=\"space-y-3 border-l-2 border-action pl-5 text-ink\">{items}</ul>")
            };
            format!(
                "<section class=\"border-b border-line pb-9\"><h2 class=\"font-display text-3xl font-extrabold leading-tight sm:text-4xl\">{}</h2><div class=\"mt-5 space-y-4 text-base leading-relaxed text-muted sm:text-lg\">{paragraphs}{bullets}</div></section>",
                escape_html(&section.heading),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let related_links = page
        .related_links
        .iter()
        .map(|link| {
            format!(
                "<a class=\"flex min-h-12 items-center border-t border-line py-3 font-display font-bold\" href=\"{}\">{}</a>",
                escape_html(&link.href),
                escape_html(&link.label),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        "<header class=\"border-b-2 border-ink bg-paper\"><div class=\"mx-auto max-w-[1440px] px-5 py-4 sm:px-8\"><a class=\"font-display text-xl font-extrabold\" href=\"/\">KREPI TV</a></div></header><main class=\"min-h-screen bg-paper text-ink\"><article class=\"mx-auto max-w-[1440px] px-5 pb-16 pt-6 sm:px-8\"><nav class=\"font-mono text-xs text-muted\" aria-label=\"Навигационная цепочка\"><a href=\"/\">Главная</a> / {h1}</nav><header class=\"mt-5 border-b-2 border-ink pb-7\"><p class=\"font-mono text-xs uppercase tracking-[0.12em] text-action\">{kicker}</p><h1 class=\"mt-3 max-w-[1180px] font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold leading-[0.92]\">{h1}</h1><p class=\"mt-6 max-w-[1000px] text-lg leading-relaxed text-muted sm:text-xl\">{lead}</p><p class=\"mt-5 font-mono text-xs text-muted\">Актуально на {updated_at}</p></header><div class=\"grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_22rem]\"><div class=\"max-w-4xl space-y-10\">{sections}</div><aside class=\"border border-line bg-white p-6\"><h2 class=\"font-display text-2xl font-extrabold\">Полезные разделы</h2><nav class=\"mt-4 grid\" aria-label=\"Связанные разделы\">{related_links}</nav></aside></div></article></main><footer class=\"border-t-2 border-ink bg-paper\"><nav class=\"mx-auto flex max-w-[1440px] flex-wrap gap-6 px-5 py-7 font-display text-sm font-bold uppercase sm:px-8\" aria-label=\"Информация о сервисе\"><a href=\"/o-proekte/\">О проекте</a><a href=\"/metodika/\">Методика</a><a href=\"/kontakty/\">Контакты</a><a href=\"/politika-konfidencialnosti/\">Конфиденциальность</a></nav></footer>",
        h1 = escape_html(&page.h1),
        kicker = escape_html(&page.kicker),
        lead = escape_html(&page.lead),
        updated_at = escape_html(&page.updated_at),
    )
}

fn write(path: &Path, content: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .unwrap_or_else(|error| panic!("Не удалось создать {}: {error}", parent.display()));
    }
    fs::write(path, content)
        .unwrap_or_else(|error| panic!("Не удалось записать {}: {error}", path.display()));
}

fn validate_models(models: &[TvModel]) {
    let mut ids = HashSet::new();
    for tv in models {
        assert!(
            ids.insert(&tv.id),
            "Повторяется идентификатор модели {}",
            tv.id
        );
        assert!(
            tv.source_url.starts_with("https://"),
            "Источник должен использовать HTTPS"
        );
        assert!(
            tv.weight_kg > 0.0 && tv.diagonal_inches > 0.0,
            "Некорректные характеристики {}",
            tv.id
        );
        assert!(
            tv.vesa_width_mm > 0 && tv.vesa_height_mm > 0,
            "Не указан VESA для {}",
            tv.id
        );
    }
}

fn validate_seo_pages(pages: &[SeoPage]) {
    let mut ids = HashSet::new();
    let mut paths = HashSet::new();
    for page in pages {
        assert!(
            ids.insert(&page.id),
            "Повторяется идентификатор SEO-страницы {}",
            page.id
        );
        assert!(
            paths.insert(&page.path),
            "Повторяется путь SEO-страницы {}",
            page.path
        );
        assert!(
            page.path.starts_with('/') && page.path.ends_with('/'),
            "Путь должен начинаться и заканчиваться косой чертой: {}",
            page.path
        );
        assert!(
            page.facts.len() >= 3,
            "Недостаточно полезных фактов на {}",
            page.path
        );
        assert!(page.faq.len() >= 3, "Недостаточно ответов на {}", page.path);
    }
}

fn validate_trust_pages(pages: &[TrustPage]) {
    let mut ids = HashSet::new();
    let mut paths = HashSet::new();
    for page in pages {
        assert!(
            ids.insert(&page.id),
            "Повторяется идентификатор доверительной страницы {}",
            page.id
        );
        assert!(
            paths.insert(&page.path),
            "Повторяется путь доверительной страницы {}",
            page.path
        );
        assert!(
            page.path.starts_with('/') && page.path.ends_with('/'),
            "Путь должен начинаться и заканчиваться косой чертой: {}",
            page.path
        );
        assert!(
            !page.sections.is_empty(),
            "Нет содержимого на {}",
            page.path
        );
        assert!(
            page.related_links.len() >= 2,
            "Недостаточно внутренних ссылок на {}",
            page.path
        );
    }
}

fn main() {
    let root = workspace_root();
    let data = root.join("data");
    let web = root.join("web");
    let public_data = web.join("public/data");
    fs::create_dir_all(&public_data).expect("Не удалось создать каталог публичных данных");

    let models: Vec<TvModel> = read_json(&data.join("tv_models.json"));
    let seo_pages: Vec<SeoPage> = read_json(&data.join("seo_pages.json"));
    let trust_pages: Vec<TrustPage> = read_json(&data.join("trust_pages.json"));
    validate_models(&models);
    validate_seo_pages(&seo_pages);
    validate_trust_pages(&trust_pages);

    fs::copy(
        data.join("tv_models.json"),
        public_data.join("tv-models.json"),
    )
    .expect("Не удалось скопировать модели телевизоров");
    fs::copy(data.join("mounts.json"), public_data.join("mounts.json"))
        .expect("Не удалось скопировать кронштейны");
    fs::copy(
        data.join("seo_pages.json"),
        public_data.join("seo-pages.json"),
    )
    .expect("Не удалось скопировать SEO-страницы");
    fs::copy(
        data.join("trust_pages.json"),
        public_data.join("trust-pages.json"),
    )
    .expect("Не удалось скопировать доверительные страницы");

    let search = models
        .iter()
        .map(|tv| SearchItem {
            id: &tv.id,
            title: &tv.title,
            brand: &tv.brand,
            model: &tv.model,
            href: format!("/modeli/{}/", tv.id),
            search: format!("{} {} {}", tv.brand, tv.model, tv.title).to_lowercase(),
        })
        .collect::<Vec<_>>();
    write(
        &public_data.join("model-search.json"),
        &serde_json::to_string_pretty(&search).expect("Индекс поиска сериализуется"),
    );

    write(
        &web.join("index.html"),
        &html_shell(
            "Подбор кронштейна по модели телевизора — KREPI TV",
            "Проверьте VESA, массу, диагональ и высоту установки для точной модели телевизора. Расчёт работает локально в браузере.",
            "https://krepitv.ru/",
            "home",
            None,
            Some(&home_page_body(&models)),
        ),
    );

    write(
        &web.join("podbor/index.html"),
        &html_shell(
            "Подбор кронштейна по модели телевизора — KREPI TV",
            "Укажите точную модель телевизора, тип стены и нужный механизм. Проверим VESA и запас нагрузки.",
            "https://krepitv.ru/podbor/",
            "matcher",
            None,
            Some(&matcher_page_body(&models)),
        ),
    );

    for tv in &models {
        let title = format!(
            "Кронштейн для {}: VESA {}×{} — KREPI TV",
            tv.title, tv.vesa_width_mm, tv.vesa_height_mm
        );
        let description = format!(
            "Совместимые кронштейны для {}: VESA {}×{}, масса без подставки {} кг. Проверка по данным производителя.",
            tv.title, tv.vesa_width_mm, tv.vesa_height_mm, tv.weight_kg
        );
        let static_body = model_page_body(tv);
        write(
            &web.join(format!("modeli/{}/index.html", tv.id)),
            &html_shell(
                &title,
                &description,
                &format!("https://krepitv.ru/modeli/{}/", tv.id),
                "model",
                Some(&tv.id),
                Some(&static_body),
            ),
        );
    }

    for page in &seo_pages {
        let relative = page.path.trim_matches('/');
        let static_body = seo_page_body(page);
        write(
            &web.join(relative).join("index.html"),
            &html_shell(
                &page.title,
                &page.description,
                &format!("https://krepitv.ru{}", page.path),
                "seo",
                Some(&page.id),
                Some(&static_body),
            ),
        );
    }

    for page in &trust_pages {
        let relative = page.path.trim_matches('/');
        let static_body = trust_page_body(page);
        write(
            &web.join(relative).join("index.html"),
            &html_shell(
                &page.title,
                &page.description,
                &format!("https://krepitv.ru{}", page.path),
                "trust",
                Some(&page.id),
                Some(&static_body),
            ),
        );
    }

    let mut urls = vec![
        "https://krepitv.ru/".to_string(),
        "https://krepitv.ru/podbor/".to_string(),
    ];
    urls.extend(
        models
            .iter()
            .map(|tv| format!("https://krepitv.ru/modeli/{}/", tv.id)),
    );
    urls.extend(
        seo_pages
            .iter()
            .map(|page| format!("https://krepitv.ru{}", page.path)),
    );
    urls.extend(
        trust_pages
            .iter()
            .map(|page| format!("https://krepitv.ru{}", page.path)),
    );
    let sitemap_urls = urls
        .iter()
        .map(|url| {
            format!(
                "  <url><loc>{}</loc><lastmod>2026-07-30</lastmod></url>",
                escape_html(url)
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    write(
        &web.join("public/sitemap.xml"),
        &format!(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n{sitemap_urls}\n</urlset>\n"
        ),
    );
    write(
        &web.join("public/robots.txt"),
        "User-agent: *\nAllow: /\n\nSitemap: https://krepitv.ru/sitemap.xml\n",
    );

    println!("Сгенерировано страниц: {}", urls.len());
}

#[cfg(test)]
mod tests {
    use super::escape_html;

    #[test]
    fn escapes_html_attributes() {
        assert_eq!(
            escape_html("<ТВ & \"стена\">"),
            "&lt;ТВ &amp; &quot;стена&quot;&gt;"
        );
    }
}
