use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const LOAD_SAFETY_FACTOR: f64 = 1.25;

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

fn rounded(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
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
    let diagonal_cm = diagonal_inches * 2.54;
    let ratio = (16.0_f64.powi(2) + 9.0_f64.powi(2)).sqrt();
    let width = diagonal_cm * 16.0 / ratio;
    let height = diagonal_cm * 9.0 / ratio;
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
}
