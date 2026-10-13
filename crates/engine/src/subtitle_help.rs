use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SubtitleHelpInput {
    appearance: String,
    source: String,
    observation: String,
    goal: String,
}

#[derive(Debug, Serialize, PartialEq)]
pub struct SubtitleHelpPlan {
    pub route: &'static str,
    pub goal: String,
}

pub fn subtitle_help_plan(input: SubtitleHelpInput) -> Result<SubtitleHelpPlan, &'static str> {
    if !["dialogue", "teletext", "notice", "unknown"].contains(&input.appearance.as_str())
        || !["disable", "enable"].contains(&input.goal.as_str())
    {
        return Err("Выберите вид текста и нужное действие.");
    }
    if input.observation == "no_text" && input.goal != "enable" {
        return Err("Проверка отсутствующего текста относится к включению субтитров.");
    }
    let route = match (input.source.as_str(), input.observation.as_str()) {
        ("broadcast", "teletext") => "teletext",
        ("broadcast", "captions" | "no_text") => "broadcast",
        ("broadcast", "announcement") => "notice",
        ("youtube", "cc_available" | "no_text") => "youtube",
        ("youtube", "no_cc") | ("usb", "no_track") => "video_check",
        ("usb", "selectable" | "no_text") => "usb_track",
        ("usb", "sidecar") => "usb_file",
        ("app", "player" | "no_text") => "app",
        ("hdmi", "only_hdmi" | "no_text") => "external",
        ("unknown", "home_menu") => "tv_possible",
        ("broadcast" | "youtube" | "usb" | "app" | "hdmi" | "unknown", "unclear")
        | ("youtube" | "app", "outside")
        | ("hdmi", "also_elsewhere")
        | ("unknown", "content_only" | "no_text") => "unknown",
        _ => return Err("Проверка не соответствует выбранному источнику. Выберите ответ заново."),
    };
    Ok(SubtitleHelpPlan {
        route,
        goal: input.goal,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn plan(
        source: &str,
        observation: &str,
        appearance: &str,
        goal: &str,
    ) -> Result<SubtitleHelpPlan, &'static str> {
        subtitle_help_plan(SubtitleHelpInput {
            source: source.into(),
            observation: observation.into(),
            appearance: appearance.into(),
            goal: goal.into(),
        })
    }

    #[test]
    fn distinguishes_notice_teletext_and_dialogue() {
        assert_eq!(
            plan("broadcast", "captions", "dialogue", "disable")
                .unwrap()
                .route,
            "broadcast"
        );
        assert_eq!(
            plan("broadcast", "captions", "notice", "disable")
                .unwrap()
                .route,
            "broadcast"
        );
        assert_eq!(
            plan("broadcast", "announcement", "notice", "disable")
                .unwrap()
                .route,
            "notice"
        );
        assert_eq!(
            plan("broadcast", "teletext", "notice", "disable")
                .unwrap()
                .route,
            "teletext"
        );
    }

    #[test]
    fn each_source_has_its_own_route() {
        for (source, observation, route) in [
            ("youtube", "cc_available", "youtube"),
            ("youtube", "no_cc", "video_check"),
            ("usb", "selectable", "usb_track"),
            ("usb", "sidecar", "usb_file"),
            ("usb", "no_track", "video_check"),
            ("app", "player", "app"),
            ("hdmi", "only_hdmi", "external"),
            ("unknown", "home_menu", "tv_possible"),
        ] {
            for goal in ["disable", "enable"] {
                assert_eq!(
                    plan(source, observation, "dialogue", goal).unwrap().route,
                    route
                );
            }
        }
    }

    #[test]
    fn incomplete_and_mismatched_answers_fail_closed() {
        assert!(plan("usb", "cc_available", "dialogue", "disable").is_err());
        assert!(plan("app", "player", "invalid", "disable").is_err());
        assert!(plan("app", "player", "dialogue", "delete").is_err());
        assert!(serde_json::from_str::<SubtitleHelpInput>(r#"{"source":"app","observation":"player","appearance":"dialogue","goal":"disable","email":"private"}"#).is_err());
        assert!(serde_json::from_str::<SubtitleHelpInput>("{}").is_err());
    }

    #[test]
    fn uncertain_observation_does_not_claim_a_cause() {
        for source in ["broadcast", "youtube", "usb", "app", "hdmi", "unknown"] {
            assert_eq!(
                plan(source, "unclear", "unknown", "disable").unwrap().route,
                "unknown"
            );
        }
        assert_eq!(
            plan("hdmi", "also_elsewhere", "dialogue", "disable")
                .unwrap()
                .route,
            "unknown"
        );
    }

    #[test]
    fn enabling_does_not_require_existing_visible_captions() {
        for (source, route) in [
            ("broadcast", "broadcast"),
            ("youtube", "youtube"),
            ("usb", "usb_track"),
            ("app", "app"),
            ("hdmi", "external"),
            ("unknown", "unknown"),
        ] {
            assert_eq!(
                plan(source, "no_text", "unknown", "enable").unwrap().route,
                route
            );
            assert!(plan(source, "no_text", "unknown", "disable").is_err());
        }
    }
}
