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

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Mount {
    pub id: String,
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
    pub market_url: Option<String>,
    #[serde(default)]
    pub reward_rub_snapshot: Option<f64>,
}

#[derive(Clone, Debug, Serialize)]
pub struct MountMatch {
    pub mount: Mount,
    pub compatible: bool,
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

            if diagonal_inches < mount.min_diagonal_in
                || diagonal_inches > mount.max_diagonal_in
            {
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

#[cfg(test)]
mod tests {
    use super::*;

    fn test_mount() -> Mount {
        Mount {
            id: "mount".into(),
            title: "Test mount".into(),
            mechanism: "full-motion".into(),
            min_diagonal_in: 37.0,
            max_diagonal_in: 80.0,
            max_load_kg: 40.0,
            vesa: vec!["200x200".into(), "300x200".into()],
            wall_distance_min_mm: 67.0,
            wall_distance_max_mm: 355.0,
            source_url: "https://example.com".into(),
            market_url: None,
            reward_rub_snapshot: None,
        }
    }

    #[test]
    fn accepts_exact_vesa_with_load_reserve() {
        let result = match_mounts(15.3, 55.0, 200, 200, "full-motion", vec![test_mount()]);
        assert!(result[0].compatible);
        assert_eq!(result[0].required_load_kg, 19.1);
    }

    #[test]
    fn rejects_wrong_vesa() {
        let result = match_mounts(15.3, 55.0, 400, 400, "full-motion", vec![test_mount()]);
        assert!(!result[0].compatible);
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
}
