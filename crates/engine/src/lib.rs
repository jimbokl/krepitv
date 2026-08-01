use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const LOAD_SAFETY_FACTOR: f64 = 1.25;
const MIN_TV_DIAGONAL_INCHES: f64 = 19.0;
const MAX_TV_DIAGONAL_INCHES: f64 = 150.0;
const MIN_VIEWING_DISTANCE_CM: f64 = 30.0;
const MAX_VIEWING_DISTANCE_CM: f64 = 1_000.0;
const MIN_HORIZONTAL_ANGLE_DEG: f64 = 20.0;
const MAX_HORIZONTAL_ANGLE_DEG: f64 = 60.0;
const MIN_TV_WIDTH_CM: f64 = 10.0;
const MAX_TV_WIDTH_CM: f64 = 500.0;
const MAX_TURN_ANGLE_DEG: f64 = 90.0;
const MAX_MOUNT_TILT_ANGLE_DEG: f64 = 90.0;
const MAX_MOUNT_EXTENSION_CM: f64 = 300.0;
const MAX_SAFETY_CLEARANCE_CM: f64 = 50.0;
const MIN_EYE_HEIGHT_CM: f64 = 50.0;
const MAX_EYE_HEIGHT_CM: f64 = 220.0;
const MIN_VERTICAL_VIEWING_ANGLE_DEG: f64 = -30.0;
const MAX_VERTICAL_VIEWING_ANGLE_DEG: f64 = 30.0;
const MAX_FURNITURE_HEIGHT_CM: f64 = 200.0;
const MAX_FURNITURE_CLEARANCE_CM: f64 = 100.0;
const MAX_WALL_PLATE_OFFSET_CM: f64 = 100.0;
const MAX_REFERENCE_HEIGHT_CM: f64 = 350.0;
const MIN_WALL_WIDTH_CM: f64 = 100.0;
const MAX_WALL_WIDTH_CM: f64 = 3_000.0;
const MIN_WALL_HEIGHT_CM: f64 = 150.0;
const MAX_WALL_HEIGHT_CM: f64 = 1_000.0;
const MIN_SCREEN_HEIGHT_CM: f64 = 10.0;
const MAX_SCREEN_HEIGHT_CM: f64 = 400.0;
const MIN_NICHE_WIDTH_CM: f64 = 30.0;
const MAX_NICHE_WIDTH_CM: f64 = 1_000.0;
const MIN_NICHE_HEIGHT_CM: f64 = 20.0;
const MAX_NICHE_HEIGHT_CM: f64 = 500.0;
const MAX_NICHE_CLEARANCE_CM: f64 = 50.0;
const STANDARD_TV_DIAGONALS_INCHES: &[f64] = &[
    19.0, 22.0, 24.0, 27.0, 28.0, 32.0, 39.0, 40.0, 42.0, 43.0, 48.0, 49.0, 50.0, 55.0, 58.0, 60.0,
    65.0, 70.0, 75.0, 77.0, 83.0, 85.0, 86.0, 98.0, 100.0, 110.0, 115.0, 120.0, 130.0, 140.0,
    150.0,
];
const MAX_TV_ZONE_ELEMENT_CM: f64 = 300.0;
const MAX_TV_ZONE_OFFSET_CM: f64 = 250.0;
const MAX_TV_ZONE_DEPTH_CM: f64 = 50.0;
const MAX_TV_ZONE_MODULES: u32 = 16;
const MIN_VESA_DIMENSION_MM: f64 = 30.0;
const MAX_VESA_DIMENSION_MM: f64 = 1_000.0;
const MAX_VESA_SPEC_CHARS: usize = 600;
const VESA_EXACT_TOLERANCE_MM: f64 = 0.5;
const VESA_NEAR_TOLERANCE_MM: f64 = 3.0;
const MAX_VESA_SCREW_LENGTH_MM: f64 = 200.0;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Mount {
    pub id: String,
    #[serde(default)]
    pub brand: String,
    #[serde(default)]
    pub model: String,
    pub title: String,
    pub mechanism: String,
    pub min_diagonal_in: f64,
    pub max_diagonal_in: f64,
    pub max_load_kg: f64,
    pub vesa: Vec<String>,
    pub wall_distance_min_mm: f64,
    pub wall_distance_max_mm: f64,
    pub source_url: String,
    #[serde(default)]
    pub source_label: String,
    #[serde(default)]
    pub checked_at: String,
    #[serde(default)]
    pub market_url: Option<String>,
    #[serde(default)]
    pub reward_rub_snapshot: Option<f64>,
}

#[derive(Clone, Debug, Serialize)]
pub struct MountMatch {
    pub mount: Mount,
    pub compatible: bool,
    pub fit_status: String,
    pub score: i32,
    pub reasons: Vec<String>,
    pub warnings: Vec<String>,
    pub required_load_kg: f64,
}

#[derive(Clone, Debug, Serialize)]
pub struct HeightPlan {
    pub diagonal_inches: f64,
    pub screen_width_cm: f64,
    pub screen_height_cm: f64,
    pub center_height_cm: f64,
    pub bottom_height_cm: f64,
    pub top_height_cm: f64,
    pub viewing_angle_deg: f64,
    pub clearance_cm: f64,
    pub adjusted_for_furniture: bool,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct MountingMapPlan {
    pub diagonal_inches: f64,
    pub screen_width_cm: f64,
    pub screen_height_cm: f64,
    pub center_height_cm: f64,
    pub bottom_height_cm: f64,
    pub top_height_cm: f64,
    pub vesa_vertical_offset_cm: f64,
    pub vesa_center_height_cm: f64,
    pub wall_plate_offset_cm: f64,
    pub wall_plate_reference_height_cm: f64,
    pub viewing_angle_deg: f64,
    pub clearance_cm: f64,
    pub adjusted_for_furniture: bool,
    pub warnings: Vec<String>,
}

/// Результат перевода диагонали, ручного замера или размеров ниши.
///
/// `screen_width_cm` и `screen_height_cm` всегда описывают активный
/// прямоугольник. Паспортный корпус передаётся и проверяется отдельно.
#[derive(Clone, Debug, Serialize)]
pub struct TvDimensionsPlan {
    pub mode: String,
    pub source: String,
    pub diagonal_inches: f64,
    pub diagonal_cm: f64,
    pub screen_width_cm: f64,
    pub screen_height_cm: f64,
    pub measured_aspect_ratio: Option<f64>,
    pub usable_width_cm: Option<f64>,
    pub usable_height_cm: Option<f64>,
    pub recommended_standard_diagonal_inches: Option<f64>,
    pub exact_case_width_cm: Option<f64>,
    pub exact_case_height_cm: Option<f64>,
    pub exact_case_fits: Option<bool>,
    pub exact_case_horizontal_delta_cm: Option<f64>,
    pub exact_case_vertical_delta_cm: Option<f64>,
    pub warnings: Vec<String>,
}

/// Консервативный маршрут подключения телефона к телевизору.
///
/// Мастер не угадывает поддержку протокола по одному бренду: состояния
/// `needs-check` и `no-direct-path` являются полноценными результатами.
#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct PhoneTvConnectionRoute {
    pub id: String,
    pub readiness: String,
    pub title: String,
    pub condition: String,
    pub source_ids: Vec<String>,
    pub equipment: Vec<String>,
    pub steps: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct PhoneTvConnectionPlan {
    pub status: String,
    pub phone: String,
    pub tv: String,
    pub goal: String,
    pub primary_route_id: Option<String>,
    pub routes: Vec<PhoneTvConnectionRoute>,
    pub rejected_reasons: Vec<String>,
    pub next_checks: Vec<String>,
    pub privacy: String,
}

/// Масштабная двумерная схема телевизора на стене.
///
/// Координаты отсчитываются от левого нижнего угла стены. Паспортные ширина и
/// высота экрана имеют приоритет над геометрией 16:9; ручной режим используется
/// только когда обе паспортные величины равны нулю.
#[derive(Clone, Debug, Serialize)]
pub struct WallScenePlan {
    pub dimension_source: String,
    pub diagonal_inches: f64,
    pub screen_width_cm: f64,
    pub screen_height_cm: f64,
    pub wall_width_cm: f64,
    pub wall_height_cm: f64,
    pub requested_center_x_cm: f64,
    pub requested_center_y_cm: f64,
    pub effective_center_x_cm: f64,
    pub effective_center_y_cm: f64,
    pub left_clearance_cm: f64,
    pub right_clearance_cm: f64,
    pub top_clearance_cm: f64,
    pub bottom_clearance_cm: f64,
    pub furniture_width_cm: f64,
    pub furniture_height_cm: f64,
    pub furniture_gap_cm: f64,
    pub furniture_overlap_cm: f64,
    pub eye_line_height_cm: f64,
    pub eye_line_delta_cm: f64,
    pub center_was_clamped: bool,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct TvZoneSocketPlan {
    pub diagonal_inches: f64,
    pub screen_width_cm: f64,
    pub screen_height_cm: f64,
    pub screen_center_height_cm: f64,
    pub screen_bottom_height_cm: f64,
    pub screen_top_height_cm: f64,
    pub plate_center_height_cm: f64,
    pub socket_center_height_cm: f64,
    pub screen_clears_floor: bool,
    pub plate_hidden_by_screen: bool,
    pub service_zone_hidden_by_screen: bool,
    pub socket_hidden_by_screen: bool,
    pub socket_overlaps_plate: bool,
    pub socket_overlaps_service_zone: bool,
    pub screen_edge_margin_cm: f64,
    pub required_depth_cm: f64,
    pub wall_clearance_cm: f64,
    pub depth_margin_cm: f64,
    pub plug_fits_depth: bool,
    pub minimum_shift_cm: Option<f64>,
    pub shift_direction: Option<String>,
    pub power_modules: u32,
    pub ethernet_modules: u32,
    pub antenna_modules: u32,
    pub total_modules: u32,
    pub ready_for_site_check: bool,
    pub warnings: Vec<String>,
}

#[derive(Clone, Copy, Debug)]
struct Rect {
    left: f64,
    right: f64,
    bottom: f64,
    top: f64,
}

impl Rect {
    fn centered(width: f64, height: f64, center_x: f64, center_y: f64) -> Self {
        Self {
            left: center_x - width / 2.0,
            right: center_x + width / 2.0,
            bottom: center_y - height / 2.0,
            top: center_y + height / 2.0,
        }
    }

    fn expanded(self, margin: f64) -> Self {
        Self {
            left: self.left - margin,
            right: self.right + margin,
            bottom: self.bottom - margin,
            top: self.top + margin,
        }
    }

    fn translated(self, dx: f64, dy: f64) -> Self {
        Self {
            left: self.left + dx,
            right: self.right + dx,
            bottom: self.bottom + dy,
            top: self.top + dy,
        }
    }

    fn overlaps(self, other: Self) -> bool {
        self.left < other.right
            && self.right > other.left
            && self.bottom < other.top
            && self.top > other.bottom
    }

    fn contains(self, other: Self) -> bool {
        other.left >= self.left
            && other.right <= self.right
            && other.bottom >= self.bottom
            && other.top <= self.top
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct ViewingGeometry {
    pub diagonal_inches: f64,
    pub screen_width_cm: f64,
    pub screen_height_cm: f64,
    pub viewing_distance_cm: f64,
    pub horizontal_angle_deg: f64,
    pub warnings: Vec<String>,
}

/// Консервативная проверка горизонтального поворота телевизора в плоскости сверху.
///
/// `vesa_offset_cm` во входной функции задаётся со знаком относительно геометрического
/// центра экрана. Поскольку направление поворота отдельно не задаётся, расчёт использует
/// `abs(vesa_offset_cm)` и более длинную сторону экрана. Это худший случай для поворота
/// в любую сторону. Минимальный вылет считается по формуле:
///
/// `safety_clearance_cm + effective_half_width_cm * sin(target_angle_degrees)`.
#[derive(Clone, Debug, Serialize)]
pub struct TurnClearancePlan {
    pub minimum_extension_cm: f64,
    pub maximum_clearance_angle_degrees: f64,
    pub clearance_margin_cm: f64,
    pub will_clear_wall: bool,
    pub effective_half_width_cm: f64,
    pub warnings: Vec<String>,
}

/// Геометрическая проверка паспортного диапазона наклонного кронштейна.
///
/// Положительное вертикальное смещение означает, что центр экрана находится
/// выше глаз и нормаль экрана нужно направить вниз. Отрицательное смещение
/// требует наклона вверх. Расчёт не является эргономической рекомендацией и не
/// подтверждает совместимость кронштейна по VESA, массе или основанию стены.
#[derive(Clone, Debug, Serialize)]
pub struct TiltAnglePlan {
    pub diagonal_inches: f64,
    pub screen_width_cm: f64,
    pub screen_height_cm: f64,
    pub screen_center_height_cm: f64,
    pub screen_bottom_height_cm: f64,
    pub screen_top_height_cm: f64,
    pub eye_height_cm: f64,
    pub viewing_distance_cm: f64,
    pub vertical_offset_cm: f64,
    pub center_sightline_angle_degrees: f64,
    pub bottom_sightline_angle_degrees: f64,
    pub top_sightline_angle_degrees: f64,
    pub required_tilt_degrees: f64,
    pub required_direction: String,
    pub available_tilt_degrees: f64,
    pub tilt_margin_degrees: f64,
    pub mount_covers_required_tilt: bool,
    pub screen_clears_floor: bool,
    pub warnings: Vec<String>,
}

/// Проверка ручного замера VESA по явно перечисленным парам из характеристик
/// кронштейна. Результат относится только к схеме отверстий и не подтверждает
/// нагрузку, диагональ, винты, механизм или основание стены.
#[derive(Clone, Debug, Serialize)]
pub struct VesaMatchPlan {
    pub status: String,
    pub result_summary: String,
    pub measured_width_mm: f64,
    pub measured_height_mm: f64,
    pub measured_pair: String,
    pub recognized_pairs: Vec<String>,
    pub recognized_pair_count: usize,
    pub matched_pair: Option<String>,
    pub candidate_pair: Option<String>,
    pub reversed_pair: Option<String>,
    pub range_only_claim: bool,
    pub mount_supports_measured_pair: Option<bool>,
    pub warnings: Vec<String>,
}

/// Неразрывный диапазон полной длины VESA-винта без подбора товарного размера.
///
/// Расчёт допустим только при наличии обеих подтверждённых паспортных границ
/// зацепления. Результат сохраняет исходную точность: ядро не округляет границы
/// и не выбирает ближайшую стандартную длину винта.
#[derive(Clone, Debug, Serialize)]
pub struct VesaScrewLengthPlan {
    pub engagement_min_mm: f64,
    pub engagement_max_mm: f64,
    pub bracket_plate_thickness_mm: f64,
    pub washer_stack_thickness_mm: f64,
    pub required_spacer_thickness_mm: f64,
    pub external_stack_thickness_mm: f64,
    pub total_length_min_mm: f64,
    pub total_length_max_mm: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct ParsedVesaPair {
    width_mm: f64,
    height_mm: f64,
}

fn rounded(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

fn validate_range(value: f64, min: f64, max: f64, field: &str, unit: &str) -> Result<(), String> {
    if !value.is_finite() {
        return Err(format!("{field}: введите конечное число"));
    }
    if !(min..=max).contains(&value) {
        return Err(format!(
            "{field}: допустимый диапазон от {} до {} {unit}",
            rounded(min),
            rounded(max)
        ));
    }
    Ok(())
}

fn validate_finite(value: f64, field: &str) -> Result<(), String> {
    if !value.is_finite() {
        return Err(format!("{field}: введите конечное число"));
    }
    Ok(())
}

fn screen_dimensions_16_by_9(diagonal_inches: f64) -> (f64, f64) {
    let diagonal_cm = diagonal_inches * 2.54;
    let ratio = (16.0_f64.powi(2) + 9.0_f64.powi(2)).sqrt();
    (diagonal_cm * 16.0 / ratio, diagonal_cm * 9.0 / ratio)
}

fn viewing_warnings(horizontal_angle_deg: f64) -> Vec<String> {
    let mut warnings = Vec::new();
    if horizontal_angle_deg < 30.0 {
        warnings
            .push("Узкий угол даёт более далёкую посадку и визуально меньший экран".to_string());
    }
    if horizontal_angle_deg > 45.0 {
        warnings.push(
            "Широкий угол даёт близкую посадку: проверьте комфорт на своём контенте".to_string(),
        );
    }
    warnings
}

pub fn viewing_distance_for_diagonal(
    diagonal_inches: f64,
    horizontal_angle_deg: f64,
) -> Result<ViewingGeometry, String> {
    validate_range(
        diagonal_inches,
        MIN_TV_DIAGONAL_INCHES,
        MAX_TV_DIAGONAL_INCHES,
        "Диагональ",
        "дюймов",
    )?;
    validate_range(
        horizontal_angle_deg,
        MIN_HORIZONTAL_ANGLE_DEG,
        MAX_HORIZONTAL_ANGLE_DEG,
        "Горизонтальный угол обзора",
        "градусов",
    )?;

    let (width, height) = screen_dimensions_16_by_9(diagonal_inches);
    let distance = width / (2.0 * (horizontal_angle_deg.to_radians() / 2.0).tan());

    Ok(ViewingGeometry {
        diagonal_inches: rounded(diagonal_inches),
        screen_width_cm: rounded(width),
        screen_height_cm: rounded(height),
        viewing_distance_cm: rounded(distance),
        horizontal_angle_deg: rounded(horizontal_angle_deg),
        warnings: viewing_warnings(horizontal_angle_deg),
    })
}

pub fn diagonal_for_viewing_distance(
    viewing_distance_cm: f64,
    horizontal_angle_deg: f64,
) -> Result<ViewingGeometry, String> {
    validate_range(
        viewing_distance_cm,
        MIN_VIEWING_DISTANCE_CM,
        MAX_VIEWING_DISTANCE_CM,
        "Расстояние до экрана",
        "см",
    )?;
    validate_range(
        horizontal_angle_deg,
        MIN_HORIZONTAL_ANGLE_DEG,
        MAX_HORIZONTAL_ANGLE_DEG,
        "Горизонтальный угол обзора",
        "градусов",
    )?;

    let width = 2.0 * viewing_distance_cm * (horizontal_angle_deg.to_radians() / 2.0).tan();
    let ratio = (16.0_f64.powi(2) + 9.0_f64.powi(2)).sqrt();
    let diagonal_inches = width * ratio / 16.0 / 2.54;
    validate_range(
        diagonal_inches,
        MIN_TV_DIAGONAL_INCHES,
        MAX_TV_DIAGONAL_INCHES,
        "Расчётная диагональ",
        "дюймов",
    )?;
    let height = width * 9.0 / 16.0;

    Ok(ViewingGeometry {
        diagonal_inches: rounded(diagonal_inches),
        screen_width_cm: rounded(width),
        screen_height_cm: rounded(height),
        viewing_distance_cm: rounded(viewing_distance_cm),
        horizontal_angle_deg: rounded(horizontal_angle_deg),
        warnings: viewing_warnings(horizontal_angle_deg),
    })
}

fn validate_optional_exact_case(
    exact_case_width_cm: f64,
    exact_case_height_cm: f64,
) -> Result<Option<(f64, f64)>, String> {
    validate_finite(exact_case_width_cm, "Паспортная ширина корпуса")?;
    validate_finite(exact_case_height_cm, "Паспортная высота корпуса")?;

    if exact_case_width_cm < 0.0 || exact_case_height_cm < 0.0 {
        return Err("Паспортные габариты корпуса не могут быть отрицательными".to_string());
    }
    if exact_case_width_cm == 0.0 && exact_case_height_cm == 0.0 {
        return Ok(None);
    }
    if exact_case_width_cm == 0.0 || exact_case_height_cm == 0.0 {
        return Err(
            "Укажите и ширину, и высоту корпуса либо оставьте оба поля равными нулю".to_string(),
        );
    }

    validate_range(
        exact_case_width_cm,
        MIN_TV_WIDTH_CM,
        MAX_TV_WIDTH_CM,
        "Паспортная ширина корпуса",
        "см",
    )?;
    validate_range(
        exact_case_height_cm,
        MIN_SCREEN_HEIGHT_CM,
        MAX_SCREEN_HEIGHT_CM,
        "Паспортная высота корпуса",
        "см",
    )?;
    Ok(Some((exact_case_width_cm, exact_case_height_cm)))
}

/// Переводит диагональ, фактический прямоугольник или размеры ниши в сантиметры.
///
/// Аргументы `primary` и `secondary` зависят от режима:
/// - `diagonal`: `primary` — диагональ в дюймах, `secondary` не используется;
/// - `measured`: ширина и высота измеренного прямоугольника в сантиметрах;
/// - `niche`: ширина и высота ниши в сантиметрах.
///
/// В режиме `niche` зазор вычитается с каждой стороны. Паспортные габариты
/// корпуса являются отдельной необязательной парой и не подменяют активную
/// область 16:9.
#[allow(clippy::too_many_arguments)]
pub fn calculate_tv_dimensions_plan(
    mode: &str,
    primary: f64,
    secondary: f64,
    clearance_cm: f64,
    exact_case_width_cm: f64,
    exact_case_height_cm: f64,
) -> Result<TvDimensionsPlan, String> {
    validate_finite(primary, "Основное значение")?;
    validate_finite(secondary, "Второе значение")?;
    validate_range(
        clearance_cm,
        0.0,
        MAX_NICHE_CLEARANCE_CM,
        "Зазор с каждой стороны",
        "см",
    )?;
    let exact_case = validate_optional_exact_case(exact_case_width_cm, exact_case_height_cm)?;

    let mut warnings = Vec::new();
    let mut usable_width_cm = None;
    let mut usable_height_cm = None;
    let mut recommended_standard_diagonal_inches = None;
    let mut exact_case_fits = None;
    let mut exact_case_horizontal_delta_cm = None;
    let mut exact_case_vertical_delta_cm = None;

    let (source, diagonal_inches, screen_width_cm, screen_height_cm, measured_aspect_ratio) =
        match mode {
            "diagonal" => {
                validate_range(
                    primary,
                    MIN_TV_DIAGONAL_INCHES,
                    MAX_TV_DIAGONAL_INCHES,
                    "Диагональ",
                    "дюймов",
                )?;
                if secondary < 0.0 {
                    return Err("Сравниваемая диагональ не может быть отрицательной".to_string());
                }
                if secondary > 0.0 {
                    validate_range(
                        secondary,
                        MIN_TV_DIAGONAL_INCHES,
                        MAX_TV_DIAGONAL_INCHES,
                        "Сравниваемая диагональ",
                        "дюймов",
                    )?;
                }
                let (width, height) = screen_dimensions_16_by_9(primary);
                warnings.push(
                    "Расчёт показывает активную область 16:9, а не габариты корпуса телевизора."
                        .to_string(),
                );
                ("diagonal-16:9", primary, width, height, None)
            }
            "measured" => {
                validate_range(
                    primary,
                    MIN_TV_WIDTH_CM,
                    MAX_TV_WIDTH_CM,
                    "Измеренная ширина",
                    "см",
                )?;
                validate_range(
                    secondary,
                    MIN_SCREEN_HEIGHT_CM,
                    MAX_SCREEN_HEIGHT_CM,
                    "Измеренная высота",
                    "см",
                )?;
                let diagonal_cm = primary.hypot(secondary);
                let diagonal_inches = diagonal_cm / 2.54;
                validate_range(
                    diagonal_inches,
                    MIN_TV_DIAGONAL_INCHES,
                    MAX_TV_DIAGONAL_INCHES,
                    "Диагональ по замеру",
                    "дюймов",
                )?;
                let aspect_ratio = primary / secondary;
                warnings.push(
                    "Диагональ рассчитана по введённому прямоугольнику без приведения к 16:9."
                        .to_string(),
                );
                if (aspect_ratio - 16.0 / 9.0).abs() > 0.05 {
                    warnings.push(
                        "Измеренный прямоугольник заметно отличается от 16:9: проверьте, измеряли ли вы активную область или корпус."
                            .to_string(),
                    );
                }
                (
                    "measured-rectangle",
                    diagonal_inches,
                    primary,
                    secondary,
                    Some(aspect_ratio),
                )
            }
            "niche" => {
                validate_range(
                    primary,
                    MIN_NICHE_WIDTH_CM,
                    MAX_NICHE_WIDTH_CM,
                    "Ширина ниши",
                    "см",
                )?;
                validate_range(
                    secondary,
                    MIN_NICHE_HEIGHT_CM,
                    MAX_NICHE_HEIGHT_CM,
                    "Высота ниши",
                    "см",
                )?;

                let usable_width = primary - clearance_cm * 2.0;
                let usable_height = secondary - clearance_cm * 2.0;
                if usable_width <= 0.0 || usable_height <= 0.0 {
                    return Err(
                        "Зазор с каждой стороны оставляет нулевую или отрицательную полезную область"
                            .to_string(),
                    );
                }

                let recommendation = STANDARD_TV_DIAGONALS_INCHES
                    .iter()
                    .rev()
                    .copied()
                    .find(|diagonal| {
                        let (width, height) = screen_dimensions_16_by_9(*diagonal);
                        width <= usable_width && height <= usable_height
                    })
                    .ok_or_else(|| {
                        "Полезная область ниши слишком мала даже для стандартного экрана 19″"
                            .to_string()
                    })?;
                let (width, height) = screen_dimensions_16_by_9(recommendation);
                usable_width_cm = Some(usable_width);
                usable_height_cm = Some(usable_height);
                recommended_standard_diagonal_inches = Some(recommendation);
                warnings.push(
                    "Рекомендация относится к активной области 16:9; перед покупкой проверьте паспортные габариты корпуса."
                        .to_string(),
                );

                if let Some((case_width, case_height)) = exact_case {
                    let horizontal_delta = usable_width - case_width;
                    let vertical_delta = usable_height - case_height;
                    let fits = horizontal_delta >= -f64::EPSILON && vertical_delta >= -f64::EPSILON;
                    exact_case_fits = Some(fits);
                    exact_case_horizontal_delta_cm = Some(horizontal_delta);
                    exact_case_vertical_delta_cm = Some(vertical_delta);
                    if !fits {
                        warnings.push(
                            "Выбранный паспортный корпус не помещается в полезную область ниши."
                                .to_string(),
                        );
                    }
                }

                ("niche-standard-16:9", recommendation, width, height, None)
            }
            _ => {
                return Err(
                    "Неизвестный режим расчёта: выберите диагональ, замер или нишу".to_string(),
                );
            }
        };

    if mode != "niche" && exact_case.is_some() {
        warnings.push(
            "Паспортные габариты корпуса проверяются на вместимость только в режиме ниши."
                .to_string(),
        );
    }
    let (exact_case_width, exact_case_height) = exact_case
        .map(|(width, height)| (Some(rounded(width)), Some(rounded(height))))
        .unwrap_or((None, None));

    Ok(TvDimensionsPlan {
        mode: mode.to_string(),
        source: source.to_string(),
        diagonal_inches: rounded(diagonal_inches),
        diagonal_cm: rounded(diagonal_inches * 2.54),
        screen_width_cm: rounded(screen_width_cm),
        screen_height_cm: rounded(screen_height_cm),
        measured_aspect_ratio: measured_aspect_ratio.map(rounded),
        usable_width_cm: usable_width_cm.map(rounded),
        usable_height_cm: usable_height_cm.map(rounded),
        recommended_standard_diagonal_inches: recommended_standard_diagonal_inches.map(rounded),
        exact_case_width_cm: exact_case_width,
        exact_case_height_cm: exact_case_height,
        exact_case_fits,
        exact_case_horizontal_delta_cm: exact_case_horizontal_delta_cm.map(rounded),
        exact_case_vertical_delta_cm: exact_case_vertical_delta_cm.map(rounded),
        warnings,
    })
}

fn phone_tv_route(
    id: &str,
    readiness: &str,
    title: &str,
    condition: &str,
    equipment: &[&str],
    steps: &[&str],
    warnings: &[&str],
) -> PhoneTvConnectionRoute {
    let source_ids = match id {
        "airplay" => vec!["apple-airplay"],
        "app-cast" | "google-cast" => vec!["google-cast"],
        "smart-view" => vec!["samsung-smart-view"],
        "wireless-screen" => vec![],
        "iphone-hdmi" => vec!["apple-video-adapters"],
        "android-usb-c-hdmi" | "android-wired-check" => vec!["vesa-displayport"],
        _ => vec![],
    };
    PhoneTvConnectionRoute {
        id: id.to_string(),
        readiness: readiness.to_string(),
        title: title.to_string(),
        condition: condition.to_string(),
        source_ids: source_ids
            .into_iter()
            .map(|value| value.to_string())
            .collect(),
        equipment: equipment.iter().map(|value| (*value).to_string()).collect(),
        steps: steps.iter().map(|value| (*value).to_string()).collect(),
        warnings: warnings.iter().map(|value| (*value).to_string()).collect(),
    }
}

fn require_choice(value: &str, allowed: &[&str], label: &str) -> Result<(), String> {
    if allowed.contains(&value) {
        Ok(())
    } else {
        Err(format!("Неизвестное значение «{value}» для поля «{label}»"))
    }
}

/// Строит проверяемый план подключения телефона к телевизору.
///
/// Поддержка AirPlay, Google Cast, Smart View и видеовыхода USB-C зависит от
/// точных устройств. Поэтому бренд или форма разъёма никогда не повышают
/// маршрут до `ready` без достаточного набора подтверждений.
#[allow(clippy::too_many_arguments)]
pub fn calculate_phone_tv_connection(
    phone: &str,
    tv: &str,
    goal: &str,
    connector: &str,
    same_network: &str,
    hdmi: &str,
    android_video_output: &str,
) -> Result<PhoneTvConnectionPlan, String> {
    require_choice(
        phone,
        &["iphone", "android-samsung", "android-other"],
        "Телефон",
    )?;
    require_choice(
        tv,
        &[
            "apple-tv",
            "samsung-smart-tv",
            "lg-smart-tv",
            "google-tv",
            "yandex-tv",
            "hdmi-tv",
            "other-smart-tv",
            "unknown",
        ],
        "Телевизор",
    )?;
    require_choice(goal, &["mirror", "media", "no-wifi"], "Задача")?;
    require_choice(
        connector,
        &["usb-c", "lightning", "micro-usb", "unknown"],
        "Разъём телефона",
    )?;
    require_choice(same_network, &["yes", "no", "unknown"], "Одна сеть Wi-Fi")?;
    require_choice(hdmi, &["yes", "no", "unknown"], "Вход HDMI")?;
    require_choice(
        android_video_output,
        &["yes", "no", "unknown"],
        "Видеовыход Android",
    )?;

    if phone == "iphone" && connector == "micro-usb" {
        return Err("Для iPhone выберите USB-C, Lightning или «не знаю»".to_string());
    }
    if phone != "iphone" && connector == "lightning" {
        return Err("Lightning относится к iPhone; проверьте выбранный телефон".to_string());
    }

    let mut routes = Vec::new();
    let mut rejected_reasons = Vec::new();
    let mut next_checks = Vec::new();
    let wants_wireless = goal != "no-wifi";

    if wants_wireless && phone == "iphone" {
        match tv {
            "apple-tv" => {
                routes.push(phone_tv_route(
                    "airplay",
                    "needs-check",
                    "AirPlay",
                    "AirPlay — вероятный маршрут, но без точных моделей и версий ОС он не считается подтверждённым.",
                    &[],
                    &[
                        "Подключите iPhone и Apple TV к одной сети Wi-Fi.",
                        "Откройте Пункт управления на iPhone.",
                        "Нажмите «Повтор экрана» и выберите Apple TV.",
                        "Введите код с экрана телевизора, если он появится.",
                    ],
                    &[
                        "Сверьте точную модель Apple TV, модель iPhone и версии их систем.",
                        "Некоторые видеоприложения ограничивают AirPlay для защищённого контента.",
                    ],
                ));
                next_checks.push(
                    "Проверьте AirPlay в руководствах точных моделей iPhone и Apple TV."
                        .to_string(),
                );
            }
            "samsung-smart-tv" | "lg-smart-tv" => {
                routes.push(phone_tv_route(
                    "airplay",
                    "needs-check",
                    "AirPlay, если он есть в точной модели телевизора",
                    "Одинаковый бренд или Smart TV сам по себе не подтверждает AirPlay.",
                    &[],
                    &[
                        "Откройте настройки телевизора и найдите пункт AirPlay.",
                        "Подключите телефон и телевизор к одной сети Wi-Fi.",
                        "На iPhone откройте Пункт управления и нажмите «Повтор экрана».",
                        "Выберите телевизор и подтвердите код, если он появится.",
                    ],
                    &["Поддержку AirPlay нужно сверить по точной модели телевизора."],
                ));
                next_checks.push(
                    "Найдите AirPlay в настройках или паспорте точной модели телевизора."
                        .to_string(),
                );
            }
            "google-tv" | "yandex-tv" | "other-smart-tv" | "unknown" => {
                if goal == "media" {
                    routes.push(phone_tv_route(
                        "app-cast",
                        "needs-check",
                        "Трансляция из совместимого приложения",
                        "Это передача конкретного видео или фото, а не универсальное дублирование всего экрана iPhone.",
                        &[],
                        &[
                            "Подключите устройства к одной сети Wi-Fi.",
                            "Откройте приложение с кнопкой трансляции.",
                            "Нажмите значок трансляции и выберите телевизор.",
                        ],
                        &["Наличие кнопки и поддержка формата зависят от приложения и телевизора."],
                    ));
                } else {
                    rejected_reasons.push(
                        "Универсальное беспроводное дублирование iPhone не подтверждено для выбранного типа телевизора."
                            .to_string(),
                    );
                }
                next_checks.push("Проверьте, есть ли в меню телевизора AirPlay или приложение с кнопкой трансляции.".to_string());
            }
            "hdmi-tv" => {}
            _ => unreachable!(),
        }
    }

    if wants_wireless && phone != "iphone" {
        match (phone, tv) {
            ("android-samsung", "samsung-smart-tv") => {
                routes.push(phone_tv_route(
                    "smart-view",
                    "needs-check",
                    "Samsung Smart View",
                    "Маршрут относится к Samsung Galaxy и совместимому Samsung Smart TV.",
                    &[],
                    &[
                        "Подключите смартфон и телевизор к одной сети Wi-Fi.",
                        "Откройте быстрые настройки Galaxy.",
                        "Нажмите Smart View и выберите телевизор.",
                        "Подтвердите подключение на телевизоре и телефоне.",
                    ],
                    &["Если Smart View отсутствует или телевизор не появляется, нужна проверка точных моделей и разрешения подключения на ТВ."],
                ));
            }
            (_, "google-tv") => {
                routes.push(phone_tv_route(
                    "google-cast",
                    "needs-check",
                    if goal == "media" {
                        "Google Cast из приложения"
                    } else {
                        "Google Cast или функция трансляции экрана"
                    },
                    "Передача видео из приложения надёжнее полного дублирования экрана, которое зависит от телефона.",
                    &[],
                    &[
                        "Подключите телефон и телевизор к одной сети Wi-Fi.",
                        "Для видео откройте приложение с кнопкой трансляции.",
                        "Выберите телевизор из списка устройств.",
                    ],
                    &["Полное дублирование экрана и защищённый контент поддерживаются не всеми телефонами и приложениями."],
                ));
            }
            (
                _,
                "samsung-smart-tv" | "lg-smart-tv" | "yandex-tv" | "other-smart-tv" | "unknown",
            ) => {
                let mut route = phone_tv_route(
                    "wireless-screen",
                    "needs-check",
                    "Беспроводной экран, если обе модели его поддерживают",
                    "Названия функции различаются: Smart View, Трансляция, Беспроводной экран или Screen Share.",
                    &[],
                    &[
                        "Найдите на телевизоре режим беспроводного экрана или трансляции.",
                        "На Android откройте панель быстрых настроек.",
                        "Найдите «Трансляция», Smart View или «Беспроводной экран».",
                        "Выберите телевизор и подтвердите подключение.",
                    ],
                    &[
                        "Android и Smart TV не гарантируют общий протокол: нужна проверка обеих точных моделей.",
                    ],
                );
                route.source_ids = match tv {
                    "samsung-smart-tv" => vec!["samsung-smart-view".to_string()],
                    "lg-smart-tv" => vec!["lg-screen-share".to_string()],
                    _ => vec![],
                };
                routes.push(route);
                next_checks.push(
                    "Проверьте одинаковую функцию беспроводного экрана в телефоне и телевизоре."
                        .to_string(),
                );
            }
            (_, "apple-tv") => {
                rejected_reasons.push(
                    "Android не имеет универсального системного AirPlay-маршрута к Apple TV."
                        .to_string(),
                );
            }
            (_, "hdmi-tv") => {}
            _ => unreachable!(),
        }
    }

    if hdmi == "no" {
        rejected_reasons
            .push("На телевизоре нет доступного HDMI-входа для проводного маршрута.".to_string());
    } else if phone == "iphone" {
        let (title, equipment, condition) = match connector {
            "usb-c" => (
                "Проводное подключение USB-C → HDMI",
                vec![
                    "кабель или адаптер USB-C → HDMI с поддержкой видео",
                    "кабель HDMI при использовании адаптера",
                ],
                "Поддержка внешнего экрана есть не у каждого iPhone с USB-C; сначала сверьте точную модель в руководстве Apple.",
            ),
            "lightning" => (
                "Проводное подключение Lightning → HDMI",
                vec!["совместимый цифровой AV-адаптер Lightning", "кабель HDMI"],
                "Подходит iPhone с Lightning; обычный кабель Lightning → USB не выводит изображение.",
            ),
            _ => (
                "Проводное подключение после проверки разъёма iPhone",
                vec!["видеоадаптер для точного разъёма телефона", "кабель HDMI"],
                "Сначала определите USB-C или Lightning — адаптеры между ними не взаимозаменяемы.",
            ),
        };
        routes.push(phone_tv_route(
            "iphone-hdmi",
            "needs-check",
            title,
            condition,
            &equipment,
            &[
                "Подключите подходящий видеоадаптер к iPhone.",
                "Соедините адаптер с HDMI-входом телевизора.",
                "На телевизоре выберите тот же номер HDMI.",
                "Разблокируйте iPhone и запустите нужный контент.",
            ],
            &["Некоторые приложения ограничивают вывод защищённого видео на внешний экран."],
        ));
        next_checks.push(
            "Сверьте точную модель iPhone, совместимость видеоадаптера и требования HDCP в официальных инструкциях."
                .to_string(),
        );
    } else {
        match (connector, android_video_output) {
            ("usb-c", "yes") => {
                routes.push(phone_tv_route(
                    "android-usb-c-hdmi",
                    "needs-check",
                    "Проводное подключение USB-C → HDMI",
                    "Работает только потому, что видеовыход точной модели Android уже подтверждён.",
                    &["кабель или адаптер USB-C → HDMI с поддержкой видео", "кабель HDMI при использовании адаптера"],
                    &[
                        "Соедините телефон и HDMI-вход телевизора.",
                        "На телевизоре выберите тот же номер HDMI.",
                        "Подтвердите режим внешнего экрана на телефоне, если появится запрос.",
                    ],
                    &["USB-C описывает форму разъёма; видеовыход должен быть отдельно указан в характеристиках телефона."],
                ));
                next_checks.push(
                    "Повторно сверьте точную модель Android, её видеовыход и HDMI-вход телевизора по официальным руководствам."
                        .to_string(),
                );
            }
            ("usb-c", "unknown") => {
                routes.push(phone_tv_route(
                    "android-usb-c-hdmi",
                    "needs-check",
                    "USB-C → HDMI после проверки видеовыхода",
                    "Наличие USB-C не означает поддержку DisplayPort Alt Mode или другого видеовыхода.",
                    &["кабель или адаптер USB-C → HDMI — только после подтверждения видеовыхода"],
                    &[
                        "Найдите точную модель телефона в официальных характеристиках.",
                        "Проверьте поддержку вывода видео по USB-C.",
                        "Только после подтверждения выбирайте кабель или адаптер.",
                    ],
                    &["Не покупайте переходник по форме разъёма: он может только заряжать телефон."],
                ));
                next_checks.push(
                    "Сверьте видеовыход USB-C по официальной спецификации точной модели телефона."
                        .to_string(),
                );
            }
            ("usb-c", "no") => {
                rejected_reasons.push(
                    "У выбранного Android подтверждено отсутствие видеовыхода по USB-C."
                        .to_string(),
                );
            }
            ("micro-usb", _) => {
                rejected_reasons.push("Обычный Micro-USB не является универсальным видеовыходом; редкие MHL-сценарии требуют проверки точной модели.".to_string());
                next_checks.push("Проверьте в официальной спецификации телефона отдельное упоминание MHL или видеовыхода.".to_string());
            }
            ("unknown", _) => {
                routes.push(phone_tv_route(
                    "android-wired-check",
                    "needs-check",
                    "Проводной маршрут после проверки телефона",
                    "По одному слову Android нельзя подобрать безопасный видеоадаптер.",
                    &[],
                    &[
                        "Определите точную модель телефона и тип разъёма.",
                        "Проверьте в официальной спецификации поддержку видеовыхода.",
                        "Проверьте наличие свободного HDMI-входа телевизора.",
                    ],
                    &["Обычный USB-кабель обычно предназначен для питания или файлов, а не для дублирования экрана."],
                ));
            }
            ("lightning", _) => unreachable!(),
            _ => unreachable!(),
        }
    }

    if same_network != "yes" && wants_wireless {
        next_checks.push(
            "Для базового беспроводного сценария подключите оба устройства к одной сети Wi-Fi."
                .to_string(),
        );
    }
    if hdmi == "unknown" && goal == "no-wifi" {
        next_checks.push(
            "Проверьте свободный HDMI-вход и его номер на задней или боковой панели телевизора."
                .to_string(),
        );
    }

    routes.sort_by_key(|route| match route.readiness.as_str() {
        "ready" => 0,
        "needs-check" => 1,
        _ => 2,
    });
    routes.dedup_by(|left, right| left.id == right.id);
    next_checks.dedup();
    rejected_reasons.dedup();

    let status = if routes.iter().any(|route| route.readiness == "ready") {
        "ready"
    } else if routes.iter().any(|route| route.readiness == "needs-check") {
        "needs-check"
    } else {
        "no-direct-path"
    };
    let primary_route_id = routes.first().map(|route| route.id.clone());

    Ok(PhoneTvConnectionPlan {
        status: status.to_string(),
        phone: phone.to_string(),
        tv: tv.to_string(),
        goal: goal.to_string(),
        primary_route_id,
        routes,
        rejected_reasons,
        next_checks,
        privacy: "Расчёт выполняется локально в браузере; выбранные устройства не отправляются на сервер."
        .to_string(),
    })
}

/// Наблюдения пользователя для безопасной проверки сообщения «Нет сигнала».
///
/// Все поля являются закрытыми вариантами выбора. Значение `unknown` —
/// полноценное наблюдение: движок не подменяет его догадкой о причине.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct TvNoSignalInput {
    pub source: String,
    pub tv_menu_visible: String,
    pub source_powered: String,
    pub input_matches: String,
    pub cable_connected: String,
    pub receiver_menu_visible: String,
}

/// Один проверяемый и безопасный шаг плана «Нет сигнала».
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct TvNoSignalStep {
    pub id: String,
    pub title: String,
    pub instruction: String,
    pub source_ids: Vec<String>,
    pub stop_condition: String,
}

/// Консервативный план следующей проверки без диагноза оборудования.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct TvNoSignalPlan {
    pub status: String,
    pub source: String,
    pub primary_step_id: Option<String>,
    pub headline: String,
    pub explanation: String,
    pub steps: Vec<TvNoSignalStep>,
    pub stop_conditions: Vec<String>,
    pub privacy: String,
}

fn tv_no_signal_step(
    id: &str,
    title: &str,
    instruction: &str,
    source_ids: &[&str],
    stop_condition: &str,
) -> TvNoSignalStep {
    TvNoSignalStep {
        id: id.to_string(),
        title: title.to_string(),
        instruction: instruction.to_string(),
        source_ids: source_ids
            .iter()
            .map(|source_id| (*source_id).to_string())
            .collect(),
        stop_condition: stop_condition.to_string(),
    }
}

fn tv_no_signal_plan(
    status: &str,
    source: &str,
    headline: &str,
    explanation: &str,
    steps: Vec<TvNoSignalStep>,
    stop_conditions: &[&str],
) -> TvNoSignalPlan {
    TvNoSignalPlan {
        status: status.to_string(),
        source: source.to_string(),
        primary_step_id: steps.first().map(|step| step.id.clone()),
        headline: headline.to_string(),
        explanation: explanation.to_string(),
        steps,
        stop_conditions: stop_conditions
            .iter()
            .map(|condition| (*condition).to_string())
            .collect(),
        privacy:
            "Проверка выполняется локально в браузере; выбранные ответы не отправляются на сервер."
                .to_string(),
    }
}

fn tv_no_signal_hdmi_steps(input: &TvNoSignalInput) -> Vec<TvNoSignalStep> {
    let mut steps = Vec::new();

    if input.input_matches != "yes" {
        steps.push(tv_no_signal_step(
            "select-matching-input",
            "Сверьте номер HDMI",
            if input.input_matches == "no" {
                "Проследите кабель до разъёма телевизора и выберите на ТВ именно этот HDMI-вход."
            } else {
                "Проследите кабель до разъёма телевизора, запомните номер HDMI и выберите тот же вход кнопкой Source/Input."
            },
            &["samsung-hdmi", "sony-hdmi"],
            "Если собственное меню телевизора перестало отображаться, прекратите проверку сигнала.",
        ));
    }

    if input.source_powered != "yes" {
        steps.push(tv_no_signal_step(
            "confirm-source-power",
            "Проверьте питание источника",
            if input.source_powered == "no" {
                "Включите приставку, компьютер или другое внешнее устройство и дождитесь его обычной загрузки."
            } else {
                "Убедитесь по штатному индикатору или меню, что внешнее устройство включено и завершило загрузку."
            },
            &["samsung-hdmi", "sony-hdmi"],
            "Если устройство необычно нагрелось, пахнет гарью или имеет повреждённый провод, отключите питание и обратитесь в сервис.",
        ));
    }

    steps.push(tv_no_signal_step(
        "connect-hdmi-directly",
        "Оставьте прямую HDMI-цепочку",
        "Соедините HDMI OUT источника напрямую с HDMI IN телевизора, временно исключив ресивер, сплиттер и переходники.",
        &["samsung-hdmi", "sony-hdmi"],
        "Не разбирайте устройства и не трогайте повреждённые разъёмы или кабели.",
    ));
    steps.push(tv_no_signal_step(
        "reseat-and-isolate-hdmi",
        "Изолируйте одно звено за раз",
        "При выключенных устройствах переподключите кабель, затем по очереди проверьте другой HDMI-вход, заведомо рабочий кабель или второй источник, если они уже есть под рукой.",
        &["samsung-hdmi", "sony-hdmi"],
        "Не объявляйте кабель или телевизор причиной, пока отдельная проверка не повторила результат.",
    ));
    steps.push(tv_no_signal_step(
        "check-source-output",
        "Проверьте видеовыход источника",
        "Если источник доступен на другом экране, проверьте, что он действительно выводит изображение и использует поддерживаемое разрешение.",
        &["samsung-hdmi", "sony-hdmi"],
        "Если другого экрана нет, пропустите этот шаг — не делайте вывод о поломке по одному сообщению.",
    ));

    steps
}

/// Возвращает безопасный порядок проверок для сообщения «Нет сигнала».
///
/// Движок ранжирует только наблюдаемые проверки. Он не диагностирует плату,
/// матрицу, кабель, антенну или внешнее устройство и не рекомендует покупку.
pub fn calculate_tv_no_signal(input: &TvNoSignalInput) -> Result<TvNoSignalPlan, String> {
    require_choice(
        &input.source,
        &["hdmi", "terrestrial", "cable-box", "satellite", "unknown"],
        "Источник просмотра",
    )?;
    for (value, label) in [
        (&input.tv_menu_visible, "Меню телевизора"),
        (&input.source_powered, "Питание источника"),
        (&input.input_matches, "Выбранный вход"),
        (&input.cable_connected, "Подключение кабеля"),
        (&input.receiver_menu_visible, "Меню приставки"),
    ] {
        require_choice(value, &["yes", "no", "unknown"], label)?;
    }

    if input.tv_menu_visible == "no" {
        return Ok(tv_no_signal_plan(
            "needs-service",
            &input.source,
            "Сначала проверьте сам телевизор",
            "Если не видно даже собственного меню или шкалы громкости ТВ, нельзя относить проблему к входному сигналу.",
            vec![tv_no_signal_step(
                "stop-signal-check",
                "Остановите проверку входного сигнала",
                "Откройте меню или измените громкость штатным пультом. Если собственная графика ТВ не появилась, запишите модель и обратитесь в поддержку или сервис.",
                &[],
                "Не разбирайте телевизор и не проверяйте внутренние узлы самостоятельно.",
            )],
            &[
                "Не разбирайте телевизор и не работайте с ним под напряжением.",
                "Если есть запах гари, треск или повреждение питания, отключите телевизор от розетки.",
            ],
        ));
    }

    if input.tv_menu_visible == "unknown" {
        return Ok(tv_no_signal_plan(
            "action-plan",
            &input.source,
            "Сначала отделите экран ТВ от источника",
            "Один короткий тест покажет, можно ли продолжать проверку входного сигнала.",
            vec![tv_no_signal_step(
                "check-tv-menu",
                "Откройте собственное меню ТВ",
                "Штатным пультом откройте меню телевизора или измените громкость и проверьте, появилась ли поверх сообщения шкала ТВ.",
                &[],
                "Если меню и шкала не появляются, остановите этот мастер и используйте сервисный путь.",
            )],
            &["Не разбирайте телевизор и не работайте с ним под напряжением."],
        ));
    }

    if input.source == "unknown" {
        return Ok(tv_no_signal_plan(
            "unknown-source",
            &input.source,
            "Определите, кто показывает сообщение",
            "Без источника мастер не будет угадывать причину или советовать оборудование.",
            vec![tv_no_signal_step(
                "identify-message-source",
                "Переключите Source/Input",
                "Откройте список входов ТВ и по очереди выберите TV/DTV и физически подключённые HDMI. Отметьте, на каком входе меняется экран или появляется меню приставки.",
                &["samsung-hdmi", "sony-hdmi", "samsung-channel-setup"],
                "Не запускайте сброс настроек и не меняйте кабели, пока источник сообщения не определён.",
            )],
            &["Не делайте вывод о неисправности по одному сообщению «Нет сигнала»."],
        ));
    }

    match input.source.as_str() {
        "hdmi" => Ok(tv_no_signal_plan(
            "action-plan",
            &input.source,
            "Проверьте HDMI от входа к источнику",
            "План последовательно исключает выбор входа, питание и цепочку соединения, но не называет виноватое устройство.",
            tv_no_signal_hdmi_steps(input),
            &[
                "Не разбирайте телевизор или источник и не работайте с ними под напряжением.",
                "Не считайте кабель или разъём неисправным без отдельной повторной проверки.",
            ],
        )),
        "terrestrial" => {
            let mut steps = Vec::new();
            if input.input_matches != "yes" {
                steps.push(tv_no_signal_step(
                    "select-tv-dtv",
                    "Выберите TV/DTV",
                    "Откройте Source/Input и выберите телевизионный вход TV/DTV, а не HDMI.",
                    &["samsung-channel-setup", "rtrs-dtv"],
                    "Если собственного меню ТВ больше не видно, остановите проверку сигнала.",
                ));
            }
            if input.cable_connected != "yes" {
                steps.push(tv_no_signal_step(
                    "check-accessible-antenna-cable",
                    "Проверьте доступный антенный кабель",
                    "Осмотрите только доступное соединение кабеля с входом ANT/RF телевизора и аккуратно вставьте штекер до упора.",
                    &["samsung-channel-setup", "rtrs-dtv"],
                    "Не поднимайтесь к антенне на крышу и не работайте с недоступным кабелем.",
                ));
            }
            steps.push(tv_no_signal_step(
                "run-dtv-auto-search",
                "Запустите автоматический поиск DTV",
                "В меню каналов выберите эфирную антенну и автоматический цифровой поиск DTV; сохраните найденные каналы.",
                &["samsung-channel-setup", "rtrs-dtv"],
                "Не выполняйте заводской сброс: для этой проверки достаточно поиска каналов.",
            ));
            steps.push(tv_no_signal_step(
                "compare-terrestrial-reception",
                "Сравните приём без догадок",
                "Если поиск не нашёл каналы, проверьте официальный справочный сервис РТРС для своей местности или сравните приём с соседним исправным телевизором, если это возможно.",
                &["rtrs-dtv"],
                "Не меняйте положение наружной антенны в одиночку и не выходите на крышу.",
            ));
            Ok(tv_no_signal_plan(
                "action-plan",
                &input.source,
                "Проверьте эфирный вход и поиск DTV",
                "Антенна, вход TV/DTV и цифровой поиск проверяются отдельно; отсутствие каналов само по себе не устанавливает причину.",
                steps,
                &[
                    "Не поднимайтесь к антенне на крышу.",
                    "Не выполняйте заводской сброс и не вскрывайте телевизор.",
                ],
            ))
        }
        "cable-box" => {
            if input.input_matches == "yes"
                && input.source_powered == "yes"
                && input.receiver_menu_visible == "yes"
            {
                let mut steps = Vec::new();
                if input.cable_connected != "yes" {
                    steps.push(tv_no_signal_step(
                        "check-accessible-provider-cable",
                        "Проверьте доступный кабель оператора",
                        "Осмотрите только доступное внешнее соединение кабеля с приставкой и вставьте разъём без усилия.",
                        &[],
                        "Не вскрывайте приставку и не трогайте общедомовое оборудование.",
                    ));
                }
                steps.push(tv_no_signal_step(
                    "contact-provider",
                    "Проверьте статус у оператора",
                    "Зафиксируйте текст сообщения, модель приставки и время появления, затем проверьте уведомления оператора или обратитесь в его поддержку.",
                    &[],
                    "Не выполняйте заводской сброс приставки без инструкции своего оператора.",
                ));
                return Ok(tv_no_signal_plan(
                    "provider-path",
                    &input.source,
                    "Телевизор показывает меню приставки",
                    "HDMI-вход и питание подтверждены, поэтому следующий проверяемый путь находится на стороне приставки или услуги оператора; точная причина не установлена.",
                    steps,
                    &[
                        "Не вскрывайте приставку и не трогайте общедомовое оборудование.",
                        "Не выполняйте заводской сброс без инструкции оператора.",
                    ],
                ));
            }

            let mut steps = tv_no_signal_hdmi_steps(input);
            steps.push(tv_no_signal_step(
                "open-receiver-menu",
                "Откройте меню приставки",
                "Штатным пультом приставки попробуйте открыть её меню или программу передач, чтобы отделить HDMI-соединение от сигнала оператора.",
                &[],
                "Если меню приставки появилось, продолжайте проверку через поддержку своего оператора.",
            ));
            Ok(tv_no_signal_plan(
                "action-plan",
                &input.source,
                "Сначала подтвердите связь ТВ с приставкой",
                "Пока меню приставки не видно, нельзя относить сообщение к оператору или кабельной сети.",
                steps,
                &[
                    "Не вскрывайте приставку и не трогайте общедомовое оборудование.",
                    "Не выполняйте заводской сброс без инструкции оператора.",
                ],
            ))
        }
        "satellite" => {
            let mut steps = Vec::new();
            if input.input_matches != "yes" {
                steps.push(tv_no_signal_step(
                    "select-satellite-receiver-input",
                    "Сверьте вход спутникового приёмника",
                    "Проследите HDMI-кабель от приёмника до телевизора и выберите на ТВ тот же номер входа.",
                    &["sony-hdmi"],
                    "Если собственное меню ТВ перестало отображаться, прекратите проверку сигнала.",
                ));
            }
            if input.source_powered != "yes" {
                steps.push(tv_no_signal_step(
                    "confirm-satellite-receiver-power",
                    "Проверьте питание приёмника",
                    "Убедитесь по штатному индикатору и экрану загрузки, что спутниковый приёмник включён.",
                    &[],
                    "При запахе гари, треске или повреждённом проводе отключите питание и обратитесь в сервис.",
                ));
            }
            if input.receiver_menu_visible != "yes" {
                steps.push(tv_no_signal_step(
                    "open-satellite-receiver-menu",
                    "Откройте меню приёмника",
                    "Штатным пультом приёмника откройте его меню, чтобы отличить сообщение телевизора от сообщения спутникового оборудования.",
                    &[],
                    "Если меню не появляется при правильном входе и питании, остановитесь и обратитесь в поддержку оборудования.",
                ));
            }
            if input.cable_connected != "yes" {
                steps.push(tv_no_signal_step(
                    "check-accessible-satellite-cable",
                    "Проверьте только доступный кабель",
                    "Осмотрите доступное внешнее соединение антенного кабеля с приёмником; не разбирайте разъёмы и оборудование.",
                    &[],
                    "Не поднимайтесь к антенне и не работайте на крыше.",
                ));
            }
            steps.push(tv_no_signal_step(
                "observe-weather-and-obstacles",
                "Оцените условия с безопасного места",
                "С земли проверьте, нет ли сильного снегопада, наледи или нового видимого препятствия в направлении антенны, и дождитесь окончания опасной погоды.",
                &[],
                "Не поворачивайте тарелку и не очищайте её, если для этого нужно подниматься или работать на высоте.",
            ));
            steps.push(tv_no_signal_step(
                "contact-satellite-support",
                "Передайте наблюдения специалисту",
                "Запишите текст сообщения, показания шкал сигнала, если они доступны в меню, модель приёмника и выполненные проверки, затем обратитесь в поддержку оператора.",
                &[],
                "Настройку недоступной антенны и работы на высоте должен выполнять специалист.",
            ));
            Ok(tv_no_signal_plan(
                "action-plan",
                &input.source,
                "Проверьте приёмник, не трогая антенну",
                "План отделяет вход телевизора от спутникового приёмника и заканчивается безопасной передачей наблюдений специалисту.",
                steps,
                &[
                    "Не поднимайтесь к антенне на крышу и не поворачивайте тарелку.",
                    "Не разбирайте приёмник, телевизор или антенный тракт.",
                ],
            ))
        }
        "unknown" => unreachable!(),
        _ => unreachable!(),
    }
}

/// Закрытые наблюдения для трёх самостоятельных traffic-first мастеров.
///
/// Поля имеют разные подписи в интерфейсе, но всегда принимают только заранее
/// определённые варианты. Движок не получает свободный текст, модель, адрес,
/// сетевой пароль или другие пользовательские данные.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct TvTrafficTaskInput {
    pub task: String,
    pub primary: String,
    pub secondary: String,
    pub tertiary: String,
    pub detail: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct TvTrafficTaskStep {
    pub id: String,
    pub title: String,
    pub instruction: String,
    pub source_ids: Vec<String>,
    pub stop_condition: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct TvTrafficTaskPlan {
    pub status: String,
    pub task: String,
    pub headline: String,
    pub explanation: String,
    pub steps: Vec<TvTrafficTaskStep>,
    pub warnings: Vec<String>,
    pub privacy: String,
}

fn tv_traffic_task_step(
    id: &str,
    title: &str,
    instruction: &str,
    source_ids: &[&str],
    stop_condition: &str,
) -> TvTrafficTaskStep {
    TvTrafficTaskStep {
        id: id.to_string(),
        title: title.to_string(),
        instruction: instruction.to_string(),
        source_ids: source_ids
            .iter()
            .map(|source_id| (*source_id).to_string())
            .collect(),
        stop_condition: stop_condition.to_string(),
    }
}

fn tv_traffic_task_plan(
    status: &str,
    task: &str,
    headline: &str,
    explanation: &str,
    steps: Vec<TvTrafficTaskStep>,
    warnings: &[&str],
) -> TvTrafficTaskPlan {
    TvTrafficTaskPlan {
        status: status.to_string(),
        task: task.to_string(),
        headline: headline.to_string(),
        explanation: explanation.to_string(),
        steps,
        warnings: warnings
            .iter()
            .map(|warning| (*warning).to_string())
            .collect(),
        privacy:
            "План рассчитывается локально в браузере; выбранные ответы не отправляются на сервер."
                .to_string(),
    }
}

fn calculate_laptop_tv_task(input: &TvTrafficTaskInput) -> Result<TvTrafficTaskPlan, String> {
    require_choice(
        &input.primary,
        &["windows", "macos", "other", "unknown"],
        "Система ноутбука",
    )?;
    require_choice(
        &input.secondary,
        &["hdmi", "usb-c", "wireless", "unknown"],
        "Способ подключения",
    )?;
    require_choice(
        &input.tertiary,
        &["mirror", "extend", "video", "game"],
        "Задача подключения",
    )?;
    require_choice(
        &input.detail,
        &["yes", "no", "unknown"],
        "Подтверждение поддержки",
    )?;

    let mode_label = match input.tertiary.as_str() {
        "extend" => "«Расширить»: телевизор станет вторым рабочим столом.",
        "game" => {
            "Для игры сначала выберите вывод на телевизор и проверьте задержку на прямом соединении."
        }
        "video" => {
            "Для видео выберите дублирование либо только телевизор и отдельно проверьте вывод звука."
        }
        _ => "«Повторять»: на телевизоре и ноутбуке будет одно изображение.",
    };

    if input.primary == "unknown" || input.secondary == "unknown" {
        return Ok(tv_traffic_task_plan(
            "needs-check",
            "laptop-to-tv",
            "Сначала определите систему и видеовыход",
            "Без системы ноутбука и точного способа связи нельзя честно выбрать сочетание клавиш, адаптер или беспроводной протокол.",
            vec![
                tv_traffic_task_step(
                    "identify-system",
                    "Уточните Windows или macOS",
                    "Откройте сведения о системе ноутбука и запишите её название. Для другой системы используйте руководство производителя.",
                    &["microsoft-wireless-display", "apple-mac-tv"],
                    "Не устанавливайте неизвестные программы для трансляции только ради этой проверки.",
                ),
                tv_traffic_task_step(
                    "identify-video-path",
                    "Проверьте разъёмы и поддержку",
                    "Найдите HDMI либо точное указание DisplayPort/Thunderbolt через USB-C; для беспроводного пути нужна явная поддержка на ноутбуке и телевизоре.",
                    &[
                        "vesa-displayport",
                        "microsoft-wireless-display",
                        "apple-mac-airplay",
                    ],
                    "Форма USB-C и надпись Smart TV сами по себе совместимость не подтверждают.",
                ),
            ],
            &[
                "Обычный USB-порт без заявленного видеовыхода не является HDMI-входом.",
                "Не покупайте адаптер до проверки точной модели ноутбука и телевизора.",
            ],
        ));
    }

    let mut steps = Vec::new();
    let (status, headline, explanation) = match (input.primary.as_str(), input.secondary.as_str()) {
        ("windows", "hdmi") => {
            steps.push(tv_traffic_task_step(
                "connect-hdmi",
                "Соедините HDMI OUT и HDMI IN",
                "Подключите ноутбук напрямую к телевизору и выберите на ТВ тот номер HDMI, в который вставлен кабель.",
                &["microsoft-multiple-displays"],
                "Если видны повреждение, запах или сильный нагрев, отключите питание и прекратите проверку.",
            ));
            steps.push(tv_traffic_task_step(
                "windows-project-mode",
                "Нажмите Win + P",
                mode_label,
                &["microsoft-multiple-displays"],
                "Если телевизор не появился, не меняйте несколько параметров сразу — сначала проверьте вход и прямую цепочку.",
            ));
            (
                "ready",
                "Начните с прямого HDMI и Win + P",
                "Это самый короткий проверяемый маршрут для Windows с полноценным HDMI-выходом.",
            )
        }
        ("windows", "wireless") => {
            steps.push(tv_traffic_task_step(
                "confirm-miracast",
                "Подтвердите Miracast на обоих устройствах",
                "В руководстве телевизора найдите Miracast, «Беспроводной дисплей» или эквивалент. На Windows откройте панель Win + K.",
                &["microsoft-wireless-display"],
                "Если поддержка телевизора не заявлена, не считайте отсутствие в списке ошибкой Windows.",
            ));
            if input.detail == "yes" {
                steps.push(tv_traffic_task_step(
                    "windows-wireless-connect",
                    "Выберите телевизор через Win + K",
                    "Разрешите подключение на телевизоре, затем задайте режим экранов через Win + P.",
                    &["microsoft-wireless-display"],
                    "Для игры или точной работы оцените задержку; беспроводной путь не гарантирует её отсутствие.",
                ));
                (
                    "ready",
                    "Подключитесь через совместимый Miracast",
                    "Поддержка подтверждена вручную, поэтому можно переходить к сопряжению.",
                )
            } else if input.detail == "no" {
                (
                    "no-direct-path",
                    "Беспроводной путь не подтверждён",
                    "Не подменяйте Miracast общей надписью Wi-Fi или Smart TV. Проверьте проводной видеовыход отдельно.",
                )
            } else {
                (
                    "needs-check",
                    "Сначала подтвердите Miracast",
                    "Win + K показывает приёмники, но совместимость должна быть заявлена для обоих устройств.",
                )
            }
        }
        ("windows", "usb-c") => {
            steps.push(tv_traffic_task_step(
                "verify-usb-c-video",
                "Проверьте видеовыход USB-C",
                "В официальной спецификации точной модели ноутбука найдите DisplayPort Alt Mode, Thunderbolt либо явную поддержку внешнего дисплея.",
                &["vesa-displayport"],
                "Не выбирайте кабель по форме разъёма: USB-C может передавать только данные и питание.",
            ));
            if input.detail == "yes" {
                steps.push(tv_traffic_task_step(
                    "usb-c-display-mode",
                    "Подключите совместимый видеотракт",
                    mode_label,
                    &["vesa-displayport", "microsoft-multiple-displays"],
                    "Разрешение и частота ограничены всей цепочкой: ноутбуком, адаптером, кабелем и телевизором.",
                ));
                (
                    "ready",
                    "USB-C видеовыход подтверждён",
                    "Теперь можно выбирать режим экрана; тип адаптера определяется подтверждённым видеовыходом.",
                )
            } else if input.detail == "no" {
                (
                    "no-direct-path",
                    "Этот USB-C не подтверждает видео",
                    "Для него нужен другой, отдельно подтверждённый способ подключения.",
                )
            } else {
                (
                    "needs-check",
                    "USB-C ещё не видеовыход",
                    "Сначала нужна официальная спецификация точной модели ноутбука.",
                )
            }
        }
        ("macos", "hdmi") => {
            steps.push(tv_traffic_task_step(
                "mac-connect-hdmi",
                "Подключите видеокабель к телевизору",
                "Соедините HDMI или подтверждённый видеовыход Mac с видеовходом телевизора и выберите этот вход на ТВ.",
                &["apple-mac-tv"],
                "Если нужен адаптер, сначала сверьте порты и число поддерживаемых дисплеев точной модели Mac.",
            ));
            steps.push(tv_traffic_task_step(
                "mac-display-mode",
                "Откройте «Системные настройки → Дисплеи»",
                "Выберите видеоповтор либо расширение экрана; для звука отдельно выберите телевизор в настройках выхода.",
                &["apple-mac-tv"],
                "Не назначайте неподдерживаемое разрешение или частоту по совету для другой модели.",
            ));
            (
                "ready",
                "Подключите Mac как внешний дисплей",
                "Apple документирует проводное подключение и выбор режима в настройках дисплеев.",
            )
        }
        ("macos", "wireless") => {
            steps.push(tv_traffic_task_step(
                "confirm-airplay",
                "Подтвердите AirPlay на телевизоре",
                "Нужен Apple TV или телевизор с явно заявленной поддержкой AirPlay; устройства подключите к одной сети Wi-Fi.",
                &["apple-mac-airplay"],
                "Надпись Smart TV без AirPlay не подтверждает этот маршрут.",
            ));
            if input.detail == "yes" {
                steps.push(tv_traffic_task_step(
                    "mac-airplay-connect",
                    "Выберите телевизор в «Видеоповторе экрана»",
                    "Откройте Пункт управления Mac, выберите видеоповтор и подтвердите код с телевизора, если он появится.",
                    &["apple-mac-airplay"],
                    "Отдельное приложение или защищённый контент могут ограничивать передачу видео.",
                ));
                (
                    "ready",
                    "Используйте подтверждённый AirPlay",
                    "Оба конца маршрута известны; можно переходить к видеоповтору.",
                )
            } else if input.detail == "no" {
                (
                    "no-direct-path",
                    "AirPlay на телевизоре не подтверждён",
                    "Проверьте проводной видеовход или другой документированный путь для точных моделей.",
                )
            } else {
                (
                    "needs-check",
                    "Сначала подтвердите AirPlay",
                    "Одна сеть Wi-Fi не добавляет поддержку протокола телевизору.",
                )
            }
        }
        ("macos", "usb-c") => {
            steps.push(tv_traffic_task_step(
                "mac-usb-c-video",
                "Проверьте число и тип внешних дисплеев",
                "Сверьте официальные характеристики точной модели Mac и используйте только заявленный видеовыход или совместимый адаптер.",
                &["apple-mac-tv"],
                "USB-C описывает разъём, но не снимает модельные ограничения дисплеев.",
            ));
            if input.detail == "yes" {
                steps.push(tv_traffic_task_step(
                    "mac-usb-c-display-mode",
                    "Настройте внешний дисплей",
                    "После подключения откройте «Системные настройки → Дисплеи» и выберите видеоповтор либо расширение.",
                    &["apple-mac-tv"],
                    "Если изображение нестабильно, верните рекомендуемое системой разрешение и частоту.",
                ));
                (
                    "ready",
                    "Видеовыход Mac подтверждён",
                    "Можно подключать телевизор как внешний дисплей в пределах спецификации Mac.",
                )
            } else if input.detail == "no" {
                (
                    "no-direct-path",
                    "Проводной видеовыход не подтверждён",
                    "Не подбирайте адаптер без другого явно заявленного видеовыхода.",
                )
            } else {
                (
                    "needs-check",
                    "Сначала проверьте модель Mac",
                    "Поддержка и число внешних дисплеев различаются между моделями.",
                )
            }
        }
        _ => {
            steps.push(tv_traffic_task_step(
                "use-system-manual",
                "Откройте руководство системы ноутбука",
                "Проверьте заявленные видеовыходы и беспроводные протоколы точной модели, затем сопоставьте их со входом телевизора.",
                &["vesa-displayport"],
                "Не переносите сочетания клавиш Windows или macOS на другую систему.",
            ));
            (
                "needs-check",
                "Нужна инструкция точной системы",
                "Для выбранной системы нельзя безопасно дать универсальное сочетание клавиш.",
            )
        }
    };

    Ok(tv_traffic_task_plan(
        status,
        "laptop-to-tv",
        headline,
        explanation,
        steps,
        &[
            "USB-C, Wi-Fi и Smart TV сами по себе не доказывают совместимый видеопротокол.",
            "Если изображение уже работало и внезапно пропало, используйте отдельный мастер «Нет сигнала».",
        ],
    ))
}

fn calculate_digital_channels_task(
    input: &TvTrafficTaskInput,
) -> Result<TvTrafficTaskPlan, String> {
    require_choice(
        &input.primary,
        &["antenna", "cable", "provider-box", "satellite", "unknown"],
        "Источник каналов",
    )?;
    require_choice(
        &input.secondary,
        &["built-in", "external", "unknown"],
        "Устройство настройки",
    )?;
    require_choice(
        &input.tertiary,
        &["first-setup", "zero-channels", "some-missing"],
        "Состояние списка каналов",
    )?;
    require_choice(
        &input.detail,
        &["yes", "no", "unknown"],
        "Подключение кабеля",
    )?;

    if input.primary == "provider-box"
        || input.primary == "satellite"
        || input.secondary == "external"
    {
        return Ok(tv_traffic_task_plan(
            "provider-path",
            "digital-channels",
            "Настраивайте каналы на внешней приставке",
            "Если антенный или операторский кабель подключён к приставке, телевизор показывает только её HDMI/AV-сигнал и не владеет списком каналов.",
            vec![
                tv_traffic_task_step(
                    "select-box-input",
                    "Выберите вход приставки на телевизоре",
                    "Проследите кабель от приставки до HDMI/AV телевизора и выберите тот же вход кнопкой Source/Input.",
                    &["samsung-channel-setup"],
                    "Не запускайте поиск эфирных каналов на телевизоре, если список показывает приставка.",
                ),
                tv_traffic_task_step(
                    "use-box-remote",
                    "Откройте меню приставки её пультом",
                    "Автопоиск, параметры оператора и сортировку выполняйте по инструкции своей приставки или оператора.",
                    &["samsung-channel-setup"],
                    "Не применяйте параметры другого оператора и не выполняйте заводской сброс как первый шаг.",
                ),
            ],
            &[
                "Повторный поиск может изменить или заменить сохранённый список каналов.",
                "Спутниковую антенну и недоступный кабель должен проверять специалист.",
            ],
        ));
    }

    if input.primary == "unknown" || input.secondary == "unknown" {
        return Ok(tv_traffic_task_plan(
            "needs-check",
            "digital-channels",
            "Сначала определите источник каналов",
            "Меню и параметры поиска различаются для эфирной антенны, кабельного оператора и внешней приставки.",
            vec![
                tv_traffic_task_step(
                    "trace-tv-cable",
                    "Проследите подключённый кабель",
                    "Коаксиальный кабель прямо в разъёме ANT/RF телевизора означает встроенный тюнер; HDMI/AV от отдельной коробки означает внешнюю приставку.",
                    &["samsung-channel-setup"],
                    "Не отсоединяйте повреждённый кабель и не работайте с недоступной антенной.",
                ),
                tv_traffic_task_step(
                    "check-tuner-standard",
                    "Сверьте стандарт точной модели",
                    "Для российского эфирного ТВ нужен DVB-T2, для прямого кабеля обычно DVB-C и параметры оператора.",
                    &["samsung-channel-setup", "rtrs-dtv"],
                    "Не угадывайте поддержку тюнера по году или внешнему виду телевизора.",
                ),
            ],
            &["До определения источника не запускайте повторный поиск — он может заменить список."],
        ));
    }

    if input.primary == "antenna" {
        let mut steps = vec![
            tv_traffic_task_step(
                "verify-dvb-t2",
                "Проверьте DVB-T2 у точной модели",
                "Найдите DVB-T2 в официальных характеристиках телевизора; если его нет, поиск встроенным тюнером не решит задачу.",
                &["samsung-channel-setup", "rtrs-dtv"],
                "Не покупайте приставку до проверки точной модели и существующего оборудования.",
            ),
            tv_traffic_task_step(
                "check-antenna-connection",
                "Проверьте доступное антенное соединение",
                if input.detail == "no" {
                    "Подключите исправный доступный коаксиальный кабель к входу ANT/RF телевизора."
                } else {
                    "Убедитесь, что доступный коаксиальный кабель подключён к входу ANT/RF телевизора."
                },
                &["samsung-channel-setup", "rtrs-dtv"],
                "Не поднимайтесь на крышу и не ремонтируйте общедомовую сеть самостоятельно.",
            ),
            tv_traffic_task_step(
                "scan-terrestrial-digital",
                "Выберите «Антенна/Эфир» и цифровой поиск",
                "Откройте настройку каналов точной модели, выберите эфирную антенну и цифровые каналы, затем запустите автопоиск.",
                &["samsung-channel-setup", "rtrs-dtv"],
                "Перед запуском подтвердите сохранение или замену существующего списка каналов.",
            ),
        ];
        if input.tertiary != "first-setup" {
            steps.push(tv_traffic_task_step(
                "check-rtrs-data",
                "Сверьте доступность эфирного сигнала",
                "Проверьте карту и параметры ближайших передатчиков РТРС; частоту ручного поиска берите только для своего адреса и мультиплекса.",
                &["rtrs-dtv"],
                "Не направляйте антенну с крыши и не объявляйте телевизор неисправным по нулевому поиску.",
            ));
        }
        let status = if input.detail == "yes" {
            "ready"
        } else {
            "needs-check"
        };
        return Ok(tv_traffic_task_plan(
            status,
            "digital-channels",
            if status == "ready" {
                "Запустите цифровой поиск для эфирной антенны"
            } else {
                "Сначала подтвердите кабель и DVB-T2"
            },
            "Эфирный сценарий отделён от кабельного оператора и внешней приставки.",
            steps,
            &[
                "Автопоиск может изменить текущий порядок и состав списка.",
                "Один пропавший канал не является основанием менять антенну.",
            ],
        ));
    }

    let mut steps = vec![
        tv_traffic_task_step(
            "verify-dvb-c",
            "Проверьте DVB-C и прямое подключение",
            "Найдите DVB-C в характеристиках точной модели и убедитесь, что операторский коаксиальный кабель подключён прямо к телевизору, а не к приставке.",
            &["samsung-channel-setup", "lg-digital-channels"],
            "Если кабель идёт в приставку, вернитесь к её меню и пульту.",
        ),
        tv_traffic_task_step(
            "get-provider-parameters",
            "Возьмите параметры у своего оператора",
            "Уточните тип поиска, частоты и другие обязательные параметры в официальной поддержке кабельного оператора.",
            &["samsung-channel-setup", "lg-digital-channels"],
            "Не копируйте частоты и сетевые параметры другого города или оператора.",
        ),
        tv_traffic_task_step(
            "scan-cable-digital",
            "Выберите «Кабель» и цифровые каналы",
            "Запустите поиск по инструкции точной модели, используя подтверждённые параметры оператора.",
            &["samsung-channel-setup", "lg-digital-channels"],
            "Перед повторным поиском подтвердите, что существующий список можно заменить.",
        ),
    ];
    if input.tertiary == "some-missing" {
        steps.push(tv_traffic_task_step(
            "provider-channel-list",
            "Сверьте пакет и список оператора",
            "Если отсутствуют отдельные каналы, сначала проверьте действующий пакет и изменения сетки у оператора, а не перенастраивайте телевизор вслепую.",
            &[],
            "Не объявляйте тюнер неисправным по одному отсутствующему каналу.",
        ));
    }
    Ok(tv_traffic_task_plan(
        "needs-check",
        "digital-channels",
        "Для кабельного поиска нужны данные оператора",
        "DVB-C и прямое подключение телевизора — только половина маршрута; параметры сети зависят от оператора.",
        steps,
        &[
            "Не смешивайте режимы «Антенна» и «Кабель».",
            "Не выполняйте заводской сброс как первый способ поиска каналов.",
        ],
    ))
}

fn calculate_picture_setup_task(input: &TvTrafficTaskInput) -> Result<TvTrafficTaskPlan, String> {
    require_choice(
        &input.primary,
        &["everyday", "movie", "sports", "game"],
        "Сценарий просмотра",
    )?;
    require_choice(
        &input.secondary,
        &["dark", "mixed", "bright"],
        "Освещение комнаты",
    )?;
    require_choice(
        &input.tertiary,
        &[
            "baseline",
            "too-dark",
            "too-bright",
            "unnatural",
            "motion",
            "lag",
        ],
        "Наблюдение за изображением",
    )?;
    require_choice(&input.detail, &["yes", "no", "unknown"], "HDR-сигнал")?;

    let start_mode = match input.primary.as_str() {
        "movie" => {
            "Начните с режима «Кино», «Filmmaker» или ближайшего спокойного режима, если он есть у модели."
        }
        "game" => {
            "Для игровой приставки или ПК начните с игрового режима на конкретном HDMI-входе."
        }
        "sports" => "Начните со «Стандартного» режима и сравнивайте обработку движения отдельно.",
        _ => "Начните со «Стандартного» или спокойного заводского режима, а не с «Динамического».",
    };
    let room_step = match input.secondary.as_str() {
        "dark" => {
            "Проводите сравнение при обычном вечернем освещении и уменьшайте свет экрана постепенно, сохраняя детали в тенях."
        }
        "bright" => {
            "Проводите сравнение при обычном дневном свете; сначала проверьте отражения и работу датчика освещения, а не максимизируйте все ползунки."
        }
        _ => {
            "Зафиксируйте обычное освещение комнаты и не сравнивайте режимы при постоянно меняющемся свете."
        }
    };
    let symptom_step = match input.tertiary.as_str() {
        "too-dark" => (
            "compare-dark-picture",
            "Отделите источник от общей яркости",
            "Сравните меню телевизора, другой встроенный источник и тот же материал. Проверьте режим энергосбережения или датчик освещения и верните только настройки изображения текущего режима, если ранее их меняли.",
            "Если меню и все источники остаются необычно тёмными после сброса только режима изображения, остановитесь и обратитесь в поддержку модели.",
        ),
        "too-bright" => (
            "compare-bright-picture",
            "Уменьшайте свет экрана, сохраняя белые детали",
            "Сравните ступени серого и постепенно уменьшите параметр подсветки/яркости экрана, название которого указано в руководстве модели. Не копируйте чужое числовое значение.",
            "Если белые детали не различаются ни в одном заводском режиме, верните настройки изображения текущего режима и проверьте источник.",
        ),
        "unnatural" => (
            "restore-neutral-colour",
            "Верните нейтральную отправную точку",
            "Сбросьте только настройки текущего режима изображения, сравните «Стандартный» и «Кино», затем проверьте оттенки серого без усилителей цвета.",
            "Не изменяйте баланс белого и цветовое пространство по значениям для другой панели без измерительного прибора.",
        ),
        "motion" => (
            "compare-motion-processing",
            "Сравните обработку движения включённой и выключенной",
            "На одном спортивном или панорамном фрагменте изменяйте только интерполяцию движения. Для фильма начните с минимальной обработки; для спорта выберите самое слабое значение без заметных артефактов.",
            "Если двоение или рывки есть только у одного источника, сначала проверьте его частоту и качество сигнала.",
        ),
        "lag" => (
            "enable-game-mode",
            "Используйте игровой режим только для игры",
            "Включите игровой режим на том HDMI-входе, где подключена приставка или ПК, затем сравните задержку управления. Не оставляйте его обязательным для обычного телевидения.",
            "Если режим недоступен, проверьте источник и поддерживаемую частоту по руководству точной модели.",
        ),
        _ => (
            "compare-test-patterns",
            "Проверьте три простых паттерна",
            "На шкале серого ищите различимые соседние ступени, на чёрно-белой сетке — лишние ореолы, на равномерном поле — только явно повторяемые пятна. Меняйте один параметр за раз.",
            "Браузерный паттерн не является измерительным прибором и не доказывает заводской дефект панели.",
        ),
    };

    let mut steps = vec![
        tv_traffic_task_step(
            "record-picture-state",
            "Запишите вход, режим и исходные значения",
            "Настройки могут храниться отдельно для ТВ, приложений, HDMI и HDR. Сначала сфотографируйте экран параметров, чтобы можно было вернуться назад.",
            &["sony-picture-guide", "samsung-picture-settings"],
            "Не выполняйте общий заводской сброс телевизора ради сравнения изображения.",
        ),
        tv_traffic_task_step(
            "select-reversible-mode",
            "Выберите обратимую базовую точку",
            start_mode,
            &["sony-picture-guide", "samsung-game-mode"],
            "Названия и доступность режимов зависят от модели, источника и типа сигнала.",
        ),
        tv_traffic_task_step(
            "stabilize-room-light",
            "Зафиксируйте освещение комнаты",
            room_step,
            &["sony-picture-guide", "samsung-adaptive-picture"],
            "Не закрывайте вентиляцию телевизора и не направляйте яркий источник света прямо в экран.",
        ),
        tv_traffic_task_step(
            symptom_step.0,
            symptom_step.1,
            symptom_step.2,
            &[
                "sony-picture-guide",
                "samsung-picture-settings",
                "samsung-game-mode",
            ],
            symptom_step.3,
        ),
    ];

    if input.detail == "yes" {
        steps.push(tv_traffic_task_step(
            "keep-hdr-context",
            "Настраивайте HDR на реальном HDR-сигнале",
            "HDR может включать отдельный набор параметров. Сравнивайте их только во время воспроизведения подтверждённого HDR-материала на том же входе.",
            &["sony-hdr-picture-mode", "samsung-picture-settings"],
            "Не переносите SDR-значения в HDR и не включайте псевдо-HDR как универсальное улучшение.",
        ));
    } else if input.detail == "unknown" {
        steps.push(tv_traffic_task_step(
            "identify-hdr",
            "Не смешивайте SDR и HDR",
            "Проверьте информационную панель телевизора или приложения. Если HDR не подтверждён, оставьте его отдельные параметры без изменений.",
            &["sony-hdr-picture-mode"],
            "Яркая надпись в интерфейсе приложения не всегда подтверждает фактический HDR-сигнал.",
        ));
    }

    Ok(tv_traffic_task_plan(
        "reversible-baseline",
        "picture-setup",
        "Получен обратимый план настройки",
        "Он помогает сравнить режимы и наблюдаемые признаки, но не заменяет профессиональную калибровку с измерительным прибором.",
        steps,
        &[
            "Не копируйте числовые настройки для другой модели или экземпляра панели.",
            "Изменяйте один параметр за раз и сохраняйте возможность вернуть исходное значение.",
            "Проверяйте один и тот же материал на одном и том же входе и при неизменном освещении.",
        ],
    ))
}

/// Строит один безопасный план для выбранного самостоятельного TV-интента.
pub fn calculate_tv_traffic_task(input: &TvTrafficTaskInput) -> Result<TvTrafficTaskPlan, String> {
    require_choice(
        &input.task,
        &["laptop-to-tv", "digital-channels", "picture-setup"],
        "Инструмент",
    )?;
    match input.task.as_str() {
        "laptop-to-tv" => calculate_laptop_tv_task(input),
        "digital-channels" => calculate_digital_channels_task(input),
        "picture-setup" => calculate_picture_setup_task(input),
        _ => unreachable!(),
    }
}

/// Рассчитывает, хватит ли вылета кронштейна для горизонтального поворота ТВ.
///
/// Геометрия намеренно консервативна: signed-смещение VESA преобразуется в модуль,
/// чтобы проверить более длинную сторону экрана независимо от направления поворота.
/// Модель двумерная и не заменяет проверку толщины ТВ, разъёмов, кабелей и формы стены.
pub fn calculate_turn_clearance_plan(
    tv_width_cm: f64,
    vesa_offset_cm: f64,
    target_angle_degrees: f64,
    available_extension_cm: f64,
    safety_clearance_cm: f64,
) -> Result<TurnClearancePlan, String> {
    validate_range(
        tv_width_cm,
        MIN_TV_WIDTH_CM,
        MAX_TV_WIDTH_CM,
        "Ширина телевизора",
        "см",
    )?;
    validate_range(
        vesa_offset_cm,
        -tv_width_cm / 2.0,
        tv_width_cm / 2.0,
        "Смещение VESA от центра",
        "см",
    )?;
    validate_range(
        target_angle_degrees,
        0.0,
        MAX_TURN_ANGLE_DEG,
        "Желаемый угол поворота",
        "градусов",
    )?;
    validate_range(
        available_extension_cm,
        0.0,
        MAX_MOUNT_EXTENSION_CM,
        "Доступный вылет кронштейна",
        "см",
    )?;
    validate_range(
        safety_clearance_cm,
        0.0,
        MAX_SAFETY_CLEARANCE_CM,
        "Безопасный зазор",
        "см",
    )?;

    let effective_half_width_cm = tv_width_cm / 2.0 + vesa_offset_cm.abs();
    let minimum_extension_cm =
        safety_clearance_cm + effective_half_width_cm * target_angle_degrees.to_radians().sin();
    let clearance_margin_cm = available_extension_cm - minimum_extension_cm;
    let will_clear_wall = clearance_margin_cm >= -f64::EPSILON;

    let usable_extension_cm = available_extension_cm - safety_clearance_cm;
    let maximum_clearance_angle_degrees = if usable_extension_cm <= 0.0 {
        0.0
    } else if usable_extension_cm >= effective_half_width_cm {
        MAX_TURN_ANGLE_DEG
    } else {
        (usable_extension_cm / effective_half_width_cm)
            .asin()
            .to_degrees()
    };

    let mut warnings = vec![
        "Расчёт выполнен в плоскости сверху: проверьте толщину ТВ, разъёмы, кабели и неровности стены на месте"
            .to_string(),
    ];
    if vesa_offset_cm.abs() > f64::EPSILON {
        warnings.push(
            "Смещение VESA учтено по более длинной стороне экрана — для безопасного поворота в любую сторону"
                .to_string(),
        );
    }
    if available_extension_cm < safety_clearance_cm {
        warnings.push(
            "Вылет меньше заданного безопасного зазора: расчётный зазор не соблюдается даже без поворота"
                .to_string(),
        );
    } else if !will_clear_wall {
        warnings.push(
            "Доступного вылета недостаточно для выбранного угла и безопасного зазора".to_string(),
        );
    }
    if target_angle_degrees > 75.0 {
        warnings.push(
            "При большом угле дополнительно проверьте шарниры кронштейна и запас кабелей"
                .to_string(),
        );
    }

    Ok(TurnClearancePlan {
        minimum_extension_cm: rounded(minimum_extension_cm),
        maximum_clearance_angle_degrees: rounded(maximum_clearance_angle_degrees),
        clearance_margin_cm: rounded(clearance_margin_cm),
        will_clear_wall,
        effective_half_width_cm: rounded(effective_half_width_cm),
        warnings,
    })
}

pub fn calculate_tilt_angle_plan(
    diagonal_inches: f64,
    screen_center_height_cm: f64,
    eye_height_cm: f64,
    viewing_distance_cm: f64,
    maximum_down_tilt_degrees: f64,
    maximum_up_tilt_degrees: f64,
) -> Result<TiltAnglePlan, String> {
    validate_range(
        diagonal_inches,
        MIN_TV_DIAGONAL_INCHES,
        MAX_TV_DIAGONAL_INCHES,
        "Диагональ",
        "дюймов",
    )?;
    validate_range(
        screen_center_height_cm,
        0.0,
        MAX_REFERENCE_HEIGHT_CM,
        "Высота центра экрана",
        "см",
    )?;
    validate_range(
        eye_height_cm,
        MIN_EYE_HEIGHT_CM,
        MAX_EYE_HEIGHT_CM,
        "Высота глаз",
        "см",
    )?;
    validate_range(
        viewing_distance_cm,
        MIN_VIEWING_DISTANCE_CM,
        MAX_VIEWING_DISTANCE_CM,
        "Расстояние до экрана",
        "см",
    )?;
    validate_range(
        maximum_down_tilt_degrees,
        0.0,
        MAX_MOUNT_TILT_ANGLE_DEG,
        "Максимальный наклон вниз",
        "градусов",
    )?;
    validate_range(
        maximum_up_tilt_degrees,
        0.0,
        MAX_MOUNT_TILT_ANGLE_DEG,
        "Максимальный наклон вверх",
        "градусов",
    )?;

    let (screen_width_cm, screen_height_cm) = screen_dimensions_16_by_9(diagonal_inches);
    let screen_bottom_height_cm = screen_center_height_cm - screen_height_cm / 2.0;
    let screen_top_height_cm = screen_center_height_cm + screen_height_cm / 2.0;
    let vertical_offset_cm = screen_center_height_cm - eye_height_cm;
    let center_sightline_angle_degrees = vertical_offset_cm.atan2(viewing_distance_cm).to_degrees();
    let bottom_sightline_angle_degrees = (screen_bottom_height_cm - eye_height_cm)
        .atan2(viewing_distance_cm)
        .to_degrees();
    let top_sightline_angle_degrees = (screen_top_height_cm - eye_height_cm)
        .atan2(viewing_distance_cm)
        .to_degrees();
    // The public result is expressed to one decimal place. Use that same
    // precision for the direction and range verdict so the UI cannot show a
    // red "15.0° of 15.0°" result caused only by hidden float precision.
    let center_sightline_angle_degrees = rounded(center_sightline_angle_degrees);
    let required_tilt_degrees = center_sightline_angle_degrees.abs();
    let (required_direction, available_tilt_degrees) = if center_sightline_angle_degrees > 0.0 {
        ("вниз", rounded(maximum_down_tilt_degrees))
    } else if center_sightline_angle_degrees < 0.0 {
        ("вверх", rounded(maximum_up_tilt_degrees))
    } else {
        ("без наклона", 0.0)
    };
    let tilt_margin_degrees = if required_direction == "без наклона" {
        0.0
    } else {
        rounded(available_tilt_degrees - required_tilt_degrees)
    };
    let screen_clears_floor = screen_bottom_height_cm >= 0.0;
    let mount_covers_required_tilt =
        screen_clears_floor && (required_direction == "без наклона" || tilt_margin_degrees >= 0.0);

    let mut warnings = Vec::new();
    if !screen_clears_floor {
        warnings.push("Нижний край экрана оказывается ниже уровня чистого пола".to_string());
    }
    if required_direction != "без наклона" && tilt_margin_degrees < 0.0 {
        warnings.push(format!(
            "Паспортного диапазона наклона {required_direction} недостаточно на {}°",
            rounded(-tilt_margin_degrees)
        ));
    }
    if required_tilt_degrees > 15.0 {
        warnings.push(
            "Требуется угол больше 15°: перепроверьте высоту центра, позу и расстояние".to_string(),
        );
    }
    warnings.push(
        "Расчёт направляет нормаль центра экрана к уровню глаз и не определяет комфортную высоту"
            .to_string(),
    );
    warnings.push(
        "Сверьте паспортный диапазон, VESA, нагрузку, зазор для кабелей и фиксацию механизма по точному кронштейну"
            .to_string(),
    );

    Ok(TiltAnglePlan {
        diagonal_inches: rounded(diagonal_inches),
        screen_width_cm: rounded(screen_width_cm),
        screen_height_cm: rounded(screen_height_cm),
        screen_center_height_cm: rounded(screen_center_height_cm),
        screen_bottom_height_cm: rounded(screen_bottom_height_cm),
        screen_top_height_cm: rounded(screen_top_height_cm),
        eye_height_cm: rounded(eye_height_cm),
        viewing_distance_cm: rounded(viewing_distance_cm),
        vertical_offset_cm: rounded(vertical_offset_cm),
        center_sightline_angle_degrees,
        bottom_sightline_angle_degrees: rounded(bottom_sightline_angle_degrees),
        top_sightline_angle_degrees: rounded(top_sightline_angle_degrees),
        required_tilt_degrees: rounded(required_tilt_degrees),
        required_direction: required_direction.to_string(),
        available_tilt_degrees: rounded(available_tilt_degrees),
        tilt_margin_degrees: rounded(tilt_margin_degrees),
        mount_covers_required_tilt,
        screen_clears_floor,
        warnings,
    })
}

pub fn calculate_vesa_match(
    measured_width: f64,
    measured_height: f64,
    measurement_unit: &str,
    mount_spec: &str,
) -> Result<VesaMatchPlan, String> {
    let unit = measurement_unit.trim().to_lowercase();
    let factor = match unit.as_str() {
        "мм" | "mm" => 1.0,
        "см" | "cm" => 10.0,
        _ => return Err("Единица измерения: выберите миллиметры или сантиметры".to_string()),
    };

    let measured_width_mm = rounded(measured_width * factor);
    let measured_height_mm = rounded(measured_height * factor);
    validate_range(
        measured_width_mm,
        MIN_VESA_DIMENSION_MM,
        MAX_VESA_DIMENSION_MM,
        "Горизонтальный размер VESA",
        "мм",
    )?;
    validate_range(
        measured_height_mm,
        MIN_VESA_DIMENSION_MM,
        MAX_VESA_DIMENSION_MM,
        "Вертикальный размер VESA",
        "мм",
    )?;

    if mount_spec.chars().count() > MAX_VESA_SPEC_CHARS {
        return Err(format!(
            "Характеристики кронштейна: оставьте не более {MAX_VESA_SPEC_CHARS} знаков"
        ));
    }

    let normalized_spec = mount_spec
        .to_lowercase()
        .replace('х', "x")
        .replace('×', "x")
        .replace('*', "x");
    let scoped_spec = vesa_pair_scope(&normalized_spec);
    let parsed_pairs = scoped_spec
        .as_deref()
        .map(parse_vesa_pairs)
        .unwrap_or_default();
    let recognized_pairs = parsed_pairs
        .iter()
        .map(|pair| format_vesa_pair(pair.width_mm, pair.height_mm))
        .collect::<Vec<_>>();
    let recognized_pair_count = recognized_pairs.len();
    let range_only_claim = contains_range_only_claim(&normalized_spec, recognized_pair_count);

    let exact_pair = parsed_pairs.iter().copied().find(|pair| {
        pair_is_within(
            *pair,
            measured_width_mm,
            measured_height_mm,
            VESA_EXACT_TOLERANCE_MM,
        )
    });
    let reversed_pair = parsed_pairs.iter().copied().find(|pair| {
        measured_width_mm != measured_height_mm
            && pair_is_within(
                *pair,
                measured_height_mm,
                measured_width_mm,
                VESA_EXACT_TOLERANCE_MM,
            )
    });
    let candidate_pair =
        parsed_pairs
            .iter()
            .copied()
            .filter(|pair| {
                !pair_is_within(
                    *pair,
                    measured_width_mm,
                    measured_height_mm,
                    VESA_EXACT_TOLERANCE_MM,
                ) && pair_is_within(
                    *pair,
                    measured_width_mm,
                    measured_height_mm,
                    VESA_NEAR_TOLERANCE_MM,
                )
            })
            .min_by(|left, right| {
                pair_distance(*left, measured_width_mm, measured_height_mm).total_cmp(
                    &pair_distance(*right, measured_width_mm, measured_height_mm),
                )
            });

    let measured_pair = format_vesa_pair(measured_width_mm, measured_height_mm);
    let mut warnings = Vec::new();
    let (status, result_summary, mount_supports_measured_pair, matched_pair, candidate, reversed) =
        if range_only_claim {
            warnings.push(
                "Указан только предельный размер: он не доказывает поддержку всех меньших схем"
                    .to_string(),
            );
            (
                "недостаточно-данных",
                "Нужен явный список поддерживаемых пар VESA".to_string(),
                None,
                None,
                None,
                None,
            )
        } else if parsed_pairs.is_empty() {
            warnings
                .push("Не удалось распознать ни одной пары вида 200×200 или 20×20 см".to_string());
            (
                "недостаточно-данных",
                "Вставьте точные размеры из характеристик кронштейна".to_string(),
                None,
                None,
                None,
                None,
            )
        } else if let Some(pair) = exact_pair {
            let matched = format_vesa_pair(pair.width_mm, pair.height_mm);
            (
                "совпадает",
                format!("Пара {measured_pair} явно указана у кронштейна"),
                Some(true),
                Some(matched),
                None,
                None,
            )
        } else if let Some(pair) = reversed_pair {
            let reversed = format_vesa_pair(pair.width_mm, pair.height_mm);
            warnings.push(
                "Первое число VESA — горизонталь, второе — вертикаль; оси нельзя менять местами"
                    .to_string(),
            );
            (
                "не-совпадает",
                format!("Точной пары {measured_pair} в списке нет"),
                Some(false),
                None,
                None,
                Some(reversed),
            )
        } else if let Some(pair) = candidate_pair {
            let candidate = format_vesa_pair(pair.width_mm, pair.height_mm);
            warnings.push(
                "Замер близок к стандартной паре, но недостаточно точен для зелёного ответа"
                    .to_string(),
            );
            (
                "недостаточно-данных",
                format!("Перемерьте отверстия: возможный размер {candidate}"),
                None,
                None,
                Some(candidate),
                None,
            )
        } else {
            (
                "не-совпадает",
                format!("Пара {measured_pair} отсутствует в явном списке"),
                Some(false),
                None,
                None,
                None,
            )
        };

    warnings.push(
        "Совпадение VESA не подтверждает нагрузку, диагональ, винты, механизм и основание стены"
            .to_string(),
    );

    Ok(VesaMatchPlan {
        status: status.to_string(),
        result_summary,
        measured_width_mm,
        measured_height_mm,
        measured_pair,
        recognized_pairs,
        recognized_pair_count,
        matched_pair,
        candidate_pair: candidate,
        reversed_pair: reversed,
        range_only_claim,
        mount_supports_measured_pair,
        warnings,
    })
}

fn validate_vesa_screw_measurement(
    value: f64,
    field: &str,
    allow_zero: bool,
) -> Result<(), String> {
    if !value.is_finite() {
        return Err(format!("{field}: введите конечное число"));
    }
    if value < 0.0 || (!allow_zero && value == 0.0) {
        let requirement = if allow_zero {
            "неотрицательное число"
        } else {
            "число больше нуля"
        };
        return Err(format!("{field}: введите {requirement}"));
    }
    if value > MAX_VESA_SCREW_LENGTH_MM {
        return Err(format!(
            "{field}: значение не должно превышать {MAX_VESA_SCREW_LENGTH_MM} мм"
        ));
    }
    Ok(())
}

/// Рассчитывает только допустимый диапазон полной длины VESA-винта.
///
/// `engagement_min_mm` и `engagement_max_mm` должны быть подтверждены паспортом
/// точной модели телевизора. Толщина планки обязательна и положительна; суммарная
/// толщина шайб и обязательной проставки может быть явно равна нулю. Функция не
/// округляет результат и не выбирает товарный размер винта.
pub fn calculate_vesa_screw_length_plan(
    engagement_min_mm: Option<f64>,
    engagement_max_mm: Option<f64>,
    bracket_plate_thickness_mm: f64,
    washer_stack_thickness_mm: f64,
    required_spacer_thickness_mm: f64,
) -> Result<VesaScrewLengthPlan, String> {
    let engagement_min_mm = engagement_min_mm.ok_or_else(|| {
        "Паспортный диапазон зацепления: отсутствует минимальная граница".to_string()
    })?;
    let engagement_max_mm = engagement_max_mm.ok_or_else(|| {
        "Паспортный диапазон зацепления: отсутствует максимальная граница".to_string()
    })?;

    validate_vesa_screw_measurement(
        engagement_min_mm,
        "Минимальное паспортное зацепление",
        false,
    )?;
    validate_vesa_screw_measurement(
        engagement_max_mm,
        "Максимальное паспортное зацепление",
        false,
    )?;
    if engagement_min_mm > engagement_max_mm {
        return Err(
            "Паспортный диапазон зацепления: минимальная граница больше максимальной".to_string(),
        );
    }

    validate_vesa_screw_measurement(
        bracket_plate_thickness_mm,
        "Толщина планки кронштейна",
        false,
    )?;
    validate_vesa_screw_measurement(washer_stack_thickness_mm, "Суммарная толщина шайб", true)?;
    validate_vesa_screw_measurement(
        required_spacer_thickness_mm,
        "Толщина обязательной проставки",
        true,
    )?;

    let external_stack_thickness_mm =
        bracket_plate_thickness_mm + washer_stack_thickness_mm + required_spacer_thickness_mm;
    let total_length_min_mm = engagement_min_mm + external_stack_thickness_mm;
    let total_length_max_mm = engagement_max_mm + external_stack_thickness_mm;
    if total_length_max_mm > MAX_VESA_SCREW_LENGTH_MM {
        return Err(format!(
            "Полная длина винта: расчётная верхняя граница не должна превышать {MAX_VESA_SCREW_LENGTH_MM} мм"
        ));
    }

    Ok(VesaScrewLengthPlan {
        engagement_min_mm,
        engagement_max_mm,
        bracket_plate_thickness_mm,
        washer_stack_thickness_mm,
        required_spacer_thickness_mm,
        external_stack_thickness_mm,
        total_length_min_mm,
        total_length_max_mm,
    })
}

fn vesa_pair_scope(spec: &str) -> Option<String> {
    if let Some(vesa_index) = spec.find("vesa") {
        let after_vesa = &spec[vesa_index + "vesa".len()..];
        let stop = [
            "габарит",
            "размер корпуса",
            "размер изделия",
            "размер товара",
            "размер пластин",
            "настенная пластин",
            "wall plate",
            "product size",
            "package",
            "упаков",
            "вес",
            "нагрузк",
            "диагонал",
            "вылет",
            "наклон",
            "поворот",
            "толщин",
        ]
        .iter()
        .filter_map(|marker| after_vesa.find(marker))
        .min()
        .unwrap_or(after_vesa.len());
        let scope = after_vesa[..stop].trim();
        return (!scope.is_empty()).then(|| scope.to_string());
    }

    let stripped = spec
        .replace("мм", "")
        .replace("см", "")
        .replace("mm", "")
        .replace("cm", "")
        .replace('x', "");
    if stripped.chars().any(char::is_alphabetic) {
        return None;
    }
    Some(spec.to_string())
}

fn parse_vesa_pairs(spec: &str) -> Vec<ParsedVesaPair> {
    let chars = spec.chars().collect::<Vec<_>>();
    let has_cyrillic_cm = spec.contains("см") && !spec.contains("мм");
    let has_latin_cm = spec.contains("cm") && !spec.contains("mm");
    let global_cm = has_cyrillic_cm || has_latin_cm;
    let mut pairs = Vec::new();
    let mut index = 0;

    while index < chars.len() {
        if !chars[index].is_ascii_digit() {
            index += 1;
            continue;
        }

        let Some((width, after_width)) = parse_decimal(&chars, index) else {
            index += 1;
            continue;
        };
        let mut cursor = skip_whitespace(&chars, after_width);
        if chars.get(cursor) != Some(&'x') {
            index = after_width.max(index + 1);
            continue;
        }
        cursor = skip_whitespace(&chars, cursor + 1);
        let Some((height, after_height)) = parse_decimal(&chars, cursor) else {
            index = cursor.max(index + 1);
            continue;
        };

        let chain_cursor = skip_whitespace(&chars, after_height);
        if chars.get(chain_cursor) == Some(&'x') {
            let next_dimension = skip_whitespace(&chars, chain_cursor + 1);
            if let Some((_, after_chain)) = parse_decimal(&chars, next_dimension) {
                index = after_chain.max(index + 1);
                continue;
            }
        }

        let unit_cursor = skip_whitespace(&chars, after_height);
        let local_factor = unit_factor_at(&chars, unit_cursor);
        let factor = local_factor.unwrap_or_else(|| {
            if global_cm && width <= 100.0 && height <= 100.0 {
                10.0
            } else {
                1.0
            }
        });
        let pair = ParsedVesaPair {
            width_mm: rounded(width * factor),
            height_mm: rounded(height * factor),
        };

        let dimensions_are_valid = (MIN_VESA_DIMENSION_MM..=MAX_VESA_DIMENSION_MM)
            .contains(&pair.width_mm)
            && (MIN_VESA_DIMENSION_MM..=MAX_VESA_DIMENSION_MM).contains(&pair.height_mm);
        let duplicate = pairs
            .iter()
            .any(|existing| pair_is_within(*existing, pair.width_mm, pair.height_mm, 0.05));
        if dimensions_are_valid && !duplicate {
            pairs.push(pair);
        }
        index = after_height.max(index + 1);
    }

    pairs
}

fn parse_decimal(chars: &[char], start: usize) -> Option<(f64, usize)> {
    let mut end = start;
    let mut separator_seen = false;
    while let Some(character) = chars.get(end) {
        if character.is_ascii_digit() {
            end += 1;
            continue;
        }
        let decimal_separator = (*character == '.' || *character == ',')
            && !separator_seen
            && chars.get(end + 1).is_some_and(|next| next.is_ascii_digit());
        if decimal_separator {
            separator_seen = true;
            end += 1;
            continue;
        }
        break;
    }
    let raw = chars[start..end]
        .iter()
        .collect::<String>()
        .replace(',', ".");
    raw.parse::<f64>().ok().map(|value| (value, end))
}

fn skip_whitespace(chars: &[char], mut index: usize) -> usize {
    while chars
        .get(index)
        .is_some_and(|character| character.is_whitespace())
    {
        index += 1;
    }
    index
}

fn unit_factor_at(chars: &[char], index: usize) -> Option<f64> {
    let first = *chars.get(index)?;
    let second = *chars.get(index + 1)?;
    match (first, second) {
        ('с', 'м') | ('c', 'm') => Some(10.0),
        ('м', 'м') | ('m', 'm') => Some(1.0),
        _ => None,
    }
}

fn contains_range_only_claim(spec: &str, pair_count: usize) -> bool {
    let collapsed = spec.split_whitespace().collect::<Vec<_>>().join(" ");
    let words = collapsed
        .split(|character: char| !character.is_alphanumeric())
        .filter(|word| !word.is_empty())
        .collect::<Vec<_>>();
    let has_range_words = words.iter().any(|word| {
        *word == "до"
            || *word == "от"
            || word.starts_with("макс")
            || word.starts_with("max")
            || word.starts_with("диапазон")
    }) || collapsed.contains("не более");
    let has_range_separator = pair_count >= 2
        && (collapsed.contains('–')
            || collapsed.contains('—')
            || collapsed.contains('…')
            || collapsed.contains("...")
            || collapsed.contains(" - "));
    has_range_words || has_range_separator
}

fn pair_is_within(pair: ParsedVesaPair, width: f64, height: f64, tolerance: f64) -> bool {
    (pair.width_mm - width).abs() <= tolerance && (pair.height_mm - height).abs() <= tolerance
}

fn pair_distance(pair: ParsedVesaPair, width: f64, height: f64) -> f64 {
    (pair.width_mm - width).abs() + (pair.height_mm - height).abs()
}

fn format_vesa_pair(width_mm: f64, height_mm: f64) -> String {
    format!(
        "{}×{} мм",
        format_vesa_dimension(width_mm),
        format_vesa_dimension(height_mm)
    )
}

fn format_vesa_dimension(value: f64) -> String {
    let value = rounded(value);
    if (value - value.round()).abs() < 0.05 {
        format!("{}", value.round() as u32)
    } else {
        format!("{value:.1}").replace('.', ",")
    }
}

fn vesa_key(width_mm: u32, height_mm: u32) -> String {
    format!("{width_mm}x{height_mm}")
}

fn mechanism_is_acceptable(actual: &str, requested: &str) -> bool {
    match requested {
        "any" | "" => true,
        "fixed" => matches!(actual, "fixed" | "tilt" | "full-motion"),
        "tilt" => matches!(actual, "tilt" | "full-motion"),
        "full-motion" => actual == "full-motion",
        _ => false,
    }
}

pub fn match_mounts(
    tv_weight_kg: f64,
    diagonal_inches: f64,
    vesa_width_mm: u32,
    vesa_height_mm: u32,
    requested_mechanism: &str,
    mounts: Vec<Mount>,
) -> Vec<MountMatch> {
    let required_load_kg = tv_weight_kg * LOAD_SAFETY_FACTOR;
    let requested_vesa = vesa_key(vesa_width_mm, vesa_height_mm);

    let mut matches = mounts
        .into_iter()
        .map(|mount| {
            let mut compatible = true;
            let mut score = 100;
            let mut reasons = Vec::new();
            let mut warnings = Vec::new();

            if mount.vesa.iter().any(|item| item == &requested_vesa) {
                reasons.push(format!("Поддерживает VESA {requested_vesa}"));
            } else {
                compatible = false;
                score -= 100;
                warnings.push(format!("Не поддерживает VESA {requested_vesa}"));
            }

            if mount.max_load_kg + f64::EPSILON >= required_load_kg {
                reasons.push(format!(
                    "Нагрузка до {} кг покрывает запас 25%",
                    rounded(mount.max_load_kg)
                ));
                score += ((mount.max_load_kg - required_load_kg).min(20.0) / 2.0) as i32;
            } else {
                compatible = false;
                score -= 100;
                warnings.push(format!(
                    "Нужно не менее {} кг с запасом, заявлено {} кг",
                    rounded(required_load_kg),
                    rounded(mount.max_load_kg)
                ));
            }

            let mechanism_requested = !matches!(requested_mechanism, "any" | "");
            if mechanism_requested {
                if mechanism_is_acceptable(&mount.mechanism, requested_mechanism) {
                    reasons.push("Подходит выбранный тип регулировки".to_string());
                    if mount.mechanism == requested_mechanism {
                        score += 8;
                    }
                } else {
                    compatible = false;
                    score -= 80;
                    warnings.push("Не подходит выбранный тип регулировки".to_string());
                }
            }

            let diagonal_in_range = diagonal_inches >= mount.min_diagonal_in
                && diagonal_inches <= mount.max_diagonal_in;
            if diagonal_in_range {
                reasons.push(format!(
                    "Диагональ {}″ входит в диапазон {}–{}″",
                    rounded(diagonal_inches),
                    rounded(mount.min_diagonal_in),
                    rounded(mount.max_diagonal_in)
                ));
            } else {
                score -= 12;
                warnings.push(format!(
                    "Диагональ вне рекомендованного диапазона {}–{}″; перепроверьте геометрию пластины",
                    rounded(mount.min_diagonal_in),
                    rounded(mount.max_diagonal_in)
                ));
            }

            MountMatch {
                mount,
                compatible,
                fit_status: if !compatible {
                    "incompatible"
                } else if diagonal_in_range {
                    "verified-fit"
                } else {
                    "conditional-fit"
                }
                .to_string(),
                score,
                reasons,
                warnings,
                required_load_kg: rounded(required_load_kg),
            }
        })
        .collect::<Vec<_>>();

    matches.sort_by(|left, right| {
        right
            .compatible
            .cmp(&left.compatible)
            .then_with(|| right.score.cmp(&left.score))
            .then_with(|| left.mount.title.cmp(&right.mount.title))
    });
    matches
}

pub fn calculate_height_plan(
    diagonal_inches: f64,
    eye_height_cm: f64,
    viewing_distance_cm: f64,
    viewing_angle_deg: f64,
    furniture_height_cm: f64,
    requested_clearance_cm: f64,
) -> HeightPlan {
    let (width, height) = screen_dimensions_16_by_9(diagonal_inches);
    let mut center = eye_height_cm + viewing_distance_cm * viewing_angle_deg.to_radians().tan();
    let minimum_bottom = furniture_height_cm + requested_clearance_cm;
    let mut adjusted_for_furniture = false;
    let mut warnings = Vec::new();

    if center - height / 2.0 < minimum_bottom {
        center = minimum_bottom + height / 2.0;
        adjusted_for_furniture = true;
        warnings
            .push("Экран поднят выше линии глаз, чтобы сохранить зазор над мебелью".to_string());
    }
    if viewing_angle_deg.abs() > 15.0 {
        warnings.push(
            "Большой вертикальный угол просмотра: проверьте положение в реальной позе".to_string(),
        );
    }

    let bottom = center - height / 2.0;
    HeightPlan {
        diagonal_inches: rounded(diagonal_inches),
        screen_width_cm: rounded(width),
        screen_height_cm: rounded(height),
        center_height_cm: rounded(center),
        bottom_height_cm: rounded(bottom),
        top_height_cm: rounded(center + height / 2.0),
        viewing_angle_deg: rounded(viewing_angle_deg),
        clearance_cm: rounded(bottom - furniture_height_cm),
        adjusted_for_furniture,
        warnings,
    }
}

#[allow(clippy::too_many_arguments)]
pub fn calculate_mounting_map(
    diagonal_inches: f64,
    eye_height_cm: f64,
    viewing_distance_cm: f64,
    viewing_angle_deg: f64,
    furniture_height_cm: f64,
    requested_clearance_cm: f64,
    vesa_vertical_offset_cm: f64,
    wall_plate_offset_cm: f64,
) -> Result<MountingMapPlan, String> {
    validate_range(
        diagonal_inches,
        MIN_TV_DIAGONAL_INCHES,
        MAX_TV_DIAGONAL_INCHES,
        "Диагональ",
        "дюймов",
    )?;
    validate_range(
        eye_height_cm,
        MIN_EYE_HEIGHT_CM,
        MAX_EYE_HEIGHT_CM,
        "Высота глаз",
        "см",
    )?;
    validate_range(
        viewing_distance_cm,
        MIN_VIEWING_DISTANCE_CM,
        MAX_VIEWING_DISTANCE_CM,
        "Расстояние до экрана",
        "см",
    )?;
    validate_range(
        viewing_angle_deg,
        MIN_VERTICAL_VIEWING_ANGLE_DEG,
        MAX_VERTICAL_VIEWING_ANGLE_DEG,
        "Вертикальный угол просмотра",
        "градусов",
    )?;
    validate_range(
        furniture_height_cm,
        0.0,
        MAX_FURNITURE_HEIGHT_CM,
        "Высота мебели",
        "см",
    )?;
    validate_range(
        requested_clearance_cm,
        0.0,
        MAX_FURNITURE_CLEARANCE_CM,
        "Зазор над мебелью",
        "см",
    )?;
    validate_range(
        wall_plate_offset_cm,
        -MAX_WALL_PLATE_OFFSET_CM,
        MAX_WALL_PLATE_OFFSET_CM,
        "Смещение контрольной линии пластины",
        "см",
    )?;

    let height_plan = calculate_height_plan(
        diagonal_inches,
        eye_height_cm,
        viewing_distance_cm,
        viewing_angle_deg,
        furniture_height_cm,
        requested_clearance_cm,
    );
    validate_range(
        vesa_vertical_offset_cm,
        -height_plan.screen_height_cm / 2.0,
        height_plan.screen_height_cm / 2.0,
        "Смещение центра VESA",
        "см",
    )?;

    let vesa_center_height_cm = height_plan.center_height_cm + vesa_vertical_offset_cm;
    let wall_plate_reference_height_cm = vesa_center_height_cm + wall_plate_offset_cm;
    validate_range(
        wall_plate_reference_height_cm,
        0.0,
        MAX_REFERENCE_HEIGHT_CM,
        "Контрольная линия пластины от пола",
        "см",
    )?;

    let mut warnings = height_plan.warnings.clone();
    if wall_plate_reference_height_cm < height_plan.bottom_height_cm
        || wall_plate_reference_height_cm > height_plan.top_height_cm
    {
        warnings.push(
            "Контрольная линия пластины выходит за габарит экрана: перепроверьте знак и размер смещения по инструкции кронштейна"
                .to_string(),
        );
    }

    Ok(MountingMapPlan {
        diagonal_inches: height_plan.diagonal_inches,
        screen_width_cm: height_plan.screen_width_cm,
        screen_height_cm: height_plan.screen_height_cm,
        center_height_cm: height_plan.center_height_cm,
        bottom_height_cm: height_plan.bottom_height_cm,
        top_height_cm: height_plan.top_height_cm,
        vesa_vertical_offset_cm: rounded(vesa_vertical_offset_cm),
        vesa_center_height_cm: rounded(vesa_center_height_cm),
        wall_plate_offset_cm: rounded(wall_plate_offset_cm),
        wall_plate_reference_height_cm: rounded(wall_plate_reference_height_cm),
        viewing_angle_deg: height_plan.viewing_angle_deg,
        clearance_cm: height_plan.clearance_cm,
        adjusted_for_furniture: height_plan.adjusted_for_furniture,
        warnings,
    })
}

/// Строит масштабную схему стены и экрана в сантиметрах.
///
/// Начало координат находится в левом нижнем углу стены. Если паспортные
/// `screen_width_cm` и `screen_height_cm` положительны, они считаются точными и
/// не пересчитываются из диагонали. Ручная геометрия 16:9 включается только
/// когда обе величины равны нулю. Запрошенный центр может выходить за границы:
/// после проверки размеров он будет сдвинут к ближайшему допустимому положению.
#[allow(clippy::too_many_arguments)]
pub fn calculate_wall_scene_plan(
    diagonal_inches: f64,
    screen_width_cm: f64,
    screen_height_cm: f64,
    wall_width_cm: f64,
    wall_height_cm: f64,
    screen_center_x_cm: f64,
    screen_center_y_cm: f64,
    furniture_width_cm: f64,
    furniture_height_cm: f64,
    eye_line_height_cm: f64,
) -> Result<WallScenePlan, String> {
    validate_finite(diagonal_inches, "Диагональ")?;
    validate_finite(screen_width_cm, "Ширина экрана")?;
    validate_finite(screen_height_cm, "Высота экрана")?;
    validate_range(
        wall_width_cm,
        MIN_WALL_WIDTH_CM,
        MAX_WALL_WIDTH_CM,
        "Ширина стены",
        "см",
    )?;
    validate_range(
        wall_height_cm,
        MIN_WALL_HEIGHT_CM,
        MAX_WALL_HEIGHT_CM,
        "Высота стены",
        "см",
    )?;
    validate_finite(screen_center_x_cm, "Центр экрана по горизонтали")?;
    validate_finite(screen_center_y_cm, "Центр экрана по вертикали")?;
    validate_finite(furniture_width_cm, "Ширина мебели")?;
    validate_finite(furniture_height_cm, "Высота мебели")?;
    validate_range(
        eye_line_height_cm,
        MIN_EYE_HEIGHT_CM,
        MAX_EYE_HEIGHT_CM,
        "Высота линии глаз",
        "см",
    )?;

    if eye_line_height_cm > wall_height_cm {
        return Err("Высота линии глаз не может быть выше стены".to_string());
    }
    if screen_width_cm < 0.0 || screen_height_cm < 0.0 {
        return Err("Габариты экрана не могут быть отрицательными".to_string());
    }

    let (
        dimension_source,
        effective_diagonal_inches,
        effective_screen_width_cm,
        effective_screen_height_cm,
    ) = if screen_width_cm == 0.0 && screen_height_cm == 0.0 {
        validate_range(
            diagonal_inches,
            MIN_TV_DIAGONAL_INCHES,
            MAX_TV_DIAGONAL_INCHES,
            "Диагональ",
            "дюймов",
        )?;
        let (width, height) = screen_dimensions_16_by_9(diagonal_inches);
        ("manual-16:9", diagonal_inches, width, height)
    } else if screen_width_cm > 0.0 && screen_height_cm > 0.0 {
        validate_range(
            screen_width_cm,
            MIN_TV_WIDTH_CM,
            MAX_TV_WIDTH_CM,
            "Ширина экрана",
            "см",
        )?;
        validate_range(
            screen_height_cm,
            MIN_SCREEN_HEIGHT_CM,
            MAX_SCREEN_HEIGHT_CM,
            "Высота экрана",
            "см",
        )?;

        let measured_diagonal_inches = screen_width_cm.hypot(screen_height_cm) / 2.54;
        let effective_diagonal_inches = if diagonal_inches == 0.0 {
            validate_range(
                measured_diagonal_inches,
                MIN_TV_DIAGONAL_INCHES,
                MAX_TV_DIAGONAL_INCHES,
                "Диагональ по точным габаритам",
                "дюймов",
            )?;
            measured_diagonal_inches
        } else {
            validate_range(
                diagonal_inches,
                MIN_TV_DIAGONAL_INCHES,
                MAX_TV_DIAGONAL_INCHES,
                "Диагональ",
                "дюймов",
            )?;
            diagonal_inches
        };

        (
            "exact-model",
            effective_diagonal_inches,
            screen_width_cm,
            screen_height_cm,
        )
    } else {
        return Err(
                "Укажите и ширину, и высоту экрана либо оставьте оба поля равными нулю для ручного режима 16:9"
                    .to_string(),
            );
    };

    if effective_screen_width_cm > wall_width_cm || effective_screen_height_cm > wall_height_cm {
        return Err(
            "Экран не помещается на стене: увеличьте размеры стены или выберите меньший телевизор"
                .to_string(),
        );
    }

    if furniture_width_cm < 0.0 || furniture_height_cm < 0.0 {
        return Err("Габариты мебели не могут быть отрицательными".to_string());
    }
    let furniture_is_present = if furniture_width_cm == 0.0 && furniture_height_cm == 0.0 {
        false
    } else if furniture_width_cm > 0.0 && furniture_height_cm > 0.0 {
        validate_range(
            furniture_width_cm,
            1.0,
            MAX_WALL_WIDTH_CM,
            "Ширина мебели",
            "см",
        )?;
        validate_range(
            furniture_height_cm,
            1.0,
            MAX_WALL_HEIGHT_CM,
            "Высота мебели",
            "см",
        )?;
        if furniture_width_cm > wall_width_cm || furniture_height_cm > wall_height_cm {
            return Err("Мебель не помещается в заданный контур стены".to_string());
        }
        true
    } else {
        return Err(
            "Укажите и ширину, и высоту мебели либо оставьте оба поля равными нулю".to_string(),
        );
    };

    let minimum_center_x_cm = effective_screen_width_cm / 2.0;
    let maximum_center_x_cm = wall_width_cm - effective_screen_width_cm / 2.0;
    let minimum_center_y_cm = effective_screen_height_cm / 2.0;
    let maximum_center_y_cm = wall_height_cm - effective_screen_height_cm / 2.0;
    let effective_center_x_cm = screen_center_x_cm.clamp(minimum_center_x_cm, maximum_center_x_cm);
    let effective_center_y_cm = screen_center_y_cm.clamp(minimum_center_y_cm, maximum_center_y_cm);
    let center_was_clamped = (effective_center_x_cm - screen_center_x_cm).abs() > f64::EPSILON
        || (effective_center_y_cm - screen_center_y_cm).abs() > f64::EPSILON;

    let left_clearance_cm = effective_center_x_cm - effective_screen_width_cm / 2.0;
    let right_clearance_cm =
        wall_width_cm - effective_center_x_cm - effective_screen_width_cm / 2.0;
    let bottom_clearance_cm = effective_center_y_cm - effective_screen_height_cm / 2.0;
    let top_clearance_cm =
        wall_height_cm - effective_center_y_cm - effective_screen_height_cm / 2.0;

    let screen_left_cm = left_clearance_cm;
    let screen_right_cm = wall_width_cm - right_clearance_cm;
    let furniture_left_cm = (wall_width_cm - furniture_width_cm) / 2.0;
    let furniture_right_cm = furniture_left_cm + furniture_width_cm;
    let horizontal_furniture_overlap_cm = if furniture_is_present {
        screen_right_cm.min(furniture_right_cm) - screen_left_cm.max(furniture_left_cm)
    } else {
        0.0
    }
    .max(0.0);
    let vertical_furniture_delta_cm = bottom_clearance_cm - furniture_height_cm;
    let furniture_gap_cm = if horizontal_furniture_overlap_cm > 0.0 {
        vertical_furniture_delta_cm.max(0.0)
    } else {
        0.0
    };
    let furniture_overlap_cm = if horizontal_furniture_overlap_cm > 0.0 {
        (-vertical_furniture_delta_cm).max(0.0)
    } else {
        0.0
    };
    let eye_line_delta_cm = effective_center_y_cm - eye_line_height_cm;

    let mut warnings = Vec::new();
    if dimension_source == "manual-16:9" {
        warnings.push(
            "Ручной режим использует видимую геометрию 16:9: точный корпус телевизора может быть шире или выше"
                .to_string(),
        );
    }
    if center_was_clamped {
        warnings.push(
            "Запрошенный центр сдвинут к ближайшему положению, при котором экран целиком остаётся внутри стены"
                .to_string(),
        );
    }
    if furniture_overlap_cm > 0.0 {
        warnings.push(format!(
            "Контур экрана пересекает мебель по высоте на {} см",
            rounded(furniture_overlap_cm)
        ));
    } else if furniture_is_present
        && horizontal_furniture_overlap_cm > 0.0
        && furniture_gap_cm < 5.0
    {
        warnings.push(
            "Между экраном и мебелью меньше 5 см: проверьте рамку, кабели и доступ к разъёмам"
                .to_string(),
        );
    }
    if eye_line_delta_cm.abs() > 50.0 {
        let direction = if eye_line_delta_cm > 0.0 {
            "выше"
        } else {
            "ниже"
        };
        warnings.push(format!(
            "Центр экрана находится на {} см {direction} линии глаз",
            rounded(eye_line_delta_cm.abs())
        ));
    }
    warnings.push(
        "Схема проверяет только расположение: основание стены, крепёж, VESA, массу и кабели проверьте отдельно"
            .to_string(),
    );

    Ok(WallScenePlan {
        dimension_source: dimension_source.to_string(),
        diagonal_inches: rounded(effective_diagonal_inches),
        screen_width_cm: rounded(effective_screen_width_cm),
        screen_height_cm: rounded(effective_screen_height_cm),
        wall_width_cm: rounded(wall_width_cm),
        wall_height_cm: rounded(wall_height_cm),
        requested_center_x_cm: rounded(screen_center_x_cm),
        requested_center_y_cm: rounded(screen_center_y_cm),
        effective_center_x_cm: rounded(effective_center_x_cm),
        effective_center_y_cm: rounded(effective_center_y_cm),
        left_clearance_cm: rounded(left_clearance_cm),
        right_clearance_cm: rounded(right_clearance_cm),
        top_clearance_cm: rounded(top_clearance_cm),
        bottom_clearance_cm: rounded(bottom_clearance_cm),
        furniture_width_cm: rounded(furniture_width_cm),
        furniture_height_cm: rounded(furniture_height_cm),
        furniture_gap_cm: rounded(furniture_gap_cm),
        furniture_overlap_cm: rounded(furniture_overlap_cm),
        eye_line_height_cm: rounded(eye_line_height_cm),
        eye_line_delta_cm: rounded(eye_line_delta_cm),
        center_was_clamped,
        warnings,
    })
}

fn validate_module_count(value: u32, field: &str) -> Result<(), String> {
    if value > MAX_TV_ZONE_MODULES {
        return Err(format!(
            "{field}: допустимо не больше {MAX_TV_ZONE_MODULES} модулей"
        ));
    }
    Ok(())
}

fn minimum_socket_shift(
    socket: Rect,
    forbidden_zone: Rect,
    screen: Rect,
) -> Option<(f64, &'static str)> {
    if !socket.overlaps(forbidden_zone) {
        return None;
    }

    let candidates = [
        (forbidden_zone.left - socket.right, 0.0, "влево"),
        (forbidden_zone.right - socket.left, 0.0, "вправо"),
        (0.0, forbidden_zone.bottom - socket.top, "вниз"),
        (0.0, forbidden_zone.top - socket.bottom, "вверх"),
    ];

    candidates
        .into_iter()
        .filter_map(|(dx, dy, direction)| {
            let shifted = socket.translated(dx, dy);
            if screen.contains(shifted) && !shifted.overlaps(forbidden_zone) {
                Some(((dx.abs() + dy.abs()), direction))
            } else {
                None
            }
        })
        .min_by(|left, right| left.0.total_cmp(&right.0))
}

#[allow(clippy::too_many_arguments)]
pub fn calculate_tv_zone_socket_plan(
    diagonal_inches: f64,
    screen_center_height_cm: f64,
    plate_width_cm: f64,
    plate_height_cm: f64,
    plate_horizontal_offset_cm: f64,
    plate_vertical_offset_cm: f64,
    socket_width_cm: f64,
    socket_height_cm: f64,
    socket_horizontal_offset_cm: f64,
    socket_vertical_offset_cm: f64,
    service_margin_cm: f64,
    required_depth_cm: f64,
    wall_clearance_cm: f64,
    powered_devices: u32,
    spare_power_modules: u32,
    ethernet_modules: u32,
    antenna_modules: u32,
) -> Result<TvZoneSocketPlan, String> {
    validate_range(
        diagonal_inches,
        MIN_TV_DIAGONAL_INCHES,
        MAX_TV_DIAGONAL_INCHES,
        "Диагональ",
        "дюймов",
    )?;
    validate_range(
        screen_center_height_cm,
        0.0,
        MAX_REFERENCE_HEIGHT_CM,
        "Высота центра экрана",
        "см",
    )?;
    for (value, field) in [
        (plate_width_cm, "Ширина пластины"),
        (plate_height_cm, "Высота пластины"),
        (socket_width_cm, "Ширина розеточного блока"),
        (socket_height_cm, "Высота розеточного блока"),
    ] {
        validate_range(value, 0.1, MAX_TV_ZONE_ELEMENT_CM, field, "см")?;
    }
    for (value, field) in [
        (
            plate_horizontal_offset_cm,
            "Горизонтальное смещение пластины",
        ),
        (plate_vertical_offset_cm, "Вертикальное смещение пластины"),
        (
            socket_horizontal_offset_cm,
            "Горизонтальное смещение розеточного блока",
        ),
        (
            socket_vertical_offset_cm,
            "Вертикальное смещение розеточного блока",
        ),
    ] {
        validate_range(
            value,
            -MAX_TV_ZONE_OFFSET_CM,
            MAX_TV_ZONE_OFFSET_CM,
            field,
            "см",
        )?;
    }
    validate_range(
        service_margin_cm,
        0.0,
        MAX_SAFETY_CLEARANCE_CM,
        "Сервисный зазор вокруг пластины",
        "см",
    )?;
    validate_range(
        required_depth_cm,
        0.0,
        MAX_TV_ZONE_DEPTH_CM,
        "Нужная глубина вилки и изгиба",
        "см",
    )?;
    validate_range(
        wall_clearance_cm,
        0.0,
        MAX_TV_ZONE_DEPTH_CM,
        "Зазор между стеной и корпусом",
        "см",
    )?;
    validate_module_count(powered_devices, "Питаемые устройства")?;
    validate_module_count(spare_power_modules, "Запасные силовые модули")?;
    validate_module_count(ethernet_modules, "Ethernet-модули")?;
    validate_module_count(antenna_modules, "ТВ-вводы")?;

    let power_modules = powered_devices
        .checked_add(spare_power_modules)
        .ok_or_else(|| "Слишком много силовых модулей".to_string())?;
    validate_module_count(power_modules, "Силовые модули с запасом")?;
    let total_modules = power_modules
        .checked_add(ethernet_modules)
        .and_then(|value| value.checked_add(antenna_modules))
        .ok_or_else(|| "Слишком много модулей в блоке".to_string())?;
    if total_modules == 0 {
        return Err("Укажите хотя бы один модуль розеточного блока".to_string());
    }
    validate_module_count(total_modules, "Всего модулей")?;

    let (screen_width_cm, screen_height_cm) = screen_dimensions_16_by_9(diagonal_inches);
    let screen = Rect::centered(screen_width_cm, screen_height_cm, 0.0, 0.0);
    let plate = Rect::centered(
        plate_width_cm,
        plate_height_cm,
        plate_horizontal_offset_cm,
        plate_vertical_offset_cm,
    );
    let socket = Rect::centered(
        socket_width_cm,
        socket_height_cm,
        socket_horizontal_offset_cm,
        socket_vertical_offset_cm,
    );
    let forbidden_zone = plate.expanded(service_margin_cm);

    let screen_bottom_height_cm = screen_center_height_cm - screen_height_cm / 2.0;
    let screen_top_height_cm = screen_center_height_cm + screen_height_cm / 2.0;
    let screen_clears_floor = screen_bottom_height_cm >= 0.0;
    let plate_hidden_by_screen = screen.contains(plate);
    let service_zone_hidden_by_screen = screen.contains(forbidden_zone);
    let socket_hidden_by_screen = screen.contains(socket);
    let socket_overlaps_plate = socket.overlaps(plate);
    let socket_overlaps_service_zone = socket.overlaps(forbidden_zone);
    let screen_edge_margin_cm = [
        socket.left - screen.left,
        screen.right - socket.right,
        socket.bottom - screen.bottom,
        screen.top - socket.top,
    ]
    .into_iter()
    .fold(f64::INFINITY, f64::min);
    let depth_margin_cm = wall_clearance_cm - required_depth_cm;
    let plug_fits_depth = depth_margin_cm >= 0.0;
    let shift = minimum_socket_shift(socket, forbidden_zone, screen);

    let mut warnings = Vec::new();
    if !screen_clears_floor {
        warnings.push("Нижний край экрана оказывается ниже уровня чистого пола".to_string());
    }
    if !plate_hidden_by_screen {
        warnings
            .push("Настенная пластина кронштейна не полностью скрыта контуром экрана".to_string());
    } else if !service_zone_hidden_by_screen {
        warnings
            .push("Заданный сервисный зазор вокруг пластины выходит за контур экрана".to_string());
    }
    if socket_overlaps_plate {
        warnings.push("Розеточный блок пересекает настенную пластину кронштейна".to_string());
    } else if socket_overlaps_service_zone {
        warnings.push(
            "Розеточный блок попадает в заданный сервисный зазор вокруг пластины".to_string(),
        );
    }
    if socket_overlaps_service_zone && shift.is_none() {
        warnings.push(
            "Внутри контура экрана не найден односторонний сдвиг: измените размер блока или геометрию пластины"
                .to_string(),
        );
    }
    if !socket_hidden_by_screen {
        warnings.push(
            "Розеточный блок не полностью скрыт контуром экрана при указанных размерах".to_string(),
        );
    }
    if !plug_fits_depth {
        warnings.push(format!(
            "Не хватает {} см по глубине для вилки и заданного изгиба кабеля",
            rounded(-depth_margin_cm)
        ));
    }
    warnings.push(
        "Положение разъёмов телевизора, блоков питания и траекторию подвижного механизма проверьте по точным изделиям"
            .to_string(),
    );

    Ok(TvZoneSocketPlan {
        diagonal_inches: rounded(diagonal_inches),
        screen_width_cm: rounded(screen_width_cm),
        screen_height_cm: rounded(screen_height_cm),
        screen_center_height_cm: rounded(screen_center_height_cm),
        screen_bottom_height_cm: rounded(screen_bottom_height_cm),
        screen_top_height_cm: rounded(screen_top_height_cm),
        plate_center_height_cm: rounded(screen_center_height_cm + plate_vertical_offset_cm),
        socket_center_height_cm: rounded(screen_center_height_cm + socket_vertical_offset_cm),
        screen_clears_floor,
        plate_hidden_by_screen,
        service_zone_hidden_by_screen,
        socket_hidden_by_screen,
        socket_overlaps_plate,
        socket_overlaps_service_zone,
        screen_edge_margin_cm: rounded(screen_edge_margin_cm),
        required_depth_cm: rounded(required_depth_cm),
        wall_clearance_cm: rounded(wall_clearance_cm),
        depth_margin_cm: rounded(depth_margin_cm),
        plug_fits_depth,
        minimum_shift_cm: shift.map(|(distance, _)| rounded(distance)),
        shift_direction: shift.map(|(_, direction)| direction.to_string()),
        power_modules,
        ethernet_modules,
        antenna_modules,
        total_modules,
        ready_for_site_check: screen_clears_floor
            && plate_hidden_by_screen
            && service_zone_hidden_by_screen
            && socket_hidden_by_screen
            && !socket_overlaps_service_zone
            && plug_fits_depth,
        warnings,
    })
}

#[wasm_bindgen]
pub fn match_mounts_json(
    tv_weight_kg: f64,
    diagonal_inches: f64,
    vesa_width_mm: u32,
    vesa_height_mm: u32,
    requested_mechanism: &str,
    mounts_json: &str,
) -> String {
    match serde_json::from_str::<Vec<Mount>>(mounts_json) {
        Ok(mounts) => serde_json::json!({
            "matches": match_mounts(
                tv_weight_kg,
                diagonal_inches,
                vesa_width_mm,
                vesa_height_mm,
                requested_mechanism,
                mounts,
            ),
        })
        .to_string(),
        Err(error) => serde_json::json!({
            "error": format!("Не удалось прочитать каталог кронштейнов: {error}"),
        })
        .to_string(),
    }
}

#[wasm_bindgen]
pub fn height_plan_json(
    diagonal_inches: f64,
    eye_height_cm: f64,
    viewing_distance_cm: f64,
    viewing_angle_deg: f64,
    furniture_height_cm: f64,
    requested_clearance_cm: f64,
) -> String {
    serde_json::to_string(&calculate_height_plan(
        diagonal_inches,
        eye_height_cm,
        viewing_distance_cm,
        viewing_angle_deg,
        furniture_height_cm,
        requested_clearance_cm,
    ))
    .expect("height plan is serializable")
}

#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn mounting_map_json(
    diagonal_inches: f64,
    eye_height_cm: f64,
    viewing_distance_cm: f64,
    viewing_angle_deg: f64,
    furniture_height_cm: f64,
    requested_clearance_cm: f64,
    vesa_vertical_offset_cm: f64,
    wall_plate_offset_cm: f64,
) -> String {
    match calculate_mounting_map(
        diagonal_inches,
        eye_height_cm,
        viewing_distance_cm,
        viewing_angle_deg,
        furniture_height_cm,
        requested_clearance_cm,
        vesa_vertical_offset_cm,
        wall_plate_offset_cm,
    ) {
        Ok(plan) => serde_json::to_string(&plan).expect("mounting map is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn wall_scene_plan_json(
    diagonal_inches: f64,
    screen_width_cm: f64,
    screen_height_cm: f64,
    wall_width_cm: f64,
    wall_height_cm: f64,
    screen_center_x_cm: f64,
    screen_center_y_cm: f64,
    furniture_width_cm: f64,
    furniture_height_cm: f64,
    eye_line_height_cm: f64,
) -> String {
    match calculate_wall_scene_plan(
        diagonal_inches,
        screen_width_cm,
        screen_height_cm,
        wall_width_cm,
        wall_height_cm,
        screen_center_x_cm,
        screen_center_y_cm,
        furniture_width_cm,
        furniture_height_cm,
        eye_line_height_cm,
    ) {
        Ok(plan) => serde_json::to_string(&plan).expect("wall scene plan is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn tv_zone_socket_plan_json(
    diagonal_inches: f64,
    screen_center_height_cm: f64,
    plate_width_cm: f64,
    plate_height_cm: f64,
    plate_horizontal_offset_cm: f64,
    plate_vertical_offset_cm: f64,
    socket_width_cm: f64,
    socket_height_cm: f64,
    socket_horizontal_offset_cm: f64,
    socket_vertical_offset_cm: f64,
    service_margin_cm: f64,
    required_depth_cm: f64,
    wall_clearance_cm: f64,
    powered_devices: u32,
    spare_power_modules: u32,
    ethernet_modules: u32,
    antenna_modules: u32,
) -> String {
    match calculate_tv_zone_socket_plan(
        diagonal_inches,
        screen_center_height_cm,
        plate_width_cm,
        plate_height_cm,
        plate_horizontal_offset_cm,
        plate_vertical_offset_cm,
        socket_width_cm,
        socket_height_cm,
        socket_horizontal_offset_cm,
        socket_vertical_offset_cm,
        service_margin_cm,
        required_depth_cm,
        wall_clearance_cm,
        powered_devices,
        spare_power_modules,
        ethernet_modules,
        antenna_modules,
    ) {
        Ok(plan) => serde_json::to_string(&plan).expect("TV-zone socket plan is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
pub fn tv_dimensions_plan_json(
    mode: &str,
    primary: f64,
    secondary: f64,
    clearance_cm: f64,
    exact_case_width_cm: f64,
    exact_case_height_cm: f64,
) -> String {
    match calculate_tv_dimensions_plan(
        mode,
        primary,
        secondary,
        clearance_cm,
        exact_case_width_cm,
        exact_case_height_cm,
    ) {
        Ok(plan) => serde_json::to_string(&plan).expect("TV dimensions plan is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn phone_tv_connection_plan_json(
    phone: &str,
    tv: &str,
    goal: &str,
    connector: &str,
    same_network: &str,
    hdmi: &str,
    android_video_output: &str,
) -> String {
    match calculate_phone_tv_connection(
        phone,
        tv,
        goal,
        connector,
        same_network,
        hdmi,
        android_video_output,
    ) {
        Ok(plan) => serde_json::to_string(&plan).expect("phone-to-TV plan is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
pub fn calculate_tv_no_signal_json(
    source: &str,
    tv_menu_visible: &str,
    source_powered: &str,
    input_matches: &str,
    cable_connected: &str,
    receiver_menu_visible: &str,
) -> String {
    let input = TvNoSignalInput {
        source: source.to_string(),
        tv_menu_visible: tv_menu_visible.to_string(),
        source_powered: source_powered.to_string(),
        input_matches: input_matches.to_string(),
        cable_connected: cable_connected.to_string(),
        receiver_menu_visible: receiver_menu_visible.to_string(),
    };

    match calculate_tv_no_signal(&input) {
        Ok(plan) => serde_json::to_string(&plan).expect("TV no-signal plan is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
pub fn tv_traffic_task_plan_json(
    task: &str,
    primary: &str,
    secondary: &str,
    tertiary: &str,
    detail: &str,
) -> String {
    let input = TvTrafficTaskInput {
        task: task.to_string(),
        primary: primary.to_string(),
        secondary: secondary.to_string(),
        tertiary: tertiary.to_string(),
        detail: detail.to_string(),
    };
    match calculate_tv_traffic_task(&input) {
        Ok(plan) => serde_json::to_string(&plan).expect("TV traffic task plan is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
pub fn viewing_geometry_json(mode: &str, value: f64, horizontal_angle_deg: f64) -> String {
    let result = match mode {
        "diagonal-to-distance" => viewing_distance_for_diagonal(value, horizontal_angle_deg),
        "distance-to-diagonal" => diagonal_for_viewing_distance(value, horizontal_angle_deg),
        _ => Err("Неизвестный режим расчёта: выберите диагональ или расстояние".to_string()),
    };

    match result {
        Ok(geometry) => serde_json::to_string(&geometry).expect("viewing geometry is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
pub fn turn_clearance_plan_json(
    tv_width_cm: f64,
    vesa_offset_cm: f64,
    target_angle_degrees: f64,
    available_extension_cm: f64,
    safety_clearance_cm: f64,
) -> String {
    match calculate_turn_clearance_plan(
        tv_width_cm,
        vesa_offset_cm,
        target_angle_degrees,
        available_extension_cm,
        safety_clearance_cm,
    ) {
        Ok(plan) => serde_json::to_string(&plan).expect("turn clearance plan is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
pub fn tilt_angle_plan_json(
    diagonal_inches: f64,
    screen_center_height_cm: f64,
    eye_height_cm: f64,
    viewing_distance_cm: f64,
    maximum_down_tilt_degrees: f64,
    maximum_up_tilt_degrees: f64,
) -> String {
    match calculate_tilt_angle_plan(
        diagonal_inches,
        screen_center_height_cm,
        eye_height_cm,
        viewing_distance_cm,
        maximum_down_tilt_degrees,
        maximum_up_tilt_degrees,
    ) {
        Ok(plan) => serde_json::to_string(&plan).expect("tilt angle plan is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
pub fn vesa_match_plan_json(
    measured_width: f64,
    measured_height: f64,
    measurement_unit: &str,
    mount_spec: &str,
) -> String {
    match calculate_vesa_match(
        measured_width,
        measured_height,
        measurement_unit,
        mount_spec,
    ) {
        Ok(plan) => serde_json::to_string(&plan).expect("VESA match plan is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[wasm_bindgen]
pub fn vesa_screw_length_plan_json(
    engagement_min_mm: Option<f64>,
    engagement_max_mm: Option<f64>,
    bracket_plate_thickness_mm: f64,
    washer_stack_thickness_mm: f64,
    required_spacer_thickness_mm: f64,
) -> String {
    match calculate_vesa_screw_length_plan(
        engagement_min_mm,
        engagement_max_mm,
        bracket_plate_thickness_mm,
        washer_stack_thickness_mm,
        required_spacer_thickness_mm,
    ) {
        Ok(plan) => serde_json::to_string(&plan).expect("VESA screw length plan is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_mount() -> Mount {
        Mount {
            id: "mount".into(),
            brand: "Test".into(),
            model: "M1".into(),
            title: "Test mount".into(),
            mechanism: "full-motion".into(),
            min_diagonal_in: 37.0,
            max_diagonal_in: 80.0,
            max_load_kg: 40.0,
            vesa: vec!["200x200".into(), "300x200".into()],
            wall_distance_min_mm: 67.0,
            wall_distance_max_mm: 355.0,
            source_url: "https://example.com".into(),
            source_label: "Test source".into(),
            checked_at: "2026-07-30".into(),
            market_url: None,
            reward_rub_snapshot: None,
        }
    }

    #[test]
    fn accepts_exact_vesa_with_load_reserve() {
        let result = match_mounts(15.3, 55.0, 200, 200, "full-motion", vec![test_mount()]);
        assert!(result[0].compatible);
        assert_eq!(result[0].fit_status, "verified-fit");
        assert_eq!(result[0].required_load_kg, 19.1);
        assert!(
            result[0]
                .reasons
                .iter()
                .any(|reason| reason.contains("Диагональ 55″ входит в диапазон 37–80″"))
        );
    }

    #[test]
    fn any_mechanism_reports_three_real_catalog_checks() {
        let result = match_mounts(15.3, 55.0, 200, 200, "any", vec![test_mount()]);
        assert_eq!(result[0].fit_status, "verified-fit");
        assert_eq!(result[0].reasons.len(), 3);
        assert!(
            result[0]
                .reasons
                .iter()
                .all(|reason| !reason.contains("тип регулировки"))
        );
    }

    #[test]
    fn rejects_wrong_vesa() {
        let result = match_mounts(15.3, 55.0, 400, 400, "full-motion", vec![test_mount()]);
        assert!(!result[0].compatible);
        assert_eq!(result[0].fit_status, "incompatible");
    }

    #[test]
    fn marks_out_of_range_diagonal_as_conditional_fit() {
        let result = match_mounts(15.3, 85.0, 200, 200, "full-motion", vec![test_mount()]);
        assert!(result[0].compatible);
        assert_eq!(result[0].fit_status, "conditional-fit");
        assert!(
            result[0]
                .warnings
                .iter()
                .any(|warning| warning.contains("Диагональ"))
        );
    }

    #[test]
    fn keeps_screen_clear_of_furniture() {
        let plan = calculate_height_plan(65.0, 105.0, 300.0, 0.0, 85.0, 10.0);
        assert!(plan.bottom_height_cm >= 95.0);
        assert!(plan.adjusted_for_furniture);
    }

    #[test]
    fn mounting_map_calculates_vesa_and_plate_reference_heights() {
        let plan = calculate_mounting_map(55.0, 110.0, 250.0, 0.0, 70.0, 10.0, 5.0, -2.0).unwrap();

        assert_eq!(plan.screen_height_cm, 68.5);
        assert_eq!(plan.center_height_cm, 114.2);
        assert_eq!(plan.bottom_height_cm, 80.0);
        assert_eq!(plan.top_height_cm, 148.5);
        assert_eq!(plan.vesa_center_height_cm, 119.2);
        assert_eq!(plan.wall_plate_reference_height_cm, 117.2);
        assert!(plan.adjusted_for_furniture);
    }

    #[test]
    fn mounting_map_respects_signed_offsets() {
        let above = calculate_mounting_map(55.0, 110.0, 250.0, 0.0, 0.0, 0.0, 8.0, 4.0).unwrap();
        let below = calculate_mounting_map(55.0, 110.0, 250.0, 0.0, 0.0, 0.0, -8.0, -4.0).unwrap();

        assert_eq!(above.vesa_center_height_cm - above.center_height_cm, 8.0);
        assert_eq!(
            above.wall_plate_reference_height_cm - above.vesa_center_height_cm,
            4.0
        );
        assert_eq!(below.vesa_center_height_cm - below.center_height_cm, -8.0);
        assert_eq!(
            below.wall_plate_reference_height_cm - below.vesa_center_height_cm,
            -4.0
        );
    }

    #[test]
    fn mounting_map_rejects_impossible_or_non_finite_inputs() {
        assert!(
            calculate_mounting_map(55.0, f64::NAN, 250.0, 0.0, 70.0, 10.0, 0.0, 0.0)
                .unwrap_err()
                .contains("конечное число")
        );
        assert!(
            calculate_mounting_map(55.0, 110.0, 250.0, 0.0, 70.0, 10.0, 40.0, 0.0)
                .unwrap_err()
                .contains("Смещение центра VESA")
        );
        assert!(
            calculate_mounting_map(55.0, 110.0, 250.0, 0.0, 70.0, 10.0, 0.0, 120.0)
                .unwrap_err()
                .contains("контрольной линии пластины")
        );
    }

    #[test]
    fn mounting_map_wasm_json_has_stable_shape_and_errors() {
        let response = mounting_map_json(55.0, 110.0, 250.0, 0.0, 70.0, 10.0, 5.0, -2.0);
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "center_height_cm",
            "bottom_height_cm",
            "top_height_cm",
            "vesa_center_height_cm",
            "wall_plate_reference_height_cm",
            "warnings",
        ] {
            assert!(value.get(field).is_some(), "missing field {field}");
        }
        assert!(value.get("error").is_none());

        let invalid = mounting_map_json(10.0, 110.0, 250.0, 0.0, 70.0, 10.0, 0.0, 0.0);
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
    }

    #[test]
    fn wall_scene_manual_mode_uses_16_by_9_geometry() {
        let plan = calculate_wall_scene_plan(
            55.0, 0.0, 0.0, 420.0, 270.0, 210.0, 135.0, 180.0, 55.0, 110.0,
        )
        .unwrap();

        assert_eq!(plan.dimension_source, "manual-16:9");
        assert_eq!(plan.diagonal_inches, 55.0);
        assert_eq!(plan.screen_width_cm, 121.8);
        assert_eq!(plan.screen_height_cm, 68.5);
        assert_eq!(plan.left_clearance_cm, 149.1);
        assert_eq!(plan.right_clearance_cm, 149.1);
        assert_eq!(plan.top_clearance_cm, 100.8);
        assert_eq!(plan.bottom_clearance_cm, 100.8);
        assert_eq!(plan.furniture_gap_cm, 45.8);
        assert_eq!(plan.furniture_overlap_cm, 0.0);
        assert_eq!(plan.eye_line_delta_cm, 25.0);
        assert!(!plan.center_was_clamped);
        assert!(plan.warnings.iter().any(|warning| warning.contains("16:9")));
    }

    #[test]
    fn wall_scene_exact_dimensions_are_authoritative() {
        let plan = calculate_wall_scene_plan(
            55.0, 123.4, 75.6, 420.0, 270.0, 210.0, 135.0, 180.0, 55.0, 110.0,
        )
        .unwrap();

        assert_eq!(plan.dimension_source, "exact-model");
        assert_eq!(plan.screen_width_cm, 123.4);
        assert_eq!(plan.screen_height_cm, 75.6);
        assert_eq!(plan.diagonal_inches, 55.0);

        let derived = calculate_wall_scene_plan(
            0.0, 100.0, 60.0, 420.0, 270.0, 210.0, 135.0, 0.0, 0.0, 110.0,
        )
        .unwrap();
        assert_eq!(derived.diagonal_inches, 45.9);
        assert_eq!(derived.screen_width_cm, 100.0);
        assert_eq!(derived.screen_height_cm, 60.0);
    }

    #[test]
    fn wall_scene_clamps_requested_center_inside_wall() {
        let plan = calculate_wall_scene_plan(
            45.0, 100.0, 60.0, 200.0, 150.0, -10.0, 200.0, 0.0, 0.0, 100.0,
        )
        .unwrap();

        assert_eq!(plan.requested_center_x_cm, -10.0);
        assert_eq!(plan.requested_center_y_cm, 200.0);
        assert_eq!(plan.effective_center_x_cm, 50.0);
        assert_eq!(plan.effective_center_y_cm, 120.0);
        assert_eq!(plan.left_clearance_cm, 0.0);
        assert_eq!(plan.right_clearance_cm, 100.0);
        assert_eq!(plan.top_clearance_cm, 0.0);
        assert_eq!(plan.bottom_clearance_cm, 90.0);
        assert!(plan.center_was_clamped);
        assert!(
            plan.warnings
                .iter()
                .any(|warning| warning.contains("сдвинут"))
        );
    }

    #[test]
    fn wall_scene_reports_furniture_overlap() {
        let plan = calculate_wall_scene_plan(
            65.0, 0.0, 0.0, 420.0, 270.0, 210.0, 70.0, 180.0, 55.0, 110.0,
        )
        .unwrap();

        assert_eq!(plan.furniture_gap_cm, 0.0);
        assert_eq!(plan.furniture_overlap_cm, 25.5);
        assert!(
            plan.warnings
                .iter()
                .any(|warning| warning.contains("пересекает мебель"))
        );
    }

    #[test]
    fn wall_scene_rejects_partial_or_impossible_geometry() {
        let partial_screen = calculate_wall_scene_plan(
            55.0, 120.0, 0.0, 420.0, 270.0, 210.0, 135.0, 180.0, 55.0, 110.0,
        )
        .unwrap_err();
        assert!(partial_screen.contains("и ширину, и высоту экрана"));

        let too_large = calculate_wall_scene_plan(
            55.0, 250.0, 80.0, 200.0, 200.0, 100.0, 100.0, 0.0, 0.0, 110.0,
        )
        .unwrap_err();
        assert!(too_large.contains("не помещается на стене"));

        let partial_furniture = calculate_wall_scene_plan(
            55.0, 0.0, 0.0, 420.0, 270.0, 210.0, 135.0, 180.0, 0.0, 110.0,
        )
        .unwrap_err();
        assert!(partial_furniture.contains("и ширину, и высоту мебели"));

        let non_finite = calculate_wall_scene_plan(
            55.0,
            0.0,
            0.0,
            420.0,
            270.0,
            f64::NAN,
            135.0,
            180.0,
            55.0,
            110.0,
        )
        .unwrap_err();
        assert!(non_finite.contains("конечное число"));
    }

    #[test]
    fn wall_scene_wasm_json_has_stable_shape_and_errors() {
        let response = wall_scene_plan_json(
            55.0, 0.0, 0.0, 420.0, 270.0, 210.0, 135.0, 180.0, 55.0, 110.0,
        );
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "dimension_source",
            "diagonal_inches",
            "screen_width_cm",
            "screen_height_cm",
            "wall_width_cm",
            "wall_height_cm",
            "requested_center_x_cm",
            "requested_center_y_cm",
            "effective_center_x_cm",
            "effective_center_y_cm",
            "left_clearance_cm",
            "right_clearance_cm",
            "top_clearance_cm",
            "bottom_clearance_cm",
            "furniture_width_cm",
            "furniture_height_cm",
            "furniture_gap_cm",
            "furniture_overlap_cm",
            "eye_line_height_cm",
            "eye_line_delta_cm",
            "center_was_clamped",
            "warnings",
        ] {
            assert!(value.get(field).is_some(), "missing field {field}");
        }
        assert!(value.get("error").is_none());

        let invalid = wall_scene_plan_json(
            55.0, 120.0, 0.0, 420.0, 270.0, 210.0, 135.0, 180.0, 55.0, 110.0,
        );
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
        assert!(invalid.get("screen_width_cm").is_none());
    }

    #[test]
    fn wasm_json_response_has_stable_shape() {
        let mounts = serde_json::to_string(&vec![test_mount()]).unwrap();
        let response = match_mounts_json(15.3, 55.0, 200, 200, "any", &mounts);
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        assert!(
            value
                .get("matches")
                .and_then(|item| item.as_array())
                .is_some()
        );
        assert!(value.get("error").is_none());
    }

    #[test]
    fn calculates_distance_from_diagonal_and_horizontal_angle() {
        let geometry = viewing_distance_for_diagonal(55.0, 40.0).unwrap();
        assert_eq!(geometry.diagonal_inches, 55.0);
        assert_eq!(geometry.screen_width_cm, 121.8);
        assert_eq!(geometry.screen_height_cm, 68.5);
        assert_eq!(geometry.viewing_distance_cm, 167.3);
        assert_eq!(geometry.horizontal_angle_deg, 40.0);
    }

    #[test]
    fn inverse_viewing_calculations_are_consistent() {
        let from_diagonal = viewing_distance_for_diagonal(65.0, 36.0).unwrap();
        let from_distance =
            diagonal_for_viewing_distance(from_diagonal.viewing_distance_cm, 36.0).unwrap();
        assert!((from_distance.diagonal_inches - 65.0).abs() <= 0.1);
        assert!((from_distance.screen_width_cm - from_diagonal.screen_width_cm).abs() <= 0.1);
        assert!((from_distance.screen_height_cm - from_diagonal.screen_height_cm).abs() <= 0.1);
    }

    #[test]
    fn rejects_non_finite_and_out_of_range_viewing_inputs() {
        assert!(
            viewing_distance_for_diagonal(f64::NAN, 36.0)
                .unwrap_err()
                .contains("конечное число")
        );
        assert!(
            viewing_distance_for_diagonal(55.0, 10.0)
                .unwrap_err()
                .contains("от 20 до 60")
        );
        assert!(
            diagonal_for_viewing_distance(20.0, 36.0)
                .unwrap_err()
                .contains("от 30 до 1000")
        );
        assert!(
            diagonal_for_viewing_distance(1_000.0, 60.0)
                .unwrap_err()
                .contains("Расчётная диагональ")
        );
    }

    #[test]
    fn viewing_json_reports_errors_without_panicking() {
        let invalid_mode = viewing_geometry_json("unknown", 55.0, 36.0);
        let invalid_mode: serde_json::Value = serde_json::from_str(&invalid_mode).unwrap();
        assert!(invalid_mode.get("error").is_some());

        let invalid_value = viewing_geometry_json("diagonal-to-distance", 5.0, 36.0);
        let invalid_value: serde_json::Value = serde_json::from_str(&invalid_value).unwrap();
        assert!(invalid_value.get("error").is_some());
    }

    #[test]
    fn phone_tv_connection_matrix_is_conservative_and_deterministic() {
        let cases = [
            (
                "iphone",
                "apple-tv",
                "mirror",
                "unknown",
                "yes",
                "no",
                "unknown",
                "needs-check",
                Some("airplay"),
            ),
            (
                "iphone",
                "apple-tv",
                "mirror",
                "unknown",
                "unknown",
                "no",
                "unknown",
                "needs-check",
                Some("airplay"),
            ),
            (
                "iphone",
                "apple-tv",
                "mirror",
                "unknown",
                "no",
                "no",
                "unknown",
                "needs-check",
                Some("airplay"),
            ),
            (
                "iphone",
                "samsung-smart-tv",
                "mirror",
                "unknown",
                "yes",
                "no",
                "unknown",
                "needs-check",
                Some("airplay"),
            ),
            (
                "iphone",
                "lg-smart-tv",
                "media",
                "unknown",
                "yes",
                "no",
                "unknown",
                "needs-check",
                Some("airplay"),
            ),
            (
                "iphone",
                "google-tv",
                "media",
                "unknown",
                "yes",
                "no",
                "unknown",
                "needs-check",
                Some("app-cast"),
            ),
            (
                "iphone",
                "google-tv",
                "mirror",
                "unknown",
                "yes",
                "no",
                "unknown",
                "no-direct-path",
                None,
            ),
            (
                "iphone",
                "hdmi-tv",
                "no-wifi",
                "lightning",
                "unknown",
                "yes",
                "unknown",
                "needs-check",
                Some("iphone-hdmi"),
            ),
            (
                "iphone",
                "hdmi-tv",
                "no-wifi",
                "usb-c",
                "unknown",
                "yes",
                "unknown",
                "needs-check",
                Some("iphone-hdmi"),
            ),
            (
                "iphone",
                "hdmi-tv",
                "no-wifi",
                "unknown",
                "unknown",
                "yes",
                "unknown",
                "needs-check",
                Some("iphone-hdmi"),
            ),
            (
                "android-samsung",
                "samsung-smart-tv",
                "mirror",
                "unknown",
                "yes",
                "no",
                "unknown",
                "needs-check",
                Some("smart-view"),
            ),
            (
                "android-other",
                "google-tv",
                "media",
                "unknown",
                "yes",
                "no",
                "unknown",
                "needs-check",
                Some("google-cast"),
            ),
            (
                "android-other",
                "lg-smart-tv",
                "mirror",
                "unknown",
                "yes",
                "no",
                "unknown",
                "needs-check",
                Some("wireless-screen"),
            ),
            (
                "android-other",
                "apple-tv",
                "mirror",
                "unknown",
                "yes",
                "no",
                "unknown",
                "no-direct-path",
                None,
            ),
            (
                "android-other",
                "hdmi-tv",
                "no-wifi",
                "usb-c",
                "unknown",
                "yes",
                "yes",
                "needs-check",
                Some("android-usb-c-hdmi"),
            ),
            (
                "android-other",
                "hdmi-tv",
                "no-wifi",
                "usb-c",
                "unknown",
                "yes",
                "unknown",
                "needs-check",
                Some("android-usb-c-hdmi"),
            ),
            (
                "android-other",
                "hdmi-tv",
                "no-wifi",
                "usb-c",
                "unknown",
                "yes",
                "no",
                "no-direct-path",
                None,
            ),
            (
                "android-other",
                "hdmi-tv",
                "no-wifi",
                "micro-usb",
                "unknown",
                "yes",
                "yes",
                "no-direct-path",
                None,
            ),
            (
                "android-other",
                "hdmi-tv",
                "no-wifi",
                "unknown",
                "unknown",
                "yes",
                "unknown",
                "needs-check",
                Some("android-wired-check"),
            ),
            (
                "android-samsung",
                "yandex-tv",
                "mirror",
                "unknown",
                "unknown",
                "unknown",
                "unknown",
                "needs-check",
                Some("wireless-screen"),
            ),
        ];

        for (phone, tv, goal, connector, network, hdmi, video, status, primary) in cases {
            let first =
                calculate_phone_tv_connection(phone, tv, goal, connector, network, hdmi, video)
                    .unwrap();
            let second =
                calculate_phone_tv_connection(phone, tv, goal, connector, network, hdmi, video)
                    .unwrap();
            assert_eq!(first, second, "plan must be stable for {phone}/{tv}/{goal}");
            assert_eq!(first.status, status, "wrong status for {phone}/{tv}/{goal}");
            assert_eq!(first.primary_route_id.as_deref(), primary);
            assert_ne!(
                first.status, "ready",
                "generic wizard input must not claim official confirmation for {phone}/{tv}/{goal}"
            );
            assert!(
                first.routes.iter().all(|route| route.readiness != "ready"),
                "generic route must stay fail-closed for {phone}/{tv}/{goal}"
            );
        }
    }

    #[test]
    fn phone_tv_connection_never_infers_video_from_usb_c_alone() {
        let plan = calculate_phone_tv_connection(
            "android-other",
            "hdmi-tv",
            "no-wifi",
            "usb-c",
            "unknown",
            "yes",
            "unknown",
        )
        .unwrap();

        assert_eq!(plan.status, "needs-check");
        assert!(plan.routes.iter().all(|route| route.readiness != "ready"));
        assert!(
            plan.next_checks
                .iter()
                .any(|check| check.contains("видеовыход USB-C"))
        );
    }

    #[test]
    fn phone_tv_connection_sources_match_the_selected_tv_family() {
        let yandex = calculate_phone_tv_connection(
            "android-samsung",
            "yandex-tv",
            "mirror",
            "unknown",
            "unknown",
            "unknown",
            "unknown",
        )
        .unwrap();
        let yandex_route = yandex
            .routes
            .iter()
            .find(|route| route.id == "wireless-screen")
            .unwrap();
        assert!(yandex_route.source_ids.is_empty());

        let lg = calculate_phone_tv_connection(
            "android-other",
            "lg-smart-tv",
            "mirror",
            "unknown",
            "yes",
            "unknown",
            "unknown",
        )
        .unwrap();
        let lg_route = lg
            .routes
            .iter()
            .find(|route| route.id == "wireless-screen")
            .unwrap();
        assert_eq!(lg_route.source_ids, vec!["lg-screen-share"]);
        assert!(
            !lg_route
                .source_ids
                .contains(&"samsung-smart-view".to_string())
        );
    }

    #[test]
    fn phone_tv_connection_rejects_impossible_platform_connector_pairs() {
        assert!(
            calculate_phone_tv_connection(
                "iphone",
                "hdmi-tv",
                "no-wifi",
                "micro-usb",
                "unknown",
                "yes",
                "unknown",
            )
            .unwrap_err()
            .contains("iPhone")
        );
        assert!(
            calculate_phone_tv_connection(
                "android-other",
                "hdmi-tv",
                "no-wifi",
                "lightning",
                "unknown",
                "yes",
                "unknown",
            )
            .unwrap_err()
            .contains("Lightning")
        );
        assert!(
            calculate_phone_tv_connection(
                "windows-phone",
                "unknown",
                "mirror",
                "unknown",
                "unknown",
                "unknown",
                "unknown",
            )
            .unwrap_err()
            .contains("Телефон")
        );
    }

    #[test]
    fn phone_tv_connection_wasm_json_has_stable_shape_and_error_only_failure() {
        let response = phone_tv_connection_plan_json(
            "iphone", "apple-tv", "mirror", "unknown", "yes", "no", "unknown",
        );
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "status",
            "phone",
            "tv",
            "goal",
            "primary_route_id",
            "routes",
            "rejected_reasons",
            "next_checks",
            "privacy",
        ] {
            assert!(value.get(field).is_some(), "missing field {field}");
        }
        assert_eq!(value["status"], "needs-check");
        assert_eq!(value["routes"][0]["source_ids"][0], "apple-airplay");
        assert!(value.get("error").is_none());

        let invalid = phone_tv_connection_plan_json(
            "iphone",
            "unknown",
            "mirror",
            "micro-usb",
            "unknown",
            "unknown",
            "unknown",
        );
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
        assert!(invalid.get("status").is_none());
    }

    fn tv_no_signal_input(source: &str) -> TvNoSignalInput {
        TvNoSignalInput {
            source: source.to_string(),
            tv_menu_visible: "yes".to_string(),
            source_powered: "unknown".to_string(),
            input_matches: "unknown".to_string(),
            cable_connected: "unknown".to_string(),
            receiver_menu_visible: "unknown".to_string(),
        }
    }

    #[test]
    fn tv_no_signal_unknown_and_missing_tv_menu_fail_closed() {
        let unknown = calculate_tv_no_signal(&tv_no_signal_input("unknown")).unwrap();
        assert_eq!(unknown.status, "unknown-source");
        assert_eq!(
            unknown.primary_step_id.as_deref(),
            Some("identify-message-source")
        );
        assert_eq!(unknown.steps.len(), 1);
        assert!(unknown.explanation.contains("не будет угадывать"));

        let mut no_menu = tv_no_signal_input("hdmi");
        no_menu.tv_menu_visible = "no".to_string();
        let no_menu = calculate_tv_no_signal(&no_menu).unwrap();
        assert_eq!(no_menu.status, "needs-service");
        assert_eq!(
            no_menu.primary_step_id.as_deref(),
            Some("stop-signal-check")
        );
        assert_eq!(no_menu.steps.len(), 1);
        assert!(no_menu.explanation.contains("нельзя относить"));

        let mut unknown_menu = tv_no_signal_input("satellite");
        unknown_menu.tv_menu_visible = "unknown".to_string();
        let unknown_menu = calculate_tv_no_signal(&unknown_menu).unwrap();
        assert_eq!(unknown_menu.status, "action-plan");
        assert_eq!(
            unknown_menu.primary_step_id.as_deref(),
            Some("check-tv-menu")
        );
        assert_eq!(unknown_menu.steps.len(), 1);
    }

    #[test]
    fn tv_no_signal_hdmi_orders_input_power_and_direct_isolation() {
        let mut input = tv_no_signal_input("hdmi");
        input.input_matches = "no".to_string();
        input.source_powered = "no".to_string();
        let first = calculate_tv_no_signal(&input).unwrap();
        let second = calculate_tv_no_signal(&input).unwrap();

        assert_eq!(first, second);
        assert_eq!(first.status, "action-plan");
        assert_eq!(
            first
                .steps
                .iter()
                .map(|step| step.id.as_str())
                .collect::<Vec<_>>(),
            vec![
                "select-matching-input",
                "confirm-source-power",
                "connect-hdmi-directly",
                "reseat-and-isolate-hdmi",
                "check-source-output",
            ]
        );
        assert_eq!(first.steps[0].source_ids, vec!["samsung-hdmi", "sony-hdmi"]);

        let mut confirmed = tv_no_signal_input("hdmi");
        confirmed.input_matches = "yes".to_string();
        confirmed.source_powered = "yes".to_string();
        let confirmed = calculate_tv_no_signal(&confirmed).unwrap();
        assert_eq!(
            confirmed.primary_step_id.as_deref(),
            Some("connect-hdmi-directly")
        );
    }

    #[test]
    fn tv_no_signal_terrestrial_uses_safe_dtv_checks() {
        let plan = calculate_tv_no_signal(&tv_no_signal_input("terrestrial")).unwrap();
        assert_eq!(plan.status, "action-plan");
        assert_eq!(plan.primary_step_id.as_deref(), Some("select-tv-dtv"));
        assert!(
            plan.steps
                .iter()
                .any(|step| step.id == "run-dtv-auto-search")
        );
        assert!(
            plan.steps
                .iter()
                .flat_map(|step| step.source_ids.iter())
                .any(|source_id| source_id == "rtrs-dtv")
        );
        assert!(
            plan.stop_conditions
                .iter()
                .any(|condition| condition.contains("Не поднимайтесь"))
        );
    }

    #[test]
    fn tv_no_signal_cable_box_requires_visible_receiver_menu_for_provider_path() {
        let mut confirmed = tv_no_signal_input("cable-box");
        confirmed.input_matches = "yes".to_string();
        confirmed.source_powered = "yes".to_string();
        confirmed.receiver_menu_visible = "yes".to_string();
        confirmed.cable_connected = "yes".to_string();
        let confirmed = calculate_tv_no_signal(&confirmed).unwrap();
        assert_eq!(confirmed.status, "provider-path");
        assert_eq!(
            confirmed.primary_step_id.as_deref(),
            Some("contact-provider")
        );
        assert!(
            confirmed
                .explanation
                .contains("точная причина не установлена")
        );

        let mut unconfirmed = tv_no_signal_input("cable-box");
        unconfirmed.input_matches = "yes".to_string();
        unconfirmed.source_powered = "yes".to_string();
        unconfirmed.receiver_menu_visible = "no".to_string();
        let unconfirmed = calculate_tv_no_signal(&unconfirmed).unwrap();
        assert_eq!(unconfirmed.status, "action-plan");
        assert!(
            unconfirmed
                .steps
                .iter()
                .any(|step| step.id == "open-receiver-menu")
        );
    }

    #[test]
    fn tv_no_signal_satellite_stops_before_roof_or_dish_work() {
        let plan = calculate_tv_no_signal(&tv_no_signal_input("satellite")).unwrap();
        assert_eq!(plan.status, "action-plan");
        assert!(
            plan.steps
                .iter()
                .any(|step| step.id == "contact-satellite-support")
        );
        assert!(
            plan.stop_conditions
                .iter()
                .any(|condition| condition.contains("не поворачивайте тарелку"))
        );
        assert!(
            plan.steps
                .iter()
                .flat_map(|step| step.source_ids.iter())
                .all(|source_id| source_id != "tricolor-no-signal"),
            "generic satellite flow must not inherit a branded operator source"
        );

        let serialized = serde_json::to_string(&plan).unwrap().to_lowercase();
        for forbidden in [
            "купите",
            "закажите",
            "замените",
            "поднимитесь",
            "поверните тарелку",
            "диагностирована",
            "неисправен телевизор",
        ] {
            assert!(
                !serialized.contains(forbidden),
                "unsafe or unsupported recommendation: {forbidden}"
            );
        }
    }

    #[test]
    fn tv_no_signal_wasm_json_has_stable_shape_and_error_only_failure() {
        let response =
            calculate_tv_no_signal_json("hdmi", "yes", "yes", "yes", "unknown", "unknown");
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "status",
            "source",
            "primary_step_id",
            "headline",
            "explanation",
            "steps",
            "stop_conditions",
            "privacy",
        ] {
            assert!(value.get(field).is_some(), "missing field {field}");
        }
        assert_eq!(value["status"], "action-plan");
        assert_eq!(value["steps"][0]["id"], "connect-hdmi-directly");
        for field in ["id", "title", "instruction", "source_ids", "stop_condition"] {
            assert!(
                value["steps"][0].get(field).is_some(),
                "missing step field {field}"
            );
        }
        assert!(value.get("error").is_none());

        let invalid =
            calculate_tv_no_signal_json("streaming-app", "yes", "yes", "yes", "yes", "yes");
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
        assert!(invalid.get("status").is_none());

        let invalid_observation =
            calculate_tv_no_signal_json("hdmi", "sometimes", "yes", "yes", "yes", "yes");
        let invalid_observation: serde_json::Value =
            serde_json::from_str(&invalid_observation).unwrap();
        assert!(invalid_observation.get("error").is_some());
        assert!(invalid_observation.get("steps").is_none());
    }

    #[test]
    fn tv_dimensions_diagonal_mode_uses_exact_16_by_9_geometry() {
        let plan = calculate_tv_dimensions_plan("diagonal", 55.0, 0.0, 0.0, 0.0, 0.0).unwrap();

        assert_eq!(plan.mode, "diagonal");
        assert_eq!(plan.source, "diagonal-16:9");
        assert_eq!(plan.diagonal_inches, 55.0);
        assert_eq!(plan.diagonal_cm, 139.7);
        assert_eq!(plan.screen_width_cm, 121.8);
        assert_eq!(plan.screen_height_cm, 68.5);
        assert_eq!(plan.measured_aspect_ratio, None);
        assert_eq!(plan.usable_width_cm, None);
        assert_eq!(plan.recommended_standard_diagonal_inches, None);
        assert!(plan.warnings.iter().any(|warning| warning.contains("16:9")));

        let with_comparison =
            calculate_tv_dimensions_plan("diagonal", 55.0, 65.0, 0.0, 0.0, 0.0).unwrap();
        assert_eq!(with_comparison.diagonal_inches, 55.0);
    }

    #[test]
    fn tv_dimensions_measured_mode_preserves_input_rectangle() {
        let plan = calculate_tv_dimensions_plan("measured", 121.8, 68.5, 0.0, 0.0, 0.0).unwrap();

        assert_eq!(plan.mode, "measured");
        assert_eq!(plan.source, "measured-rectangle");
        assert_eq!(plan.diagonal_inches, 55.0);
        assert_eq!(plan.diagonal_cm, 139.7);
        assert_eq!(plan.screen_width_cm, 121.8);
        assert_eq!(plan.screen_height_cm, 68.5);
        assert_eq!(plan.measured_aspect_ratio, Some(1.8));
        assert!(
            plan.warnings
                .iter()
                .any(|warning| warning.contains("без приведения к 16:9"))
        );

        let non_widescreen =
            calculate_tv_dimensions_plan("measured", 100.0, 80.0, 0.0, 0.0, 0.0).unwrap();
        assert_eq!(non_widescreen.screen_width_cm, 100.0);
        assert_eq!(non_widescreen.screen_height_cm, 80.0);
        assert_eq!(non_widescreen.measured_aspect_ratio, Some(1.3));
        assert!(
            non_widescreen
                .warnings
                .iter()
                .any(|warning| warning.contains("отличается от 16:9"))
        );
    }

    #[test]
    fn tv_dimensions_niche_mode_selects_largest_fitting_standard_size() {
        let plan = calculate_tv_dimensions_plan("niche", 130.0, 80.0, 2.0, 0.0, 0.0).unwrap();

        assert_eq!(plan.mode, "niche");
        assert_eq!(plan.source, "niche-standard-16:9");
        assert_eq!(plan.usable_width_cm, Some(126.0));
        assert_eq!(plan.usable_height_cm, Some(76.0));
        assert_eq!(plan.recommended_standard_diagonal_inches, Some(55.0));
        assert_eq!(plan.diagonal_inches, 55.0);
        assert_eq!(plan.screen_width_cm, 121.8);
        assert_eq!(plan.screen_height_cm, 68.5);
        assert_eq!(plan.exact_case_fits, None);
    }

    #[test]
    fn tv_dimensions_niche_checks_exact_case_fit_and_deltas() {
        let fitting = calculate_tv_dimensions_plan("niche", 130.0, 80.0, 2.0, 125.0, 75.0).unwrap();
        assert_eq!(fitting.exact_case_width_cm, Some(125.0));
        assert_eq!(fitting.exact_case_height_cm, Some(75.0));
        assert_eq!(fitting.exact_case_fits, Some(true));
        assert_eq!(fitting.exact_case_horizontal_delta_cm, Some(1.0));
        assert_eq!(fitting.exact_case_vertical_delta_cm, Some(1.0));

        let too_wide =
            calculate_tv_dimensions_plan("niche", 130.0, 80.0, 2.0, 127.0, 75.0).unwrap();
        assert_eq!(too_wide.exact_case_fits, Some(false));
        assert_eq!(too_wide.exact_case_horizontal_delta_cm, Some(-1.0));
        assert_eq!(too_wide.exact_case_vertical_delta_cm, Some(1.0));
        assert!(
            too_wide
                .warnings
                .iter()
                .any(|warning| warning.contains("не помещается"))
        );
    }

    #[test]
    fn tv_dimensions_rejects_invalid_modes_ranges_and_partial_pairs() {
        assert!(
            calculate_tv_dimensions_plan("diagonal", 0.0, 0.0, 0.0, 0.0, 0.0)
                .unwrap_err()
                .contains("Диагональ")
        );
        assert!(
            calculate_tv_dimensions_plan("measured", f64::NAN, 68.5, 0.0, 0.0, 0.0)
                .unwrap_err()
                .contains("конечное число")
        );
        assert!(
            calculate_tv_dimensions_plan("measured", 121.8, 0.0, 0.0, 0.0, 0.0)
                .unwrap_err()
                .contains("Измеренная высота")
        );
        assert!(
            calculate_tv_dimensions_plan("niche", 50.0, 30.0, 15.0, 0.0, 0.0)
                .unwrap_err()
                .contains("нулевую или отрицательную")
        );
        assert!(
            calculate_tv_dimensions_plan("niche", 130.0, 80.0, 2.0, 125.0, 0.0)
                .unwrap_err()
                .contains("и ширину, и высоту корпуса")
        );
        assert!(
            calculate_tv_dimensions_plan("niche", 30.0, 20.0, 0.0, 0.0, 0.0)
                .unwrap_err()
                .contains("слишком мала")
        );
        assert!(
            calculate_tv_dimensions_plan("unknown", 55.0, 0.0, 0.0, 0.0, 0.0)
                .unwrap_err()
                .contains("Неизвестный режим")
        );
    }

    #[test]
    fn tv_dimensions_wasm_json_has_stable_shape_and_errors() {
        let response = tv_dimensions_plan_json("niche", 130.0, 80.0, 2.0, 125.0, 75.0);
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "mode",
            "source",
            "diagonal_inches",
            "diagonal_cm",
            "screen_width_cm",
            "screen_height_cm",
            "measured_aspect_ratio",
            "usable_width_cm",
            "usable_height_cm",
            "recommended_standard_diagonal_inches",
            "exact_case_width_cm",
            "exact_case_height_cm",
            "exact_case_fits",
            "exact_case_horizontal_delta_cm",
            "exact_case_vertical_delta_cm",
            "warnings",
        ] {
            assert!(value.get(field).is_some(), "missing field {field}");
        }
        assert!(value.get("error").is_none());

        let invalid = tv_dimensions_plan_json("measured", 121.8, 0.0, 0.0, 0.0, 0.0);
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
        assert!(invalid.get("diagonal_inches").is_none());
    }

    #[test]
    fn calculates_ninety_degree_extension_for_centered_vesa() {
        let plan = calculate_turn_clearance_plan(123.0, 0.0, 90.0, 65.0, 3.0).unwrap();
        assert_eq!(plan.minimum_extension_cm, 64.5);
        assert_eq!(plan.maximum_clearance_angle_degrees, 90.0);
        assert_eq!(plan.clearance_margin_cm, 0.5);
        assert!(plan.will_clear_wall);
        assert_eq!(plan.effective_half_width_cm, 61.5);
    }

    #[test]
    fn vesa_offset_uses_the_longer_side_for_either_direction() {
        let centered = calculate_turn_clearance_plan(123.0, 0.0, 90.0, 70.0, 3.0).unwrap();
        let offset_right = calculate_turn_clearance_plan(123.0, 5.0, 90.0, 70.0, 3.0).unwrap();
        let offset_left = calculate_turn_clearance_plan(123.0, -5.0, 90.0, 70.0, 3.0).unwrap();

        assert_eq!(centered.minimum_extension_cm, 64.5);
        assert_eq!(offset_right.minimum_extension_cm, 69.5);
        assert_eq!(offset_right.effective_half_width_cm, 66.5);
        assert_eq!(offset_left.minimum_extension_cm, 69.5);
        assert_eq!(offset_left.effective_half_width_cm, 66.5);
    }

    #[test]
    fn reports_maximum_angle_and_deficit_for_short_mount() {
        let plan = calculate_turn_clearance_plan(123.0, 0.0, 90.0, 46.4, 3.0).unwrap();
        assert_eq!(plan.maximum_clearance_angle_degrees, 44.9);
        assert_eq!(plan.clearance_margin_cm, -18.1);
        assert!(!plan.will_clear_wall);
        assert!(
            plan.warnings
                .iter()
                .any(|warning| warning.contains("недостаточно"))
        );
    }

    #[test]
    fn zero_angle_only_needs_the_requested_clearance() {
        let plan = calculate_turn_clearance_plan(123.0, 12.0, 0.0, 3.0, 3.0).unwrap();
        assert_eq!(plan.minimum_extension_cm, 3.0);
        assert_eq!(plan.clearance_margin_cm, 0.0);
        assert!(plan.will_clear_wall);
    }

    #[test]
    fn rejects_invalid_turn_clearance_inputs() {
        assert!(
            calculate_turn_clearance_plan(f64::NAN, 0.0, 45.0, 50.0, 3.0)
                .unwrap_err()
                .contains("конечное число")
        );
        assert!(
            calculate_turn_clearance_plan(123.0, 62.0, 45.0, 50.0, 3.0)
                .unwrap_err()
                .contains("Смещение VESA")
        );
        assert!(
            calculate_turn_clearance_plan(123.0, 0.0, 91.0, 50.0, 3.0)
                .unwrap_err()
                .contains("от 0 до 90")
        );
        assert!(
            calculate_turn_clearance_plan(123.0, 0.0, 45.0, -1.0, 3.0)
                .unwrap_err()
                .contains("Доступный вылет")
        );
        assert!(
            calculate_turn_clearance_plan(123.0, 0.0, 45.0, 50.0, -1.0)
                .unwrap_err()
                .contains("Безопасный зазор")
        );
    }

    #[test]
    fn turn_clearance_wasm_json_has_stable_shape_and_errors() {
        let response = turn_clearance_plan_json(123.0, 0.0, 90.0, 65.0, 3.0);
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "minimum_extension_cm",
            "maximum_clearance_angle_degrees",
            "clearance_margin_cm",
            "will_clear_wall",
            "effective_half_width_cm",
            "warnings",
        ] {
            assert!(value.get(field).is_some(), "missing field {field}");
        }
        assert!(value.get("error").is_none());

        let invalid = turn_clearance_plan_json(123.0, 0.0, 120.0, 65.0, 3.0);
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
    }

    #[test]
    fn tilt_angle_plan_calculates_downward_range_and_screen_bounds() {
        let plan = calculate_tilt_angle_plan(55.0, 150.0, 110.0, 250.0, 15.0, 5.0).unwrap();

        assert_eq!(plan.screen_height_cm, 68.5);
        assert_eq!(plan.screen_bottom_height_cm, 115.8);
        assert_eq!(plan.screen_top_height_cm, 184.2);
        assert_eq!(plan.vertical_offset_cm, 40.0);
        assert_eq!(plan.required_tilt_degrees, 9.1);
        assert_eq!(plan.required_direction, "вниз");
        assert_eq!(plan.available_tilt_degrees, 15.0);
        assert_eq!(plan.tilt_margin_degrees, 5.9);
        assert!(plan.mount_covers_required_tilt);
        assert!(plan.screen_clears_floor);
    }

    #[test]
    fn tilt_angle_plan_reports_deficit_and_upward_direction() {
        let insufficient = calculate_tilt_angle_plan(55.0, 150.0, 110.0, 250.0, 5.0, 5.0).unwrap();
        assert_eq!(insufficient.required_direction, "вниз");
        assert_eq!(insufficient.tilt_margin_degrees, -4.1);
        assert!(!insufficient.mount_covers_required_tilt);
        assert!(
            insufficient
                .warnings
                .iter()
                .any(|warning| warning.contains("недостаточно на 4.1°"))
        );

        let upward = calculate_tilt_angle_plan(55.0, 90.0, 110.0, 250.0, 15.0, 5.0).unwrap();
        assert_eq!(upward.required_direction, "вверх");
        assert_eq!(upward.required_tilt_degrees, 4.6);
        assert_eq!(upward.available_tilt_degrees, 5.0);
        assert_eq!(upward.tilt_margin_degrees, 0.4);
        assert!(upward.mount_covers_required_tilt);
    }

    #[test]
    fn tilt_angle_plan_uses_display_precision_for_boundary_verdict() {
        let plan = calculate_tilt_angle_plan(55.0, 177.0, 110.0, 250.0, 15.0, 5.0).unwrap();

        assert_eq!(plan.required_tilt_degrees, 15.0);
        assert_eq!(plan.available_tilt_degrees, 15.0);
        assert_eq!(plan.tilt_margin_degrees, 0.0);
        assert!(plan.mount_covers_required_tilt);
    }

    #[test]
    fn tilt_angle_plan_rejects_invalid_values_and_floor_conflict() {
        assert!(
            calculate_tilt_angle_plan(f64::NAN, 150.0, 110.0, 250.0, 15.0, 5.0)
                .unwrap_err()
                .contains("конечное число")
        );
        assert!(
            calculate_tilt_angle_plan(55.0, 150.0, 110.0, 20.0, 15.0, 5.0)
                .unwrap_err()
                .contains("Расстояние до экрана")
        );

        let below_floor = calculate_tilt_angle_plan(55.0, 20.0, 110.0, 250.0, 15.0, 30.0).unwrap();
        assert!(!below_floor.screen_clears_floor);
        assert!(!below_floor.mount_covers_required_tilt);
        assert!(
            below_floor
                .warnings
                .iter()
                .any(|warning| warning.contains("ниже уровня чистого пола"))
        );
    }

    #[test]
    fn tilt_angle_wasm_json_has_stable_shape_and_errors() {
        let response = tilt_angle_plan_json(55.0, 150.0, 110.0, 250.0, 15.0, 5.0);
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "screen_bottom_height_cm",
            "screen_top_height_cm",
            "center_sightline_angle_degrees",
            "required_tilt_degrees",
            "required_direction",
            "available_tilt_degrees",
            "tilt_margin_degrees",
            "mount_covers_required_tilt",
            "warnings",
        ] {
            assert!(value.get(field).is_some(), "missing field {field}");
        }
        assert!(value.get("error").is_none());

        let invalid = tilt_angle_plan_json(5.0, 150.0, 110.0, 250.0, 15.0, 5.0);
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
    }

    #[test]
    fn vesa_match_parses_explicit_pairs_symbols_and_units() {
        let plan = calculate_vesa_match(20.0, 20.0, "см", "75x75; 100 х 100; 200×200 мм; 40*40 см")
            .unwrap();

        assert_eq!(plan.status, "совпадает");
        assert_eq!(plan.measured_pair, "200×200 мм");
        assert_eq!(plan.recognized_pair_count, 4);
        assert_eq!(plan.matched_pair.as_deref(), Some("200×200 мм"));
        assert_eq!(plan.mount_supports_measured_pair, Some(true));
    }

    #[test]
    fn vesa_match_rejects_maximum_only_claim() {
        let plan = calculate_vesa_match(200.0, 200.0, "мм", "Максимальный VESA 400×400").unwrap();

        assert_eq!(plan.status, "недостаточно-данных");
        assert!(plan.range_only_claim);
        assert_eq!(plan.mount_supports_measured_pair, None);
        assert!(plan.matched_pair.is_none());

        for claim in [
            "Макс. VESA: 400×400",
            "VESA от 100×100 до 400×400",
            "VESA 100×100 — 400×400",
        ] {
            let plan = calculate_vesa_match(400.0, 400.0, "мм", claim).unwrap();
            assert_eq!(plan.status, "недостаточно-данных", "claim: {claim}");
            assert!(plan.range_only_claim, "claim: {claim}");
            assert_eq!(plan.mount_supports_measured_pair, None, "claim: {claim}");
        }
    }

    #[test]
    fn vesa_match_ignores_unrelated_dimensions_and_dimension_triples() {
        let plate =
            calculate_vesa_match(665.0, 430.0, "мм", "VESA 200×200; габариты 665×430×100 мм")
                .unwrap();
        assert_eq!(plate.status, "не-совпадает");
        assert_eq!(plate.recognized_pairs, ["200×200 мм"]);

        let centimetres =
            calculate_vesa_match(750.0, 750.0, "мм", "VESA 75×75; размер пластины 40×20 см")
                .unwrap();
        assert_eq!(centimetres.status, "не-совпадает");
        assert_eq!(centimetres.recognized_pairs, ["75×75 мм"]);

        let bare_triple = calculate_vesa_match(665.0, 430.0, "мм", "665×430×100 мм").unwrap();
        assert_eq!(bare_triple.status, "недостаточно-данных");
        assert!(bare_triple.recognized_pairs.is_empty());
    }

    #[test]
    fn vesa_match_reports_near_measurement_as_candidate() {
        let plan = calculate_vesa_match(198.0, 201.0, "мм", "100×100, 200×200, 300×200").unwrap();

        assert_eq!(plan.status, "недостаточно-данных");
        assert_eq!(plan.candidate_pair.as_deref(), Some("200×200 мм"));
        assert_eq!(plan.mount_supports_measured_pair, None);
    }

    #[test]
    fn vesa_match_keeps_axes_order_and_reports_mismatch() {
        let reversed = calculate_vesa_match(200.0, 300.0, "мм", "300×200, 400×400").unwrap();
        assert_eq!(reversed.status, "не-совпадает");
        assert_eq!(reversed.reversed_pair.as_deref(), Some("300×200 мм"));
        assert_eq!(reversed.mount_supports_measured_pair, Some(false));

        let absent = calculate_vesa_match(200.0, 200.0, "мм", "100×100, 300×200").unwrap();
        assert_eq!(absent.status, "не-совпадает");
        assert!(absent.reversed_pair.is_none());
        assert_eq!(absent.mount_supports_measured_pair, Some(false));
    }

    #[test]
    fn vesa_screw_length_plan_adds_confirmed_range_without_selecting_a_size() {
        let plan = calculate_vesa_screw_length_plan(Some(19.0), Some(21.0), 3.0, 1.0, 0.0).unwrap();

        assert_eq!(plan.external_stack_thickness_mm, 4.0);
        assert_eq!(plan.total_length_min_mm, 23.0);
        assert_eq!(plan.total_length_max_mm, 25.0);

        let fractional =
            calculate_vesa_screw_length_plan(Some(9.5), Some(11.5), 2.35, 0.4, 1.2).unwrap();
        assert!((fractional.total_length_min_mm - 13.45).abs() < 1e-12);
        assert!((fractional.total_length_max_mm - 15.45).abs() < 1e-12);
    }

    #[test]
    fn vesa_screw_length_plan_requires_both_passport_bounds() {
        let missing_min =
            calculate_vesa_screw_length_plan(None, Some(21.0), 3.0, 1.0, 0.0).unwrap_err();
        assert!(missing_min.contains("минимальная граница"));

        let missing_max =
            calculate_vesa_screw_length_plan(Some(19.0), None, 3.0, 1.0, 0.0).unwrap_err();
        assert!(missing_max.contains("максимальная граница"));
    }

    #[test]
    fn vesa_screw_length_plan_rejects_reversed_passport_range() {
        let error =
            calculate_vesa_screw_length_plan(Some(21.0), Some(19.0), 3.0, 1.0, 0.0).unwrap_err();
        assert!(error.contains("минимальная граница больше максимальной"));
    }

    #[test]
    fn vesa_screw_length_plan_rejects_negative_measurements() {
        for (engagement_min, plate, washers, spacer) in [
            (-1.0, 3.0, 1.0, 0.0),
            (19.0, -3.0, 1.0, 0.0),
            (19.0, 3.0, -1.0, 0.0),
            (19.0, 3.0, 1.0, -1.0),
        ] {
            assert!(
                calculate_vesa_screw_length_plan(
                    Some(engagement_min),
                    Some(21.0),
                    plate,
                    washers,
                    spacer,
                )
                .is_err()
            );
        }
    }

    #[test]
    fn vesa_screw_length_plan_rejects_non_finite_and_out_of_range_values() {
        let non_finite =
            calculate_vesa_screw_length_plan(Some(f64::NAN), Some(21.0), 3.0, 1.0, 0.0)
                .unwrap_err();
        assert!(non_finite.contains("конечное число"));

        let oversized_component = calculate_vesa_screw_length_plan(
            Some(19.0),
            Some(21.0),
            MAX_VESA_SCREW_LENGTH_MM + 0.1,
            1.0,
            0.0,
        )
        .unwrap_err();
        assert!(oversized_component.contains("не должно превышать"));

        let oversized_total =
            calculate_vesa_screw_length_plan(Some(150.0), Some(150.0), 49.0, 1.0, 1.0).unwrap_err();
        assert!(oversized_total.contains("Полная длина винта"));
    }

    #[test]
    fn vesa_screw_length_wasm_json_has_stable_shape_and_errors() {
        let response = vesa_screw_length_plan_json(Some(19.0), Some(21.0), 3.0, 1.0, 0.0);
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "engagement_min_mm",
            "engagement_max_mm",
            "bracket_plate_thickness_mm",
            "washer_stack_thickness_mm",
            "required_spacer_thickness_mm",
            "external_stack_thickness_mm",
            "total_length_min_mm",
            "total_length_max_mm",
        ] {
            assert!(value.get(field).is_some(), "missing field {field}");
        }
        assert!(value.get("selected_length_mm").is_none());
        assert!(value.get("error").is_none());

        let invalid = vesa_screw_length_plan_json(None, Some(21.0), 3.0, 1.0, 0.0);
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
    }

    #[test]
    fn vesa_match_wasm_json_has_stable_shape_and_errors() {
        let response = vesa_match_plan_json(200.0, 200.0, "мм", "100×100, 200×200");
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "status",
            "result_summary",
            "measured_pair",
            "recognized_pairs",
            "recognized_pair_count",
            "range_only_claim",
            "mount_supports_measured_pair",
            "warnings",
        ] {
            assert!(value.get(field).is_some(), "missing field {field}");
        }
        assert!(value.get("error").is_none());

        let invalid = vesa_match_plan_json(2.0, 20.0, "см", "200×200");
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
    }

    #[test]
    fn tv_zone_socket_plan_confirms_clear_hidden_block() {
        let plan = calculate_tv_zone_socket_plan(
            55.0, 114.2, 45.0, 20.0, 0.0, 0.0, 14.0, 8.0, 35.0, 0.0, 2.0, 3.5, 5.0, 4, 1, 1, 1,
        )
        .unwrap();

        assert_eq!(plan.screen_width_cm, 121.8);
        assert_eq!(plan.socket_center_height_cm, 114.2);
        assert!(plan.screen_clears_floor);
        assert!(plan.plate_hidden_by_screen);
        assert!(plan.service_zone_hidden_by_screen);
        assert!(plan.socket_hidden_by_screen);
        assert!(!plan.socket_overlaps_plate);
        assert!(!plan.socket_overlaps_service_zone);
        assert!(plan.plug_fits_depth);
        assert_eq!(plan.depth_margin_cm, 1.5);
        assert_eq!(plan.power_modules, 5);
        assert_eq!(plan.total_modules, 7);
        assert!(plan.ready_for_site_check);
    }

    #[test]
    fn tv_zone_socket_plan_finds_shortest_shift_around_plate() {
        let plan = calculate_tv_zone_socket_plan(
            55.0, 114.2, 45.0, 20.0, 0.0, 0.0, 14.0, 8.0, 0.0, 0.0, 2.0, 3.5, 5.0, 3, 1, 1, 0,
        )
        .unwrap();

        assert!(plan.socket_overlaps_plate);
        assert!(plan.socket_overlaps_service_zone);
        assert_eq!(plan.minimum_shift_cm, Some(16.0));
        assert_eq!(plan.shift_direction.as_deref(), Some("вниз"));
        assert!(!plan.ready_for_site_check);
    }

    #[test]
    fn tv_zone_socket_plan_reports_depth_shortage_and_visibility() {
        let plan = calculate_tv_zone_socket_plan(
            55.0, 114.2, 45.0, 20.0, 0.0, 0.0, 14.0, 8.0, 60.0, 0.0, 2.0, 4.0, 2.0, 2, 1, 0, 0,
        )
        .unwrap();

        assert!(!plan.socket_hidden_by_screen);
        assert!(!plan.plug_fits_depth);
        assert_eq!(plan.depth_margin_cm, -2.0);
        assert!(
            plan.warnings
                .iter()
                .any(|warning| warning.contains("Не хватает 2 см"))
        );
    }

    #[test]
    fn tv_zone_socket_plan_rejects_plate_or_screen_outside_physical_bounds() {
        let plate_outside = calculate_tv_zone_socket_plan(
            55.0, 114.2, 45.0, 20.0, 0.0, -50.0, 14.0, 8.0, 35.0, 0.0, 2.0, 3.5, 5.0, 4, 1, 1, 1,
        )
        .unwrap();
        assert!(!plate_outside.plate_hidden_by_screen);
        assert!(!plate_outside.service_zone_hidden_by_screen);
        assert!(!plate_outside.ready_for_site_check);
        assert!(
            plate_outside
                .warnings
                .iter()
                .any(|warning| warning.contains("пластина кронштейна"))
        );

        let service_zone_outside = calculate_tv_zone_socket_plan(
            55.0, 114.2, 45.0, 20.0, 38.0, 0.0, 14.0, 8.0, -35.0, 0.0, 2.0, 3.5, 5.0, 4, 1, 1, 1,
        )
        .unwrap();
        assert!(service_zone_outside.plate_hidden_by_screen);
        assert!(!service_zone_outside.service_zone_hidden_by_screen);
        assert!(!service_zone_outside.ready_for_site_check);
        assert!(
            service_zone_outside
                .warnings
                .iter()
                .any(|warning| warning.contains("сервисный зазор"))
        );

        let below_floor = calculate_tv_zone_socket_plan(
            55.0, 0.0, 45.0, 20.0, 0.0, 0.0, 14.0, 8.0, 35.0, 0.0, 2.0, 3.5, 5.0, 4, 1, 1, 1,
        )
        .unwrap();
        assert!(!below_floor.screen_clears_floor);
        assert!(below_floor.screen_bottom_height_cm < 0.0);
        assert!(!below_floor.ready_for_site_check);
        assert!(
            below_floor
                .warnings
                .iter()
                .any(|warning| warning.contains("ниже уровня чистого пола"))
        );
    }

    #[test]
    fn tv_zone_socket_plan_rejects_invalid_geometry_and_modules() {
        assert!(
            calculate_tv_zone_socket_plan(
                55.0,
                114.2,
                f64::NAN,
                20.0,
                0.0,
                0.0,
                14.0,
                8.0,
                35.0,
                0.0,
                2.0,
                3.5,
                5.0,
                4,
                1,
                1,
                1,
            )
            .unwrap_err()
            .contains("конечное число")
        );
        assert!(
            calculate_tv_zone_socket_plan(
                55.0, 114.2, 45.0, 20.0, 0.0, 0.0, 14.0, 8.0, 35.0, 0.0, 2.0, 3.5, 5.0, 16, 1, 0,
                0,
            )
            .unwrap_err()
            .contains("Силовые модули с запасом")
        );
    }

    #[test]
    fn tv_zone_socket_wasm_json_has_stable_shape_and_errors() {
        let response = tv_zone_socket_plan_json(
            55.0, 114.2, 45.0, 20.0, 0.0, 0.0, 14.0, 8.0, 35.0, 0.0, 2.0, 3.5, 5.0, 4, 1, 1, 1,
        );
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "socket_center_height_cm",
            "screen_clears_floor",
            "plate_hidden_by_screen",
            "service_zone_hidden_by_screen",
            "socket_hidden_by_screen",
            "socket_overlaps_service_zone",
            "plug_fits_depth",
            "minimum_shift_cm",
            "power_modules",
            "total_modules",
            "ready_for_site_check",
            "warnings",
        ] {
            assert!(value.get(field).is_some(), "missing field {field}");
        }
        assert!(value.get("error").is_none());

        let invalid = tv_zone_socket_plan_json(
            5.0, 114.2, 45.0, 20.0, 0.0, 0.0, 14.0, 8.0, 35.0, 0.0, 2.0, 3.5, 5.0, 4, 1, 1, 1,
        );
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
    }

    fn tv_traffic_task_input(
        task: &str,
        primary: &str,
        secondary: &str,
        tertiary: &str,
        detail: &str,
    ) -> TvTrafficTaskInput {
        TvTrafficTaskInput {
            task: task.to_string(),
            primary: primary.to_string(),
            secondary: secondary.to_string(),
            tertiary: tertiary.to_string(),
            detail: detail.to_string(),
        }
    }

    #[test]
    fn tv_traffic_task_laptop_hdmi_and_wireless_are_distinct() {
        let hdmi = calculate_tv_traffic_task(&tv_traffic_task_input(
            "laptop-to-tv",
            "windows",
            "hdmi",
            "extend",
            "unknown",
        ))
        .unwrap();
        assert_eq!(hdmi.status, "ready");
        assert!(
            hdmi.steps
                .iter()
                .any(|step| step.id == "windows-project-mode")
        );
        assert!(
            hdmi.steps
                .iter()
                .any(|step| step.instruction.contains("Расширить"))
        );

        let wireless_unknown = calculate_tv_traffic_task(&tv_traffic_task_input(
            "laptop-to-tv",
            "windows",
            "wireless",
            "mirror",
            "unknown",
        ))
        .unwrap();
        assert_eq!(wireless_unknown.status, "needs-check");
        assert!(wireless_unknown.headline.contains("Miracast"));

        let wireless_no = calculate_tv_traffic_task(&tv_traffic_task_input(
            "laptop-to-tv",
            "windows",
            "wireless",
            "mirror",
            "no",
        ))
        .unwrap();
        assert_eq!(wireless_no.status, "no-direct-path");
    }

    #[test]
    fn tv_traffic_task_usb_c_fails_closed_without_model_support() {
        for system in ["windows", "macos"] {
            let unknown = calculate_tv_traffic_task(&tv_traffic_task_input(
                "laptop-to-tv",
                system,
                "usb-c",
                "mirror",
                "unknown",
            ))
            .unwrap();
            assert_eq!(unknown.status, "needs-check");
            assert!(
                unknown
                    .steps
                    .iter()
                    .any(|step| step.stop_condition.contains("USB-C")
                        || step.instruction.contains("модел"))
            );

            let unsupported = calculate_tv_traffic_task(&tv_traffic_task_input(
                "laptop-to-tv",
                system,
                "usb-c",
                "mirror",
                "no",
            ))
            .unwrap();
            assert_eq!(unsupported.status, "no-direct-path");
        }
    }

    #[test]
    fn tv_traffic_task_digital_channels_separates_tuner_and_provider() {
        let antenna = calculate_tv_traffic_task(&tv_traffic_task_input(
            "digital-channels",
            "antenna",
            "built-in",
            "first-setup",
            "yes",
        ))
        .unwrap();
        assert_eq!(antenna.status, "ready");
        assert!(antenna.steps.iter().any(|step| step.id == "verify-dvb-t2"));
        assert!(
            !antenna
                .steps
                .iter()
                .any(|step| step.id == "get-provider-parameters")
        );

        let provider = calculate_tv_traffic_task(&tv_traffic_task_input(
            "digital-channels",
            "provider-box",
            "external",
            "zero-channels",
            "yes",
        ))
        .unwrap();
        assert_eq!(provider.status, "provider-path");
        assert!(
            provider
                .steps
                .iter()
                .any(|step| step.id == "use-box-remote")
        );
        assert!(
            provider
                .warnings
                .iter()
                .any(|warning| warning.contains("список каналов"))
        );

        let unknown = calculate_tv_traffic_task(&tv_traffic_task_input(
            "digital-channels",
            "unknown",
            "unknown",
            "first-setup",
            "unknown",
        ))
        .unwrap();
        assert_eq!(unknown.status, "needs-check");
    }

    #[test]
    fn tv_traffic_task_picture_plan_is_reversible_and_non_numeric() {
        let plan = calculate_tv_traffic_task(&tv_traffic_task_input(
            "picture-setup",
            "game",
            "mixed",
            "lag",
            "yes",
        ))
        .unwrap();
        assert_eq!(plan.status, "reversible-baseline");
        assert!(plan.steps.iter().any(|step| step.id == "enable-game-mode"));
        assert!(plan.steps.iter().any(|step| step.id == "keep-hdr-context"));
        assert!(
            plan.warnings
                .iter()
                .any(|warning| warning.contains("Не копируйте числовые"))
        );
        let serialized = serde_json::to_string(&plan).unwrap();
        assert!(!serialized.contains("100%"));
        assert!(!serialized.contains("50%"));
    }

    #[test]
    fn tv_traffic_task_rejects_unknown_values_and_wasm_shape_is_stable() {
        let invalid = calculate_tv_traffic_task(&tv_traffic_task_input(
            "laptop-to-tv",
            "linux<script>",
            "hdmi",
            "mirror",
            "unknown",
        ))
        .unwrap_err();
        assert!(invalid.contains("Система ноутбука"));

        let response =
            tv_traffic_task_plan_json("picture-setup", "movie", "dark", "baseline", "unknown");
        let response: serde_json::Value = serde_json::from_str(&response).unwrap();
        for field in [
            "status",
            "task",
            "headline",
            "explanation",
            "steps",
            "warnings",
            "privacy",
        ] {
            assert!(response.get(field).is_some(), "missing field {field}");
        }
        assert!(response.get("error").is_none());

        let invalid =
            tv_traffic_task_plan_json("unknown-task", "movie", "dark", "baseline", "unknown");
        let invalid: serde_json::Value = serde_json::from_str(&invalid).unwrap();
        assert!(invalid.get("error").is_some());
    }
}
