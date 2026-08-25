use crate::{
    HeightPlan, Mount, MountingMapPlan, TiltAnglePlan, TurnClearancePlan, calculate_height_plan,
    calculate_mounting_map, calculate_tilt_angle_plan, calculate_turn_clearance_plan, match_mounts,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const SECTION_ORDER: [&str; 7] = [
    "compatibility",
    "screws",
    "wall-fixing",
    "placement",
    "cables",
    "tools",
    "checklist",
];

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum KitSectionStatus {
    Verified,
    NeedsCheck,
    Blocked,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Evidence {
    pub source_url: String,
    pub source_label: String,
    pub checked_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ScrewGroup {
    pub location: String,
    pub thread: String,
    pub length_mm: f64,
    pub quantity: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct InstallationKitModel {
    pub id: String,
    pub title: String,
    pub weight_kg: f64,
    pub diagonal_inches: f64,
    pub width_cm: f64,
    pub height_cm: f64,
    pub vesa_width_mm: u32,
    pub vesa_height_mm: u32,
    pub vesa_vertical_offset_cm: Option<f64>,
    #[serde(default)]
    pub vesa_horizontal_offset_cm: Option<f64>,
    #[serde(default)]
    pub screw_groups: Vec<ScrewGroup>,
    pub screw_evidence: Option<Evidence>,
    #[serde(default)]
    pub port_sides: Vec<String>,
    pub port_evidence: Option<Evidence>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum WallProfile {
    Concrete,
    SolidBrick,
    HollowBlock,
    AeratedBlock,
    DrywallWithBlocking,
    DrywallWithoutBlocking,
    Unknown,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct DrillPointMm {
    pub x_mm: f64,
    pub y_mm: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct WallPlateGeometry {
    pub width_mm: f64,
    pub height_mm: f64,
    #[serde(default)]
    pub hole_coordinates_mm: Vec<DrillPointMm>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct MountTechnicalDetails {
    pub maximum_extension_cm: Option<f64>,
    pub maximum_down_tilt_degrees: Option<f64>,
    pub maximum_up_tilt_degrees: Option<f64>,
    #[serde(default)]
    pub wall_plate_reference_offset_cm: Option<f64>,
    pub wall_plate: Option<WallPlateGeometry>,
    pub source: Evidence,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct WallFixingEvidence {
    pub system_id: String,
    pub wall_profile: WallProfile,
    pub mount_id: String,
    pub fastener_title: String,
    pub quantity: u32,
    pub anchor_diameter_mm: f64,
    pub anchor_length_mm: f64,
    pub drill_diameter_mm: f64,
    pub supported_load_kg: f64,
    pub source: Evidence,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct PlacementInput {
    pub eye_height_cm: Option<f64>,
    pub viewing_distance_cm: Option<f64>,
    pub viewing_angle_degrees: Option<f64>,
    pub furniture_height_cm: Option<f64>,
    pub furniture_clearance_cm: Option<f64>,
    pub desired_turn_degrees: Option<f64>,
    pub safety_clearance_cm: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CableInput {
    pub routing: String,
    #[serde(default)]
    pub connections: Vec<String>,
    pub spare_length_cm: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct InstallationKitInput {
    pub model: InstallationKitModel,
    pub mount: Mount,
    pub requested_mechanism: String,
    pub wall_profile: WallProfile,
    pub mount_details: Option<MountTechnicalDetails>,
    pub wall_fixing: Option<WallFixingEvidence>,
    pub placement: PlacementInput,
    pub cables: CableInput,
}

#[derive(Clone, Debug, Serialize)]
pub struct CompatibilitySection {
    pub status: KitSectionStatus,
    pub fit_status: String,
    pub required_load_kg: f64,
    pub reasons: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct ScrewSection {
    pub status: KitSectionStatus,
    pub groups: Vec<ScrewGroup>,
    pub evidence: Option<Evidence>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct ExactFastener {
    pub system_id: String,
    pub title: String,
    pub quantity: u32,
    pub anchor_diameter_mm: f64,
    pub anchor_length_mm: f64,
    pub source: Evidence,
}

#[derive(Clone, Debug, Serialize)]
pub struct WallFixingSection {
    pub status: KitSectionStatus,
    pub wall_profile: WallProfile,
    pub exact_fastener: Option<ExactFastener>,
    pub drill_diameter_mm: Option<f64>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct DrillMap {
    pub plate_width_mm: f64,
    pub plate_height_mm: f64,
    pub hole_coordinates_mm: Vec<DrillPointMm>,
    pub control_ruler_mm: u32,
    pub source: Evidence,
}

#[derive(Clone, Debug, Serialize)]
pub struct PlacementSection {
    pub status: KitSectionStatus,
    pub height: Option<HeightPlan>,
    pub mounting_map: Option<MountingMapPlan>,
    pub turn: Option<TurnClearancePlan>,
    pub tilt: Option<TiltAnglePlan>,
    pub drill_map: Option<DrillMap>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct CableSection {
    pub status: KitSectionStatus,
    pub routing: String,
    pub connections: Vec<String>,
    pub port_sides: Vec<String>,
    pub spare_length_cm: Option<f64>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct ToolsSection {
    pub status: KitSectionStatus,
    pub items: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct ChecklistSection {
    pub status: KitSectionStatus,
    pub items: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct InstallationKitPlan {
    pub schema_version: String,
    pub model_id: String,
    pub mount_id: String,
    pub overall_status: KitSectionStatus,
    pub market_eligible: bool,
    pub section_order: Vec<String>,
    pub compatibility: CompatibilitySection,
    pub screws: ScrewSection,
    pub wall_fixing: WallFixingSection,
    pub placement: PlacementSection,
    pub cables: CableSection,
    pub tools: ToolsSection,
    pub checklist: ChecklistSection,
}

fn evidence_is_valid(evidence: &Evidence) -> bool {
    evidence.source_url.starts_with("https://")
        && !evidence.source_label.trim().is_empty()
        && evidence.checked_at.len() == 10
}

fn screw_group_is_valid(group: &ScrewGroup) -> bool {
    !group.location.trim().is_empty()
        && matches!(group.thread.as_str(), "M4" | "M5" | "M6" | "M8")
        && group.length_mm.is_finite()
        && (1.0..=200.0).contains(&group.length_mm)
        && (1..=8).contains(&group.quantity)
}

fn status_from_fit(fit_status: &str) -> KitSectionStatus {
    match fit_status {
        "verified-fit" => KitSectionStatus::Verified,
        "conditional-fit" => KitSectionStatus::NeedsCheck,
        _ => KitSectionStatus::Blocked,
    }
}

fn build_screw_section(model: &InstallationKitModel) -> ScrewSection {
    let exact = !model.screw_groups.is_empty()
        && model.screw_groups.iter().all(screw_group_is_valid)
        && model.screw_evidence.as_ref().is_some_and(evidence_is_valid);

    if exact {
        ScrewSection {
            status: KitSectionStatus::Verified,
            groups: model.screw_groups.clone(),
            evidence: model.screw_evidence.clone(),
            warnings: vec![
                "Сверьте толщину планки, шайб и проставок с руководствами телевизора и кронштейна"
                    .into(),
            ],
        }
    } else {
        ScrewSection {
            status: KitSectionStatus::NeedsCheck,
            groups: Vec::new(),
            evidence: None,
            warnings: vec![
                "Точная резьба или длина не подтверждена паспортом этой модели — измерьте комплект и проверьте руководство"
                    .into(),
            ],
        }
    }
}

fn build_wall_fixing_section(
    input: &InstallationKitInput,
    required_load_kg: f64,
) -> WallFixingSection {
    if input.wall_profile == WallProfile::DrywallWithoutBlocking
        && input.mount.mechanism == "full-motion"
    {
        return WallFixingSection {
            status: KitSectionStatus::Blocked,
            wall_profile: input.wall_profile,
            exact_fastener: None,
            drill_diameter_mm: None,
            warnings: vec![
                "Поворотно-выдвижной кронштейн нельзя рекомендовать для гипсокартона без подтверждённой закладной или отдельно доказанной крепёжной системы"
                    .into(),
            ],
        };
    }

    let exact = input.wall_fixing.as_ref().filter(|fixing| {
        fixing.wall_profile == input.wall_profile
            && fixing.mount_id == input.mount.id
            && evidence_is_valid(&fixing.source)
            && !fixing.fastener_title.trim().is_empty()
            && fixing.quantity > 0
            && fixing.anchor_diameter_mm.is_finite()
            && fixing.anchor_diameter_mm > 0.0
            && fixing.anchor_length_mm.is_finite()
            && fixing.anchor_length_mm > 0.0
            && fixing.drill_diameter_mm.is_finite()
            && fixing.drill_diameter_mm > 0.0
            && fixing.supported_load_kg.is_finite()
            && fixing.supported_load_kg + f64::EPSILON >= required_load_kg
    });

    match exact {
        Some(fixing) => WallFixingSection {
            status: KitSectionStatus::Verified,
            wall_profile: input.wall_profile,
            exact_fastener: Some(ExactFastener {
                system_id: fixing.system_id.clone(),
                title: fixing.fastener_title.clone(),
                quantity: fixing.quantity,
                anchor_diameter_mm: fixing.anchor_diameter_mm,
                anchor_length_mm: fixing.anchor_length_mm,
                source: fixing.source.clone(),
            }),
            drill_diameter_mm: Some(fixing.drill_diameter_mm),
            warnings: vec![
                "Несущую способность основания и отсутствие скрытых коммуникаций всё равно проверьте на месте"
                    .into(),
            ],
        },
        None => WallFixingSection {
            status: KitSectionStatus::NeedsCheck,
            wall_profile: input.wall_profile,
            exact_fastener: None,
            drill_diameter_mm: None,
            warnings: vec![if input.wall_profile == WallProfile::Unknown {
                "Сначала определите материал стены и наличие пустот или закладной".into()
            } else {
                "Для этого сочетания стены, кронштейна и нагрузки нет полной доказательной записи — подберите крепёж по инструкции производителя системы"
                    .into()
            }],
        },
    }
}

fn validated_mount_details(input: &InstallationKitInput) -> Option<&MountTechnicalDetails> {
    input
        .mount_details
        .as_ref()
        .filter(|details| evidence_is_valid(&details.source))
}

fn valid_drill_map(details: &MountTechnicalDetails) -> Option<DrillMap> {
    let plate = details.wall_plate.as_ref()?;
    if !plate.width_mm.is_finite()
        || !plate.height_mm.is_finite()
        || plate.width_mm <= 0.0
        || plate.height_mm <= 0.0
        || plate.hole_coordinates_mm.len() < 2
        || plate.hole_coordinates_mm.iter().any(|point| {
            !point.x_mm.is_finite()
                || !point.y_mm.is_finite()
                || point.x_mm.abs() > plate.width_mm / 2.0
                || point.y_mm.abs() > plate.height_mm / 2.0
        })
    {
        return None;
    }
    Some(DrillMap {
        plate_width_mm: plate.width_mm,
        plate_height_mm: plate.height_mm,
        hole_coordinates_mm: plate.hole_coordinates_mm.clone(),
        control_ruler_mm: 100,
        source: details.source.clone(),
    })
}

fn build_placement_section(input: &InstallationKitInput) -> Result<PlacementSection, String> {
    let details = validated_mount_details(input);
    let p = &input.placement;
    let complete_height_input = match (
        p.eye_height_cm,
        p.viewing_distance_cm,
        p.viewing_angle_degrees,
        p.furniture_height_cm,
        p.furniture_clearance_cm,
    ) {
        (Some(eye), Some(distance), Some(angle), Some(furniture), Some(clearance)) => {
            Some((eye, distance, angle, furniture, clearance))
        }
        _ => None,
    };

    let height = complete_height_input.map(|(eye, distance, angle, furniture, clearance)| {
        calculate_height_plan(
            input.model.diagonal_inches,
            eye,
            distance,
            angle,
            furniture,
            clearance,
        )
    });

    let mounting_map = match (
        complete_height_input,
        input.model.vesa_vertical_offset_cm,
        details.and_then(|item| item.wall_plate_reference_offset_cm),
    ) {
        (
            Some((eye, distance, angle, furniture, clearance)),
            Some(vesa_offset),
            Some(plate_offset),
        ) => Some(calculate_mounting_map(
            input.model.diagonal_inches,
            eye,
            distance,
            angle,
            furniture,
            clearance,
            vesa_offset,
            plate_offset,
        )?),
        _ => None,
    };

    let turn = match (
        p.desired_turn_degrees,
        p.safety_clearance_cm,
        input.model.vesa_horizontal_offset_cm,
        details.and_then(|item| item.maximum_extension_cm),
    ) {
        (Some(angle), Some(clearance), Some(vesa_offset), Some(extension)) => {
            Some(calculate_turn_clearance_plan(
                input.model.width_cm,
                vesa_offset,
                angle,
                extension,
                clearance,
            )?)
        }
        _ => None,
    };

    let tilt = match (
        mounting_map.as_ref(),
        p.eye_height_cm,
        p.viewing_distance_cm,
        details.and_then(|item| item.maximum_down_tilt_degrees),
        details.and_then(|item| item.maximum_up_tilt_degrees),
    ) {
        (Some(map), Some(eye), Some(distance), Some(down), Some(up)) => {
            Some(calculate_tilt_angle_plan(
                input.model.diagonal_inches,
                map.center_height_cm,
                eye,
                distance,
                down,
                up,
            )?)
        }
        _ => None,
    };

    let drill_map = details.and_then(valid_drill_map);
    let turn_ok = turn.as_ref().is_none_or(|plan| plan.will_clear_wall);
    let tilt_ok = tilt
        .as_ref()
        .is_none_or(|plan| plan.mount_covers_required_tilt);
    let status = if !turn_ok || !tilt_ok {
        KitSectionStatus::Blocked
    } else if mounting_map.is_some() && drill_map.is_some() {
        KitSectionStatus::Verified
    } else {
        KitSectionStatus::NeedsCheck
    };
    let mut warnings = Vec::new();
    if mounting_map.is_none() {
        warnings.push(
            "Не хватает подтверждённого смещения VESA или контрольной линии настенной пластины — разметку отверстий не строим"
                .into(),
        );
    }
    if drill_map.is_none() {
        warnings.push(
            "Координаты отверстий настенной пластины не подтверждены: печатная схема будет без точек сверления"
                .into(),
        );
    }

    Ok(PlacementSection {
        status,
        height,
        mounting_map,
        turn,
        tilt,
        drill_map,
        warnings,
    })
}

fn build_cable_section(
    model: &InstallationKitModel,
    cables: &CableInput,
) -> Result<CableSection, String> {
    if !matches!(cables.routing.as_str(), "open" | "hidden" | "unknown") {
        return Err("Прокладка кабелей: выберите открытый, скрытый или неизвестный вариант".into());
    }
    if cables.connections.iter().any(|connection| {
        !matches!(
            connection.as_str(),
            "power" | "hdmi" | "ethernet" | "antenna" | "optical" | "usb"
        )
    }) {
        return Err("Подключения: обнаружен неподдерживаемый тип кабеля".into());
    }
    if let Some(spare_length_cm) = cables.spare_length_cm {
        if !spare_length_cm.is_finite() || !(0.0..=500.0).contains(&spare_length_cm) {
            return Err("Запас кабеля: допустимый диапазон от 0 до 500 см".into());
        }
    }

    let ports_verified =
        !model.port_sides.is_empty() && model.port_evidence.as_ref().is_some_and(evidence_is_valid);
    let routing_known = cables.routing != "unknown";
    let status = if ports_verified && routing_known && !cables.connections.is_empty() {
        KitSectionStatus::Verified
    } else {
        KitSectionStatus::NeedsCheck
    };
    let mut warnings = vec![
        "Оставьте сервисную петлю и проверьте траекторию кабелей во всём диапазоне поворота и наклона"
            .into(),
    ];
    if !ports_verified {
        warnings.push(
            "Расположение разъёмов точной модели не подтверждено — проверьте заднюю панель до сверления"
                .into(),
        );
    }
    if cables.routing == "hidden" {
        warnings.push(
            "Скрытую силовую проводку и проходы в стене должен оценить квалифицированный специалист"
                .into(),
        );
    }

    Ok(CableSection {
        status,
        routing: cables.routing.clone(),
        connections: cables.connections.clone(),
        port_sides: if ports_verified {
            model.port_sides.clone()
        } else {
            Vec::new()
        },
        spare_length_cm: cables.spare_length_cm,
        warnings,
    })
}

fn highest_status(statuses: &[KitSectionStatus]) -> KitSectionStatus {
    if statuses.contains(&KitSectionStatus::Blocked) {
        KitSectionStatus::Blocked
    } else if statuses.contains(&KitSectionStatus::NeedsCheck) {
        KitSectionStatus::NeedsCheck
    } else {
        KitSectionStatus::Verified
    }
}

pub fn build_installation_kit(input: &InstallationKitInput) -> Result<InstallationKitPlan, String> {
    if input.model.id.trim().is_empty() || input.mount.id.trim().is_empty() {
        return Err("Модель и кронштейн должны иметь каталоговые идентификаторы".into());
    }
    let match_result = match_mounts(
        input.model.weight_kg,
        input.model.diagonal_inches,
        input.model.vesa_width_mm,
        input.model.vesa_height_mm,
        &input.requested_mechanism,
        vec![input.mount.clone()],
    )
    .into_iter()
    .next()
    .ok_or_else(|| "Не удалось проверить выбранный кронштейн".to_string())?;

    let compatibility = CompatibilitySection {
        status: status_from_fit(&match_result.fit_status),
        fit_status: match_result.fit_status,
        required_load_kg: match_result.required_load_kg,
        reasons: match_result.reasons,
        warnings: match_result.warnings,
    };
    let screws = build_screw_section(&input.model);
    let wall_fixing = build_wall_fixing_section(input, compatibility.required_load_kg);
    let placement = build_placement_section(input)?;
    let cables = build_cable_section(&input.model, &input.cables)?;
    let tools_status = highest_status(&[screws.status, wall_fixing.status]);
    let tools = ToolsSection {
        status: tools_status,
        items: vec![
            "Рулетка и карандаш".into(),
            "Уровень".into(),
            "Детектор скрытых коммуникаций".into(),
            "Инструмент для затяжки по инструкции крепежа".into(),
            "Помощь второго человека".into(),
        ],
        warnings: if wall_fixing.exact_fastener.is_none() {
            vec!["Свёрло и монтажный инструмент определяются только после выбора доказанной крепёжной системы".into()]
        } else {
            Vec::new()
        },
    };
    let checklist_status = highest_status(&[
        compatibility.status,
        screws.status,
        wall_fixing.status,
        placement.status,
        cables.status,
        tools.status,
    ]);
    let checklist = ChecklistSection {
        status: checklist_status,
        items: vec![
            "Повторно сверить модель телевизора, VESA и массу без подставки".into(),
            "Подтвердить материал стены, несущую способность и отсутствие скрытых коммуникаций"
                .into(),
            "Проверить комплектность и длину VESA-винтов без телевизора".into(),
            "Разметить центр экрана и контрольную линию настенной пластины".into(),
            "Установить настенную часть строго по инструкции производителя".into(),
            "Закрепить направляющие на телевизоре без превышения допустимого зацепления".into(),
            "Выполнить навешивание вдвоём, проверить фиксаторы и кабельный запас".into(),
            "Проверить уровень, наклон, поворот и доступ ко всем разъёмам".into(),
        ],
    };

    Ok(InstallationKitPlan {
        schema_version: "1.0".into(),
        model_id: input.model.id.clone(),
        mount_id: input.mount.id.clone(),
        overall_status: checklist_status,
        market_eligible: compatibility.status == KitSectionStatus::Verified,
        section_order: SECTION_ORDER
            .iter()
            .map(|item| (*item).to_string())
            .collect(),
        compatibility,
        screws,
        wall_fixing,
        placement,
        cables,
        tools,
        checklist,
    })
}

#[wasm_bindgen]
pub fn build_installation_kit_json(input_json: &str) -> String {
    let input = match serde_json::from_str::<InstallationKitInput>(input_json) {
        Ok(input) => input,
        Err(_) => {
            return serde_json::json!({
                "error": "Не удалось прочитать входные данные монтажного комплекта"
            })
            .to_string();
        }
    };
    match build_installation_kit(&input) {
        Ok(plan) => serde_json::to_string(&plan).expect("installation kit is serializable"),
        Err(error) => serde_json::json!({ "error": error }).to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Mount;

    fn model_with_passport() -> InstallationKitModel {
        InstallationKitModel {
            id: "tcl-65c7k".into(),
            title: "TCL 65C7K".into(),
            weight_kg: 18.0,
            diagonal_inches: 65.0,
            width_cm: 144.4,
            height_cm: 83.2,
            vesa_width_mm: 300,
            vesa_height_mm: 300,
            vesa_vertical_offset_cm: Some(-2.0),
            vesa_horizontal_offset_cm: Some(0.0),
            screw_groups: vec![ScrewGroup {
                location: "Верхний ряд".into(),
                thread: "M6".into(),
                length_mm: 16.0,
                quantity: 2,
            }],
            screw_evidence: Some(Evidence {
                source_url: "https://www.tcl.com/ru/ru/support-tv/model/65c7k".into(),
                source_label: "Российское руководство TCL C7K".into(),
                checked_at: "2026-07-31".into(),
            }),
            port_sides: vec!["сбоку".into()],
            port_evidence: Some(Evidence {
                source_url: "https://www.tcl.com/ru/ru/support-tv/model/65c7k".into(),
                source_label: "Российское руководство TCL C7K".into(),
                checked_at: "2026-07-31".into(),
            }),
        }
    }

    fn full_motion_mount() -> Mount {
        Mount {
            id: "kromax-atlantis-65".into(),
            brand: "KROMAX".into(),
            model: "ATLANTIS-65".into(),
            title: "KROMAX ATLANTIS-65".into(),
            mechanism: "full-motion".into(),
            min_diagonal_in: 40.0,
            max_diagonal_in: 90.0,
            max_load_kg: 45.0,
            vesa: vec!["300x300".into()],
            wall_distance_min_mm: 60.0,
            wall_distance_max_mm: 500.0,
            source_url: "https://kromax.ru/produce/plasma/6168/".into(),
            source_label: "Официальные характеристики KROMAX".into(),
            checked_at: "2026-07-30".into(),
            market_url: None,
            reward_rub_snapshot: None,
        }
    }

    fn base_input() -> InstallationKitInput {
        InstallationKitInput {
            model: model_with_passport(),
            mount: full_motion_mount(),
            requested_mechanism: "full-motion".into(),
            wall_profile: WallProfile::Concrete,
            mount_details: Some(MountTechnicalDetails {
                maximum_extension_cm: Some(50.0),
                maximum_down_tilt_degrees: Some(12.0),
                maximum_up_tilt_degrees: Some(5.0),
                wall_plate_reference_offset_cm: Some(0.0),
                wall_plate: None,
                source: Evidence {
                    source_url: "https://kromax.ru/produce/plasma/6168/".into(),
                    source_label: "Официальные характеристики KROMAX".into(),
                    checked_at: "2026-07-30".into(),
                },
            }),
            wall_fixing: None,
            placement: PlacementInput {
                eye_height_cm: Some(105.0),
                viewing_distance_cm: Some(280.0),
                viewing_angle_degrees: Some(0.0),
                furniture_height_cm: Some(55.0),
                furniture_clearance_cm: Some(10.0),
                desired_turn_degrees: Some(25.0),
                safety_clearance_cm: Some(3.0),
            },
            cables: CableInput {
                routing: "open".into(),
                connections: vec!["hdmi".into(), "power".into()],
                spare_length_cm: Some(30.0),
            },
        }
    }

    #[test]
    fn verified_pair_keeps_seven_ordered_sections() {
        let plan = build_installation_kit(&base_input()).expect("valid kit");

        assert_eq!(plan.compatibility.status, KitSectionStatus::Verified);
        assert_eq!(plan.compatibility.fit_status, "verified-fit");
        assert_eq!(plan.screws.status, KitSectionStatus::Verified);
        assert_eq!(
            plan.section_order,
            [
                "compatibility",
                "screws",
                "wall-fixing",
                "placement",
                "cables",
                "tools",
                "checklist",
            ]
        );
    }

    #[test]
    fn incompatible_pair_blocks_the_plan() {
        let mut input = base_input();
        input.mount.vesa = vec!["200x200".into()];

        let plan = build_installation_kit(&input).expect("bounded incompatibility");

        assert_eq!(plan.overall_status, KitSectionStatus::Blocked);
        assert_eq!(plan.compatibility.status, KitSectionStatus::Blocked);
        assert!(!plan.market_eligible);
    }

    #[test]
    fn unknown_wall_never_returns_exact_fasteners() {
        let mut input = base_input();
        input.wall_profile = WallProfile::Unknown;

        let plan = build_installation_kit(&input).expect("unknown is a valid answer");

        assert_eq!(plan.wall_fixing.status, KitSectionStatus::NeedsCheck);
        assert!(plan.wall_fixing.exact_fastener.is_none());
        assert!(plan.wall_fixing.drill_diameter_mm.is_none());
    }

    #[test]
    fn missing_screw_passport_never_returns_a_length() {
        let mut input = base_input();
        input.model.screw_groups.clear();
        input.model.screw_evidence = None;

        let plan = build_installation_kit(&input).expect("missing passport is bounded");

        assert_eq!(plan.screws.status, KitSectionStatus::NeedsCheck);
        assert!(plan.screws.groups.is_empty());
    }

    #[test]
    fn missing_port_evidence_keeps_cable_plan_needs_check() {
        let mut input = base_input();
        input.model.port_sides.clear();
        input.model.port_evidence = None;

        let plan = build_installation_kit(&input).expect("missing ports are bounded");

        assert_eq!(plan.cables.status, KitSectionStatus::NeedsCheck);
        assert!(plan.cables.port_sides.is_empty());
    }

    #[test]
    fn full_motion_on_drywall_without_blocking_is_blocked() {
        let mut input = base_input();
        input.wall_profile = WallProfile::DrywallWithoutBlocking;

        let plan = build_installation_kit(&input).expect("unsafe scenario is a result");

        assert_eq!(plan.wall_fixing.status, KitSectionStatus::Blocked);
        assert!(plan.wall_fixing.exact_fastener.is_none());
    }

    #[test]
    fn json_contract_is_stable_and_contains_no_non_finite_values() {
        let json =
            build_installation_kit_json(&serde_json::to_string(&base_input()).expect("input json"));
        let value: serde_json::Value = serde_json::from_str(&json).expect("output json");

        assert_eq!(value["schema_version"], "1.0");
        assert_eq!(value["compatibility"]["status"], "verified");
        assert_eq!(value["wall_fixing"]["status"], "needs-check");
        assert!(value.get("error").is_none());
        assert!(!json.contains("NaN"));
        assert!(!json.contains("Infinity"));
    }
}
