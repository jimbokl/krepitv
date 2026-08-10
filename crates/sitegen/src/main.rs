use krepitv_engine::{Mount, MountMatch, match_mounts};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_AFFILIATE_AGE_SECONDS: i64 = 48 * 60 * 60;
const AFFILIATE_FUTURE_TOLERANCE_SECONDS: i64 = 5 * 60;
const CORE_PAGES_UPDATED_AT: &str = "2026-08-05";
const TRAFFIC_PAGES_UPDATED_AT: &str = "2026-08-06";
const SEO_FUNNEL_UPDATED_AT: &str = "2026-08-08";
const MARKET_MODELS_UPDATED_AT: &str = "2026-08-05";
const MODEL_PAGES_UPDATED_AT: &str = "2026-08-05";
const LEGACY_VERIFIED_MODEL_ROUTES: [(&str, &str); 4] = [
    ("tcl-v6c", "tcl-50v6c"),
    ("tcl-q6cs", "tcl-55q6cs"),
    ("tcl-t8d", "tcl-55t8d"),
    ("tcl-q7d", "tcl-65q7d"),
];
const VESA_DATASET_VERSION: &str = "2.2.0";
const VESA_DATASET_DOWNLOAD_BASE: &str =
    "https://github.com/jimbokl/krepitv/releases/download/datasets-v2.2.0";
const VESA_DATASET_RELEASE_URL: &str =
    "https://github.com/jimbokl/krepitv/releases/tag/datasets-v2.2.0";
const SCREW_DATASET_VERSION: &str = "1.1.0";
const SCREW_DATASET_DOWNLOAD_BASE: &str =
    "https://github.com/jimbokl/krepitv/releases/download/datasets-v1.1.0";
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
const TV_UTILITY_COHORT_6: [(&str, &str, &[&str]); 3] = [
    (
        "tv-speakers",
        "/kak-podklyuchit-kolonki-k-televizoru/",
        &[
            "samsung-tv-optical-audio",
            "sony-tv-wireless-audio",
            "sony-tv-bluetooth-audio",
            "lg-tv-audio-output",
        ],
    ),
    (
        "tv-headphones",
        "/kak-podklyuchit-naushniki-k-televizoru/",
        &[
            "samsung-tv-bluetooth-headphones",
            "sony-tv-bluetooth-audio",
            "sony-tv-wireless-audio",
            "lg-tv-bluetooth-audio",
        ],
    ),
    (
        "tv-energy-consumption",
        "/skolko-elektroenergii-potreblyaet-televizor/",
        &["samsung-tv-energy-fiche", "lg-tv-energy-spec"],
    ),
];
const TV_UTILITY_COHORT_7: [(&str, &str, &[&str]); 3] = [
    (
        "tv-firmware-update",
        "/kak-obnovit-televizor/",
        &[
            "samsung-tv-update-online",
            "samsung-tv-update-usb",
            "samsung-tv-firmware-model",
            "lg-tv-update",
            "sony-tv-update",
            "yaos-tv-update",
        ],
    ),
    (
        "tv-app-install",
        "/kak-ustanovit-prilozhenie-na-televizor/",
        &[
            "samsung-tv-app-install",
            "lg-tv-app-install",
            "google-tv-app-install",
            "yaos-tv-apps",
        ],
    ),
    (
        "tv-factory-reset",
        "/kak-sbrosit-televizor-do-zavodskih-nastroek/",
        &[
            "samsung-tv-reset",
            "lg-tv-reset",
            "sony-tv-reset",
            "yaos-tv-reset",
        ],
    ),
];
const DAILY_SEO_COHORT_2026_08_06: [(&str, &str); 10] = [
    ("tv-wont-turn-on", "/televizor-ne-vklyuchaetsya/"),
    (
        "tv-antenna-connect",
        "/kak-podklyuchit-antennu-k-televizoru/",
    ),
    ("tv-freezes", "/televizor-zavis/"),
    (
        "digital-box-connect",
        "/kak-podklyuchit-tsifrovuyu-pristavku-k-televizoru/",
    ),
    ("tv-dark-screen", "/temnyy-ekran-na-televizore/"),
    ("tv-storage-cleanup", "/kak-ochistit-pamyat-televizora/"),
    ("phone-tv-remote", "/kak-upravlyat-televizorom-s-telefona/"),
    (
        "game-console-to-tv",
        "/kak-podklyuchit-igrovuyu-pristavku-k-televizoru/",
    ),
    ("tv-model-lookup", "/kak-uznat-model-televizora/"),
    (
        "tv-aspect-ratio",
        "/izobrazhenie-ne-na-ves-ekran-televizora/",
    ),
];
const DAILY_SEO_COHORT_2026_08_07: [(&str, &str); 10] = [
    ("tv-youtube-recovery", "/ne-rabotaet-youtube-na-televizore/"),
    ("tv-flicker", "/migaet-ekran-televizora/"),
    (
        "tv-disable-subtitles",
        "/kak-otklyuchit-subtitry-na-televizore/",
    ),
    ("tv-disable-voice", "/kak-otklyuchit-golos-na-televizore/"),
    (
        "tv-keyboard-mouse",
        "/kak-podklyuchit-klaviaturu-i-mysh-k-televizoru/",
    ),
    ("tv-microphone", "/kak-podklyuchit-mikrofon-k-televizoru/"),
    ("hide-tv-wires", "/kak-spryatat-provoda-ot-televizora/"),
    ("dead-pixel-test", "/proverka-televizora-na-bitye-pikseli/"),
    (
        "tv-purchase-checklist",
        "/proverka-televizora-pered-pokupkoy/",
    ),
    ("tv-game-mode", "/kak-nastroit-televizor-dlya-igr/"),
];
const DAILY_SEO_COHORT_2026_08_08: [(&str, &str); 10] = [
    (
        "selection-choose",
        "/kak-vybrat-kronshteyn-dlya-televizora/",
    ),
    ("wall-drywall-how", "/kak-povesit-televizor-na-gipsokarton/"),
    (
        "wall-concrete-dowel",
        "/kak-povesit-televizor-na-betonnuyu-stenu/",
    ),
    ("wall-aerated-how", "/kak-povesit-televizor-na-gazobeton/"),
    ("wires-cable-channel", "/kabel-kanal-dlya-televizora/"),
    ("vesa-size", "/tablica-vesa-televizorov/"),
    ("vesa-600x400", "/vesa/600x400/"),
    ("diagonal-85", "/kronshteyn-dlya-televizora-85-dyuyma/"),
    ("model-year-decoder", "/kak-uznat-god-vypuska-televizora/"),
    ("hdmi-cable-checker", "/kakoy-hdmi-kabel-nuzhen/"),
];
const DAILY_SEO_COHORT_2026_08_09: [(&str, &str); 10] = [
    (
        "remove-tv-from-mount",
        "/kak-snyat-televizor-s-kronshteyna/",
    ),
    (
        "ceiling-tv-mount",
        "/potolochnyy-kronshteyn-dlya-televizora/",
    ),
    ("tv-device-shelf", "/polka-pod-televizor-na-stenu/"),
    ("tv-wall-fasteners", "/krepezh-dlya-televizora-na-stenu/"),
    ("mobile-tv-stand", "/mobilnaya-stoyka-dlya-televizora/"),
    ("vesa-100x100", "/vesa/100x100/"),
    ("soundbar-mount", "/kronshteyn-dlya-saundbara-k-televizoru/"),
    ("corner-tv-mount", "/televizor-v-uglu-komnaty/"),
    ("tv-wall-gap", "/rasstoyanie-ot-televizora-do-steny/"),
    (
        "tv-installation-cost",
        "/stoimost-ustanovki-televizora-na-stenu/",
    ),
];
const DAILY_SEO_COHORT_2026_08_10: [(&str, &str); 10] = [
    (
        "tv-internet-setup",
        "/kak-podklyuchit-televizor-k-internetu/",
    ),
    ("tv-alice-connect", "/kak-podklyuchit-televizor-k-alise/"),
    ("tv-restart", "/kak-perezagruzit-televizor/"),
    (
        "tv-bluetooth-setup",
        "/kak-vklyuchit-bluetooth-na-televizore/",
    ),
    ("smart-tv-setup", "/kak-nastroit-smart-tv/"),
    ("camera-to-tv", "/kak-podklyuchit-kameru-k-televizoru/"),
    ("dvd-to-tv", "/kak-podklyuchit-dvd-k-televizoru/"),
    ("tv-browser-install", "/kak-ustanovit-brauzer-na-televizor/"),
    (
        "tv-without-mount",
        "/kak-povesit-televizor-bez-kronshteyna/",
    ),
    ("tv-hdr-enable", "/kak-vklyuchit-hdr-na-televizore/"),
];

#[derive(Debug, Deserialize, Serialize)]
struct TvModel {
    id: String,
    brand: String,
    model: String,
    title: String,
    series: String,
    model_year: Option<u32>,
    diagonal_inches: f64,
    weight_kg: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    weight_basis: Option<String>,
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
struct MarketTvModelsFile {
    schema_version: u32,
    observed_at: String,
    source_url: String,
    source_scope: String,
    summary: MarketTvModelsSummary,
    records: Vec<MarketTvModel>,
    batch_sha256: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct MarketTvModelsSummary {
    market_observations: usize,
    unique_identities: usize,
    verified_routes: usize,
    observed_canonicals: usize,
    indexable_observed_canonicals: usize,
    alias_routes: usize,
    low_confidence_routes: usize,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct MarketTvModel {
    record_id: String,
    id: String,
    canonical_id: String,
    canonical_path: String,
    route_path: String,
    page_kind: String,
    indexable: bool,
    identity_confidence: String,
    brand: String,
    model: String,
    title: String,
    market_title: String,
    diagonal_inches: Option<f64>,
    market_product_id: String,
    market_url: String,
    purchase_count: Option<u64>,
    purchase_label: Option<String>,
    rating_value: Option<f64>,
    rating_count: Option<u64>,
    observed_rank: usize,
    observed_at: String,
    checked_at: String,
    verified_model_id: Option<String>,
    source_label: String,
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
struct SearchItem {
    id: String,
    title: String,
    brand: String,
    model: String,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    guide: Option<SeoEvidenceGuide>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct SeoEvidenceGuide {
    kicker: String,
    heading: String,
    summary: String,
    updated_at: String,
    steps: Vec<SeoEvidenceStep>,
    stop: String,
    sources: Vec<SeoEvidenceSource>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct SeoEvidenceStep {
    label: String,
    title: String,
    body: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct SeoEvidenceSource {
    id: String,
    label: String,
    url: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
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
struct EditorialPolicy {
    schema_version: u32,
    author: EditorialAuthor,
    automation_disclosure: String,
    source_policy: String,
    physical_test: EditorialPhysicalTest,
    corrections_path: String,
    methodology_path: String,
    updated_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct EditorialAuthor {
    name: String,
    path: String,
    role: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct EditorialPhysicalTest {
    status: String,
    label: String,
    explanation: String,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    updated_at: Option<String>,
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

fn embedded_editorial_policy() -> EditorialPolicy {
    serde_json::from_str(include_str!("../../../data/editorial_policy.json"))
        .expect("Встроенная editorial policy должна соответствовать строгой схеме")
}

const EDITORIAL_USER_ICON: &str = r#"<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" class="size-4 shrink-0 text-action"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"></path></svg>"#;
const EDITORIAL_SHIELD_ICON: &str = r#"<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" class="size-4 shrink-0 text-action"><path d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z"></path></svg>"#;
const EDITORIAL_CHECK_ICON: &str = r#"<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" class="size-4 shrink-0 text-action"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>"#;
const EDITORIAL_INFO_ICON: &str = r#"<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" class="size-4 shrink-0 text-action"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"></path></svg>"#;
const TRUST_SHIELD_ICON: &str = r#"<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" class="size-8 text-action"><path d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z"></path></svg>"#;
const TRUST_ARROW_ICON: &str = r#"<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" class="size-5 shrink-0"><path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"></path></svg>"#;

fn editorial_accountability_html(content_kind: &str, checked_at: &str) -> String {
    assert!(
        is_valid_iso_date(checked_at),
        "Некорректная дата редакционного основания: {checked_at}"
    );
    let basis = match content_kind {
        "seo-reviewed" => "Официальные инструкции и редакционная проверка",
        "seo-calculated" => "Источники, формула и перечисленные допущения",
        "verified-model" => "Официальные характеристики и расчёт совместимости",
        "mount" => "Паспорт кронштейна и граф совместимости",
        "observed-model" => "Наблюдение ассортимента без технической рекомендации",
        _ => panic!("Неизвестное основание редакционного материала: {content_kind}"),
    };
    let policy = embedded_editorial_policy();
    assert_eq!(policy.schema_version, 1);
    assert_eq!(policy.author.name, "Редакция KREPI TV");
    assert_eq!(policy.author.path, "/redaktsiya/");
    assert_eq!(policy.methodology_path, "/metodika/");
    assert_eq!(policy.corrections_path, "/kontakty/");
    assert_eq!(policy.physical_test.status, "not_tested");
    assert_eq!(policy.physical_test.label, "Физический тест не проводился");
    let [year, month, day] = checked_at
        .split('-')
        .collect::<Vec<_>>()
        .try_into()
        .expect("Проверенная ISO-дата содержит три компонента");
    let visible_date = format!("{day}.{month}.{year}");

    format!(
        "<aside aria-label=\"Как подготовлен и проверен материал\" class=\"border-b-2 border-ink py-5\" data-editorial-accountability=\"true\"><div class=\"grid gap-px border border-ink bg-ink sm:grid-cols-2 xl:grid-cols-4\"><div class=\"min-w-0 bg-paper p-4\"><p class=\"flex items-center gap-2 font-mono text-[0.68rem] uppercase leading-relaxed text-muted\">{user_icon} Автор материала</p><p class=\"mt-2 break-words font-display text-base font-bold leading-snug\"><a class=\"underline decoration-action decoration-2 underline-offset-4\" href=\"{author_path}\">{author_name}</a></p></div><div class=\"min-w-0 bg-paper p-4\"><p class=\"flex items-center gap-2 font-mono text-[0.68rem] uppercase leading-relaxed text-muted\">{shield_icon} Основание</p><p class=\"mt-2 break-words font-display text-base font-bold leading-snug\">{basis}</p></div><div class=\"min-w-0 bg-paper p-4\"><p class=\"flex items-center gap-2 font-mono text-[0.68rem] uppercase leading-relaxed text-muted\">{check_icon} Материал обновлён</p><p class=\"mt-2 break-words font-display text-base font-bold leading-snug\"><time datetime=\"{checked_at}\">{visible_date}</time></p></div><div class=\"min-w-0 bg-paper p-4\"><p class=\"flex items-center gap-2 font-mono text-[0.68rem] uppercase leading-relaxed text-muted\">{info_icon} Испытание товара</p><p class=\"mt-2 break-words font-display text-base font-bold leading-snug\">{physical_test_label}</p></div></div><details class=\"group border-x border-b border-ink bg-white px-4 py-3\"><summary class=\"flex cursor-pointer list-none items-center justify-between gap-4 font-display font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action\">Как подготовлен материал<span aria-hidden=\"true\" class=\"text-xl text-action transition group-open:rotate-45\">+</span></summary><div class=\"grid gap-3 pt-3 text-sm leading-relaxed text-muted lg:grid-cols-2\"><p>{source_policy}</p><p>{automation_disclosure}</p><p>{physical_test_explanation}</p><p>Подробности: <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"{methodology_path}\">методика</a> · <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"{corrections_path}\">сообщить об ошибке</a>.</p></div></details></aside>",
        user_icon = EDITORIAL_USER_ICON,
        shield_icon = EDITORIAL_SHIELD_ICON,
        check_icon = EDITORIAL_CHECK_ICON,
        info_icon = EDITORIAL_INFO_ICON,
        author_path = escape_html(&policy.author.path),
        author_name = escape_html(&policy.author.name),
        basis = escape_html(basis),
        checked_at = escape_html(checked_at),
        visible_date = escape_html(&visible_date),
        physical_test_label = escape_html(&policy.physical_test.label),
        source_policy = escape_html(&policy.source_policy),
        automation_disclosure = escape_html(&policy.automation_disclosure),
        physical_test_explanation = escape_html(&policy.physical_test.explanation),
        methodology_path = escape_html(&policy.methodology_path),
        corrections_path = escape_html(&policy.corrections_path),
    )
}

fn encode_query_component(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(char::from(*byte));
            }
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

fn market_mount_search_href(title: &str) -> String {
    format!(
        "https://market.yandex.ru/search?text={}",
        encode_query_component(title.trim())
    )
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
        "@graph": [
            {
                "@type": "WebSite",
                "@id": "https://krepitv.ru/#website",
                "url": "https://krepitv.ru/",
                "name": "KREPI TV",
                "alternateName": "Крепи ТВ",
                "description": "Независимый сервис проверки совместимости телевизоров и кронштейнов.",
                "inLanguage": "ru-RU",
                "publisher": { "@id": "https://krepitv.ru/#organization" }
            },
            {
                "@type": "Organization",
                "@id": "https://krepitv.ru/#organization",
                "url": "https://krepitv.ru/",
                "name": "KREPI TV",
                "alternateName": "Крепи ТВ",
                "logo": "https://krepitv.ru/logo-512.svg"
            }
        ]
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

fn visible_breadcrumbs_from_json_ld(json_ld: &str) -> Option<String> {
    let prefix = "<script type=\"application/ld+json\">";
    for fragment in json_ld.split(prefix).skip(1) {
        let Some(raw) = fragment.split("</script>").next() else {
            continue;
        };
        let Ok(value) = serde_json::from_str::<Value>(raw) else {
            continue;
        };
        if value.get("@type").and_then(Value::as_str) != Some("BreadcrumbList") {
            continue;
        }
        let items = value.get("itemListElement")?.as_array()?;
        let links = items
            .iter()
            .enumerate()
            .map(|(index, item)| {
                let name = escape_html(item.get("name").and_then(Value::as_str).unwrap_or_default());
                let url = escape_html(item.get("item").and_then(Value::as_str).unwrap_or_default());
                let separator = if index == 0 { "" } else { "<span aria-hidden=\"true\">/</span>" };
                if index + 1 == items.len() {
                    format!("{separator}<span aria-current=\"page\">{name}</span>")
                } else {
                    format!("{separator}<a class=\"transition hover:text-action\" href=\"{url}\">{name}</a>")
                }
            })
            .collect::<Vec<_>>()
            .join("");
        return Some(format!(
            "<nav aria-label=\"Навигационная цепочка\" class=\"mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-5 pt-6 font-mono text-xs text-muted sm:px-8\" data-visible-breadcrumbs=\"true\">{links}</nav>"
        ));
    }
    None
}

fn inject_visible_breadcrumbs(static_body: &str, json_ld: &str) -> String {
    let Some(nav) = visible_breadcrumbs_from_json_ld(json_ld) else {
        return static_body.to_string();
    };
    let Some(main_start) = static_body.find("<main") else {
        return format!("{nav}{static_body}");
    };
    let Some(relative_end) = static_body[main_start..].find('>') else {
        return format!("{nav}{static_body}");
    };
    let insert_at = main_start + relative_end + 1;
    format!(
        "{}{nav}{}",
        &static_body[..insert_at],
        &static_body[insert_at..]
    )
}

fn dataset_json_ld(page_id: &str, canonical: &str) -> Option<String> {
    let (name, description, identifier, version, download_base, keywords, variables, files) =
        match page_id {
            "vesa" => (
                "Размеры VESA популярных в России телевизоров",
                "Проверяемая таблица из 151 точной модели телевизора: полный код модели, размер VESA по горизонтали и вертикали, дата проверки и источник паспорта.",
                "KREPI-TV-RU-VESA-SIZES-2.2.0",
                VESA_DATASET_VERSION,
                VESA_DATASET_DOWNLOAD_BASE,
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
                "Проверяемая таблица для 27 точных моделей телевизоров: резьба, количество, паспортная длина или диапазон зацепления, обязательные детали и источник руководства.",
                "KREPI-TV-RU-VESA-SCREWS-1.1.0",
                SCREW_DATASET_VERSION,
                SCREW_DATASET_DOWNLOAD_BASE,
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
                "contentUrl": format!("{download_base}/{filename}")
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
        "version": version,
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

fn seo_evidence_guide_json_ld(page: &SeoPage, canonical: &str) -> Option<String> {
    let guide = page.guide.as_ref()?;
    let steps = guide
        .steps
        .iter()
        .enumerate()
        .map(|(index, step)| {
            json!({
                "@type": "HowToStep",
                "position": index + 1,
                "name": step.title,
                "text": step.body,
                "url": format!("{canonical}#мастер")
            })
        })
        .collect::<Vec<_>>();
    let citations = guide
        .sources
        .iter()
        .map(|source| source.url.as_str())
        .collect::<Vec<_>>();
    Some(json_ld_script(json!({
        "@context": "https://schema.org",
        "@type": ["Article", "HowTo"],
        "@id": format!("{canonical}#guide"),
        "mainEntityOfPage": canonical,
        "url": canonical,
        "headline": page.h1,
        "description": page.description,
        "inLanguage": "ru-RU",
        "datePublished": guide.updated_at,
        "dateModified": guide.updated_at,
        "isAccessibleForFree": true,
        "author": {
            "@type": "Organization",
            "name": "Редакция KREPI TV",
            "url": "https://krepitv.ru/redaktsiya/"
        },
        "publisher": {
            "@type": "Organization",
            "name": "KREPI TV",
            "url": "https://krepitv.ru/"
        },
        "citation": citations,
        "step": steps
    })))
}

fn seo_page_lastmod(page: &SeoPage) -> &str {
    let content_lastmod = if let Some(guide) = &page.guide {
        guide.updated_at.as_str()
    } else if matches!(
        page.id.as_str(),
        "phone-to-tv"
            | "tv-no-signal"
            | "tv-sound-no-picture"
            | "tv-no-sound"
            | "tv-remote-not-working"
            | "tv-turns-off"
            | "tv-no-internet"
            | "tv-usb-not-seen"
            | "laptop-to-tv"
            | "digital-channels"
            | "picture-setup"
            | "soundbar-to-tv"
            | "screen-cleaning"
            | "smart-tv-box"
            | "tv-speakers"
            | "tv-headphones"
            | "tv-energy-consumption"
            | "tv-firmware-update"
            | "tv-app-install"
            | "tv-factory-reset"
            | "vesa"
            | "tv-mount-screws"
            | "mounting-height"
            | "wall-planner"
            | "tv-dimensions"
    ) {
        TRAFFIC_PAGES_UPDATED_AT
    } else {
        CORE_PAGES_UPDATED_AT
    };
    content_lastmod.max(SEO_FUNNEL_UPDATED_AT)
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

fn model_technical_image_path(tv: &TvModel) -> String {
    format!("/images/modeli/{}-vesa.svg", tv.id)
}

fn mount_technical_image_path(mount: &Mount) -> String {
    format!("/images/kronshteyny/{}-skhema.svg", mount.id)
}

fn model_technical_image_svg(tv: &TvModel) -> String {
    let longest_side = tv.vesa_width_mm.max(tv.vesa_height_mm);
    let scale = 240.0 / f64::from(longest_side);
    let drawing_width = f64::from(tv.vesa_width_mm) * scale;
    let drawing_height = f64::from(tv.vesa_height_mm) * scale;
    let left = 600.0 - drawing_width / 2.0;
    let right = 600.0 + drawing_width / 2.0;
    let top = 300.0 - drawing_height / 2.0;
    let bottom = 300.0 + drawing_height / 2.0;
    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc"><title id="title">Техническая схема VESA {title}</title><desc id="desc">Пропорциональная схема расположения четырёх отверстий VESA {vesa_w} на {vesa_h} миллиметров. Не фотография и не чертёж корпуса.</desc><rect width="1200" height="630" fill="#F7F5F0"/><rect x="74" y="66" width="1052" height="498" rx="18" fill="#fff" stroke="#111" stroke-width="8"/><rect x="170" y="130" width="860" height="340" rx="10" fill="#111"/><rect x="186" y="146" width="828" height="308" fill="#E9E5DC"/><g fill="#FF4F21" stroke="#111" stroke-width="5"><circle cx="{left:.1}" cy="{top:.1}" r="16"/><circle cx="{right:.1}" cy="{top:.1}" r="16"/><circle cx="{left:.1}" cy="{bottom:.1}" r="16"/><circle cx="{right:.1}" cy="{bottom:.1}" r="16"/></g><path d="M{left:.1} {top_line:.1}V158M{right:.1} {top_line:.1}V158M{left:.1} 174H{right:.1}" stroke="#176B87" stroke-width="5"/><path d="M{left_line:.1} {top:.1}H408M{left_line:.1} {bottom:.1}H408M424 {top:.1}V{bottom:.1}" stroke="#176B87" stroke-width="5"/><text x="600" y="118" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="700" fill="#176B87">{vesa_w} мм</text><text x="382" y="307" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="700" fill="#176B87" transform="rotate(-90 382 307)">{vesa_h} мм</text><text x="92" y="610" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#111">{title} · VESA {vesa_w}×{vesa_h} мм · пропорциональная схема отверстий</text></svg>"##,
        title = escape_html(&tv.title),
        vesa_w = tv.vesa_width_mm,
        vesa_h = tv.vesa_height_mm,
        left = left,
        right = right,
        top = top,
        bottom = bottom,
        top_line = top - 40.0,
        left_line = left - 40.0,
    )
}

fn mount_technical_image_svg(mount: &Mount) -> String {
    let drawing = match mount.mechanism.as_str() {
        "fixed" => {
            r##"<path d="M174 290H790" fill="none" stroke="#111" stroke-width="30" stroke-linecap="square"/><rect x="790" y="104" width="270" height="372" rx="12" fill="#fff" stroke="#111" stroke-width="9"/><rect x="824" y="138" width="202" height="304" fill="#E9E5DC"/>"##
        }
        "tilt" => {
            r##"<path d="M174 290H704" fill="none" stroke="#111" stroke-width="30"/><circle cx="704" cy="290" r="24" fill="#FF4F21" stroke="#111" stroke-width="6"/><g transform="rotate(-10 704 290)"><rect x="704" y="104" width="270" height="372" rx="12" fill="#fff" stroke="#111" stroke-width="9"/><rect x="738" y="138" width="202" height="304" fill="#E9E5DC"/></g>"##
        }
        "full-motion" => {
            r##"<path d="M174 290 L398 190 L606 340 L818 290" fill="none" stroke="#111" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/><g fill="#FF4F21" stroke="#111" stroke-width="6"><circle cx="398" cy="190" r="25"/><circle cx="606" cy="340" r="25"/></g><rect x="818" y="104" width="270" height="372" rx="12" fill="#fff" stroke="#111" stroke-width="9"/><rect x="852" y="138" width="202" height="304" fill="#E9E5DC"/>"##
        }
        _ => {
            r##"<path d="M174 290H790" fill="none" stroke="#111" stroke-width="30" stroke-dasharray="18 14"/><rect x="790" y="104" width="270" height="372" rx="12" fill="#fff" stroke="#111" stroke-width="9"/><rect x="824" y="138" width="202" height="304" fill="#E9E5DC"/>"##
        }
    };
    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc"><title id="title">Техническая схема кронштейна {title}</title><desc id="desc">Условная схема механизма {mechanism}, нагрузки и поддерживаемых размеров. Не фотография и не монтажный чертёж.</desc><rect width="1200" height="630" fill="#F7F5F0"/><rect x="92" y="72" width="26" height="440" fill="#D8D2C6"/><text x="80" y="552" font-family="Arial,sans-serif" font-size="25" fill="#555">СТЕНА</text><rect x="132" y="206" width="42" height="170" fill="#FF4F21" stroke="#111" stroke-width="6"/>{drawing}<text x="600" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" font-weight="700" fill="#111">{title}</text><text x="600" y="570" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="700" fill="#176B87">{mechanism} · до {load} кг · {min_diag}–{max_diag}″ · условная схема</text></svg>"##,
        title = escape_html(&mount.title),
        mechanism = escape_html(mechanism_label(&mount.mechanism)),
        load = mount.max_load_kg,
        min_diag = mount.min_diagonal_in,
        max_diag = mount.max_diagonal_in,
        drawing = drawing,
    )
}

fn technical_image_html(path: &str, alt: &str, caption: &str) -> String {
    format!(
        "<figure class=\"my-7 border border-ink bg-white p-3 sm:p-5\"><img data-technical-image=\"true\" src=\"{}\" alt=\"{}\" width=\"1200\" height=\"630\" loading=\"lazy\" decoding=\"async\" class=\"block h-auto w-full\"><figcaption class=\"mt-3 border-t border-line pt-3 text-sm leading-relaxed text-muted\">{}</figcaption></figure>",
        escape_html(path),
        escape_html(alt),
        escape_html(caption),
    )
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
        json!({ "@type": "PropertyValue", "name": "Диагональ", "value": format!("{} дюймов", tv.diagonal_inches) }),
        json!({ "@type": "PropertyValue", "name": model_weight_label(tv), "value": format!("{} кг ({})", tv.weight_kg, model_weight_suffix(tv)) }),
    ];
    if let Some(model_year) = tv.model_year {
        properties.push(json!({
            "@type": "PropertyValue",
            "name": "Модельный год",
            "value": model_year
        }));
    }
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
        "image": format!("https://krepitv.ru{}", model_technical_image_path(tv)),
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
        "image": format!("https://krepitv.ru{}", mount_technical_image_path(mount)),
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
    let static_body = inject_visible_breadcrumbs(static_body.unwrap_or_default(), head.json_ld);
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
        "<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>{title}</title>\n<meta name=\"description\" content=\"{description}\">\n<link rel=\"canonical\" href=\"{canonical}\">\n<link rel=\"icon\" href=\"/favicon.svg\" type=\"image/svg+xml\">\n{market_verification_meta}{robots_meta}<meta property=\"og:locale\" content=\"ru_RU\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:site_name\" content=\"KREPI TV\">\n<meta property=\"og:title\" content=\"{title}\">\n<meta property=\"og:description\" content=\"{description}\">\n<meta property=\"og:url\" content=\"{canonical}\">\n<meta name=\"theme-color\" content=\"#F7F5F0\">\n{}</head>\n<body>\n<div id=\"root\" data-page-kind=\"{page_kind}\"{model_attribute}>{static_body}</div>\n<script type=\"module\" src=\"/src/main.jsx\"></script>\n</body>\n</html>\n",
        head.json_ld,
    )
}

fn static_header() -> &'static str {
    "<header class=\"border-b-2 border-ink bg-paper\"><div class=\"mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-8\"><a class=\"font-display text-xl font-extrabold\" href=\"/\">KREPI TV</a><nav class=\"flex flex-wrap gap-5 font-display text-sm font-bold uppercase\" aria-label=\"Основная навигация\"><a href=\"/televizor-pishet-net-signala/\">Нет сигнала</a><a href=\"/kak-podklyuchit-telefon-k-televizoru/\">Телефон → ТВ</a><a href=\"/podbor/\">Подбор</a><a href=\"/modeli/\">Телевизоры</a><a href=\"/kronshteyny/\">Кронштейны</a><a href=\"/razmery-televizora-po-diagonali/\">Размеры ТВ</a><a href=\"/vesa/\">VESA</a><a href=\"/spravochnik/\">Справочник</a></nav></div></header>"
}

fn static_footer() -> &'static str {
    "<footer class=\"border-t-2 border-ink bg-paper\"><nav class=\"mx-auto flex max-w-[1440px] flex-wrap gap-6 px-5 py-7 font-display text-sm font-bold uppercase sm:px-8\" aria-label=\"Инструменты и информация о сервисе\"><a href=\"/televizor-pishet-net-signala/\">Нет сигнала</a><a href=\"/kak-podklyuchit-telefon-k-televizoru/\">Телефон → ТВ</a><a href=\"/podbor/\">Подбор</a><a href=\"/modeli/\">Телевизоры</a><a href=\"/kronshteyny/\">Кронштейны</a><a href=\"/razmery-televizora-po-diagonali/\">Размеры ТВ</a><a href=\"/televizor-na-stene/\">Примерка на стене</a><a href=\"/na-kakoy-vysote-veshat-televizor/\">Высота установки</a><a href=\"/rasstoyanie-do-televizora-i-diagonal/\">Расстояние и диагональ</a><a href=\"/vesa/\">VESA</a><a href=\"/spravochnik/\">Справочник</a><a href=\"/o-proekte/\">О проекте</a><a href=\"/redaktsiya/\">Редакция</a><a href=\"/metodika/\">Методика</a><a href=\"/kontakty/\">Контакты</a><a href=\"/politika-konfidencialnosti/\">Конфиденциальность</a></nav></footer>"
}

fn static_layout(content: &str) -> String {
    format!(
        "{}<main class=\"min-h-screen bg-paper text-ink\">{content}</main>{}",
        static_header(),
        static_footer(),
    )
}

fn not_found_page_body() -> String {
    static_layout(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\" data-not-found-page=\"true\"><nav class=\"flex flex-wrap items-center gap-2 font-mono text-xs text-muted\" aria-label=\"Навигационная цепочка\"><a class=\"hover:text-action\" href=\"/\">Главная</a><span aria-hidden=\"true\">/</span><span>Страница не найдена</span></nav><header class=\"mt-8 border-b-2 border-ink pb-8\"><p class=\"font-mono text-xs uppercase tracking-[0.12em] text-action\">Ошибка 404</p><h1 class=\"mt-3 max-w-[900px] font-display text-[clamp(3.2rem,8vw,7rem)] font-extrabold leading-[0.9] tracking-[-0.035em]\">Страница не найдена</h1><p class=\"mt-6 max-w-3xl text-lg leading-relaxed text-muted sm:text-xl\">Адрес мог измениться или в нём есть ошибка. Начните с точной модели телевизора либо откройте проверенный справочник VESA.</p><a class=\"primary-button mt-6\" href=\"/podbor/\">Подобрать кронштейн</a></header><section class=\"grid gap-px border-b border-ink bg-ink sm:grid-cols-2\" aria-label=\"Полезные разделы\"><a class=\"group min-w-0 bg-paper p-6 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-inset\" href=\"/modeli/\"><span class=\"font-mono text-xs uppercase text-action\">Точная модель</span><strong class=\"mt-2 block font-display text-3xl font-extrabold\">Каталог телевизоров</strong><span class=\"mt-3 block leading-relaxed text-muted\">Найдите паспортные VESA, массу и подходящие кронштейны.</span><span class=\"mt-5 inline-flex font-semibold text-action\">Открыть каталог →</span></a><a class=\"group min-w-0 bg-paper p-6 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-inset\" href=\"/vesa/\"><span class=\"font-mono text-xs uppercase text-technical\">Проверка отверстий</span><strong class=\"mt-2 block font-display text-3xl font-extrabold\">Справочник VESA</strong><span class=\"mt-3 block leading-relaxed text-muted\">Узнайте размер крепления и сравните его с кронштейном.</span><span class=\"mt-5 inline-flex font-semibold text-action\">Проверить VESA →</span></a></section><p class=\"py-7 text-sm leading-relaxed text-muted\">Если вы перешли по внутренней ссылке KREPI TV, вернитесь на <a class=\"font-semibold text-action underline underline-offset-4\" href=\"/\">главную страницу</a> и выберите нужный инструмент.</p></article>",
    )
}

fn not_found_page_html() -> String {
    let canonical = "https://krepitv.ru/404.html";
    html_shell(
        "Страница не найдена — KREPI TV",
        "Страница не найдена. Перейдите к подбору кронштейна, каталогу телевизоров или справочнику VESA.",
        canonical,
        "not-found",
        None,
        Some(&not_found_page_body()),
        HeadExtras {
            robots: Some("noindex,follow"),
            json_ld: &breadcrumb_json_ld(&[
                ("Главная", "https://krepitv.ru/"),
                ("Страница не найдена", canonical),
            ]),
        },
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

fn commercial_profile_updated_at<'a>(
    file: &'a CommercialProfilesFile,
    profile: &'a CommercialProfile,
) -> &'a str {
    profile.updated_at.as_deref().unwrap_or(&file.updated_at)
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

fn mount_technical_scheme_html(mount: &Mount) -> String {
    let (mechanism, description, diagram_label, drawing) = match mount.mechanism.as_str() {
        "fixed" => (
            "Фиксированный",
            "Экран удерживается в одном положении близко к стене.",
            "фиксированный механизм между стеной и телевизором",
            r#"<g data-mechanism-part="fixed-rails"><line class="stroke-ink" stroke-linecap="round" stroke-width="14" vector-effect="non-scaling-stroke" x1="106" x2="256" y1="132" y2="132"></line><line class="stroke-ink" stroke-linecap="round" stroke-width="14" vector-effect="non-scaling-stroke" x1="106" x2="256" y1="196" y2="196"></line><rect class="fill-paper stroke-ink" height="220" rx="5" stroke-width="5" vector-effect="non-scaling-stroke" width="48" x="256" y="54"></rect><rect class="fill-ink" height="94" rx="2" width="8" x="256" y="117"></rect><text class="fill-muted font-mono text-[16px]" x="178" y="238">БЕЗ ПОВОРОТА</text></g>"#,
        ),
        "tilt" => (
            "Наклонный",
            "Экран можно наклонить. Наклон на схеме условный: паспортного угла в каталоге нет.",
            "наклонный механизм между стеной и телевизором",
            r#"<g data-mechanism-part="tilt-joint"><line class="stroke-ink" stroke-linecap="round" stroke-width="16" vector-effect="non-scaling-stroke" x1="106" x2="412" y1="164" y2="164"></line><circle class="fill-action stroke-ink" cx="412" cy="164" r="14" stroke-width="3" vector-effect="non-scaling-stroke"></circle><g transform="rotate(-8 442 164)"><rect class="fill-paper stroke-ink" height="220" rx="5" stroke-width="5" vector-effect="non-scaling-stroke" width="48" x="418" y="54"></rect><rect class="fill-ink" height="94" rx="2" width="8" x="418" y="117"></rect></g><path class="fill-none stroke-technical" d="M 380 118 A 60 60 0 0 1 447 104" stroke-dasharray="6 5" stroke-width="3" vector-effect="non-scaling-stroke"></path><text class="fill-muted font-mono text-[16px]" x="318" y="88">НАКЛОН УСЛОВНЫЙ</text></g>"#,
        ),
        "full-motion" => (
            "Поворотный",
            "Экран можно отвести от стены на шарнирном рычаге. Сложенное и выдвинутое положения показаны без масштаба.",
            "поворотный шарнирный механизм между стеной и телевизором",
            r#"<g data-mechanism-part="articulated-arm"><rect class="fill-none stroke-line" height="194" stroke-dasharray="9 8" stroke-width="3" vector-effect="non-scaling-stroke" width="36" x="190" y="66"></rect><text class="fill-muted font-mono text-[16px]" x="172" y="52">СЛОЖЕНО</text><polyline class="fill-none stroke-ink" points="106,164 228,104 365,205 514,164" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" vector-effect="non-scaling-stroke"></polyline><circle class="fill-action stroke-ink" cx="228" cy="104" r="12" stroke-width="3" vector-effect="non-scaling-stroke"></circle><circle class="fill-action stroke-ink" cx="365" cy="205" r="12" stroke-width="3" vector-effect="non-scaling-stroke"></circle><rect class="fill-paper stroke-ink" height="220" rx="5" stroke-width="5" vector-effect="non-scaling-stroke" width="48" x="514" y="54"></rect><rect class="fill-ink" height="94" rx="2" width="8" x="514" y="117"></rect></g>"#,
        ),
        _ => (
            "Не указан",
            "Положение экрана показано условно: тип механизма не указан в исходных данных.",
            "механизм между стеной и телевизором без указанного типа",
            r#"<g data-mechanism-part="unspecified"><line class="stroke-line" stroke-dasharray="9 8" stroke-width="8" vector-effect="non-scaling-stroke" x1="106" x2="256" y1="164" y2="164"></line><rect class="fill-paper stroke-ink" height="220" rx="5" stroke-width="5" vector-effect="non-scaling-stroke" width="48" x="256" y="54"></rect></g>"#,
        ),
    };
    let distance = if (mount.wall_distance_min_mm - mount.wall_distance_max_mm).abs() < f64::EPSILON
    {
        format!("{} мм", format_mm(mount.wall_distance_min_mm))
    } else {
        format!(
            "{}–{} мм",
            format_mm(mount.wall_distance_min_mm),
            format_mm(mount.wall_distance_max_mm)
        )
    };
    let note_id = format!("mount-scheme-note-{}", mount.id);

    format!(
        r#"<section class="min-w-0 border-b-2 border-ink py-7 [overflow-wrap:anywhere]" data-mount-technical-scheme="{mount_id}" data-mount-mechanism="{mechanism_key}"><div class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(22rem,1.18fr)] lg:items-start"><div class="min-w-0"><p class="font-mono text-xs uppercase tracking-[0.12em] text-action">Техническая схема, не фотография</p><h2 class="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Как кронштейн располагает телевизор</h2><p class="mt-3 max-w-2xl leading-relaxed text-muted">{description}</p><dl class="mt-5 grid min-w-0 grid-cols-2 gap-px border border-ink bg-ink sm:grid-cols-3"><div class="min-w-0 bg-paper p-3"><dt class="font-mono text-[0.68rem] uppercase text-muted">Механизм</dt><dd class="mt-1 break-words font-display text-xl font-extrabold text-ink">{mechanism}</dd></div><div class="min-w-0 bg-paper p-3"><dt class="font-mono text-[0.68rem] uppercase text-muted">От стены</dt><dd class="mt-1 break-words font-display text-xl font-extrabold text-ink">{distance}</dd></div><div class="min-w-0 bg-paper p-3"><dt class="font-mono text-[0.68rem] uppercase text-muted">Диагональ</dt><dd class="mt-1 break-words font-display text-xl font-extrabold text-ink">{min_diagonal}–{max_diagonal}″</dd></div><div class="min-w-0 bg-paper p-3"><dt class="font-mono text-[0.68rem] uppercase text-muted">Нагрузка</dt><dd class="mt-1 break-words font-display text-xl font-extrabold text-ink">до {load} кг</dd></div><div class="min-w-0 bg-paper p-3"><dt class="font-mono text-[0.68rem] uppercase text-muted">VESA</dt><dd class="mt-1 break-words font-display text-xl font-extrabold text-ink">{vesa_count} схем</dd></div></dl><p class="mt-4 text-sm leading-relaxed text-muted" id="{note_id}">Габариты деталей, длина рычагов и углы условные. Схема передаёт только тип механизма и паспортный диапазон расстояния от стены.</p></div><div class="min-w-0 overflow-hidden border border-ink bg-white p-3 sm:p-5"><svg aria-label="Условная техническая схема: {diagram_label}. Расстояние от стены {distance}." aria-describedby="{note_id}" class="block h-auto w-full max-w-full text-ink" data-mount-scheme-svg="true" preserveAspectRatio="xMidYMid meet" role="img" viewBox="0 0 640 340"><rect class="fill-line" height="244" width="22" x="54" y="42"></rect><line class="stroke-ink" stroke-width="3" vector-effect="non-scaling-stroke" x1="88" x2="88" y1="42" y2="286"></line><rect class="fill-action" height="116" rx="3" width="18" x="88" y="106"></rect><text class="fill-muted font-mono text-[18px]" x="42" y="316">СТЕНА</text>{drawing}<line class="stroke-technical" stroke-width="2" vector-effect="non-scaling-stroke" x1="98" x2="548" y1="302" y2="302"></line><line class="stroke-technical" stroke-width="2" vector-effect="non-scaling-stroke" x1="98" x2="98" y1="292" y2="312"></line><line class="stroke-technical" stroke-width="2" vector-effect="non-scaling-stroke" x1="548" x2="548" y1="292" y2="312"></line><rect class="fill-white" height="30" width="220" x="213" y="287"></rect><text class="fill-technical font-mono text-[18px]" text-anchor="middle" x="323" y="308">ОТ СТЕНЫ: {distance}</text></svg><p class="mt-3 border-t border-line pt-3 font-mono text-xs uppercase text-muted">Стена → механизм → телевизор</p></div></div></section>"#,
        mount_id = escape_html(&mount.id),
        mechanism_key = escape_html(&mount.mechanism),
        mechanism = mechanism,
        description = description,
        diagram_label = diagram_label,
        drawing = drawing,
        distance = escape_html(&distance),
        min_diagonal = format_mm(mount.min_diagonal_in),
        max_diagonal = format_mm(mount.max_diagonal_in),
        load = format_mm(mount.max_load_kg),
        vesa_count = mount.vesa.len(),
        note_id = escape_html(&note_id),
    )
}

fn home_page_body(models: &[TvModel], seo_pages: &[SeoPage]) -> String {
    let spotlight_model = models
        .iter()
        .find(|model| model.id == "tcl-65c7k")
        .map(|model| {
            format!(
                "<a class=\"mt-6 grid gap-3 border border-line bg-white p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center\" data-home-model-spotlight=\"{id}\" href=\"/modeli/{id}/\"><span><span class=\"font-mono text-xs uppercase text-action\">Пример точной проверки</span><strong class=\"mt-1 block font-display text-2xl\">{title}</strong><span class=\"mt-2 block text-sm leading-relaxed text-muted\">VESA {vesa_w}×{vesa_h} мм · {diagonal}″ · {weight} кг {weight_suffix}</span></span><span class=\"font-semibold text-action\">Открыть паспорт и крепления →</span></a>",
                id = escape_html(&model.id),
                title = escape_html(&model.title),
                vesa_w = model.vesa_width_mm,
                vesa_h = model.vesa_height_mm,
                diagonal = model.diagonal_inches,
                weight = model.weight_kg,
                weight_suffix = model_weight_suffix(model),
            )
        })
        .unwrap_or_default();
    let mut featured_pages = seo_pages
        .iter()
        .filter(|page| is_indexable_seo_page(page) && page.home_priority.is_some())
        .collect::<Vec<_>>();
    featured_pages.sort_by(|left, right| {
        left.home_priority
            .unwrap_or(u8::MAX)
            .cmp(&right.home_priority.unwrap_or(u8::MAX))
            .then_with(|| left.id.cmp(&right.id))
    });
    let seo_links = featured_pages
        .into_iter()
        .take(9)
        .map(|page| {
            format!(
                "<a class=\"group relative flex min-h-28 items-end bg-paper px-3 py-4 pr-9 font-display text-base font-bold leading-snug transition hover:bg-white hover:text-action focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-inset sm:p-5 sm:pr-12 sm:text-lg\" data-featured-traffic-tool=\"{}\" href=\"{}\">{}<span class=\"absolute bottom-4 right-3 size-4 transition group-hover:translate-x-1 sm:bottom-5 sm:right-5 sm:size-5\" aria-hidden=\"true\">→</span></a>",
                escape_html(&page.id),
                escape_html(&page.path),
                escape_html(page.h1.split(':').next().unwrap_or(&page.h1)),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let diagnostic_links = [
        "tv-wont-turn-on",
        "tv-freezes",
        "tv-dark-screen",
        "tv-sound-no-picture",
        "tv-no-sound",
        "tv-remote-not-working",
        "tv-turns-off",
        "tv-no-internet",
        "tv-usb-not-seen",
    ]
    .iter()
    .filter_map(|id| {
        seo_pages
            .iter()
            .find(|page| page.id == *id && is_indexable_seo_page(page))
    })
    .map(|page| {
        format!(
            "<a class=\"relative flex min-h-16 items-end bg-paper px-3 py-3 pr-9 font-display text-base font-bold leading-snug sm:min-h-28 sm:p-5 sm:pr-12 sm:text-lg\" data-home-tv-diagnostic=\"{}\" href=\"{}\">{}<span class=\"absolute bottom-3 right-3 sm:bottom-5 sm:right-5\" aria-hidden=\"true\">→</span></a>",
            escape_html(&page.id),
            escape_html(&page.path),
            escape_html(page.h1.split(':').next().unwrap_or(&page.h1)),
        )
    })
    .collect::<Vec<_>>()
    .join("\n");

    static_layout(&format!(
        "<div class=\"mx-auto max-w-[1440px] px-5 pb-16 pt-8 sm:px-8\"><header class=\"border-b-2 border-ink pb-8\"><p class=\"font-mono text-xs uppercase text-action\">Независимый технический подбор</p><h1 class=\"mt-3 max-w-[1100px] font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold uppercase leading-[0.92]\">Кронштейн для вашего телевизора</h1><p class=\"mt-6 max-w-3xl text-lg leading-relaxed text-muted\">Введите точную модель: KREPI TV сверит VESA, диагональ и массу с характеристиками кронштейнов. Расчёт выполняется локально в браузере, а материал стены и крепёж всегда проверяются отдельно.</p><a class=\"primary-button mt-6\" href=\"/podbor/\">Начать подбор</a></header><section class=\"py-9\"><p class=\"font-mono text-xs uppercase text-action\">Точные модели с источниками · {model_count}</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Найдите точную модель в каталоге</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Полный список сгруппирован по брендам, чтобы главная оставалась короткой, а каждая модель была доступна через каталог.</p><a class=\"mt-5 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/modeli/\">Открыть все проверенные модели →</a>{spotlight_model}</section><section class=\"border-t border-line py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Что даёт сервис без покупки</h2><ul class=\"mt-5 grid gap-3 text-base leading-relaxed sm:grid-cols-2\"><li>Точный VESA конкретной модели телевизора.</li><li>Проверку массы с запасом нагрузки 25%.</li><li>Калькулятор центра, нижнего и верхнего края экрана.</li><li>Расчёт расстояния до экрана и диагонали в обе стороны.</li><li>Ссылки на официальные источники характеристик.</li></ul></section><section class=\"border-t border-line py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Главные справочники и калькуляторы</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Проверьте физический размер, расположение на стене, высоту и VESA до выбора конкретного кронштейна.</p><nav class=\"mt-5 grid gap-px border border-line bg-line sm:grid-cols-3\" aria-label=\"Главные справочники и калькуляторы\">{seo_links}</nav><p class=\"mt-5\"><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/kronshteyny/\">Открыть каталог проверенных кронштейнов →</a></p></section><section class=\"border-t border-line py-9\" data-home-tv-diagnostics=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Без разборки и догадок</p><div class=\"mt-2 grid gap-4 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,2fr)] lg:items-end\"><h2 class=\"font-display text-3xl font-extrabold\">Диагностика телевизора</h2><p class=\"max-w-2xl leading-relaxed text-muted\">Выберите наблюдаемый симптом. Мастер даст одну безопасную следующую проверку и остановится там, где нужна инструкция точной модели или официальная поддержка.</p></div><nav class=\"mt-5 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 md:grid-cols-3\" aria-label=\"Диагностика телевизора\">{diagnostic_links}</nav></section></div>",
        model_count = models.len(),
        spotlight_model = spotlight_model,
    ))
}

fn matcher_page_body(models: &[TvModel]) -> String {
    let mut brand_counts = BTreeMap::<String, usize>::new();
    for model in models {
        *brand_counts.entry(model.brand.clone()).or_default() += 1;
    }
    let mut brand_counts = brand_counts.into_iter().collect::<Vec<_>>();
    brand_counts.sort_by(|(left_brand, left_count), (right_brand, right_count)| {
        right_count
            .cmp(left_count)
            .then_with(|| left_brand.cmp(right_brand))
    });
    let brand_options = brand_counts
        .iter()
        .map(|(brand, count)| {
            format!(
                "<option data-guided-brand-option=\"true\" value=\"{brand}\">{brand} — {count}</option>",
                brand = escape_html(brand),
                count = count,
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
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
        "<div class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Локальная проверка совместимости</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Подбор кронштейна по модели телевизора</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Сначала выберите марку, затем точную модель телевизора. После этого сервис уточнит основание стены и механизм, проверит VESA, диапазон диагоналей и запас нагрузки.</p><section class=\"mt-10 border-y-2 border-ink py-7\" data-guided-brand-step-static=\"true\" data-guided-brand-count=\"{brand_count}\"><p class=\"font-mono text-xs uppercase text-action\">Шаг 1 из 4</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Сначала выберите марку телевизора</h2><label class=\"mt-5 block font-display text-lg font-bold\" for=\"static-guided-brand\">Марка телевизора</label><select class=\"mt-3 h-16 w-full rounded-md border-2 border-ink bg-white px-5 text-xl\" id=\"static-guided-brand\"><option value=\"\">Выберите марку</option>{brand_options}</select><div class=\"mt-5 opacity-60\" data-guided-model-step-static=\"true\"><label class=\"block font-display text-lg font-bold\" for=\"static-guided-model\">Модель телевизора</label><select class=\"mt-3 h-16 w-full rounded-md border-2 border-line bg-white px-5 text-xl\" disabled id=\"static-guided-model\"><option value=\"\">Сначала выберите марку</option></select></div><p class=\"mt-3 text-sm leading-relaxed text-muted\">После загрузки интерактивного мастера выбор марки ограничит список только её проверенными моделями.</p></section><details class=\"mt-8 border-y border-line\"><summary class=\"cursor-pointer py-5 font-display text-2xl font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-action\">Все проверенные модели по маркам</summary><div class=\"pb-5\">{model_links}</div></details><p class=\"mt-8\"><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Как устроена проверка и где её границы</a></p></div>",
        brand_count = brand_counts.len(),
    ))
}

fn models_catalog_body(models: &[TvModel], market_models: &[MarketTvModel]) -> String {
    let items = models
        .iter()
        .map(|tv| {
            (
                tv.brand.clone(),
                format!(
                    "<a class=\"grid gap-2 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center\" href=\"/modeli/{id}/\"><span><strong class=\"font-display text-2xl\">{title}</strong><span class=\"mt-1 block text-sm text-muted\">{series} · {year} · VESA {vesa_w}×{vesa_h} мм · {diagonal}″ · {weight} кг {weight_suffix}</span></span><span class=\"font-mono text-xs uppercase text-action\">Открыть проверку</span></a>",
                    id = escape_html(&tv.id),
                    title = escape_html(&tv.title),
                    series = escape_html(&tv.series),
                    year = model_year_label(tv.model_year),
                    vesa_w = tv.vesa_width_mm,
                    vesa_h = tv.vesa_height_mm,
                    diagonal = tv.diagonal_inches,
                    weight = tv.weight_kg,
                    weight_suffix = model_weight_suffix(tv),
                ),
            )
        })
        .collect::<Vec<_>>();
    let items = brand_catalog_html(items, "Моделей", "div", "border-b border-line");
    let observed_items = market_models
        .iter()
        .filter(|model| model.page_kind == "observed")
        .map(|model| {
            let diagonal = model
                .diagonal_inches
                .map(|value| format!(" · {}″", value))
                .unwrap_or_default();
            let status = if model.indexable {
                "Модель идентифицирована · VESA и масса проверяются"
            } else {
                "Нужно сверить точный код на шильдике"
            };
            (
                model.brand.clone(),
                format!(
                    "<a class=\"grid gap-2 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center\" href=\"{route}\"><span><strong class=\"font-display text-2xl\">{title}</strong><span class=\"mt-1 block text-sm text-muted\">{status}{diagonal} · замечена на Маркете {checked_at}</span></span><span class=\"font-mono text-xs uppercase text-action\">Открыть проверку</span></a>",
                    route = escape_html(&model.route_path),
                    title = escape_html(&model.title),
                    status = status,
                    diagonal = diagonal,
                    checked_at = escape_html(&model.checked_at),
                ),
            )
        })
        .collect::<Vec<_>>();
    let observed_count = observed_items.len();
    let observed_items =
        brand_catalog_html(observed_items, "Моделей", "div", "border-b border-line");
    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Два уровня проверки</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Модели телевизоров</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Сначала идут точные паспорта с подтверждёнными VESA и массой. Ниже — модели из актуального снимка Маркета: для них уже собрана точная идентичность и план проверки, но совместимость не показывается до подтверждения характеристик.</p><nav class=\"mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-2\" aria-label=\"Инструменты перед выбором модели\"><a class=\"bg-paper p-5\" href=\"/razmery-televizora-po-diagonali/\"><span class=\"font-mono text-xs uppercase text-action\">Размер до покупки</span><strong class=\"mt-1 block font-display text-2xl\">Ширина и высота по диагонали</strong><span class=\"mt-2 block text-sm leading-relaxed text-muted\">Таблица 16:9, обратный замер и проверка ниши.</span></a><a class=\"bg-paper p-5\" href=\"/vinty-dlya-krepleniya-televizora/\"><span class=\"font-mono text-xs uppercase text-action\">Технический справочник</span><strong class=\"mt-1 block font-display text-2xl\">Винты VESA по точной модели</strong><span class=\"mt-2 block text-sm leading-relaxed text-muted\">Резьба, длина, вставки и официальное руководство.</span></a></nav><section class=\"mt-10\"><p class=\"font-mono text-xs uppercase text-verified\">Проверено по источникам · {verified_count}</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Паспорта с VESA и массой</h2><nav class=\"mt-5\" aria-label=\"Проверенные модели телевизоров\">{items}</nav></section><section class=\"mt-12 border-t-2 border-ink pt-8\" data-market-model-catalog=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Найдены в выдаче Маркета · {observed_count}</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Модели до паспортной проверки</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Страница каждой модели рассчитывает размер активной области и даёт законченный план сверки VESA. Числа VESA, масса и подходящие кронштейны не угадываются.</p><nav class=\"mt-5\" aria-label=\"Наблюдаемые модели телевизоров\">{observed_items}</nav></section></article>",
        verified_count = models.len(),
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
        ("/kronshteyny-godoo/", "GoDoo"),
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

fn model_year_label(model_year: Option<u32>) -> String {
    model_year
        .map(|year| year.to_string())
        .unwrap_or_else(|| "год не указан производителем".to_string())
}

fn model_year_fact(model_year: Option<u32>) -> String {
    model_year
        .map(|year| format!("Модельный год: {year}"))
        .unwrap_or_else(|| "Модельный год производителем не указан".to_string())
}

fn model_weight_label(tv: &TvModel) -> &'static str {
    match tv.weight_basis.as_deref() {
        Some("with_stand") | Some("published_unspecified") => "Консервативная масса",
        _ => "Паспортная масса",
    }
}

fn model_weight_suffix(tv: &TvModel) -> &'static str {
    match tv.weight_basis.as_deref() {
        Some("with_stand") => "с подставкой, консервативно",
        Some("published_unspecified") => "тип не указан, консервативно",
        _ => "без подставки",
    }
}

fn model_weight_reserve_explanation(tv: &TvModel) -> &'static str {
    match tv.weight_basis.as_deref() {
        Some("with_stand") => {
            "Использована опубликованная масса с подставкой: она выше массы корпуса и даёт консервативный порог. Затем добавлен запас 25%."
        }
        Some("published_unspecified") => {
            "Источник не уточняет тип опубликованной массы, поэтому значение целиком принято как консервативное. Затем добавлен запас 25%."
        }
        _ => "К паспортной массе без подставки добавлен запас 25%.",
    }
}

fn model_page_body(
    tv: &TvModel,
    matches: &[MountMatch],
    affiliate_offers: &[PublicAffiliateOffer],
    affiliate_now_seconds: i64,
    seo_pages: &[SeoPage],
    commercial_profile: Option<&CommercialProfile>,
) -> String {
    let required_load_kg = tv.weight_kg * 1.25;
    let compatible_count = matches.iter().filter(|matched| matched.compatible).count();
    let verified_count = matches
        .iter()
        .filter(|matched| matched.compatible && matched.fit_status == "verified-fit")
        .count();
    let conditional_count = matches
        .iter()
        .filter(|matched| matched.compatible && matched.fit_status == "conditional-fit")
        .count();
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
                && matches.iter().any(|matched| {
                    matched.compatible
                        && matched.fit_status == "verified-fit"
                        && matched.mount.id == offer.entity_id
                })
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
    let editorial_accountability = editorial_accountability_html("verified-model", &tv.checked_at);
    let technical_image = technical_image_html(
        &model_technical_image_path(tv),
        &format!("Техническая схема VESA для {}", tv.title),
        &format!(
            "Схема показывает паспортную пару VESA {}×{} мм; геометрия корпуса условная.",
            tv.vesa_width_mm, tv.vesa_height_mm
        ),
    );
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
    let result_heading;
    let result_explanation;
    let compatibility_lead;
    if vesa_conflict.is_some() {
        result_heading = format!("Кандидатов: {compatible_count}");
        result_explanation = "Из-за расхождения официальных источников ни один кандидат не считается окончательно подтверждённым до ручного измерения VESA.".to_string();
        compatibility_lead = "Официальные источники расходятся по VESA. Не считайте список окончательным до измерения отверстий; отдельно проверьте VESA, нагрузку и диапазон диагонали каждого кронштейна.".to_string();
    } else if conditional_count > 0 {
        result_heading = format!("Подтверждено: {verified_count}");
        result_explanation = format!(
            "Дополнительно условных вариантов: {conditional_count}. Они проходят VESA и нагрузку, но требуют ручной проверки паспортного диапазона диагонали. Крепёж к стене выбирают после проверки основания."
        );
        compatibility_lead = format!(
            "Полностью подтверждено: {verified_count}. Условных вариантов из-за диапазона диагонали: {conditional_count}. Перед монтажом сверьте комплект винтов с официальной инструкцией телевизора."
        );
    } else {
        result_heading = format!("Подтверждено: {verified_count}");
        result_explanation = "Все показанные варианты прошли проверку точной VESA, нагрузки с запасом 25% и паспортного диапазона диагонали. Крепёж к стене выбирают после проверки основания.".to_string();
        compatibility_lead = format!(
            "Число полностью подтверждённых вариантов: {verified_count}. Перед монтажом сверьте комплект винтов с официальной инструкцией телевизора."
        );
    }

    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенная модель · {series} · {year}</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">Кронштейн для {title}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Сначала сопоставьте монтажные отверстия VESA и массу телевизора, затем проверьте стену, крепёж, доступ к разъёмам и геометрию монтажной пластины.</p>{commercial_section}{editorial_accountability}{technical_image}<dl class=\"mt-8 grid gap-4 border-y-2 border-ink py-6 sm:grid-cols-3\"><div><dt class=\"font-mono text-xs uppercase text-muted\">VESA</dt><dd class=\"mt-1 font-display text-2xl font-extrabold sm:text-3xl\">{vesa_fact}</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{diagonal}″</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">{weight_label}</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{weight} кг</dd><p class=\"mt-1 text-xs text-muted\">{weight_suffix}</p></div></dl><section class=\"grid gap-px border-b border-ink bg-ink md:grid-cols-3\" aria-label=\"Как проверена совместимость\"><article class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-action\">01 · Отверстия</p><h2 class=\"mt-2 font-display text-2xl font-extrabold\">Точная пара VESA</h2><p class=\"mt-3 text-sm leading-relaxed text-muted\">В список попадают только кронштейны, где явно заявлена пара {vesa_fact}; максимальный размер рамки не считается совпадением.</p></article><article class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-action\">02 · Нагрузка</p><h2 class=\"mt-2 font-display text-2xl font-extrabold\">Минимум {required_load:.2} кг</h2><p class=\"mt-3 text-sm leading-relaxed text-muted\">{weight_explanation} Номинальная нагрузка каждого показанного кронштейна не ниже этого порога.</p></article><article class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-action\">03 · Результат</p><h2 class=\"mt-2 font-display text-2xl font-extrabold\">{result_heading}</h2><p class=\"mt-3 text-sm leading-relaxed text-muted\">{result_explanation}</p></article></section>{wall_mount_screws}{context_section}{affiliate_section}<section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Подходящие кронштейны</h2><p class=\"mt-3 max-w-3xl text-muted\">{compatibility_lead}</p><div class=\"mt-5\">{compatible}</div></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Размеры и источник</h2><p class=\"mt-3 text-lg text-muted\">Серия {series}. {year_fact}. Корпус {width}×{height}×{depth} мм без подставки. Характеристики модели проверены {checked_at}.</p><a class=\"mt-5 inline-flex font-semibold text-technical underline underline-offset-4\" href=\"{source}\" rel=\"noreferrer\">Источник характеристик: {source_label}</a></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Что сервис не подтверждает автоматически</h2><p class=\"mt-3 text-lg leading-relaxed text-muted\">Состояние стены, тип анкеров, скрытую проводку, перекрытие разъёмов и положение VESA относительно геометрического центра экрана необходимо проверить на месте.</p><a class=\"mt-5 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Открыть полную методику</a></section></article>",
        title = escape_html(&tv.title),
        series = escape_html(&tv.series),
        year = model_year_label(tv.model_year),
        year_fact = model_year_fact(tv.model_year),
        vesa_fact = vesa_fact,
        diagonal = tv.diagonal_inches,
        weight = tv.weight_kg,
        weight_label = model_weight_label(tv),
        weight_suffix = model_weight_suffix(tv),
        weight_explanation = model_weight_reserve_explanation(tv),
        width = tv.width_mm,
        height = tv.height_mm,
        depth = tv.depth_mm,
        checked_at = escape_html(&tv.checked_at),
        source = escape_html(&tv.source_url),
        source_label = escape_html(&tv.source_label),
        affiliate_section = affiliate_section,
        context_section = context_section,
        commercial_section = commercial_section,
        editorial_accountability = editorial_accountability,
        technical_image = technical_image,
        compatibility_lead = escape_html(&compatibility_lead),
        result_heading = escape_html(&result_heading),
        result_explanation = escape_html(&result_explanation),
        required_load = required_load_kg,
    ))
}

fn russian_integer(value: u64) -> String {
    let digits = value.to_string();
    let mut output = String::new();
    for (index, character) in digits.chars().enumerate() {
        if index > 0 && (digits.len() - index) % 3 == 0 {
            output.push(' ');
        }
        output.push(character);
    }
    output
}

fn observed_screen_geometry(model: &MarketTvModel) -> String {
    let Some(diagonal) = model.diagonal_inches else {
        return "<section class=\"border-y-2 border-ink py-7\" data-observed-screen-geometry=\"unknown\"><p class=\"font-mono text-xs uppercase text-action\">Диагональ требует сверки</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Измерьте активную область экрана</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">В карточке недостаточно точных данных для расчёта. Измерьте диагональ только видимой области от угла до противоположного угла, не включая рамку.</p><a class=\"mt-5 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/razmery-televizora-po-diagonali/\">Открыть калькулятор размеров →</a></section>".to_string();
    };
    let denominator = 337_f64.sqrt();
    let width_cm = diagonal * 16.0 / denominator * 2.54;
    let height_cm = diagonal * 9.0 / denominator * 2.54;
    let diagonal_cm = diagonal * 2.54;
    let number = |value: f64| format!("{value:.1}").replace('.', ",");
    format!(
        "<section class=\"border-y-2 border-ink py-7\" data-observed-screen-geometry=\"calculated\"><p class=\"font-mono text-xs uppercase text-action\">Первый полезный результат</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Размер активного экрана {diagonal}″ при пропорции 16:9</h2><dl class=\"mt-5 grid gap-px border border-ink bg-ink sm:grid-cols-3\"><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{diagonal_cm} см</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Ширина экрана</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{width_cm} см</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Высота экрана</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{height_cm} см</dd></div></dl><p class=\"mt-4 max-w-3xl text-sm leading-relaxed text-muted\">Это расчёт активной области 16:9, а не паспортный размер корпуса. Рамка, нижний блок и толщина конкретной модели в него не входят.</p><a class=\"mt-4 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/razmery-televizora-po-diagonali/\">Проверить нишу или ввести точные размеры →</a></section>",
        diagonal = diagonal,
        diagonal_cm = number(diagonal_cm),
        width_cm = number(width_cm),
        height_cm = number(height_cm),
    )
}

fn observed_model_page_body(model: &MarketTvModel) -> String {
    let geometry = observed_screen_geometry(model);
    let diagonal = model
        .diagonal_inches
        .map(|value| format!("{}″", value))
        .unwrap_or_else(|| "Нужно сверить".to_string());
    let purchase_signal = model.purchase_count.map_or_else(
        || "Публичный счётчик покупок не показан в сохранённой выдаче.".to_string(),
        |count| {
            format!(
                "В сохранённой выдаче рядом с карточкой отображалось «{} купили». Это интерфейсный сигнал Маркета, а не подтверждённая статистика продаж конкретной модификации.",
                russian_integer(count)
            )
        },
    );
    let rating_signal = match (model.rating_value, model.rating_count) {
        (Some(value), Some(count)) => format!(
            "Рейтинг в снимке: {} из 5 · оценок: {}.",
            format!("{value:.1}").replace('.', ","),
            russian_integer(count)
        ),
        _ => "Рейтинг в сохранённой выдаче не указан.".to_string(),
    };
    let alias_notice = if model.page_kind == "alias" {
        format!(
            "<aside class=\"mt-6 border-2 border-action bg-white p-5\" data-market-model-alias=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Повтор карточки одной модели</p><p class=\"mt-2 max-w-3xl leading-relaxed text-muted\">Маркет показал эту же модель в нескольких товарных карточках. Для поиска используется одна основная страница без конкурирующих дублей.</p><a class=\"mt-3 inline-flex font-semibold text-action underline underline-offset-4\" href=\"{}\">Открыть основную страницу модели →</a></aside>",
            escape_html(&model.canonical_path),
        )
    } else {
        String::new()
    };
    let identity_status = if model.identity_confidence == "low" {
        "Точный заводской код не подтверждён: перед поиском кронштейна перепишите модель с шильдика на задней панели."
    } else {
        "Модель идентифицирована по карточке Маркета. Технические параметры настенного монтажа пока не подтверждены официальным руководством."
    };
    let editorial_accountability =
        editorial_accountability_html("observed-model", &model.checked_at);

    let body = static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\" data-market-model-page=\"true\"><header class=\"mt-6 border-b-2 border-ink pb-8\"><p class=\"font-mono text-xs uppercase tracking-[0.12em] text-action\">Модель найдена на Маркете · паспорт проверяется</p><h1 class=\"mt-3 break-words font-display text-[clamp(2.8rem,6vw,6.4rem)] font-extrabold leading-[0.92] tracking-[-0.035em]\">Кронштейн для {title}</h1><p class=\"mt-6 max-w-3xl text-lg leading-relaxed text-muted\">{identity_status}</p><p class=\"mt-4 border-l-2 border-action pl-4 font-semibold\">Без подтверждённых VESA и массы KREPI TV не показывает «подходящие» кронштейны и не подменяет проверку догадкой.</p></header>{editorial_accountability}{alias_notice}<dl class=\"grid gap-px border-b-2 border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4\"><div class=\"bg-paper p-5\"><dt class=\"font-mono text-xs uppercase text-muted\">Бренд</dt><dd class=\"mt-1 font-display text-2xl font-extrabold\">{brand}</dd></div><div class=\"bg-paper p-5\"><dt class=\"font-mono text-xs uppercase text-muted\">Модель</dt><dd class=\"mt-1 break-words font-display text-2xl font-extrabold\">{model}</dd></div><div class=\"bg-paper p-5\"><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-display text-2xl font-extrabold\">{diagonal}</dd></div><div class=\"bg-paper p-5\"><dt class=\"font-mono text-xs uppercase text-muted\">Проверено в выдаче</dt><dd class=\"mt-1 font-display text-2xl font-extrabold\">{checked_at}</dd></div></dl>{geometry}<section class=\"py-8\"><p class=\"font-mono text-xs uppercase text-action\">Три проверки до покупки</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Как подобрать кронштейн без ошибки</h2><ol class=\"mt-6 grid gap-px border border-ink bg-ink md:grid-cols-3\"><li class=\"bg-paper p-5\"><span class=\"font-mono text-xs uppercase text-action\">01 · Модель</span><h3 class=\"mt-2 font-display text-2xl font-extrabold\">Сверьте шильдик</h3><p class=\"mt-3 text-sm leading-relaxed text-muted\">Сравните полный код на задней панели с «{model}». Суффикс и диагональ могут менять корпус, массу и VESA.</p></li><li class=\"bg-paper p-5\"><span class=\"font-mono text-xs uppercase text-action\">02 · VESA</span><h3 class=\"mt-2 font-display text-2xl font-extrabold\">Измерьте отверстия</h3><p class=\"mt-3 text-sm leading-relaxed text-muted\">Снимите подставку только по инструкции. Измерьте горизонталь × вертикаль между центрами четырёх резьбовых отверстий.</p><a class=\"mt-3 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/kak-uznat-vesa-televizora/\">Инструкция по VESA →</a></li><li class=\"bg-paper p-5\"><span class=\"font-mono text-xs uppercase text-action\">03 · Масса</span><h3 class=\"mt-2 font-display text-2xl font-extrabold\">Найдите вес без ножек</h3><p class=\"mt-3 text-sm leading-relaxed text-muted\">Берите массу без подставки из руководства и закладывайте минимум 25% запаса. Стеновой крепёж проверяется отдельно.</p><a class=\"mt-3 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Границы проверки →</a></li></ol></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Что зафиксировано в источнике</h2><p class=\"mt-4 max-w-4xl leading-relaxed\"><strong>Название карточки:</strong> {market_title}</p><p class=\"mt-3 max-w-4xl text-sm leading-relaxed text-muted\">{purchase_signal} {rating_signal}</p><a class=\"mt-5 inline-flex font-semibold text-technical underline underline-offset-4\" data-market-source=\"identity\" href=\"{market_url}\" rel=\"nofollow noopener noreferrer\" target=\"_blank\">Открыть исходную карточку Яндекс Маркета →</a><p class=\"mt-3 text-xs leading-relaxed text-muted\">Источник используется для идентификации и сигнала наличия на дату {checked_at}. Цена не сохраняется; доступность и характеристики могли измениться.</p></section><nav class=\"grid gap-px border-y border-ink bg-ink sm:grid-cols-2\" aria-label=\"Следующие проверки\"><a class=\"bg-paper p-5\" href=\"/vesa/\"><span class=\"font-mono text-xs uppercase text-action\">После измерения</span><strong class=\"mt-1 block font-display text-2xl\">Справочник VESA</strong><span class=\"mt-2 block text-sm text-muted\">Сравнить пару отверстий с проверенными моделями.</span></a><a class=\"bg-paper p-5\" href=\"/na-kakoy-vysote-veshat-televizor/\"><span class=\"font-mono text-xs uppercase text-action\">План стены</span><strong class=\"mt-1 block font-display text-2xl\">Высота установки</strong><span class=\"mt-2 block text-sm text-muted\">Рассчитать центр и края экрана по комнате.</span></a></nav></article>",
        title = escape_html(&model.title),
        brand = escape_html(&model.brand),
        model = escape_html(&model.model),
        diagonal = escape_html(&diagonal),
        checked_at = escape_html(&model.checked_at),
        identity_status = escape_html(identity_status),
        editorial_accountability = editorial_accountability,
        alias_notice = alias_notice,
        geometry = geometry,
        market_title = escape_html(&model.market_title),
        purchase_signal = escape_html(&purchase_signal),
        rating_signal = escape_html(&rating_signal),
        market_url = escape_html(&model.market_url),
    ));
    body.replace(
        "data-market-model-page=\"true\"",
        "data-market-model-page=\"true\" data-compatibility-status=\"unverified\"",
    )
    .replacen(
        "Кронштейн для ",
        "Проверка крепления для ",
        1,
    )
    .replacen(
        "</header>",
        "</header><section class=\"border-b-2 border-ink py-8\" data-unverified-fit=\"true\"><p class=\"font-mono text-xs uppercase text-action\">Статус совместимости</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Точный крепёж пока не подтверждён</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Для этой карточки ещё нет одновременно подтверждённых VESA, массы без подставки и паспортного диапазона конкретного кронштейна. Поэтому здесь нет товарной рекомендации и кнопки покупки.</p><p class=\"mt-3 max-w-3xl text-sm font-semibold leading-relaxed\">Страница станет каталогом совместимых кронштейнов только после проверки источника и автоматического расчёта запаса нагрузки.</p></section>",
        1,
    )
}

fn russian_plural_label<'a>(count: usize, one: &'a str, few: &'a str, many: &'a str) -> &'a str {
    let mod_100 = count % 100;
    let mod_10 = count % 10;
    if (11..=14).contains(&mod_100) {
        many
    } else if mod_10 == 1 {
        one
    } else if (2..=4).contains(&mod_10) {
        few
    } else {
        many
    }
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
                "<article class=\"grid gap-3 border-t border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center\"><div><h3 class=\"font-display text-2xl font-extrabold\">{title}</h3><p class=\"mt-1 text-sm text-muted\">{fit} · VESA {vesa_w}×{vesa_h} мм · {weight} кг {weight_suffix}</p><p class=\"mt-2 text-sm\">{evidence}</p></div><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/modeli/{id}/\">Телевизор {title}</a></article>",
                title = escape_html(&tv.title),
                fit = fit_label(&edge.fit_status),
                vesa_w = tv.vesa_width_mm,
                vesa_h = tv.vesa_height_mm,
                weight = tv.weight_kg,
                weight_suffix = model_weight_suffix(tv),
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
    let verified_count = verified_rows.len();
    let conditional_count = conditional_rows.len();
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
    let affiliate_offer = affiliate_offers.iter().find(|offer| {
        offer.entity_id == mount.id && is_publishable_affiliate_offer(offer, affiliate_now_seconds)
    });
    let affiliate_placeholder = affiliate_offer
        .map(|offer| affiliate_offer_placeholder_html(offer, 2))
        .unwrap_or_default();
    let market_search_href = market_mount_search_href(&mount.title);
    let market_search_fallback = if affiliate_offer.is_some() {
        format!(
            "<p class=\"mt-4 text-sm leading-relaxed text-muted\">Карточка недоступна в вашем регионе? <a class=\"font-semibold text-technical underline underline-offset-4\" data-market-link=\"search\" data-market-mount-search=\"true\" href=\"{href}\" rel=\"nofollow noopener noreferrer\" target=\"_blank\">Посмотреть другие предложения {title}</a></p>",
            href = escape_html(&market_search_href),
            title = escape_html(&mount.title),
        )
    } else {
        format!(
            "<aside class=\"border-2 border-ink bg-white p-5\" data-market-search-fallback=\"true\"><p class=\"font-mono text-xs uppercase tracking-[0.12em] text-action\">Поиск по точной модели</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">Найти {title} на Яндекс Маркете</h2><p class=\"mt-3 max-w-3xl text-sm leading-relaxed text-muted\">Откроется выдача только по названию этой модели. Перед покупкой сверьте маркировку, VESA, нагрузку и комплектацию с данными выше.</p><a class=\"mt-5 inline-flex min-h-12 items-center gap-2 border-2 border-ink bg-action px-5 py-3 font-display text-lg font-extrabold text-white shadow-[4px_4px_0_#111111]\" data-market-link=\"search\" data-market-mount-search=\"true\" href=\"{href}\" rel=\"nofollow noopener noreferrer\" target=\"_blank\">Открыть Яндекс Маркет <span aria-hidden=\"true\">↗</span></a></aside>",
            title = escape_html(&mount.title),
            href = escape_html(&market_search_href),
        )
    };
    let market_section = format!(
        "<section aria-label=\"Предложения Яндекс Маркета для {title}\" class=\"border-b-2 border-ink py-7\" data-market-mount-section=\"true\">{affiliate_placeholder}{market_search_fallback}</section>",
        title = escape_html(&mount.title),
    );
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
        "godoo" => Some(("/kronshteyny-godoo/", "Все кронштейны GoDoo")),
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
    let editorial_accountability = editorial_accountability_html("mount", &mount.checked_at);
    let technical_image = technical_image_html(
        &mount_technical_image_path(mount),
        &format!("Техническая схема кронштейна {}", mount.title),
        "Условная схема показывает тип механизма; размеры деталей и углы не являются монтажным чертежом.",
    );
    let technical_scheme = mount_technical_scheme_html(mount);
    let source_attributes = if mount.source_url.starts_with("https://market.yandex.ru/") {
        "data-market-source=\"identity\" rel=\"nofollow noopener noreferrer\" target=\"_blank\""
    } else {
        "rel=\"noreferrer\" target=\"_blank\""
    };
    let fit_summary = format!(
        "<section class=\"mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-3\" data-mount-fit-summary=\"true\" aria-label=\"Краткий итог совместимости\"><div class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-muted\">Поддерживаемые VESA</p><p class=\"mt-2 font-display text-3xl font-extrabold\">{vesa_count} {vesa_label}</p></div><div class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-muted\">Подтверждено</p><p class=\"mt-2 font-display text-3xl font-extrabold text-verified\">{verified_count} {verified_label}</p></div><div class=\"bg-paper p-5\"><p class=\"font-mono text-xs uppercase text-muted\">Нужна проверка диагонали</p><p class=\"mt-2 font-display text-3xl font-extrabold\">{conditional_count} {conditional_label}</p></div></section>",
        vesa_count = mount.vesa.len(),
        vesa_label = russian_plural_label(mount.vesa.len(), "схема", "схемы", "схем"),
        verified_label = russian_plural_label(verified_count, "модель", "модели", "моделей"),
        conditional_label = russian_plural_label(conditional_count, "модель", "модели", "моделей"),
    );

    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">Проверенный кронштейн</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">{title}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">Отдельная карточка изделия с явными парами VESA и двусторонним списком моделей телевизоров. Покупка не нужна для получения результата проверки.</p><dl class=\"mt-8 grid gap-4 border-y-2 border-ink py-6 sm:grid-cols-3\"><div><dt class=\"font-mono text-xs uppercase text-muted\">Механизм</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{mechanism}</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Нагрузка</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">до {load} кг</dd></div><div><dt class=\"font-mono text-xs uppercase text-muted\">Диагональ</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{min_diagonal}–{max_diagonal}″</dd></div></dl>{fit_summary}{commercial_section}{editorial_accountability}{technical_image}{market_section}<section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Поддерживаемые VESA</h2><p class=\"mt-3 font-mono text-sm leading-7\">{vesa}</p><p class=\"mt-4 text-muted\">Расстояние от стены: {distance}. Характеристики кронштейна проверены {checked_at}.</p><a class=\"mt-5 inline-flex font-semibold text-technical underline underline-offset-4\" href=\"{source}\" {source_attributes}>Источник характеристик: {source_label}</a></section><section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Подтверждённые популярные телевизоры</h2><p class=\"mt-3 max-w-3xl text-muted\">Показаны модели, которые проходят точную VESA, запас нагрузки и паспортный диапазон диагонали.</p><div class=\"mt-5\">{verified_rows}</div>{conditional_section}</section>{technical_scheme}{context_section}<section class=\"border-t border-line py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Перед монтажом</h2><p class=\"mt-3 text-lg leading-relaxed text-muted\">Отдельно проверьте винты телевизора, перекрытие портов, геометрию пластины, основание стены, анкеры и скрытые коммуникации.</p><a class=\"mt-5 inline-flex font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Методика проверки</a></section></article>",
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
        source_attributes = source_attributes,
        fit_summary = fit_summary,
        market_section = market_section,
        context_section = context_section,
        commercial_section = commercial_section,
        editorial_accountability = editorial_accountability,
        technical_image = technical_image,
        technical_scheme = technical_scheme,
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
            "mount-brand-godoo",
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
            "tv-wont-turn-on" => &[
                "tv-freezes",
                "tv-remote-not-working",
                "tv-turns-off",
                "tv-dark-screen",
                "tv-model-lookup",
                "tv-firmware-update",
            ],
            "tv-antenna-connect" => &[
                "digital-channels",
                "digital-box-connect",
                "tv-no-signal",
                "tv-model-lookup",
                "tv-aspect-ratio",
                "smart-tv-box",
            ],
            "tv-freezes" => &[
                "tv-wont-turn-on",
                "tv-factory-reset",
                "tv-firmware-update",
                "tv-app-install",
                "tv-remote-not-working",
                "tv-no-internet",
            ],
            "digital-box-connect" => &[
                "smart-tv-box",
                "tv-antenna-connect",
                "tv-no-signal",
                "digital-channels",
                "game-console-to-tv",
                "tv-aspect-ratio",
            ],
            "tv-dark-screen" => &[
                "tv-sound-no-picture",
                "picture-setup",
                "tv-aspect-ratio",
                "tv-no-signal",
                "tv-wont-turn-on",
                "screen-cleaning",
            ],
            "tv-storage-cleanup" => &[
                "tv-app-install",
                "tv-freezes",
                "tv-firmware-update",
                "tv-factory-reset",
                "tv-no-internet",
                "tv-model-lookup",
            ],
            "phone-tv-remote" => &[
                "tv-remote-not-working",
                "phone-to-tv",
                "tv-no-internet",
                "tv-model-lookup",
                "tv-app-install",
                "tv-no-signal",
            ],
            "game-console-to-tv" => &[
                "tv-no-signal",
                "picture-setup",
                "smart-tv-box",
                "tv-aspect-ratio",
                "soundbar-to-tv",
                "digital-box-connect",
            ],
            "tv-model-lookup" => &[
                "model-year-decoder",
                "tv-purchase-checklist",
                "vesa",
                "tv-mount-screws",
                "tv-firmware-update",
                "tv-app-install",
                "tv-wont-turn-on",
                "buy-tv-mount",
            ],
            "tv-aspect-ratio" => &[
                "tv-flicker",
                "picture-setup",
                "tv-dark-screen",
                "tv-no-signal",
                "game-console-to-tv",
                "tv-dimensions",
                "viewing-distance",
            ],
            "tv-internet-setup" => &[
                "smart-tv-setup",
                "tv-alice-connect",
                "tv-browser-install",
                "tv-no-internet",
                "tv-restart",
                "tv-app-install",
            ],
            "tv-alice-connect" => &[
                "tv-internet-setup",
                "smart-tv-setup",
                "smart-tv-box",
                "tv-bluetooth-setup",
                "tv-remote-not-working",
                "tv-app-install",
            ],
            "tv-restart" => &[
                "smart-tv-setup",
                "tv-internet-setup",
                "tv-factory-reset",
                "tv-freezes",
                "tv-firmware-update",
                "tv-wont-turn-on",
            ],
            "tv-bluetooth-setup" => &[
                "tv-headphones",
                "tv-speakers",
                "soundbar-to-tv",
                "smart-tv-setup",
                "tv-internet-setup",
                "tv-model-lookup",
            ],
            "smart-tv-setup" => &[
                "tv-internet-setup",
                "tv-alice-connect",
                "tv-browser-install",
                "tv-app-install",
                "tv-firmware-update",
                "tv-without-mount",
            ],
            "camera-to-tv" => &[
                "dvd-to-tv",
                "tv-no-signal",
                "hdmi-cable-checker",
                "smart-tv-setup",
                "tv-hdr-enable",
                "selection-choose",
            ],
            "dvd-to-tv" => &[
                "camera-to-tv",
                "tv-no-signal",
                "hdmi-cable-checker",
                "tv-aspect-ratio",
                "smart-tv-box",
                "smart-tv-setup",
            ],
            "tv-browser-install" => &[
                "smart-tv-setup",
                "tv-internet-setup",
                "tv-app-install",
                "tv-storage-cleanup",
                "tv-keyboard-mouse",
                "tv-youtube-recovery",
            ],
            "tv-without-mount" => &[
                "selection-choose",
                "wall-mounted-tv",
                "mobile-tv-stand",
                "vesa",
                "tv-mount-screws",
                "tv-installation-cost",
            ],
            "tv-hdr-enable" => &[
                "picture-setup",
                "tv-game-mode",
                "hdmi-cable-checker",
                "tv-no-signal",
                "smart-tv-setup",
                "camera-to-tv",
            ],
            "tv-firmware-update" => &[
                "tv-app-install",
                "tv-factory-reset",
                "tv-no-internet",
                "tv-turns-off",
                "tv-remote-not-working",
                "smart-tv-box",
            ],
            "tv-app-install" => &[
                "tv-storage-cleanup",
                "tv-no-internet",
                "tv-firmware-update",
                "smart-tv-box",
                "tv-factory-reset",
                "phone-to-tv",
            ],
            "tv-factory-reset" => &[
                "tv-firmware-update",
                "tv-app-install",
                "tv-turns-off",
                "tv-no-internet",
                "tv-remote-not-working",
                "picture-setup",
            ],
            "remove-tv-from-mount" => &[
                "ceiling-tv-mount",
                "tv-installation-cost",
                "tv-wall-fasteners",
                "wall-mounted-tv",
                "selection-choose",
                "mounting-map",
            ],
            "ceiling-tv-mount" => &[
                "tv-device-shelf",
                "mobile-tv-stand",
                "corner-tv-mount",
                "selection-choose",
                "mounting-height",
                "buy-tv-mount",
            ],
            "tv-device-shelf" => &[
                "tv-wall-fasteners",
                "soundbar-mount",
                "hide-tv-wires",
                "wires-cable-channel",
                "tv-wall-gap",
                "selection-choose",
            ],
            "tv-wall-fasteners" => &[
                "mobile-tv-stand",
                "tv-mount-screws",
                "wall-concrete-dowel",
                "wall-drywall-how",
                "wall-aerated-how",
                "selection-choose",
            ],
            "mobile-tv-stand" => &[
                "vesa-100x100",
                "ceiling-tv-mount",
                "selection-choose",
                "vesa",
                "tv-dimensions",
                "viewing-distance",
            ],
            "vesa-100x100" => &[
                "selection-choose",
                "tv-mount-screws",
                "how-to-find-vesa",
                "vesa",
                "mobile-tv-stand",
                "buy-tv-mount",
            ],
            "soundbar-mount" => &[
                "tv-device-shelf",
                "soundbar-to-tv",
                "tv-wall-gap",
                "hide-tv-wires",
                "wall-planner",
                "selection-choose",
            ],
            "corner-tv-mount" => &[
                "soundbar-mount",
                "tv-wall-gap",
                "full-motion-mount",
                "extendable-mount",
                "wall-planner",
                "selection-choose",
            ],
            "tv-wall-gap" => &[
                "corner-tv-mount",
                "tv-device-shelf",
                "fixed-mount",
                "full-motion-mount",
                "tv-zone-sockets",
                "selection-choose",
            ],
            "tv-installation-cost" => &[
                "remove-tv-from-mount",
                "tv-wall-gap",
                "tv-wall-fasteners",
                "mounting-map",
                "wall-drywall-how",
                "selection-choose",
            ],
            "tv-speakers" => &[
                "soundbar-to-tv",
                "tv-headphones",
                "tv-no-sound",
                "smart-tv-box",
                "picture-setup",
                "tv-no-signal",
            ],
            "tv-headphones" => &[
                "tv-speakers",
                "soundbar-to-tv",
                "tv-no-sound",
                "tv-no-internet",
                "smart-tv-box",
                "tv-remote-not-working",
            ],
            "tv-energy-consumption" => &[
                "tv-turns-off",
                "picture-setup",
                "tv-dimensions",
                "viewing-distance",
                "smart-tv-box",
                "screen-cleaning",
            ],
            "soundbar-to-tv" => &[
                "tv-speakers",
                "tv-no-sound",
                "tv-no-signal",
                "picture-setup",
                "tv-sound-no-picture",
                "smart-tv-box",
            ],
            "screen-cleaning" => &[
                "picture-setup",
                "tv-sound-no-picture",
                "tv-turns-off",
                "tv-no-sound",
                "wall-planner",
                "soundbar-to-tv",
            ],
            "smart-tv-box" => &[
                "digital-box-connect",
                "game-console-to-tv",
                "tv-no-signal",
                "tv-no-internet",
                "phone-to-tv",
                "digital-channels",
                "soundbar-to-tv",
            ],
            "tv-no-signal" => &[
                "hdmi-cable-checker",
                "tv-sound-no-picture",
                "digital-channels",
                "laptop-to-tv",
                "phone-to-tv",
                "tv-no-internet",
                "tv-turns-off",
            ],
            "tv-sound-no-picture" => &[
                "tv-no-signal",
                "picture-setup",
                "tv-no-sound",
                "tv-turns-off",
                "tv-remote-not-working",
                "laptop-to-tv",
            ],
            "tv-no-sound" => &[
                "tv-speakers",
                "tv-headphones",
                "soundbar-to-tv",
                "tv-sound-no-picture",
                "tv-no-signal",
                "tv-remote-not-working",
                "tv-turns-off",
            ],
            "tv-remote-not-working" => &[
                "phone-tv-remote",
                "tv-no-sound",
                "tv-sound-no-picture",
                "tv-no-signal",
                "tv-turns-off",
                "digital-channels",
            ],
            "tv-turns-off" => &[
                "tv-energy-consumption",
                "tv-no-internet",
                "tv-no-signal",
                "tv-sound-no-picture",
                "tv-no-sound",
                "picture-setup",
            ],
            "tv-no-internet" => &[
                "tv-usb-not-seen",
                "digital-channels",
                "tv-no-signal",
                "phone-to-tv",
                "laptop-to-tv",
                "smart-tv-box",
                "tv-turns-off",
            ],
            "tv-usb-not-seen" => &[
                "tv-no-internet",
                "tv-no-signal",
                "laptop-to-tv",
                "phone-to-tv",
                "tv-remote-not-working",
                "digital-channels",
            ],
            "phone-to-tv" => &[
                "laptop-to-tv",
                "tv-no-signal",
                "tv-no-internet",
                "tv-usb-not-seen",
                "smart-tv-box",
                "picture-setup",
                "tv-dimensions",
            ],
            "laptop-to-tv" => &[
                "tv-no-signal",
                "phone-to-tv",
                "tv-no-internet",
                "tv-usb-not-seen",
                "picture-setup",
                "digital-channels",
            ],
            "digital-channels" => &[
                "tv-antenna-connect",
                "digital-box-connect",
                "tv-no-signal",
                "tv-no-internet",
                "picture-setup",
                "laptop-to-tv",
                "phone-to-tv",
            ],
            "picture-setup" => &[
                "tv-flicker",
                "dead-pixel-test",
                "tv-game-mode",
                "tv-energy-consumption",
                "screen-cleaning",
                "tv-aspect-ratio",
                "tv-dark-screen",
                "viewing-distance",
                "tv-dimensions",
                "wall-planner",
                "tv-no-signal",
            ],
            "wall-mounted-tv" => &[
                "selection-choose",
                "wall-drywall-how",
                "wall-concrete-dowel",
                "wall-aerated-how",
                "wall-planner",
                "mounting-map",
                "tv-zone-sockets",
                "vesa",
                "full-motion-mount",
                "mounting-height",
                "viewing-distance",
            ],
            "wall-planner" => &[
                "tv-dimensions",
                "mounting-height",
                "mounting-map",
                "tv-zone-sockets",
                "viewing-distance",
                "wall-mounted-tv",
            ],
            "tv-youtube-recovery" => &[
                "tv-keyboard-mouse",
                "tv-no-internet",
                "tv-app-install",
                "tv-storage-cleanup",
                "tv-firmware-update",
                "phone-to-tv",
                "tv-factory-reset",
            ],
            "tv-flicker" => &[
                "picture-setup",
                "dead-pixel-test",
                "tv-dark-screen",
                "tv-aspect-ratio",
                "tv-sound-no-picture",
                "tv-firmware-update",
            ],
            "tv-disable-subtitles" => &[
                "tv-disable-voice",
                "tv-aspect-ratio",
                "digital-channels",
                "smart-tv-box",
                "tv-model-lookup",
                "tv-app-install",
            ],
            "tv-disable-voice" => &[
                "tv-disable-subtitles",
                "tv-remote-not-working",
                "tv-model-lookup",
                "tv-app-install",
                "tv-no-sound",
                "phone-tv-remote",
            ],
            "tv-keyboard-mouse" => &[
                "tv-youtube-recovery",
                "tv-microphone",
                "phone-tv-remote",
                "tv-remote-not-working",
                "tv-app-install",
                "smart-tv-box",
                "tv-no-internet",
                "tv-model-lookup",
            ],
            "tv-microphone" => &[
                "tv-keyboard-mouse",
                "tv-speakers",
                "soundbar-to-tv",
                "tv-no-sound",
                "tv-headphones",
                "smart-tv-box",
                "tv-model-lookup",
            ],
            "hide-tv-wires" => &[
                "wires-cable-channel",
                "wall-planner",
                "mounting-map",
                "tv-zone-sockets",
                "wall-mounted-tv",
                "full-motion-mount",
                "mounting-height",
            ],
            "dead-pixel-test" => &[
                "tv-purchase-checklist",
                "tv-flicker",
                "picture-setup",
                "screen-cleaning",
                "tv-dark-screen",
                "tv-aspect-ratio",
            ],
            "tv-purchase-checklist" => &[
                "dead-pixel-test",
                "hide-tv-wires",
                "tv-model-lookup",
                "vesa",
                "tv-mount-screws",
                "tv-dimensions",
                "wall-planner",
            ],
            "tv-game-mode" => &[
                "game-console-to-tv",
                "picture-setup",
                "tv-aspect-ratio",
                "tv-no-signal",
                "soundbar-to-tv",
                "tv-flicker",
            ],
            "tv-dimensions" => &[
                "diagonal-85",
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
                "vesa-size",
                "vesa-600x400",
                "tv-model-lookup",
                "tv-mount-screws",
                "wall-mounted-tv",
                "how-to-find-vesa",
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
        "tv-firmware-update" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-utility-answer="tv-firmware-update" data-tv-utility-task="tv-firmware-update">
<p class="font-mono text-xs uppercase text-action">Бренд → точная модель → официальный способ</p>
<h2 class="mt-2 font-display text-3xl font-extrabold">Выберите встроенное обновление или файл строго для своей модели</h2>
<p class="mt-3 max-w-4xl leading-relaxed text-muted">Начните со штатного обновления по сети, если оно доступно для точной модели. USB-путь допустим только по официальной инструкции производителя и с файлом, найденным по полному коду телевизора.</p>
<div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3">
<article class="bg-paper p-5" data-tv-utility-branch="network"><p class="font-mono text-xs uppercase text-action">Штатное обновление по сети</p><h3 class="mt-2 font-display text-2xl font-extrabold">Проверьте обновление в меню</h3><p class="mt-3 text-sm leading-relaxed text-muted">Подключите телевизор к устойчивой сети и откройте раздел обновления ПО по инструкции своего бренда и серии. Названия меню и необходимость аккаунта могут отличаться.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="official-usb"><p class="font-mono text-xs uppercase text-action">Официальный USB-путь</p><h3 class="mt-2 font-display text-2xl font-extrabold">Полный код модели обязателен</h3><p class="mt-3 text-sm leading-relaxed text-muted">Найдите точную модель на наклейке или в меню, затем скачайте файл только с её страницы поддержки. Не переносите прошивку с похожей серии и не используйте сторонний архив.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="unknown-or-running"><p class="font-mono text-xs uppercase text-action">Модель неизвестна или процесс идёт</p><h3 class="mt-2 font-display text-2xl font-extrabold">Не продолжайте наугад</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если точная модель, источник файла или инструкция не подтверждены, остановитесь. Если установка уже началась, дождитесь штатного завершения и ничего не отключайте.</p></article>
</div>
<p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-utility-stop="true">Во время уже запущенного обновления не выключайте телевизор, не отключайте питание и не извлекайте USB. Не устанавливайте файл от другой модели и не входите в сервисное меню.</p>
<p class="mt-6 text-sm leading-relaxed text-muted" data-tv-utility-next="tv-app-install">Обновление завершено, а нужно добавить сервис? Перейдите к <a class="font-semibold text-action underline underline-offset-4" href="/kak-ustanovit-prilozhenie-na-televizor/">мастеру установки приложений</a>.</p>
<details class="mt-7 border border-line bg-white p-4"><summary class="cursor-pointer font-display font-bold">Официальные инструкции производителей</summary><nav class="mt-4 grid gap-3 text-sm font-semibold sm:grid-cols-2" aria-label="Официальные источники обновления телевизоров"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/how-can-i-update-the-samsung-tv-firmware-through-the-internet/" rel="noreferrer" target="_blank" data-tv-utility-source="samsung-tv-update-online">Samsung: обновление по сети</a><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/how-can-i-update-the-samsung-tv-firmware-using-a-usb-memory-stick/" rel="noreferrer" target="_blank" data-tv-utility-source="samsung-tv-update-usb">Samsung: обновление через USB</a><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/where-can-i-download-a-firmware-for-my-samsung-tv/" rel="noreferrer" target="_blank" data-tv-utility-source="samsung-tv-firmware-model">Samsung: файл по модели</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20153413220386OLT" rel="noreferrer" target="_blank" data-tv-utility-source="lg-tv-update">LG: обновление телевизора</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00119543" rel="noreferrer" target="_blank" data-tv-utility-source="sony-tv-update">Sony: обновление ПО</a><a class="text-technical underline underline-offset-4" href="https://alice.yandex.ru/support/ru/tv/settings/update-firmware" rel="noreferrer" target="_blank" data-tv-utility-source="yaos-tv-update">YaOS: обновление прошивки</a></nav></details>
</section>"#
        }
        "tv-app-install" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-utility-answer="tv-app-install" data-tv-utility-task="tv-app-install">
<p class="font-mono text-xs uppercase text-action">Платформа → официальный магазин → доступность</p>
<h2 class="mt-2 font-display text-3xl font-extrabold">Устанавливайте приложение через магазин своей платформы</h2>
<p class="mt-3 max-w-4xl leading-relaxed text-muted">Tizen, webOS, Android или Google TV и YaOS используют разные каталоги. Сначала определите платформу точной модели, затем ищите приложение в официальном магазине — его наличие зависит от модели, версии системы и региона.</p>
<div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3">
<article class="bg-paper p-5" data-tv-utility-branch="official-store"><p class="font-mono text-xs uppercase text-action">Приложение есть в магазине</p><h3 class="mt-2 font-display text-2xl font-extrabold">Следуйте шагам своей платформы</h3><p class="mt-3 text-sm leading-relaxed text-muted">Подключите сеть, войдите в требуемый аккаунт, откройте официальный магазин и установите найденную версию для телевизора. Названия разделов различаются по брендам.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="not-found"><p class="font-mono text-xs uppercase text-action">Приложение не находится</p><h3 class="mt-2 font-display text-2xl font-extrabold">Проверьте модель и регион</h3><p class="mt-3 text-sm leading-relaxed text-muted">Уточните полный код телевизора, платформу, версию системы, регион аккаунта и наличие свободного места. Не обещайте доступность сервиса только потому, что он есть на телефоне.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="apk-or-unknown"><p class="font-mono text-xs uppercase text-action">Предлагают APK или платформа неизвестна</p><h3 class="mt-2 font-display text-2xl font-extrabold">Остановитесь до подтверждения</h3><p class="mt-3 text-sm leading-relaxed text-muted">APK не работает на Tizen, webOS или YaOS и не является универсальным путём даже для Android TV. Сначала подтвердите платформу и официальный источник.</p></article>
</div>
<p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-utility-stop="true">Не скачивайте приложение из случайного архива и не вводите на сайте KREPI TV пароль от телевизора или аккаунта. Если магазина нет или платформа неизвестна, мастер не придумывает обходной путь.</p>
<p class="mt-6 text-sm leading-relaxed text-muted" data-tv-utility-next="tv-no-internet">Магазин не открывается из-за сети? Продолжите с <a class="font-semibold text-action underline underline-offset-4" href="/televizor-ne-podklyuchaetsya-k-internetu/">мастером подключения телевизора к интернету</a>.</p>
<details class="mt-7 border border-line bg-white p-4"><summary class="cursor-pointer font-display font-bold">Официальные инструкции платформ</summary><nav class="mt-4 grid gap-3 text-sm font-semibold sm:grid-cols-2" aria-label="Официальные источники установки приложений"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/how-to-install-an-app-on-samsung-tv/" rel="noreferrer" target="_blank" data-tv-utility-source="samsung-tv-app-install">Samsung: установка приложения</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20155331408377" rel="noreferrer" target="_blank" data-tv-utility-source="lg-tv-app-install">LG: приложения webOS</a><a class="text-technical underline underline-offset-4" href="https://support.google.com/googletv/answer/10050570?hl=ru" rel="noreferrer" target="_blank" data-tv-utility-source="google-tv-app-install">Google TV: приложения</a><a class="text-technical underline underline-offset-4" href="https://alice.yandex.ru/support/ru/tv/apps/tv-yndx" rel="noreferrer" target="_blank" data-tv-utility-source="yaos-tv-apps">YaOS: приложения на ТВ</a></nav></details>
</section>"#
        }
        "tv-factory-reset" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-utility-answer="tv-factory-reset" data-tv-utility-task="tv-factory-reset">
<p class="font-mono text-xs uppercase text-action">Причина → последствия → явное подтверждение</p>
<h2 class="mt-2 font-display text-3xl font-extrabold">Сначала отделите перезагрузку от полного удаления настроек</h2>
<p class="mt-3 max-w-4xl leading-relaxed text-muted">Для временного сбоя обычно достаточно штатной перезагрузки. Заводской сброс стирает пользовательские настройки и требует повторной настройки, поэтому его выполняют только осознанно и по инструкции точной модели.</p>
<div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3">
<article class="bg-paper p-5" data-tv-utility-branch="restart-only"><p class="font-mono text-xs uppercase text-action">Нужно только перезапустить</p><h3 class="mt-2 font-display text-2xl font-extrabold">Не стирайте настройки</h3><p class="mt-3 text-sm leading-relaxed text-muted">Используйте обычную штатную перезагрузку по руководству модели. Она не равна заводскому сбросу и не должна удалять аккаунты, сеть и пользовательские параметры.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="ready-to-erase"><p class="font-mono text-xs uppercase text-action">Сброс действительно нужен</p><h3 class="mt-2 font-display text-2xl font-extrabold">Проверьте, что будет удалено</h3><p class="mt-3 text-sm leading-relaxed text-muted">Сохраните нужные сведения, выйдите из аккаунтов при передаче устройства и подтвердите готовность заново настроить сеть, каналы, приложения и изображение.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="unsafe-or-no-menu"><p class="font-mono text-xs uppercase text-action">Обновление идёт или меню недоступно</p><h3 class="mt-2 font-display text-2xl font-extrabold">Не используйте сервисные комбинации</h3><p class="mt-3 text-sm leading-relaxed text-muted">Не сбрасывайте телевизор во время обновления и не вводите универсальные коды из сторонних инструкций. Зафиксируйте точную модель и обратитесь к официальной поддержке.</p></article>
</div>
<p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-utility-stop="true">Заводской сброс удаляет пользовательские данные и настройки. Не продолжайте без явной готовности к удалению, при выполняющемся обновлении, нестабильном питании или отсутствии официального пути для точной модели.</p>
<p class="mt-6 text-sm leading-relaxed text-muted" data-tv-utility-next="tv-firmware-update">Если проблема связана с устаревшим ПО, сначала проверьте <a class="font-semibold text-action underline underline-offset-4" href="/kak-obnovit-televizor/">официальный путь обновления телевизора</a>, не используя сброс как универсальный первый шаг.</p>
<details class="mt-7 border border-line bg-white p-4"><summary class="cursor-pointer font-display font-bold">Официальные инструкции по сбросу</summary><nav class="mt-4 grid gap-3 text-sm font-semibold sm:grid-cols-2" aria-label="Официальные источники сброса телевизоров"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/how-do-i-reset-settings-on-my-samsung-tv/" rel="noreferrer" target="_blank" data-tv-utility-source="samsung-tv-reset">Samsung: сброс настроек</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20154159901753" rel="noreferrer" target="_blank" data-tv-utility-source="lg-tv-reset">LG: заводские настройки</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00262856" rel="noreferrer" target="_blank" data-tv-utility-source="sony-tv-reset">Sony: сброс телевизора</a><a class="text-technical underline underline-offset-4" href="https://alice.yandex.ru/support/ru/tv/settings/reset-settings" rel="noreferrer" target="_blank" data-tv-utility-source="yaos-tv-reset">YaOS: сброс настроек</a></nav></details>
</section>"#
        }
        "tv-speakers" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-utility-answer="tv-speakers" data-tv-utility-task="tv-speakers">
<p class="font-mono text-xs uppercase text-action">Тип акустики → выход ТВ → совпадающий вход</p>
<h2 class="mt-2 font-display text-3xl font-extrabold">Сначала определите, активные ли у вас колонки</h2>
<p class="mt-3 max-w-4xl leading-relaxed text-muted">Телевизор передаёт звуковой сигнал через предусмотренный аудиовыход. Активной акустике или усилителю нужен совместимый вход; пассивные колонки без собственного усилителя нельзя подключать прямо к телевизору.</p>
<div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3">
<article class="bg-paper p-5" data-tv-utility-branch="matching-wired"><p class="font-mono text-xs uppercase text-action">Активная система · провод</p><h3 class="mt-2 font-display text-2xl font-extrabold">Выход должен совпасть со входом</h3><p class="mt-3 text-sm leading-relaxed text-muted">Сверьте подписи у доступного выхода телевизора и входа акустики: например, оптический выход соединяют только с оптическим входом. Затем выберите этот аудиовыход по инструкции точной модели.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="passive-speakers"><p class="font-mono text-xs uppercase text-action">Пассивные колонки</p><h3 class="mt-2 font-display text-2xl font-extrabold">Нужен отдельный усилитель</h3><p class="mt-3 text-sm leading-relaxed text-muted">Клеммы пассивной колонки не являются входом телевизора. Маршрут проходит через совместимый усилитель или ресивер; его вход, нагрузку и подключение колонок проверяют по руководствам всей системы.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="wireless-or-unknown"><p class="font-mono text-xs uppercase text-action">Bluetooth или неизвестный разъём</p><h3 class="mt-2 font-display text-2xl font-extrabold">Функцию подтверждают по модели</h3><p class="mt-3 text-sm leading-relaxed text-muted">Наличие Bluetooth для пульта не доказывает передачу звука. Беспроводной путь допустим только при явно поддерживаемом Bluetooth audio у телевизора и принимающей системы; неизвестный разъём не соединяют переходником наугад.</p></article>
</div>
<p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-utility-stop="true">Не подключайте пассивные колонки к аудиоразъёму телевизора напрямую. Остановитесь при повреждённом, горячем, болтающемся или мокром соединении и если доступ к порту требует снять либо сдвинуть настенный телевизор.</p>
<p class="mt-6 text-sm leading-relaxed text-muted" data-tv-utility-next="tv-no-sound">Путь и аудиовыход подтверждены, но звука нет? Продолжите с <a class="font-semibold text-action underline underline-offset-4" href="/net-zvuka-na-televizore/">мастером проверки звука</a>.</p>
<nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники подключения колонок"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/how-to-connect-external-audio-using-an-optical-cable/" rel="noreferrer" target="_blank" data-tv-utility-source="samsung-tv-optical-audio">Samsung: оптический аудиовыход</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00023605" rel="noreferrer" target="_blank" data-tv-utility-source="sony-tv-wireless-audio">Sony: беспроводная аудиосистема</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00135146" rel="noreferrer" target="_blank" data-tv-utility-source="sony-tv-bluetooth-audio">Sony: Bluetooth audio и A2DP</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20154713273543" rel="noreferrer" target="_blank" data-tv-utility-source="lg-tv-audio-output">LG: выбор аудиовыхода</a></nav>
</section>"#
        }
        "tv-headphones" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-utility-answer="tv-headphones" data-tv-utility-task="tv-headphones">
<p class="font-mono text-xs uppercase text-action">Тип наушников → функция ТВ → безопасная громкость</p>
<h2 class="mt-2 font-display text-3xl font-extrabold">Проверьте аудиовыход, а не только форму подключения</h2>
<p class="mt-3 max-w-4xl leading-relaxed text-muted">Проводные наушники требуют предусмотренного аналогового выхода, а Bluetooth-наушники — подтверждённой поддержки Bluetooth audio у точной модели телевизора. Bluetooth, используемый только пультом, не подтверждает профиль A2DP.</p>
<div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3">
<article class="bg-paper p-5" data-tv-utility-branch="confirmed-bluetooth-audio"><p class="font-mono text-xs uppercase text-action">Bluetooth audio подтверждён</p><h3 class="mt-2 font-display text-2xl font-extrabold">Сопрягайте по двум инструкциям</h3><p class="mt-3 text-sm leading-relaxed text-muted">Убедитесь, что наушники не подключены к другому устройству, переведите их в режим сопряжения и откройте список Bluetooth-аудиоустройств телевизора. Название меню зависит от модели.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="confirmed-wired-output"><p class="font-mono text-xs uppercase text-action">Проводной выход подтверждён</p><h3 class="mt-2 font-display text-2xl font-extrabold">Совпадающий штекер и низкая громкость</h3><p class="mt-3 text-sm leading-relaxed text-muted">Подключайте только к обозначенному выходу наушников или совместимому аналоговому аудиовыходу, разрешённому руководством. Перед проверкой уменьшите громкость и повышайте её постепенно.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="unsupported-or-unknown"><p class="font-mono text-xs uppercase text-action">Функция не подтверждена</p><h3 class="mt-2 font-display text-2xl font-extrabold">Не покупайте переходник по названию порта</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если телевизор не подтверждает Bluetooth audio или аудиовыход, зафиксируйте точную модель и доступные подписи. Внешний передатчик возможен лишь при совместимом выходе ТВ и собственной инструкции, а не из-за общего слова Bluetooth.</p></article>
</div>
<p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-utility-stop="true">Не используйте повреждённые или мокрые разъёмы и кабели, не тянитесь за настенный телевизор и не начинайте проверку на высокой громкости. При боли, звоне или резком дискомфорте прекратите прослушивание.</p>
<p class="mt-6 text-sm leading-relaxed text-muted" data-tv-utility-next="tv-no-sound">Наушники сопряжены или подключены, но звук не появился? Откройте <a class="font-semibold text-action underline underline-offset-4" href="/net-zvuka-na-televizore/">мастер проверки аудиовыхода</a>.</p>
<nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники подключения наушников"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/how-to-connect-bluetooth-headphones-to-a-samsung-tv/" rel="noreferrer" target="_blank" data-tv-utility-source="samsung-tv-bluetooth-headphones">Samsung: Bluetooth-наушники</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00135146" rel="noreferrer" target="_blank" data-tv-utility-source="sony-tv-bluetooth-audio">Sony: Bluetooth audio и A2DP</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00023605" rel="noreferrer" target="_blank" data-tv-utility-source="sony-tv-wireless-audio">Sony: беспроводные наушники</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20155333324133" rel="noreferrer" target="_blank" data-tv-utility-source="lg-tv-bluetooth-audio">LG: Bluetooth-аудиоустройство</a></nav>
</section>"#
        }
        "tv-energy-consumption" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-energy-calculator="true" data-tv-energy-answer="tv-energy-consumption">
<p class="font-mono text-xs uppercase text-action">Мощность модели × фактическое время работы</p>
<h2 class="mt-2 font-display text-3xl font-extrabold">Как посчитать расход телевизора без среднего значения</h2>
<p class="mt-3 max-w-4xl leading-relaxed text-muted">Возьмите мощность активного режима и, если она указана, мощность ожидания из паспорта, спецификации или энергетической карточки точной модели. Яркость, HDR, режим изображения и подключённые устройства могут изменить фактическое потребление.</p>
<div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3">
<article class="bg-paper p-5" data-tv-energy-step="active-power"><p class="font-mono text-xs uppercase text-action">1 · Активный режим</p><h3 class="mt-2 font-display text-2xl font-extrabold">Введите паспортные ватты</h3><p class="mt-3 text-sm leading-relaxed text-muted">Не подменяйте мощность своей модели средним значением по диагонали. Если документ раздельно показывает SDR и HDR, считайте выбранный сценарий отдельно.</p></article>
<article class="bg-paper p-5" data-tv-energy-step="usage-time"><p class="font-mono text-xs uppercase text-action">2 · Время работы</p><h3 class="mt-2 font-display text-2xl font-extrabold">Укажите часы в сутки</h3><p class="mt-3 text-sm leading-relaxed text-muted">Суточный расход зависит от реального времени просмотра. Месячный и годовой результат являются расчётной проекцией при неизменном режиме использования.</p></article>
<article class="bg-paper p-5" data-tv-energy-step="standby"><p class="font-mono text-xs uppercase text-action">3 · Режим ожидания</p><h3 class="mt-2 font-display text-2xl font-extrabold">Добавьте standby отдельно</h3><p class="mt-3 text-sm leading-relaxed text-muted">Используйте только значение ожидания из документа точной модели. Время ожидания не должно пересекаться с часами активной работы.</p></article>
</div>
<div class="mt-6 border-l-2 border-action pl-4" data-tv-energy-formula="true"><p class="font-display text-xl font-extrabold">кВт·ч = Вт × часы / 1000; месяц = 30 дней; год = 365 дней</p><p class="mt-2 text-sm leading-relaxed text-muted">Тариф по умолчанию отсутствует: сервис его не угадывает. Ответы и числа остаются в браузере; свободный ввод и отправка данных отсутствуют.</p></div>
<p class="mt-6 text-sm leading-relaxed text-muted" data-tv-energy-next="picture-setup">Хотите сравнить режимы просмотра? Сначала зафиксируйте исходные настройки, затем меняйте один параметр в <a class="font-semibold text-action underline underline-offset-4" href="/nastroyka-izobrazheniya-televizora/">мастере изображения</a>.</p>
<nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники энергопотребления телевизоров"><a class="text-technical underline underline-offset-4" href="https://images.samsung.com/is/content/samsung/p6/common/energylabel/common-energylabel-ue65ru7022kxxh-productfiche.pdf" rel="noreferrer" target="_blank" data-tv-utility-source="samsung-tv-energy-fiche">Samsung: энергетическая карточка модели</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/televisions/lg-55EC930V-oled-televisions" rel="noreferrer" target="_blank" data-tv-utility-source="lg-tv-energy-spec">LG: спецификация мощности модели</a></nav>
</section>"#
        }
        "soundbar-to-tv" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-utility-answer="soundbar-to-tv" data-tv-utility-task="soundbar-to-tv">
<p class="font-mono text-xs uppercase text-action">Подписи портов → один путь подключения</p>
<h2 class="mt-2 font-display text-3xl font-extrabold">Сопоставьте выход телевизора и вход саундбара</h2>
<p class="mt-3 max-w-4xl leading-relaxed text-muted">Смотрите на подписи у реально доступных разъёмов обоих устройств. Обычный HDMI без подписи ARC или eARC не подтверждает возврат звука, а названия аудиовыхода и управления берут из руководств точных моделей.</p>
<div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3">
<article class="bg-paper p-5" data-tv-utility-branch="labelled-arc"><p class="font-mono text-xs uppercase text-action">ARC/eARC есть на обоих</p><h3 class="mt-2 font-display text-2xl font-extrabold">Соедините подписанные порты</h3><p class="mt-3 text-sm leading-relaxed text-muted">Подключите соответствующие ARC/eARC-разъёмы и выберите внешний аудиовыход по инструкциям телевизора и саундбара. Не переносите название настройки с другой модели.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="matching-wired"><p class="font-mono text-xs uppercase text-action">Совпадает оптика или аналог</p><h3 class="mt-2 font-display text-2xl font-extrabold">Выход → такой же вход</h3><p class="mt-3 text-sm leading-relaxed text-muted">Используйте только явно совпадающую пару. Отдельно выберите нужный вход саундбара и выход телевизора; этот путь не обещает функции ARC/eARC или управление одним пультом.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="bluetooth-or-unknown"><p class="font-mono text-xs uppercase text-action">Bluetooth или подписи не совпали</p><h3 class="mt-2 font-display text-2xl font-extrabold">Сначала точные модели</h3><p class="mt-3 text-sm leading-relaxed text-muted">Bluetooth применим только при явной поддержке обоими устройствами и может иметь задержку или ограничения. При неизвестных либо несовпадающих подписях не выбирайте кабель или переходник наугад.</p></article>
</div>
<p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-utility-stop="true">Остановитесь, если порт нельзя достать без снятия или сдвига настенного телевизора, соединение повреждено, горячее, болтается или намокло. Не открывайте устройства и не выполняйте электрические измерения.</p>
<p class="mt-6 text-sm leading-relaxed text-muted" data-tv-utility-next="tv-no-sound">Соединение подтверждено, но звука нет? Продолжите с <a class="font-semibold text-action underline underline-offset-4" href="/net-zvuka-na-televizore/">мастером проверки звука</a>, не меняя несколько настроек одновременно.</p>
<nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники подключения саундбара"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/how-to-use-hdmi-arc-on-samsung-smart-tv/" rel="noreferrer" target="_blank" data-tv-utility-source="samsung-tv-soundbar-arc">Samsung: HDMI ARC</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00014997" rel="noreferrer" target="_blank" data-tv-utility-source="sony-tv-soundbar-connect">Sony: подключение саундбара</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20153413206539OLT" rel="noreferrer" target="_blank" data-tv-utility-source="lg-tv-soundbar-connect">LG: способы подключения</a></nav>
</section>"#
        }
        "screen-cleaning" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-utility-answer="screen-cleaning" data-tv-utility-task="screen-cleaning">
<p class="font-mono text-xs uppercase text-action">След на экране → наименее агрессивный шаг</p>
<h2 class="mt-2 font-display text-3xl font-extrabold">Начните с сухой мягкой микрофибры</h2>
<p class="mt-3 max-w-4xl leading-relaxed text-muted">Телевизор должен быть выключен и остыть. Вилку отсоединяют только при безопасном доступе; чистящую жидкость не распыляют прямо на экран и не дают ей стекать к рамке или отверстиям.</p>
<div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3">
<article class="bg-paper p-5" data-tv-utility-branch="dry-dust"><p class="font-mono text-xs uppercase text-action">Пыль</p><h3 class="mt-2 font-display text-2xl font-extrabold">Сухая микрофибра</h3><p class="mt-3 text-sm leading-relaxed text-muted">Чистой мягкой салфеткой без давления аккуратно соберите пыль. Не используйте абразивный материал и не надавливайте на поверхность матрицы.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="fingerprints"><p class="font-mono text-xs uppercase text-action">Отпечатки</p><h3 class="mt-2 font-display text-2xl font-extrabold">Сначала тот же сухой способ</h3><p class="mt-3 text-sm leading-relaxed text-muted">Попробуйте чистую сухую микрофибру. Влажную ткань или состав применяйте только тогда, когда такой шаг прямо разрешён руководством точной модели.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="stubborn-or-unknown"><p class="font-mono text-xs uppercase text-action">Стойкое или неизвестное пятно</p><h3 class="mt-2 font-display text-2xl font-extrabold">Не усиливайте воздействие</h3><p class="mt-3 text-sm leading-relaxed text-muted">Не соскабливайте след, не увеличивайте давление и не пробуйте неподтверждённую химию. Найдите инструкцию конкретного телевизора или обратитесь в официальную поддержку.</p></article>
</div>
<p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-utility-stop="true">Не продолжайте очистку при трещине, отслоении, жидкости внутри, а также если телевизор не выключен или не остыл. Не касайтесь горячих, повреждённых или мокрых вилки, кабеля и розетки и не двигайте настенный телевизор ради доступа.</p>
<p class="mt-6 text-sm leading-relaxed text-muted" data-tv-utility-next="picture-setup">Экран чистый, но изображение остаётся слишком тёмным или неестественным? Перейдите к <a class="font-semibold text-action underline underline-offset-4" href="/nastroyka-izobrazheniya-televizora/">мастеру настройки изображения</a>.</p>
<nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники очистки экрана"><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20154713246835" rel="noreferrer" target="_blank" data-tv-utility-source="lg-tv-screen-cleaning">LG: очистка экрана</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00167099" rel="noreferrer" target="_blank" data-tv-utility-source="sony-tv-screen-cleaning">Sony: очистка телевизора</a></nav>
</section>"#
        }
        "smart-tv-box" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-utility-answer="smart-tv-box" data-tv-utility-task="smart-tv-box">
<p class="font-mono text-xs uppercase text-action">Выход приставки → вход телевизора</p>
<h2 class="mt-2 font-display text-3xl font-extrabold">Сначала подтвердите видеосоединение</h2>
<p class="mt-3 max-w-4xl leading-relaxed text-muted">У подключения четыре независимых этапа: видео, штатное питание, сеть и аккаунт, сопряжение пульта. Успех одного этапа не подтверждает остальные, а общее предположение о питании приставки от USB не заменяет её инструкцию.</p>
<div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3">
<article class="bg-paper p-5" data-tv-utility-branch="confirmed-hdmi"><p class="font-mono text-xs uppercase text-action">HDMI подтверждён</p><h3 class="mt-2 font-display text-2xl font-extrabold">Подключите и выберите вход</h3><p class="mt-3 text-sm leading-relaxed text-muted">Соедините HDMI-выход приставки со свободным HDMI-входом телевизора, подайте питание комплектным способом и выберите именно номер подключённого входа.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="confirmed-composite"><p class="font-mono text-xs uppercase text-action">Композитный AV подтверждён</p><h3 class="mt-2 font-display text-2xl font-extrabold">Только по двум инструкциям</h3><p class="mt-3 text-sm leading-relaxed text-muted">Используйте этот путь лишь при явной совместимости выхода приставки и входа телевизора в руководствах точных моделей. Похожий разъём не доказывает совместимость.</p></article>
<article class="bg-paper p-5" data-tv-utility-branch="mismatch-or-converter"><p class="font-mono text-xs uppercase text-action">Совпадения нет или нужен переходник</p><h3 class="mt-2 font-display text-2xl font-extrabold">Остановитесь до подключения</h3><p class="mt-3 text-sm leading-relaxed text-muted">Не назначайте пассивный переходник или конвертер без прямой поддержки точной пары устройств. Зафиксируйте названия выходов и входов и сверьте официальные инструкции.</p></article>
</div>
<p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-utility-stop="true">Не снимайте и не сдвигайте настенный телевизор ради недоступного порта. Не продолжайте при повреждённых, горячих, болтающихся или мокрых кабеле, вилке либо розетке; не открывайте устройства и не выполняйте электрические измерения.</p>
<p class="mt-6 text-sm leading-relaxed text-muted" data-tv-utility-next="tv-no-signal">Приставка включена штатно, но изображения нет? Продолжите с <a class="font-semibold text-action underline underline-offset-4" href="/televizor-pishet-net-signala/">мастером «Нет сигнала»</a>.</p>
<nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники подключения приставки"><a class="text-technical underline underline-offset-4" href="https://support.google.com/googletv/answer/10050221?hl=ru" rel="noreferrer" target="_blank" data-tv-utility-source="google-tv-device-setup">Google: настройка устройства</a><a class="text-technical underline underline-offset-4" href="https://www.mi.com/ru/support/article/KA-15498/" rel="noreferrer" target="_blank" data-tv-utility-source="xiaomi-mi-box-compatibility">Xiaomi: совместимость приставки</a><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/no-signal-while-connect-devices-through-hdmi/" rel="noreferrer" target="_blank" data-tv-utility-source="samsung-tv-external-hdmi">Samsung: внешний HDMI-источник</a></nav>
</section>"#
        }
        "tv-sound-no-picture" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-diagnostic-answer="tv-sound-no-picture" data-tv-diagnostic-task="tv-sound-no-picture"><p class="font-mono text-xs uppercase text-action">Наблюдение → следующая проверка</p><h2 class="mt-2 font-display text-3xl font-extrabold">Отделите экран телевизора от выбранного источника</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Используйте только собственное меню, индикатор громкости и поддерживаемый встроенный тест телевизора. Эти наблюдения выбирают следующий безопасный шаг, но не устанавливают причину и не заменяют проверку точной модели.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-diagnostic-branch="own-interface-visible"><p class="font-mono text-xs uppercase text-action">Меню или громкость видны</p><h3 class="mt-2 font-display text-2xl font-extrabold">Проверьте текущий источник</h3><p class="mt-3 text-sm leading-relaxed text-muted">Сопоставьте выбранный вход с подключённым устройством. Если экран показывает «Нет сигнала», перейдите к <a class="font-semibold text-action underline underline-offset-4" href="/televizor-pishet-net-signala/">отдельной проверке сигнала</a>.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="one-input-only"><p class="font-mono text-xs uppercase text-action">Только один вход</p><h3 class="mt-2 font-display text-2xl font-extrabold">Изолируйте соединение</h3><p class="mt-3 text-sm leading-relaxed text-muted">Выключите телевизор и источник, затем переподключите доступный сигнальный кабель. При возможности сравните прямое соединение без промежуточного устройства.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="no-own-interface"><p class="font-mono text-xs uppercase text-action">Интерфейс не виден</p><h3 class="mt-2 font-display text-2xl font-extrabold">Остановитесь у поддержки</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если не видны меню, индикатор громкости и доступный встроенный тест, не называйте неисправную деталь: используйте официальную поддержку точной модели.</p></article></div><p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-diagnostic-stop="true">Не разбирайте телевизор, пульт или подключённые устройства и не выполняйте электрические измерения. При повреждении, жидкости, запахе гари, дыме, необычном нагреве или мигающем красном индикаторе прекратите самостоятельную проверку.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники проверки изображения"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/what-to-do-if-there-is-black-screen-on-samsung-tv/" rel="noreferrer" target="_blank" data-tv-diagnostic-source="samsung-black-screen">Samsung: чёрный экран</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20155333777203" rel="noreferrer" target="_blank" data-tv-diagnostic-source="lg-sound-but-no-picture">LG: звук без изображения</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00173823" rel="noreferrer" target="_blank" data-tv-diagnostic-source="sony-picture-sound-test">Sony: встроенный тест</a></nav></section>"#
        }
        "tv-no-sound" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-diagnostic-answer="tv-no-sound" data-tv-diagnostic-task="tv-no-sound"><p class="font-mono text-xs uppercase text-action">Наблюдение → следующая проверка</p><h2 class="mt-2 font-display text-3xl font-extrabold">Отделите аудиовыход от канала или устройства</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Сначала подтвердите, откуда должен идти звук: из динамиков телевизора, наушников или внешней аудиосистемы. Затем сравните несколько источников и встроенный тест, если он предусмотрен инструкцией модели.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-diagnostic-branch="one-source-only"><p class="font-mono text-xs uppercase text-action">Один канал, вход или приложение</p><h3 class="mt-2 font-display text-2xl font-extrabold">Проверьте этот источник</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если другие источники звучат, не классифицируйте весь телевизор как неисправный. Продолжите по инструкции приложения, устройства или провайдера.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="output-not-confirmed"><p class="font-mono text-xs uppercase text-action">Выход не подтверждён</p><h3 class="mt-2 font-display text-2xl font-extrabold">Выберите ожидаемый звук</h3><p class="mt-3 text-sm leading-relaxed text-muted">Проверьте отключение звука и текущий аудиовыход. Для встроенных динамиков временно исключите доступные наушники или внешнюю аудиосистему по инструкции модели.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="sound-test-silent"><p class="font-mono text-xs uppercase text-action">Тест тихий или недоступен</p><h3 class="mt-2 font-display text-2xl font-extrabold">Нужна точная модель</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если динамики телевизора явно выбраны, а поддерживаемый тест не звучит или отсутствует, остановитесь и обратитесь в официальную поддержку без предположения о детали.</p></article></div><p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-diagnostic-stop="true">Не выполняйте заводской сброс как первый шаг и не открывайте телевизор или внешнюю аудиосистему. При повреждении, жидкости, запахе гари, дыме, необычном нагреве или мигающем красном индикаторе прекратите самостоятельную проверку.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники проверки звука"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/there-is-not-sound-on-tv/" rel="noreferrer" target="_blank" data-tv-diagnostic-source="samsung-no-sound">Samsung: нет звука</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20153413213150OLT" rel="noreferrer" target="_blank" data-tv-diagnostic-source="lg-no-sound">LG: проверка звука</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00173823" rel="noreferrer" target="_blank" data-tv-diagnostic-source="sony-picture-sound-test">Sony: встроенный тест</a></nav></section>"#
        }
        "tv-remote-not-working" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-diagnostic-answer="tv-remote-not-working" data-tv-diagnostic-task="tv-remote-not-working"><p class="font-mono text-xs uppercase text-action">Наблюдение → следующая проверка</p><h2 class="mt-2 font-display text-3xl font-extrabold">Сначала определите устройство и доступное управление</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Пульт телевизора, приставки и саундбара — разные устройства. Сравните доступную штатную кнопку или подтверждённое приложение; тип пульта и порядок сопряжения берите только из инструкции точной модели.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-diagnostic-branch="external-device-remote"><p class="font-mono text-xs uppercase text-action">Каналы открывает приставка</p><h3 class="mt-2 font-display text-2xl font-extrabold">Возьмите её пульт</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если меню каналов принадлежит операторской приставке, проверяйте её собственный или настроенный универсальный пульт по инструкции оператора.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="confirmed-infrared"><p class="font-mono text-xs uppercase text-action">Инструкция подтверждает ИК</p><h3 class="mt-2 font-display text-2xl font-extrabold">Батарейки → обзор</h3><p class="mt-3 text-sm leading-relaxed text-muted">Проверьте заряд, полярность, зажатые кнопки и предметы перед приёмником. Камера даёт лишь наблюдение ИК-сигнала и не проверяет телевизор.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="smart-or-unknown"><p class="font-mono text-xs uppercase text-action">Умный или неизвестный пульт</p><h3 class="mt-2 font-display text-2xl font-extrabold">Инструкция точной модели</h3><p class="mt-3 text-sm leading-relaxed text-muted">Не угадывайте сочетание кнопок. Для подтверждённого Android TV телефон может стать пультом только при совместимости, одной сети и доступном экранном сопряжении.</p></article></div><p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-diagnostic-stop="true">Не открывайте пульт дальше батарейного отсека и не перемещайте настенный телевизор ради доступа к кнопке. При коррозии, жидкости, вздутой или горячей батарейке, повреждении либо мигающем красном индикаторе остановитесь и обратитесь в официальную поддержку.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники проверки пульта"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/tv-remote-control-is-not-working/" rel="noreferrer" target="_blank" data-tv-diagnostic-source="samsung-remote-not-working">Samsung: пульт не работает</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00256916" rel="noreferrer" target="_blank" data-tv-diagnostic-source="sony-remote-not-working">Sony: типы пультов</a><a class="text-technical underline underline-offset-4" href="https://support.google.com/androidtv/answer/6122465?hl=ru" rel="noreferrer" target="_blank" data-tv-diagnostic-source="google-android-tv-phone-remote">Google: телефон как пульт</a></nav></section>"#
        }
        "tv-turns-off" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-diagnostic-answer="tv-turns-off" data-tv-diagnostic-task="tv-turns-off"><p class="font-mono text-xs uppercase text-action">Время события → безопасная ветка</p><h2 class="mt-2 font-display text-3xl font-extrabold">Отделите повторяемый таймер от внешнего управления</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Зафиксируйте, через одинаковое ли время телевизор выключается и происходит ли это после действия приставки, консоли или другого HDMI-устройства. Наблюдение выбирает следующую обратимую проверку, но не устанавливает аппаратную причину.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-diagnostic-branch="repeatable-interval"><p class="font-mono text-xs uppercase text-action">Одинаковый интервал</p><h3 class="mt-2 font-display text-2xl font-extrabold">Таймеры точной модели</h3><p class="mt-3 text-sm leading-relaxed text-muted">Сверьте таймер сна, автоматическое выключение и энергосбережение с инструкцией телевизора. Не выполняйте общий сброс как первую проверку.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="hdmi-control"><p class="font-mono text-xs uppercase text-action">После внешнего устройства</p><h3 class="mt-2 font-display text-2xl font-extrabold">Проверьте связь питания</h3><p class="mt-3 text-sm leading-relaxed text-muted">Сопоставьте событие с управлением по HDMI и проверьте соответствующие настройки только по инструкциям телевизора и подключённого устройства.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="unpredictable"><p class="font-mono text-xs uppercase text-action">Непредсказуемо</p><h3 class="mt-2 font-display text-2xl font-extrabold">Остановитесь у поддержки</h3><p class="mt-3 text-sm leading-relaxed text-muted">Не угадывайте деталь и не открывайте корпус. Запишите время, вход и состояние индикатора, затем обратитесь в официальную поддержку точной модели.</p></article></div><p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-diagnostic-stop="true">При запахе гари, дыме, искрах, треске, следах жидкости, заметном перегреве, красном мигающем индикаторе либо повреждённых, горячих или мокрых доступных кабеле, вилке или розетке прекратите использование. Не касайтесь кабеля, вилки или розетки, не снимайте и не сдвигайте настенный телевизор ради доступа к питанию или разъёмам.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники самопроизвольного выключения"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/how-to-troubleshoot-the-samsung-tv-that-keeps-turning-off-by-itself/" rel="noreferrer" target="_blank" data-tv-diagnostic-source="samsung-tv-turns-off">Samsung: телевизор выключается</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20153413206966" rel="noreferrer" target="_blank" data-tv-diagnostic-source="lg-tv-off-timer">LG: таймер выключения</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20154967823534" rel="noreferrer" target="_blank" data-tv-diagnostic-source="lg-tv-box-turns-off">LG: внешняя приставка</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00032613" rel="noreferrer" target="_blank" data-tv-diagnostic-source="sony-tv-auto-power">Sony: автоматическое питание</a></nav></section>"#
        }
        "tv-no-internet" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-diagnostic-answer="tv-no-internet" data-tv-diagnostic-task="tv-no-internet"><p class="font-mono text-xs uppercase text-action">Сеть → телевизор → приложение</p><h2 class="mt-2 font-display text-3xl font-extrabold">Отделите общий сбой сети от одного устройства</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Сравните интернет на другом устройстве той же домашней сети и посмотрите, видит ли телевизор доступные сети. Мастер не запрашивает название сети, пароль, IP- или MAC-адрес и не предлагает ручной DNS или сброс.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-diagnostic-branch="other-devices-offline"><p class="font-mono text-xs uppercase text-action">Не работает и на других устройствах</p><h3 class="mt-2 font-display text-2xl font-extrabold">Общая сеть или провайдер</h3><p class="mt-3 text-sm leading-relaxed text-muted">Проверьте доступное состояние роутера по его инструкции и сообщения провайдера. Не считайте телевизор единственной причиной общего сбоя.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="tv-sees-no-networks"><p class="font-mono text-xs uppercase text-action">Другие устройства работают</p><h3 class="mt-2 font-display text-2xl font-extrabold">Инструкция точной модели</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если телевизор не видит сети, сверяйте поддерживаемые диапазоны и модельные шаги. Не меняйте настройки роутера наугад.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="one-app-only"><p class="font-mono text-xs uppercase text-action">Не работает одно приложение</p><h3 class="mt-2 font-display text-2xl font-extrabold">Путь приложения</h3><p class="mt-3 text-sm leading-relaxed text-muted">Если другие сетевые функции работают, используйте официальную поддержку конкретного приложения вместо сброса всего телевизора.</p></article></div><p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-diagnostic-stop="true">Не вводите на сайте название сети, пароль, IP- или MAC-адрес: мастер их не запрашивает. Не выполняйте ручную смену DNS, заводской сброс телевизора или сброс роутера как первый шаг.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники подключения телевизора к интернету"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/samsung-tv-cannot-find-wi-fi-network/" rel="noreferrer" target="_blank" data-tv-diagnostic-source="samsung-tv-wifi">Samsung: телевизор не видит Wi-Fi</a><a class="text-technical underline underline-offset-4" href="https://www.lg.com/ru/support/product-help/CT20206007-20155140884890" rel="noreferrer" target="_blank" data-tv-diagnostic-source="lg-tv-internet">LG: подключение к интернету</a><a class="text-technical underline underline-offset-4" href="https://www.sony.ru/electronics/support/articles/00127011" rel="noreferrer" target="_blank" data-tv-diagnostic-source="sony-tv-internet">Sony: проверка сети</a></nav></section>"#
        }
        "tv-usb-not-seen" => {
            r#"<section class="border-y-2 border-ink py-7" data-tv-diagnostic-answer="tv-usb-not-seen" data-tv-diagnostic-task="tv-usb-not-seen"><p class="font-mono text-xs uppercase text-action">Флешка → файл → модель</p><h2 class="mt-2 font-display text-3xl font-extrabold">Разделите распознавание накопителя и медиафайла</h2><p class="mt-3 max-w-4xl leading-relaxed text-muted">Этот мастер относится только к обычной USB-флешке для просмотра медиа. Он не загружает файлы, не относится к телефону, внешнему HDD для записи передач и не предлагает форматирование или регистрацию накопителя.</p><div class="mt-7 grid gap-px border border-ink bg-ink md:grid-cols-3"><article class="bg-paper p-5" data-tv-diagnostic-branch="drive-not-listed"><p class="font-mono text-xs uppercase text-action">Флешки нет в меню</p><h3 class="mt-2 font-display text-2xl font-extrabold">Проверьте область поддержки</h3><p class="mt-3 text-sm leading-relaxed text-muted">Сверьте доступный USB-порт, объём и файловую систему с инструкцией точной модели. При возможности проверьте чтение данных на другом устройстве без записи.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="file-not-played"><p class="font-mono text-xs uppercase text-action">Флешка видна, файл — нет</p><h3 class="mt-2 font-display text-2xl font-extrabold">Проверьте формат медиа</h3><p class="mt-3 text-sm leading-relaxed text-muted">Распознавание накопителя не подтверждает поддержку контейнера или кодека. Используйте перечень форматов для точной модели.</p></article><article class="bg-paper p-5" data-tv-diagnostic-branch="unsupported-scope"><p class="font-mono text-xs uppercase text-action">Телефон, запись или неизвестно</p><h3 class="mt-2 font-display text-2xl font-extrabold">Нужна другая инструкция</h3><p class="mt-3 text-sm leading-relaxed text-muted">Не применяйте к телефону или диску для записи правила обычной флешки. Сохраните данные и откройте руководство соответствующего устройства.</p></article></div><p class="mt-6 border-l-2 border-danger pl-4 text-sm font-semibold" data-tv-diagnostic-stop="true">Не форматируйте и не регистрируйте накопитель: это может удалить данные. Сначала нужна резервная копия и инструкция точной модели. Не перемещайте настенный телевизор ради недоступного USB-порта и не прикладывайте усилие к разъёму.</p><nav class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники проверки USB-флешки"><a class="text-technical underline underline-offset-4" href="https://www.samsung.com/ru/support/tv-audio-video/what-can-i-do-if-usb-video-files-cannot-be-played-on-samsung-tv/" rel="noreferrer" target="_blank" data-tv-diagnostic-source="samsung-usb-video">Samsung: USB-видео</a><a class="text-technical underline underline-offset-4" href="https://support.google.com/androidtv/answer/6299083?hl=ru" rel="noreferrer" target="_blank" data-tv-diagnostic-source="google-android-tv-storage">Google: USB-накопитель</a></nav></section>"#
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
        "<article class=\"border border-line bg-white p-5\"><a class=\"font-display text-xl font-extrabold underline decoration-action decoration-2 underline-offset-4\" href=\"/modeli/{id}/\">{title}</a><p class=\"mt-3 text-sm leading-relaxed text-muted\">{year_fact} · {diagonal}″ · VESA {vesa_width}×{vesa_height} мм · {weight} кг {weight_suffix}</p><p class=\"mt-3 font-mono text-xs uppercase text-technical\">Подтверждённых кронштейнов: {mount_count}</p></article>",
        id = escape_html(&tv.id),
        title = escape_html(&tv.title),
        year_fact = model_year_fact(tv.model_year),
        diagonal = tv.diagonal_inches,
        vesa_width = tv.vesa_width_mm,
        vesa_height = tv.vesa_height_mm,
        weight = tv.weight_kg,
        weight_suffix = model_weight_suffix(tv),
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
                        "Диагональ {diagonal}″ помогает отсеять неподходящий паспортный диапазон кронштейна, но не заменяет сверку точной модели. В карточках сохранены VESA, паспортная масса и число подтверждённых кронштейнов."
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
                    "Каталог {display_brand} собран по точным обозначениям моделей, а не только по серии. Для каждой модели показаны VESA, паспортная масса, диагональ и число кронштейнов, прошедших все три проверки."
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
        "<section class=\"border-y-2 border-ink py-8\" aria-labelledby=\"screw-catalog-title\" data-screw-catalog=\"true\" data-searchable-model-count=\"{searchable_count}\"><p class=\"font-mono text-xs uppercase text-action\">Бесплатная проверка без регистрации</p><h2 id=\"screw-catalog-title\" class=\"mt-2 font-display text-4xl font-extrabold\">Найдите точную модель телевизора</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Покажем только то, что удалось подтвердить руководством: резьбу, количество, длину или допустимую глубину и обязательные вставки.</p><p class=\"mt-3 max-w-3xl border-l-2 border-action pl-4 text-sm font-semibold leading-relaxed\">Поиск относится к винтам между корпусом телевизора и VESA-пластиной. Это не анкеры для стены и не винты для ножек.</p><form class=\"mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]\" action=\"/modeli/\" method=\"get\" data-model-search-count=\"{searchable_count}\"><label class=\"sr-only\" for=\"static-screw-model\">Модель телевизора</label><input class=\"h-16 min-w-0 rounded-md border-2 border-ink bg-white px-5 text-xl\" id=\"static-screw-model\" list=\"static-screw-models\" name=\"model\" placeholder=\"Например, Samsung QE43Q7FAAUXRU\" autocomplete=\"off\"><datalist id=\"static-screw-models\">{model_options}</datalist><button class=\"rounded-md bg-action px-7 font-display text-xl font-bold text-white\" type=\"submit\">Открыть каталог моделей</button></form><p class=\"mt-4 border-l-2 border-line pl-4 text-sm leading-relaxed text-muted\" data-known-model-fallback=\"true\">Поиск распознаёт весь проверенный каталог. Если модель известна, но паспорт винтов ещё не подтверждён, сервис не угадывает M6/M8 по VESA и ведёт в карточку модели с совместимыми кронштейнами.</p><dl class=\"mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4\"><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Моделей в поиске</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{searchable_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Моделей с паспортом</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{model_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Брендов</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{brand_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Подтверждённая резьба</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{threads}</dd></div></dl><p class=\"mt-5 text-sm leading-relaxed text-muted\">Открытый датасет «Винты VESA для популярных в России моделей телевизоров», версия {dataset_version}: <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"{download_base}/tv-vesa-screws.csv\" rel=\"noreferrer\" target=\"_blank\">скачать CSV</a> или <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"{download_base}/tv-vesa-screws.json\" rel=\"noreferrer\" target=\"_blank\">JSON</a>. В файлах {model_count} точных моделей, паспортные размеры и источники руководств; <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"https://github.com/jimbokl/krepitv/blob/2f19d58ef793ffc1e26c8c8fdb6d53f2a20edbfe/LICENSE\" rel=\"noreferrer\" target=\"_blank\">лицензия MIT</a>.</p><div class=\"mt-9\"><h3 class=\"border-b-2 border-ink pb-4 font-display text-3xl font-extrabold\">Все проверенные модели</h3>{catalog}</div></section>",
        searchable_count = models.len(),
        model_count = screw_models.len(),
        brand_count = brand_count,
        threads = escape_html(&threads.join(" · ")),
        model_options = model_options,
        catalog = catalog,
        dataset_version = SCREW_DATASET_VERSION,
        download_base = SCREW_DATASET_DOWNLOAD_BASE,
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
                    "<article class=\"grid gap-4 border-b border-line py-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)] lg:items-start\"><div><a class=\"font-display text-2xl font-extrabold\" href=\"/modeli/{id}/\">{title}</a><p class=\"mt-2 font-display text-2xl font-extrabold text-action\">VESA {vesa_w}×{vesa_h} мм</p><p class=\"mt-1 text-sm text-muted\">{diagonal}″ · {weight} кг {weight_suffix} · {match_summary}</p>{conflict}</div><div class=\"grid gap-3 lg:justify-items-end lg:text-right\"><a class=\"font-semibold text-technical underline underline-offset-4\" href=\"{source_url}\" rel=\"noreferrer\" target=\"_blank\">Официальный источник</a><span class=\"font-mono text-xs uppercase text-muted\">Проверено {checked_at}</span><a class=\"font-semibold text-action underline underline-offset-4\" href=\"/modeli/{id}/\">{model_link_label} →</a></div></article>",
                    id = escape_html(&model.id),
                    title = escape_html(&model.title),
                    vesa_w = model.vesa_width_mm,
                    vesa_h = model.vesa_height_mm,
                    diagonal = model.diagonal_inches,
                    weight = model.weight_kg,
                    weight_suffix = model_weight_suffix(model),
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
        "<section class=\"border-y-2 border-ink py-8\" aria-labelledby=\"vesa-model-catalog-title\" data-vesa-model-catalog=\"true\" data-searchable-model-count=\"{model_count}\"><p class=\"font-mono text-xs uppercase text-action\">Бесплатный поиск без регистрации</p><h2 id=\"vesa-model-catalog-title\" class=\"mt-2 font-display text-4xl font-extrabold\">Найдите VESA по модели телевизора</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Введите полный код с шильдика. Покажем расстояние между отверстиями, источник паспорта и число кронштейнов, прошедших точную проверку.</p><form class=\"mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]\" action=\"/modeli/\" method=\"get\" data-vesa-model-search-count=\"{model_count}\"><label class=\"sr-only\" for=\"static-vesa-model\">Модель телевизора</label><input class=\"h-16 min-w-0 rounded-md border-2 border-ink bg-white px-5 text-xl\" id=\"static-vesa-model\" list=\"static-vesa-models\" name=\"model\" placeholder=\"Например, TCL 55P6K\" autocomplete=\"off\"><datalist id=\"static-vesa-models\">{model_options}</datalist><button class=\"rounded-md bg-action px-7 font-display text-xl font-bold text-white\" type=\"submit\">Открыть модель</button></form><p class=\"mt-4 border-l-2 border-action pl-4 text-sm leading-relaxed text-muted\">VESA записывается как горизонталь × вертикаль в миллиметрах. Диагональ экрана сама по себе не определяет расположение отверстий.</p><dl class=\"mt-7 grid gap-px border border-ink bg-ink sm:grid-cols-3\"><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Точных моделей</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{model_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Брендов</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{brand_count}</dd></div><div class=\"bg-paper p-4\"><dt class=\"font-mono text-xs uppercase text-muted\">Схем VESA</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">{vesa_count}</dd></div></dl><p class=\"mt-5 text-sm leading-relaxed text-muted\">Открытый датасет «Размеры VESA популярных в России телевизоров», версия {dataset_version}: <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"/data/tv-vesa-sizes.csv\">скачать CSV</a> или <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"/data/tv-vesa-sizes.json\">JSON</a>. В файлах {model_count} точных моделей, размеры VESA, основание массы и источники паспортов; фиксированная копия опубликована в <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"{release_url}\" rel=\"noreferrer\" target=\"_blank\">GitHub release {dataset_version}</a>. <a class=\"font-semibold text-technical underline underline-offset-4\" href=\"https://github.com/jimbokl/krepitv/blob/2f19d58ef793ffc1e26c8c8fdb6d53f2a20edbfe/LICENSE\" rel=\"noreferrer\" target=\"_blank\">Лицензия MIT</a>.</p><div class=\"mt-9\"><h3 class=\"border-b-2 border-ink pb-4 font-display text-3xl font-extrabold\">Таблица VESA телевизоров</h3>{catalog}</div></section>",
        model_count = models.len(),
        brand_count = brand_count,
        vesa_count = vesa_count,
        model_options = model_options,
        catalog = catalog,
        release_url = VESA_DATASET_RELEASE_URL,
        dataset_version = VESA_DATASET_VERSION,
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

fn seo_evidence_guide_html(page: &SeoPage) -> String {
    let Some(guide) = &page.guide else {
        return String::new();
    };
    let table_rows = guide
        .steps
        .iter()
        .map(|step| {
            format!(
                "<tr class=\"border-t border-line align-top\" data-evidence-guide-step=\"{}\"><th class=\"p-4 text-left font-display text-lg\" scope=\"row\">{}</th><td class=\"p-4 font-semibold\">{}</td><td class=\"p-4 leading-relaxed text-muted\">{}</td></tr>",
                escape_html(&step.label),
                escape_html(&step.label),
                escape_html(&step.title),
                escape_html(&step.body),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let sources = guide
        .sources
        .iter()
        .map(|source| {
            format!(
                "<a class=\"text-technical underline underline-offset-4\" href=\"{}\" rel=\"noreferrer\" target=\"_blank\" data-evidence-guide-source=\"{}\">{}</a>",
                escape_html(&source.url),
                escape_html(&source.id),
                escape_html(&source.label),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    format!(
        "<section class=\"border-y-2 border-ink py-7\" data-evidence-guide=\"{}\" id=\"мастер\"><nav class=\"mb-7 grid gap-2 border-y border-line py-4 font-display text-sm font-bold sm:grid-cols-2 lg:grid-cols-4\" data-guide-toc=\"true\" aria-label=\"Содержание руководства\"><a class=\"underline decoration-line underline-offset-4\" href=\"#мастер\">Инструмент</a><a class=\"underline decoration-line underline-offset-4\" href=\"#granitsa\">Граница проверки</a><a class=\"underline decoration-line underline-offset-4\" href=\"#istochniki\">Источники</a><a class=\"underline decoration-line underline-offset-4\" href=\"#svyazannye-materialy\">По теме</a></nav><p class=\"font-mono text-xs uppercase text-action\">{}</p><h2 class=\"mt-2 font-display text-3xl font-extrabold\">{}</h2><p class=\"mt-3 max-w-4xl leading-relaxed text-muted\">{}</p><h3 class=\"mt-7 font-display text-2xl font-extrabold [overflow-wrap:anywhere]\" id=\"evidence-guide-table-title\">Таблица решений по наблюдаемому признаку</h3><p class=\"mt-2 font-mono text-xs uppercase text-action sm:hidden\">Таблица прокручивается вправо →</p><div class=\"mt-4 overflow-x-auto border-2 border-ink\"><table aria-labelledby=\"evidence-guide-table-title\" class=\"w-full min-w-[720px] bg-white text-sm\" data-evidence-guide-table=\"true\"><thead><tr class=\"bg-ink text-paper\"><th class=\"p-4 text-left\" scope=\"col\">Ситуация</th><th class=\"p-4 text-left\" scope=\"col\">Следующий шаг</th><th class=\"p-4 text-left\" scope=\"col\">Как проверить</th></tr></thead><tbody>{}</tbody></table></div><p class=\"mt-6 border-l-2 border-danger pl-4 text-sm font-semibold\" data-evidence-guide-stop=\"true\" id=\"granitsa\">{}</p><details class=\"mt-7 border border-line bg-white p-4\" id=\"istochniki\"><summary class=\"cursor-pointer font-display font-bold\">Официальные источники и границы проверки</summary><nav class=\"mt-4 grid gap-3 text-sm font-semibold sm:grid-cols-2\" aria-label=\"Официальные источники\">{}</nav><p class=\"mt-4 font-mono text-xs text-muted\">Материал проверен {}</p><p class=\"mt-3 text-sm leading-relaxed text-muted\">Редакционная проверка KREPI TV: выводы ограничены официальными инструкциями и наблюдаемыми признаками. <a class=\"font-semibold text-action underline underline-offset-4\" href=\"/metodika/\">Методика, источники и границы проверки</a>.</p></details></section>",
        escape_html(&page.id),
        escape_html(&guide.kicker),
        escape_html(&guide.heading),
        escape_html(&guide.summary),
        table_rows,
        escape_html(&guide.stop),
        sources,
        escape_html(&guide.updated_at),
    )
}

fn seo_page_body(
    page: &SeoPage,
    pages: &[SeoPage],
    models: &[TvModel],
    mounts: &[Mount],
    graph: &[CompatibilityEdge],
) -> String {
    let page_kind_label = seo_page_kind_label(page);
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
    let evidence_guide = seo_evidence_guide_html(page);
    let editorial_accountability = editorial_accountability_html(
        if page.guide.is_some() {
            "seo-reviewed"
        } else {
            "seo-calculated"
        },
        page.guide
            .as_ref()
            .map(|guide| guide.updated_at.as_str())
            .unwrap_or(SEO_FUNNEL_UPDATED_AT),
    );
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
    } else if page.guide.is_some() {
        format!("{evidence_guide}{facts_section}")
    } else {
        format!(
            "{brand_matcher_note}{facts_section}{buy_mount_comparison}{catalog}{calculator_note}"
        )
    };
    let mount_funnel_next_step = seo_mount_funnel_next_step_html();

    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\"><p class=\"font-mono text-xs uppercase text-action\">{page_kind_label}</p><h1 class=\"mt-3 font-display text-5xl font-extrabold sm:text-7xl\">{h1}</h1><p class=\"mt-5 max-w-3xl text-lg leading-relaxed text-muted\">{lead}</p>{editorial_accountability}{answer_content}<section class=\"py-8\"><h2 class=\"font-display text-3xl font-extrabold\">Частые вопросы</h2><div class=\"mt-5 border-b border-line\">{faq}</div></section>{mount_funnel_next_step}<section class=\"border-t-2 border-ink py-7\" id=\"svyazannye-materialy\"><h2 class=\"font-display text-2xl font-extrabold\">Связанные материалы</h2><nav class=\"mt-4 grid\" aria-label=\"Связанные материалы\">{related_links}</nav></section></article>",
        page_kind_label = escape_html(page_kind_label),
        h1 = escape_html(&page.h1),
        lead = escape_html(&page.lead),
        editorial_accountability = editorial_accountability,
        answer_content = answer_content,
        mount_funnel_next_step = mount_funnel_next_step,
    ))
}

fn guide_index_body(pages: &[SeoPage]) -> String {
    let group_html = |title: &str, has_guide: bool| {
        let links = pages
            .iter()
            .filter(|page| is_indexable_seo_page(page) && page.guide.is_some() == has_guide)
            .map(|page| {
                format!(
                    "<a class=\"grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-3 font-display font-bold transition hover:text-action\" data-guide-index-link=\"{}\" href=\"{}\"><span>{}</span><span aria-hidden=\"true\">→</span></a>",
                    escape_html(&page.path),
                    escape_html(&page.path),
                    escape_html(&page.h1),
                )
            })
            .collect::<Vec<_>>()
            .join("\n");
        format!(
            "<section class=\"border-t-2 border-ink\"><h2 class=\"py-5 font-display text-3xl font-extrabold\">{}</h2><div class=\"border-b border-line\">{}</div></section>",
            escape_html(title),
            links,
        )
    };
    let guide_count = pages
        .iter()
        .filter(|page| is_indexable_seo_page(page))
        .count();
    let instructions = group_html("Практические инструкции", true);
    let utilities = group_html("Калькуляторы, таблицы и подборы", false);
    static_layout(&format!(
        "<article class=\"mx-auto max-w-[1100px] px-5 py-12 sm:px-8\" data-guide-index=\"true\"><header class=\"border-b-2 border-ink pb-8\"><p class=\"font-mono text-xs uppercase tracking-[0.12em] text-action\">{guide_count} полезных материалов</p><h1 class=\"mt-3 font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold leading-[0.92]\">Справочник по телевизорам и креплениям</h1><p class=\"mt-6 max-w-3xl text-lg leading-relaxed text-muted\">Инструкции, проверочные таблицы и локальные калькуляторы KREPI TV. Каждый материал ведёт к точной модели, VESA или следующему безопасному шагу.</p></header><div class=\"grid gap-8 py-8 lg:grid-cols-2\">{instructions}{utilities}</div></article>"
    ))
}

fn seo_mount_funnel_next_step_html() -> &'static str {
    r#"<section aria-labelledby="mount-funnel-next-step-title" class="mt-12 border-y-2 border-ink py-7" data-mount-funnel-next-step="true"><div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"><div><p class="font-mono text-xs uppercase tracking-[0.12em] text-action">Следующий шаг после результата</p><h2 class="mt-2 max-w-4xl break-words font-display text-[clamp(0.875rem,7.5vw,1.875rem)] font-extrabold leading-tight" id="mount-funnel-next-step-title">От результата мастера — к совместимому кронштейну</h2><p class="mt-3 max-w-3xl leading-relaxed text-muted">Сначала завершите текущую проверку. Затем укажите точную модель телевизора — подбор покажет только подтверждённые совместимые варианты.</p></div><a class="primary-button w-full justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 lg:w-auto" href="/podbor/">Подобрать кронштейн <span aria-hidden="true">→</span></a></div><ol class="mt-6 grid gap-px border border-ink bg-ink sm:grid-cols-3"><li class="min-w-0 bg-paper p-4"><span class="font-mono text-xs text-action">01</span><strong class="mt-2 block font-display text-xl font-extrabold">Точная модель</strong><span class="mt-2 block text-sm leading-relaxed text-muted">Выберите марку и полный код телевизора из проверенного каталога.</span></li><li class="min-w-0 bg-paper p-4"><span class="font-mono text-xs text-action">02</span><strong class="mt-2 block font-display text-xl font-extrabold">Совместимый кронштейн</strong><span class="mt-2 block text-sm leading-relaxed text-muted">Сервис сверит VESA, массу с запасом и диапазон диагонали.</span></li><li class="min-w-0 bg-paper p-4"><span class="font-mono text-xs text-action">03</span><strong class="mt-2 block font-display text-xl font-extrabold">Яндекс Маркет</strong><span class="mt-2 block text-sm leading-relaxed text-muted">Откройте карточку выбранного кронштейна и проверьте актуальное предложение.</span></li></ol><p class="mt-4 border-l-2 border-technical pl-4 text-sm leading-relaxed text-muted">Маркет откроется только после выбора подтверждённого совместимого кронштейна. Если проверенного варианта нет, сервис не подменяет его случайным товаром.</p></section>"#
}

fn seo_page_kind_label(page: &SeoPage) -> &'static str {
    match page.id.as_str() {
        "phone-to-tv"
        | "laptop-to-tv"
        | "soundbar-to-tv"
        | "smart-tv-box"
        | "tv-speakers"
        | "tv-headphones"
        | "tv-antenna-connect"
        | "digital-box-connect"
        | "game-console-to-tv"
        | "phone-tv-remote" => "Подключение устройств",
        "tv-no-signal"
        | "tv-sound-no-picture"
        | "tv-no-sound"
        | "tv-remote-not-working"
        | "tv-turns-off"
        | "tv-no-internet"
        | "tv-usb-not-seen"
        | "tv-wont-turn-on"
        | "tv-freezes"
        | "tv-dark-screen" => "Диагностика телевизора",
        "digital-channels" | "picture-setup" | "tv-firmware-update" | "tv-app-install"
        | "tv-factory-reset" | "tv-storage-cleanup" | "tv-model-lookup" | "tv-aspect-ratio" => {
            "Настройка телевизора"
        }
        "screen-cleaning" => "Уход за телевизором",
        "tv-energy-consumption" => "Расчёт электроэнергии",
        _ => match page.kind.as_str() {
            "guide" => "Практическое руководство",
            "vesa" => "Справочник VESA",
            "diagonal" => "Подбор по диагонали",
            "brand" => "Подбор по бренду",
            "mount-brand" => "Кронштейны по бренду",
            "mechanism" => "Типы кронштейнов",
            "commercial" => "Сравнение кронштейнов",
            "calculator" => "Расчёт установки",
            "screws" => "Подбор винтов VESA",
            _ => "Технический справочник",
        },
    }
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
                "<section class=\"border-b border-line pb-9 last:border-b-0\"><h2 class=\"font-display text-3xl font-extrabold leading-tight sm:text-4xl\">{}</h2><div class=\"mt-5 space-y-4 text-base leading-relaxed text-muted sm:text-lg\">{paragraphs}{bullets}</div></section>",
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
                "<a class=\"flex min-h-12 items-center justify-between gap-3 border-t border-line py-3 font-display font-bold transition first:border-t-0 hover:text-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2\" href=\"{}\">{}{TRUST_ARROW_ICON}</a>",
                escape_html(&link.href),
                escape_html(&link.label),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        "<header class=\"border-b-2 border-ink bg-paper\"><div class=\"mx-auto max-w-[1440px] px-5 py-4 sm:px-8\"><a class=\"font-display text-xl font-extrabold\" href=\"/\">KREPI TV</a></div></header><main class=\"min-h-screen bg-paper text-ink\"><article class=\"mx-auto max-w-[1440px] px-5 pb-16 pt-6 sm:px-8\"><header class=\"mt-5 border-b-2 border-ink pb-7\"><p class=\"font-mono text-xs uppercase tracking-[0.12em] text-action\">{kicker}</p><h1 class=\"mt-3 max-w-[1180px] break-words font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold leading-[0.92] tracking-[-0.035em]\">{h1}</h1><p class=\"mt-6 max-w-[1000px] text-lg leading-relaxed text-muted sm:text-xl\">{lead}</p><p class=\"mt-5 font-mono text-xs text-muted\">Актуально на {updated_at}</p></header><aside class=\"grid gap-3 border-b border-ink py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center\" data-trust-publisher=\"true\"><p class=\"font-mono text-xs uppercase text-muted\">Ответственный издатель</p><p class=\"flex flex-wrap items-baseline gap-x-3 gap-y-1\"><a class=\"font-display text-lg font-extrabold underline decoration-action decoration-2 underline-offset-4\" href=\"/redaktsiya/\">Редакция KREPI TV</a><span class=\"text-sm text-muted\">Организационный автор проекта</span></p></aside><div class=\"grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start\"><div class=\"max-w-4xl space-y-10\">{sections}</div><aside class=\"border border-line bg-white p-6 lg:sticky lg:top-6\" aria-labelledby=\"trust-related-title\">{trust_shield_icon}<h2 class=\"mt-4 font-display text-2xl font-extrabold\" id=\"trust-related-title\">Полезные разделы</h2><nav class=\"mt-4 grid\" aria-label=\"Связанные разделы\">{related_links}</nav></aside></div></article></main><footer class=\"border-t-2 border-ink bg-paper\"><nav class=\"mx-auto flex max-w-[1440px] flex-wrap gap-6 px-5 py-7 font-display text-sm font-bold uppercase sm:px-8\" aria-label=\"Информация о сервисе\"><a href=\"/o-proekte/\">О проекте</a><a href=\"/redaktsiya/\">Редакция</a><a href=\"/metodika/\">Методика</a><a href=\"/kontakty/\">Контакты</a><a href=\"/politika-konfidencialnosti/\">Конфиденциальность</a></nav></footer>",
        h1 = escape_html(&page.h1),
        kicker = escape_html(&page.kicker),
        lead = escape_html(&page.lead),
        updated_at = escape_html(&page.updated_at),
        trust_shield_icon = TRUST_SHIELD_ICON,
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
                && tv
                    .model_year
                    .map_or(true, |model_year| (2000..=2100).contains(&model_year))
                && tv.source_url.starts_with("https://")
                && !tv.source_label.trim().is_empty()
                && tv.weight_basis.as_deref().map_or(true, |basis| matches!(
                    basis,
                    "with_stand" | "published_unspecified"
                ))
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

fn validate_market_models(manifest: &MarketTvModelsFile, models: &[TvModel]) {
    assert_eq!(
        manifest.schema_version, 1,
        "Неподдерживаемая версия реестра моделей Маркета"
    );
    assert_eq!(
        manifest.records.len(),
        133,
        "Реестр Маркета должен сохранять все 133 наблюдения"
    );
    assert!(
        manifest.source_url.starts_with("https://market.yandex.ru/")
            && !manifest.source_scope.trim().is_empty()
            && parse_rfc3339_utc_seconds(&manifest.observed_at).is_some()
            && manifest.batch_sha256.len() == 64
            && manifest
                .batch_sha256
                .chars()
                .all(|character| character.is_ascii_hexdigit()),
        "Некорректные метаданные реестра моделей Маркета"
    );

    let verified_model_ids = models
        .iter()
        .map(|model| model.id.as_str())
        .collect::<HashSet<_>>();
    let mut route_paths = HashSet::new();
    let mut record_ids = HashSet::new();
    let mut canonical_ids = HashSet::new();
    let mut verified_routes = 0usize;
    let mut observed_canonicals = 0usize;
    let indexable_observed_canonicals = 0usize;
    let mut alias_routes = 0usize;
    let mut low_confidence_routes = 0usize;

    for record in &manifest.records {
        assert!(
            record_ids.insert(record.record_id.as_str()),
            "Повторяется карточка Маркета {}",
            record.record_id
        );
        assert!(
            route_paths.insert(record.route_path.as_str()),
            "Повторяется маршрут Маркета {}",
            record.route_path
        );
        canonical_ids.insert(record.canonical_id.as_str());

        let route_id = record
            .route_path
            .strip_prefix("/modeli/")
            .and_then(|value| value.strip_suffix('/'))
            .filter(|value| {
                !value.is_empty()
                    && value.chars().all(|character| {
                        character.is_ascii_lowercase()
                            || character.is_ascii_digit()
                            || character == '-'
                    })
            });
        let canonical_id = record
            .canonical_path
            .strip_prefix("/modeli/")
            .and_then(|value| value.strip_suffix('/'));
        assert_eq!(
            route_id,
            Some(record.id.as_str()),
            "Некорректный маршрут {}",
            record.route_path
        );
        assert_eq!(
            canonical_id,
            Some(record.canonical_id.as_str()),
            "Некорректный canonical {}",
            record.canonical_path
        );
        assert!(
            !record.brand.trim().is_empty()
                && !record.model.trim().is_empty()
                && !record.title.trim().is_empty()
                && !record.market_title.trim().is_empty()
                && record
                    .market_product_id
                    .chars()
                    .all(|character| character.is_ascii_digit())
                && is_valid_iso_date(&record.checked_at)
                && record.source_label == "Карточка телевизора в выдаче Яндекс Маркета"
                && record
                    .market_url
                    .starts_with("https://market.yandex.ru/card/")
                && !record.market_url.contains(['?', '#', '@'])
                && record.observed_rank > 0,
            "Некорректные данные карточки Маркета {}",
            record.record_id
        );
        if let Some(diagonal) = record.diagonal_inches {
            assert!(
                (10.0..=150.0).contains(&diagonal),
                "Некорректная диагональ у {}",
                record.record_id
            );
        }
        if record.identity_confidence == "low" {
            low_confidence_routes += 1;
            assert!(
                !record.indexable,
                "Модель с низкой уверенностью не должна индексироваться: {}",
                record.record_id
            );
        }

        match record.page_kind.as_str() {
            "verified" => {
                verified_routes += 1;
                assert!(
                    !record.indexable
                        && record.route_path == record.canonical_path
                        && record.verified_model_id.as_deref() == Some(record.id.as_str())
                        && verified_model_ids.contains(record.id.as_str()),
                    "Карточка {} неверно привязана к проверенной модели",
                    record.record_id
                );
            }
            "observed" => {
                observed_canonicals += 1;
                assert!(
                    !record.indexable
                        && record.route_path == record.canonical_path
                        && record.verified_model_id.is_none()
                        && matches!(
                            record.identity_confidence.as_str(),
                            "high" | "medium" | "low"
                        ),
                    "Некорректная наблюдаемая модель {}",
                    record.record_id
                );
            }
            "alias" => {
                alias_routes += 1;
                assert!(
                    !record.indexable
                        && record.route_path != record.canonical_path
                        && record.verified_model_id.is_none(),
                    "Некорректный алиас {}",
                    record.record_id
                );
            }
            page_kind => panic!("Неизвестный тип модельной страницы {page_kind}"),
        }
    }

    assert_eq!(manifest.summary.market_observations, manifest.records.len());
    assert_eq!(manifest.summary.unique_identities, canonical_ids.len());
    assert_eq!(manifest.summary.verified_routes, verified_routes);
    assert_eq!(manifest.summary.observed_canonicals, observed_canonicals);
    assert_eq!(
        manifest.summary.indexable_observed_canonicals,
        indexable_observed_canonicals
    );
    assert_eq!(manifest.summary.alias_routes, alias_routes);
    assert_eq!(
        manifest.summary.low_confidence_routes,
        low_confidence_routes
    );
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

    for cohort in [
        &DAILY_SEO_COHORT_2026_08_06[..],
        &DAILY_SEO_COHORT_2026_08_07[..],
        &DAILY_SEO_COHORT_2026_08_08[..],
        &DAILY_SEO_COHORT_2026_08_09[..],
        &DAILY_SEO_COHORT_2026_08_10[..],
    ] {
        for &(id, path) in cohort {
            let cohort_matches = pages
                .iter()
                .filter(|page| page.id == id || page.path == path)
                .collect::<Vec<_>>();
            assert_eq!(
                cohort_matches.len(),
                1,
                "Ежедневная SEO-страница {id} должна иметь один canonical"
            );
            let page = cohort_matches[0];
            assert_eq!(page.id, id, "Путь {path} закреплён только за {id}");
            assert_eq!(
                page.path, path,
                "Идентификатор {id} закреплён только за {path}"
            );
            assert_eq!(
                page.kind, "calculator",
                "{id} должен оставаться самостоятельным инструментом"
            );
            assert!(page.indexable, "{id} должен оставаться индексируемым");
            assert!(
                page.facts.len() >= 6,
                "{id}: требуется не менее шести проверок"
            );
            assert!(page.faq.len() >= 6, "{id}: требуется не менее шести FAQ");

            let guide = page
                .guide
                .as_ref()
                .unwrap_or_else(|| panic!("{id}: отсутствует самостоятельный evidence guide"));
            assert!(
                guide.sources.len() >= 2,
                "{id}: требуется минимум два официальных источника"
            );
            assert_eq!(
                guide.steps.len(),
                3,
                "{id}: требуется ровно три развилки результата"
            );
            assert_eq!(
                guide.updated_at.len(),
                10,
                "{id}: дата проверки должна быть YYYY-MM-DD"
            );
            assert!(
                !guide.stop.trim().is_empty(),
                "{id}: отсутствует безопасная граница"
            );
            let mut source_ids = HashSet::new();
            for source in &guide.sources {
                assert!(
                    source_ids.insert(&source.id),
                    "{id}: повторяется источник {}",
                    source.id
                );
                assert!(
                    source.url.starts_with("https://"),
                    "{id}: источник должен быть HTTPS"
                );
                assert!(
                    !source.label.trim().is_empty(),
                    "{id}: источник без подписи"
                );
            }

            let static_answer = seo_evidence_guide_html(page);
            assert!(static_answer.contains(&format!("data-evidence-guide=\"{id}\"")));
            assert_eq!(
                static_answer.matches("data-evidence-guide-step=").count(),
                3
            );
            assert_eq!(
                static_answer.matches("data-evidence-guide-source=").count(),
                guide.sources.len(),
                "{id}: SSR обязан содержать все разрешённые источники"
            );
        }
    }

    for (id, path, source_ids) in TV_UTILITY_COHORT_6 {
        let cohort_matches = pages
            .iter()
            .filter(|page| page.id == id || page.path == path)
            .collect::<Vec<_>>();
        assert_eq!(
            cohort_matches.len(),
            1,
            "Страница когорты 6 {id} должна иметь один разрешённый canonical"
        );
        let page = cohort_matches[0];
        assert_eq!(page.id, id, "Путь {path} закреплён только за {id}");
        assert_eq!(
            page.path, path,
            "Идентификатор {id} закреплён только за {path}"
        );
        assert_eq!(
            page.kind, "calculator",
            "{id} должен оставаться калькулятором"
        );
        assert!(page.indexable, "{id} должен оставаться индексируемым");
        assert!(
            page.facts.len() >= 6,
            "{id}: требуется не менее шести фактов"
        );
        assert!(page.faq.len() >= 6, "{id}: требуется не менее шести FAQ");

        let static_answer = seo_calculator_note(id);
        for source_id in source_ids {
            assert!(
                static_answer.contains(&format!("data-tv-utility-source=\"{source_id}\"")),
                "{id}: отсутствует разрешённый источник {source_id}"
            );
        }
        assert_eq!(
            static_answer.matches("data-tv-utility-source=").count(),
            source_ids.len(),
            "{id}: SSR должен содержать только source allowlist когорты 6"
        );
    }

    for (id, path, source_ids) in TV_UTILITY_COHORT_7 {
        let cohort_matches = pages
            .iter()
            .filter(|page| page.id == id || page.path == path)
            .collect::<Vec<_>>();
        assert_eq!(
            cohort_matches.len(),
            1,
            "Страница когорты 7 {id} должна иметь один разрешённый canonical"
        );
        let page = cohort_matches[0];
        assert_eq!(page.id, id, "Путь {path} закреплён только за {id}");
        assert_eq!(
            page.path, path,
            "Идентификатор {id} закреплён только за {path}"
        );
        assert_eq!(
            page.kind, "calculator",
            "{id} должен оставаться калькулятором"
        );
        assert!(page.indexable, "{id} должен оставаться индексируемым");
        assert!(
            page.facts.len() >= 6,
            "{id}: требуется не менее шести фактов"
        );
        assert!(page.faq.len() >= 6, "{id}: требуется не менее шести FAQ");

        let static_answer = seo_calculator_note(id);
        for source_id in source_ids {
            assert!(
                static_answer.contains(&format!("data-tv-utility-source=\"{source_id}\"")),
                "{id}: отсутствует разрешённый источник {source_id}"
            );
        }
        assert_eq!(
            static_answer.matches("data-tv-utility-source=").count(),
            source_ids.len(),
            "{id}: SSR должен содержать только source allowlist когорты 7"
        );
        assert_eq!(
            static_answer.matches("data-tv-utility-branch=").count(),
            3,
            "{id}: SSR должен показывать три ограниченных сценария"
        );
        assert!(static_answer.contains("data-tv-utility-stop=\"true\""));
        assert!(static_answer.contains("data-tv-utility-next="));
        assert!(!static_answer.contains("market.yandex"));
        assert!(!static_answer.contains("data-affiliate"));
        assert!(!static_answer.contains('₽'));
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

    let editorial = pages
        .iter()
        .find(|page| page.id == "editorial")
        .expect("Нет страницы редакции");
    assert_eq!(editorial.path, "/redaktsiya/");
    let editorial_text = editorial
        .sections
        .iter()
        .flat_map(|section| section.paragraphs.iter().chain(section.bullets.iter()))
        .cloned()
        .collect::<Vec<_>>()
        .join(" ");
    assert!(
        editorial_text.contains("ИИ и автоматизация")
            && editorial_text.contains("Физический тест")
            && editorial_text.contains("не проводился"),
        "Редакционная страница должна раскрывать автоматизацию и отсутствие физического теста"
    );
    for id in ["about", "methodology"] {
        let page = pages
            .iter()
            .find(|page| page.id == id)
            .unwrap_or_else(|| panic!("Нет доверительной страницы {id}"));
        assert!(
            page.related_links
                .iter()
                .any(|link| link.href == "/redaktsiya/"),
            "Страница {} должна ссылаться на редакцию",
            page.path
        );
    }
}

fn validate_editorial_policy(policy: &EditorialPolicy, trust_pages: &[TrustPage]) {
    assert_eq!(
        policy.schema_version, 1,
        "Неподдерживаемая версия editorial policy"
    );
    assert_eq!(policy.author.name, "Редакция KREPI TV");
    assert_eq!(policy.author.path, "/redaktsiya/");
    assert_eq!(policy.corrections_path, "/kontakty/");
    assert_eq!(policy.methodology_path, "/metodika/");
    assert!(is_valid_iso_date(&policy.updated_at));
    assert_eq!(policy.physical_test.status, "not_tested");
    assert_eq!(policy.physical_test.label, "Физический тест не проводился");
    assert!(
        policy.automation_disclosure.contains("ИИ")
            && policy
                .automation_disclosure
                .contains("не считаются источником"),
        "Editorial policy должна раскрывать роль автоматизации"
    );
    assert!(
        policy.source_policy.contains("официальные") && policy.source_policy.contains("расчёты"),
        "Editorial policy должна описывать доказательную базу"
    );
    assert!(
        policy.physical_test.explanation.contains("не заявляет")
            && policy.physical_test.explanation.contains("доказательств"),
        "Editorial policy должна закрывать неподтверждённые физические тесты"
    );
    assert!(
        trust_pages
            .iter()
            .any(|page| page.path == policy.author.path && page.id == "editorial"),
        "Публичная сущность автора должна иметь доверительную страницу"
    );
    let public_contract = format!(
        "{} {} {} {} {}",
        policy.author.name,
        policy.author.role,
        policy.automation_disclosure,
        policy.source_policy,
        policy.physical_test.explanation
    )
    .to_lowercase();
    for unsupported_claim in [
        "сертифицированный монтажник",
        "инженер по установке",
        "лично установил",
        "испытано редакцией",
    ] {
        assert!(
            !public_contract.contains(unsupported_claim),
            "Editorial policy содержит неподтверждённое утверждение: {unsupported_claim}"
        );
    }
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

fn contains_verified_compatibility_count(value: &str, count: usize) -> bool {
    value
        .split(['.', ';', '!', '?'])
        .map(str::to_lowercase)
        .any(|segment| {
            contains_number_token(&segment, count)
                && [
                    "совместим",
                    "кронштейн",
                    "креплен",
                    "модел",
                    "кандидат",
                    "провер",
                ]
                .iter()
                .any(|marker| segment.contains(marker))
        })
}

fn exact_metric_screw_claims(value: &str) -> Vec<(String, u32)> {
    let characters = value.chars().collect::<Vec<_>>();
    let mut claims = Vec::new();

    for (separator, character) in characters.iter().enumerate() {
        if *character != '×' {
            continue;
        }
        let mut thread_start = separator;
        while thread_start > 0 && characters[thread_start - 1].is_ascii_digit() {
            thread_start -= 1;
        }
        if thread_start == separator
            || thread_start == 0
            || !matches!(characters[thread_start - 1], 'M' | 'm')
        {
            continue;
        }
        let thread = characters[thread_start..separator]
            .iter()
            .collect::<String>();
        let thread = format!("M{thread}");

        let mut length_end = separator + 1;
        while length_end < characters.len() && characters[length_end].is_ascii_digit() {
            length_end += 1;
        }
        if length_end == separator + 1 {
            continue;
        }
        let length = characters[separator + 1..length_end]
            .iter()
            .collect::<String>()
            .parse::<u32>()
            .expect("Длина винта состоит только из цифр");
        claims.push((thread.clone(), length));

        if characters.get(length_end) == Some(&'/') {
            let alternate_start = length_end + 1;
            let mut alternate_end = alternate_start;
            while alternate_end < characters.len() && characters[alternate_end].is_ascii_digit() {
                alternate_end += 1;
            }
            if alternate_end > alternate_start {
                let alternate = characters[alternate_start..alternate_end]
                    .iter()
                    .collect::<String>()
                    .parse::<u32>()
                    .expect("Альтернативная длина винта состоит только из цифр");
                claims.push((thread, alternate));
            }
        }
    }

    claims
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
        33,
        "SEO-серия должна содержать ровно 33 проверенных профиля"
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
        "model:lg-oled55c5rla",
        "model:samsung-qe43q7faauxru",
        "model:samsung-qe50q7faauxru",
        "model:samsung-ue32f6000fuxru",
        "model:hisense-65u8q",
        "model:hisense-65u7q",
        "model:hisense-65ur9s",
        "model:tcl-55p6k",
        "model:tcl-55p7k",
        "model:tcl-43s5k",
        "model:tuvio-td100ufbhh12",
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
        if let Some(updated_at) = &profile.updated_at {
            assert!(
                is_valid_iso_date(updated_at),
                "Некорректная дата обновления SEO-профиля {key}"
            );
            assert!(
                updated_at <= &file.updated_at,
                "Дата SEO-профиля {key} не может быть новее даты набора"
            );
        }
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

        if profile.entity_kind == "model" {
            let tv = models
                .iter()
                .find(|tv| tv.id == profile.entity_id)
                .expect("Модель SEO-профиля уже должна быть проверена");
            let allowed_exact_screws = tv
                .wall_mount_screws
                .as_ref()
                .map(|screws| {
                    screws
                        .groups
                        .iter()
                        .filter_map(|group| {
                            group.length_mm.map(|length| (group.thread.clone(), length))
                        })
                        .collect::<HashSet<_>>()
                })
                .unwrap_or_default();
            let profile_text = format!(
                "{} {} {}",
                profile.title, profile.description, profile.answer
            );
            for claim in exact_metric_screw_claims(&profile_text) {
                assert!(
                    allowed_exact_screws.contains(&claim),
                    "SEO-профиль {key} заявляет неподтверждённый точный винт {}×{}",
                    claim.0,
                    claim.1
                );
            }
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
                && contains_verified_compatibility_count(&profile.answer, verified_count)
                && contains_verified_compatibility_count(&profile.description, verified_count),
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
    let generated_model_pages = web.join("modeli");
    if generated_model_pages.exists() {
        fs::remove_dir_all(&generated_model_pages)
            .expect("Не удалось удалить устаревшие сгенерированные страницы моделей");
    }
    let public_data = web.join("public/data");
    fs::create_dir_all(&public_data).expect("Не удалось создать каталог публичных данных");

    let models: Vec<TvModel> = read_json(&data.join("tv_models.json"));
    let market_models: MarketTvModelsFile = read_json(&data.join("market_tv_models.json"));
    let mounts: Vec<Mount> = read_json(&data.join("mounts.json"));
    let seo_pages: Vec<SeoPage> = read_json(&data.join("seo_pages.json"));
    let trust_pages: Vec<TrustPage> = read_json(&data.join("trust_pages.json"));
    let editorial_policy: EditorialPolicy = read_json(&data.join("editorial_policy.json"));
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
    validate_market_models(&market_models, &models);
    validate_mounts(&mounts);
    validate_seo_pages(&seo_pages);
    validate_trust_pages(&trust_pages);
    validate_editorial_policy(&editorial_policy, &trust_pages);
    validate_commercial_profiles(&commercial_profiles, &models, &mounts, &compatibility_graph);

    for tv in &models {
        write(
            &web.join("public")
                .join(model_technical_image_path(tv).trim_start_matches('/')),
            &model_technical_image_svg(tv),
        );
    }
    for mount in &mounts {
        write(
            &web.join("public")
                .join(mount_technical_image_path(mount).trim_start_matches('/')),
            &mount_technical_image_svg(mount),
        );
    }

    fs::copy(
        data.join("tv_models.json"),
        public_data.join("tv-models.json"),
    )
    .expect("Не удалось скопировать модели телевизоров");
    fs::copy(
        root.join("datasets/ru-tv-vesa-sizes/v1/tv-vesa-sizes.csv"),
        public_data.join("tv-vesa-sizes.csv"),
    )
    .expect("Не удалось скопировать открытый CSV с VESA");
    fs::copy(
        root.join("datasets/ru-tv-vesa-sizes/v1/tv-vesa-sizes.json"),
        public_data.join("tv-vesa-sizes.json"),
    )
    .expect("Не удалось скопировать открытый JSON с VESA");
    fs::copy(
        data.join("market_tv_models.json"),
        public_data.join("market-tv-models.json"),
    )
    .expect("Не удалось скопировать наблюдаемые модели Маркета");
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
        data.join("editorial_policy.json"),
        public_data.join("editorial-policy.json"),
    )
    .expect("Не удалось скопировать редакционную политику");
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
    write_model_offer_shards(
        &data.join("affiliate/public-model-offers.json"),
        &public_data.join("affiliate-model-offers"),
        &models,
    );

    let mut search = models
        .iter()
        .map(|tv| SearchItem {
            id: tv.id.clone(),
            title: tv.title.clone(),
            brand: tv.brand.clone(),
            model: tv.model.clone(),
            href: format!("/modeli/{}/", tv.id),
            search: format!("{} {} {}", tv.brand, tv.model, tv.title).to_lowercase(),
        })
        .collect::<Vec<_>>();
    search.extend(
        market_models
            .records
            .iter()
            .filter(|model| model.page_kind == "observed")
            .map(|model| SearchItem {
                id: model.id.clone(),
                title: model.title.clone(),
                brand: model.brand.clone(),
                model: model.model.clone(),
                href: model.route_path.clone(),
                search: format!(
                    "{} {} {} {}",
                    model.brand, model.model, model.title, model.market_title
                )
                .to_lowercase(),
            }),
    );
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

    write(&web.join("404.html"), &not_found_page_html());

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
            "Модели телевизоров из проверенной базы и актуальной выдачи Маркета: точные паспорта там, где подтверждены VESA и масса, и безопасная ручная проверка для остальных.",
            "https://krepitv.ru/modeli/",
            "models-catalog",
            None,
            Some(&models_catalog_body(&models, &market_models.records)),
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

    write(
        &web.join("spravochnik/index.html"),
        &html_shell(
            "Справочник по телевизорам и креплениям — KREPI TV",
            "Инструкции, калькуляторы и таблицы для проверки телевизора, VESA, кронштейна и безопасного монтажа.",
            "https://krepitv.ru/spravochnik/",
            "guide-index",
            None,
            Some(&guide_index_body(&seo_pages)),
            HeadExtras {
                robots: None,
                json_ld: &breadcrumb_json_ld(&[
                    ("Главная", "https://krepitv.ru/"),
                    ("Справочник", "https://krepitv.ru/spravochnik/"),
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
                    "Совместимые кронштейны для {}: VESA {}×{}, паспортная масса {} кг. Проверка по данным производителя.",
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

    for model in market_models
        .records
        .iter()
        .filter(|model| model.page_kind != "verified")
    {
        let canonical = format!("https://krepitv.ru{}", model.canonical_path);
        let title = if model.page_kind == "alias" {
            format!(
                "{}: карточка из выдачи №{} — KREPI TV",
                model.title, model.observed_rank
            )
        } else {
            format!(
                "Проверка крепления для {}: VESA и вес — KREPI TV",
                model.title
            )
        };
        let description = format!(
            "Как безопасно подобрать кронштейн для {}: сверка точной модели, VESA, массы без подставки и размеров экрана. Без выдуманных характеристик.",
            model.title
        );
        let structured_data = breadcrumb_json_ld(&[
            ("Главная", "https://krepitv.ru/"),
            ("Модели телевизоров", "https://krepitv.ru/modeli/"),
            (&model.title, &canonical),
        ]);
        let route_id = model
            .route_path
            .trim_start_matches("/modeli/")
            .trim_end_matches('/');
        write(
            &web.join(format!("modeli/{route_id}/index.html")),
            &html_shell(
                &title,
                &description,
                &canonical,
                "market-model",
                Some(&model.id),
                Some(&observed_model_page_body(model)),
                HeadExtras {
                    robots: if model.indexable {
                        None
                    } else {
                        Some("noindex,follow")
                    },
                    json_ld: &structured_data,
                },
            ),
        );
    }

    // These routes were published while the Market observation did not yet
    // carry a source-backed exact SKU. Keep them as full noindex aliases after
    // promotion so bookmarks and crawler history do not turn into 404 pages.
    for (legacy_id, verified_id) in LEGACY_VERIFIED_MODEL_ROUTES {
        let tv = models
            .iter()
            .find(|model| model.id == verified_id)
            .expect("Legacy model alias must resolve to a verified model");
        let commercial_profile =
            commercial_profile_for(&commercial_profiles.profiles, "model", &tv.id);
        let title = format!(
            "Крепление для {}: VESA {}×{} — прежний адрес",
            tv.title, tv.vesa_width_mm, tv.vesa_height_mm
        );
        let description = format!(
            "Совместимые кронштейны для {}: VESA {}×{}, паспортная масса {} кг. Проверка по данным производителя.",
            tv.title, tv.vesa_width_mm, tv.vesa_height_mm, tv.weight_kg
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
            &web.join(format!("modeli/{legacy_id}/index.html")),
            &html_shell(
                &title,
                &description,
                &canonical,
                "model",
                Some(&tv.id),
                Some(&static_body),
                HeadExtras {
                    robots: Some("noindex,follow"),
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
        let breadcrumb = breadcrumb_json_ld(&[
            ("Главная", "https://krepitv.ru/"),
            ("Справочник", "https://krepitv.ru/spravochnik/"),
            (&page.h1, &canonical),
        ]);
        let dataset = dataset_json_ld(&page.id, &canonical).unwrap_or_default();
        let evidence_guide = seo_evidence_guide_json_ld(page, &canonical).unwrap_or_default();
        let structured_data = format!("{breadcrumb}{dataset}{evidence_guide}");
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
    assert!(
        is_valid_iso_date(MODEL_PAGES_UPDATED_AT),
        "Некорректная дата обновления модельных страниц"
    );
    assert!(
        is_valid_iso_date(MARKET_MODELS_UPDATED_AT)
            && market_models
                .records
                .iter()
                .all(|model| model.checked_at.as_str() <= MARKET_MODELS_UPDATED_AT),
        "Дата каталога Маркета старше зависимых карточек"
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
            MARKET_MODELS_UPDATED_AT.to_string(),
        ),
        (
            "https://krepitv.ru/kronshteyny/".to_string(),
            CORE_PAGES_UPDATED_AT.to_string(),
        ),
        (
            "https://krepitv.ru/spravochnik/".to_string(),
            "2026-08-10".to_string(),
        ),
    ];
    urls.extend(
        models
            .iter()
            .filter(|tv| is_indexable_model(&tv.id, &compatibility_graph))
            .map(|tv| {
                let mut lastmod = tv.checked_at.as_str().max(MODEL_PAGES_UPDATED_AT);
                if let Some(hardware) = &tv.wall_mount_screws {
                    lastmod = lastmod.max(hardware.checked_at.as_str());
                }
                if let Some(profile) =
                    commercial_profile_for(&commercial_profiles.profiles, "model", &tv.id)
                {
                    lastmod =
                        lastmod.max(commercial_profile_updated_at(&commercial_profiles, profile));
                }
                (
                    format!("https://krepitv.ru/modeli/{}/", tv.id),
                    lastmod.to_string(),
                )
            }),
    );
    urls.extend(
        market_models
            .records
            .iter()
            .filter(|model| model.page_kind == "observed" && model.indexable)
            .map(|model| {
                (
                    format!("https://krepitv.ru{}", model.route_path),
                    model.checked_at.clone(),
                )
            }),
    );
    urls.extend(
        mounts
            .iter()
            .filter(|mount| is_indexable_mount(&mount.id, &compatibility_graph))
            .map(|mount| {
                let lastmod = if let Some(profile) =
                    commercial_profile_for(&commercial_profiles.profiles, "mount", &mount.id)
                {
                    mount
                        .checked_at
                        .as_str()
                        .max(commercial_profile_updated_at(&commercial_profiles, profile))
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
    let image_sitemap_urls = models
        .iter()
        .map(|tv| {
            format!(
                "  <url><loc>https://krepitv.ru/modeli/{id}/</loc><image:image><image:loc>https://krepitv.ru{image}</image:loc><image:title>Техническая схема VESA {title}</image:title></image:image></url>",
                id = escape_html(&tv.id),
                image = escape_html(&model_technical_image_path(tv)),
                title = escape_html(&tv.title),
            )
        })
        .chain(mounts.iter().map(|mount| {
            format!(
                "  <url><loc>https://krepitv.ru/kronshteyny/{id}/</loc><image:image><image:loc>https://krepitv.ru{image}</image:loc><image:title>Техническая схема кронштейна {title}</image:title></image:image></url>",
                id = escape_html(&mount.id),
                image = escape_html(&mount_technical_image_path(mount)),
                title = escape_html(&mount.title),
            )
        }))
        .collect::<Vec<_>>()
        .join("\n");
    write(
        &web.join("public/image-sitemap.xml"),
        &format!(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">\n{image_sitemap_urls}\n</urlset>\n"
        ),
    );
    write(
        &web.join("public/robots.txt"),
        "User-agent: *\nAllow: /\n\nSitemap: https://krepitv.ru/sitemap.xml\nSitemap: https://krepitv.ru/image-sitemap.xml\n",
    );

    println!("Сгенерировано страниц: {}", urls.len());
}

fn model_offer_shard_key(model_id: &str) -> &str {
    let key = if model_id
        .strip_prefix("samsung-qe")
        .is_some_and(|rest| rest.starts_with(|character: char| character.is_ascii_digit()))
    {
        "samsung-qe"
    } else if model_id
        .strip_prefix("samsung-ue")
        .is_some_and(|rest| rest.starts_with(|character: char| character.is_ascii_digit()))
    {
        "samsung-ue"
    } else {
        model_id.split('-').next().unwrap_or_default()
    };
    assert!(
        key.len() >= 2
            && key.len() <= 40
            && !key.starts_with('-')
            && !key.ends_with('-')
            && !key.contains("--")
            && key
                .bytes()
                .all(|byte| { byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-' }),
        "Идентификатор модели не даёт безопасный ключ шарда: {model_id}"
    );
    key
}

fn write_model_offer_shards(source: &Path, target: &Path, models: &[TvModel]) {
    let snapshot: Value = read_json(source);
    let schema_version = snapshot
        .get("schema_version")
        .and_then(Value::as_u64)
        .expect("Публичный снимок моделей не содержит schema_version");
    let generated_at = snapshot
        .get("generated_at")
        .and_then(Value::as_str)
        .expect("Публичный снимок моделей не содержит generated_at");
    let placements = snapshot
        .get("placements")
        .and_then(Value::as_array)
        .expect("Публичный снимок моделей не содержит placements");

    if target.exists() {
        fs::remove_dir_all(target).expect("Не удалось очистить старые шарды модельных офферов");
    }
    fs::create_dir_all(target).expect("Не удалось создать каталог шардов модельных офферов");

    let mut keys = models
        .iter()
        .map(|model| model_offer_shard_key(&model.id).to_string())
        .collect::<Vec<_>>();
    keys.sort();
    keys.dedup();

    for placement in placements {
        let model_id = placement
            .get("model_id")
            .and_then(Value::as_str)
            .expect("Размещение не содержит model_id");
        let key = model_offer_shard_key(model_id);
        assert!(
            keys.binary_search_by(|candidate| candidate.as_str().cmp(key))
                .is_ok(),
            "Размещение ссылается на неизвестный шард модели: {model_id}"
        );
    }

    for key in keys {
        let shard_placements = placements
            .iter()
            .filter(|placement| {
                placement
                    .get("model_id")
                    .and_then(Value::as_str)
                    .is_some_and(|model_id| model_offer_shard_key(model_id) == key)
            })
            .cloned()
            .collect::<Vec<_>>();
        let shard = json!({
            "schema_version": schema_version,
            "generated_at": generated_at,
            "placements": shard_placements,
        });
        write(
            &target.join(format!("{key}.json")),
            &serde_json::to_string_pretty(&shard).expect("Шард модельных офферов сериализуется"),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::{
        CommercialProfilesFile, EditorialPolicy, HeadExtras, MarketTvModelsFile,
        PublicAffiliateSnapshot, SEO_FUNNEL_UPDATED_AT, SeoPage, TV_UTILITY_COHORT_6,
        TV_UTILITY_COHORT_7, TrustPage, TvModel, VESA_DATASET_RELEASE_URL,
        affiliate_offer_placeholder_html, brand_catalog_html, build_compatibility_graph,
        commercial_profile_for, contains_verified_compatibility_count, dataset_json_ld,
        escape_html, exact_metric_screw_claims, home_page_body, html_shell, is_indexable_model,
        is_indexable_mount, is_indexable_seo_page, is_publishable_affiliate_offer,
        is_valid_iso_date, json_ld_script, market_mount_search_href, matcher_page_body,
        model_mount_matches, model_offer_shard_key, model_page_body, mount_page_body,
        mount_technical_scheme_html, mounts_catalog_body, not_found_page_html,
        observed_model_page_body, parse_rfc3339_utc_seconds, read_json, related_seo_pages,
        russian_plural_label, seo_brand_mount_matcher_html, seo_buy_mount_comparison_html,
        seo_calculator_note, seo_catalog_html, seo_evidence_guide_json_ld, seo_page_body,
        seo_page_kind_label, seo_page_lastmod, seo_screw_catalog_html, seo_vesa_model_catalog_html,
        static_footer, static_header, trust_page_body, tv_product_json_ld,
        validate_commercial_profiles, validate_editorial_policy, validate_market_models,
        validate_seo_pages, validate_trust_pages, wall_mount_screws_html, workspace_root,
    };
    use krepitv_engine::Mount;
    use serde_json::json;
    use std::collections::HashSet;

    #[test]
    fn escapes_html_attributes() {
        assert_eq!(
            escape_html("<ТВ & \"стена\">"),
            "&lt;ТВ &amp; &quot;стена&quot;&gt;"
        );
    }

    #[test]
    fn screw_length_cannot_mask_a_wrong_compatibility_count() {
        let text = "Сверху 2 винта M6×17. В графе подтверждены 15 совместимых кронштейнов.";
        assert!(!contains_verified_compatibility_count(text, 17));
        assert!(contains_verified_compatibility_count(text, 15));
    }

    #[test]
    fn exact_screw_claim_parser_ignores_vesa_and_keeps_shorthand_lengths() {
        assert_eq!(
            exact_metric_screw_claims("VESA 300×300; M6×16/12 и ошибочный M6×17"),
            vec![
                ("M6".to_string(), 16),
                ("M6".to_string(), 12),
                ("M6".to_string(), 17),
            ]
        );
    }

    #[test]
    fn model_offer_shards_use_only_safe_brand_keys() {
        assert_eq!(model_offer_shard_key("tcl-65c7k"), "tcl");
        assert_eq!(model_offer_shard_key("lg-oled65c5rla"), "lg");
        assert_eq!(model_offer_shard_key("samsung-qe55q7faauxru"), "samsung-qe");
        assert_eq!(
            model_offer_shard_key("samsung-ue55u8000fuxru"),
            "samsung-ue"
        );
        assert!(std::panic::catch_unwind(|| model_offer_shard_key("TCL-65C7K")).is_err());
        assert!(std::panic::catch_unwind(|| model_offer_shard_key("../tcl-65c7k")).is_err());
    }

    #[test]
    fn every_market_observation_resolves_without_invented_mount_facts() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let manifest: MarketTvModelsFile = read_json(&root.join("data/market_tv_models.json"));
        validate_market_models(&manifest, &models);

        assert_eq!(manifest.records.len(), 133);
        for model in manifest
            .records
            .iter()
            .filter(|model| model.page_kind != "verified")
        {
            let body = observed_model_page_body(model);
            assert!(body.contains("data-market-model-page=\"true\""));
            assert!(body.contains("Как подобрать кронштейн без ошибки"));
            assert!(body.contains(&escape_html(&model.market_url)));
            assert!(!body.contains("data-affiliate-offer-id="));
            assert!(!body.contains("Product\""));
        }
    }

    #[test]
    fn russian_404_is_useful_noindex_and_keeps_required_routes() {
        let html = not_found_page_html();

        assert!(html.contains("<html lang=\"ru\">"));
        assert!(html.contains("<meta name=\"robots\" content=\"noindex,follow\">"));
        assert!(html.contains("<link rel=\"canonical\" href=\"https://krepitv.ru/404.html\">"));
        assert!(html.contains("data-page-kind=\"not-found\""));
        assert!(html.contains("data-not-found-page=\"true\""));
        assert!(html.contains("Страница не найдена"));
        assert!(html.contains("BreadcrumbList"));
        for route in ["/podbor/", "/modeli/", "/vesa/"] {
            assert!(html.contains(&format!("href=\"{route}\"")));
        }
        assert!(!html.contains("market.yandex"));
        assert!(!html.contains("Партнёрская ссылка"));
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
        assert!(static_footer().contains("href=\"/redaktsiya/\">Редакция</a>"));
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
    fn trust_pages_and_editorial_policy_are_valid() {
        let root = workspace_root();
        let pages: Vec<TrustPage> = read_json(&root.join("data/trust_pages.json"));
        let policy: EditorialPolicy = read_json(&root.join("data/editorial_policy.json"));

        validate_trust_pages(&pages);
        validate_editorial_policy(&policy, &pages);
        assert!(
            pages
                .iter()
                .any(|page| page.id == "editorial" && page.path == policy.author.path)
        );
        let editorial = pages
            .iter()
            .find(|page| page.id == "editorial")
            .expect("Нет страницы редакции");
        let editorial_body = trust_page_body(editorial);
        assert!(editorial_body.contains("aria-labelledby=\"trust-related-title\""));
        assert!(editorial_body.contains("id=\"trust-related-title\""));
        assert!(editorial_body.contains("focus:ring-2 focus:ring-action focus:ring-offset-2"));
        assert!(editorial_body.contains("class=\"size-8 text-action\""));
        assert!(editorial_body.contains("class=\"size-5 shrink-0\""));
    }

    #[test]
    fn editorial_accountability_is_prerendered_for_all_content_families() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let mounts: Vec<Mount> = read_json(&root.join("data/mounts.json"));
        let market_models: MarketTvModelsFile = read_json(&root.join("data/market_tv_models.json"));
        let seo_pages: Vec<SeoPage> = read_json(&root.join("data/seo_pages.json"));
        let graph = build_compatibility_graph(&models, &mounts);
        let tv = &models[0];
        let mount = &mounts[0];
        let observed = market_models
            .records
            .iter()
            .find(|model| model.page_kind == "observed")
            .expect("Нет наблюдаемой модели");
        let guide_page = seo_pages
            .iter()
            .find(|page| page.guide.is_some())
            .expect("Нет SEO-страницы с evidence guide");
        let matches = model_mount_matches(tv, &mounts);
        let bodies = [
            model_page_body(tv, &matches, &[], 0, &seo_pages, None),
            mount_page_body(mount, &models, &graph, &[], 0, None),
            observed_model_page_body(observed),
            seo_page_body(guide_page, &seo_pages, &models, &mounts, &graph),
        ];

        for body in bodies {
            assert!(body.contains("data-editorial-accountability=\"true\""));
            assert!(body.contains("href=\"/redaktsiya/\">Редакция KREPI TV"));
            assert!(body.contains("Физический тест не проводился"));
            assert!(body.contains("href=\"/metodika/\""));
            assert_eq!(
                body.matches("class=\"size-4 shrink-0 text-action\"")
                    .count(),
                4
            );
            assert!(body.contains("class=\"group border-x border-b border-ink"));
            assert!(body.contains("focus-visible:ring-2 focus-visible:ring-action"));
            assert!(body.contains("group-open:rotate-45\">+</span>"));
        }

        let mount_body = mount_page_body(mount, &models, &graph, &[], 0, None);
        assert!(
            mount_body.find("data-editorial-accountability").unwrap()
                < mount_body.find("data-market-mount-section").unwrap()
        );

        let guide_json_ld = seo_evidence_guide_json_ld(
            guide_page,
            &format!("https://krepitv.ru{}", guide_page.path),
        )
        .expect("Нет Article/HowTo JSON-LD");
        assert!(guide_json_ld.contains("\"name\":\"Редакция KREPI TV\""));
        assert!(guide_json_ld.contains("\"url\":\"https://krepitv.ru/redaktsiya/\""));
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
            guide: None,
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
        assert!(sizes.contains("KREPI-TV-RU-VESA-SIZES-2.2.0"));
        assert!(sizes.contains("\"version\":\"2.2.0\""));
        assert!(sizes.contains("datasets-v2.2.0/tv-vesa-sizes.csv"));
        assert!(sizes.contains("tv-vesa-sizes.csv"));
        assert!(sizes.contains("tv-vesa-sizes.json"));
        assert!(screws.contains("KREPI-TV-RU-VESA-SCREWS-1.1.0"));
        assert!(screws.contains("\"version\":\"1.1.0\""));
        assert!(screws.contains("datasets-v1.1.0/tv-vesa-screws.csv"));
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
        assert_eq!(sourced.len(), 27);
        let expected_passport_ids = [
            "candy-uno-32",
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
            "Моделей с паспортом</dt><dd class=\"mt-1 font-display text-3xl font-extrabold\">27"
        ));
        assert!(
            catalog_html.contains(&format!("data-searchable-model-count=\"{}\"", models.len()))
        );
        assert!(catalog_html.contains(&format!("data-model-search-count=\"{}\"", models.len())));
        assert_eq!(catalog_html.matches("<option value=").count(), models.len());
        assert!(catalog_html.contains("data-known-model-fallback=\"true\""));
        assert!(catalog_html.contains("паспорт винтов ещё не подтверждён"));
        assert!(
            catalog_html.contains(
                "https://github.com/jimbokl/krepitv/releases/download/datasets-v1.1.0/tv-vesa-screws.csv"
            )
        );
        assert_eq!(catalog_html.matches("<details").count(), 4);
        assert_eq!(catalog_html.matches("Совместимые кронштейны →").count(), 27);
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
        assert!(html.contains(&format!("data-searchable-model-count=\"{}\"", models.len())));
        assert!(html.contains(&format!(
            "data-vesa-model-search-count=\"{}\"",
            models.len()
        )));
        assert_eq!(html.matches("<option value=").count(), models.len());
        assert_eq!(
            html.matches("<details").count(),
            models
                .iter()
                .map(|model| model.brand.as_str())
                .collect::<std::collections::HashSet<_>>()
                .len()
        );
        assert!(html.contains("Таблица VESA телевизоров"));
        assert!(html.contains("href=\"/data/tv-vesa-sizes.csv\""));
        assert!(html.contains("GitHub release 2.2.0"));
        assert!(html.contains(VESA_DATASET_RELEASE_URL));
        assert!(html.contains("data-vesa-source-conflict=\"true\""));
        assert!(html.contains("Источники расходятся: 400×300 мм / 400×400 мм"));
        assert!(!html.contains("market.yandex.ru"));

        for model in &models {
            assert!(html.contains(&format!("href=\"/modeli/{}/\"", model.id)));
            assert!(html.contains(&escape_html(&model.source_url)));
        }
    }

    #[test]
    fn home_prioritizes_one_evidence_backed_model_without_listing_every_model() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let pages: Vec<SeoPage> = read_json(&root.join("data/seo_pages.json"));
        let html = home_page_body(&models, &pages);

        assert_eq!(html.matches("data-featured-traffic-tool=").count(), 9);
        for id in [
            "phone-to-tv",
            "tv-no-signal",
            "tv-firmware-update",
            "tv-dimensions",
            "tv-app-install",
            "wall-planner",
            "tv-factory-reset",
            "laptop-to-tv",
            "digital-channels",
        ] {
            assert!(html.contains(&format!("data-featured-traffic-tool=\"{id}\"")));
        }
        assert!(html.contains("grid gap-px border border-line bg-line sm:grid-cols-3"));
        assert!(html.contains("data-home-tv-diagnostics=\"true\""));
        assert_eq!(html.matches("data-home-tv-diagnostic=").count(), 9);
        for id in [
            "tv-wont-turn-on",
            "tv-freezes",
            "tv-dark-screen",
            "tv-sound-no-picture",
            "tv-no-sound",
            "tv-remote-not-working",
            "tv-turns-off",
            "tv-no-internet",
            "tv-usb-not-seen",
        ] {
            assert!(html.contains(&format!("data-home-tv-diagnostic=\"{id}\"")));
        }
        assert!(html.contains(&format!("Точные модели с источниками · {}", models.len())));
        assert!(html.contains("href=\"/modeli/\""));
        assert!(html.contains("href=\"/kronshteyny/\""));
        for model in &models {
            let occurrences = html
                .matches(&format!("href=\"/modeli/{}/\"", model.id))
                .count();
            assert_eq!(occurrences, usize::from(model.id == "tcl-65c7k"));
        }
        assert_eq!(html.matches("data-home-model-spotlight=").count(), 1);
        assert!(html.contains("data-home-model-spotlight=\"tcl-65c7k\""));
    }

    #[test]
    fn matcher_starts_with_brand_then_model_without_phantom_selection() {
        let models: Vec<TvModel> = read_json(&workspace_root().join("data/tv_models.json"));
        let html = matcher_page_body(&models);
        let brand_count = models
            .iter()
            .map(|model| model.brand.as_str())
            .collect::<HashSet<_>>()
            .len();

        assert!(html.contains("data-guided-brand-step-static=\"true\""));
        assert!(html.contains("data-guided-model-step-static=\"true\""));
        assert!(html.contains("Шаг 1 из 4"));
        assert!(html.contains("Сначала выберите марку телевизора"));
        assert!(html.contains("id=\"static-guided-model\""));
        assert!(html.contains("Сначала выберите марку</option>"));
        assert!(
            html.find("id=\"static-guided-brand\"").unwrap()
                < html.find("id=\"static-guided-model\"").unwrap()
        );
        assert_eq!(
            html.matches("data-guided-brand-option=\"true\"").count(),
            brand_count
        );
        assert!(html.contains(&format!("data-guided-brand-count=\"{brand_count}\"")));
        assert!(!html.contains("Результат для модели"));
        for model in &models {
            assert!(html.contains(&format!("href=\"/modeli/{}/\"", model.id)));
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
    fn tv_diagnostics_cohort_4_is_unique_static_first_source_backed_and_non_commercial() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let expected = [
            ("tv-turns-off", "/televizor-sam-vyklyuchaetsya/", 4),
            (
                "tv-no-internet",
                "/televizor-ne-podklyuchaetsya-k-internetu/",
                3,
            ),
            ("tv-usb-not-seen", "/televizor-ne-vidit-fleshku/", 2),
        ];

        for (id, path, source_count) in expected {
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
                source_count
            );
            assert!(static_answer.contains("data-tv-diagnostic-stop=\"true\""));

            let html = seo_page_body(page, &pages, &[], &[], &[]);
            assert_eq!(html.matches("<h1").count(), 1);
            assert!(html.contains("Связанные материалы"));
            assert!(!html.contains("market.yandex"));
            assert!(!html.contains("data-affiliate"));
            assert!(!html.contains("₽"));
        }

        let internet = seo_calculator_note("tv-no-internet");
        assert!(internet.contains("не запрашивает название сети, пароль, IP- или MAC-адрес"));
        assert!(!internet.contains("8.8.8.8"));
        assert!(!internet.contains("Сбросьте роутер"));

        let usb = seo_calculator_note("tv-usb-not-seen");
        assert!(usb.contains("Не форматируйте и не регистрируйте накопитель"));
        assert!(usb.contains("обычной USB-флешке"));
        assert!(!usb.contains("Отформатируйте"));

        let turns_off = seo_calculator_note("tv-turns-off");
        assert!(turns_off.contains("При запахе гари, дыме, искрах"));
        for required_safety_term in [
            "красном мигающем индикаторе",
            "повреждённых, горячих или мокрых доступных",
            "кабеле, вилке или розетке",
            "Не касайтесь кабеля, вилки или розетки",
            "не снимайте и не сдвигайте настенный телевизор",
        ] {
            assert!(
                turns_off.contains(required_safety_term),
                "SSR не содержит обязательную границу: {required_safety_term}"
            );
        }
        assert!(!turns_off.contains("блок питания"));
        assert!(!turns_off.contains("материнская плата"));
    }

    #[test]
    fn tv_utility_cohort_5_is_unique_static_first_source_backed_and_non_commercial() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        let expected = [
            (
                "soundbar-to-tv",
                "/kak-podklyuchit-saundbar-k-televizoru/",
                3,
            ),
            ("screen-cleaning", "/chem-protirat-ekran-televizora/", 2),
            (
                "smart-tv-box",
                "/kak-podklyuchit-smart-tv-pristavku-k-televizoru/",
                3,
            ),
        ];

        for (id, path, source_count) in expected {
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
            assert!(static_answer.contains(&format!("data-tv-utility-answer=\"{id}\"")));
            assert!(static_answer.contains(&format!("data-tv-utility-task=\"{id}\"")));
            assert_eq!(static_answer.matches("data-tv-utility-branch=").count(), 3);
            assert_eq!(
                static_answer.matches("data-tv-utility-source=").count(),
                source_count
            );
            assert!(static_answer.contains("data-tv-utility-stop=\"true\""));
            assert!(static_answer.contains("data-tv-utility-next="));

            let html = seo_page_body(page, &pages, &[], &[], &[]);
            assert_eq!(html.matches("<h1").count(), 1);
            assert!(html.contains("Связанные материалы"));
            assert!(!html.contains("market.yandex"));
            assert!(!html.contains("data-affiliate"));
            assert!(!html.contains('₽'));
        }

        let soundbar = seo_calculator_note("soundbar-to-tv");
        assert!(soundbar.contains("Обычный HDMI без подписи ARC или eARC не подтверждает"));
        assert!(soundbar.contains("повреждено, горячее, болтается или намокло"));
        assert!(!soundbar.contains("Любой HDMI"));
        assert!(!soundbar.contains("гарантирует управление одним пультом"));

        let cleaning = seo_calculator_note("screen-cleaning");
        assert!(cleaning.contains("сухой мягкой микрофибры"));
        assert!(cleaning.contains("не распыляют прямо на экран"));
        assert!(cleaning.contains("руководством точной модели"));
        assert!(!cleaning.contains("Используйте спирт"));
        assert!(!cleaning.contains("соскоблите"));

        let smart_box = seo_calculator_note("smart-tv-box");
        assert!(smart_box.contains("HDMI-выход приставки"));
        assert!(smart_box.contains("четыре независимых этапа"));
        assert!(smart_box.contains("питании приставки от USB не заменяет её инструкцию"));
        assert!(!smart_box.contains("Подойдёт любой переходник"));
        assert!(!smart_box.contains("питайте от любого USB"));

        for (from, to) in [
            ("tv-no-sound", "soundbar-to-tv"),
            ("picture-setup", "screen-cleaning"),
            ("tv-no-internet", "smart-tv-box"),
        ] {
            let source = pages
                .iter()
                .find(|page| page.id == from)
                .expect("страница для входящей перелинковки");
            assert!(
                related_seo_pages(source, &pages)
                    .iter()
                    .any(|page| page.id == to),
                "{from} должен ссылаться на {to}"
            );
        }
    }

    #[test]
    fn tv_utility_cohort_6_is_allowlisted_static_first_source_backed_and_non_commercial() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        validate_seo_pages(&pages);

        for (id, path, source_ids) in TV_UTILITY_COHORT_6 {
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
            assert_eq!(seo_page_lastmod(page), SEO_FUNNEL_UPDATED_AT);

            let static_answer = seo_calculator_note(id);
            for source_id in source_ids {
                assert!(static_answer.contains(&format!("data-tv-utility-source=\"{source_id}\"")));
            }
            assert_eq!(
                static_answer.matches("data-tv-utility-source=").count(),
                source_ids.len()
            );

            if id == "tv-energy-consumption" {
                assert!(static_answer.contains("data-tv-energy-calculator=\"true\""));
                assert!(static_answer.contains("data-tv-energy-answer=\"tv-energy-consumption\""));
                assert_eq!(static_answer.matches("data-tv-energy-step=").count(), 3);
                assert!(!static_answer.contains("data-tv-utility-task="));
            } else {
                assert!(static_answer.contains(&format!("data-tv-utility-answer=\"{id}\"")));
                assert!(static_answer.contains(&format!("data-tv-utility-task=\"{id}\"")));
                assert_eq!(static_answer.matches("data-tv-utility-branch=").count(), 3);
                assert!(static_answer.contains("data-tv-utility-stop=\"true\""));
                assert!(static_answer.contains("data-tv-utility-next="));
            }

            let expected_related: &[&str] = match id {
                "tv-speakers" => &[
                    "soundbar-to-tv",
                    "tv-headphones",
                    "tv-no-sound",
                    "smart-tv-box",
                    "picture-setup",
                    "tv-no-signal",
                ],
                "tv-headphones" => &[
                    "tv-speakers",
                    "soundbar-to-tv",
                    "tv-no-sound",
                    "tv-no-internet",
                    "smart-tv-box",
                    "tv-remote-not-working",
                ],
                "tv-energy-consumption" => &[
                    "tv-turns-off",
                    "picture-setup",
                    "tv-dimensions",
                    "viewing-distance",
                    "smart-tv-box",
                    "screen-cleaning",
                ],
                _ => unreachable!(),
            };
            let actual_related = related_seo_pages(page, &pages)
                .iter()
                .map(|related| related.id.as_str())
                .collect::<Vec<_>>();
            assert_eq!(actual_related, expected_related, "{id}: related contract");

            let html = seo_page_body(page, &pages, &[], &[], &[]);
            assert_eq!(html.matches("<h1").count(), 1);
            assert!(html.contains("Связанные материалы"));
            assert!(!html.contains("market.yandex"));
            assert!(!html.contains("data-affiliate"));
            assert!(!html.contains('₽'));
        }

        let speakers = seo_calculator_note("tv-speakers");
        assert!(
            speakers
                .contains("пассивные колонки без собственного усилителя нельзя подключать прямо")
        );
        assert!(speakers.contains("Клеммы пассивной колонки не являются входом телевизора"));
        assert!(!speakers.contains("подключите пассивные колонки прямо"));

        let headphones = seo_calculator_note("tv-headphones");
        assert!(
            headphones
                .contains("Bluetooth, используемый только пультом, не подтверждает профиль A2DP")
        );
        assert!(headphones.contains("Функция не подтверждена"));
        assert!(!headphones.contains("любой телевизор с Bluetooth"));

        let energy = seo_calculator_note("tv-energy-consumption");
        assert!(energy.contains("кВт·ч = Вт × часы / 1000; месяц = 30 дней; год = 365 дней"));
        assert!(energy.contains("Тариф по умолчанию отсутствует: сервис его не угадывает"));
        assert!(energy.contains(
            "Ответы и числа остаются в браузере; свободный ввод и отправка данных отсутствуют"
        ));
        assert!(!energy.contains("средний тариф"));
        assert!(!energy.contains("руб."));
        assert!(!energy.contains('₽'));
    }

    #[test]
    fn tv_utility_cohort_7_is_allowlisted_static_first_source_backed_and_non_commercial() {
        let pages: Vec<SeoPage> = read_json(&workspace_root().join("data/seo_pages.json"));
        validate_seo_pages(&pages);

        for (id, path, source_ids) in TV_UTILITY_COHORT_7 {
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
            assert!(page.home_priority.is_some());
            assert!(page.facts.len() >= 6);
            assert!(page.faq.len() >= 6);
            assert_eq!(seo_page_lastmod(page), SEO_FUNNEL_UPDATED_AT);

            let static_answer = seo_calculator_note(id);
            assert!(static_answer.contains(&format!("data-tv-utility-answer=\"{id}\"")));
            assert!(static_answer.contains(&format!("data-tv-utility-task=\"{id}\"")));
            assert_eq!(static_answer.matches("data-tv-utility-branch=").count(), 3);
            assert!(static_answer.contains("data-tv-utility-stop=\"true\""));
            assert!(static_answer.contains("data-tv-utility-next="));
            for source_id in source_ids {
                assert!(static_answer.contains(&format!("data-tv-utility-source=\"{source_id}\"")));
            }
            assert_eq!(
                static_answer.matches("data-tv-utility-source=").count(),
                source_ids.len()
            );

            let expected_related: &[&str] = match id {
                "tv-firmware-update" => &[
                    "tv-app-install",
                    "tv-factory-reset",
                    "tv-no-internet",
                    "tv-turns-off",
                    "tv-remote-not-working",
                    "smart-tv-box",
                ],
                "tv-app-install" => &[
                    "tv-storage-cleanup",
                    "tv-no-internet",
                    "tv-firmware-update",
                    "smart-tv-box",
                    "tv-factory-reset",
                    "phone-to-tv",
                ],
                "tv-factory-reset" => &[
                    "tv-firmware-update",
                    "tv-app-install",
                    "tv-turns-off",
                    "tv-no-internet",
                    "tv-remote-not-working",
                    "picture-setup",
                ],
                _ => unreachable!(),
            };
            let actual_related = related_seo_pages(page, &pages)
                .iter()
                .map(|related| related.id.as_str())
                .collect::<Vec<_>>();
            assert_eq!(actual_related, expected_related, "{id}: related contract");

            let html = seo_page_body(page, &pages, &[], &[], &[]);
            assert_eq!(html.matches("<h1").count(), 1);
            assert!(html.contains("Связанные материалы"));
            assert!(!html.contains("market.yandex"));
            assert!(!html.contains("data-affiliate"));
            assert!(!html.contains('₽'));
        }

        let firmware = seo_calculator_note("tv-firmware-update");
        assert!(firmware.contains("Полный код модели обязателен"));
        assert!(firmware.contains("не выключайте телевизор"));
        assert!(firmware.contains("не извлекайте USB"));
        assert!(!firmware.contains("универсальная прошивка"));

        let apps = seo_calculator_note("tv-app-install");
        assert!(apps.contains("официальном магазине"));
        assert!(apps.contains("APK не работает на Tizen, webOS или YaOS"));
        assert!(!apps.contains("скачайте любой APK"));

        let reset = seo_calculator_note("tv-factory-reset");
        assert!(reset.contains("Заводской сброс удаляет пользовательские данные и настройки"));
        assert!(reset.contains("Не сбрасывайте телевизор во время обновления"));
        assert!(!reset.contains("универсальные коды для сервисного меню"));
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
            guide: None,
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
            ("mount-brand-godoo", "GoDoo"),
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
            "/kronshteyny-godoo/",
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
        for id in ["diagonal-85", "vesa-600x400"] {
            let page = pages
                .iter()
                .find(|page| page.id == id)
                .expect("Нет самостоятельной страницы ежедневной SEO-когорты");
            assert!(page.indexable, "{id} должна быть индексируемой");
            assert_eq!(
                page.kind, "calculator",
                "{id}: нельзя публиковать тонкий товарный хаб"
            );
            assert!(
                page.guide.is_some(),
                "{id}: нужен самостоятельный evidence guide"
            );
            assert!(page.facts.len() >= 6, "{id}: недостаточно проверок");
            assert!(page.faq.len() >= 6, "{id}: недостаточно FAQ");
            assert!(!page.lead.contains("руб"), "{id}: нельзя фиксировать цену");
        }
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
        assert_eq!(profiles.profiles.len(), 33);

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

        let tcl_65c7k = models
            .iter()
            .find(|tv| tv.id == "tcl-65c7k")
            .expect("Нет модели TCL 65C7K");
        let tcl_matches = model_mount_matches(tcl_65c7k, &mounts);
        assert_eq!(
            tcl_matches
                .iter()
                .filter(|matched| matched.compatible && matched.fit_status == "verified-fit")
                .count(),
            17
        );
        assert_eq!(
            tcl_matches
                .iter()
                .filter(|matched| matched.compatible && matched.fit_status == "conditional-fit")
                .count(),
            3
        );
        let tcl_profile = commercial_profile_for(&profiles.profiles, "model", "tcl-65c7k")
            .expect("Нет SEO-профиля TCL 65C7K");
        assert_eq!(tcl_profile.updated_at.as_deref(), Some("2026-08-05"));
        let tcl_body = model_page_body(
            tcl_65c7k,
            &tcl_matches,
            &[],
            0,
            &seo_pages,
            Some(tcl_profile),
        );
        assert!(tcl_body.contains("Подтверждено: 17"));
        assert!(tcl_body.contains("Дополнительно условных вариантов: 3"));
        assert!(tcl_body.contains("Карточки магазинов противоречат друг другу"));
        assert!(tcl_body.contains("400×200 или 200×300"));
        assert!(!tcl_body.contains(">19 вариантов<"));

        let lg_oled55c5 = models
            .iter()
            .find(|tv| tv.id == "lg-oled55c5rla")
            .expect("Нет модели LG OLED55C5RLA");
        let lg_matches = model_mount_matches(lg_oled55c5, &mounts);
        assert_eq!(
            lg_matches
                .iter()
                .filter(|matched| matched.compatible && matched.fit_status == "verified-fit")
                .count(),
            17
        );
        let lg_profile = commercial_profile_for(&profiles.profiles, "model", "lg-oled55c5rla")
            .expect("Нет SEO-профиля LG OLED55C5RLA");
        let lg_body = model_page_body(
            lg_oled55c5,
            &lg_matches,
            &[],
            0,
            &seo_pages,
            Some(lg_profile),
        );
        assert!(lg_body.contains("VESA 300×200"));
        assert!(lg_body.contains("массу 14,1 кг без подставки"));
        assert!(lg_body.contains("в официальных российских характеристиках не указаны"));
        assert!(lg_body.contains("Подтверждено: 17"));
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
            guide: None,
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
                "selection-choose",
                "wall-drywall-how",
                "wall-concrete-dowel",
                "wall-aerated-how",
                "wall-planner",
                "mounting-map"
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
                "diagonal-85",
                "wall-planner",
                "viewing-distance",
                "diagonal-43",
                "diagonal-55",
                "diagonal-65",
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
    fn every_mount_gets_an_honest_responsive_technical_scheme_in_ssr() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let mounts: Vec<Mount> = read_json(&root.join("data/mounts.json"));
        let graph = build_compatibility_graph(&models, &mounts);

        for mount in &mounts {
            let scheme = mount_technical_scheme_html(mount);
            let page = mount_page_body(mount, &models, &graph, &[], 0, None);
            let distance =
                if (mount.wall_distance_min_mm - mount.wall_distance_max_mm).abs() < f64::EPSILON {
                    format!("{} мм", super::format_mm(mount.wall_distance_min_mm))
                } else {
                    format!(
                        "{}–{} мм",
                        super::format_mm(mount.wall_distance_min_mm),
                        super::format_mm(mount.wall_distance_max_mm)
                    )
                };
            let mechanism_part = match mount.mechanism.as_str() {
                "fixed" => "fixed-rails",
                "tilt" => "tilt-joint",
                "full-motion" => "articulated-arm",
                other => panic!("Неизвестный механизм в тестовом каталоге: {other}"),
            };

            assert!(scheme.contains(&format!(
                "data-mount-technical-scheme=\"{}\"",
                escape_html(&mount.id)
            )));
            assert!(scheme.contains("Техническая схема, не фотография"));
            assert!(scheme.contains("role=\"img\""));
            assert!(scheme.contains("viewBox=\"0 0 640 340\""));
            assert!(scheme.contains("block h-auto w-full max-w-full"));
            assert!(scheme.contains(&distance));
            assert!(scheme.contains(&format!(
                "{}–{}″",
                super::format_mm(mount.min_diagonal_in),
                super::format_mm(mount.max_diagonal_in)
            )));
            assert!(scheme.contains(&format!("до {} кг", super::format_mm(mount.max_load_kg))));
            assert!(scheme.contains(&format!("{} схем", mount.vesa.len())));
            assert!(scheme.contains(&format!("data-mechanism-part=\"{mechanism_part}\"")));
            assert!(!scheme.contains("<img"));
            assert!(!scheme.contains("market.yandex"));
            assert!(!scheme.contains(&mount.source_url));
            assert_eq!(
                page.matches("data-mount-technical-scheme=").count(),
                1,
                "SSR-страница {} должна содержать ровно одну схему",
                mount.id
            );
        }
    }

    #[test]
    fn every_mount_page_has_an_exact_direct_market_search_in_ssr() {
        let root = workspace_root();
        let models: Vec<TvModel> = read_json(&root.join("data/tv_models.json"));
        let mounts: Vec<Mount> = read_json(&root.join("data/mounts.json"));
        let graph = build_compatibility_graph(&models, &mounts);

        for mount in &mounts {
            let body = mount_page_body(mount, &models, &graph, &[], 0, None);
            let expected_href = escape_html(&market_mount_search_href(&mount.title));

            assert_eq!(
                body.matches("data-market-mount-search=\"true\"").count(),
                1,
                "SSR-страница {} должна содержать один постоянный поиск Маркета",
                mount.id
            );
            assert!(body.contains("data-market-search-fallback=\"true\""));
            assert!(body.contains(&format!("href=\"{expected_href}\"")));
            assert!(body.contains("rel=\"nofollow noopener noreferrer\""));
            assert!(body.contains("target=\"_blank\""));
            assert!(body.contains("Открыть Яндекс Маркет"));
        }
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
                "GoDoo" => "/kronshteyny-godoo/",
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
        let scheme_position = body
            .find("data-mount-technical-scheme=")
            .expect("Техническая схема кронштейна отсутствует");
        let models_position = body
            .find("Подтверждённые популярные телевизоры")
            .expect("Список телевизоров отсутствует");
        let summary_position = body
            .find("data-mount-fit-summary=\"true\"")
            .expect("Краткий итог совместимости отсутствует");
        let context_position = body
            .find("Связанные подборы кронштейнов")
            .expect("Связанные подборы отсутствуют");

        assert!(summary_position < slot_position);
        assert!(slot_position < models_position);
        assert!(models_position < scheme_position);
        assert!(scheme_position < context_position);
        assert!(!body.contains("data-affiliate-offer-id="));
        assert!(!body.contains(&escape_html(&offer.affiliate_href)));
        assert_eq!(body.matches("data-market-mount-search=\"true\"").count(), 1);
        assert!(body.contains(&escape_html(&market_mount_search_href(&mount.title))));
    }

    #[test]
    fn seo_taxonomy_distinguishes_setup_diagnostics_and_connections() {
        let root = workspace_root();
        let pages: Vec<SeoPage> = read_json(&root.join("data/seo_pages.json"));
        let label = |id: &str| {
            seo_page_kind_label(
                pages
                    .iter()
                    .find(|page| page.id == id)
                    .expect("SEO-страница отсутствует"),
            )
        };

        assert_eq!(label("tv-firmware-update"), "Настройка телевизора");
        assert_eq!(label("tv-no-signal"), "Диагностика телевизора");
        assert_eq!(label("phone-to-tv"), "Подключение устройств");
        assert_eq!(label("screen-cleaning"), "Уход за телевизором");
        assert_eq!(label("mounting-height"), "Расчёт установки");
    }

    #[test]
    fn russian_plural_labels_cover_teen_exceptions() {
        assert_eq!(
            russian_plural_label(1, "модель", "модели", "моделей"),
            "модель"
        );
        assert_eq!(
            russian_plural_label(2, "модель", "модели", "моделей"),
            "модели"
        );
        assert_eq!(
            russian_plural_label(5, "модель", "модели", "моделей"),
            "моделей"
        );
        assert_eq!(
            russian_plural_label(11, "модель", "модели", "моделей"),
            "моделей"
        );
        assert_eq!(
            russian_plural_label(21, "модель", "модели", "моделей"),
            "модель"
        );
    }
}
