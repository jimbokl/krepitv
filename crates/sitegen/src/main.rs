use krepitv_engine::{Mount, MountMatch, match_mounts};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_AFFILIATE_AGE_SECONDS: i64 = 48 * 60 * 60;
const AFFILIATE_FUTURE_TOLERANCE_SECONDS: i64 = 5 * 60;
const CORE_PAGES_UPDATED_AT: &str = "2026-07-31";
const TRAFFIC_PAGES_UPDATED_AT: &str = "2026-08-01";
const DATASET_DOWNLOAD_BASE: &str =
    "https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0";
const DATASET_LICENSE_URL: &str =
    "https://github.com/jimbokl/krepitv/blob/2f19d58ef793ffc1e26c8c8fdb6d53f2a20edbfe/LICENSE";
const BUY_MOUNT_SHORTLIST: [(&str, &str); 3] = [
    ("itech-plb440nt", "Наклонный · экран ближе к стене"),
    (
        "itech-ptrb440ln",
        "Поворотно-выдвижной · для диагоналей до 55″",
    ),
    ("itech-slt-460", "Для больших диагоналей · VESA до 600×400"),
];

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
    wall_mount_screws: Option<WallMountScrews>,
    source_url: String,
    source_label: String,
    checked_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct WallMountScrews {
    groups: Vec<WallMountScrewGroup>,
    #[serde(skip_serializing_if = "Option::is_none")]
    requires_adapters: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    required_parts_note: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    vesa_conflict: Option<VesaSourceConflict>,
    source_region: String,
    source_url: String,
    source_label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    secondary_source_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    secondary_source_label: Option<String>,
    checked_at: String,
    note: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct WallMountScrewGroup {
    location: String,
    thread: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    length_mm: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    length_unknown: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    engagement_min_mm: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    engagement_max_mm: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    range_label: Option<String>,
    quantity: u32,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct VesaSourceConflict {
    catalog_value: String,
    manual_value: String,
    note: String,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    home_priority: Option<u8>,
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
    lastmod: String,
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

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct CommercialProfilesFile {
    schema_version: u32,
    updated_at: String,
    profiles: Vec<CommercialProfile>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct CommercialProfile {
    entity_kind: String,
    entity_id: String,
    path: String,
    title: String,
    description: String,
    kicker: String,
    heading: String,
    answer: String,
    faq: Vec<CommercialFaq>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct CommercialFaq {
    question: String,
    answer: String,
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

fn affiliate_offer_placeholder_html(offer: &PublicAffiliateOffer, heading_level: u8) -> String {
    let heading = if heading_level == 3 { "h3" } else { "h2" };
    format!(
        "<aside aria-label=\"Проверка предложения Яндекс Маркета\" class=\"border-2 border-ink bg-white p-5\" data-affiliate-slot=\"{offer_id}\" data-entity-kind=\"mount\" data-entity-id=\"{entity_id}\"><p class=\"font-mono text-[0.68rem] uppercase leading-relaxed text-muted\">Предложение проверяется</p><{heading} class=\"mt-2 font-display text-2xl font-extrabold\">Проверяем наличие на Яндекс Маркете</{heading}><p class=\"mt-2 text-sm leading-relaxed text-muted\">Кнопка появится после проверки свежести данных и точного совпадения модели кронштейна.</p></aside>",
        heading = heading,
        offer_id = escape_html(&offer.id),
        entity_id = escape_html(&offer.entity_id),
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

fn dataset_json_ld(page_id: &str, canonical: &str) -> Option<String> {
    let (name, description, identifier, keywords, variables, files) = match page_id {
        "vesa" => (
            "Размеры VESA популярных в России телевизоров",
            "Проверяемая таблица из 80 точных моделей телевизоров: полный код модели, размер VESA по горизонтали и вертикали, дата проверки и официальный источник.",
            "KREPI-TV-RU-VESA-SIZES-1.0.0",
            vec![
                "VESA",
                "телевизоры",
                "кронштейны",
                "размеры крепления",
                "Россия",
            ],
            vec![
                "Полный код модели телевизора",
                "Ширина VESA в миллиметрах",
                "Высота VESA в миллиметрах",
                "Официальный источник",
            ],
            vec![
                ("tv-vesa-sizes.csv", "text/csv"),
                ("tv-vesa-sizes.json", "application/json"),
            ],
        ),
        "tv-mount-screws" => (
            "Винты VESA для популярных в России моделей телевизоров",
            "Проверяемая таблица для 26 точных моделей телевизоров: резьба, количество, паспортная длина или диапазон зацепления, обязательные детали и официальный источник.",
            "KREPI-TV-RU-VESA-SCREWS-1.0.0",
            vec![
                "винты VESA",
                "M6",
                "M8",
                "телевизоры",
                "настенное крепление",
                "Россия",
            ],
            vec![
                "Полный код модели телевизора",
                "Резьба винта VESA",
                "Количество винтов",
                "Длина или диапазон зацепления",
                "Официальный источник",
            ],
            vec![
                ("tv-vesa-screws.csv", "text/csv"),
                ("tv-vesa-screws.json", "application/json"),
            ],
        ),
        _ => return None,
    };
    let distributions = files
        .iter()
        .map(|(filename, encoding_format)| {
            json!({
                "@type": "DataDownload",
                "name": filename,
                "encodingFormat": encoding_format,
                "contentUrl": format!("{DATASET_DOWNLOAD_BASE}/{filename}")
            })
        })
        .collect::<Vec<_>>();

    Some(json_ld_script(json!({
        "@context": "https://schema.org",
        "@type": "Dataset",
        "@id": format!("{canonical}#dataset"),
        "name": name,
        "description": description,
        "url": canonical,
        "identifier": identifier,
        "version": "1.0.0",
        "isAccessibleForFree": true,
        "license": DATASET_LICENSE_URL,
        "creator": {
            "@type": "Organization",
            "name": "KREPI TV",
            "url": "https://krepitv.ru/"
        },
        "keywords": keywords,
        "measurementTechnique": "Ручная сверка точного кода модели с официальной карточкой или руководством производителя; спорные значения сохраняются как конфликт, а не угадываются.",
        "variableMeasured": variables,
        "distribution": distributions
    })))
}

fn seo_page_lastmod(page: &SeoPage) -> &'static str {
    if matches!(
        page.id.as_str(),
        "phone-to-tv"
            | "tv-no-signal"
            | "tv-sound-no-picture"
            | "tv-no-sound"
            | "tv-remote-not-working"
            | "laptop-to-tv"
            | "digital-channels"
            | "picture-setup"
            | "vesa"
            | "tv-mount-screws"
            | "mounting-height"
            | "wall-planner"
            | "tv-dimensions"
    ) {
        TRAFFIC_PAGES_UPDATED_AT
    } else {
        CORE_PAGES_UPDATED_AT
    }
}

fn format_mm(value: f64) -> String {
    let formatted = format!("{value:.1}");
    formatted
        .strip_suffix(".0")
        .unwrap_or(&formatted)
        .replace('.', ",")
}

fn wall_mount_screw_measurement(group: &WallMountScrewGroup) -> String {
    if let Some(length) = group.length_mm {
        return format!("{}×{} мм", group.thread, length);
    }
    if group.length_unknown == Some(true) {
        return format!("{} · длина не определена", group.thread);
    }
    let (Some(minimum), Some(maximum)) = (group.engagement_min_mm, group.engagement_max_mm) else {
        return group.thread.clone();
    };
    let range_label = group.range_label.as_deref().unwrap_or("L");
    format!(
        "{} · диапазон {} {}–{} мм",
        group.thread,
        range_label,
        format_mm(minimum),
        format_mm(maximum)
    )
}

fn wall_mount_screws_summary(hardware: &WallMountScrews) -> String {
    hardware
        .groups
        .iter()
        .map(|group| {
            let measurement = wall_mount_screw_measurement(group);
            if hardware.groups.len() == 1 {
                format!("{} × {}", group.quantity, measurement)
            } else {
                format!("{}: {} × {}", group.location, group.quantity, measurement)
            }
        })
        .collect::<Vec<_>>()
        .join("; ")
}

fn tv_product_json_ld(tv: &TvModel, canonical: &str) -> String {
    let vesa_value = tv
        .wall_mount_screws
        .as_ref()
        .and_then(|hardware| hardware.vesa_conflict.as_ref())
        .map(|conflict| {
            format!(
                "Требуется проверка: карточка {} / руководство {}",
                conflict.catalog_value, conflict.manual_value
            )
        })
        .unwrap_or_else(|| format!("{}×{} мм", tv.vesa_width_mm, tv.vesa_height_mm));
    let mut properties = vec![
        json!({ "@type": "PropertyValue", "name": "VESA", "value": vesa_value }),
        json!({ "@type": "PropertyValue", "name": "Серия", "value": tv.series }),
        json!({ "@type": "PropertyValue", "name": "Модельный год", "value": tv.model_year }),
        json!({ "@type": "PropertyValue", "name": "Диагональ", "value": format!("{} дюймов", tv.diagonal_inches) }),
        json!({ "@type": "PropertyValue", "name": "Масса без подставки", "value": format!("{} кг", tv.weight_kg) }),
    ];
    if let Some(hardware) = &tv.wall_mount_screws {
        properties.push(json!({
            "@type": "PropertyValue",
            "name": "Винты VESA по руководству",
            "value": wall_mount_screws_summary(hardware)
        }));
    }

    json_ld_script(json!({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": tv.title,
        "sku": tv.model,
        "url": canonical,
        "category": "Телевизоры",
        "brand": { "@type": "Brand", "name": tv.brand },
        "additionalProperty": properties
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
    let market_verification_meta = if canonical == "https://krepitv.ru/" {
        "<meta name=\"yandex-market-affiliate-verification\" content=\"YMReferral\">\n"
    } else {
        ""
    };
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
        "<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>{title}</title>\n<meta name=\"description\" content=\"{description}\">\n<link rel=\"canonical\" href=\"{canonical}\">\n<link rel=\"icon\" href=\"/favicon.svg\" type=\"image/svg+xml\">\n{market_verification_meta}{robots_meta}<meta property=\"og:locale\" content=\"ru_RU\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:title\" content=\"{title}\">\n<meta property=\"og:description\" content=\"{description}\">\n<meta property=\"og:url\" content=\"{canonical}\">\n<meta name=\"theme-color\" content=\"#F7F5F0\">\n{}</head>\n<body>\n<div id=\"root\" data-page-kind=\"{page_kind}\"{model_attribute}>{static_body}</div>\n<script type=\"module\" src=\"/src/main.jsx\"></script>\n</body>\n</html>\n",
        head.json_ld,
    )
}

fn static_header() -> &'static str {
    "<header class=\"border-b-2 border-ink bg-paper\"><div class=\"mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-8\"><a class=\"font-display text-xl font-extrabold\" href=\"/\">KREPI TV</a><nav class=\"flex flex-wrap gap-5 font-display text-sm font-bold uppercase\" aria-label=\"Основная навигация\"><a href=\"/televizor-pishet-net-signala/\">Нет сигнала</a><a href=\"/kak-podklyuchit-telefon-k-televizoru/\">Телефон → ТВ</a><a href=\"/podbor/\">Подбор</a><a href=\"/modeli/\">Телевизоры</a><a href=\"/kronshteyny/\">Кронштейны</a><a href=\"/razmery-televizora-po-diagonali/\">Размеры ТВ</a><a href=\"/vesa/\">VESA</a></nav></div></header>"
}

fn static_footer() -> &'static str {
    "<footer class=\"border-t-2 border-ink bg-paper\"><nav class=\"mx-auto flex max-w-[1440px] flex-wrap gap-6 px-5 py-7 font-display text-sm font-bold uppercase sm:px-8\" aria-label=\"Инструменты и информация о сервисе\"><a href=\"/televizor-pishet-net-signala/\">Нет сигнала</a><a href=\"/kak-podklyuchit-telefon-k-televizoru/\">Телефон → ТВ</a><a href=\"/podbor/\">Подбор</a><a href=\"/modeli/\">Телевизоры</a><a href=\"/kronshteyny/\">Кронштейны</a><a href=\"/razmery-televizora-po-diagonali/\">Размеры ТВ</a><a href=\"/televizor-na-stene/\">Примерка на стене</a><a href=\"/na-kakoy-vysote-veshat-televizor/\">Высота установки</a><a href=\"/rasstoyanie-do-televizora-i-diagonal/\">Расстояние и диагональ</a><a href=\"/vesa/\">VESA</a><a href=\"/o-proekte/\">О проекте</a><a href=\"/metodika/\">Методика</a><a href=\"/kontakty/\">Контакты</a><a href=\"/politika-konfidencialnosti/\">Конфиденциальность</a></nav></footer>"
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

fn commercial_profile_for<'a>(
    profiles: &'a [CommercialProfile],
    entity_kind: &str,
    entity_id: &str,
) -> Option<&'a CommercialProfile> {
    profiles
        .iter()
        .find(|profile| profile.entity_kind == entity_kind && profile.entity_id == entity_id)
}

fn commercial_profile_html(profile: &CommercialProfile) -> String {
    let heading_id = format!(
        "commercial-profile-{}-{}",
        profile.entity_kind, profile.entity_id
    );
    let faq = profile
        .faq
        .iter()
        .map(|item| {
            format!(
                "<details class=\"group border-t border-line first:border-t-0\"><summary class=\"flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-lg font-bold marker:content-none\"><span>{question}</span><span aria-hidden=\"true\" class=\"font-mono text-xl leading-none group-open:rotate-45\">+</span></summary><p class=\"max-w-3xl pb-4 pr-8 text-sm leading-relaxed text-muted sm:text-base\">{answer}</p></details>",
                question = escape_html(&item.question),
                answer = escape_html(&item.answer),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        "<section aria-labelledby=\"{heading_id}\" class=\"grid gap-6 border-b-2 border-ink py-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)] lg:gap-10\" data-commercial-profile=\"{kind}:{id}\"><div><p class=\"font-mono text-xs uppercase tracking-[0.12em] text-action\">{kicker}</p><h2 class=\"mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl\" id=\"{heading_id}\">{heading}</h2><p class=\"mt-4 max-w-3xl text-base leading-relaxed text-muted sm:text-lg\">{answer}</p></div><div aria-label=\"Частые вопросы\" class=\"border-y border-ink\">{faq}</div></section>",
        heading_id = escape_html(&heading_id),
        kind = escape_html(&profile.entity_kind),
        id = escape_html(&profile.entity_id),
        kicker = escape_html(&profile.kicker),
        heading = escape_html(&profile.heading),
        answer = escape_html(&profile.answer),
        faq = faq,
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
    let mut featured_pages = seo_pages
        .iter()
        .filter(|page| is_indexable_seo_page(page) && page.home_priority.is_some())
        .collect::<Vec<_>>();
    featured_pages.sort_by_key(|page| page.home_priority.unwrap_or(u8::MAX));
    let seo_links = featured_pages
        .into_iter()
        .take(7)
        .map(|page| {
            format!(
                "<a class=\"border border-line bg-white p-5 font-display text-lg font-bold\" data-featured-traffic-tool=\"{}\" href=\"{}\">{}</a>",
                escape_html(&page.id),
                escape_html(&page.path),
                escape_html(&page.h1),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let diagnostic_links = [
        "tv-sound-no-picture",
        "tv-no-sound",
        "tv-remote-not-working",
    ]
    .iter()
    .filter_map(|id| {
        seo_pages
            .iter()
            .find(|page| page.id == *id && is_indexable_seo_page(page))
    })
    .map(|page| {
        format!(
            "<a class=\"flex min-h-28 items-end justify-between gap-4 bg-paper p-5 font-display text-lg font-bold\" data-home-tv-diagnostic=\"{}\" href=\"{}\">{}<span aria-hidden=\"true\">→</span></a>",
            escape_html(&page.id),
            escape_html(&page.path),
            escape_html(page.h1.split(':').next().unwrap_or(&page.h1)),
        )
    })
    .collect::<Vec<_>>()
    .join("\n");

    static_layout(&format!(
        "<div class=\"mx-auto max-w-[1440px] px-5 pb-16 pt-8 sm:px-8\"><header class=\"border-b-2 border-ink pb-8\"><p class=\"font-mono text-xs uppercase text-action\">Независимый технический подбор</p><h1 class=\"mt-3 max-w-[1100px] font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold uppercase leading-[0.92]\">Кронштейн для вашего телевизора</h1><p class=\"mt-6 max-w-3xl text-lg leading-relaxed text-muted\">Введите точную модель: KREPI TV сверит VESA, диагональ и массу с характеристиками кронштейнов. Расчёт выполняется локально в браузере, а материал стены и крепёж всегда проверяются отдельно.</p><a class=\"primary-button mt-6\" href=\"/podbor/\">Начать подбор</a></header><section class=\"py-9\"><p class=\"font-mono text-xs uppercase text-action\">{model_count} моделей с источниками</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Найдите точную модель в каталоге</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Полный список сгруппирован по брендам, чтобы главная оставалась короткой, а каждая модель была доступна через каталог.</p><a class=\"mt-5 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/modeli/\">Открыть все проверенные модели →</a></section><section class=\"border-t border-line py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Что даёт сервис без покупки</h2><ul class=\"mt-5 grid gap-3 text-base leading-relaxed sm:grid-cols-2\"><li>Точный VESA конкретной модели телевизора.</li><li>Проверку массы с запасом нагрузки 25%.</li><li>Калькулятор центра, нижнего и верхнего края экрана.</li><li>Расчёт расстояния до экрана и диагонали в обе стороны.</li><li>Ссылки на официальные источники характеристик.</li></ul></section><section class=\"border-t border-line py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Главные справочники и калькуляторы</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Проверьте физический размер, расположение на стене, высоту и VESA до выбора конкретного кронштейна.</p><nav class=\"mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4\" aria-label=\"Главные справочники и калькуляторы\">{seo_links}</nav><p class=\"mt-5\"><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/kronshteyny/\">Открыть каталог проверенных кронштейнов →</a></p></section><section class=\"border-t border-line py-9\" data-home-tv-diagnostics=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Без разборки и догадок</p><div class=\"mt-2 grid gap-4 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,2fr)] lg:items-end\"><h2 class=\"font-display text-3xl font-extrabold\">Диагностика телевизора</h2><p class=\"max-w-2xl leading-relaxed text-muted\">Выберите наблюдаемый симптом. Мастер даст одну безопасную следующую проверку и остановится там, где нужна инструкция точной модели или официальная поддержка.</p></div><nav class=\"mt-5 grid gap-px border border-line bg-line md:grid-cols-3\" aria-label=\"Диагностика телевизора\">{diagnostic_links}</nav></section></div>",
        model_count = models.len(),
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
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенная база</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Модели телевизоров</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Точные модели с подтверждёнными VESA, массой без подставки и источником. На каждой странице показаны кронштейны, прошедшие единый Rust-расчёт.</p><nav class=\"mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-2\" aria-label=\"Инструменты перед выбором модели\"><a class=\"bg-paper p-5\" href=\"/razmery-televizora-po-diagonali/\"><span class=\"font-mono text-xs uppercase text-action\">Размер до покупки</span><strong class=\"mt-1 block font-display text-2xl\">Ширина и высота по диагонали</strong><span class=\"mt-2 block text-sm leading-relaxed text-muted\">Таблица 16:9, обратный замер и проверка ниши.</span></a><a class=\"bg-paper p-5\" href=\"/vinty-dlya-krepleniya-televizora/\"><span class=\"font-mono text-xs uppercase text-action\">Технический справочник</span><strong class=\"mt-1 block font-display text-2xl\">Винты VESA по точной модели</strong><span class=\"mt-2 block text-sm leading-relaxed text-muted\">Резьба, длина, вставки и официальное руководство.</span></a></nav><nav class=\"mt-9\" aria-label=\"Модели телевизоров\">{items}</nav></article>"
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
    let brand_hubs = [
        ("/kronshteyny-onkron/", "ONKRON"),
        ("/kronshteyny-kromax/", "KROMAX"),
        ("/kronshteyny-holder/", "Holder"),
        ("/kronshteyny-itechmount/", "iTECHmount"),
    ]
    .iter()
    .map(|(href, label)| {
        format!(
            "<a class=\"border border-ink bg-white px-3 py-2 font-display text-sm font-bold\" href=\"{}\">{}</a>",
            escape_html(href),
            escape_html(label),
        )
    })
    .collect::<Vec<_>>()
    .join("\n");
    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенная база</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Кронштейны для телевизоров</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Точные изделия с явными парами VESA, нагрузкой, диапазоном диагоналей и датой проверки. Партнёрская кнопка появляется только у свежего подтверждённого предложения Маркета.</p><nav class=\"mt-7 flex flex-wrap items-center gap-2\" aria-label=\"Сравнение кронштейнов по бренду\"><span class=\"mr-2 font-mono text-xs uppercase text-muted\">Сравнить бренд</span>{brand_hubs}</nav><nav class=\"mt-9\" aria-label=\"Кронштейны\">{items}</nav></article>"
    ))
}

fn wall_mount_screws_html(tv: &TvModel) -> String {
    let Some(hardware) = &tv.wall_mount_screws else {
        return String::new();
    };
    let groups = hardware
        .groups
        .iter()
        .map(|group| {
            let measurement = wall_mount_screw_measurement(group);
            format!(
                "<div class=\"border-t border-line py-3\"><dt class=\"font-mono text-xs uppercase text-muted\">{location}</dt><dd class=\"mt-1 font-display text-2xl font-extrabold\">{quantity} шт. · {measurement}</dd></div>",
                location = escape_html(&group.location),
                quantity = group.quantity,
                measurement = escape_html(&measurement),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let adapters = match hardware.requires_adapters {
        Some(true) => {
            "<p class=\"mt-4 border-l-2 border-action pl-4 font-semibold\">Для этой модели руководство требует использовать показанные адаптеры VESA.</p>"
        }
        Some(false) => "",
        None => {
            "<p class=\"mt-4 border-l-2 border-line pl-4 font-semibold\" data-adapter-status=\"unknown\">Проставки и адаптеры: руководство не указывает их наличие. Сверьте комплект кронштейна и бумажную инструкцию телевизора.</p>"
        }
    };
    let required_parts = hardware
        .required_parts_note
        .as_ref()
        .map(|note| {
            format!(
                "<p class=\"mt-4 border-l-2 border-technical pl-4 font-semibold\">{}</p>",
                escape_html(note)
            )
        })
        .unwrap_or_default();
    let secondary_source = match (
        hardware.secondary_source_url.as_deref(),
        hardware.secondary_source_label.as_deref(),
    ) {
        (Some(url), Some(label)) => format!(
            "<a class=\"inline-flex font-semibold text-technical underline underline-offset-4\" href=\"{}\" rel=\"noreferrer\">{} · дополнительный официальный источник</a>",
            escape_html(url),
            escape_html(label),
        ),
        _ => String::new(),
    };
    let conflict = hardware
        .vesa_conflict
        .as_ref()
        .map(|conflict| {
            format!(
                "<div class=\"mt-4 border-2 border-action bg-paper p-4\" data-vesa-source-conflict=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Расхождение официальных источников</p><p class=\"mt-2 font-display text-xl font-extrabold\">Карточка модели: {catalog} · руководство: {manual}</p><p class=\"mt-2 text-sm leading-relaxed text-muted\">{note}</p></div>",
                catalog = escape_html(&conflict.catalog_value),
                manual = escape_html(&conflict.manual_value),
                note = escape_html(&conflict.note),
            )
        })
        .unwrap_or_default();
    let range_label = hardware
        .groups
        .iter()
        .find(|group| group.engagement_min_mm.is_some())
        .and_then(|group| group.range_label.as_deref())
        .unwrap_or("L");
    let warning = if hardware
        .groups
        .iter()
        .any(|group| group.length_unknown == Some(true))
    {
        "Официальные документы подтверждают резьбу, но не дают единой безопасной длины. Подберите её по бумажной инструкции телевизора и толщине планки кронштейна."
    } else if hardware
        .groups
        .iter()
        .any(|group| group.engagement_min_mm.is_some())
    {
        if range_label == "C" {
            "Диапазон C измеряется после монтажной пластины до конца винта. Это не готовая полная длина покупаемого винта: добавьте толщину пластины кронштейна."
        } else {
            "Диапазон L взят из схемы руководства. Это не готовая полная длина винта: она зависит от толщины планки, шайбы и предусмотренной вставки."
        }
    } else {
        "Это паспортный размер винта, а не глубина резьбового отверстия. Не увеличивайте длину по аналогии; учитывайте только схему и проставки из руководств телевизора и кронштейна."
    };

    format!(
        "<section class=\"mt-6 border-2 border-ink bg-white p-5\" aria-labelledby=\"wall-mount-screws-title\" data-wall-mount-screws=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Паспорт настенного монтажа</p><h2 id=\"wall-mount-screws-title\" class=\"mt-2 font-display text-3xl font-extrabold\">Какие винты нужны для {title}</h2>{conflict}<dl class=\"mt-4 border-b border-line\">{groups}</dl>{adapters}{required_parts}<p class=\"mt-4 text-sm leading-relaxed text-muted\">{note}</p><p class=\"mt-3 text-sm leading-relaxed text-muted\"><strong class=\"text-ink\">Важно:</strong> {warning}</p><div class=\"mt-4 grid gap-2\"><a class=\"inline-flex font-semibold text-technical underline underline-offset-4\" href=\"{source}\" rel=\"noreferrer\">{source_label} · регион: {source_region} · проверено {checked_at}</a>{secondary_source}</div><a class=\"mt-4 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/vinty-dlya-krepleniya-televizora/\">Сравнить винты VESA по моделям телевизоров →</a></section>",
        title = escape_html(&tv.title),
        conflict = conflict,
        groups = groups,
        adapters = adapters,
        required_parts = required_parts,
        note = escape_html(&hardware.note),
        warning = escape_html(warning),
        source = escape_html(&hardware.source_url),
        source_label = escape_html(&hardware.source_label),
        source_region = escape_html(&hardware.source_region),
        checked_at = escape_html(&hardware.checked_at),
        secondary_source = secondary_source,
    )
}

fn model_page_body(
    tv: &TvModel,
    matches: &[MountMatch],
    affiliate_offers: &[PublicAffiliateOffer],
    affiliate_now_seconds: i64,
    seo_pages: &[SeoPage],
    commercial_profile: Option<&CommercialProfile>,
) -> String {
    let compatible = matches
        .iter()
        .filter(|matched| matched.compatible)
        .map(|matched| {
            (
                matched.mount.brand.clone(),
                format!(
                    "<article class=\"grid gap-3 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center\"><div><h3 class=\"font-display text-2xl font-extrabold\">{title}</h3><p class=\"mt-1 text-sm text-muted\">{fit} · {mechanism} · нагрузка до {load} кг</p><p class=\"mt-2 text-sm\">{reasons}</p></div><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/kronshteyny/{id}/\">Кронштейн {title}</a></article>",
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
        .map(|offer| affiliate_offer_placeholder_html(offer, 3))
        .collect::<Vec<_>>()
        .join("\n");
    let affiliate_section = if affiliate_cards.is_empty() {
        String::new()
    } else {
        format!(
            "<section class=\"border-b-2 border-ink py-8\" aria-label=\"Проверка предложений Яндекс Маркета\"><h2 class=\"font-display text-3xl font-extrabold\">Проверяем предложения Яндекс Маркета</h2><p class=\"mt-3 max-w-3xl text-muted\">Прямые кнопки появятся только после клиентской проверки свежести данных и точного совпадения модели кронштейна.</p><div class=\"mt-5 grid gap-5\">{affiliate_cards}</div></section>"
        )
    };
    let vesa_conflict = tv
        .wall_mount_screws
        .as_ref()
        .and_then(|hardware| hardware.vesa_conflict.as_ref());
    let mut context_candidates = vec![
        (
            "tv-dimensions".to_string(),
            "Сверить размеры экрана и корпуса".to_string(),
        ),
        (
            "wall-planner".to_string(),
            "Примерить телевизор на стене".to_string(),
        ),
        (
            "vesa".to_string(),
            "VESA по модели и ручная проверка".to_string(),
        ),
        (
            format!("brand-{}", tv.brand.to_lowercase()),
            format!("Кронштейны для телевизоров {}", tv.brand),
        ),
        (
            format!("diagonal-{}", tv.diagonal_inches),
            format!("Кронштейны для телевизоров {}″", tv.diagonal_inches),
        ),
    ];
    if tv.wall_mount_screws.is_some() {
        context_candidates.push((
            "tv-mount-screws".to_string(),
            "Винты VESA по точной модели".to_string(),
        ));
    }
    if vesa_conflict.is_none() {
        context_candidates.push((
            format!("vesa-{}x{}", tv.vesa_width_mm, tv.vesa_height_mm),
            format!("Модели с VESA {}×{}", tv.vesa_width_mm, tv.vesa_height_mm),
        ));
    }
    let context_links = context_candidates
        .iter()
        .filter_map(|(id, label)| {
            let page = seo_pages
                .iter()
                .find(|page| page.id == *id && is_indexable_seo_page(page))?;
            Some(format!(
                "<a class=\"flex min-h-12 items-center justify-between gap-3 border-t border-line py-3 font-display font-bold first:border-t-0\" href=\"{}\">{} <span aria-hidden=\"true\">→</span></a>",
                escape_html(&page.path),
                escape_html(label),
            ))
        })
        .collect::<Vec<_>>()
        .join("\n");
    let context_section = if context_links.is_empty() {
        String::new()
    } else {
        format!(
            "<nav class=\"mt-5 border-y border-line\" aria-label=\"Связанные подборы\">{context_links}</nav>"
        )
    };
    let commercial_section = commercial_profile
        .map(commercial_profile_html)
        .unwrap_or_default();
    let wall_mount_screws = wall_mount_screws_html(tv);
    let vesa_fact = vesa_conflict
        .map(|conflict| {
            format!(
                "Проверить: {} / {}",
                escape_html(&conflict.catalog_value),
                escape_html(&conflict.manual_value)
            )
        })
        .unwrap_or_else(|| format!("{}×{} мм", tv.vesa_width_mm, tv.vesa_height_mm));
    let compatibility_lead = if vesa_conflict.is_some() {
        "Официальные источники расходятся по VESA. Не считайте список окончательным до измерения отверстий; отдельно проверьте VESA, нагрузку и диапазон диагонали каждого кронштейна."
    } else {
        "Все варианты проходят точную пару VESA и запас нагрузки 25%. Паспортный диапазон диагонали показан отдельно в статусе каждой позиции."
    };

    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенная модель · {series} · {year}</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Кронштейн для {title}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Сначала сопоставьте монтажные отверстия VESA и массу телевизора, затем проверьте стену, крепёж, доступ к разъёмам и геометрию монтажной пластины.</p>{commercial_section}<dl class=\"mt-8 grid gap-4 border-y-2 border-ink py-6 sm:grid-cols-3\"><div><dt class=\"font-mono text-xs uppercase text-muted\">VESA</dt><dd class=\"mt-1 font-display text-2xl font-extrabold sm:text-3xl\">{vesa_fact}</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{diagonal}″</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Масса без подставки</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{weight} кг</dd></div></dl>{wall_mount_screws}{context_section}{affiliate_section}<section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Подходящие кронштейны</h2><p class=\"mt-3 max-w-3xl text-muted\">{compatibility_lead}</p><div class=\"mt-5\">{compatible}</div></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Размеры и источник</h2><p class=\"mt-3 text-lg text-muted\">Серия {series}, модельный год {year}. Корпус {width}×{height}×{depth} мм без подставки. Данные проверены {checked_at}.</p><a class=\"mt-5 inline-flex font-semibold text-technical underline underline-offset-4\" href=\"{source}\" rel=\"noreferrer\">Источник характеристик: {source_label}</a></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Что сервис не подтверждает автоматически</h2><p class=\"mt-3 text-lg leading-relaxed text-muted\">Состояние стены, тип анкеров, скрытую проводку, перекрытие разъёмов и положение VESA относительно геометрического центра экрана необходимо проверить на месте.</p><a class=\"mt-5 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Открыть полную методику</a></section></article>",
        title = escape_html(&tv.title),
        series = escape_html(&tv.series),
        year = tv.model_year,
        vesa_fact = vesa_fact,
        diagonal = tv.diagonal_inches,
        weight = tv.weight_kg,
        width = tv.width_mm,
        height = tv.height_mm,
        depth = tv.depth_mm,
        checked_at = escape_html(&tv.checked_at),
        source = escape_html(&tv.source_url),
        source_label = escape_html(&tv.source_label),
        affiliate_section = affiliate_section,
        context_section = context_section,
        commercial_section = commercial_section,
        compatibility_lead = escape_html(compatibility_lead),
    ))
}

fn mount_page_body(
    mount: &Mount,
    models: &[TvModel],
    graph: &[CompatibilityEdge],
    affiliate_offers: &[PublicAffiliateOffer],
    affiliate_now_seconds: i64,
    commercial_profile: Option<&CommercialProfile>,
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
                "<article class=\"grid gap-3 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center\"><div><h3 class=\"font-display text-2xl font-extrabold\">{title}</h3><p class=\"mt-1 text-sm text-muted\">{fit} · VESA {vesa_w}×{vesa_h} мм · {weight} кг без подставки</p><p class=\"mt-2 text-sm\">{evidence}</p></div><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/modeli/{id}/\">Телевизор {title}</a></article>",
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
                affiliate_offer_placeholder_html(offer, 2),
            )
        })
        .unwrap_or_default();
    let mut context_links = vec![(
        "/kupit-kronshteyn-dlya-televizora/",
        "Сравнить все проверенные кронштейны",
    )];
    if mount.mechanism == "full-motion" {
        context_links.push((
            "/tipy-kronshteynov/vydvizhnoy/",
            "Выдвижные кронштейны и расчёт вылета",
        ));
    }
    let mechanism_hub = match mount.mechanism.as_str() {
        "fixed" => Some((
            "/tipy-kronshteynov/fiksirovannyy/",
            "Фиксированные кронштейны",
        )),
        "tilt" => Some((
            "/tipy-kronshteynov/naklonnyy/",
            "Наклонные кронштейны и расчёт угла",
        )),
        "full-motion" => Some(("/tipy-kronshteynov/povorotnyy/", "Поворотные кронштейны")),
        _ => None,
    };
    if let Some(link) = mechanism_hub {
        context_links.push(link);
    }
    let brand_hub = match mount.brand.to_ascii_lowercase().as_str() {
        "holder" => Some(("/kronshteyny-holder/", "Все кронштейны Holder")),
        "itechmount" => Some(("/kronshteyny-itechmount/", "Все кронштейны iTECHmount")),
        "kromax" => Some(("/kronshteyny-kromax/", "Все кронштейны KROMAX")),
        "onkron" => Some(("/kronshteyny-onkron/", "Все кронштейны ONKRON")),
        _ => None,
    };
    if let Some(link) = brand_hub {
        context_links.push(link);
    }
    let context_links = context_links
        .iter()
        .map(|(href, label)| {
            format!(
                "<a class=\"flex min-h-12 items-center justify-between gap-3 border-t border-line py-3 font-display font-bold first:border-t-0\" href=\"{}\">{} <span aria-hidden=\"true\">→</span></a>",
                escape_html(href),
                escape_html(label),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let context_section = format!(
        "<nav class=\"mt-5 border-y border-line\" aria-label=\"Связанные подборы кронштейнов\">{context_links}</nav>"
    );
    let commercial_section = commercial_profile
        .map(commercial_profile_html)
        .unwrap_or_default();

    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенный кронштейн</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">{title}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Отдельная карточка изделия с явными парами VESA и двусторонним списком моделей телевизоров. Покупка не нужна для получения результата проверки.</p><dl class=\"mt-8 grid gap-4 border-y-2 border-ink py-6 sm:grid-cols-3\"><div><dt class=\"font-mono text-xs uppercase text-muted\">Механизм</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{mechanism}</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Нагрузка</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">до {load} кг</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{min_diagonal}–{max_diagonal}″</dd></div></dl>{context_section}{commercial_section}{affiliate_section}<section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Поддерживаемые VESA</h2><p class=\"mt-3 font-mono text-sm leading-7\">{vesa}</p><p class=\"mt-4 text-muted\">Расстояние от стены: {distance}. Данные проверены {checked_at}.</p><a class=\"mt-5 inline-flex font-semibold text-technical underline underline-offset-4\" href=\"{source}\" rel=\"noreferrer\">Источник характеристик: {source_label}</a></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Подтверждённые популярные телевизоры</h2><p class=\"mt-3 max-w-3xl text-muted\">Показаны модели, которые проходят точную VESA, запас нагрузки и паспортный диапазон диагонали.</p><div class=\"mt-5\">{verified_rows}</div>{conditional_section}</section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Перед монтажом</h2><p class=\"mt-3 text-lg leading-relaxed text-muted\">Отдельно проверьте винты телевизора, перекрытие портов, геометрию пластины, основание стены, анкеры и скрытые коммуникации.</p><a class=\"mt-5 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Методика проверки</a></section></article>",
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
        context_section = context_section,
        commercial_section = commercial_section,
        verified_rows = verified_rows,
        conditional_section = conditional_section,
    ))
}

fn related_seo_pages<'a>(page: &SeoPage, pages: &'a [SeoPage]) -> Vec<&'a SeoPage> {
    let preferred_ids: &[&str] = if page.id == "tv-mount-screws" {
        &[
            "vesa",
            "how-to-find-vesa",
            "mounting-map",
            "wall-mounted-tv",
            "buy-tv-mount",
            "fixed-mount",
        ]
    } else if page.kind == "mount-brand" {
        &[
            "buy-tv-mount",
            "extendable-mount",
            "full-motion-mount",
            "tilt-mount",
            "mount-brand-onkron",
            "mount-brand-kromax",
            "mount-brand-holder",
            "mount-brand-itechmount",
        ]
    } else if page.kind == "brand" {
        &[
            "diagonal-50",
            "diagonal-55",
            "diagonal-75",
            "vesa-300x300",
            "vesa-400x400",
            "brand-lg",
            "brand-samsung",
            "brand-hisense",
            "brand-tcl",
            "brand-xiaomi",
        ]
    } else if page.kind == "diagonal" {
        &[
            "tv-dimensions",
            "buy-tv-mount",
            "mounting-height",
            "vesa",
            "brand-lg",
            "brand-samsung",
            "brand-hisense",
            "brand-tcl",
            "brand-xiaomi",
        ]
    } else if page.kind == "vesa" {
        &[
            "vesa",
            "how-to-find-vesa",
            "buy-tv-mount",
            "diagonal-50",
            "diagonal-55",
            "diagonal-75",
            "brand-lg",
            "brand-samsung",
        ]
    } else {
        match page.id.as_str() {
            "tv-no-signal" => &[
                "tv-sound-no-picture",
                "digital-channels",
                "laptop-to-tv",
                "phone-to-tv",
                "picture-setup",
                "tv-no-sound",
            ],
            "tv-sound-no-picture" => &[
                "tv-no-signal",
                "picture-setup",
                "tv-no-sound",
                "tv-remote-not-working",
                "laptop-to-tv",
                "phone-to-tv",
            ],
            "tv-no-sound" => &[
                "tv-sound-no-picture",
                "tv-no-signal",
                "tv-remote-not-working",
                "digital-channels",
                "picture-setup",
                "laptop-to-tv",
            ],
            "tv-remote-not-working" => &[
                "tv-no-sound",
                "tv-sound-no-picture",
                "tv-no-signal",
                "digital-channels",
                "phone-to-tv",
                "laptop-to-tv",
            ],
            "phone-to-tv" => &[
                "laptop-to-tv",
                "tv-no-signal",
                "picture-setup",
                "tv-dimensions",
                "wall-planner",
                "viewing-distance",
            ],
            "laptop-to-tv" => &[
                "tv-no-signal",
                "phone-to-tv",
                "picture-setup",
                "digital-channels",
                "tv-dimensions",
                "viewing-distance",
            ],
            "digital-channels" => &[
                "tv-no-signal",
                "picture-setup",
                "laptop-to-tv",
                "phone-to-tv",
                "tv-dimensions",
                "viewing-distance",
            ],
            "picture-setup" => &[
                "viewing-distance",
                "tv-dimensions",
                "wall-planner",
                "tv-no-signal",
                "laptop-to-tv",
                "phone-to-tv",
            ],
            "wall-mounted-tv" => &[
                "wall-planner",
                "mounting-map",
                "tv-zone-sockets",
                "vesa",
                "full-motion-mount",
                "mounting-height",
            ],
            "wall-planner" => &[
                "tv-dimensions",
                "mounting-height",
                "mounting-map",
                "tv-zone-sockets",
                "viewing-distance",
                "wall-mounted-tv",
            ],
            "tv-dimensions" => &[
                "wall-planner",
                "viewing-distance",
                "diagonal-43",
                "diagonal-55",
                "diagonal-65",
                "mounting-height",
            ],
            "mounting-map" => &[
                "tv-mount-screws",
                "tv-zone-sockets",
                "wall-mounted-tv",
                "mounting-height",
                "vesa",
                "how-to-find-vesa",
            ],
            "tv-zone-sockets" => &["mounting-map", "wall-mounted-tv", "mounting-height", "vesa"],
            "vesa" => &[
                "tv-mount-screws",
                "wall-mounted-tv",
                "how-to-find-vesa",
                "vesa-200x200",
            ],
            "fixed-mount" => &[
                "buy-tv-mount",
                "mount-brand-onkron",
                "wall-mounted-tv",
                "tilt-mount",
                "full-motion-mount",
                "mounting-height",
            ],
            "tilt-mount" => &[
                "buy-tv-mount",
                "mount-brand-onkron",
                "mounting-height",
                "mounting-map",
                "wall-mounted-tv",
                "fixed-mount",
            ],
            "full-motion-mount" => &[
                "extendable-mount",
                "buy-tv-mount",
                "mount-brand-onkron",
                "wall-mounted-tv",
                "fixed-mount",
                "tilt-mount",
            ],
            "buy-tv-mount" => &[
                "wall-mounted-tv",
                "extendable-mount",
                "mount-brand-onkron",
                "vesa",
                "fixed-mount",
                "tilt-mount",
            ],
            "extendable-mount" => &[
                "buy-tv-mount",
                "full-motion-mount",
                "wall-mounted-tv",
                "mount-brand-onkron",
                "vesa",
                "mounting-map",
            ],
            "how-to-find-vesa" => &["tv-mount-screws", "vesa", "vesa-200x200", "vesa-300x200"],
            "mounting-height" => &[
                "wall-planner",
                "mounting-map",
                "tilt-mount",
                "tv-zone-sockets",
                "wall-mounted-tv",
                "viewing-distance",
                "diagonal-55",
            ],
            "viewing-distance" => &[
                "tv-dimensions",
                "mounting-height",
                "diagonal-55",
                "full-motion-mount",
            ],
            _ => &["vesa", "how-to-find-vesa", "mounting-height"],
        }
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
    related.truncate(6);
    related
}

fn seo_calculator_note(page_id: &str) -> &'static str {
    match page_id {
        "tv-sound-no-picture" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-diagnostic-answer="tv-sound-no-picture" data-tv-diagnostic-task="tv-sound-no-picture"><p class="font-mono text-xs uppercase text-action">Наблюдение → следующая проверка</p><h2 class="mt-2 font-display text-3xl font-extrabold">Отделите экран телевизора от выбранного источника</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Используйте только собственное меню, индикатор громкости и поддерживаемый встроенный тест телевизора. Эти наблюдения выбирают следующий безопасный шаг, но не устанавливают причину и не заменяют проверку точной модели.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-diagnostic-branch="own-interface-visible"><p class="font-mono text-xs uppercase text-action">Меню или громкость видны</p><h3 class="mt-2 font-display text-2xl font-extrabold">Проверьте текущий источник</h3><p class="mt-3 text-sm leading-relaxed text-muted">Сопоставьте выбранный вход с подключённым устройством. Если экран показывает «Нет сигнала», перейдите к <a class="font-semibold text-action underline underline-offset-4" href="/televizor-pishet-net-signala/">отдельной проверке сигнала</a>.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="one-input-only"><p class="font-mono text-xs uppercase text-action">Только один вход</p><h3 class="mt-2 font-display text-2xl font-extrabold">Изолируйте соединение</h3><p class="mt-3 text-sm leading-relaxed text-muted">Выключите телевизор и источник, затем переподключите доступный сигнальный кабель. При возможности сравните прямое соединение без промежуточного устройства.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="no-own-interface"><p class="font-mono text-xs uppercase text-action">Интерфейс не виден</p><h3 class="mt-2 font-display text-2xl font-extrabold">Остановитесь у поддержки</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если не видны меню, индикатор громкости и доступный встроенный тест, не называйте неисправную деталь: используйте официальную поддержку точной модели.</p></article></div><p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-diagnostic-stop="true">Не разбирайте телевизор, пульт или подключённые устройства и не выполняйте электрические измерения. При повреждении, жидкости, запахе гари, дыме, необычном нагреве или мигающем красном индикаторе прекратите самостоятельную проверку.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники проверки изображения"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/what-to-do-if-there-is-black-screen-on-samsung-tv/" rel="noreferrer" target="_blank" data-tv-diagnostic-source="samsung-black-screen">Samsung: чёрный экран</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20155333777203" rel="noreferrer" target="_blank" data-tv-diagnostic-source="lg-sound-but-no-picture">LG: звук без изображения</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00173823" rel="noreferrer" target="_blank" data-tv-diagnostic-source="sony-picture-sound-test">Sony: встроенный тест</a></nav></section>"#
        }
        "tv-no-sound" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-diagnostic-answer="tv-no-sound" data-tv-diagnostic-task="tv-no-sound"><p class="font-mono text-xs uppercase text-action">Наблюдение → следующая проверка</p><h2 class="mt-2 font-display text-3xl font-extrabold">Отделите аудиовыход от канала или устройства</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Сначала подтвердите, откуда должен идти звук: из динамиков телевизора, наушников или внешней аудиосистемы. Затем сравните несколько источников и встроенный тест, если он предусмотрен инструкцией модели.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-diagnostic-branch="one-source-only"><p class="font-mono text-xs uppercase text-action">Один канал, вход или приложение</p><h3 class="mt-2 font-display text-2xl font-extrabold">Проверьте этот источник</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если другие источники звучат, не классифицируйте весь телевизор как неисправный. Продолжите по инструкции приложения, устройства или провайдера.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="output-not-confirmed"><p class="font-mono text-xs uppercase text-action">Выход не подтверждён</p><h3 class="mt-2 font-display text-2xl font-extrabold">Выберите ожидаемый звук</h3><p class="mt-3 text-sm leading-relaxed text-muted">Проверьте отключение звука и текущий аудиовыход. Для встроенных динамиков временно исключите доступные наушники или внешнюю аудиосистему по инструкции модели.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="sound-test-silent"><p class="font-mono text-xs uppercase text-action">Тест тихий или недоступен</p><h3 class="mt-2 font-display text-2xl font-extrabold">Нужна точная модель</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если динамики телевизора явно выбраны, а поддерживаемый тест не звучит или отсутствует, остановитесь и обратитесь в официальную поддержку без предположения о детали.</p></article></div><p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-diagnostic-stop="true">Не выполняйте заводской сброс как первый шаг и не открывайте телевизор или внешнюю аудиосистему. При повреждении, жидкости, запахе гари, дыме, необычном нагреве или мигающем красном индикаторе прекратите самостоятельную проверку.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники проверки звука"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/there-is-not-sound-on-tv/" rel="noreferrer" target="_blank" data-tv-diagnostic-source="samsung-no-sound">Samsung: нет звука</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20153413213150OLT" rel="noreferrer" target="_blank" data-tv-diagnostic-source="lg-no-sound">LG: проверка звука</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00173823" rel="noreferrer" target="_blank" data-tv-diagnostic-source="sony-picture-sound-test">Sony: встроенный тест</a></nav></section>"#
        }
        "tv-remote-not-working" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-diagnostic-answer="tv-remote-not-working" data-tv-diagnostic-task="tv-remote-not-working"><p class="font-mono text-xs uppercase text-action">Наблюдение → следующая проверка</p><h2 class="mt-2 font-display text-3xl font-extrabold">Сначала определите устройство и доступное управление</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Пульт телевизора, приставки и саундбара — разные устройства. Сравните доступную штатную кнопку или подтверждённое приложение; тип пульта и порядок сопряжения берите только из инструкции точной модели.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-diagnostic-branch="external-device-remote"><p class="font-mono text-xs uppercase text-action">Каналы открывает приставка</p><h3 class="mt-2 font-display text-2xl font-extrabold">Возьмите её пульт</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если меню каналов принадлежит операторской приставке, проверяйте её собственный или настроенный универсальный пульт по инструкции оператора.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="confirmed-infrared"><p class="font-mono text-xs uppercase text-action">Инструкция подтверждает ИК</p><h3 class="mt-2 font-display text-2xl font-extrabold">Батарейки → обзор</h3><p class="mt-3 text-sm leading-relaxed text-muted">Проверьте заряд, полярность, зажатые кнопки и предметы перед приёмником. Камера даёт лишь наблюдение ИК-сигнала и не проверяет телевизор.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="smart-or-unknown"><p class="font-mono text-xs uppercase text-action">Умный или неизвестный пульт</p><h3 class="mt-2 font-display text-2xl font-extrabold">Инструкция точной модели</h3><p class="mt-3 text-sm leading-relaxed text-muted">Не угадывайте сочетание кнопок. Для подтверждённого Android TV телефон может стать пультом только при совместимости, одной сети и доступном экранном сопряжении.</p></article></div><p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-diagnostic-stop="true">Не открывайте пульт дальше батарейного отсека и не перемещайте настенный телевизор ради доступа к кнопке. При коррозии, жидкости, вздутой или горячей батарейке, повреждении либо мигающем красном индикаторе остановитесь и обратитесь в официальную поддержку.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники проверки пульта"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/tv-remote-control-is-not-working/" rel="noreferrer" target="_blank" data-tv-diagnostic-source="samsung-remote-not-working">Samsung: пульт не работает</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00256916" rel="noreferrer" target="_blank" data-tv-diagnostic-source="sony-remote-not-working">Sony: типы пультов</a><a class="text-technical underline underline-offset-4" href="https://support.google.com/androidtv/answer/6122465?hl=ru" rel="noreferrer" target="_blank" data-tv-diagnostic-source="google-android-tv-phone-remote">Google: телефон как пульт</a></nav></section>"#
        }
        "laptop-to-tv" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-traffic-answer="laptop-to-tv"><p class="font-mono text-xs uppercase text-action">Сначала технология, потом кабель</p><h2 class="mt-2 font-display text-3xl font-extrabold">Три проверяемых пути от ноутбука к телевизору</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Для HDMI нужен подтверждённый видеовыход и совпадающий вход телевизора. Для USB-C сначала проверьте DisplayPort Alt Mode, Thunderbolt или явную поддержку внешнего дисплея у точной модели. Для связи без провода должна совпасть технология на обоих устройствах: Miracast для совместимой пары Windows либо AirPlay для совместимой пары Mac.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-traffic-branch="laptop-hdmi"><p class="font-mono text-xs uppercase text-action">HDMI</p><h3 class="mt-2 font-display text-2xl font-extrabold">Вход → режим экранов</h3><p class="mt-3 text-sm leading-relaxed text-muted">Выберите физически подключённый HDMI. В Windows используйте Win + P; на Mac откройте настройки дисплеев.</p></article><article class="bg-paper p-5" data-tv-traffic-branch="laptop-usb-c"><p class="font-mono text-xs uppercase text-action">USB-C</p><h3 class="mt-2 font-display text-2xl font-extrabold">Сначала видеовыход</h3><p class="mt-3 text-sm leading-relaxed text-muted">Форма разъёма не доказывает передачу видео. Не покупайте адаптер до проверки спецификации ноутбука.</p></article><article class="bg-paper p-5" data-tv-traffic-branch="laptop-wireless"><p class="font-mono text-xs uppercase text-action">Без провода</p><h3 class="mt-2 font-display text-2xl font-extrabold">Один общий протокол</h3><p class="mt-3 text-sm leading-relaxed text-muted">Win + K ищет Miracast-приёмники; Mac использует AirPlay с совместимым телевизором.</p></article></div><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Источники подключения ноутбука"><a class="text-technical underline underline-offset-4" href="https://support.microsoft.com/ru-RU/Windows/Hardware/Display-Graphics/how-to-use-multiple-monitors-in-windows" rel="noreferrer" target="_blank" data-tv-traffic-source="microsoft-multiple-displays">Microsoft: экраны Windows</a><a class="text-technical underline underline-offset-4" href="https://support.apple.com/ru-ru/guide/mac-help/mchlp1206/mac" rel="noreferrer" target="_blank" data-tv-traffic-source="apple-mac-tv-display">Apple: телевизор как дисплей Mac</a><a class="text-technical underline underline-offset-4" href="https://support.apple.com/ru-ru/guide/mac-help/mchld7e543a0/mac" rel="noreferrer" target="_blank" data-tv-traffic-source="apple-mac-airplay">Apple: AirPlay</a></nav></section>"#
        }
        "digital-channels" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-traffic-answer="digital-channels"><p class="font-mono text-xs uppercase text-action">Не стирайте список наугад</p><h2 class="mt-2 font-display text-3xl font-extrabold">Определите, где настраиваются каналы</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Коаксиальный кабель прямо в ANT/RF телевизора означает поиск встроенным тюнером. HDMI или AV от отдельной коробки означает внешнюю приставку: список каналов и параметры настраиваются её пультом. Для прямого кабеля оператора нужны его параметры сети.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-traffic-branch="channels-antenna"><p class="font-mono text-xs uppercase text-action">Эфирная антенна</p><h3 class="mt-2 font-display text-2xl font-extrabold">DVB-T2 → Эфир → поиск</h3><p class="mt-3 text-sm leading-relaxed text-muted">Проверьте поддержку DVB-T2 и доступное соединение, затем выбирайте цифровой эфирный поиск.</p></article><article class="bg-paper p-5" data-tv-traffic-branch="channels-cable"><p class="font-mono text-xs uppercase text-action">Кабель оператора</p><h3 class="mt-2 font-display text-2xl font-extrabold">DVB-C → параметры сети</h3><p class="mt-3 text-sm leading-relaxed text-muted">Частоту, тип поиска и другие обязательные значения берите у своего оператора, а не у другого города.</p></article><article class="bg-paper p-5" data-tv-traffic-branch="channels-box"><p class="font-mono text-xs uppercase text-action">Внешняя приставка</p><h3 class="mt-2 font-display text-2xl font-extrabold">Вход ТВ → меню приставки</h3><p class="mt-3 text-sm leading-relaxed text-muted">Телевизор показывает готовый видеосигнал; настройку выполняйте по инструкции приставки или оператора.</p></article></div><p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold">Не поднимайтесь к антенне на крышу и не ремонтируйте общедомовую сеть самостоятельно.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Источники настройки цифровых каналов"><a class="text-technical underline underline-offset-4" href="https://plus.rtrs.ru/info/" rel="noreferrer" target="_blank" data-tv-traffic-source="rtrs-digital-terrestrial">РТРС: эфирное цифровое ТВ</a><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/where-can-i-find-free-channels-on-my-samsung-tv/" rel="noreferrer" target="_blank" data-tv-traffic-source="samsung-channel-setup">Samsung: типы каналов</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20153413221090" rel="noreferrer" target="_blank" data-tv-traffic-source="lg-channel-autotune">LG: автопоиск каналов</a></nav></section>"#
        }
        "picture-setup" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-traffic-answer="picture-setup"><p class="font-mono text-xs uppercase text-action">Обратимая настройка</p><h2 class="mt-2 font-display text-3xl font-extrabold">Меняйте один параметр и сравнивайте один фрагмент</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Запишите текущий вход, режим и исходные значения. Выберите режим под контент, зафиксируйте обычное освещение комнаты и меняйте один параметр за раз. HDR настраивайте только во время подтверждённого HDR-сигнала; пункты меню могут различаться по модели и источнику.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-traffic-branch="picture-movie"><p class="font-mono text-xs uppercase text-action">Фильмы</p><h3 class="mt-2 font-display text-2xl font-extrabold">Нейтральный режим</h3><p class="mt-3 text-sm leading-relaxed text-muted">Сравнивайте в постоянном вечернем свете и не переносите чужие числовые значения на свою панель.</p></article><article class="bg-paper p-5" data-tv-traffic-branch="picture-game"><p class="font-mono text-xs uppercase text-action">Игры</p><h3 class="mt-2 font-display text-2xl font-extrabold">Сначала задержка</h3><p class="mt-3 text-sm leading-relaxed text-muted">Включите игровой режим на нужном входе и проверьте управление до дополнительной обработки движения.</p></article><article class="bg-paper p-5" data-tv-traffic-branch="picture-check"><p class="font-mono text-xs uppercase text-action">Проверка</p><h3 class="mt-2 font-display text-2xl font-extrabold">Встроенный тест</h3><p class="mt-3 text-sm leading-relaxed text-muted">Тест изображения помогает сравнить источник с самим телевизором, но не ставит диагноз панели.</p></article></div><p class="mt-6 border-l-2 border-action pl-4 text-sm font-semibold">Это обратимая базовая настройка без измерительного прибора, а не профессиональная калибровка.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Источники настройки изображения"><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00190409" rel="noreferrer" target="_blank" data-tv-traffic-source="sony-picture-settings">Sony: настройки изображения</a><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/how-to-run-test-image-on-samsung-tv/" rel="noreferrer" target="_blank" data-tv-traffic-source="samsung-picture-test">Samsung: тест изображения</a><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/smart-tv-game-mode-turn-on/" rel="noreferrer" target="_blank" data-tv-traffic-source="samsung-game-mode">Samsung: игровой режим</a></nav></section>"#
        }
        "tv-no-signal" => {
            "<section class=\"border-y-2 border-ink py-7\" data-tv-no-signal-answer=\"true\" data-tv-no-signal-reference=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Диагностика без догадок</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Сначала определите источник сообщения</h2><p class=\"mt-3 max-w-4xl leading-relaxed text-muted\">Откройте собственное меню телевизора или измените громкость. Если индикатор виден, телевизор способен отрисовать свой интерфейс — можно переходить к выбранному входу, внешнему устройству и кабелю. Если не виден, мастер не устанавливает причину и останавливает обычную диагностику сигнала.</p><div class=\"mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-2\"><article class=\"bg-paper p-5\" data-tv-no-signal-branch=\"hdmi\"><p class=\"font-mono text-xs uppercase text-action\">HDMI</p><h3 class=\"mt-2 font-display text-2xl font-extrabold\">Вход → питание → прямая цепочка</h3><p class=\"mt-3 text-sm leading-relaxed text-muted\">Сопоставьте Source/Input с разъёмом, проверьте питание источника и временно уберите переходники, ресивер или саундбар.</p></article><article class=\"bg-paper p-5\" data-tv-no-signal-branch=\"terrestrial\"><p class=\"font-mono text-xs uppercase text-action\">Эфир</p><h3 class=\"mt-2 font-display text-2xl font-extrabold\">Кабель → TV/DTV → поиск</h3><p class=\"mt-3 text-sm leading-relaxed text-muted\">Сначала проверьте доступное антенное соединение и источник. Не поднимайтесь к антенне на крышу.</p></article><article class=\"bg-paper p-5\" data-tv-no-signal-branch=\"provider\"><p class=\"font-mono text-xs uppercase text-action\">Приставка оператора</p><h3 class=\"mt-2 font-display text-2xl font-extrabold\">Кто показывает надпись</h3><p class=\"mt-3 text-sm leading-relaxed text-muted\">Если видны меню или логотип приставки, телевизор уже получает её изображение: дальнейшую ветку определяет оператор.</p></article><article class=\"bg-paper p-5\" data-tv-no-signal-branch=\"satellite\"><p class=\"font-mono text-xs uppercase text-action\">Спутник</p><h3 class=\"mt-2 font-display text-2xl font-extrabold\">Только доступные проверки</h3><p class=\"mt-3 text-sm leading-relaxed text-muted\">Проверьте питание приёмника, доступный кабель, погоду и препятствия. Фирменные шаги уточняйте у своего оператора; недоступную антенну должен проверять специалист.</p></article></div><p class=\"mt-6 border-l-2 border-danger pl-4 text-sm font-semibold\">Не разбирайте телевизор и не поднимайтесь к антенне на крышу.</p><div class=\"mt-7\"><h3 class=\"font-display text-2xl font-extrabold\">Официальные инструкции</h3><nav class=\"mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold\" aria-label=\"Источники диагностики сигнала\"><a class=\"text-technical underline underline-offset-4\" href=\"https://www.samsung.com/ru/support/tv-audio-video/no-signal-while-connect-devices-through-hdmi/\" rel=\"noreferrer\" target=\"_blank\" data-tv-no-signal-source=\"samsung-hdmi\">Samsung: HDMI</a><a class=\"text-technical underline underline-offset-4\" href=\"https://www.sony.ru/electronics/support/articles/00298459\" rel=\"noreferrer\" target=\"_blank\" data-tv-no-signal-source=\"sony-hdmi\">Sony: HDMI</a><a class=\"text-technical underline underline-offset-4\" href=\"https://plus.rtrs.ru/info/\" rel=\"noreferrer\" target=\"_blank\" data-tv-no-signal-source=\"rtrs-dtv\">РТРС: эфирное ТВ</a></nav></div></section>"
        }
        "phone-to-tv" => {
            "<section class=\"border-y-2 border-ink py-7\" data-phone-tv-answer=\"true\" data-phone-tv-reference=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Подключение без угадываний</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Какой способ подходит вашей паре устройств</h2><p class=\"mt-3 max-w-4xl leading-relaxed text-muted\">Сначала выберите задачу: повтор всего экрана или передача видео из приложения. Затем подтвердите одну технологию на обоих устройствах. Одного слова Smart TV, Android или USB-C для совместимости недостаточно.</p><div class=\"mt-7 overflow-x-auto border border-ink\"><table class=\"w-full min-w-[42rem] border-collapse text-left text-sm\"><thead class=\"bg-ink font-mono text-xs uppercase text-white\"><tr><th class=\"px-4 py-3\" scope=\"col\">Способ</th><th class=\"px-4 py-3\" scope=\"col\">Для чего</th><th class=\"px-4 py-3\" scope=\"col\">Что обязательно проверить</th></tr></thead><tbody class=\"divide-y divide-line bg-white\"><tr data-phone-tv-method=\"airplay\"><th class=\"px-4 py-3\" scope=\"row\">AirPlay</th><td class=\"px-4 py-3\">Видео и экран iPhone</td><td class=\"px-4 py-3\">AirPlay на ТВ и одна сеть Wi-Fi</td></tr><tr data-phone-tv-method=\"google-cast\"><th class=\"px-4 py-3\" scope=\"row\">Google Cast</th><td class=\"px-4 py-3\">Видео из совместимого приложения</td><td class=\"px-4 py-3\">Cast на ТВ, кнопка в приложении и одна сеть</td></tr><tr data-phone-tv-method=\"miracast\"><th class=\"px-4 py-3\" scope=\"row\">Miracast / Smart View</th><td class=\"px-4 py-3\">Экран Android</td><td class=\"px-4 py-3\">Явная поддержка у телефона и телевизора</td></tr><tr data-phone-tv-method=\"hdmi-adapter\"><th class=\"px-4 py-3\" scope=\"row\">HDMI</th><td class=\"px-4 py-3\">Проводной экран</td><td class=\"px-4 py-3\">Видеовыход телефона, правильный адаптер и вход HDMI</td></tr><tr data-phone-tv-method=\"usb\"><th class=\"px-4 py-3\" scope=\"row\">Обычный USB</th><td class=\"px-4 py-3\">Питание или совместимые файлы</td><td class=\"px-4 py-3\">Не считать универсальным видеовходом</td></tr></tbody></table></div><div class=\"mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3\"><article class=\"bg-paper p-5\"><h3 class=\"font-display text-2xl font-extrabold\">AirPlay и Cast различаются</h3><p class=\"mt-2 text-sm leading-relaxed text-muted\">Cast из приложения не равен универсальному повтору всего экрана iPhone.</p></article><article class=\"bg-paper p-5\"><h3 class=\"font-display text-2xl font-extrabold\">USB-C не гарантирует видео</h3><p class=\"mt-2 text-sm leading-relaxed text-muted\">Для Android нужен явно заявленный DisplayPort Alt Mode или другой проводной видеовыход.</p></article><article class=\"bg-paper p-5\"><h3 class=\"font-display text-2xl font-extrabold\">Неизвестно — значит проверяем</h3><p class=\"mt-2 text-sm leading-relaxed text-muted\">Бренд и год выпуска не превращаются в обещание совместимости без паспорта модели.</p></article></div><div class=\"mt-7\"><h3 class=\"font-display text-2xl font-extrabold\">Официальные инструкции</h3><nav class=\"mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold\" aria-label=\"Источники способов подключения\"><a class=\"text-technical underline underline-offset-4\" href=\"https://support.apple.com/ru-ru/102661\" rel=\"noreferrer\" target=\"_blank\" data-phone-tv-source=\"apple-airplay\">Apple: AirPlay</a><a class=\"text-technical underline underline-offset-4\" href=\"https://support.google.com/googlecast/answer/3006709?hl=ru\" rel=\"noreferrer\" target=\"_blank\" data-phone-tv-source=\"google-cast\">Google: Cast</a><a class=\"text-technical underline underline-offset-4\" href=\"https://www.samsung.com/ru/support/mobile-devices/how-to-mirror-from-your-samsung-smartphone-to-your-tv/\" rel=\"noreferrer\" target=\"_blank\" data-phone-tv-source=\"samsung-smart-view\">Samsung: Smart View</a><a class=\"text-technical underline underline-offset-4\" href=\"https://www.displayport.org/faq/\" rel=\"noreferrer\" target=\"_blank\" data-phone-tv-source=\"vesa-displayport\">VESA: USB-C и DisplayPort</a></nav></div></section>"
        }
        "tv-dimensions" => {
            "<section class=\"border-y-2 border-ink py-7\" data-tv-dimensions-answer=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Размер экрана без догадок</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Таблица ширины и высоты телевизоров 16:9</h2><p class=\"mt-3 max-w-4xl leading-relaxed text-muted\">Диагональ на коробке описывает расстояние между противоположными углами активной области. Для современного экрана 16:9 из неё можно точно рассчитать ширину и высоту; один дюйм равен 2,54 см.</p><p class=\"mt-3 max-w-4xl border-l-2 border-action pl-4 text-sm font-semibold leading-relaxed\">Таблица показывает экран, а не корпус. Рамка, нижний блок, подставка и толщина зависят от точной модели.</p><p class=\"mt-5 font-mono text-xs uppercase text-action sm:hidden\" data-tv-dimensions-table-scroll-hint=\"true\">Таблица прокручивается вправо →</p><div class=\"mt-4 overflow-x-auto border border-ink\" data-tv-dimensions-reference-table=\"true\"><table class=\"w-full min-w-[39rem] border-collapse text-left text-sm\"><thead class=\"bg-ink font-mono text-xs uppercase text-white\"><tr><th class=\"px-4 py-3\" scope=\"col\">Диагональ</th><th class=\"px-4 py-3\" scope=\"col\">Диагональ в см</th><th class=\"px-4 py-3\" scope=\"col\">Ширина экрана</th><th class=\"px-4 py-3\" scope=\"col\">Высота экрана</th></tr></thead><tbody class=\"divide-y divide-line bg-white\"><tr data-tv-dimensions-row=\"32\"><th class=\"px-4 py-3\" scope=\"row\">32″</th><td class=\"px-4 py-3\">81,3 см</td><td class=\"px-4 py-3\">70,8 см</td><td class=\"px-4 py-3\">39,8 см</td></tr><tr data-tv-dimensions-row=\"43\"><th class=\"px-4 py-3\" scope=\"row\">43″</th><td class=\"px-4 py-3\">109,2 см</td><td class=\"px-4 py-3\">95,2 см</td><td class=\"px-4 py-3\">53,5 см</td></tr><tr data-tv-dimensions-row=\"50\"><th class=\"px-4 py-3\" scope=\"row\">50″</th><td class=\"px-4 py-3\">127 см</td><td class=\"px-4 py-3\">110,7 см</td><td class=\"px-4 py-3\">62,3 см</td></tr><tr data-tv-dimensions-row=\"55\"><th class=\"px-4 py-3\" scope=\"row\">55″</th><td class=\"px-4 py-3\">139,7 см</td><td class=\"px-4 py-3\">121,8 см</td><td class=\"px-4 py-3\">68,5 см</td></tr><tr data-tv-dimensions-row=\"65\"><th class=\"px-4 py-3\" scope=\"row\">65″</th><td class=\"px-4 py-3\">165,1 см</td><td class=\"px-4 py-3\">143,9 см</td><td class=\"px-4 py-3\">80,9 см</td></tr><tr data-tv-dimensions-row=\"75\"><th class=\"px-4 py-3\" scope=\"row\">75″</th><td class=\"px-4 py-3\">190,5 см</td><td class=\"px-4 py-3\">166 см</td><td class=\"px-4 py-3\">93,4 см</td></tr><tr data-tv-dimensions-row=\"85\"><th class=\"px-4 py-3\" scope=\"row\">85″</th><td class=\"px-4 py-3\">215,9 см</td><td class=\"px-4 py-3\">188,2 см</td><td class=\"px-4 py-3\">105,8 см</td></tr></tbody></table></div><div class=\"mt-8 grid gap-px border border-ink bg-ink md:grid-cols-3\" data-tv-dimensions-method=\"true\"><article class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-action\">1. По маркировке</p><h3 class=\"mt-2 font-display text-xl font-extrabold\">Введите диагональ</h3><p class=\"mt-2 text-sm leading-relaxed text-muted\">Получите размер активной области 16:9 и сравните две диагонали в одном масштабе.</p></article><article class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-action\">2. По экрану</p><h3 class=\"mt-2 font-display text-xl font-extrabold\">Измерьте две стороны</h3><p class=\"mt-2 text-sm leading-relaxed text-muted\">Ширина и высота дадут реальную диагональ и соотношение сторон, даже если это не 16:9.</p></article><article class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-action\">3. По месту</p><h3 class=\"mt-2 font-display text-xl font-extrabold\">Задайте нишу и зазор</h3><p class=\"mt-2 text-sm leading-relaxed text-muted\">Калькулятор вычтет зазор со всех сторон и найдёт самый большой стандартный экран, который помещается целиком.</p></article></div><nav class=\"mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-5 text-sm font-semibold\" aria-label=\"Следующие проверки размера телевизора\"><a class=\"text-action underline underline-offset-4\" href=\"/televizor-na-stene/\">Примерить телевизор на стене</a><a class=\"text-action underline underline-offset-4\" href=\"/rasstoyanie-do-televizora-i-diagonal/\">Проверить расстояние просмотра</a><a class=\"text-action underline underline-offset-4\" href=\"/modeli/\">Сверить корпус точной модели</a></nav></section>"
        }
        "wall-planner" => {
            "<section class=\"border-y-2 border-ink py-7\" data-wall-planner-answer=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Сначала физический размер, потом монтаж</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Сравните телевизор со стеной в одном масштабе</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Диагональ сама по себе не показывает, сколько места займёт корпус. Планировщик переводит точную модель или экран 16:9 в сантиметры, располагает его на заданной стене и считает четыре свободных зазора.</p><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Эскиз отвечает только за композицию. Он не назначает высоту, точки сверления, анкеры и розетки: эти проверки остаются отдельными, чтобы один наглядный результат не выдавался за монтажный проект.</p><div class=\"mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3\" data-wall-planner-static-examples=\"true\"><article class=\"bg-paper p-4\" data-wall-planner-example=\"43\"><p class=\"font-mono text-xs uppercase text-action\">Одна стена · 43″</p><h3 class=\"mt-1 font-display text-xl font-extrabold\">Компактный экран</h3><svg class=\"mt-4 block h-auto w-full bg-white\" role=\"img\" viewBox=\"0 0 420 270\" aria-label=\"Пример телевизора 43 дюйма на стене 420 на 270 сантиметров\"><rect class=\"fill-white stroke-ink\" x=\"1\" y=\"1\" width=\"418\" height=\"268\"/><line class=\"stroke-technical\" stroke-dasharray=\"6 5\" x1=\"1\" x2=\"419\" y1=\"160\" y2=\"160\"/><rect class=\"fill-line stroke-ink\" x=\"120\" y=\"215\" width=\"180\" height=\"54\"/><rect class=\"fill-ink stroke-action\" x=\"162.4\" y=\"98.3\" width=\"95.2\" height=\"53.5\"/></svg><p class=\"mt-3 text-sm leading-relaxed text-muted\">Корпус около 95 × 54 см оставляет широкие боковые поля.</p></article><article class=\"bg-paper p-4\" data-wall-planner-example=\"55\"><p class=\"font-mono text-xs uppercase text-action\">Одна стена · 55″</p><h3 class=\"mt-1 font-display text-xl font-extrabold\">Средний экран</h3><svg class=\"mt-4 block h-auto w-full bg-white\" role=\"img\" viewBox=\"0 0 420 270\" aria-label=\"Пример телевизора 55 дюймов на стене 420 на 270 сантиметров\"><rect class=\"fill-white stroke-ink\" x=\"1\" y=\"1\" width=\"418\" height=\"268\"/><line class=\"stroke-technical\" stroke-dasharray=\"6 5\" x1=\"1\" x2=\"419\" y1=\"160\" y2=\"160\"/><rect class=\"fill-line stroke-ink\" x=\"120\" y=\"215\" width=\"180\" height=\"54\"/><rect class=\"fill-ink stroke-action\" x=\"149.1\" y=\"90.8\" width=\"121.8\" height=\"68.5\"/></svg><p class=\"mt-3 text-sm leading-relaxed text-muted\">Экран 16:9 около 122 × 69 см — это демонстрация, не готовая отметка.</p></article><article class=\"bg-paper p-4\" data-wall-planner-example=\"65\"><p class=\"font-mono text-xs uppercase text-action\">Одна стена · 65″</p><h3 class=\"mt-1 font-display text-xl font-extrabold\">Большой экран</h3><svg class=\"mt-4 block h-auto w-full bg-white\" role=\"img\" viewBox=\"0 0 420 270\" aria-label=\"Пример телевизора 65 дюймов на стене 420 на 270 сантиметров\"><rect class=\"fill-white stroke-ink\" x=\"1\" y=\"1\" width=\"418\" height=\"268\"/><line class=\"stroke-technical\" stroke-dasharray=\"6 5\" x1=\"1\" x2=\"419\" y1=\"160\" y2=\"160\"/><rect class=\"fill-line stroke-ink\" x=\"120\" y=\"215\" width=\"180\" height=\"54\"/><rect class=\"fill-ink stroke-action\" x=\"138\" y=\"84.6\" width=\"144\" height=\"80.9\"/></svg><p class=\"mt-3 text-sm leading-relaxed text-muted\">Корпус около 144 × 81 см заметно меняет пропорции той же стены.</p></article></div><p class=\"mt-4 max-w-4xl text-sm leading-relaxed text-muted\">Примеры используют условную стену 420 × 270 см и центр 145 см от пола. В собственном расчёте введите реальные размеры и выберите точную модель, если она есть в каталоге.</p></section>"
        }
        "vesa" => {
            "<section class=\"border-y-2 border-ink py-7\"><p class=\"font-mono text-xs uppercase text-action\">Самостоятельная проверка без регистрации</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Сравнить VESA телевизора и кронштейна</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Инструмент нормализует ручной замер и распознаёт явные пары из вставленной строки характеристик: x, х, ×, миллиметры и сантиметры. Ответ относится только к точной схеме отверстий.</p><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Предельный размер вроде «до 400×400» не считается списком совместимости. Даже точное совпадение VESA не подтверждает массу, диагональ, винты, механизм, кабельные зазоры и основание стены.</p></section>"
        }
        "wall-mounted-tv" | "extendable-mount" => {
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
            "<section class=\"border-y-2 border-ink py-7\"><p class=\"font-mono text-xs uppercase text-action\">Самостоятельный расчёт без регистрации</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Калькулятор высоты установки</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Интерактивный расчёт учитывает диагональ экрана, высоту глаз, расстояние просмотра, вертикальный угол, высоту мебели и обязательный зазор. Результат показывает центр, нижний и верхний край от чистого пола.</p></section><div class=\"border-t-2 border-ink py-8\" data-height-planning-guide=\"true\"><section aria-labelledby=\"height-room-scenarios\" data-height-room-scenarios=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Сначала измерение, потом расчёт</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\" id=\"height-room-scenarios\">Высота зависит от комнаты и позы</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Универсальная отметка не заменяет замер. Для каждой комнаты зафиксируйте основную позу, высоту глаз, расстояние до экрана и мебель под телевизором.</p><div class=\"mt-6 grid gap-px border border-ink bg-ink md:grid-cols-3\"><article class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-action\">1. Гостиная</p><h3 class=\"mt-2 font-display text-2xl font-extrabold\">Измерьте глаза сидя</h3><p class=\"mt-3 text-sm leading-relaxed text-muted\">Сядьте на обычное место просмотра и измерьте высоту глаз от чистого пола. Отдельно внесите тумбу, саундбар и зазор — они могут поднять нижний край.</p></article><article class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-action\">2. Спальня</p><h3 class=\"mt-2 font-display text-2xl font-extrabold\">Повторите привычную позу</h3><p class=\"mt-3 text-sm leading-relaxed text-muted\">Не переносите высоту из гостиной. Измерьте глаза полулёжа и задайте направление взгляда; если экран выше, отдельно проверьте нужный наклон кронштейна.</p></article><article class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-action\">3. Кухня</p><h3 class=\"mt-2 font-display text-2xl font-extrabold\">Выберите одну главную позу</h3><p class=\"mt-3 text-sm leading-relaxed text-muted\">Решите, смотрите вы чаще сидя или стоя, и измерьте именно эту высоту глаз. Не усредняйте две позы: калькулятор должен отвечать на реальный сценарий.</p></article></div></section><section class=\"mt-9\" aria-labelledby=\"height-reference-title\" data-height-reference-table=\"true\"><h2 class=\"font-display text-3xl font-extrabold\" id=\"height-reference-title\">Таблица размеров экрана по диагонали</h2><p class=\"mt-3 max-w-4xl text-sm leading-relaxed text-muted\">Это не готовая рекомендация по высоте. Таблица показывает только геометрию экрана 16:9 при условном центре 110 см от пола, без подъёма из-за мебели. Подставьте собственную высоту глаз в калькулятор.</p><p class=\"mt-4 font-mono text-xs uppercase text-action sm:hidden\" data-height-table-scroll-hint=\"true\">Таблица прокручивается вправо →</p><div class=\"mt-5 overflow-x-auto border border-ink\"><table class=\"w-full min-w-[42rem] border-collapse text-left text-sm\"><thead class=\"bg-ink font-mono text-xs uppercase text-white\"><tr><th class=\"px-4 py-3\" scope=\"col\">Диагональ</th><th class=\"px-4 py-3\" scope=\"col\">Высота экрана</th><th class=\"px-4 py-3\" scope=\"col\">Нижний край</th><th class=\"px-4 py-3\" scope=\"col\">Центр</th><th class=\"px-4 py-3\" scope=\"col\">Верхний край</th></tr></thead><tbody class=\"divide-y divide-line bg-white\"><tr><th class=\"px-4 py-3\" scope=\"row\">32″</th><td class=\"px-4 py-3\">39,8 см</td><td class=\"px-4 py-3\">90,1 см</td><td class=\"px-4 py-3\">110 см</td><td class=\"px-4 py-3\">129,9 см</td></tr><tr><th class=\"px-4 py-3\" scope=\"row\">43″</th><td class=\"px-4 py-3\">53,5 см</td><td class=\"px-4 py-3\">83,2 см</td><td class=\"px-4 py-3\">110 см</td><td class=\"px-4 py-3\">136,8 см</td></tr><tr><th class=\"px-4 py-3\" scope=\"row\">50″</th><td class=\"px-4 py-3\">62,3 см</td><td class=\"px-4 py-3\">78,9 см</td><td class=\"px-4 py-3\">110 см</td><td class=\"px-4 py-3\">141,1 см</td></tr><tr><th class=\"px-4 py-3\" scope=\"row\">55″</th><td class=\"px-4 py-3\">68,5 см</td><td class=\"px-4 py-3\">75,8 см</td><td class=\"px-4 py-3\">110 см</td><td class=\"px-4 py-3\">144,2 см</td></tr><tr><th class=\"px-4 py-3\" scope=\"row\">65″</th><td class=\"px-4 py-3\">80,9 см</td><td class=\"px-4 py-3\">69,5 см</td><td class=\"px-4 py-3\">110 см</td><td class=\"px-4 py-3\">150,5 см</td></tr><tr><th class=\"px-4 py-3\" scope=\"row\">75″</th><td class=\"px-4 py-3\">93,4 см</td><td class=\"px-4 py-3\">63,3 см</td><td class=\"px-4 py-3\">110 см</td><td class=\"px-4 py-3\">156,7 см</td></tr></tbody></table></div></section></div>"
        }
        "viewing-distance" => {
            "<section class=\"border-y-2 border-ink py-7\"><h2 class=\"font-display text-3xl font-extrabold\">Калькулятор расстояния и диагонали</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Расчёт работает в обе стороны: диагональ переводится в расстояние, а известное расстояние — в диагональ. Формула использует физическую ширину экрана 16:9 и выбранный горизонтальный угол обзора.</p></section>"
        }
        _ => "",
    }
}

fn verified_mount_count(model_id: &str, graph: &[CompatibilityEdge]) -> usize {
    graph
        .iter()
        .filter(|edge| {
            edge.compatible && edge.fit_status == "verified-fit" && edge.tv_id == model_id
        })
        .count()
}

fn verified_model_count(mount_id: &str, graph: &[CompatibilityEdge]) -> usize {
    graph
        .iter()
        .filter(|edge| {
            edge.compatible && edge.fit_status == "verified-fit" && edge.mount_id == mount_id
        })
        .count()
}

fn seo_model_card(tv: &TvModel, graph: &[CompatibilityEdge]) -> String {
    format!(
        "<article class=\"border border-line bg-white p-5\"><a class=\"font-display text-xl font-extrabold underline decoration-action decoration-2 underline-offset-4\" href=\"/modeli/{id}/\">{title}</a><p class=\"mt-3 text-sm leading-relaxed text-muted\">{year} год · {diagonal}″ · VESA {vesa_width}×{vesa_height} мм · {weight} кг без подставки</p><p class=\"mt-3 font-mono text-xs uppercase text-technical\">Подтверждённых кронштейнов: {mount_count}</p></article>",
        id = escape_html(&tv.id),
        title = escape_html(&tv.title),
        year = tv.model_year,
        diagonal = tv.diagonal_inches,
        vesa_width = tv.vesa_width_mm,
        vesa_height = tv.vesa_height_mm,
        weight = tv.weight_kg,
        mount_count = verified_mount_count(&tv.id, graph),
    )
}

fn mount_extension_label(mount: &Mount) -> String {
    if (mount.wall_distance_min_mm - mount.wall_distance_max_mm).abs() < f64::EPSILON {
        format!("{} мм", mount.wall_distance_min_mm)
    } else {
        format!(
            "{}–{} мм",
            mount.wall_distance_min_mm, mount.wall_distance_max_mm
        )
    }
}

fn seo_mount_card(mount: &Mount, graph: &[CompatibilityEdge]) -> String {
    format!(
        "<article class=\"border border-line bg-white p-5\"><a class=\"font-display text-xl font-extrabold underline decoration-action decoration-2 underline-offset-4\" href=\"/kronshteyny/{id}/\">{title}</a><p class=\"mt-3 text-sm leading-relaxed text-muted\">{mechanism} механизм · нагрузка до {load} кг · диагональ {min_diagonal}–{max_diagonal}″ · вылет {extension}</p><p class=\"mt-3 font-mono text-xs uppercase text-technical\">Схем VESA: {vesa_count} · подтверждённых моделей: {model_count}</p></article>",
        id = escape_html(&mount.id),
        title = escape_html(&mount.title),
        mechanism = escape_html(mechanism_label(&mount.mechanism)),
        load = mount.max_load_kg,
        min_diagonal = mount.min_diagonal_in,
        max_diagonal = mount.max_diagonal_in,
        extension = escape_html(&mount_extension_label(mount)),
        vesa_count = mount.vesa.len(),
        model_count = verified_model_count(&mount.id, graph),
    )
}

fn seo_mount_comparison_card(mount: &Mount, graph: &[CompatibilityEdge]) -> String {
    format!(
        "<article class=\"grid gap-4 border-t border-line py-5 lg:grid-cols-[minmax(12rem,1.25fr)_minmax(8rem,0.75fr)_minmax(8rem,0.7fr)_minmax(9rem,0.85fr)_auto] lg:items-center\" data-mount-comparison-item=\"{id}\"><div><a class=\"font-display text-2xl font-extrabold underline decoration-action decoration-2 underline-offset-4\" href=\"/kronshteyny/{id}/\">{title}</a><p class=\"mt-1 text-sm text-muted\">{mechanism} механизм</p></div><dl class=\"text-sm\"><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-semibold\">{min_diagonal}–{max_diagonal}″</dd></dl><dl class=\"text-sm\"><dt class=\"font-mono text-xs uppercase text-muted\">Нагрузка</dt><dd class=\"mt-1 font-semibold\">до {load} кг</dd></dl><dl class=\"text-sm\"><dt class=\"font-mono text-xs uppercase text-muted\">От стены</dt><dd class=\"mt-1 font-semibold\">{extension}</dd></dl><a class=\"font-semibold text-action\" href=\"/kronshteyny/{id}/\">Открыть →</a><details class=\"lg:col-span-5\"><summary class=\"cursor-pointer font-mono text-xs uppercase text-technical\">{vesa_count} точных схем VESA +</summary><p class=\"mt-3 font-mono text-xs leading-6 text-muted\">{vesa}</p></details><p class=\"font-mono text-xs uppercase text-technical lg:col-span-5\">Подтверждённых моделей: {model_count}</p></article>",
        id = escape_html(&mount.id),
        title = escape_html(&mount.title),
        mechanism = escape_html(mechanism_label(&mount.mechanism)),
        min_diagonal = mount.min_diagonal_in,
        max_diagonal = mount.max_diagonal_in,
        load = mount.max_load_kg,
        extension = escape_html(&mount_extension_label(mount)),
        vesa_count = mount.vesa.len(),
        vesa = escape_html(&formatted_vesa_list(mount)),
        model_count = verified_model_count(&mount.id, graph),
    )
}

fn seo_buy_mount_comparison_html(
    page: &SeoPage,
    mounts: &[Mount],
    graph: &[CompatibilityEdge],
) -> String {
    if page.id != "buy-tv-mount" {
        return String::new();
    }

    let cards = BUY_MOUNT_SHORTLIST
        .iter()
        .filter_map(|(mount_id, scenario)| {
            mounts
                .iter()
                .find(|mount| mount.id == *mount_id && is_indexable_mount(&mount.id, graph))
                .map(|mount| {
                    format!(
                        "<article class=\"grid gap-4 border-t border-line py-5 lg:grid-cols-[minmax(12rem,1.25fr)_minmax(8rem,0.75fr)_minmax(8rem,0.7fr)_minmax(9rem,0.85fr)_auto] lg:items-center\" data-buy-mount-comparison-item=\"{id}\"><div><p class=\"font-mono text-xs uppercase leading-relaxed text-action\">{scenario}</p><a class=\"mt-1 font-display text-2xl font-extrabold underline decoration-action decoration-2 underline-offset-4\" href=\"/kronshteyny/{id}/\">{title}</a><p class=\"mt-1 text-sm text-muted\">{mechanism} механизм</p></div><dl class=\"text-sm\"><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-semibold\">{min_diagonal}–{max_diagonal}″</dd></dl><dl class=\"text-sm\"><dt class=\"font-mono text-xs uppercase text-muted\">Нагрузка</dt><dd class=\"mt-1 font-semibold\">до {load} кг</dd></dl><dl class=\"text-sm\"><dt class=\"font-mono text-xs uppercase text-muted\">От стены</dt><dd class=\"mt-1 font-semibold\">{extension}</dd></dl><a class=\"font-semibold text-action\" href=\"/kronshteyny/{id}/\">Проверить VESA →</a><details class=\"lg:col-span-5\"><summary class=\"cursor-pointer font-mono text-xs uppercase text-technical\">{vesa_count} точных схем VESA +</summary><p class=\"mt-3 font-mono text-xs leading-6 text-muted\">{vesa}</p></details></article>",
                        id = escape_html(&mount.id),
                        scenario = escape_html(scenario),
                        title = escape_html(&mount.title),
                        mechanism = escape_html(mechanism_label(&mount.mechanism)),
                        min_diagonal = mount.min_diagonal_in,
                        max_diagonal = mount.max_diagonal_in,
                        load = mount.max_load_kg,
                        extension = escape_html(&mount_extension_label(mount)),
                        vesa_count = mount.vesa.len(),
                        vesa = escape_html(&formatted_vesa_list(mount)),
                    )
                })
        })
        .collect::<Vec<_>>()
        .join("\n");

    if cards.is_empty() {
        return String::new();
    }

    format!(
        "<section class=\"border-y-2 border-ink py-8\" aria-labelledby=\"buy-mount-comparison-title\" data-buy-mount-comparison=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Короткий список перед покупкой</p><h2 id=\"buy-mount-comparison-title\" class=\"mt-2 font-display text-3xl font-extrabold\">Три разных сценария, а не три одинаковые карточки</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Сначала найдите точную модель телевизора. Затем сравните подходящий механизм, расстояние от стены, нагрузку и явную пару VESA — только после этого открывайте предложение на Маркете.</p><div class=\"mt-5 border-b-2 border-ink\">{cards}</div></section>"
    )
}

fn seo_model_catalog_html(
    page: &SeoPage,
    models: &[TvModel],
    graph: &[CompatibilityEdge],
) -> String {
    let selection = match page.kind.as_str() {
        "vesa" => page
            .id
            .strip_prefix("vesa-")
            .and_then(|value| value.split_once('x'))
            .and_then(|(width, height)| {
                Some((width.parse::<u32>().ok()?, height.parse::<u32>().ok()?))
            })
            .map(|(width, height)| {
                let selected = models
                    .iter()
                    .filter(|tv| {
                        tv.vesa_width_mm == width
                            && tv.vesa_height_mm == height
                            && is_indexable_model(&tv.id, graph)
                    })
                    .collect::<Vec<_>>();
                (
                    format!("Телевизоры с VESA {width}×{height} мм"),
                    format!(
                        "Ниже только модели с точной горизонтальной и вертикальной парой {width}×{height} мм. Совпадение VESA — первый фильтр: запас нагрузки, диагональ, винты и основание стены всё равно проверяются отдельно."
                    ),
                    selected,
                )
            }),
        "diagonal" => page
            .id
            .strip_prefix("diagonal-")
            .and_then(|value| value.parse::<f64>().ok())
            .map(|diagonal| {
                let selected = models
                    .iter()
                    .filter(|tv| {
                        (tv.diagonal_inches - diagonal).abs() < 0.05
                            && is_indexable_model(&tv.id, graph)
                    })
                    .collect::<Vec<_>>();
                (
                    format!("Проверенные телевизоры с диагональю {diagonal}″"),
                    format!(
                        "Диагональ {diagonal}″ помогает отсеять неподходящий паспортный диапазон кронштейна, но не заменяет сверку точной модели. В карточках сохранены VESA, масса без подставки и число подтверждённых кронштейнов."
                    ),
                    selected,
                )
            }),
        "brand" => page.id.strip_prefix("brand-").and_then(|brand_key| {
            if brand_key.is_empty() {
                return None;
            }
            let selected = models
                .iter()
                .filter(|tv| {
                    tv.brand.eq_ignore_ascii_case(brand_key)
                        && is_indexable_model(&tv.id, graph)
                })
                .collect::<Vec<_>>();
            let display_brand = selected
                .first()
                .map(|tv| tv.brand.as_str())
                .unwrap_or(brand_key);
            Some((
                format!("Проверенные телевизоры {display_brand}"),
                format!(
                    "Каталог {display_brand} собран по точным обозначениям моделей, а не только по серии. Для каждой модели показаны VESA, масса без подставки, диагональ и число кронштейнов, прошедших все три проверки."
                ),
                selected,
            ))
        }),
        _ => None,
    };

    let Some((heading, explanation, mut selected)) = selection else {
        return String::new();
    };
    selected.sort_by(|left, right| {
        left.brand
            .to_lowercase()
            .cmp(&right.brand.to_lowercase())
            .then_with(|| left.diagonal_inches.total_cmp(&right.diagonal_inches))
            .then_with(|| left.title.to_lowercase().cmp(&right.title.to_lowercase()))
    });

    let selected_ids = selected
        .iter()
        .map(|tv| tv.id.as_str())
        .collect::<HashSet<_>>();
    let verified_pairs = graph
        .iter()
        .filter(|edge| {
            edge.compatible
                && edge.fit_status == "verified-fit"
                && selected_ids.contains(edge.tv_id.as_str())
        })
        .count();
    let brand_count = selected
        .iter()
        .map(|tv| tv.brand.to_lowercase())
        .collect::<HashSet<_>>()
        .len();
    let diagonals = selected
        .iter()
        .map(|tv| tv.diagonal_inches.to_string())
        .collect::<HashSet<_>>()
        .len();
    let (context_label, context_count) = if page.kind == "brand" {
        ("Диагоналей", diagonals)
    } else {
        ("Брендов", brand_count)
    };
    let rows = selected
        .iter()
        .map(|tv| (tv.brand.clone(), seo_model_card(tv, graph)))
        .collect::<Vec<_>>();
    let catalog = if rows.is_empty() {
        "<p class=\"mt-6 border border-line bg-white p-5 leading-relaxed text-muted\">В проверенном каталоге пока нет моделей для этого фильтра. Страница остаётся справочной и не обещает совместимость без точной модели.</p>".to_string()
    } else {
        brand_catalog_html(
            rows,
            "Моделей",
            "div",
            "grid gap-3 border-t border-line py-4 sm:grid-cols-2",
        )
    };

    format!(
        "<section class=\"border-y-2 border-ink py-8\" aria-labelledby=\"seo-catalog-heading\"><p class=\"font-mono text-xs uppercase text-action\">Данные проверенного каталога</p><h2 id=\"seo-catalog-heading\" class=\"mt-2 font-display text-3xl font-extrabold\">{heading}</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">{explanation}</p><dl class=\"mt-6 grid gap-px border border-ink bg-ink sm:grid-cols-3\"><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Моделей</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{model_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">{context_label}</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{context_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Подтверждённых пар</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{verified_pairs}</dd></div></dl><div class=\"mt-6\">{catalog}</div><p class=\"mt-5 text-sm leading-relaxed text-muted\">«Подтверждённая пара» означает совпадение точной VESA, паспортного диапазона диагонали и нагрузки с запасом 25%. Тип стены, анкеры, винты и кабельные зазоры в этот счётчик не входят.</p></section>",
        heading = escape_html(&heading),
        explanation = escape_html(&explanation),
        model_count = selected.len(),
        context_label = escape_html(context_label),
    )
}

fn seo_mechanism_catalog_html(
    page: &SeoPage,
    mounts: &[Mount],
    graph: &[CompatibilityEdge],
) -> String {
    let selection = match page.kind.as_str() {
        "mechanism" => {
            let mechanism = match page.id.as_str() {
                "fixed-mount" => "fixed",
                "tilt-mount" => "tilt",
                "full-motion-mount" | "extendable-mount" => "full-motion",
                _ => return String::new(),
            };
            let selected = mounts
                .iter()
                .filter(|mount| {
                    mount.mechanism == mechanism && is_indexable_mount(&mount.id, graph)
                })
                .collect::<Vec<_>>();
            let (heading, explanation) = if page.id == "extendable-mount" {
                (
                    "Проверенные выдвижные кронштейны".to_string(),
                    "Ниже собраны поворотно-выдвижные модели с проверенными VESA, нагрузкой, диапазоном диагоналей и минимальным/максимальным расстоянием от стены. Фактический угол зависит от ширины телевизора и препятствий рядом с экраном.".to_string(),
                )
            } else {
                (
                    "Кронштейны этого типа в каталоге".to_string(),
                    "Изделия отобраны по механизму из карточек с проверенными характеристиками. Вылет — расстояние от стены до телевизора по данным производителя; для конкретной модели отдельно проверяются VESA, масса и паспортная диагональ.".to_string(),
                )
            };
            (heading, explanation, selected)
        }
        "commercial" => (
            "Сравнение проверенных кронштейнов".to_string(),
            "Каталог содержит только точные модели с подтверждёнными характеристиками. Сначала выберите телевизор, затем сравните механизм, нагрузку, диапазон диагоналей, VESA и расстояние от стены в карточках подходящих изделий.".to_string(),
            mounts
                .iter()
                .filter(|mount| is_indexable_mount(&mount.id, graph))
                .collect::<Vec<_>>(),
        ),
        "mount-brand" => {
            let Some(brand_key) = page.id.strip_prefix("mount-brand-") else {
                return String::new();
            };
            let selected = mounts
                .iter()
                .filter(|mount| {
                    mount.brand.eq_ignore_ascii_case(brand_key)
                        && is_indexable_mount(&mount.id, graph)
                })
                .collect::<Vec<_>>();
            let display_brand = selected
                .first()
                .map(|mount| mount.brand.as_str())
                .unwrap_or(brand_key);
            (
                format!("Проверенные кронштейны {display_brand}"),
                format!(
                    "Каждая модель {display_brand} сохранена как отдельный артикул с явными VESA, нагрузкой, диапазоном диагоналей и расстоянием от стены. Близкие суффиксы не объединяются автоматически."
                ),
                selected,
            )
        }
        _ => return String::new(),
    };
    let (heading, explanation, mut selected) = selection;
    selected.sort_by(|left, right| {
        left.brand
            .to_lowercase()
            .cmp(&right.brand.to_lowercase())
            .then_with(|| left.title.to_lowercase().cmp(&right.title.to_lowercase()))
    });

    let selected_ids = selected
        .iter()
        .map(|mount| mount.id.as_str())
        .collect::<HashSet<_>>();
    let verified_pairs = graph
        .iter()
        .filter(|edge| {
            edge.compatible
                && edge.fit_status == "verified-fit"
                && selected_ids.contains(edge.mount_id.as_str())
        })
        .count();
    let brand_count = selected
        .iter()
        .map(|mount| mount.brand.to_lowercase())
        .collect::<HashSet<_>>()
        .len();
    let rows = selected
        .iter()
        .map(|mount| (mount.brand.clone(), seo_mount_card(mount, graph)))
        .collect::<Vec<_>>();
    let catalog = if rows.is_empty() {
        "<p class=\"mt-6 border border-line bg-white p-5 leading-relaxed text-muted\">В проверенном каталоге пока нет кронштейнов этого типа. До появления точных карточек страница остаётся техническим руководством.</p>".to_string()
    } else if page.kind == "mount-brand" {
        let comparison = selected
            .iter()
            .map(|mount| seo_mount_comparison_card(mount, graph))
            .collect::<Vec<_>>()
            .join("\n");
        format!(
            "<div class=\"border-b-2 border-ink\" data-mount-comparison=\"true\">{comparison}</div>"
        )
    } else {
        brand_catalog_html(
            rows,
            "Кронштейнов",
            "div",
            "grid gap-3 border-t border-line py-4 sm:grid-cols-2",
        )
    };

    format!(
        "<section class=\"border-y-2 border-ink py-8\" aria-labelledby=\"seo-catalog-heading\"><p class=\"font-mono text-xs uppercase text-action\">Данные проверенного каталога</p><h2 id=\"seo-catalog-heading\" class=\"mt-2 font-display text-3xl font-extrabold\">{heading}</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">{explanation}</p><dl class=\"mt-6 grid gap-px border border-ink bg-ink sm:grid-cols-3\"><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Кронштейнов</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{mount_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Брендов</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{brand_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Подтверждённых пар</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{verified_pairs}</dd></div></dl><div class=\"mt-6\">{catalog}</div><p class=\"mt-5 text-sm leading-relaxed text-muted\">Число подтверждённых моделей учитывает только пары со статусом полной проверки: точная VESA, диапазон диагонали и нагрузка с запасом 25%. Крепёж и несущая способность стены проверяются на месте.</p></section>",
        heading = escape_html(&heading),
        explanation = escape_html(&explanation),
        mount_count = selected.len(),
    )
}

fn seo_screw_catalog_html(models: &[TvModel]) -> String {
    let screw_models = models
        .iter()
        .filter(|model| {
            model
                .wall_mount_screws
                .as_ref()
                .is_some_and(|hardware| !hardware.groups.is_empty())
        })
        .collect::<Vec<_>>();
    let brand_count = screw_models
        .iter()
        .map(|model| model.brand.as_str())
        .collect::<HashSet<_>>()
        .len();
    let mut threads = screw_models
        .iter()
        .flat_map(|model| {
            model
                .wall_mount_screws
                .as_ref()
                .into_iter()
                .flat_map(|hardware| hardware.groups.iter())
                .map(|group| group.thread.clone())
        })
        .collect::<HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    threads.sort();

    let rows = screw_models
        .iter()
        .map(|model| {
            let hardware = model
                .wall_mount_screws
                .as_ref()
                .expect("Модель отфильтрована по паспорту винтов");
            let conflict = hardware
                .vesa_conflict
                .as_ref()
                .map(|_| {
                    "<p class=\"mt-3 text-sm font-semibold text-action\">VESA расходится в официальных источниках — перед монтажом нужен замер.</p>"
                })
                .unwrap_or_default();
            let adapters = if hardware.requires_adapters == Some(true) {
                "<p class=\"mt-2 text-sm font-semibold text-technical\">Нужны показанные в руководстве адаптеры VESA.</p>"
            } else {
                ""
            };
            let required_parts = hardware
                .required_parts_note
                .as_ref()
                .map(|note| {
                    format!(
                        "<p class=\"mt-2 text-sm leading-relaxed text-muted\">{}</p>",
                        escape_html(note)
                    )
                })
                .unwrap_or_default();
            let summary = wall_mount_screws_summary(hardware);
            (
                model.brand.clone(),
                format!(
                    "<article class=\"grid gap-4 border-b border-line py-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)] lg:items-start\"><div><a class=\"font-display text-2xl font-extrabold\" href=\"/modeli/{id}/\">{title}</a><p class=\"mt-1 text-sm text-muted\">VESA {vesa_w}×{vesa_h} мм</p><p class=\"mt-3 font-semibold leading-relaxed\">{summary}</p>{conflict}{adapters}{required_parts}</div><div class=\"grid gap-3 lg:justify-items-end lg:text-right\"><a class=\"font-semibold text-technical underline underline-offset-4\" href=\"{source_url}\" rel=\"noreferrer\" target=\"_blank\">Официальное руководство</a><span class=\"font-mono text-xs uppercase text-muted\">{source_region} · проверено {checked_at}</span><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/modeli/{id}/\">Совместимые кронштейны →</a></div></article>",
                    id = escape_html(&model.id),
                    title = escape_html(&model.title),
                    vesa_w = model.vesa_width_mm,
                    vesa_h = model.vesa_height_mm,
                    summary = escape_html(&summary),
                    conflict = conflict,
                    adapters = adapters,
                    required_parts = required_parts,
                    source_url = escape_html(&hardware.source_url),
                    source_region = escape_html(&hardware.source_region),
                    checked_at = escape_html(&hardware.checked_at),
                ),
            )
        })
        .collect::<Vec<_>>();
    let catalog = brand_catalog_html(rows, "Моделей", "div", "border-t border-line");
    let model_options = models
        .iter()
        .map(|model| format!("<option value=\"{}\"></option>", escape_html(&model.title)))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        "<section class=\"border-y-2 border-ink py-8\" aria-labelledby=\"screw-catalog-title\" data-screw-catalog=\"true\" data-searchable-model-count=\"{searchable_count}\"><p class=\"font-mono text-xs uppercase text-action\">Бесплатная проверка без регистрации</p><h2 id=\"screw-catalog-title\" class=\"mt-2 font-display text-4xl font-extrabold\">Найдите точную модель телевизора</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Покажем только то, что удалось подтвердить официальным руководством: резьбу, количество, длину или допустимую глубину и обязательные вставки.</p><p class=\"mt-3 max-w-3xl border-l-2 border-action pl-4 text-sm font-semibold leading-relaxed\">Поиск относится к винтам между корпусом телевизора и VESA-пластиной. Это не анкеры для стены и не винты для ножек.</p><form class=\"mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]\" action=\"/modeli/\" method=\"get\" data-model-search-count=\"{searchable_count}\"><label class=\"sr-only\" for=\"static-screw-model\">Модель телевизора</label><input class=\"h-16 min-w-0 rounded-md border-2 border-ink bg-white px-5 text-xl\" id=\"static-screw-model\" list=\"static-screw-models\" name=\"model\" placeholder=\"Например, Samsung QE43Q7FAAUXRU\" autocomplete=\"off\"><datalist id=\"static-screw-models\">{model_options}</datalist><button class=\"rounded-md bg-action px-7 font-display text-xl font-bold text-white\" type=\"submit\">Открыть каталог моделей</button></form><p class=\"mt-4 border-l-2 border-line pl-4 text-sm leading-relaxed text-muted\" data-known-model-fallback=\"true\">Поиск распознаёт все {searchable_count} моделей. Если модель известна, но паспорт винтов ещё не подтверждён, сервис не угадывает M6/M8 по VESA и ведёт в карточку модели с совместимыми кронштейнами.</p><dl class=\"mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4\"><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Моделей в поиске</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{searchable_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Моделей с паспортом</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{model_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Брендов</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{brand_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Подтверждённая резьба</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{threads}</dd></div></dl><p class=\"mt-5 text-sm leading-relaxed text-muted\">Открытый датасет «Винты VESA для популярных в России моделей телевизоров», версия 1.0.0: <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0/tv-vesa-screws.csv\" rel=\"noreferrer\" target=\"_blank\">скачать CSV</a> или <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0/tv-vesa-screws.json\" rel=\"noreferrer\" target=\"_blank\">JSON</a>. В файлах 26 точных моделей, паспортные размеры и официальные источники; <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"https://github.com/jimbokl/krepitv/blob/2f19d58ef793ffc1e26c8c8fdb6d53f2a20edbfe/LICENSE\" rel=\"noreferrer\" target=\"_blank\">лицензия MIT</a>.</p><div class=\"mt-9\"><h3 class=\"border-b-2 border-ink pb-4 font-display text-3xl font-extrabold\">Все проверенные модели</h3>{catalog}</div></section>",
        searchable_count = models.len(),
        model_count = screw_models.len(),
        brand_count = brand_count,
        threads = escape_html(&threads.join(" · ")),
        model_options = model_options,
        catalog = catalog,
    )
}

fn seo_vesa_model_catalog_html(models: &[TvModel], graph: &[CompatibilityEdge]) -> String {
    let brand_count = models
        .iter()
        .map(|model| model.brand.as_str())
        .collect::<HashSet<_>>()
        .len();
    let vesa_count = models
        .iter()
        .map(|model| (model.vesa_width_mm, model.vesa_height_mm))
        .collect::<HashSet<_>>()
        .len();
    let rows = models
        .iter()
        .map(|model| {
            let source_conflict = model
                .wall_mount_screws
                .as_ref()
                .and_then(|hardware| hardware.vesa_conflict.as_ref());
            let verified_mounts = if source_conflict.is_some() {
                0
            } else {
                graph
                    .iter()
                    .filter(|edge| {
                        edge.tv_id == model.id
                            && edge.compatible
                            && edge.fit_status == "verified-fit"
                    })
                    .count()
            };
            let conflict = source_conflict
                .map(|conflict| {
                    format!(
                        "<p class=\"mt-3 text-sm font-semibold leading-relaxed text-action\" data-vesa-source-conflict=\"true\">Источники расходятся: {catalog} / {manual}. Перед монтажом нужен ручной замер.</p>",
                        catalog = escape_html(&conflict.catalog_value),
                        manual = escape_html(&conflict.manual_value),
                    )
                })
                .unwrap_or_default();
            let match_summary = if source_conflict.is_some() {
                "автоподбор остановлен".to_string()
            } else {
                format!("{verified_mounts} проверенных кронштейнов")
            };
            (
                model.brand.clone(),
                format!(
                    "<article class=\"grid gap-4 border-b border-line py-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)] lg:items-start\"><div><a class=\"font-display text-2xl font-extrabold\" href=\"/modeli/{id}/\">{title}</a><p class=\"mt-2 font-display text-2xl font-extrabold text-action\">VESA {vesa_w}×{vesa_h} мм</p><p class=\"mt-1 text-sm text-muted\">{diagonal}″ · {weight} кг без подставки · {match_summary}</p>{conflict}</div><div class=\"grid gap-3 lg:justify-items-end lg:text-right\"><a class=\"font-semibold text-technical underline underline-offset-4\" href=\"{source_url}\" rel=\"noreferrer\" target=\"_blank\">Официальный источник</a><span class=\"font-mono text-xs uppercase text-muted\">Проверено {checked_at}</span><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/modeli/{id}/\">{model_link_label} →</a></div></article>",
                    id = escape_html(&model.id),
                    title = escape_html(&model.title),
                    vesa_w = model.vesa_width_mm,
                    vesa_h = model.vesa_height_mm,
                    diagonal = model.diagonal_inches,
                    weight = model.weight_kg,
                    match_summary = escape_html(&match_summary),
                    conflict = conflict,
                    source_url = escape_html(&model.source_url),
                    checked_at = escape_html(&model.checked_at),
                    model_link_label = if source_conflict.is_some() {
                        "Открыть паспорт модели"
                    } else {
                        "Совместимые кронштейны"
                    },
                ),
            )
        })
        .collect::<Vec<_>>();
    let catalog = brand_catalog_html(rows, "Моделей", "div", "border-t border-line");
    let model_options = models
        .iter()
        .map(|model| format!("<option value=\"{}\"></option>", escape_html(&model.title)))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        "<section class=\"border-y-2 border-ink py-8\" aria-labelledby=\"vesa-model-catalog-title\" data-vesa-model-catalog=\"true\" data-searchable-model-count=\"{model_count}\"><p class=\"font-mono text-xs uppercase text-action\">Бесплатный поиск без регистрации</p><h2 id=\"vesa-model-catalog-title\" class=\"mt-2 font-display text-4xl font-extrabold\">Найдите VESA по модели телевизора</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Введите полный код с шильдика. Покажем расстояние между отверстиями, официальный источник и число кронштейнов, прошедших точную проверку.</p><form class=\"mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]\" action=\"/modeli/\" method=\"get\" data-vesa-model-search-count=\"{model_count}\"><label class=\"sr-only\" for=\"static-vesa-model\">Модель телевизора</label><input class=\"h-16 min-w-0 rounded-md border-2 border-ink bg-white px-5 text-xl\" id=\"static-vesa-model\" list=\"static-vesa-models\" name=\"model\" placeholder=\"Например, TCL 55P6K\" autocomplete=\"off\"><datalist id=\"static-vesa-models\">{model_options}</datalist><button class=\"rounded-md bg-action px-7 font-display text-xl font-bold text-white\" type=\"submit\">Открыть модель</button></form><p class=\"mt-4 border-l-2 border-action pl-4 text-sm leading-relaxed text-muted\">VESA записывается как горизонталь × вертикаль в миллиметрах. Диагональ экрана сама по себе не определяет расположение отверстий.</p><dl class=\"mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-3\"><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Точных моделей</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{model_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Брендов</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{brand_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Схем VESA</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{vesa_count}</dd></div></dl><p class=\"mt-5 text-sm leading-relaxed text-muted\">Открытый датасет «Размеры VESA популярных в России телевизоров», версия 1.0.0: <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0/tv-vesa-sizes.csv\" rel=\"noreferrer\" target=\"_blank\">скачать CSV</a> или <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0/tv-vesa-sizes.json\" rel=\"noreferrer\" target=\"_blank\">JSON</a>. В файлах 80 точных моделей, размеры VESA и официальные источники; <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"https://github.com/jimbokl/krepitv/blob/2f19d58ef793ffc1e26c8c8fdb6d53f2a20edbfe/LICENSE\" rel=\"noreferrer\" target=\"_blank\">лицензия MIT</a>.</p><div class=\"mt-9\"><h3 class=\"border-b-2 border-ink pb-4 font-display text-3xl font-extrabold\">Таблица VESA телевизоров</h3>{catalog}</div></section>",
        model_count = models.len(),
        brand_count = brand_count,
        vesa_count = vesa_count,
        model_options = model_options,
        catalog = catalog,
    )
}

fn seo_catalog_html(
    page: &SeoPage,
    models: &[TvModel],
    mounts: &[Mount],
    graph: &[CompatibilityEdge],
) -> String {
    if page.id == "vesa" {
        return seo_vesa_model_catalog_html(models, graph);
    }
    match page.kind.as_str() {
        "mechanism" | "commercial" | "mount-brand" => {
            seo_mechanism_catalog_html(page, mounts, graph)
        }
        "vesa" | "diagonal" | "brand" => seo_model_catalog_html(page, models, graph),
        "screws" => seo_screw_catalog_html(models),
        _ => String::new(),
    }
}

fn seo_page_body(
    page: &SeoPage,
    pages: &[SeoPage],
    models: &[TvModel],
    mounts: &[Mount],
    graph: &[CompatibilityEdge],
) -> String {
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
    let brand_matcher_note = seo_brand_mount_matcher_html(page, models, mounts, graph);
    let buy_mount_comparison = seo_buy_mount_comparison_html(page, mounts, graph);
    let catalog = seo_catalog_html(page, models, mounts, graph);
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

    let facts_section = format!(
        "<section class=\"py-8\" data-check-list=\"true\"><h2 class=\"font-display text-3xl font-extrabold\">Что проверить</h2><ul class=\"mt-5 space-y-3 border-l-2 border-action pl-5 text-lg leading-relaxed\">{facts}</ul></section>"
    );
    let answer_content = if page.kind == "screws" {
        format!("{catalog}{facts_section}{calculator_note}")
    } else if page.id == "vesa" {
        format!("{catalog}{calculator_note}{facts_section}")
    } else {
        format!(
            "{brand_matcher_note}{facts_section}{buy_mount_comparison}{catalog}{calculator_note}"
        )
    };

    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Технический справочник</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">{h1}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">{lead}</p>{answer_content}<section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Частые вопросы</h2><div class=\"mt-5 border-b border-line\">{faq}</div></section><section class=\"border-t-2 border-ink py-7\"><h2 class=\"font-display text-2xl font-extrabold\">Связанные материалы</h2><nav class=\"mt-4 grid\" aria-label=\"Связанные материалы\">{related_links}</nav></section><p><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/podbor/\">Проверить точную модель телевизора</a></p></article>",
        h1 = escape_html(&page.h1),
        lead = escape_html(&page.lead),
        answer_content = answer_content,
    ))
}

fn seo_brand_mount_matcher_html(
    page: &SeoPage,
    models: &[TvModel],
    mounts: &[Mount],
    graph: &[CompatibilityEdge],
) -> String {
    if page.id != "mount-brand-onkron" {
        return String::new();
    }

    let mount_ids = mounts
        .iter()
        .filter(|mount| mount.brand.eq_ignore_ascii_case("ONKRON"))
        .map(|mount| mount.id.as_str())
        .collect::<HashSet<_>>();
    let verified_pairs = graph
        .iter()
        .filter(|edge| {
            edge.compatible
                && edge.fit_status == "verified-fit"
                && mount_ids.contains(edge.mount_id.as_str())
        })
        .count();

    format!(
        "<section class=\"border-y-2 border-ink py-8\" aria-labelledby=\"brand-mount-matcher-static-title\" data-brand-mount-matcher-static=\"ONKRON\"><p class=\"font-mono text-xs uppercase tracking-[0.12em] text-action\">Подбор внутри бренда</p><h2 class=\"mt-2 max-w-4xl font-display text-4xl font-extrabold leading-tight\" id=\"brand-mount-matcher-static-title\">Какие ONKRON подходят к вашему телевизору</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Введите полный код телевизора в интерактивный поиск. Локальный Rust/WASM‑расчёт проверит каждую модель ONKRON по точной паре VESA, нагрузке с запасом 25% и паспортному диапазону диагонали. Покупка и регистрация для результата не нужны.</p><dl class=\"mt-6 grid gap-px border border-ink bg-ink sm:grid-cols-3\"><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Моделей ONKRON</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{mount_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Телевизоров в поиске</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{model_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Подтверждённых пар</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{verified_pairs}</dd></div></dl><p class=\"mt-4 max-w-3xl text-sm leading-relaxed text-muted\">TM5 и TM5‑BW считаются разными артикулами. При отключённом JavaScript остаются полный сравнительный каталог и <a class=\"font-semibold text-action underline underline-offset-4\" href=\"/podbor/\">общий подбор по модели телевизора</a>.</p></section>",
        mount_count = mount_ids.len(),
        model_count = models.len(),
        verified_pairs = verified_pairs,
    )
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
        "<header class=\"border-b-2 border-ink bg-paper\"><div class=\"mx-auto max-w-[1440px] px-5 py-4 sm:px-8\"><a class=\"font-display text-xl font-extrabold\" href=\"/\">KREPI TV</a></div></header><main class=\"min-h-screen bg-paper text-ink\"><article class=\"mx-auto max-w-[1440px] px-5 pb-16 pt-6 sm:px-8\"><nav class=\"font-mono text-xs text-muted\" aria-label=\"Навигационная цепочка\"><a href=\"/\">Главная</a> / {h1}</nav><header class=\"mt-5 border-b-2 border-ink pb-7\"><p class=\"font-mono text-xs uppercase tracking-[0.12em] text-action\">{kicker}</p><h1 class=\"mt-3 max-w-[1180px] break-words font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold leading-[0.92]\">{h1}</h1><p class=\"mt-6 max-w-[1000px] text-lg leading-relaxed text-muted sm:text-xl\">{lead}</p><p class=\"mt-5 font-mono text-xs text-muted\">Актуально на {updated_at}</p></header><div class=\"grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_22rem]\"><div class=\"max-w-4xl space-y-10\">{sections}</div><aside class=\"border border-line bg-white p-6\"><h2 class=\"font-display text-2xl font-extrabold\">Полезные разделы</h2><nav class=\"mt-4 grid\" aria-label=\"Связанные разделы\">{related_links}</nav></aside></div></article></main><footer class=\"border-t-2 border-ink bg-paper\"><nav class=\"mx-auto flex max-w-[1440px] flex-wrap gap-6 px-5 py-7 font-display text-sm font-bold uppercase sm:px-8\" aria-label=\"Информация о сервисе\"><a href=\"/o-proekte/\">О проекте</a><a href=\"/metodika/\">Методика</a><a href=\"/kontakty/\">Контакты</a><a href=\"/politika-konfidencialnosti/\">Конфиденциальность</a></nav></footer>",
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
        if let Some(hardware) = &tv.wall_mount_screws {
            assert!(
                !hardware.groups.is_empty()
                    && hardware.groups.len() <= 4
                    && hardware
                        .groups
                        .iter()
                        .map(|group| group.quantity)
                        .sum::<u32>()
                        == 4
                    && !hardware.source_region.trim().is_empty()
                    && hardware.source_url.starts_with("https://")
                    && !hardware.source_label.trim().is_empty()
                    && match (
                        hardware.secondary_source_url.as_deref(),
                        hardware.secondary_source_label.as_deref(),
                    ) {
                        (None, None) => true,
                        (Some(url), Some(label)) => {
                            url.starts_with("https://") && !label.trim().is_empty()
                        }
                        _ => false,
                    }
                    && is_valid_iso_date(&hardware.checked_at)
                    && !hardware.note.trim().is_empty()
                    && hardware
                        .required_parts_note
                        .as_ref()
                        .is_none_or(|note| !note.trim().is_empty()),
                "Некорректный паспорт настенного монтажа у {}",
                tv.id
            );
            if let Some(conflict) = &hardware.vesa_conflict {
                assert!(
                    !conflict.catalog_value.trim().is_empty()
                        && !conflict.manual_value.trim().is_empty()
                        && conflict.catalog_value != conflict.manual_value
                        && !conflict.note.trim().is_empty(),
                    "Некорректное расхождение VESA у {}",
                    tv.id
                );
            }
            let mut locations = HashSet::new();
            let mut effective_range_labels = HashSet::new();
            for group in &hardware.groups {
                let has_exact_length = group.length_mm.is_some();
                let has_unknown_length = group.length_unknown == Some(true);
                let has_engagement_range =
                    group.engagement_min_mm.is_some() && group.engagement_max_mm.is_some();
                if has_engagement_range {
                    effective_range_labels
                        .insert(group.range_label.as_deref().unwrap_or("L").to_owned());
                }
                let valid_exact_length = group
                    .length_mm
                    .is_none_or(|length| (4..=100).contains(&length));
                let valid_engagement_range =
                    match (group.engagement_min_mm, group.engagement_max_mm) {
                        (Some(minimum), Some(maximum)) => {
                            minimum >= 1.0 && maximum <= 100.0 && minimum < maximum
                        }
                        (None, None) => true,
                        _ => false,
                    };
                let valid_range_label = match group.range_label.as_deref() {
                    None => true,
                    Some("L" | "C") => has_engagement_range,
                    Some(_) => false,
                };
                let valid_unknown_length = group.length_unknown.is_none_or(|value| value);
                let measurement_modes =
                    [has_exact_length, has_unknown_length, has_engagement_range]
                        .into_iter()
                        .filter(|mode| *mode)
                        .count();
                assert!(
                    !group.location.trim().is_empty()
                        && locations.insert(group.location.to_lowercase())
                        && group.thread.starts_with('M')
                        && group.thread.len() > 1
                        && group.thread[1..].bytes().all(|byte| byte.is_ascii_digit())
                        && measurement_modes == 1
                        && valid_exact_length
                        && valid_engagement_range
                        && valid_range_label
                        && valid_unknown_length
                        && (1..=4).contains(&group.quantity),
                    "Некорректная группа винтов у {}",
                    tv.id
                );
            }
            assert!(
                effective_range_labels.len() <= 1,
                "Паспорт {} смешивает диапазоны L и C; SSR и React должны давать одинаковое предупреждение",
                tv.id
            );
        }
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
            is_valid_iso_date(&page.lastmod),
            "Некорректная дата lastmod на {}",
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

    let contacts = pages
        .iter()
        .find(|page| page.id == "contacts")
        .expect("Нет страницы контактов");
    assert!(
        contacts.related_links.iter().any(|link| {
            link.href == "https://github.com/jimbokl/krepitv/issues/new/choose"
                && link.label == "Создать обращение"
        }),
        "Страница контактов должна вести в проверенный публичный канал GitHub Issues"
    );
    let contacts_text = contacts
        .sections
        .iter()
        .flat_map(|section| section.paragraphs.iter().chain(section.bullets.iter()))
        .cloned()
        .collect::<Vec<_>>()
        .join(" ");
    assert!(
        contacts_text.contains("видны всем") && contacts_text.contains("персональные данные"),
        "Страница контактов должна предупреждать о публичности и персональных данных"
    );

    let privacy = pages
        .iter()
        .find(|page| page.id == "privacy")
        .expect("Нет политики конфиденциальности");
    assert!(
        privacy.sections.iter().any(|section| {
            section.heading == "Публичные обращения через GitHub"
                && section.paragraphs.iter().any(|paragraph| {
                    paragraph.contains("владелец KREPI TV получает доступ")
                        && paragraph.contains("политике")
                })
        }),
        "Политика должна объяснять границу обработки публичных GitHub Issues"
    );
}

fn validate_commercial_text(value: &str, maximum_length: usize, label: &str) {
    assert!(
        !value.trim().is_empty() && value == value.trim(),
        "{label}: ожидалась непустая строка без внешних пробелов"
    );
    assert!(
        value.chars().count() <= maximum_length,
        "{label}: текст длиннее {maximum_length} символов"
    );
}

fn contains_number_token(value: &str, number: usize) -> bool {
    let needle = number.to_string();
    value.match_indices(&needle).any(|(start, matched)| {
        let before_is_digit = value[..start]
            .chars()
            .next_back()
            .is_some_and(|character| character.is_ascii_digit());
        let end = start + matched.len();
        let after_is_digit = value[end..]
            .chars()
            .next()
            .is_some_and(|character| character.is_ascii_digit());
        !before_is_digit && !after_is_digit
    })
}

fn validate_commercial_profiles(
    file: &CommercialProfilesFile,
    models: &[TvModel],
    mounts: &[Mount],
    graph: &[CompatibilityEdge],
) {
    assert_eq!(
        file.schema_version, 1,
        "Неподдерживаемая версия коммерческих профилей"
    );
    assert!(
        is_valid_iso_date(&file.updated_at),
        "Некорректная дата обновления коммерческих профилей"
    );
    assert_eq!(
        file.profiles.len(),
        31,
        "SEO-серия должна содержать ровно 31 проверенный профиль"
    );

    let expected = [
        "mount:onkron-tm6",
        "mount:onkron-tm5-bw",
        "mount:onkron-nn24",
        "mount:itech-plb440nt",
        "mount:itech-ptrb440ln",
        "mount:itech-slt-460",
        "model:tcl-55c6k",
        "model:hisense-55u7s",
        "model:tcl-55c7l",
        "model:hisense-65u7s",
        "model:hisense-55u7s-pro",
        "model:hisense-55e77sl",
        "model:hisense-50u77sl",
        "model:hisense-65u77sl",
        "model:hisense-50e7s",
        "model:hisense-55e7s",
        "model:samsung-ue43u8000fuxru",
        "model:samsung-ue50u8000fuxru",
        "model:samsung-ue55u8000fuxru",
        "model:tcl-55c7k",
        "model:tcl-75c6k",
        "model:tcl-65c7k",
        "model:samsung-qe43q7faauxru",
        "model:samsung-qe50q7faauxru",
        "model:samsung-ue32f6000fuxru",
        "model:hisense-65u8q",
        "model:hisense-65u7q",
        "model:hisense-65ur9s",
        "model:tcl-55p6k",
        "model:tcl-55p7k",
        "model:tcl-43s5k",
    ]
    .into_iter()
    .collect::<HashSet<_>>();
    let mut keys = HashSet::new();
    let mut paths = HashSet::new();

    for profile in &file.profiles {
        let key = format!("{}:{}", profile.entity_kind, profile.entity_id);
        assert!(
            expected.contains(key.as_str()),
            "Неожиданный SEO-профиль {key}"
        );
        assert!(keys.insert(key.clone()), "Повторяется SEO-профиль {key}");
        assert!(
            paths.insert(profile.path.as_str()),
            "Повторяется путь SEO-профиля {}",
            profile.path
        );

        let expected_path = match profile.entity_kind.as_str() {
            "model" => {
                assert!(
                    models.iter().any(|tv| tv.id == profile.entity_id),
                    "Модель {} отсутствует в каталоге",
                    profile.entity_id
                );
                format!("/modeli/{}/", profile.entity_id)
            }
            "mount" => {
                assert!(
                    mounts.iter().any(|mount| mount.id == profile.entity_id),
                    "Кронштейн {} отсутствует в каталоге",
                    profile.entity_id
                );
                format!("/kronshteyny/{}/", profile.entity_id)
            }
            other => panic!("Некорректный вид сущности SEO-профиля: {other}"),
        };
        assert_eq!(
            profile.path, expected_path,
            "SEO-профиль {key} привязан к неверному URL"
        );
        validate_commercial_text(&profile.title, 65, &format!("{key}.title"));
        validate_commercial_text(&profile.description, 160, &format!("{key}.description"));
        validate_commercial_text(&profile.kicker, 80, &format!("{key}.kicker"));
        validate_commercial_text(&profile.heading, 160, &format!("{key}.heading"));
        validate_commercial_text(&profile.answer, 1_200, &format!("{key}.answer"));
        assert_eq!(profile.faq.len(), 3, "У {key} должно быть ровно 3 FAQ");
        for (index, item) in profile.faq.iter().enumerate() {
            validate_commercial_text(&item.question, 180, &format!("{key}.faq[{index}].question"));
            validate_commercial_text(&item.answer, 600, &format!("{key}.faq[{index}].answer"));
        }

        let verified_count = graph
            .iter()
            .filter(|edge| {
                edge.fit_status == "verified-fit"
                    && match profile.entity_kind.as_str() {
                        "model" => edge.tv_id == profile.entity_id,
                        "mount" => edge.mount_id == profile.entity_id,
                        _ => false,
                    }
            })
            .count();
        assert!(
            verified_count > 0
                && contains_number_token(&profile.answer, verified_count)
                && contains_number_token(&profile.description, verified_count),
            "SEO-профиль {key} не совпадает с текущим числом verified-fit: {verified_count}"
        );

        let searchable = format!(
            "{} {} {} {} {} {}",
            profile.title,
            profile.description,
            profile.kicker,
            profile.heading,
            profile.answer,
            profile
                .faq
                .iter()
                .map(|item| format!("{} {}", item.question, item.answer))
                .collect::<Vec<_>>()
                .join(" ")
        )
        .to_lowercase();
        assert!(
            !searchable.contains('₽')
                && !searchable.contains(" руб")
                && !searchable.contains("market.yandex")
                && !searchable.contains("http://")
                && !searchable.contains("https://"),
            "SEO-профиль {key} содержит цену или внешнюю ссылку"
        );
    }

    assert_eq!(
        keys.iter().map(String::as_str).collect::<HashSet<_>>(),
        expected,
        "Набор коммерческих SEO-профилей изменён без подтверждённого спроса"
    );
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
    let commercial_profiles: CommercialProfilesFile =
        read_json(&data.join("commercial_profiles.json"));
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
    let compatibility_graph = build_compatibility_graph(&models, &mounts);
    validate_models(&models);
    validate_mounts(&mounts);
    validate_seo_pages(&seo_pages);
    validate_trust_pages(&trust_pages);
    validate_commercial_profiles(&commercial_profiles, &models, &mounts, &compatibility_graph);

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
        data.join("commercial_profiles.json"),
        public_data.join("commercial-profiles.json"),
    )
    .expect("Не удалось скопировать коммерческие SEO-профили");
    fs::copy(
        data.join("affiliate/public-offers.json"),
        public_data.join("affiliate-offers.json"),
    )
    .expect("Не удалось скопировать публичный снимок предложений");
    fs::copy(
        data.join("affiliate/public-hub-offers.json"),
        public_data.join("affiliate-hub-offers.json"),
    )
    .expect("Не удалось скопировать публичный снимок размещений SEO-хабов");
    fs::copy(
        data.join("affiliate/public-model-offers.json"),
        public_data.join("affiliate-model-offers.json"),
    )
    .expect("Не удалось скопировать публичный снимок размещений модельных страниц");

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
            "Проверьте VESA, массу, диагональ и высоту установки для точной модели телевизора. Расчёт работает локально в браузере.",
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
        let commercial_profile =
            commercial_profile_for(&commercial_profiles.profiles, "model", &tv.id);
        let title = commercial_profile.map_or_else(
            || {
                format!(
                    "Кронштейн для {}: VESA {}×{} — KREPI TV",
                    tv.title, tv.vesa_width_mm, tv.vesa_height_mm
                )
            },
            |profile| profile.title.clone(),
        );
        let description = commercial_profile.map_or_else(
            || {
                format!(
                    "Совместимые кронштейны для {}: VESA {}×{}, масса без подставки {} кг. Проверка по данным производителя.",
                    tv.title, tv.vesa_width_mm, tv.vesa_height_mm, tv.weight_kg
                )
            },
            |profile| profile.description.clone(),
        );
        let matches = model_mount_matches(tv, &mounts);
        let static_body = model_page_body(
            tv,
            &matches,
            &affiliate_snapshot.offers,
            affiliate_now_seconds,
            &seo_pages,
            commercial_profile,
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
        let commercial_profile =
            commercial_profile_for(&commercial_profiles.profiles, "mount", &mount.id);
        let title = commercial_profile.map_or_else(
            || {
                format!(
                    "Кронштейн {}: совместимые телевизоры — KREPI TV",
                    mount.title
                )
            },
            |profile| profile.title.clone(),
        );
        let description = commercial_profile.map_or_else(
            || {
                format!(
                    "{}: {} кронштейн, нагрузка до {} кг, диагонали {}–{}″. Проверка совместимости с моделями телевизоров.",
                    mount.title,
                    mechanism_label(&mount.mechanism),
                    mount.max_load_kg,
                    mount.min_diagonal_in,
                    mount.max_diagonal_in,
                )
            },
            |profile| profile.description.clone(),
        );
        let static_body = mount_page_body(
            mount,
            &models,
            &compatibility_graph,
            &affiliate_snapshot.offers,
            affiliate_now_seconds,
            commercial_profile,
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
        let static_body = seo_page_body(page, &seo_pages, &models, &mounts, &compatibility_graph);
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
        let structured_data = if let Some(dataset) = dataset_json_ld(&page.id, &canonical) {
            format!("{breadcrumb}{dataset}")
        } else {
            breadcrumb
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
                    json_ld: &structured_data,
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

    assert!(
        is_valid_iso_date(CORE_PAGES_UPDATED_AT),
        "Некорректная дата обновления основных страниц"
    );
    for dependent_date in models
        .iter()
        .map(|model| model.checked_at.as_str())
        .chain(models.iter().filter_map(|model| {
            model
                .wall_mount_screws
                .as_ref()
                .map(|hardware| hardware.checked_at.as_str())
        }))
        .chain(mounts.iter().map(|mount| mount.checked_at.as_str()))
        .chain(std::iter::once(commercial_profiles.updated_at.as_str()))
    {
        assert!(
            dependent_date <= CORE_PAGES_UPDATED_AT,
            "Дата основных страниц должна быть не старше зависимого каталога"
        );
    }
    let mut urls = vec![
        (
            "https://krepitv.ru/".to_string(),
            CORE_PAGES_UPDATED_AT.to_string(),
        ),
        (
            "https://krepitv.ru/podbor/".to_string(),
            CORE_PAGES_UPDATED_AT.to_string(),
        ),
        (
            "https://krepitv.ru/modeli/".to_string(),
            CORE_PAGES_UPDATED_AT.to_string(),
        ),
        (
            "https://krepitv.ru/kronshteyny/".to_string(),
            CORE_PAGES_UPDATED_AT.to_string(),
        ),
    ];
    urls.extend(
        models
            .iter()
            .filter(|tv| is_indexable_model(&tv.id, &compatibility_graph))
            .map(|tv| {
                let mut lastmod = tv.checked_at.as_str();
                if let Some(hardware) = &tv.wall_mount_screws {
                    lastmod = lastmod.max(hardware.checked_at.as_str());
                }
                if commercial_profile_for(&commercial_profiles.profiles, "model", &tv.id).is_some()
                {
                    lastmod = lastmod.max(commercial_profiles.updated_at.as_str());
                }
                (
                    format!("https://krepitv.ru/modeli/{}/", tv.id),
                    lastmod.to_string(),
                )
            }),
    );
    urls.extend(
        mounts
            .iter()
            .filter(|mount| is_indexable_mount(&mount.id, &compatibility_graph))
            .map(|mount| {
                let lastmod =
                    if commercial_profile_for(&commercial_profiles.profiles, "mount", &mount.id)
                        .is_some()
                    {
                        mount
                            .checked_at
                            .as_str()
                            .max(commercial_profiles.updated_at.as_str())
                    } else {
                        mount.checked_at.as_str()
                    };
                (
                    format!("https://krepitv.ru/kronshteyny/{}/", mount.id),
                    lastmod.to_string(),
                )
            }),
    );
    urls.extend(
        seo_pages
            .iter()
            .filter(|page| is_indexable_seo_page(page))
            .map(|page| {
                (
                    format!("https://krepitv.ru{}", page.path),
                    seo_page_lastmod(page).to_string(),
                )
            }),
    );
    urls.extend(trust_pages.iter().map(|page| {
        (
            format!("https://krepitv.ru{}", page.path),
            page.lastmod.clone(),
        )
    }));
    let sitemap_urls = urls
        .iter()
        .map(|(url, lastmod)| {
            format!(
                "  <url><loc>{}</loc><lastmod>{}</lastmod></url>",
                escape_html(url),
                escape_html(lastmod),
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
    use super::{
        CommercialProfilesFile, HeadExtras, PublicAffiliateSnapshot, SeoPage, TrustPage, TvModel,
        affiliate_offer_placeholder_html, brand_catalog_html, build_compatibility_graph,
        commercial_profile_for, dataset_json_ld, escape_html, home_page_body, html_shell,
        is_indexable_model, is_indexable_mount, is_indexable_seo_page,
        is_publishable_affiliate_offer, is_valid_iso_date, json_ld_script, model_mount_matches,
        model_page_body, mount_page_body, mounts_catalog_body, parse_rfc3339_utc_seconds,
        read_json, related_seo_pages, seo_brand_mount_matcher_html, seo_buy_mount_comparison_html,
        seo_calculator_note, seo_catalog_html, seo_page_body, seo_screw_catalog_html,
        seo_vesa_model_catalog_html, static_footer, static_header, trust_page_body,
        tv_product_json_ld, validate_commercial_profiles, validate_trust_pages,
        wall_mount_screws_html, workspace_root,
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
    fn keeps_market_verification_out_of_search_descriptions() {
        let description = "Независимая проверка совместимости.";
        let home = html_shell(
            "KREPI TV",
            description,
            "https://krepitv.ru/",
            "home",
            None,
            None,
            HeadExtras {
                robots: None,
                json_ld: "",
            },
        );
        assert!(home.contains(
            "<meta name=\"yandex-market-affiliate-verification\" content=\"YMReferral\">"
        ));
        assert!(home.contains(&format!(
            "<meta name=\"description\" content=\"{description}\">"
        )));
        assert!(!home.contains(&format!("{description} YMReferral")));

        let inner = html_shell(
            "Внутренняя страница",
            description,
            "https://krepitv.ru/podbor/",
            "matcher",
            None,
            None,
            HeadExtras {
                robots: None,
                json_ld: "",
            },
        );
        assert!(!inner.contains("yandex-market-affiliate-verification"));
    }

    #[test]
    fn static_navigation_links_the_primary_no_signal_traffic_wedge() {
        assert!(
            static_header().contains("href=\"/televizor-pishet-net-signala/\">Нет сигнала</a>")
        );
        assert!(
            static_footer().contains("href=\"/televizor-pishet-net-signala/\">Нет сигнала</a>")
        );
        assert!(!static_header().contains("href=\"/metodika/\">Методика</a>"));
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
    fn contacts_expose_a_real_public_channel_without_requesting_personal_data() {
        let pages: Vec<TrustPage> = read_json(&workspace_root().join("data/trust_pages.json"));
        validate_trust_pages(&pages);
        let contacts = pages
            .iter()
            .find(|page| page.id == "contacts")
            .expect("Нет страницы контактов");
        let html = trust_page_body(contacts);

        assert!(html.contains("https://github.com/jimbokl/krepitv/issues/new/choose"));
        assert!(html.contains("Создать обращение"));
        assert!(html.contains("Обращение и ответы видны всем"));
        assert!(!html.contains("mailto:"));
    }

    #[test]
    fn uses_explicit_indexability_policy() {
        let page = |indexable| SeoPage {
            id: "test".into(),
            home_priority: None,
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
    fn dataset_json_ld_describes_two_distinct_downloadable_datasets() {
        let sizes = dataset_json_ld("vesa", "https://krepitv.ru/vesa/")
            .expect("Нет Dataset для таблицы VESA");
        let screws = dataset_json_ld(
            "tv-mount-screws",
            "https://krepitv.ru/vinty-dlya-krepleniya-televizora/",
        )
        .expect("Нет Dataset для винтов VESA");

        for structured in [&sizes, &screws] {
            assert!(structured.contains("\"@type\":\"Dataset\""));
            assert!(structured.contains("\"isAccessibleForFree\":true"));
            assert!(structured.contains("https://github.com/jimbokl/krepitv/blob/2f19d58ef793ffc1e26c8c8fdb6d53f2a20edbfe/LICENSE"));
            assert_eq!(structured.matches("\"@type\":\"DataDownload\"").count(), 2);
            assert!(!structured.contains("market.yandex.ru"));
            assert!(!structured.contains("?"));
        }
        assert!(sizes.contains("KREPI-TV-RU-VESA-SIZES-1.0.0"));
        assert!(sizes.contains("tv-vesa-sizes.csv"));
        assert!(sizes.contains("tv-vesa-sizes.json"));
        assert!(screws.contains("KREPI-TV-RU-VESA-SCREWS-1.0.0"));
        assert!(screws.contains("tv-vesa-screws.csv"));
        assert!(screws.contains("tv-vesa-screws.json"));
        assert!(dataset_json_ld("mounting-height", "https://krepitv.ru/x/").is_none());
    }

    #[test]
    fn affiliate_offer_is_fresh_for_48_hours_but_static_html_has_only_a_placeholder() {
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

        let html = affiliate_offer_placeholder_html(offer, 2);
        assert!(html.contains("data-affiliate-slot="));
        assert!(html.contains("Проверяем наличие на Яндекс Маркете"));
        assert!(!html.contains("data-affiliate-offer-id="));
        assert!(!html.contains("href="));
        assert!(!html.contains(&offer.affiliate_href));
        assert!(!html.contains("может получить вознаграждение"));
        assert!(!html.contains("promise"));
        assert!(!html.contains("stock"));
    }

    #[test]
    fn exact_models_keep_source_backed_wall_mount_screw_passports() {
        let models: Vec<TvModel> = read_json(&workspace_root().join("data/tv_models.json"));
        let sourced = models
            .iter()
            .filter(|model| model.wall_mount_screws.is_some())
            .collect::<Vec<_>>();
        assert_eq!(sourced.len(), 26);
        let expected_passport_ids = [
            "tcl-55c6k",
            "tcl-55c7l",
            "tcl-55c7k",
            "tcl-65c7k",
            "tcl-75c6k",
            "tcl-55p6k",
            "tcl-55p7k",
            "hisense-43e7s",
            "hisense-50e7s",
            "hisense-50u77sl",
            "hisense-55e7s",
            "hisense-55e77sl",
            "hisense-55u7q",
            "hisense-55u7s",
            "hisense-55u7s-pro",
            "hisense-65u7q",
            "hisense-65u7s",
            "hisense-65u77sl",
            "hisense-65u8q",
            "hisense-65ur9s",
            "samsung-qe43q7faauxru",
            "samsung-qe50q7faauxru",
            "samsung-ue32f6000fuxru",
            "samsung-ue43u8000fuxru",
            "samsung-ue50u8000fuxru",
            "samsung-ue55u8000fuxru",
        ]
        .into_iter()
        .collect::<std::collections::HashSet<_>>();
        let actual_passport_ids = sourced
            .iter()
            .map(|model| model.id.as_str())
            .collect::<std::collections::HashSet<_>>();
        assert_eq!(actual_passport_ids, expected_passport_ids);

        let model = |id: &str| {
            models
                .iter()
                .find(|model| model.id == id)
                .expect("Нет точной модели с паспортом монтажа")
        };
        let c7k_65 = model("tcl-65c7k");
        let hardware = c7k_65
            .wall_mount_screws
            .as_ref()
            .expect("Нет данных о винтах TCL 65C7K");
        assert_eq!(hardware.groups.len(), 2);
        assert_eq!(hardware.groups[0].length_mm, Some(16));
        assert_eq!(hardware.groups[1].length_mm, Some(12));
        assert_eq!(
            hardware
                .groups
                .iter()
                .map(|group| group.quantity)
                .sum::<u32>(),
            4
        );
        let html = wall_mount_screws_html(c7k_65);
        assert!(html.contains("Верхний ряд"));
        assert!(html.contains("2 шт. · M6×16 мм"));
        assert!(html.contains("Нижний ряд"));
        assert!(html.contains("2 шт. · M6×12 мм"));
        assert!(html.contains("не глубина резьбового отверстия"));
        assert!(html.contains("регион: Россия"));
        assert!(html.contains("href=\"/vinty-dlya-krepleniya-televizora/\""));

        let catalog_html = seo_screw_catalog_html(&models);
        assert!(catalog_html.contains("data-screw-catalog=\"true\""));
        assert!(catalog_html.contains(
            "Моделей с паспортом</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">26"
        ));
        assert!(catalog_html.contains("data-searchable-model-count=\"80\""));
        assert!(catalog_html.contains("data-model-search-count=\"80\""));
        assert_eq!(catalog_html.matches("<option value=").count(), 80);
        assert!(catalog_html.contains("data-known-model-fallback=\"true\""));
        assert!(catalog_html.contains("паспорт винтов ещё не подтверждён"));
        assert!(
            catalog_html.contains(
                "https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0/tv-vesa-screws.csv"
            )
        );
        assert_eq!(catalog_html.matches("<details").count(), 3);
        assert_eq!(catalog_html.matches("Совместимые кронштейны →").count(), 26);
        assert!(catalog_html.contains(&hardware.source_url));
        assert!(!catalog_html.contains("market.yandex.ru"));

        let c7l_html = wall_mount_screws_html(model("tcl-55c7l"));
        assert!(c7l_html.contains("4 шт. · M6×20 мм"));
        assert!(c7l_html.contains("требует использовать показанные адаптеры VESA"));

        let international_html = wall_mount_screws_html(model("tcl-55c6k"));
        assert!(international_html.contains("регион: Австралия"));
        assert!(international_html.contains("сверьте руководство российского экземпляра"));

        let structured = tv_product_json_ld(c7k_65, "https://krepitv.ru/modeli/tcl-65c7k/");
        assert!(structured.contains("Винты VESA по руководству"));
        assert!(structured.contains("Верхний ряд: 2 × M6×16 мм; Нижний ряд: 2 × M6×12 мм"));

        let u7s_html = wall_mount_screws_html(model("hisense-55u7s"));
        assert!(u7s_html.contains("4 шт. · M6 · диапазон L 9,5–11,5 мм"));
        assert!(u7s_html.contains("не готовая полная длина винта"));
        assert!(u7s_html.contains("промежуточные вставки"));
        assert!(u7s_html.contains("регион: Россия"));

        let e77_html = wall_mount_screws_html(model("hisense-55e77sl"));
        assert!(e77_html.contains("4 шт. · M6 · диапазон L 8–10 мм"));
        assert!(e77_html.contains("две комплектные монтажные детали"));

        let samsung_html = wall_mount_screws_html(model("samsung-ue55u8000fuxru"));
        assert!(samsung_html.contains("4 шт. · M8 · диапазон C 23–25 мм"));
        assert!(samsung_html.contains("data-adapter-status=\"unknown\""));
        assert!(samsung_html.contains("после монтажной пластины"));
        assert!(!samsung_html.contains("M8×23"));

        for (id, model_name, file_id) in [
            ("samsung-qe43q7faauxru", "QE43Q7FAAU", "10108131"),
            ("samsung-qe50q7faauxru", "QE50Q7FAAU", "10108143"),
        ] {
            let q7f = model(id);
            let q7f_hardware = q7f
                .wall_mount_screws
                .as_ref()
                .expect("Нет паспорта Samsung Q7F");
            assert!(
                q7f_hardware
                    .source_url
                    .contains(&format!("ModelName={model_name}"))
            );
            assert!(
                q7f_hardware
                    .source_url
                    .contains(&format!("CttFileID={file_id}"))
            );
            let q7f_html = wall_mount_screws_html(q7f);
            assert!(q7f_html.contains("4 шт. · M8 · диапазон C 19–21 мм"));
            assert!(q7f_html.contains("data-adapter-status=\"unknown\""));
            assert!(!q7f_html.contains("M8×19"));
        }
        let f6000 = model("samsung-ue32f6000fuxru");
        let f6000_hardware = f6000
            .wall_mount_screws
            .as_ref()
            .expect("Нет паспорта Samsung F6000F");
        assert!(f6000_hardware.source_url.contains("ModelName=UE32F6000FU"));
        assert!(f6000_hardware.source_url.contains("CttFileID=10080407"));
        let f6000_html = wall_mount_screws_html(f6000);
        assert!(f6000_html.contains("4 шт. · M8 · диапазон C 21–23 мм"));
        assert!(f6000_html.contains("M4×L14"));
        assert!(f6000_html.contains("относятся к ножкам"));
        assert!(!f6000_html.contains("M8×21"));

        for (id, pdf_fragment, support_id) in [
            ("hisense-65u8q", "/U8Q/65-75U8Q.pdf", "ID=8669"),
            ("hisense-65u7q", "/u7q/U7Q.pdf", "ID=8663"),
            (
                "hisense-65ur9s",
                "/UR9S/20221782_65-75-85UR9S_Rus.pdf",
                "ID=9197",
            ),
        ] {
            let hisense = model(id);
            assert_eq!(hisense.vesa_width_mm, 400);
            assert_eq!(hisense.vesa_height_mm, 400);
            let hisense_hardware = hisense
                .wall_mount_screws
                .as_ref()
                .expect("Нет паспорта Hisense 65 дюймов");
            assert_eq!(hisense_hardware.groups.len(), 1);
            let group = &hisense_hardware.groups[0];
            assert_eq!(group.thread, "M6");
            assert_eq!(group.engagement_min_mm, Some(9.5));
            assert_eq!(group.engagement_max_mm, Some(11.5));
            assert_eq!(group.range_label.as_deref(), Some("L"));
            assert_eq!(group.quantity, 4);
            assert_eq!(group.length_mm, None);
            assert_eq!(group.length_unknown, None);
            assert_eq!(hisense_hardware.requires_adapters, None);
            assert!(hisense_hardware.source_url.contains(pdf_fragment));
            assert!(
                hisense_hardware
                    .secondary_source_url
                    .as_deref()
                    .is_some_and(|url| url.contains(support_id))
            );
            assert!(
                hisense_hardware.required_parts_note.as_deref().is_some_and(
                    |note| note.contains("количество, размер и комплектность не указаны")
                )
            );
            assert!(hisense_hardware.note.contains("Полная длина и шаг резьбы"));

            let hisense_html = wall_mount_screws_html(hisense);
            assert!(hisense_html.contains("4 шт. · M6 · диапазон L 9,5–11,5 мм"));
            assert!(hisense_html.contains("промежуточные вставки"));
            assert!(hisense_html.contains("не готовая полная длина винта"));
            assert!(hisense_html.contains("data-adapter-status=\"unknown\""));
            assert!(!hisense_html.contains("M6×9"));
            assert!(!hisense_html.contains("M6×10"));
            assert!(!hisense_html.contains("M6×11"));
            assert!(!hisense_html.contains("M6×12"));
        }

        let p6k_html = wall_mount_screws_html(model("tcl-55p6k"));
        assert_eq!(p6k_html.matches("M6 · длина не определена").count(), 2);
        assert!(p6k_html.contains("11–28 мм"));
        assert!(p6k_html.contains("максимум 26 мм"));
        assert!(p6k_html.contains("дополнительный официальный источник"));
        assert!(p6k_html.contains("не дают единой безопасной длины"));
        assert!(p6k_html.contains("Не используйте M6×12"));

        let p7k_html = wall_mount_screws_html(model("tcl-55p7k"));
        assert!(p7k_html.contains("2 шт. · M6×16 мм"));
        assert!(p7k_html.contains("2 шт. · M6×30 мм"));
        assert!(p7k_html.contains("ряд не указан"));
        assert!(p7k_html.contains("регион: Новая Зеландия"));
        assert!(p7k_html.contains("Российская спецификация точной модели TCL 55P7K"));
        assert!(p7k_html.contains("сверить руководство российского экземпляра"));

        let u77sl_html = wall_mount_screws_html(model("hisense-65u77sl"));
        assert!(u77sl_html.contains("код 65U77SL на страницах PDF отсутствует"));

        let pro = model("hisense-55u7s-pro");
        let pro_html = wall_mount_screws_html(pro);
        assert!(pro_html.contains("data-vesa-source-conflict=\"true\""));
        assert!(pro_html.contains("Карточка модели: 400×300 мм · руководство: 400×400 мм"));
        let pro_structured =
            tv_product_json_ld(pro, "https://krepitv.ru/modeli/hisense-55u7s-pro/");
        assert!(
            pro_structured
                .contains("Требуется проверка: карточка 400×300 мм / руководство 400×400 мм")
        );
    }

    #[test]
    fn vesa_lookup_prerenders_all_models_sources_and_conflicts() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let mounts: Vec<Mount> = read_json(&root.join("data/mounts.json"));
        let graph = build_compatibility_graph(&models, &mounts);
        let html = seo_vesa_model_catalog_html(&models, &graph);

        assert!(html.contains("data-vesa-model-catalog=\"true\""));
        assert!(html.contains("data-searchable-model-count=\"80\""));
        assert!(html.contains("data-vesa-model-search-count=\"80\""));
        assert_eq!(html.matches("<option value=").count(), 80);
        assert_eq!(html.matches("<details").count(), 5);
        assert!(html.contains("Таблица VESA телевизоров"));
        assert!(html.contains(
            "https://github.com/jimbokl/krepitv/releases/download/datasets-v1.0.0/tv-vesa-sizes.csv"
        ));
        assert!(html.contains("data-vesa-source-conflict=\"true\""));
        assert!(html.contains("Источники расходятся: 400×300 мм / 400×400 мм"));
        assert!(!html.contains("market.yandex.ru"));

        for model in &models {
            assert!(html.contains(&format!("href=\"/modeli/{}/\"", model.id)));
            assert!(html.contains(&model.source_url));
        }
    }

    #[test]
    fn home_prioritizes_seven_traffic_tools_and_three_diagnostics_without_listing_every_model() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let pages: Vec<SeoPage> = read_json(&root.join("data/seo_pages.json"));
        let html = home_page_body(&models, &pages);

        assert_eq!(html.matches("data-featured-traffic-tool=").count(), 7);
        for id in [
            "phone-to-tv",
            "tv-no-signal",
            "tv-dimensions",
            "wall-planner",
            "laptop-to-tv",
            "digital-channels",
            "picture-setup",
        ] {
            assert!(html.contains(&format!("data-featured-traffic-tool=\"{id}\"")));
        }
        assert!(html.contains("data-home-tv-diagnostics=\"true\""));
        assert_eq!(html.matches("data-home-tv-diagnostic=").count(), 3);
        for id in [
            "tv-sound-no-picture",
            "tv-no-sound",
            "tv-remote-not-working",
        ] {
            assert!(html.contains(&format!("data-home-tv-diagnostic=\"{id}\"")));
        }
        assert!(html.contains("80 моделей с источниками"));
        assert!(html.contains("href=\"/modeli/\""));
        assert!(html.contains("href=\"/kronshteyny/\""));
        for model in &models {
            assert!(!html.contains(&format!("href=\"/modeli/{}/\"", model.id)));
        }
    }

    #[test]
    fn tv_diagnostic_pages_are_unique_static_first_and_stop_before_hardware_diagnosis() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let expected = [
            (
                "tv-sound-no-picture",
                "/televizor-zvuk-est-izobrazheniya-net/",
            ),
            ("tv-no-sound", "/net-zvuka-na-televizore/"),
            ("tv-remote-not-working", "/ne-rabotaet-pult-ot-televizora/"),
        ];

        for (id, path) in expected {
            let matches = pages
                .iter()
                .filter(|page| page.id == id || page.path == path)
                .collect::<Vec<_>>();
            assert_eq!(matches.len(), 1, "{id} должен иметь один canonical");
            let page = matches[0];
            assert_eq!(page.id, id);
            assert_eq!(page.path, path);
            assert_eq!(page.kind, "calculator");
            assert!(page.indexable);
            assert!(page.facts.len() >= 6);
            assert!(page.faq.len() >= 6);

            let static_answer = seo_calculator_note(id);
            assert!(static_answer.contains(&format!("data-tv-diagnostic-answer=\"{id}\"")));
            assert!(static_answer.contains(&format!("data-tv-diagnostic-task=\"{id}\"")));
            assert_eq!(
                static_answer.matches("data-tv-diagnostic-branch=").count(),
                3
            );
            assert_eq!(
                static_answer.matches("data-tv-diagnostic-source=").count(),
                3
            );
            assert!(static_answer.contains("data-tv-diagnostic-stop=\"true\""));
            assert!(!static_answer.contains("market.yandex"));
        }
    }

    #[test]
    fn phone_to_tv_is_one_static_first_canonical_without_market_links() {
        let root = workspace_root();
        let pages: Vec<SeoPage> = read_json(&root.join("data/seo_pages.json"));
        let page = pages
            .iter()
            .find(|page| page.id == "phone-to-tv")
            .expect("phone-to-TV page");
        let html = seo_page_body(page, &pages, &[], &[], &[]);

        assert!(is_indexable_seo_page(page));
        assert_eq!(page.path, "/kak-podklyuchit-telefon-k-televizoru/");
        assert_eq!(
            pages.iter().filter(|item| item.id == "phone-to-tv").count(),
            1
        );
        assert_eq!(html.matches("data-phone-tv-answer=\"true\"").count(), 1);
        for method in ["airplay", "google-cast", "miracast", "hdmi-adapter", "usb"] {
            assert!(html.contains(&format!("data-phone-tv-method=\"{method}\"")));
        }
        assert!(html.contains("USB-C не гарантирует видео"));
        assert!(html.contains("support.apple.com/ru-ru/102661"));
        assert!(html.contains("support.google.com/googlecast"));
        assert!(html.contains("samsung.com/ru/support"));
        assert!(html.contains("displayport.org/faq"));
        assert!(!html.contains("market.yandex.ru"));
        assert!(!html.contains("data-affiliate"));
    }

    #[test]
    fn tv_no_signal_is_one_static_first_canonical_without_market_links() {
        let root = workspace_root();
        let pages: Vec<SeoPage> = read_json(&root.join("data/seo_pages.json"));
        let page = pages
            .iter()
            .find(|page| page.id == "tv-no-signal")
            .expect("TV no-signal page");
        let html = seo_page_body(page, &pages, &[], &[], &[]);

        assert!(is_indexable_seo_page(page));
        assert_eq!(page.path, "/televizor-pishet-net-signala/");
        assert_eq!(
            pages
                .iter()
                .filter(|item| item.id == "tv-no-signal")
                .count(),
            1
        );
        assert_eq!(html.matches("data-tv-no-signal-answer=\"true\"").count(), 1);
        for branch in ["hdmi", "terrestrial", "provider", "satellite"] {
            assert!(html.contains(&format!("data-tv-no-signal-branch=\"{branch}\"")));
        }
        assert!(html.contains("Не разбирайте телевизор"));
        assert!(html.contains("samsung.com/ru/support"));
        assert!(html.contains("sony.ru/electronics/support"));
        assert!(html.contains("plus.rtrs.ru/info"));
        assert!(html.contains("Фирменные шаги уточняйте у своего оператора"));
        assert!(!html.contains("tricolor.ru/help"));
        assert!(!html.contains("market.yandex.ru"));
        assert!(!html.contains("data-affiliate"));
    }

    #[test]
    fn tv_traffic_cohort_two_has_three_static_first_canonicals_without_market_links() {
        let root = workspace_root();
        let pages: Vec<SeoPage> = read_json(&root.join("data/seo_pages.json"));

        for (id, path, source_fragment) in [
            (
                "laptop-to-tv",
                "/kak-podklyuchit-noutbuk-k-televizoru/",
                "support.microsoft.com/ru-RU",
            ),
            (
                "digital-channels",
                "/kak-nastroit-tsifrovye-kanaly-na-televizore/",
                "plus.rtrs.ru/info",
            ),
            (
                "picture-setup",
                "/nastroyka-izobrazheniya-televizora/",
                "samsung.com/ru/support",
            ),
        ] {
            let page = pages
                .iter()
                .find(|page| page.id == id)
                .expect("traffic cohort page");
            let html = seo_page_body(page, &pages, &[], &[], &[]);

            assert!(is_indexable_seo_page(page));
            assert_eq!(page.path, path);
            assert_eq!(pages.iter().filter(|item| item.id == id).count(), 1);
            assert_eq!(
                html.matches(&format!("data-tv-traffic-answer=\"{id}\""))
                    .count(),
                1
            );
            assert!(html.contains(source_fragment));
            assert!(!html.contains("market.yandex.ru"));
            assert!(!html.contains("data-affiliate"));
        }

        let picture = pages
            .iter()
            .find(|page| page.id == "picture-setup")
            .expect("picture setup page");
        let picture_html = seo_page_body(picture, &pages, &[], &[], &[]);
        assert!(picture_html.contains("не профессиональная калибровка"));
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
    fn seo_catalog_renders_verified_models_mounts_and_case_insensitive_brand() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let mounts: Vec<Mount> = read_json(&root.join("data/mounts.json"));
        let graph = build_compatibility_graph(&models, &mounts);
        let page = |id: &str, kind: &str| SeoPage {
            id: id.into(),
            home_priority: None,
            path: format!("/{id}/"),
            kind: kind.into(),
            indexable: true,
            title: "Тест".into(),
            description: "Тест".into(),
            h1: "Тест".into(),
            lead: "Тест".into(),
            facts: vec![],
            faq: vec![],
        };

        let diagonal_html =
            seo_catalog_html(&page("diagonal-55", "diagonal"), &models, &mounts, &graph);
        assert!(diagonal_html.contains("Проверенные телевизоры с диагональю 55″"));
        assert!(diagonal_html.contains("/modeli/"));
        assert!(diagonal_html.contains("VESA"));
        assert!(diagonal_html.contains("кг без подставки"));
        assert!(diagonal_html.contains("<details"));

        let mechanism_html = seo_catalog_html(
            &page("full-motion-mount", "mechanism"),
            &models,
            &mounts,
            &graph,
        );
        assert!(mechanism_html.contains("/kronshteyny/"));
        assert!(mechanism_html.contains("поворотный механизм"));
        assert!(mechanism_html.contains("нагрузка до"));
        assert!(mechanism_html.contains("вылет"));
        assert!(!mechanism_html.contains("market.yandex"));

        let full_motion_mount = mounts
            .iter()
            .find(|mount| mount.mechanism == "full-motion")
            .expect("В каталоге нужен выдвижной кронштейн");
        let non_full_motion_mount = mounts
            .iter()
            .find(|mount| mount.mechanism != "full-motion")
            .expect("В каталоге нужен кронштейн другого типа");
        let extendable_html = seo_catalog_html(
            &page("extendable-mount", "mechanism"),
            &models,
            &mounts,
            &graph,
        );
        assert!(extendable_html.contains("Проверенные выдвижные кронштейны"));
        assert!(extendable_html.contains(&format!("/kronshteyny/{}/", full_motion_mount.id)));
        assert!(!extendable_html.contains(&format!("/kronshteyny/{}/", non_full_motion_mount.id)));

        let commercial_html = seo_catalog_html(
            &page("buy-tv-mount", "commercial"),
            &models,
            &mounts,
            &graph,
        );
        assert!(commercial_html.contains("Сравнение проверенных кронштейнов"));
        for mount in &mounts {
            assert!(commercial_html.contains(&format!("/kronshteyny/{}/", mount.id)));
        }

        let buy_page = page("buy-tv-mount", "commercial");
        let shortlist_html = seo_buy_mount_comparison_html(&buy_page, &mounts, &graph);
        assert!(shortlist_html.contains("data-buy-mount-comparison=\"true\""));
        assert_eq!(
            shortlist_html
                .matches("data-buy-mount-comparison-item=")
                .count(),
            3
        );
        let mut previous_position = 0;
        for mount_id in ["itech-plb440nt", "itech-ptrb440ln", "itech-slt-460"] {
            let position = shortlist_html
                .find(&format!("data-buy-mount-comparison-item=\"{mount_id}\""))
                .expect("Кронштейн должен присутствовать в коротком сравнении");
            assert!(position >= previous_position);
            previous_position = position;
        }
        assert!(shortlist_html.contains("точных схем VESA"));
        assert!(!shortlist_html.contains("market.yandex"));
        assert!(seo_buy_mount_comparison_html(&page("vesa", "guide"), &mounts, &graph).is_empty());

        let onkron_mount = mounts
            .iter()
            .find(|mount| mount.brand == "ONKRON")
            .expect("В каталоге нужен кронштейн ONKRON");
        let other_mount = mounts
            .iter()
            .find(|mount| mount.brand != "ONKRON")
            .expect("В каталоге нужен кронштейн другого бренда");
        let onkron_html = seo_catalog_html(
            &page("mount-brand-onkron", "mount-brand"),
            &models,
            &mounts,
            &graph,
        );
        assert!(onkron_html.contains("Проверенные кронштейны ONKRON"));
        assert!(onkron_html.contains("data-mount-comparison=\"true\""));
        assert!(onkron_html.contains("точных схем VESA"));
        assert!(onkron_html.contains(&format!("/kronshteyny/{}/", onkron_mount.id)));
        assert!(!onkron_html.contains(&format!("/kronshteyny/{}/", other_mount.id)));

        let matcher_html = seo_brand_mount_matcher_html(
            &page("mount-brand-onkron", "mount-brand"),
            &models,
            &mounts,
            &graph,
        );
        assert!(matcher_html.contains("data-brand-mount-matcher-static=\"ONKRON\""));
        assert!(matcher_html.contains("Какие ONKRON подходят к вашему телевизору"));
        assert!(matcher_html.contains(&format!(
            "<dd class=\"mt-1 font-display text-3xl font-extrabold\">{}</dd>",
            models.len()
        )));
        assert!(matcher_html.contains("Подтверждённых пар"));
        assert!(matcher_html.contains("TM5 и TM5‑BW"));
        assert!(!matcher_html.contains("market.yandex.ru"));
        assert!(
            seo_brand_mount_matcher_html(
                &page("mount-brand-kromax", "mount-brand"),
                &models,
                &mounts,
                &graph,
            )
            .is_empty()
        );

        for (page_id, brand) in [
            ("mount-brand-kromax", "KROMAX"),
            ("mount-brand-holder", "Holder"),
            ("mount-brand-itechmount", "iTECHmount"),
        ] {
            let brand_mount = mounts
                .iter()
                .find(|mount| mount.brand == brand)
                .expect("В каталоге нужен кронштейн проверяемого бренда");
            let foreign_mount = mounts
                .iter()
                .find(|mount| mount.brand != brand)
                .expect("В каталоге нужен кронштейн другого бренда");
            let html = seo_catalog_html(&page(page_id, "mount-brand"), &models, &mounts, &graph);
            assert!(html.contains(&format!("Проверенные кронштейны {brand}")));
            assert!(html.contains(&format!("/kronshteyny/{}/", brand_mount.id)));
            assert!(!html.contains(&format!("/kronshteyny/{}/", foreign_mount.id)));
        }

        let lg_model = models
            .iter()
            .find(|tv| tv.brand == "LG")
            .expect("В тестовом каталоге нужна модель LG");
        let non_lg_model = models
            .iter()
            .find(|tv| tv.brand != "LG")
            .expect("В тестовом каталоге нужен второй бренд");
        let brand_html = seo_catalog_html(&page("brand-lg", "brand"), &models, &mounts, &graph);
        assert!(brand_html.contains(&format!("/modeli/{}/", lg_model.id)));
        assert!(!brand_html.contains(&format!("/modeli/{}/", non_lg_model.id)));
        assert!(brand_html.contains("Проверенные телевизоры LG"));
        assert!(brand_html.contains("Диагоналей"));

        for brand in ["Hisense", "TCL", "Xiaomi"] {
            let brand_id = format!("brand-{}", brand.to_ascii_lowercase());
            let own_model = models
                .iter()
                .find(|tv| tv.brand == brand)
                .expect("В каталоге нужна модель проверяемого бренда");
            let foreign_model = models
                .iter()
                .find(|tv| tv.brand != brand)
                .expect("В каталоге нужна модель другого бренда");
            let html = seo_catalog_html(&page(&brand_id, "brand"), &models, &mounts, &graph);
            assert!(html.contains(&format!("/modeli/{}/", own_model.id)));
            assert!(!html.contains(&format!("/modeli/{}/", foreign_model.id)));
        }
    }

    #[test]
    fn mounts_catalog_links_to_existing_brand_comparisons() {
        let mounts: Vec<Mount> = read_json(&workspace_root().join("data/mounts.json"));
        let html = mounts_catalog_body(&mounts);

        for path in [
            "/kronshteyny-onkron/",
            "/kronshteyny-kromax/",
            "/kronshteyny-holder/",
            "/kronshteyny-itechmount/",
        ] {
            assert!(html.contains(&format!("href=\"{path}\"")));
        }
    }

    #[test]
    fn demand_backed_wave_two_pages_are_substantial_and_indexable() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        for id in [
            "diagonal-50",
            "diagonal-75",
            "vesa-300x300",
            "vesa-400x400",
            "brand-hisense",
            "brand-tcl",
            "brand-xiaomi",
            "mount-brand-kromax",
            "mount-brand-holder",
            "mount-brand-itechmount",
        ] {
            let page = pages
                .iter()
                .find(|page| page.id == id)
                .expect("Нет страницы второй SEO-волны");
            assert!(page.indexable, "{id} должна быть индексируемой");
            assert!(page.facts.len() >= 5, "{id}: недостаточно проверок");
            assert!(page.faq.len() >= 5, "{id}: недостаточно FAQ");
            assert!(!page.lead.contains("руб"), "{id}: нельзя фиксировать цену");
        }
        assert!(pages.iter().all(|page| page.id != "diagonal-85"));
        assert!(pages.iter().all(|page| page.id != "vesa-600x400"));
    }

    #[test]
    fn demand_backed_commercial_profiles_render_once_on_existing_entity_pages() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let mounts: Vec<Mount> = read_json(&root.join("data/mounts.json"));
        let seo_pages: Vec<SeoPage> = read_json(&root.join("data/seo_pages.json"));
        let profiles: CommercialProfilesFile =
            read_json(&root.join("data/commercial_profiles.json"));
        let graph = build_compatibility_graph(&models, &mounts);

        validate_commercial_profiles(&profiles, &models, &mounts, &graph);
        assert_eq!(profiles.profiles.len(), 31);

        for profile in &profiles.profiles {
            let marker = format!(
                "data-commercial-profile=\"{}:{}\"",
                profile.entity_kind, profile.entity_id
            );
            let body = match profile.entity_kind.as_str() {
                "model" => {
                    let tv = models
                        .iter()
                        .find(|tv| tv.id == profile.entity_id)
                        .expect("SEO-профиль должен ссылаться на модель");
                    let matches = model_mount_matches(tv, &mounts);
                    model_page_body(tv, &matches, &[], 0, &seo_pages, Some(profile))
                }
                "mount" => {
                    let mount = mounts
                        .iter()
                        .find(|mount| mount.id == profile.entity_id)
                        .expect("SEO-профиль должен ссылаться на кронштейн");
                    mount_page_body(mount, &models, &graph, &[], 0, Some(profile))
                }
                _ => unreachable!(),
            };

            assert_eq!(body.matches(&marker).count(), 1);
            assert!(body.contains(&escape_html(&profile.heading)));
            assert!(body.contains(&escape_html(&profile.answer)));
            for item in &profile.faq {
                assert!(body.contains(&escape_html(&item.question)));
                assert!(body.contains(&escape_html(&item.answer)));
            }
        }

        let profile = commercial_profile_for(&profiles.profiles, "model", "tcl-55c6k")
            .expect("Нет проверенного коммерческого профиля");
        assert_eq!(profile.path, "/modeli/tcl-55c6k/");
        assert!(commercial_profile_for(&profiles.profiles, "model", "lg-oled65c4").is_none());
    }

    #[test]
    fn brand_and_diagonal_pages_have_reciprocal_static_links() {
        let page = |id: &str, kind: &str| SeoPage {
            id: id.into(),
            home_priority: None,
            path: format!("/{id}/"),
            kind: kind.into(),
            indexable: true,
            title: id.into(),
            description: id.into(),
            h1: id.into(),
            lead: id.into(),
            facts: vec![],
            faq: vec![],
        };
        let pages = vec![
            page("diagonal-43", "diagonal"),
            page("diagonal-50", "diagonal"),
            page("diagonal-55", "diagonal"),
            page("diagonal-65", "diagonal"),
            page("diagonal-75", "diagonal"),
            page("brand-lg", "brand"),
            page("brand-samsung", "brand"),
            page("brand-hisense", "brand"),
            page("brand-tcl", "brand"),
            page("brand-xiaomi", "brand"),
            page("vesa-200x200", "vesa"),
            page("vesa-300x200", "vesa"),
            page("vesa-300x300", "vesa"),
            page("vesa-400x400", "vesa"),
            page("buy-tv-mount", "commercial"),
            page("mounting-height", "calculator"),
            page("vesa", "guide"),
            page("how-to-find-vesa", "guide"),
        ];

        for diagonal_id in [
            "diagonal-43",
            "diagonal-50",
            "diagonal-55",
            "diagonal-65",
            "diagonal-75",
        ] {
            let diagonal = pages
                .iter()
                .find(|page| page.id == diagonal_id)
                .expect("Нет страницы диагонали");
            let related = related_seo_pages(diagonal, &pages);
            assert!(related.iter().any(|page| page.id == "brand-lg"));
            assert!(related.iter().any(|page| page.id == "brand-samsung"));
        }

        for brand_id in [
            "brand-lg",
            "brand-samsung",
            "brand-hisense",
            "brand-tcl",
            "brand-xiaomi",
        ] {
            let brand = pages
                .iter()
                .find(|page| page.id == brand_id)
                .expect("Нет страницы бренда");
            let related = related_seo_pages(brand, &pages);
            assert!(related.iter().any(|page| page.kind == "diagonal"));
            assert!(
                related
                    .iter()
                    .any(|page| page.id != brand_id && page.kind == "brand")
            );
            assert!(related.len() <= 6);
        }
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
                "wall-planner",
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
    fn wall_planner_is_one_indexable_static_first_canonical() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let matches = pages
            .iter()
            .filter(|page| page.id == "wall-planner")
            .collect::<Vec<_>>();
        assert_eq!(matches.len(), 1);
        let page = matches[0];

        assert!(page.indexable);
        assert_eq!(page.kind, "calculator");
        assert_eq!(page.path, "/televizor-na-stene/");
        assert!(page.title.contains("Телевизор на стене"));
        assert!(page.h1.contains("в масштабе"));
        for competing_intent in [
            "на какой высоте",
            "как повесить",
            "розетки",
            "подбор кронштейна",
        ] {
            assert!(!page.title.to_lowercase().contains(competing_intent));
            assert!(!page.h1.to_lowercase().contains(competing_intent));
        }

        let static_answer = seo_calculator_note(&page.id);
        assert!(static_answer.contains("data-wall-planner-answer=\"true\""));
        assert!(static_answer.contains("точную модель или экран 16:9"));
        assert_eq!(
            static_answer.matches("data-wall-planner-example=").count(),
            3
        );
        for diagonal in ["43", "55", "65"] {
            assert!(static_answer.contains(&format!("data-wall-planner-example=\"{diagonal}\"")));
        }
        assert!(!static_answer.contains("market.yandex"));

        let related = related_seo_pages(page, &pages)
            .iter()
            .map(|related| related.id.as_str())
            .collect::<Vec<_>>();
        assert_eq!(
            related,
            [
                "tv-dimensions",
                "mounting-height",
                "mounting-map",
                "tv-zone-sockets",
                "viewing-distance",
                "wall-mounted-tv",
            ]
        );
    }

    #[test]
    fn tv_dimensions_page_is_one_canonical_with_static_reference_answer() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let matches = pages
            .iter()
            .filter(|page| page.id == "tv-dimensions")
            .collect::<Vec<_>>();
        assert_eq!(matches.len(), 1);
        let page = matches[0];

        assert!(page.indexable);
        assert_eq!(page.kind, "calculator");
        assert_eq!(page.path, "/razmery-televizora-po-diagonali/");
        assert_eq!(
            page.title,
            "Размеры телевизоров по диагонали: таблица и калькулятор — KREPI TV"
        );
        assert_eq!(page.h1, "Размеры телевизоров по диагонали в сантиметрах");
        assert!(page.description.contains("43, 55 и 65 дюймов"));
        assert!(page.lead.contains("помещается в нишу"));
        assert!(page.facts.len() >= 6);
        assert!(page.faq.len() >= 7);

        let static_answer = seo_calculator_note(&page.id);
        assert!(static_answer.contains("data-tv-dimensions-answer=\"true\""));
        assert!(static_answer.contains("data-tv-dimensions-reference-table=\"true\""));
        assert!(static_answer.contains("активной области"));
        assert!(static_answer.contains("не корпус"));
        assert_eq!(static_answer.matches("data-tv-dimensions-row=").count(), 7);
        for diagonal in ["32", "43", "50", "55", "65", "75", "85"] {
            assert!(static_answer.contains(&format!("data-tv-dimensions-row=\"{diagonal}\"")));
        }
        for href in [
            "/televizor-na-stene/",
            "/rasstoyanie-do-televizora-i-diagonal/",
            "/modeli/",
        ] {
            assert!(static_answer.contains(href));
        }
        assert!(!static_answer.contains("market.yandex"));

        let related = related_seo_pages(page, &pages)
            .iter()
            .map(|related| related.id.as_str())
            .collect::<Vec<_>>();
        assert_eq!(
            related,
            [
                "wall-planner",
                "viewing-distance",
                "diagonal-43",
                "diagonal-55",
                "diagonal-65",
                "mounting-height",
            ]
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
    fn mounting_height_page_prerenders_room_scenarios_and_reference_geometry() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let page = pages
            .iter()
            .find(|page| page.id == "mounting-height")
            .expect("Нет страницы расчёта высоты");
        let calculator_copy = seo_calculator_note(&page.id);

        assert!(page.indexable);
        assert_eq!(page.path, "/na-kakoy-vysote-veshat-televizor/");
        assert!(calculator_copy.contains("data-height-planning-guide=\"true\""));
        assert!(calculator_copy.contains("data-height-room-scenarios=\"true\""));
        assert!(calculator_copy.contains("data-height-reference-table=\"true\""));
        assert!(calculator_copy.contains("1. Гостиная"));
        assert!(calculator_copy.contains("2. Спальня"));
        assert!(calculator_copy.contains("3. Кухня"));
        assert!(calculator_copy.contains("условном центре 110 см"));
        assert_eq!(calculator_copy.matches("scope=\"row\"").count(), 6);
        assert!(calculator_copy.contains("Это не готовая рекомендация по высоте"));
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
        assert!(page.title.contains("Размер VESA телевизора"));
        assert!(page.title.contains("поиск по модели"));
        assert!(page.description.contains("официальный размер"));
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
            let body = mount_page_body(mount, &models, &graph, &[], 0, None);
            assert!(body.contains("/kupit-kronshteyn-dlya-televizora/"));
            let mechanism_path = match mount.mechanism.as_str() {
                "fixed" => "/tipy-kronshteynov/fiksirovannyy/",
                "tilt" => "/tipy-kronshteynov/naklonnyy/",
                "full-motion" => "/tipy-kronshteynov/povorotnyy/",
                other => panic!("Нет хаба механизма для {other}"),
            };
            assert!(body.contains(mechanism_path));
            if mount.mechanism == "full-motion" {
                assert!(body.contains("/tipy-kronshteynov/vydvizhnoy/"));
            }
            let brand_path = match mount.brand.as_str() {
                "Holder" => "/kronshteyny-holder/",
                "iTECHmount" => "/kronshteyny-itechmount/",
                "KROMAX" => "/kronshteyny-kromax/",
                "ONKRON" => "/kronshteyny-onkron/",
                other => panic!("Нет брендового хаба для {other}"),
            };
            assert!(body.contains(brand_path));
            for edge in graph.iter().filter(|edge| edge.mount_id == mount.id) {
                assert!(body.contains(&format!("/modeli/{}/", edge.tv_id)));
                let tv = models
                    .iter()
                    .find(|tv| tv.id == edge.tv_id)
                    .expect("Ребро графа ссылается на неизвестный телевизор");
                assert!(body.contains(&format!("Телевизор {}", escape_html(&tv.title))));
                for warning in &edge.warnings {
                    assert!(body.contains(&escape_html(warning)));
                }
            }
        }

        let seo_pages: Vec<SeoPage> = read_json(&root.join("data/seo_pages.json"));
        for tv in &models {
            let matches = model_mount_matches(tv, &mounts);
            let body = model_page_body(tv, &matches, &[], 0, &seo_pages, None);
            for matched in matches.iter().filter(|matched| matched.compatible) {
                assert!(body.contains(&format!("Кронштейн {}", escape_html(&matched.mount.title))));
            }
        }
    }

    #[test]
    fn mount_page_places_safe_affiliate_placeholder_before_compatible_televisions() {
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
        let body = mount_page_body(mount, &models, &graph, &snapshot.offers, now, None);
        let slot_position = body
            .find("data-affiliate-slot=")
            .expect("Статический affiliate slot отсутствует");
        let models_position = body
            .find("Подтверждённые популярные телевизоры")
            .expect("Список телевизоров отсутствует");
        let vesa_position = body
            .find("Поддерживаемые VESA")
            .expect("Технический блок VESA отсутствует");

        assert!(slot_position < models_position);
        assert!(slot_position < vesa_position);
        assert!(!body.contains("data-affiliate-offer-id="));
        assert!(!body.contains(&escape_html(&offer.affiliate_href)));
    }
}
