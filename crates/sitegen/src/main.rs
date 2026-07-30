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
) -> String {
    let title = escape_html(title);
    let description = escape_html(description);
    let canonical = escape_html(canonical);
    let model_attribute = model_id
        .map(|id| format!(" data-model-id=\"{}\"", escape_html(id)))
        .unwrap_or_default();
    format!(
        "<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>{title}</title>\n<meta name=\"description\" content=\"{description}\">\n<link rel=\"canonical\" href=\"{canonical}\">\n<meta property=\"og:locale\" content=\"ru_RU\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:title\" content=\"{title}\">\n<meta property=\"og:description\" content=\"{description}\">\n<meta property=\"og:url\" content=\"{canonical}\">\n<meta name=\"theme-color\" content=\"#F7F5F0\">\n</head>\n<body>\n<div id=\"root\" data-page-kind=\"{page_kind}\"{model_attribute}></div>\n<script type=\"module\" src=\"/src/main.jsx\"></script>\n</body>\n</html>\n"
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
        assert!(ids.insert(&page.id), "Повторяется идентификатор SEO-страницы {}", page.id);
        assert!(paths.insert(&page.path), "Повторяется путь SEO-страницы {}", page.path);
        assert!(
            page.path.starts_with('/') && page.path.ends_with('/'),
            "Путь должен начинаться и заканчиваться косой чертой: {}",
            page.path
        );
        assert!(page.facts.len() >= 3, "Недостаточно полезных фактов на {}", page.path);
        assert!(page.faq.len() >= 3, "Недостаточно ответов на {}", page.path);
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
    validate_models(&models);
    validate_seo_pages(&seo_pages);

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
        &web.join("podbor/index.html"),
        &html_shell(
            "Подбор кронштейна по модели телевизора — KREPI TV",
            "Укажите точную модель телевизора, тип стены и нужный механизм. Проверим VESA и запас нагрузки.",
            "https://krepitv.ru/podbor/",
            "matcher",
            None,
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
        write(
            &web.join(format!("modeli/{}/index.html", tv.id)),
            &html_shell(
                &title,
                &description,
                &format!("https://krepitv.ru/modeli/{}/", tv.id),
                "model",
                Some(&tv.id),
            ),
        );
    }

    for page in &seo_pages {
        let relative = page.path.trim_matches('/');
        write(
            &web.join(relative).join("index.html"),
            &html_shell(
                &page.title,
                &page.description,
                &format!("https://krepitv.ru{}", page.path),
                "seo",
                Some(&page.id),
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
