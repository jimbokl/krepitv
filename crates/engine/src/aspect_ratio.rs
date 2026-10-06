use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AspectRatioView {
    pub mode: &'static str,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub bars_percent: f64,
    pub cropped_percent: f64,
    pub distorted: bool,
}

#[derive(Debug, Serialize)]
pub struct AspectRatioPlan {
    pub format: String,
    pub source_width: f64,
    pub source_height: f64,
    pub screen_width: f64,
    pub screen_height: f64,
    pub views: Vec<AspectRatioView>,
}

/// A geometric illustration on a 16:9 screen, not a device setting prescription.
pub fn aspect_ratio_plan(format: &str) -> Result<AspectRatioPlan, &'static str> {
    let ratio: f64 = match format {
        "4:3" => 4.0 / 3.0,
        "16:9" => 16.0 / 9.0,
        "2.39:1" => 2.39,
        "9:16" => 9.0 / 16.0,
        _ => return Err("Выберите один из предложенных форматов изображения"),
    };
    let (screen_width, screen_height) = (320.0, 180.0);
    let (source_width, source_height) = (180.0 * ratio, 180.0);
    let fit_scale = (screen_width / source_width).min(screen_height / source_height);
    let crop_scale = (screen_width / source_width).max(screen_height / source_height);
    let screen_area = screen_width * screen_height;
    let view = |mode: &'static str, width: f64, height: f64| AspectRatioView {
        mode,
        x: (screen_width - width) / 2.0,
        y: (screen_height - height) / 2.0,
        width,
        height,
        bars_percent: if mode == "fit" {
            (1.0 - width * height / screen_area).max(0.0) * 100.0
        } else {
            0.0
        },
        cropped_percent: if mode == "crop" {
            (1.0 - screen_area / (width * height)).max(0.0) * 100.0
        } else {
            0.0
        },
        distorted: mode == "stretch" && (ratio - screen_width / screen_height).abs() > 1e-9,
    };
    Ok(AspectRatioPlan {
        format: format.to_owned(),
        source_width,
        source_height,
        screen_width,
        screen_height,
        views: vec![
            view("fit", source_width * fit_scale, source_height * fit_scale),
            view(
                "crop",
                source_width * crop_scale,
                source_height * crop_scale,
            ),
            view("stretch", screen_width, screen_height),
        ],
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn near(actual: f64, expected: f64) {
        assert!((actual - expected).abs() < 1e-7, "{actual} != {expected}");
    }

    #[test]
    fn four_three_keeps_bars_or_crops_a_quarter() {
        let p = aspect_ratio_plan("4:3").unwrap();
        near(p.views[0].x, 40.0);
        near(p.views[0].width, 240.0);
        near(p.views[0].bars_percent, 25.0);
        near(p.views[1].cropped_percent, 25.0);
        near(p.views[1].height, 240.0);
        assert!(p.views[2].distorted);
    }

    #[test]
    fn native_format_has_no_loss_or_distortion() {
        let p = aspect_ratio_plan("16:9").unwrap();
        for view in &p.views {
            near(view.width, 320.0);
            near(view.height, 180.0);
            near(view.bars_percent, 0.0);
            near(view.cropped_percent, 0.0);
            assert!(!view.distorted);
        }
    }

    #[test]
    fn all_formats_preserve_proportions_except_stretch() {
        for format in ["4:3", "16:9", "2.39:1", "9:16"] {
            let p = aspect_ratio_plan(format).unwrap();
            for view in &p.views {
                assert!(view.width.is_finite() && view.height.is_finite());
                assert!((0.0..100.0).contains(&view.bars_percent));
                assert!((0.0..100.0).contains(&view.cropped_percent));
                near(view.x + view.width / 2.0, 160.0);
                near(view.y + view.height / 2.0, 90.0);
                if view.mode != "stretch" {
                    near(view.width / view.height, p.source_width / p.source_height);
                }
            }
        }
        assert!(aspect_ratio_plan("unknown").is_err());
        assert!(aspect_ratio_plan("").is_err());
    }
}
