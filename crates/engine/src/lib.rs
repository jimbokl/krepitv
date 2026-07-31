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
}
