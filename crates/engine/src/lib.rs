use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const LOAD_SAFETY_FACTOR: f64 = 1.25;
const MIN_TV_DIAGONAL_INCHES: f64 = 19.0;
const MAX_TV_DIAGONAL_INCHES: f64 = 150.0;
const MIN_VIEWING_DISTANCE_CM: f64 = 30.0;
const MAX_VIEWING_DISTANCE_CM: f64 = 1_000.0;
const MIN_HORIZONTAL_ANGLE_DEG: f64 = 20.0;
const MAX_HORIZONTAL_ANGLE_DEG: f64 = 60.0;

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
pub struct ViewingGeometry {
    pub diagonal_inches: f64,
    pub screen_width_cm: f64,
    pub screen_height_cm: f64,
    pub viewing_distance_cm: f64,
    pub horizontal_angle_deg: f64,
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
}
