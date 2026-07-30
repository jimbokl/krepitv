use krepitv_engine::{Mount, MountMatch, match_mounts};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_AFFILIATE_AGE_SECONDS: i64 = 48 * 60 * 60;
const AFFILIATE_FUTURE_TOLERANCE_SECONDS: i64 = 5 * 60;
const AFFILIATE_LINK_REL: &str = "sponsored nofollow noopener noreferrer";

#[derive(Debug, Deserialize, Serialize)]
struct TvModel {
    id: String,
    brand: String,
    model: String,
    title: String,
    series: String,
    model_year: u32,
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

#[derive(Debug, Serialize)]
struct CompatibilityEdge {
    tv_id: String,
    mount_id: String,
    fit_status: String,
    compatible: bool,
    score: i32,
    reasons: Vec<String>,
    warnings: Vec<String>,
    required_load_kg: f64,
}

#[derive(Debug, Deserialize, Serialize)]
struct SeoPage {
    id: String,
    path: String,
    kind: String,
    indexable: bool,
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

#[derive(Debug, Deserialize)]
struct PublicAffiliateSnapshot {
    schema_version: u32,
    generated_at: String,
    offers: Vec<PublicAffiliateOffer>,
}

#[derive(Debug, Deserialize)]
struct PublicAffiliateOffer {
    id: String,
    market_source_url: String,
    page_path: String,
    entity_kind: String,
    entity_id: String,
    compliance_mode: String,
    clid: String,
    vid: String,
    affiliate_href: String,
    page_name: String,
    title: String,
    product_photo: String,
    checked_at: String,
    eligibility: String,
    publishable: bool,
    creative: Option<AffiliateCreative>,
}

#[derive(Debug, Deserialize)]
struct AffiliateCreative {
    erid: String,
    disclosure: AffiliateDisclosure,
}

#[derive(Debug, Deserialize)]
struct AffiliateDisclosure {
    label: String,
    advertiser_name: String,
    advertiser_inn: String,
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

fn is_valid_iso_date(value: &str) -> bool {
    if value.len() != 10 {
        return false;
    }
    let mut parts = value.split('-');
    let (Some(year), Some(month), Some(day), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return false;
    };
    if year.len() != 4 || month.len() != 2 || day.len() != 2 {
        return false;
    }
    let (Ok(year), Ok(month), Ok(day)) = (
        year.parse::<u32>(),
        month.parse::<u32>(),
        day.parse::<u32>(),
    ) else {
        return false;
    };
    let leap = year % 400 == 0 || (year % 4 == 0 && year % 100 != 0);
    let maximum = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return false,
    };
    (1..=maximum).contains(&day)
}

fn unix_now_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Системное время не должно быть раньше Unix epoch")
        .as_secs() as i64
}

fn parse_rfc3339_utc_seconds(value: &str) -> Option<i64> {
    if value.len() < 20 || !value.ends_with('Z') {
        return None;
    }
    let bytes = value.as_bytes();
    if bytes.get(10) != Some(&b'T') || bytes.get(13) != Some(&b':') || bytes.get(16) != Some(&b':')
    {
        return None;
    }
    let date = value.get(..10)?;
    if !is_valid_iso_date(date) {
        return None;
    }
    let year = date.get(..4)?.parse::<i64>().ok()?;
    let month = date.get(5..7)?.parse::<i64>().ok()?;
    let day = date.get(8..10)?.parse::<i64>().ok()?;
    let hour = value.get(11..13)?.parse::<i64>().ok()?;
    let minute = value.get(14..16)?.parse::<i64>().ok()?;
    let second = value.get(17..19)?.parse::<i64>().ok()?;
    if hour > 23 || minute > 59 || second > 59 {
        return None;
    }
    let fractional = value.get(19..value.len() - 1)?;
    if !fractional.is_empty()
        && (!fractional.starts_with('.')
            || fractional.len() == 1
            || !fractional[1..].bytes().all(|byte| byte.is_ascii_digit()))
    {
        return None;
    }

    Some(days_from_civil(year, month, day) * 86_400 + hour * 3_600 + minute * 60 + second)
}

// Howard Hinnant's civil-calendar conversion, shifted to Unix epoch.
fn days_from_civil(mut year: i64, month: i64, day: i64) -> i64 {
    year -= i64::from(month <= 2);
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let month_prime = month + if month > 2 { -3 } else { 9 };
    let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

fn https_url_parts<'a>(value: &'a str, origin: &str) -> Option<(&'a str, &'a str)> {
    if value.contains('#') {
        return None;
    }
    let remainder = value.strip_prefix(origin)?;
    if !remainder.starts_with('/') || remainder.starts_with("//") {
        return None;
    }
    Some(remainder.split_once('?').unwrap_or((remainder, "")))
}

fn query_value_count(query: &str, key: &str, expected: Option<&str>) -> usize {
    query
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .filter(|(candidate_key, value)| {
            *candidate_key == key && expected.is_none_or(|expected| *value == expected)
        })
        .count()
}

fn is_fresh_affiliate_offer(offer: &PublicAffiliateOffer, now_seconds: i64) -> bool {
    let Some(checked_at) = parse_rfc3339_utc_seconds(&offer.checked_at) else {
        return false;
    };
    let age = now_seconds - checked_at;
    (-AFFILIATE_FUTURE_TOLERANCE_SECONDS..=MAX_AFFILIATE_AGE_SECONDS).contains(&age)
}

fn is_publishable_affiliate_offer(offer: &PublicAffiliateOffer, now_seconds: i64) -> bool {
    if !offer.publishable
        || offer.eligibility != "publishable"
        || !is_fresh_affiliate_offer(offer, now_seconds)
        || offer.entity_kind != "mount"
        || offer.page_path != format!("/kronshteyny/{}/", offer.entity_id)
        || offer.page_name != "POKUPKI_PRODUCT"
        || offer.title.trim().is_empty()
        || !(5..=20).contains(&offer.clid.len())
        || !offer.clid.bytes().all(|byte| byte.is_ascii_digit())
        || offer.vid.is_empty()
        || offer.vid.len() > 150
        || !offer.vid.bytes().all(|byte| byte.is_ascii_alphanumeric())
    {
        return false;
    }

    let Some((destination_path, destination_query)) =
        https_url_parts(&offer.affiliate_href, "https://market.yandex.ru")
    else {
        return false;
    };
    let Some((source_path, _)) =
        https_url_parts(&offer.market_source_url, "https://market.yandex.ru")
    else {
        return false;
    };
    if destination_path != source_path
        || https_url_parts(&offer.product_photo, "https://avatars.mds.yandex.net").is_none()
        || query_value_count(destination_query, "clid", Some(&offer.clid)) != 1
        || query_value_count(destination_query, "vid", Some(&offer.vid)) != 1
        || query_value_count(destination_query, "distr_type", Some("7")) != 1
        || query_value_count(destination_query, "utm_source", Some("partner_network")) != 1
        || query_value_count(destination_query, "utm_campaign", Some(&offer.clid)) != 1
    {
        return false;
    }

    match (offer.compliance_mode.as_str(), &offer.creative) {
        ("advertising", Some(creative)) => {
            !creative.erid.is_empty()
                && creative.disclosure.label == "Реклама"
                && creative.disclosure.advertiser_name == "ООО «Яндекс Маркет»"
                && creative.disclosure.advertiser_inn == "9704254424"
                && query_value_count(destination_query, "erid", Some(&creative.erid)) == 1
        }
        ("non_ad_storefront", None) => query_value_count(destination_query, "erid", None) == 0,
        _ => false,
    }
}

fn affiliate_notice_html(offer: &PublicAffiliateOffer) -> String {
    match &offer.creative {
        Some(creative) => format!(
            "<p class=\"font-mono text-[0.68rem] uppercase leading-relaxed text-muted\">{} · {} · ИНН {} · erid: {}</p>",
            escape_html(&creative.disclosure.label),
            escape_html(&creative.disclosure.advertiser_name),
            escape_html(&creative.disclosure.advertiser_inn),
            escape_html(&creative.erid),
        ),
        None => String::new(),
    }
}

fn affiliate_offer_card_html(offer: &PublicAffiliateOffer, heading_level: u8) -> String {
    let heading = if heading_level == 3 { "h3" } else { "h2" };
    let erid_attribute = offer
        .creative
        .as_ref()
        .map(|creative| format!(" data-erid=\"{}\"", escape_html(&creative.erid)))
        .unwrap_or_default();
    let aria_label = if offer.compliance_mode == "advertising" {
        "Рекламное предложение"
    } else {
        "Партнёрское предложение"
    };

    format!(
        "<aside aria-label=\"{aria_label}\" class=\"grid gap-5 border-2 border-ink bg-white p-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center\" data-affiliate-mode=\"{mode}\" data-clid=\"{clid}\"{erid_attribute}><img alt=\"{title}\" class=\"aspect-square w-full object-contain\" height=\"300\" loading=\"lazy\" referrerpolicy=\"no-referrer\" src=\"{photo}\" width=\"300\"><div>{notice_html}<{heading} class=\"mt-2 font-display text-2xl font-extrabold\">{title}</{heading}><p class=\"mt-2 text-sm leading-relaxed text-muted\">Ссылка ведёт прямо на карточку этого кронштейна, а не на похожую модель.</p><a class=\"primary-button mt-4\" data-affiliate-offer-id=\"{offer_id}\" data-affiliate-mode=\"{mode}\" data-clid=\"{clid}\"{erid_attribute} href=\"{href}\" rel=\"{rel}\" target=\"_blank\">Проверить цену на Яндекс Маркете</a><p class=\"mt-3 text-xs leading-relaxed text-muted\">Цена и наличие уточняются на стороне Яндекс Маркета с учётом региона.</p></div></aside>",
        aria_label = escape_html(aria_label),
        mode = escape_html(&offer.compliance_mode),
        clid = escape_html(&offer.clid),
        erid_attribute = erid_attribute,
        title = escape_html(&offer.title),
        photo = escape_html(&offer.product_photo),
        notice_html = affiliate_notice_html(offer),
        heading = heading,
        offer_id = escape_html(&offer.id),
        href = escape_html(&offer.affiliate_href),
        rel = AFFILIATE_LINK_REL,
    )
}

fn is_indexable_seo_page(page: &SeoPage) -> bool {
    page.indexable
}

fn json_ld_script(value: Value) -> String {
    let json = serde_json::to_string(&value)
        .expect("Структурированные данные должны сериализоваться")
        .replace('<', "\\u003c")
        .replace('>', "\\u003e")
        .replace('&', "\\u0026");
    format!("<script type=\"application/ld+json\">{json}</script>\n")
}

fn website_json_ld() -> String {
    json_ld_script(json!({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": "https://krepitv.ru/#website",
        "url": "https://krepitv.ru/",
        "name": "KREPI TV",
        "description": "Независимый сервис проверки совместимости телевизоров и кронштейнов.",
        "inLanguage": "ru-RU"
    }))
}

fn breadcrumb_json_ld(items: &[(&str, &str)]) -> String {
    let item_list = items
        .iter()
        .enumerate()
        .map(|(index, (name, url))| {
            json!({
                "@type": "ListItem",
                "position": index + 1,
                "name": name,
                "item": url
            })
        })
        .collect::<Vec<_>>();

    json_ld_script(json!({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": item_list
    }))
}

fn tv_product_json_ld(tv: &TvModel, canonical: &str) -> String {
    json_ld_script(json!({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": tv.title,
        "sku": tv.model,
        "url": canonical,
        "category": "Телевизоры",
        "brand": { "@type": "Brand", "name": tv.brand },
        "additionalProperty": [
            { "@type": "PropertyValue", "name": "VESA", "value": format!("{}×{} мм", tv.vesa_width_mm, tv.vesa_height_mm) },
            { "@type": "PropertyValue", "name": "Серия", "value": tv.series },
            { "@type": "PropertyValue", "name": "Модельный год", "value": tv.model_year },
            { "@type": "PropertyValue", "name": "Диагональ", "value": format!("{} дюймов", tv.diagonal_inches) },
            { "@type": "PropertyValue", "name": "Масса без подставки", "value": format!("{} кг", tv.weight_kg) }
        ]
    }))
}

fn mount_product_json_ld(mount: &Mount, canonical: &str) -> String {
    json_ld_script(json!({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": mount.title,
        "sku": mount.model,
        "url": canonical,
        "category": "Кронштейны для телевизоров",
        "brand": { "@type": "Brand", "name": mount.brand },
        "additionalProperty": [
            { "@type": "PropertyValue", "name": "VESA", "value": formatted_vesa_list(mount) },
            { "@type": "PropertyValue", "name": "Максимальная нагрузка", "value": format!("{} кг", mount.max_load_kg) },
            { "@type": "PropertyValue", "name": "Диапазон диагоналей", "value": format!("{}–{} дюймов", mount.min_diagonal_in, mount.max_diagonal_in) }
        ]
    }))
}

struct HeadExtras<'a> {
    robots: Option<&'a str>,
    json_ld: &'a str,
}

fn html_shell(
    title: &str,
    description: &str,
    canonical: &str,
    page_kind: &str,
    model_id: Option<&str>,
    static_body: Option<&str>,
    head: HeadExtras<'_>,
) -> String {
    let title = escape_html(title);
    let description = escape_html(description);
    let canonical = escape_html(canonical);
    let model_attribute = model_id
        .map(|id| {
            let attribute = if page_kind == "mount" {
                "data-mount-id"
            } else {
                "data-model-id"
            };
            format!(" {attribute}=\"{}\"", escape_html(id))
        })
        .unwrap_or_default();
    let static_body = static_body.unwrap_or_default();
    let robots_meta = head
        .robots
        .map(|value| {
            format!(
                "<meta name=\"robots\" content=\"{}\">\n",
                escape_html(value)
            )
        })
        .unwrap_or_default();
    format!(
        "<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>{title}</title>\n<meta name=\"description\" content=\"{description}\">\n<link rel=\"canonical\" href=\"{canonical}\">\n{robots_meta}<meta property=\"og:locale\" content=\"ru_RU\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:title\" content=\"{title}\">\n<meta property=\"og:description\" content=\"{description}\">\n<meta property=\"og:url\" content=\"{canonical}\">\n<meta name=\"theme-color\" content=\"#F7F5F0\">\n{}</head>\n<body>\n<div id=\"root\" data-page-kind=\"{page_kind}\"{model_attribute}>{static_body}</div>\n<script type=\"module\" src=\"/src/main.jsx\"></script>\n</body>\n</html>\n",
        head.json_ld,
    )
}

fn static_header() -> &'static str {
    "<header class=\"border-b-2 border-ink bg-paper\"><div class=\"mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-8\"><a class=\"font-display text-xl font-extrabold\" href=\"/\">KREPI TV</a><nav class=\"flex flex-wrap gap-5 font-display text-sm font-bold uppercase\" aria-label=\"Основная навигация\"><a href=\"/podbor/\">Подбор</a><a href=\"/modeli/\">Телевизоры</a><a href=\"/kronshteyny/\">Кронштейны</a><a href=\"/vesa/\">VESA</a><a href=\"/metodika/\">Методика</a></nav></div></header>"
}

fn static_footer() -> &'static str {
    "<footer class=\"border-t-2 border-ink bg-paper\"><nav class=\"mx-auto flex max-w-[1440px] flex-wrap gap-6 px-5 py-7 font-display text-sm font-bold uppercase sm:px-8\" aria-label=\"Инструменты и информация о сервисе\"><a href=\"/podbor/\">Подбор</a><a href=\"/modeli/\">Телевизоры</a><a href=\"/kronshteyny/\">Кронштейны</a><a href=\"/na-kakoy-vysote-veshat-televizor/\">Высота установки</a><a href=\"/rasstoyanie-do-televizora-i-diagonal/\">Расстояние и диагональ</a><a href=\"/vesa/\">VESA</a><a href=\"/o-proekte/\">О проекте</a><a href=\"/metodika/\">Методика</a><a href=\"/kontakty/\">Контакты</a><a href=\"/politika-konfidencialnosti/\">Конфиденциальность</a></nav></footer>"
}

fn static_layout(content: &str) -> String {
    format!(
        "{}<main class=\"min-h-screen bg-paper text-ink\">{content}</main>{}",
        static_header(),
        static_footer(),
    )
}

fn brand_catalog_html(
    rows: Vec<(String, String)>,
    count_label: &str,
    list_tag: &str,
    list_class: &str,
) -> String {
    let list_tag = if list_tag == "ul" { "ul" } else { "div" };
    let mut groups: Vec<(String, Vec<String>)> = Vec::new();
    for (brand, row) in rows {
        if let Some((_, brand_rows)) = groups.iter_mut().find(|(name, _)| name == &brand) {
            brand_rows.push(row);
        } else {
            groups.push((brand, vec![row]));
        }
    }
    let groups = groups
        .into_iter()
        .map(|(brand, rows)| {
            format!(
                "<details class=\"group border-t border-line\"><summary class=\"grid min-h-16 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-action\"><span class=\"font-display text-2xl font-extrabold\">{brand}</span><span class=\"font-mono text-xs uppercase text-muted\">{count_label}: {count}</span><span class=\"text-action transition group-open:rotate-180\" aria-hidden=\"true\">⌄</span></summary><{list_tag} class=\"{list_class}\">{rows}</{list_tag}></details>",
                brand = escape_html(&brand),
                count_label = escape_html(count_label),
                count = rows.len(),
                list_class = escape_html(list_class),
                rows = rows.join("\n"),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!("<div class=\"border-b border-line\">{groups}</div>")
}

fn model_mount_matches(tv: &TvModel, mounts: &[Mount]) -> Vec<MountMatch> {
    match_mounts(
        tv.weight_kg,
        tv.diagonal_inches,
        tv.vesa_width_mm,
        tv.vesa_height_mm,
        "any",
        mounts.to_vec(),
    )
}

fn build_compatibility_graph(models: &[TvModel], mounts: &[Mount]) -> Vec<CompatibilityEdge> {
    models
        .iter()
        .flat_map(|tv| {
            model_mount_matches(tv, mounts)
                .into_iter()
                .filter(|matched| matched.compatible)
                .map(move |matched| CompatibilityEdge {
                    tv_id: tv.id.clone(),
                    mount_id: matched.mount.id,
                    fit_status: matched.fit_status,
                    compatible: matched.compatible,
                    score: matched.score,
                    reasons: matched.reasons,
                    warnings: matched.warnings,
                    required_load_kg: matched.required_load_kg,
                })
        })
        .collect()
}

fn is_indexable_model(model_id: &str, graph: &[CompatibilityEdge]) -> bool {
    graph
        .iter()
        .any(|edge| edge.tv_id == model_id && edge.fit_status == "verified-fit")
}

fn is_indexable_mount(mount_id: &str, graph: &[CompatibilityEdge]) -> bool {
    graph
        .iter()
        .any(|edge| edge.mount_id == mount_id && edge.fit_status == "verified-fit")
}

fn mechanism_label(value: &str) -> &'static str {
    match value {
        "fixed" => "фиксированный",
        "tilt" => "наклонный",
        "full-motion" => "поворотный",
        _ => "механизм не указан",
    }
}

fn fit_label(value: &str) -> &'static str {
    match value {
        "verified-fit" => "подходит по трём проверкам",
        "conditional-fit" => "подходит условно",
        _ => "не подходит",
    }
}

fn formatted_vesa_list(mount: &Mount) -> String {
    mount
        .vesa
        .iter()
        .map(|pair| pair.replace('x', "×"))
        .collect::<Vec<_>>()
        .join(" · ")
}

fn home_page_body(models: &[TvModel], seo_pages: &[SeoPage]) -> String {
    let model_links = models
        .iter()
        .map(|tv| {
            (
                tv.brand.clone(),
                format!(
                    "<a class=\"border border-line bg-white p-5\" href=\"/modeli/{}/\"><strong class=\"font-display text-xl\">{}</strong><span class=\"mt-2 block text-sm text-muted\">{} · {} · VESA {}×{} мм · {}″ · {} кг без подставки</span></a>",
                    escape_html(&tv.id),
                    escape_html(&tv.title),
                    escape_html(&tv.series),
                    tv.model_year,
                    tv.vesa_width_mm,
                    tv.vesa_height_mm,
                    tv.diagonal_inches,
                    tv.weight_kg,
                ),
            )
        })
        .collect::<Vec<_>>();
    let model_links = brand_catalog_html(
        model_links,
        "Моделей",
        "div",
        "grid gap-3 border-t border-line py-4 sm:grid-cols-2",
    );
    let seo_links = seo_pages
        .iter()
        .filter(|page| is_indexable_seo_page(page))
        .map(|page| {
            format!(
                "<a class=\"border border-line bg-white p-5 font-display text-lg font-bold\" href=\"{}\">{}</a>",
                escape_html(&page.path),
                escape_html(&page.h1),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    static_layout(&format!(
        "<div class=\"mx-auto max-w-[1440px] px-5 pb-16 pt-8 sm:px-8\"><header class=\"border-b-2 border-ink pb-8\"><p class=\"font-mono text-xs uppercase text-action\">Независимый технический подбор</p><h1 class=\"mt-3 max-w-[1100px] font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold uppercase leading-[0.92]\">Кронштейн для вашего телевизора</h1><p class=\"mt-6 max-w-3xl text-lg leading-relaxed text-muted\">Введите точную модель: KREPI TV сверит VESA, диагональ и массу с характеристиками кронштейнов. Расчёт выполняется локально в браузере, а материал стены и крепёж всегда проверяются отдельно.</p><a class=\"primary-button mt-6\" href=\"/podbor/\">Начать подбор</a></header><section class=\"py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Модели с проверенными источниками</h2><div class=\"mt-5\">{model_links}</div></section><section class=\"border-t border-line py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Что даёт сервис без покупки</h2><ul class=\"mt-5 grid gap-3 text-base leading-relaxed sm:grid-cols-2\"><li>Точный VESA конкретной модели телевизора.</li><li>Проверку массы с запасом нагрузки 25%.</li><li>Калькулятор центра, нижнего и верхнего края экрана.</li><li>Расчёт расстояния до экрана и диагонали в обе стороны.</li><li>Ссылки на официальные источники характеристик.</li></ul></section><section class=\"border-t border-line py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Справочники и калькуляторы</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Проверьте размер VESA, механизм и высоту установки до выбора конкретного кронштейна.</p><nav class=\"mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3\" aria-label=\"Справочники и калькуляторы\">{seo_links}</nav></section></div>"
    ))
}

fn matcher_page_body(models: &[TvModel]) -> String {
    let model_links = models
        .iter()
        .map(|tv| {
            (
                tv.brand.clone(),
                format!(
                    "<li><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/modeli/{}/\">{}</a> — VESA {}×{}, масса {} кг</li>",
                    escape_html(&tv.id),
                    escape_html(&tv.title),
                    tv.vesa_width_mm,
                    tv.vesa_height_mm,
                    tv.weight_kg,
                ),
            )
        })
        .collect::<Vec<_>>();
    let model_links = brand_catalog_html(
        model_links,
        "Моделей",
        "ul",
        "space-y-4 border-t border-line py-5",
    );

    static_layout(&format!(
        "<div class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Локальная проверка совместимости</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Подбор кронштейна по модели телевизора</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Выберите точную модель, затем укажите основание стены и нужный механизм. Сервис проверит VESA, диапазон диагоналей и запас нагрузки; решение о крепеже принимается после осмотра стены.</p><h2 class=\"mt-10 font-display text-3xl font-extrabold\">Проверенные модели</h2><div class=\"mt-5\">{model_links}</div><p class=\"mt-8\"><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Как устроена проверка и где её границы</a></p></div>"
    ))
}

fn models_catalog_body(models: &[TvModel]) -> String {
    let items = models
        .iter()
        .map(|tv| {
            (
                tv.brand.clone(),
                format!(
                    "<a class=\"grid gap-2 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center\" href=\"/modeli/{id}/\"><span><strong class=\"font-display text-2xl\">{title}</strong><span class=\"mt-1 block text-sm text-muted\">{series} · {year} · VESA {vesa_w}×{vesa_h} мм · {diagonal}″ · {weight} кг без подставки</span></span><span class=\"font-mono text-xs uppercase text-action\">Открыть проверку</span></a>",
                    id = escape_html(&tv.id),
                    title = escape_html(&tv.title),
                    series = escape_html(&tv.series),
                    year = tv.model_year,
                    vesa_w = tv.vesa_width_mm,
                    vesa_h = tv.vesa_height_mm,
                    diagonal = tv.diagonal_inches,
                    weight = tv.weight_kg,
                ),
            )
        })
        .collect::<Vec<_>>();
    let items = brand_catalog_html(items, "Моделей", "div", "border-b border-line");
    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенная база</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Модели телевизоров</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Точные модели с подтверждёнными VESA, массой без подставки и источником. На каждой странице показаны кронштейны, прошедшие единый Rust-расчёт.</p><nav class=\"mt-9\" aria-label=\"Модели телевизоров\">{items}</nav></article>"
    ))
}

fn mounts_catalog_body(mounts: &[Mount]) -> String {
    let items = mounts
        .iter()
        .map(|mount| {
            (
                mount.brand.clone(),
                format!(
                    "<a class=\"grid gap-2 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center\" href=\"/kronshteyny/{id}/\"><span><strong class=\"font-display text-2xl\">{title}</strong><span class=\"mt-1 block text-sm text-muted\">{mechanism} · до {load} кг · VESA: {vesa}</span></span><span class=\"font-mono text-xs uppercase text-action\">Открыть проверку</span></a>",
                    id = escape_html(&mount.id),
                    title = escape_html(&mount.title),
                    mechanism = mechanism_label(&mount.mechanism),
                    load = mount.max_load_kg,
                    vesa = escape_html(&formatted_vesa_list(mount)),
                ),
            )
        })
        .collect::<Vec<_>>();
    let items = brand_catalog_html(items, "Кронштейнов", "div", "border-b border-line");
    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенная база</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Кронштейны для телевизоров</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Точные изделия с явными парами VESA, нагрузкой, диапазоном диагоналей и датой проверки. Партнёрская кнопка появляется только у свежего подтверждённого предложения Маркета.</p><nav class=\"mt-9\" aria-label=\"Кронштейны\">{items}</nav></article>"
    ))
}

fn model_page_body(
    tv: &TvModel,
    matches: &[MountMatch],
    affiliate_offers: &[PublicAffiliateOffer],
    affiliate_now_seconds: i64,
) -> String {
    let compatible = matches
        .iter()
        .filter(|matched| matched.compatible)
        .map(|matched| {
            (
                matched.mount.brand.clone(),
                format!(
                    "<article class=\"grid gap-3 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center\"><div><h3 class=\"font-display text-2xl font-extrabold\">{title}</h3><p class=\"mt-1 text-sm text-muted\">{fit} · {mechanism} · нагрузка до {load} кг</p><p class=\"mt-2 text-sm\">{reasons}</p></div><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/kronshteyny/{id}/\">Страница кронштейна</a></article>",
                    title = escape_html(&matched.mount.title),
                    fit = fit_label(&matched.fit_status),
                    mechanism = mechanism_label(&matched.mount.mechanism),
                    load = matched.mount.max_load_kg,
                    reasons = escape_html(&matched.reasons.join(" · ")),
                    id = escape_html(&matched.mount.id),
                ),
            )
        })
        .collect::<Vec<_>>();
    let compatible = if compatible.is_empty() {
        "<p class=\"border-y border-line py-5 text-muted\">В проверенном каталоге пока нет подходящих вариантов.</p>".to_string()
    } else {
        brand_catalog_html(compatible, "Кронштейнов", "div", "border-b border-line")
    };
    let affiliate_cards = affiliate_offers
        .iter()
        .filter(|offer| {
            is_publishable_affiliate_offer(offer, affiliate_now_seconds)
                && matches
                    .iter()
                    .any(|matched| matched.compatible && matched.mount.id == offer.entity_id)
        })
        .take(3)
        .map(|offer| affiliate_offer_card_html(offer, 3))
        .collect::<Vec<_>>()
        .join("\n");
    let affiliate_section = if affiliate_cards.is_empty() {
        String::new()
    } else {
        format!(
            "<section class=\"border-b-2 border-ink py-8\" aria-label=\"Предложения Яндекс Маркета\"><h2 class=\"font-display text-3xl font-extrabold\">Сейчас доступны на Яндекс Маркете</h2><p class=\"mt-3 max-w-3xl text-muted\">Показаны только свежие предложения точных кронштейнов, прошедших проверку совместимости с этой моделью телевизора.</p><div class=\"mt-5 grid gap-5\">{affiliate_cards}</div></section>"
        )
    };

    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенная модель · {series} · {year}</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Кронштейн для {title}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Сначала сопоставьте монтажные отверстия VESA и массу телевизора, затем проверьте стену, крепёж, доступ к разъёмам и геометрию монтажной пластины.</p><dl class=\"mt-8 grid gap-4 border-y-2 border-ink py-6 sm:grid-cols-3\"><div><dt class=\"font-mono text-xs uppercase text-muted\">VESA</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{vesa_w}×{vesa_h} мм</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{diagonal}″</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Масса без подставки</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{weight} кг</dd></div></dl>{affiliate_section}<section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Подходящие кронштейны</h2><p class=\"mt-3 max-w-3xl text-muted\">Все варианты проходят точную пару VESA и запас нагрузки 25%. Паспортный диапазон диагонали показан отдельно в статусе каждой позиции.</p><div class=\"mt-5\">{compatible}</div></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Размеры и источник</h2><p class=\"mt-3 text-lg text-muted\">Серия {series}, модельный год {year}. Корпус {width}×{height}×{depth} мм без подставки. Данные проверены {checked_at}.</p><a class=\"mt-5 inline-flex font-semibold text-technical underline underline-offset-4\" href=\"{source}\" rel=\"noreferrer\">Источник характеристик: {source_label}</a></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Что сервис не подтверждает автоматически</h2><p class=\"mt-3 text-lg leading-relaxed text-muted\">Состояние стены, тип анкеров, скрытую проводку, перекрытие разъёмов и положение VESA относительно геометрического центра экрана необходимо проверить на месте.</p><a class=\"mt-5 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Открыть полную методику</a></section></article>",
        title = escape_html(&tv.title),
        series = escape_html(&tv.series),
        year = tv.model_year,
        vesa_w = tv.vesa_width_mm,
        vesa_h = tv.vesa_height_mm,
        diagonal = tv.diagonal_inches,
        weight = tv.weight_kg,
        width = tv.width_mm,
        height = tv.height_mm,
        depth = tv.depth_mm,
        checked_at = escape_html(&tv.checked_at),
        source = escape_html(&tv.source_url),
        source_label = escape_html(&tv.source_label),
        affiliate_section = affiliate_section,
    ))
}

fn mount_page_body(
    mount: &Mount,
    models: &[TvModel],
    graph: &[CompatibilityEdge],
    affiliate_offers: &[PublicAffiliateOffer],
    affiliate_now_seconds: i64,
) -> String {
    let television_row = |edge: &CompatibilityEdge| {
        let tv = models.iter().find(|tv| tv.id == edge.tv_id)?;
        let evidence = edge
            .reasons
            .iter()
            .chain(edge.warnings.iter())
            .map(|message| escape_html(message))
            .collect::<Vec<_>>()
            .join(" · ");
        Some((
            tv.brand.clone(),
            format!(
                "<article class=\"grid gap-3 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center\"><div><h3 class=\"font-display text-2xl font-extrabold\">{title}</h3><p class=\"mt-1 text-sm text-muted\">{fit} · VESA {vesa_w}×{vesa_h} мм · {weight} кг без подставки</p><p class=\"mt-2 text-sm\">{evidence}</p></div><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/modeli/{id}/\">Страница телевизора</a></article>",
                title = escape_html(&tv.title),
                fit = fit_label(&edge.fit_status),
                vesa_w = tv.vesa_width_mm,
                vesa_h = tv.vesa_height_mm,
                weight = tv.weight_kg,
                evidence = evidence,
                id = escape_html(&tv.id),
            ),
        ))
    };
    let verified_rows = graph
        .iter()
        .filter(|edge| edge.mount_id == mount.id && edge.fit_status == "verified-fit")
        .filter_map(&television_row)
        .collect::<Vec<_>>();
    let conditional_rows = graph
        .iter()
        .filter(|edge| edge.mount_id == mount.id && edge.fit_status == "conditional-fit")
        .filter_map(&television_row)
        .collect::<Vec<_>>();
    let verified_rows = if verified_rows.is_empty() {
        "<p class=\"border-y border-line py-5 text-muted\">В проверенной базе пока нет подтверждённых моделей.</p>".to_string()
    } else {
        brand_catalog_html(verified_rows, "Моделей", "div", "border-b border-line")
    };
    let conditional_section = if conditional_rows.is_empty() {
        String::new()
    } else {
        let conditional_rows =
            brand_catalog_html(conditional_rows, "Моделей", "div", "border-b border-line");
        format!(
            "<section class=\"mt-7 border-y-2 border-action py-5\"><h3 class=\"font-display text-2xl font-extrabold text-action\">Кандидаты после проверки диагонали</h3><p class=\"mt-2 max-w-3xl text-muted\">VESA и нагрузка совпали, но паспортный диапазон диагонали требует ручной проверки геометрии пластины.</p><div class=\"mt-4\">{conditional_rows}</div></section>"
        )
    };
    let distance = if (mount.wall_distance_min_mm - mount.wall_distance_max_mm).abs() < f64::EPSILON
    {
        format!("{} мм", mount.wall_distance_min_mm)
    } else {
        format!(
            "{}–{} мм",
            mount.wall_distance_min_mm, mount.wall_distance_max_mm
        )
    };
    let affiliate_section = affiliate_offers
        .iter()
        .find(|offer| {
            offer.entity_id == mount.id
                && is_publishable_affiliate_offer(offer, affiliate_now_seconds)
        })
        .map(|offer| {
            format!(
                "<section class=\"border-t-2 border-ink py-8\">{}</section>",
                affiliate_offer_card_html(offer, 2),
            )
        })
        .unwrap_or_default();

    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенный кронштейн</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">{title}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Отдельная карточка изделия с явными парами VESA и двусторонним списком моделей телевизоров. Покупка не нужна для получения результата проверки.</p><dl class=\"mt-8 grid gap-4 border-y-2 border-ink py-6 sm:grid-cols-3\"><div><dt class=\"font-mono text-xs uppercase text-muted\">Механизм</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{mechanism}</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Нагрузка</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">до {load} кг</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{min_diagonal}–{max_diagonal}″</dd></div></dl>{affiliate_section}<section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Поддерживаемые VESA</h2><p class=\"mt-3 font-mono text-sm leading-7\">{vesa}</p><p class=\"mt-4 text-muted\">Расстояние от стены: {distance}. Данные проверены {checked_at}.</p><a class=\"mt-5 inline-flex font-semibold text-technical underline underline-offset-4\" href=\"{source}\" rel=\"noreferrer\">Источник характеристик: {source_label}</a></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Подтверждённые популярные телевизоры</h2><p class=\"mt-3 max-w-3xl text-muted\">Показаны модели, которые проходят точную VESA, запас нагрузки и паспортный диапазон диагонали.</p><div class=\"mt-5\">{verified_rows}</div>{conditional_section}</section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Перед монтажом</h2><p class=\"mt-3 text-lg leading-relaxed text-muted\">Отдельно проверьте винты телевизора, перекрытие портов, геометрию пластины, основание стены, анкеры и скрытые коммуникации.</p><a class=\"mt-5 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Методика проверки</a></section></article>",
        title = escape_html(&mount.title),
        mechanism = mechanism_label(&mount.mechanism),
        load = mount.max_load_kg,
        min_diagonal = mount.min_diagonal_in,
        max_diagonal = mount.max_diagonal_in,
        vesa = escape_html(&formatted_vesa_list(mount)),
        distance = escape_html(&distance),
        checked_at = escape_html(&mount.checked_at),
        source = escape_html(&mount.source_url),
        source_label = escape_html(&mount.source_label),
        affiliate_section = affiliate_section,
        verified_rows = verified_rows,
        conditional_section = conditional_section,
    ))
}

fn related_seo_pages<'a>(page: &SeoPage, pages: &'a [SeoPage]) -> Vec<&'a SeoPage> {
    let preferred_ids: &[&str] = match page.id.as_str() {
        "wall-mounted-tv" => &[
            "mounting-map",
            "tv-zone-sockets",
            "vesa",
            "full-motion-mount",
            "mounting-height",
        ],
        "mounting-map" => &[
            "tv-zone-sockets",
            "wall-mounted-tv",
            "mounting-height",
            "vesa",
            "how-to-find-vesa",
        ],
        "tv-zone-sockets" => &["mounting-map", "wall-mounted-tv", "mounting-height", "vesa"],
        "vesa" => &["wall-mounted-tv", "how-to-find-vesa", "vesa-200x200"],
        "vesa-200x200" | "vesa-300x200" => &["vesa", "how-to-find-vesa", "diagonal-55"],
        "diagonal-55" => &["wall-mounted-tv", "mounting-height", "vesa"],
        "fixed-mount" => &[
            "wall-mounted-tv",
            "tilt-mount",
            "full-motion-mount",
            "mounting-height",
        ],
        "tilt-mount" => &[
            "mounting-height",
            "mounting-map",
            "wall-mounted-tv",
            "fixed-mount",
            "full-motion-mount",
        ],
        "full-motion-mount" => &[
            "wall-mounted-tv",
            "fixed-mount",
            "tilt-mount",
            "mounting-height",
        ],
        "how-to-find-vesa" => &["vesa", "vesa-200x200", "vesa-300x200"],
        "mounting-height" => &[
            "mounting-map",
            "tilt-mount",
            "tv-zone-sockets",
            "wall-mounted-tv",
            "viewing-distance",
            "diagonal-55",
        ],
        "viewing-distance" => &["mounting-height", "diagonal-55", "full-motion-mount"],
        _ => &["vesa", "how-to-find-vesa", "mounting-height"],
    };

    let mut related = Vec::new();
    for id in preferred_ids {
        let Some(candidate) = pages
            .iter()
            .find(|candidate| candidate.id == *id && is_indexable_seo_page(candidate))
        else {
            continue;
        };
        if candidate.id != page.id
            && !related
                .iter()
                .any(|item: &&SeoPage| item.id == candidate.id)
        {
            related.push(candidate);
        }
    }
    related
}

fn seo_calculator_note(page_id: &str) -> &'static str {
    match page_id {
        "vesa" => {
            "<section class=\"border-y-2 border-ink py-7\"><p class=\"font-mono text-xs uppercase text-action\">Самостоятельная проверка без регистрации</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Сравнить VESA телевизора и кронштейна</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Инструмент нормализует ручной замер и распознаёт явные пары из вставленной строки характеристик: x, х, ×, миллиметры и сантиметры. Ответ относится только к точной схеме отверстий.</p><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Предельный размер вроде «до 400×400» не считается списком совместимости. Даже точное совпадение VESA не подтверждает массу, диагональ, винты, механизм, кабельные зазоры и основание стены.</p></section>"
        }
        "wall-mounted-tv" => {
            "<section class=\"border-y-2 border-ink py-7\"><p class=\"font-mono text-xs uppercase text-action\">Самостоятельный расчёт без регистрации</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Проект настенного монтажа</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Инструмент сводит в одну проверку точный VESA, массу телевизора, расчётный запас нагрузки, ширину корпуса и вылет кронштейна. Для поворотной конструкции он оценивает предельный угол по зазору до стены, а не только повторяет число на упаковке.</p><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Паспортный предел и кинематика механизма проверяются отдельно. Результат не назначает анкеры и не подтверждает несущую способность стены: основание, скрытые коммуникации и крепёж проверяются на месте.</p></section>"
        }
        "mounting-map" => {
            "<section class=\"border-y-2 border-ink py-7\"><p class=\"font-mono text-xs uppercase text-action\">Самостоятельный расчёт без регистрации</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Монтажная карта до сверления</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Инструмент рассчитывает нижний край, центр и верх экрана, затем переносит вертикальное смещение VESA и контрольной линии настенной пластины. Все значения даны от чистого пола и выполняются локально в браузере.</p><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Карта не определяет координаты отверстий, анкеры, прочность основания и скрытые коммуникации. Отверстия переносят только по штатному шаблону или самой пластине после проверки стены.</p></section>"
        }
        "tv-zone-sockets" => {
            "<section class=\"border-y-2 border-ink py-7\"><p class=\"font-mono text-xs uppercase text-action\">Самостоятельный расчёт без регистрации</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Карта розеток ТВ-зоны</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Инструмент связывает положение экрана с реальными габаритами настенной пластины и розеточного блока. Он проверяет пересечение, скрытие блока корпусом, глубину вилок и минимальный сдвиг до отделки стены.</p><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Расчёт не проектирует проводку и не разрешает штробление. Разъёмы телевизора, траекторию механизма, скрытые коммуникации, защиту и способ монтажа проверяют по точным изделиям и проекту электрика.</p></section>"
        }
        "tilt-mount" => {
            "<section class=\"border-y-2 border-ink py-7\"><p class=\"font-mono text-xs uppercase text-action\">Самостоятельный расчёт без регистрации</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Рассчитать угол наклона телевизора</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Инструмент связывает высоту центра экрана, уровень глаз и расстояние просмотра, затем сравнивает требуемое направление с паспортными пределами кронштейна вверх и вниз.</p><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Результат описывает только геометрию направления центра. Он не назначает удобную высоту и не подтверждает VESA, нагрузку, фиксацию механизма, кабельные зазоры или основание стены.</p></section>"
        }
        "mounting-height" => {
            "<section class=\"border-y-2 border-ink py-7\"><h2 class=\"font-display text-3xl font-extrabold\">Калькулятор высоты установки</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Интерактивный расчёт учитывает диагональ экрана, высоту глаз, расстояние просмотра, вертикальный угол, высоту мебели и обязательный зазор.</p></section>"
        }
        "viewing-distance" => {
            "<section class=\"border-y-2 border-ink py-7\"><h2 class=\"font-display text-3xl font-extrabold\">Калькулятор расстояния и диагонали</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Расчёт работает в обе стороны: диагональ переводится в расстояние, а известное расстояние — в диагональ. Формула использует физическую ширину экрана 16:9 и выбранный горизонтальный угол обзора.</p></section>"
        }
        _ => "",
    }
}

fn seo_page_body(page: &SeoPage, pages: &[SeoPage]) -> String {
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
    let calculator_note = seo_calculator_note(&page.id);
    let related_links = related_seo_pages(page, pages)
        .iter()
        .map(|related| {
            format!(
                "<a class=\"border-t border-line py-3 font-display font-bold\" href=\"{}\">{}</a>",
                escape_html(&related.path),
                escape_html(&related.h1),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Технический справочник</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">{h1}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">{lead}</p><section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Что проверить</h2><ul class=\"mt-5 space-y-3 border-l-2 border-action pl-5 text-lg leading-relaxed\">{facts}</ul></section>{calculator_note}<section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Частые вопросы</h2><div class=\"mt-5 border-b border-line\">{faq}</div></section><section class=\"border-t-2 border-ink py-7\"><h2 class=\"font-display text-2xl font-extrabold\">Связанные материалы</h2><nav class=\"mt-4 grid\" aria-label=\"Связанные материалы\">{related_links}</nav></section><p><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/podbor/\">Проверить точную модель телевизора</a></p></article>",
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
            !tv.series.trim().is_empty()
                && (2000..=2100).contains(&tv.model_year)
                && tv.source_url.starts_with("https://")
                && !tv.source_label.trim().is_empty()
                && is_valid_iso_date(&tv.checked_at),
            "Некорректный источник или дата проверки у {}",
            tv.id
        );
        assert!(
            tv.weight_kg > 0.0
                && tv.diagonal_inches > 0.0
                && tv.width_mm > 0.0
                && tv.height_mm > 0.0
                && tv.depth_mm > 0.0,
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

fn validate_mounts(mounts: &[Mount]) {
    let mut ids = HashSet::new();
    for mount in mounts {
        assert!(
            ids.insert(&mount.id),
            "Повторяется идентификатор кронштейна {}",
            mount.id
        );
        assert!(
            !mount.brand.trim().is_empty()
                && !mount.model.trim().is_empty()
                && !mount.source_label.trim().is_empty(),
            "Нет идентичности или подписи источника у {}",
            mount.id
        );
        assert!(
            mount.source_url.starts_with("https://") && is_valid_iso_date(&mount.checked_at),
            "Некорректный источник или дата проверки у {}",
            mount.id
        );
        assert!(
            mount.max_load_kg > 0.0
                && mount.min_diagonal_in > 0.0
                && mount.max_diagonal_in >= mount.min_diagonal_in
                && !mount.vesa.is_empty(),
            "Некорректные характеристики кронштейна {}",
            mount.id
        );
        let mut vesa_pairs = HashSet::new();
        for value in &mount.vesa {
            let Some((width, height)) = value.split_once('x') else {
                panic!("Некорректная VESA-пара {value} у {}", mount.id);
            };
            let (Ok(width), Ok(height)) = (width.parse::<u32>(), height.parse::<u32>()) else {
                panic!("Некорректная VESA-пара {value} у {}", mount.id);
            };
            assert!(
                width > 0 && height > 0 && vesa_pairs.insert((width, height)),
                "Пустая или повторная VESA-пара {value} у {}",
                mount.id
            );
        }
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
    let mounts: Vec<Mount> = read_json(&data.join("mounts.json"));
    let seo_pages: Vec<SeoPage> = read_json(&data.join("seo_pages.json"));
    let trust_pages: Vec<TrustPage> = read_json(&data.join("trust_pages.json"));
    let affiliate_snapshot: PublicAffiliateSnapshot =
        read_json(&data.join("affiliate/public-offers.json"));
    assert_eq!(
        affiliate_snapshot.schema_version, 2,
        "Неподдерживаемая версия публичного affiliate snapshot"
    );
    assert!(
        parse_rfc3339_utc_seconds(&affiliate_snapshot.generated_at).is_some(),
        "Некорректная дата генерации публичного affiliate snapshot"
    );
    let affiliate_now_seconds = unix_now_seconds();
    validate_models(&models);
    validate_mounts(&mounts);
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
        data.join("catalog-coverage.json"),
        public_data.join("catalog-coverage.json"),
    )
    .expect("Не удалось скопировать manifest покрытия каталога");
    let compatibility_graph = build_compatibility_graph(&models, &mounts);
    write(
        &public_data.join("compatibility-graph.json"),
        &serde_json::to_string_pretty(&compatibility_graph)
            .expect("Граф совместимости сериализуется"),
    );
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
    fs::copy(
        data.join("affiliate/public-offers.json"),
        public_data.join("affiliate-offers.json"),
    )
    .expect("Не удалось скопировать публичный снимок предложений");

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
            "Проверка совместимости телевизора и кронштейна — KREPI TV",
            "Проверьте VESA, массу, диагональ и высоту установки для точной модели телевизора. Расчёт работает локально в браузере. YMReferral",
            "https://krepitv.ru/",
            "home",
            None,
            Some(&home_page_body(&models, &seo_pages)),
            HeadExtras {
                robots: None,
                json_ld: &website_json_ld(),
            },
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
            HeadExtras {
                robots: None,
                json_ld: &breadcrumb_json_ld(&[
                    ("Главная", "https://krepitv.ru/"),
                    ("Подбор по модели", "https://krepitv.ru/podbor/"),
                ]),
            },
        ),
    );

    write(
        &web.join("modeli/index.html"),
        &html_shell(
            "Модели телевизоров и совместимые кронштейны — KREPI TV",
            "Проверенные модели телевизоров с точными VESA, массой без подставки и двусторонним списком совместимых кронштейнов.",
            "https://krepitv.ru/modeli/",
            "models-catalog",
            None,
            Some(&models_catalog_body(&models)),
            HeadExtras {
                robots: None,
                json_ld: &breadcrumb_json_ld(&[
                    ("Главная", "https://krepitv.ru/"),
                    ("Модели телевизоров", "https://krepitv.ru/modeli/"),
                ]),
            },
        ),
    );

    write(
        &web.join("kronshteyny/index.html"),
        &html_shell(
            "Кронштейны для телевизоров с проверкой совместимости — KREPI TV",
            "Проверенные кронштейны: явные VESA, нагрузка, механизм и список подходящих популярных телевизоров.",
            "https://krepitv.ru/kronshteyny/",
            "mounts-catalog",
            None,
            Some(&mounts_catalog_body(&mounts)),
            HeadExtras {
                robots: None,
                json_ld: &breadcrumb_json_ld(&[
                    ("Главная", "https://krepitv.ru/"),
                    ("Кронштейны", "https://krepitv.ru/kronshteyny/"),
                ]),
            },
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
        let matches = model_mount_matches(tv, &mounts);
        let static_body = model_page_body(
            tv,
            &matches,
            &affiliate_snapshot.offers,
            affiliate_now_seconds,
        );
        let canonical = format!("https://krepitv.ru/modeli/{}/", tv.id);
        let structured_data = format!(
            "{}{}",
            breadcrumb_json_ld(&[
                ("Главная", "https://krepitv.ru/"),
                ("Модели телевизоров", "https://krepitv.ru/modeli/"),
                (&tv.title, &canonical),
            ]),
            tv_product_json_ld(tv, &canonical)
        );
        write(
            &web.join(format!("modeli/{}/index.html", tv.id)),
            &html_shell(
                &title,
                &description,
                &canonical,
                "model",
                Some(&tv.id),
                Some(&static_body),
                HeadExtras {
                    robots: if is_indexable_model(&tv.id, &compatibility_graph) {
                        None
                    } else {
                        Some("noindex,follow")
                    },
                    json_ld: &structured_data,
                },
            ),
        );
    }

    for mount in &mounts {
        let title = format!(
            "Кронштейн {}: совместимые телевизоры — KREPI TV",
            mount.title
        );
        let description = format!(
            "{}: VESA {}, нагрузка до {} кг и список подходящих моделей телевизоров с объяснением проверки.",
            mount.title,
            formatted_vesa_list(mount),
            mount.max_load_kg
        );
        let static_body = mount_page_body(
            mount,
            &models,
            &compatibility_graph,
            &affiliate_snapshot.offers,
            affiliate_now_seconds,
        );
        let canonical = format!("https://krepitv.ru/kronshteyny/{}/", mount.id);
        let structured_data = format!(
            "{}{}",
            breadcrumb_json_ld(&[
                ("Главная", "https://krepitv.ru/"),
                ("Кронштейны", "https://krepitv.ru/kronshteyny/"),
                (&mount.title, &canonical),
            ]),
            mount_product_json_ld(mount, &canonical)
        );
        write(
            &web.join(format!("kronshteyny/{}/index.html", mount.id)),
            &html_shell(
                &title,
                &description,
                &canonical,
                "mount",
                Some(&mount.id),
                Some(&static_body),
                HeadExtras {
                    robots: if is_indexable_mount(&mount.id, &compatibility_graph) {
                        None
                    } else {
                        Some("noindex,follow")
                    },
                    json_ld: &structured_data,
                },
            ),
        );
    }

    for page in &seo_pages {
        let relative = page.path.trim_matches('/');
        let static_body = seo_page_body(page, &seo_pages);
        let canonical = format!("https://krepitv.ru{}", page.path);
        let breadcrumb = if page.path.starts_with("/vesa/") && page.path != "/vesa/" {
            breadcrumb_json_ld(&[
                ("Главная", "https://krepitv.ru/"),
                ("Справочник VESA", "https://krepitv.ru/vesa/"),
                (&page.h1, &canonical),
            ])
        } else {
            breadcrumb_json_ld(&[("Главная", "https://krepitv.ru/"), (&page.h1, &canonical)])
        };
        write(
            &web.join(relative).join("index.html"),
            &html_shell(
                &page.title,
                &page.description,
                &canonical,
                "seo",
                Some(&page.id),
                Some(&static_body),
                HeadExtras {
                    robots: if is_indexable_seo_page(page) {
                        None
                    } else {
                        Some("noindex,follow")
                    },
                    json_ld: &breadcrumb,
                },
            ),
        );
    }

    for page in &trust_pages {
        let relative = page.path.trim_matches('/');
        let static_body = trust_page_body(page);
        let canonical = format!("https://krepitv.ru{}", page.path);
        write(
            &web.join(relative).join("index.html"),
            &html_shell(
                &page.title,
                &page.description,
                &canonical,
                "trust",
                Some(&page.id),
                Some(&static_body),
                HeadExtras {
                    robots: None,
                    json_ld: &breadcrumb_json_ld(&[
                        ("Главная", "https://krepitv.ru/"),
                        (&page.h1, &canonical),
                    ]),
                },
            ),
        );
    }

    let mut urls = vec![
        "https://krepitv.ru/".to_string(),
        "https://krepitv.ru/podbor/".to_string(),
        "https://krepitv.ru/modeli/".to_string(),
        "https://krepitv.ru/kronshteyny/".to_string(),
    ];
    urls.extend(
        models
            .iter()
            .filter(|tv| is_indexable_model(&tv.id, &compatibility_graph))
            .map(|tv| format!("https://krepitv.ru/modeli/{}/", tv.id)),
    );
    urls.extend(
        mounts
            .iter()
            .filter(|mount| is_indexable_mount(&mount.id, &compatibility_graph))
            .map(|mount| format!("https://krepitv.ru/kronshteyny/{}/", mount.id)),
    );
    urls.extend(
        seo_pages
            .iter()
            .filter(|page| is_indexable_seo_page(page))
            .map(|page| format!("https://krepitv.ru{}", page.path)),
    );
    urls.extend(
        trust_pages
            .iter()
            .map(|page| format!("https://krepitv.ru{}", page.path)),
    );
    let sitemap_urls = urls
        .iter()
        .map(|url| format!("  <url><loc>{}</loc></url>", escape_html(url)))
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
    use super::{
        PublicAffiliateSnapshot, SeoPage, TvModel, affiliate_offer_card_html, brand_catalog_html,
        build_compatibility_graph, escape_html, is_indexable_model, is_indexable_mount,
        is_indexable_seo_page, is_publishable_affiliate_offer, is_valid_iso_date, json_ld_script,
        mount_page_body, parse_rfc3339_utc_seconds, read_json, related_seo_pages,
        seo_calculator_note, workspace_root,
    };
    use krepitv_engine::Mount;
    use serde_json::json;

    #[test]
    fn escapes_html_attributes() {
        assert_eq!(
            escape_html("<ТВ & \"стена\">"),
            "&lt;ТВ &amp; &quot;стена&quot;&gt;"
        );
    }

    #[test]
    fn validates_real_calendar_dates() {
        assert!(is_valid_iso_date("2026-07-30"));
        assert!(is_valid_iso_date("2024-02-29"));
        assert!(!is_valid_iso_date("2026-02-29"));
        assert!(!is_valid_iso_date("9999-99-99"));
        assert!(!is_valid_iso_date("30.07.2026"));
    }

    #[test]
    fn uses_explicit_indexability_policy() {
        let page = |indexable| SeoPage {
            id: "test".into(),
            path: "/test/".into(),
            kind: "guide".into(),
            indexable,
            title: "Тест".into(),
            description: "Тест".into(),
            h1: "Тест".into(),
            lead: "Тест".into(),
            facts: vec![],
            faq: vec![],
        };

        assert!(is_indexable_seo_page(&page(true)));
        assert!(!is_indexable_seo_page(&page(false)));
    }

    #[test]
    fn escapes_script_breakout_in_json_ld() {
        let script = json_ld_script(json!({ "name": "</script><script>" }));
        assert!(!script.contains("</script><script>"));
        assert!(script.contains("\\u003c/script\\u003e\\u003cscript\\u003e"));
    }

    #[test]
    fn affiliate_offer_is_fresh_for_48_hours_and_renders_redacted_static_card() {
        let snapshot: PublicAffiliateSnapshot =
            read_json(&workspace_root().join("data/affiliate/public-offers.json"));
        let offer = snapshot
            .offers
            .iter()
            .find(|offer| offer.publishable)
            .expect("Нужен хотя бы один publishable affiliate offer");
        let checked_at = parse_rfc3339_utc_seconds(&offer.checked_at)
            .expect("Дата проверки affiliate offer должна разбираться");

        assert!(is_publishable_affiliate_offer(offer, checked_at + 60));
        assert!(is_publishable_affiliate_offer(
            offer,
            checked_at + 48 * 60 * 60
        ));
        assert!(!is_publishable_affiliate_offer(
            offer,
            checked_at + 48 * 60 * 60 + 1
        ));

        let html = affiliate_offer_card_html(offer, 2);
        assert!(html.contains("data-affiliate-offer-id="));
        assert!(html.contains("data-affiliate-mode="));
        assert!(html.contains("data-clid="));
        assert!(html.contains("sponsored nofollow noopener noreferrer"));
        assert!(html.contains("Проверить цену на Яндекс Маркете"));
        assert!(!html.contains("может получить вознаграждение"));
        assert!(!html.contains("promise"));
        assert!(!html.contains("stock"));
    }

    #[test]
    fn catalog_groups_every_link_by_brand_under_native_details() {
        let html = brand_catalog_html(
            vec![
                ("Samsung".into(), "<a href=\"/1/\">1</a>".into()),
                ("LG".into(), "<a href=\"/2/\">2</a>".into()),
                ("Samsung".into(), "<a href=\"/3/\">3</a>".into()),
            ],
            "Моделей",
            "div",
            "grid",
        );

        assert_eq!(html.matches("<details").count(), 2);
        assert!(html.contains("Samsung"));
        assert!(html.contains("Моделей: 2"));
        assert!(html.contains("href=\"/1/\""));
        assert!(html.contains("href=\"/3/\""));

        let semantic_list = brand_catalog_html(
            vec![
                ("TCL".into(), "<li>1</li>".into()),
                ("TCL".into(), "<li>2</li>".into()),
            ],
            "Моделей",
            "ul",
            "space-y-4",
        );
        assert!(semantic_list.contains("<ul class=\"space-y-4\"><li>1</li>\n<li>2</li></ul>"));
    }

    #[test]
    fn wall_mount_master_page_is_indexable_and_has_its_own_calculator_copy() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let master = pages
            .iter()
            .find(|page| page.id == "wall-mounted-tv")
            .expect("Нет основной страницы настенного кронштейна");

        assert_eq!(master.path, "/kronshteyn-dlya-televizora-na-stenu/");
        assert_eq!(master.kind, "calculator");
        assert!(master.indexable);
        assert!(master.description.contains("угол по зазору до стены"));
        assert!(master.facts.len() >= 5);
        assert!(master.faq.len() >= 5);

        let calculator_copy = seo_calculator_note(&master.id);
        assert!(calculator_copy.contains("Проект настенного монтажа"));
        assert!(calculator_copy.contains("не назначает анкеры"));
    }

    #[test]
    fn wall_mount_master_page_links_to_narrow_guides_and_back() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let master = pages
            .iter()
            .find(|page| page.id == "wall-mounted-tv")
            .expect("Нет основной страницы настенного кронштейна");
        let related_ids = related_seo_pages(master, &pages)
            .iter()
            .map(|page| page.id.as_str())
            .collect::<Vec<_>>();
        assert_eq!(
            related_ids,
            [
                "mounting-map",
                "tv-zone-sockets",
                "vesa",
                "full-motion-mount",
                "mounting-height"
            ]
        );

        let full_motion = pages
            .iter()
            .find(|page| page.id == "full-motion-mount")
            .expect("Нет справочника поворотных кронштейнов");
        assert!(
            related_seo_pages(full_motion, &pages)
                .iter()
                .any(|page| page.id == master.id)
        );
    }

    #[test]
    fn mounting_map_page_is_indexable_and_sets_safe_boundaries() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let page = pages
            .iter()
            .find(|page| page.id == "mounting-map")
            .expect("Нет страницы монтажной карты");

        assert_eq!(page.path, "/kak-povesit-televizor-na-stenu/");
        assert_eq!(page.kind, "guide");
        assert!(page.indexable);
        assert!(page.facts.len() >= 5);
        assert!(page.faq.len() >= 5);

        let calculator_copy = seo_calculator_note(&page.id);
        assert!(calculator_copy.contains("Монтажная карта до сверления"));
        assert!(calculator_copy.contains("не определяет координаты отверстий"));
        assert!(
            related_seo_pages(page, &pages)
                .iter()
                .any(|related| related.id == "wall-mounted-tv")
        );
    }

    #[test]
    fn tv_zone_socket_page_is_indexable_and_keeps_electrical_boundary() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let page = pages
            .iter()
            .find(|page| page.id == "tv-zone-sockets")
            .expect("Нет страницы карты розеток ТВ-зоны");

        assert_eq!(page.path, "/rozetki-pod-televizor-na-stene/");
        assert_eq!(page.kind, "calculator");
        assert!(page.indexable);
        assert!(page.title.contains("Розетки под телевизор на стене"));
        assert!(page.description.contains("пластиной кронштейна"));
        assert!(page.facts.len() >= 5);
        assert!(page.faq.len() >= 5);

        let calculator_copy = seo_calculator_note(&page.id);
        assert!(calculator_copy.contains("Карта розеток ТВ-зоны"));
        assert!(calculator_copy.contains("не проектирует проводку"));
        assert!(
            related_seo_pages(page, &pages)
                .iter()
                .any(|related| related.id == "mounting-map")
        );
        assert!(
            related_seo_pages(page, &pages)
                .iter()
                .any(|related| related.id == "wall-mounted-tv")
        );
    }

    #[test]
    fn tilt_mount_page_is_indexable_and_keeps_geometric_boundary() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let page = pages
            .iter()
            .find(|page| page.id == "tilt-mount")
            .expect("Нет страницы наклонного кронштейна");

        assert_eq!(page.path, "/tipy-kronshteynov/naklonnyy/");
        assert_eq!(page.kind, "mechanism");
        assert!(page.indexable);
        assert!(page.title.contains("расчёт угла"));
        assert!(page.description.contains("диапазоном кронштейна"));
        assert!(page.facts.len() >= 5);
        assert!(page.faq.len() >= 5);

        let calculator_copy = seo_calculator_note(&page.id);
        assert!(calculator_copy.contains("Рассчитать угол наклона телевизора"));
        assert!(calculator_copy.contains("не назначает удобную высоту"));
        assert!(
            related_seo_pages(page, &pages)
                .iter()
                .any(|related| related.id == "mounting-height")
        );
        assert!(
            related_seo_pages(page, &pages)
                .iter()
                .any(|related| related.id == "wall-mounted-tv")
        );
    }

    #[test]
    fn vesa_page_is_indexable_and_keeps_compatibility_boundary() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let page = pages
            .iter()
            .find(|page| page.id == "vesa")
            .expect("Нет страницы VESA");

        assert_eq!(page.path, "/vesa/");
        assert!(page.indexable);
        assert!(page.title.contains("проверить совместимость"));
        assert!(page.description.contains("точной пары"));
        assert!(page.facts.len() >= 5);
        assert!(page.faq.len() >= 6);

        let calculator_copy = seo_calculator_note(&page.id);
        assert!(calculator_copy.contains("Сравнить VESA телевизора и кронштейна"));
        assert!(calculator_copy.contains("не подтверждает массу"));
        assert!(
            related_seo_pages(page, &pages)
                .iter()
                .any(|related| related.id == "how-to-find-vesa")
        );
    }

    #[test]
    fn compatibility_graph_contains_only_useful_edges_and_mount_pages_are_reciprocal() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let mounts: Vec<Mount> = read_json(&root.join("data/mounts.json"));
        let graph = build_compatibility_graph(&models, &mounts);

        assert!(!graph.is_empty());
        assert!(graph.len() < models.len() * mounts.len());
        assert!(graph.iter().all(|edge| edge.compatible));
        assert!(graph.iter().any(|edge| edge.fit_status == "verified-fit"));
        assert!(models.iter().all(|tv| is_indexable_model(&tv.id, &graph)));
        assert!(
            mounts
                .iter()
                .all(|mount| is_indexable_mount(&mount.id, &graph))
        );

        for mount in &mounts {
            let body = mount_page_body(mount, &models, &graph, &[], 0);
            for edge in graph.iter().filter(|edge| edge.mount_id == mount.id) {
                assert!(body.contains(&format!("/modeli/{}/", edge.tv_id)));
                for warning in &edge.warnings {
                    assert!(body.contains(&escape_html(warning)));
                }
            }
        }
    }

    #[test]
    fn mount_page_places_static_affiliate_cta_before_compatible_televisions() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let mounts: Vec<Mount> = read_json(&root.join("data/mounts.json"));
        let snapshot: PublicAffiliateSnapshot =
            read_json(&root.join("data/affiliate/public-offers.json"));
        let offer = snapshot
            .offers
            .iter()
            .find(|offer| offer.publishable)
            .expect("Нужен publishable affiliate offer");
        let mount = mounts
            .iter()
            .find(|mount| mount.id == offer.entity_id)
            .expect("Affiliate offer должен ссылаться на кронштейн из каталога");
        let graph = build_compatibility_graph(&models, &mounts);
        let now = parse_rfc3339_utc_seconds(&offer.checked_at).expect("Дата должна разбираться");
        let body = mount_page_body(mount, &models, &graph, &snapshot.offers, now);
        let cta_position = body
            .find("data-affiliate-offer-id=")
            .expect("Статический affiliate CTA отсутствует");
        let models_position = body
            .find("Подтверждённые популярные телевизоры")
            .expect("Список телевизоров отсутствует");
        let vesa_position = body
            .find("Поддерживаемые VESA")
            .expect("Технический блок VESA отсутствует");

        assert!(cta_position < models_position);
        assert!(cta_position < vesa_position);
        assert!(body.contains(&escape_html(&offer.affiliate_href)));
    }
}
