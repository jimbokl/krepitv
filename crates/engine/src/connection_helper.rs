use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ConnectionPlan {
    pub status: &'static str,
    pub title: &'static str,
    pub steps: Vec<&'static str>,
    pub caution: &'static str,
    pub next_href: &'static str,
    pub next_label: &'static str,
}

pub fn plan(
    task: &str,
    first: &str,
    second: &str,
    third: &str,
) -> Result<ConnectionPlan, &'static str> {
    let mut result = ConnectionPlan {
        status: "ready",
        title: "План проверки",
        steps: vec![],
        caution: "Названия пунктов меню зависят от модели. Сверьте шаги с её инструкцией.",
        next_href: "/podbor/",
        next_label: "Перейти к подбору крепления",
    };
    match task {
        "phone-hotspot" => {
            if !["android", "iphone"].contains(&first)
                || !["yes", "no", "unknown"].contains(&second)
                || !["first", "invisible", "offline"].contains(&third)
            {
                return Err("Выберите телефон, возможности телевизора и состояние подключения.");
            }
            result.next_href = "/televizor-ne-podklyuchaetsya-k-internetu/";
            result.next_label = "Проверить подключение телевизора";
            result.caution = "Раздача расходует мобильный трафик. Проверьте условия тарифа; пароль сети не вводится на этом сайте. USB-раздача для компьютера не означает поддержку USB-интернета телевизором.";
            if second != "yes" {
                result.status = "needs_review";
                result.title = "Сначала подтвердите способ подключения ТВ";
                result.steps.push(if second == "no" {
                    "Телевизор без Wi-Fi не подключится прямо к точке доступа телефона. Проверьте, есть ли уже подключённый медиаплеер с Wi-Fi либо оборудование, в инструкции которого явно указан нужный режим сетевого моста."
                } else {
                    "Найдите точную модель ТВ и раздел «Сеть» в инструкции: нужен именно клиент Wi-Fi, а не только Wi-Fi Direct или передача изображения. Пока поддержка не подтверждена, не покупайте адаптер."
                });
            } else {
                result.title = "Подключите ТВ к защищённой точке доступа";
                result.steps.push("Отключите Wi-Fi на телефоне на время проверки и убедитесь, что сайт открывается через мобильную сеть. Если нет — сначала восстановите мобильный интернет.");
                result.steps.push(if first == "iphone" {
                    "В настройках iPhone откройте «Режим модема», включите «Разрешать другим» и оставайтесь на этом экране при первом подключении. Имя сети и пароль показаны здесь."
                } else {
                    "В настройках Android откройте раздел точки доступа Wi-Fi. Задайте пароль и включите раздачу. Название раздела зависит от производителя телефона."
                });
                result.steps.push("В сетевых настройках ТВ выберите эту сеть и введите пароль на телевизоре. Для проверки сначала запустите обычное короткое видео, а не 4K.");
                if third == "invisible" {
                    result.steps.push(if first == "iphone" {
                        "Если на iPhone есть «Максимальная совместимость», попробуйте этот режим. Он доступен не на всех моделях; затем повторите поиск сети на ТВ."
                    } else {
                        "Сверьте поддерживаемый диапазон ТВ. Если ТВ поддерживает только 2,4 ГГц, выберите этот диапазон в точке доступа, если телефон позволяет. Не отключайте пароль ради подключения."
                    });
                }
                if third == "offline" {
                    result.steps.push("Подключите к точке доступа другое устройство. Если интернета нет и на нём — проверьте тариф, лимит раздачи и мобильную сеть. Если работает — переходите к диагностике сети именно на ТВ по ссылке ниже.");
                }
            }
        }
        "offline-tv" => {
            if !["antenna", "usb", "hdmi", "online"].contains(&first)
                || !["yes", "no", "unknown"].contains(&second)
                || !["ready", "missing"].contains(&third)
            {
                return Err("Выберите источник, поддержку телевизора и наличие сигнала или файла.");
            }
            result.caution = "Помощник не гарантирует приём в конкретном доме и поддержку любого файла. Загрузка фильма в приложении телефона не означает, что файл можно перенести на ТВ.";
            if first == "online" {
                result.status = "needs_review";
                result.title = "Онлайн-сервису нужен интернет";
                result.steps.push("Приложение само по себе не заменяет подключение. Проверьте у сервиса, есть ли офлайн-режим именно на вашем устройстве; скачивание на телефоне не доказывает его наличие на ТВ.");
                result.steps.push("Если мобильная сеть доступна, можно отдельно проверить раздачу с телефона. Для полностью автономного просмотра выберите эфир, совместимый локальный файл или внешний источник HDMI.");
                result.next_href = "/kak-razdat-internet-s-telefona-na-televizor/";
                result.next_label = "Проверить раздачу с телефона";
            } else {
                result.title = "Интернет не нужен для этого источника при выполнении условий";
                let (requirement, action, href, label) = match first {
                    "antenna" => (
                        "Для эфирного цифрового ТВ проверьте поддержку DVB-T2 у телевизора или внешнего ресивера. Антенна, кабельный оператор и интернет-телевидение — разные источники.",
                        "Подключите антенну к входу для эфира, выберите источник «ТВ» и поиск эфирных цифровых каналов по инструкции. Наличие и качество каналов зависят от сигнала, антенны и места установки.",
                        "/kak-nastroit-tsifrovye-kanaly-na-televizore/",
                        "Настроить цифровые каналы",
                    ),
                    "usb" => (
                        "В инструкции ТВ найдите воспроизведение с USB, файловые системы и поддерживаемые контейнеры и кодеки. Один только разъём USB не гарантирует видеоплеер.",
                        "Подключите накопитель с собственным совместимым файлом, выберите USB или медиаплеер в источниках ТВ. Не форматируйте накопитель без резервной копии.",
                        "/televizor-ne-vidit-fleshku/",
                        "Проверить воспроизведение с USB",
                    ),
                    _ => (
                        "Нужны HDMI-вход телевизора и устройство, которое самостоятельно воспроизводит локальный контент. HDMI переносит готовое изображение, а не создаёт интернет.",
                        "Подключите источник, выберите соответствующий HDMI-вход на ТВ и запустите локальное видео на источнике. Возможность вывода защищённого контента зависит от устройства и приложения.",
                        "/kak-podklyuchit-noutbuk-k-televizoru/",
                        "Проверить подключение ноутбука",
                    ),
                };
                result.steps.push(requirement);
                if second != "yes" || third != "ready" {
                    result.status = "needs_review";
                    result.title = "Пока не хватает подтверждённых условий";
                    result.steps.push("Сначала подтвердите поддержку в инструкции и наличие сигнала, файла или готового источника. Без этого нельзя обещать просмотр и советовать покупку оборудования.");
                } else {
                    result.steps.push(action);
                }
                result.next_href = href;
                result.next_label = label;
            }
        }
        "universal-remote" => {
            if !["ir", "bluetooth", "unknown"].contains(&first)
                || !["basic", "voice"].contains(&second)
                || !["yes", "no"].contains(&third)
            {
                return Err("Выберите тип пульта, нужные функции и наличие инструкции.");
            }
            result.caution = "Не вводите коды от похожего пульта и не используйте комбинации сервисного меню. Совпадение бренда ТВ не гарантирует работу микрофона, указателя и всех кнопок.";
            result.next_href = "/ne-rabotaet-pult-ot-televizora/";
            result.next_label = "Проверить исправность пульта";
            if first == "unknown" || third == "no" {
                result.status = "needs_review";
                result.title = "Сначала найдите точную модель пульта";
                result.steps.push("Посмотрите маркировку на корпусе и в батарейном отсеке. Найдите инструкцию именно к этому артикулу у производителя пульта: в ней указаны тип связи, процедура настройки и таблица кодов.");
                result.steps.push("Слово «универсальный» на упаковке не заменяет список совместимости. Пока тип пульта и инструкция неизвестны, помощник не выдаёт код и сочетание кнопок.");
            } else if first == "ir" {
                result.title = "Настройте ИК-пульт по его собственной инструкции";
                result.steps.push("Установите исправные батарейки. В инструкции именно этого пульта найдите свой бренд ТВ и предусмотренный способ: ввод кода, поиск или обучение. Не переносите код из инструкции другого артикула.");
                result.steps.push("После настройки отдельно проверьте включение, громкость, выбор входа, стрелки и подтверждение. Если работает только питание, настройка не завершена: следуйте следующему варианту из той же инструкции.");
                if second == "voice" {
                    result.status = "needs_review";
                    result.title = "ИК-команд недостаточно для обещания голосового поиска";
                    result.steps.push("Проверка ИК-кнопок не подтверждает передачу голоса. Найдите явную поддержку голосовых функций для вашей пары ТВ и пульта; не покупайте пульт только по внешнему сходству.");
                }
            } else {
                result.status = "needs_review";
                result.title = "Подтвердите совместимость Bluetooth-пульта";
                result.steps.push("Сверьте точную модель ТВ и пульта со списком производителя. Наличие Bluetooth у обоих устройств не доказывает совместимость управления.");
                result.steps.push("Если пара подтверждена, выполняйте процедуру сопряжения из инструкции этой модели. Универсальной комбинации кнопок для всех Bluetooth-пультов нет.");
                result.next_href = "/kak-privyazat-bluetooth-pult-k-televizoru/";
                result.next_label = "Проверить условия сопряжения";
            }
        }
        _ => return crate::tv_task_helper::plan(task, first, second, third),
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_valid_combination_is_controlled_and_has_a_next_step() {
        for (task, first, second, third) in [
            (
                "phone-hotspot",
                vec!["android", "iphone"],
                vec!["yes", "no", "unknown"],
                vec!["first", "invisible", "offline"],
            ),
            (
                "offline-tv",
                vec!["antenna", "usb", "hdmi", "online"],
                vec!["yes", "no", "unknown"],
                vec!["ready", "missing"],
            ),
            (
                "universal-remote",
                vec!["ir", "bluetooth", "unknown"],
                vec!["basic", "voice"],
                vec!["yes", "no"],
            ),
        ] {
            for a in &first {
                for b in &second {
                    for c in &third {
                        let result = plan(task, a, b, c).unwrap();
                        assert!(!result.steps.is_empty());
                        assert!(result.next_href.starts_with('/'));
                        assert!(["ready", "needs_review"].contains(&result.status));
                    }
                }
            }
            assert!(plan(task, "", second[0], third[0]).is_err());
            assert!(plan(task, first[0], "anything", third[0]).is_err());
            assert!(plan(task, first[0], second[0], "anything").is_err());
        }
        assert!(plan("unknown", "", "", "").is_err());
    }

    #[test]
    fn unknown_hardware_and_online_content_never_get_a_ready_result() {
        assert_eq!(
            plan("phone-hotspot", "android", "unknown", "first")
                .unwrap()
                .status,
            "needs_review"
        );
        assert_eq!(
            plan("offline-tv", "online", "yes", "ready").unwrap().status,
            "needs_review"
        );
        assert_eq!(
            plan("universal-remote", "ir", "voice", "yes")
                .unwrap()
                .status,
            "needs_review"
        );
        assert_eq!(
            plan("universal-remote", "ir", "basic", "no")
                .unwrap()
                .status,
            "needs_review"
        );
    }
}
