use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MonitorMountInput {
    pub screens: Vec<Screen>,
    pub arms: u8,
    pub supported_vesa: Vec<String>,
    pub max_kg_per_arm: Option<f64>,
    pub gas_lift: bool,
    pub min_kg_per_arm: Option<f64>,
    pub mounting: String,
    pub desk_mm: Option<f64>,
    pub desk_min_mm: Option<f64>,
    pub desk_max_mm: Option<f64>,
    pub desk_material: String,
    pub access: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Screen {
    pub vesa: String,
    pub kg: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct MonitorMountPlan {
    pub status: &'static str,
    pub checks: Vec<Check>,
    pub screen_count: usize,
}

#[derive(Debug, Serialize)]
pub struct Check {
    pub id: String,
    pub state: &'static str,
    pub text: String,
}

fn number(value: Option<f64>, maximum: f64) -> bool {
    value.is_none_or(|v| v.is_finite() && v > 0.0 && v <= maximum)
}

pub fn monitor_mount_plan(input: MonitorMountInput) -> Result<MonitorMountPlan, &'static str> {
    if !(1..=2).contains(&input.screens.len())
        || !(1..=2).contains(&input.arms)
        || !["clamp", "grommet", "wall"].contains(&input.mounting.as_str())
        || !["solid", "glass", "hollow", "unknown"].contains(&input.desk_material.as_str())
        || !["yes", "no", "unknown"].contains(&input.access.as_str())
        || input.supported_vesa.len() > 2
        || input
            .supported_vesa
            .iter()
            .any(|v| !["75", "100"].contains(&v.as_str()))
        || !number(input.max_kg_per_arm, 200.0)
        || !number(input.min_kg_per_arm, 200.0)
        || ![input.desk_mm, input.desk_min_mm, input.desk_max_mm]
            .into_iter()
            .all(|v| number(v, 500.0))
        || input.screens.iter().any(|s| {
            !number(s.kg, 200.0)
                || !["75", "100", "none", "other", "unknown"].contains(&s.vesa.as_str())
        })
        || matches!((input.min_kg_per_arm, input.max_kg_per_arm), (Some(min), Some(max)) if min > max)
        || matches!((input.desk_min_mm, input.desk_max_mm), (Some(min), Some(max)) if min > max)
    {
        return Err(
            "Проверьте значения: нужны положительные числа и непротиворечивые диапазоны из инструкции.",
        );
    }
    let mut checks = Vec::new();
    let mut add = |id: String, state, text: String| checks.push(Check { id, state, text });
    add(
        "arms".into(),
        if input.screens.len() <= usize::from(input.arms) {
            "pass"
        } else {
            "fail"
        },
        if input.screens.len() <= usize::from(input.arms) {
            "Числа крепёжных площадок хватает для выбранных экранов."
        } else {
            "Для двух мониторов нужна отдельная площадка для каждого. Одной недостаточно."
        }
        .into(),
    );
    for (index, screen) in input.screens.iter().enumerate() {
        let prefix = format!("Экран {}", index + 1);
        let (state, message) = match screen.vesa.as_str() {
            "none" => (
                "unknown",
                "нет VESA. Нужен адаптер, подтверждённый для точной модели; зажимной универсальный держатель не считается проверенной заменой.",
            ),
            "unknown" | "other" => (
                "unknown",
                "размер VESA не проверен этим инструментом. Сверьте обе стороны и геометрию площадки по двум инструкциям.",
            ),
            _ if input.supported_vesa.is_empty() => {
                ("unknown", "поддержка VESA у кронштейна не указана.")
            }
            _ if input.supported_vesa.contains(&screen.vesa) => {
                ("pass", "размер VESA есть в выбранном списке кронштейна.")
            }
            _ => (
                "fail",
                "размера VESA нет в выбранном списке кронштейна. Прямое соединение не подтверждено.",
            ),
        };
        add(
            format!("vesa_{index}"),
            state,
            format!("{prefix}: {message}"),
        );
        let (state, message) = match (screen.kg, input.max_kg_per_arm, input.min_kg_per_arm) {
            (Some(kg), Some(max), _) if kg > max => (
                "fail",
                "масса выше максимума на одно плечо. Выберите другое крепление.",
            ),
            (Some(kg), _, Some(min)) if input.gas_lift && kg < min => (
                "fail",
                "масса ниже минимума газлифта. Экран может не удерживаться в нужной высоте.",
            ),
            (None, _, _) => (
                "unknown",
                "нужна масса без подставки из паспорта, а не масса коробки.",
            ),
            (_, None, _) => (
                "unknown",
                "нужна максимальная нагрузка на одно плечо, не суммарная нагрузка держателя.",
            ),
            (_, _, None) if input.gas_lift => (
                "unknown",
                "нужна нижняя граница нагрузки газлифта. Одного максимума недостаточно.",
            ),
            _ => (
                "pass",
                "масса укладывается в указанный диапазон на одно плечо. Адаптер и аксессуары добавляют нагрузку и здесь не учтены.",
            ),
        };
        add(
            format!("weight_{index}"),
            state,
            format!("{prefix}: {message}"),
        );
    }
    if input.mounting != "wall" {
        let (state, message) = match (input.desk_mm, input.desk_min_mm, input.desk_max_mm) {
            (Some(value), Some(min), Some(max)) if value >= min && value <= max => (
                "pass",
                "Толщина столешницы входит в указанный диапазон основания. Это не расчёт прочности стола.",
            ),
            (Some(_), Some(_), Some(_)) => (
                "fail",
                "Толщина столешницы вне диапазона основания. Не затягивайте неподходящую струбцину силой.",
            ),
            _ => (
                "unknown",
                "Нужны толщина столешницы и обе границы крепления именно для выбранного способа монтажа.",
            ),
        };
        add("desk_thickness".into(), state, message.into());
        add("desk_material".into(), "unknown", match input.desk_material.as_str() {
            "glass" | "hollow" => "Стеклянное или пустотелое основание нельзя подтвердить этим расчётом. Нужно разрешение производителя стола и крепления; подкладка сама по себе не доказывает безопасность.",
            "solid" => "Материал указан, но прочность стола под массой кронштейна и экранов не проверена. Подтвердите допустимый монтаж у производителя стола.",
            _ => "Проверьте материал и допустимую нагрузку стола. Толщина сама по себе не подтверждает прочность.",
        }.into());
        add("access".into(), match input.access.as_str() { "yes" => "pass", "no" => "fail", _ => "unknown" }, match input.access.as_str() {
            "yes" => "Вы подтвердили место для основания и прижима. Для монтажа через отверстие отдельно сверьте его диаметр и положение.",
            "no" => "Основанию мешает рама, край или другое препятствие. Выберите другую точку либо допустимый способ установки.",
            _ => "Проверьте место под столом для прижима и за столом для движения плеча. Для сквозного монтажа нужен подходящий диаметр отверстия.",
        }.into());
    } else {
        add("wall".into(), "unknown", "Настольное основание не превращается в настенное. Нужен кронштейн с разрешённым настенным монтажом и крепёж под материал стены; расчёт анкеров здесь не выполняется.".into());
    }
    let status = if checks.iter().any(|c| c.state == "fail") {
        "mismatch"
    } else if checks
        .iter()
        .any(|c| c.state == "unknown" && c.id.starts_with("weight_"))
        || checks
            .iter()
            .any(|c| c.state == "unknown" && c.id.starts_with("vesa_"))
        || checks
            .iter()
            .any(|c| c.state == "unknown" && ["desk_thickness", "access"].contains(&c.id.as_str()))
        || ["glass", "hollow", "unknown"].contains(&input.desk_material.as_str())
            && input.mounting != "wall"
    {
        "needs_data"
    } else {
        "parameters_match"
    };
    Ok(MonitorMountPlan {
        status,
        checks,
        screen_count: input.screens.len(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn input() -> MonitorMountInput {
        serde_json::from_str(r#"{"screens":[{"vesa":"100","kg":5}],"arms":1,"supported_vesa":["75","100"],"max_kg_per_arm":9,"gas_lift":true,"min_kg_per_arm":2,"mounting":"clamp","desk_mm":25,"desk_min_mm":10,"desk_max_mm":50,"desk_material":"solid","access":"yes"}"#).unwrap()
    }
    #[test]
    fn parameters_are_not_installation_approval() {
        let result = monitor_mount_plan(input()).unwrap();
        assert_eq!(result.status, "parameters_match");
        assert!(
            result
                .checks
                .iter()
                .any(|c| c.id == "desk_material" && c.state == "unknown")
        );
    }
    #[test]
    fn boundaries_are_inclusive() {
        for weight in [2.0, 9.0] {
            let mut value = input();
            value.screens[0].kg = Some(weight);
            value.desk_mm = value.desk_min_mm;
            assert_eq!(
                monitor_mount_plan(value).unwrap().status,
                "parameters_match"
            );
        }
    }
    #[test]
    fn gas_lift_minimum_cannot_be_assumed() {
        let mut value = input();
        value.min_kg_per_arm = None;
        assert_eq!(monitor_mount_plan(value).unwrap().status, "needs_data");
        let mut value = input();
        value.screens[0].kg = Some(1.9);
        assert_eq!(monitor_mount_plan(value).unwrap().status, "mismatch");
    }
    #[test]
    fn tests_each_screen_not_total_average() {
        let mut value = input();
        value.arms = 2;
        value.screens.push(Screen {
            vesa: "100".into(),
            kg: Some(10.0),
        });
        assert_eq!(monitor_mount_plan(value).unwrap().status, "mismatch");
    }
    #[test]
    fn rejects_insufficient_arms_and_wrong_vesa() {
        let mut value = input();
        value.screens.push(Screen {
            vesa: "75".into(),
            kg: Some(5.0),
        });
        assert_eq!(monitor_mount_plan(value).unwrap().status, "mismatch");
        let mut value = input();
        value.supported_vesa = vec!["75".into()];
        assert_eq!(monitor_mount_plan(value).unwrap().status, "mismatch");
    }
    #[test]
    fn no_vesa_or_fragile_desk_never_match() {
        for vesa in ["none", "other", "unknown"] {
            let mut value = input();
            value.screens[0].vesa = vesa.into();
            assert_eq!(monitor_mount_plan(value).unwrap().status, "needs_data");
        }
        for material in ["glass", "hollow", "unknown"] {
            let mut value = input();
            value.desk_material = material.into();
            assert_eq!(monitor_mount_plan(value).unwrap().status, "needs_data");
        }
    }
    #[test]
    fn checks_thickness_access_and_wall_separately() {
        let mut value = input();
        value.desk_mm = Some(51.0);
        assert_eq!(monitor_mount_plan(value).unwrap().status, "mismatch");
        let mut value = input();
        value.access = "no".into();
        assert_eq!(monitor_mount_plan(value).unwrap().status, "mismatch");
        let mut value = input();
        value.mounting = "wall".into();
        value.desk_material = "unknown".into();
        assert!(
            !monitor_mount_plan(value)
                .unwrap()
                .checks
                .iter()
                .any(|c| c.id == "desk_thickness")
        );
    }
    #[test]
    fn rejects_invalid_numbers_and_reversed_ranges() {
        let mut value = input();
        value.screens[0].kg = Some(f64::NAN);
        assert!(monitor_mount_plan(value).is_err());
        let mut value = input();
        value.min_kg_per_arm = Some(10.0);
        assert!(monitor_mount_plan(value).is_err());
        let mut value = input();
        value.desk_min_mm = Some(60.0);
        assert!(monitor_mount_plan(value).is_err());
        assert!(serde_json::from_str::<MonitorMountInput>(r#"{"extra":true}"#).is_err());
    }
}
