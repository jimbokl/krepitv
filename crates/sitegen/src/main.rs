use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
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
        .map(|id| format!(" data-model-id=\"{}\"", escape_html(id)))
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
    "<header class=\"border-b-2 border-ink bg-paper\"><div class=\"mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-8\"><a class=\"font-display text-xl font-extrabold\" href=\"/\">KREPI TV</a><nav class=\"flex flex-wrap gap-5 font-display text-sm font-bold uppercase\" aria-label=\"Основная навигация\"><a href=\"/podbor/\">Подбор</a><a href=\"/vesa/\">VESA</a><a href=\"/metodika/\">Методика</a></nav></div></header>"
}

fn static_footer() -> &'static str {
    "<footer class=\"border-t-2 border-ink bg-paper\"><nav class=\"mx-auto flex max-w-[1440px] flex-wrap gap-6 px-5 py-7 font-display text-sm font-bold uppercase sm:px-8\" aria-label=\"Инструменты и информация о сервисе\"><a href=\"/podbor/\">Подбор</a><a href=\"/na-kakoy-vysote-veshat-televizor/\">Высота установки</a><a href=\"/rasstoyanie-do-televizora-i-diagonal/\">Расстояние и диагональ</a><a href=\"/vesa/\">VESA</a><a href=\"/o-proekte/\">О проекте</a><a href=\"/metodika/\">Методика</a><a href=\"/kontakty/\">Контакты</a><a href=\"/politika-konfidencialnosti/\">Конфиденциальность</a></nav></footer>"
}

fn static_layout(content: &str) -> String {
    format!(
        "{}<main class=\"min-h-screen bg-paper text-ink\">{content}</main>{}",
        static_header(),
        static_footer(),
    )
}

fn home_page_body(models: &[TvModel], seo_pages: &[SeoPage]) -> String {
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
        "<div class=\"mx-auto max-w-[1440px] px-5 pb-16 pt-8 sm:px-8\"><header class=\"border-b-2 border-ink pb-8\"><p class=\"font-mono text-xs uppercase text-action\">Независимый технический подбор</p><h1 class=\"mt-3 max-w-[1100px] font-display text-[clamp(3rem,6vw,6.4rem)] font-extrabold uppercase leading-[0.92]\">Кронштейн для вашего телевизора</h1><p class=\"mt-6 max-w-3xl text-lg leading-relaxed text-muted\">Введите точную модель: KREPI TV сверит VESA, диагональ и массу с характеристиками кронштейнов. Расчёт выполняется локально в браузере, а материал стены и крепёж всегда проверяются отдельно.</p><a class=\"primary-button mt-6\" href=\"/podbor/\">Начать подбор</a></header><section class=\"py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Модели с проверенными источниками</h2><div class=\"mt-5 grid gap-3 sm:grid-cols-2\">{model_links}</div></section><section class=\"border-t border-line py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Что даёт сервис без покупки</h2><ul class=\"mt-5 grid gap-3 text-base leading-relaxed sm:grid-cols-2\"><li>Точный VESA конкретной модели телевизора.</li><li>Проверку массы с запасом нагрузки 25%.</li><li>Калькулятор центра, нижнего и верхнего края экрана.</li><li>Расчёт расстояния до экрана и диагонали в обе стороны.</li><li>Ссылки на официальные источники характеристик.</li></ul></section><section class=\"border-t border-line py-9\"><h2 class=\"font-display text-3xl font-extrabold\">Справочники и калькуляторы</h2><p class=\"mt-3 max-w-3xl leading-relaxed text-muted\">Проверьте размер VESA, механизм и высоту установки до выбора конкретного кронштейна.</p><nav class=\"mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3\" aria-label=\"Справочники и калькуляторы\">{seo_links}</nav></section></div>"
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
        let canonical = format!("https://krepitv.ru/modeli/{}/", tv.id);
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
                    robots: None,
                    json_ld: &breadcrumb_json_ld(&[
                        ("Главная", "https://krepitv.ru/"),
                        ("Подбор по модели", "https://krepitv.ru/podbor/"),
                        (&tv.title, &canonical),
                    ]),
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
    ];
    urls.extend(
        models
            .iter()
            .map(|tv| format!("https://krepitv.ru/modeli/{}/", tv.id)),
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
        SeoPage, escape_html, is_indexable_seo_page, json_ld_script, read_json, related_seo_pages,
        seo_calculator_note, workspace_root,
    };
    use serde_json::json;

    #[test]
    fn escapes_html_attributes() {
        assert_eq!(
            escape_html("<ТВ & \"стена\">"),
            "&lt;ТВ &amp; &quot;стена&quot;&gt;"
        );
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
}
