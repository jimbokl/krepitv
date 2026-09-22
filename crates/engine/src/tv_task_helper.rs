use crate::connection_helper::ConnectionPlan;

fn allowed(value: &str, values: &[&str]) -> bool {
    values.contains(&value)
}

fn base(
    title: &'static str,
    caution: &'static str,
    href: &'static str,
    label: &'static str,
) -> ConnectionPlan {
    ConnectionPlan {
        status: "ready",
        title,
        steps: Vec::new(),
        caution,
        next_href: href,
        next_label: label,
    }
}

pub fn plan(
    task: &str,
    first: &str,
    second: &str,
    third: &str,
) -> Result<ConnectionPlan, &'static str> {
    let result = match task {
        "usb-video-codec" => {
            if !allowed(first, &["not_open", "no_video", "no_sound"])
                || !allowed(second, &["yes", "no", "unknown"])
                || !allowed(third, &["works", "fails", "unknown"])
            {
                return Err("Выберите симптом, наличие инструкции и результат контрольного файла.");
            }
            let mut p = base(
                "Отделите проблему файла от проблемы USB",
                "Расширение файла не доказывает его внутренний видео- и аудиокодек. Не форматируйте накопитель без копии данных.",
                "/televizor-ne-vidit-fleshku/",
                "Проверить сам накопитель",
            );
            p.steps.push("Проверьте, виден ли накопитель и открывается ли на ТВ короткий контрольный файл, который раньше воспроизводился.");
            if second != "yes" {
                p.status = "needs_review";
                p.title = "Сначала найдите таблицу форматов точной модели";
                p.steps.push("В инструкции или поддержке производителя найдите контейнер, видеокодек, аудиокодек и ограничения разрешения именно для модели ТВ.");
            } else if third == "works" {
                p.steps.push(match first { "no_sound" => "Контейнер читается: сравните аудиокодек проблемного файла с таблицей модели. Не меняйте всю файловую систему накопителя.", "no_video" => "Звук или запуск есть: сравните видеокодек и профиль. Одинаковое расширение у двух файлов не гарантирует одинаковое кодирование.", _ => "Контрольный файл работает: проблема локализована в формате или кодировании исходного файла, а не в USB-порту." });
            } else {
                p.status = "needs_review";
                p.steps.push("Если не работает и контрольный файл, проверьте файловую систему, питание накопителя и другой USB-порт по инструкции модели.");
            }
            p
        }
        "tv-dlna" => {
            if !allowed(first, &["windows", "mac", "nas"])
                || !allowed(second, &["yes", "no", "unknown"])
                || !allowed(third, &["visible", "no_server", "no_files"])
            {
                return Err("Выберите сервер, поддержку DLNA и текущий результат.");
            }
            let mut p = base(
                "Проверьте локальную медиатеку по одному звену",
                "DLNA передаёт медиафайлы по домашней сети, но не дублирует весь экран. Поддержка форматов всё равно зависит от телевизора.",
                "/kak-vyvesti-ekran-noutbuka-na-televizor/",
                "Выбрать другой способ вывода",
            );
            if second != "yes" {
                p.status = "needs_review";
                p.title = "Поддержка DLNA пока не подтверждена";
                p.steps.push("Найдите в инструкции точной модели DLNA, домашний сервер или сетевой медиаплеер. Наличие Wi-Fi само по себе недостаточно.");
            } else {
                p.steps.push("Подключите ТВ и сервер к одной домашней сети без гостевой изоляции. На сервере откройте доступ только к тестовой папке с одним совместимым файлом.");
                p.steps.push(match third { "no_server" => "Если сервер не виден, проверьте разрешение сетевого обнаружения и медиасервера, затем перезапустите оба устройства и маршрутизатор.", "no_files" => "Если сервер виден, но папка пуста, проверьте опубликованную папку, права и формат контрольного файла.", _ => "Если файл виден и запускается, добавляйте медиатеку частями: так проще найти неподдерживаемый формат или закрытую папку." });
            }
            p
        }
        "tv-usb-recording" => {
            if !allowed(first, &["antenna", "cable", "hdmi"])
                || !allowed(second, &["yes", "no", "unknown"])
                || !allowed(third, &["first", "fails", "playback"])
            {
                return Err("Выберите источник, поддержку записи и этап проверки.");
            }
            let mut p = base(
                "Проверьте запись без риска для данных",
                "Телевизор может отформатировать накопитель и удалить данные; записи нередко привязаны к исходному ТВ. Защищённые передачи могут не записываться.",
                "/kak-nastroit-tsifrovye-kanaly-na-televizore/",
                "Проверить источник каналов",
            );
            if first == "hdmi" || second != "yes" {
                p.status = "needs_review";
                p.title = if first == "hdmi" {
                    "Запись внешнего HDMI-источника не подтверждена"
                } else {
                    "Сначала подтвердите USB-запись у точной модели"
                };
                p.steps.push("Найдите в инструкции раздел USB HDD recording/PVR и допустимые источники. Разъём USB и кнопка записи на пульте не доказывают эту функцию.");
            } else {
                p.steps.push("Скопируйте данные с отдельного накопителя и подключите его к порту, который инструкция назначает для записи. Выполните инициализацию только после предупреждения ТВ.");
                p.steps.push(match third { "fails" => "Если запись не начинается, проверьте ограничения канала, распознавание накопителя, свободное место и региональную доступность функции.", "playback" => "Проверяйте запись на том же телевизоре. Не рассчитывайте, что файл откроется на компьютере или другом ТВ.", _ => "Сделайте минутную пробную запись открытого канала, остановите её и сразу проверьте воспроизведение на этом ТВ." });
            }
            p
        }
        "tv-channel-order" => {
            if !allowed(first, &["antenna", "cable", "satellite"])
                || !allowed(second, &["yes", "no", "unknown"])
                || !allowed(third, &["reorder", "lost", "favorites"])
            {
                return Err("Выберите источник каналов, возможность сортировки и задачу.");
            }
            let mut p = base(
                "Меняйте список без повторного поиска",
                "У некоторых операторов порядок задаётся вещателем и ручное перемещение недоступно. Новый автопоиск может перезаписать список.",
                "/kak-nastroit-tsifrovye-kanaly-na-televizore/",
                "Проверить настройку каналов",
            );
            if second != "yes" {
                p.status = "needs_review";
                p.title = "Ручная сортировка не подтверждена";
                p.steps.push("Проверьте инструкцию модели и ограничения оператора. Если перемещение недоступно, безопасной заменой может быть список избранного.");
            } else {
                p.steps.push("Перед изменением сфотографируйте текущий список. Откройте редактирование каналов, а не автоматическую настройку.");
                p.steps.push(match third { "lost" => "Не запускайте новый поиск первым шагом. Проверьте фильтр источника, избранное и скрытые каналы; затем восстановите только отсутствующие позиции по инструкции.", "favorites" => "Создайте короткий список избранного и проверьте переключение по нему, не меняя нумерацию основного списка.", _ => "Перемещайте по одному каналу и сразу проверяйте сохранение после выхода из меню." });
            }
            p
        }
        "tv-hdmi-cec" => {
            if !allowed(first, &["power", "volume", "input"])
                || !allowed(second, &["yes", "no", "unknown"])
                || !allowed(third, &["first", "partial", "none"])
            {
                return Err("Выберите нужную команду, поддержку CEC и текущее состояние.");
            }
            let mut p = base(
                "Настройте CEC как отдельный канал управления",
                "CEC, ARC/eARC и универсальный ИК-пульт — разные функции. Название CEC зависит от бренда, а набор команд — от пары устройств.",
                "/kak-nastroit-universalnyy-pult-dlya-televizora/",
                "Сравнить с универсальным пультом",
            );
            if second != "yes" {
                p.status = "needs_review";
                p.title = "CEC на обоих устройствах не подтверждён";
                p.steps.push("Сверьте инструкции ТВ и подключённого устройства: нужен HDMI-CEC на обоих. Наличие HDMI или ARC само по себе недостаточно.");
            } else {
                p.steps.push("Включите CEC на обоих устройствах, соедините их напрямую и полностью обесточьте на минуту, чтобы повторить согласование.");
                p.steps.push(match third { "partial" => "Если часть команд работает, проверьте, поддерживает ли второе устройство именно включение, громкость или выбор входа. CEC не гарантирует все команды.", "none" => "Проверьте другой заведомо исправный HDMI-кабель и другой CEC-совместимый порт, затем снова включите устройства в порядке из инструкции.", _ => "Проверьте одну выбранную команду, затем остальные по отдельности. Так видно, какая функция реально поддерживается." });
            }
            p
        }
        "tv-airplay-failure" => {
            if !allowed(first, &["iphone", "mac"])
                || !allowed(second, &["yes", "no", "unknown"])
                || !allowed(third, &["invisible", "no_video", "no_sound"])
            {
                return Err("Выберите устройство, поддержку AirPlay и симптом.");
            }
            let mut p = base(
                "Проверьте AirPlay от обнаружения к контенту",
                "Совместимость AirPlay и доступность отдельных приложений зависят от модели, региона и защиты контента. Пароль здесь не вводится.",
                "/kak-podklyuchit-telefon-k-televizoru/",
                "Выбрать другой способ подключения",
            );
            if second != "yes" {
                p.status = "needs_review";
                p.title = "AirPlay у телевизора не подтверждён";
                p.steps.push("Найдите точную модель в инструкции или списке совместимых устройств. Smart TV и Wi-Fi не означают автоматическую поддержку AirPlay.");
            } else {
                p.steps.push("Обновите устройства, включите AirPlay на ТВ и подключите отправитель и телевизор к одной обычной Wi-Fi-сети. Перезапустите оба устройства.");
                p.steps.push(match third { "invisible" => "Проверьте гостевую изоляцию сети и ограничения AirPlay в приложении «Дом». Для теста держите устройства рядом с роутером.", "no_sound" => "Проверьте громкость и отключение звука отдельно на отправителе, ТВ и ресивере. Затем попробуйте короткое локальное видео.", _ => "Сначала передайте локальное фото или короткое видео. Если оно работает, а конкретный сервис нет, проверьте его ограничения трансляции." });
            }
            p
        }
        "tv-transport" => {
            if !allowed(first, &["original", "tv_box", "none"])
                || !allowed(second, &["upright", "flat", "unknown"])
                || !allowed(third, &["enough", "alone"])
            {
                return Err("Выберите упаковку, положение и число помощников.");
            }
            let mut p = base(
                "Подготовьте перевозку без давления на экран",
                "Помощник не рассчитывает крепление груза в конкретном автомобиле. Инструкция и упаковка точной модели имеют приоритет.",
                "/kak-snyat-televizor-s-kronshteyna/",
                "Сначала безопасно снять телевизор",
            );
            if first != "original" || second != "upright" || third != "enough" {
                p.status = "needs_review";
                p.title = "Условия перевозки пока неполные";
            }
            p.steps.push("Снимите подставку или настенное крепление по инструкции, сфотографируйте соединения и уберите винты в подписанный пакет.");
            p.steps.push(if first == "original" { "Используйте штатные вкладыши и коробку, не прижимая упаковку к матрице." } else { "Подберите жёсткую коробку и профильные мягкие вкладыши по габаритам модели; плёнка сама по себе не защищает панель от изгиба." });
            p.steps.push(if second == "upright" && third == "enough" { "Переносите вдвоём или числом людей из инструкции, держась за рамку, и фиксируйте телевизор вертикально от смещения." } else { "Не кладите телевизор плашмя и не поднимайте большой экран в одиночку. Измените транспорт или привлеките помощника до погрузки." });
            p
        }
        "tv-cam-module" => {
            if !allowed(first, &["cable", "satellite", "antenna"])
                || !allowed(second, &["yes", "no", "unknown"])
                || !allowed(third, &["not_detected", "encoded", "no_signal"])
            {
                return Err("Выберите источник, наличие CI-слота и симптом.");
            }
            let mut p = base(
                "Разделите сигнал, модуль и права просмотра",
                "CAM не создаёт телевизионный сигнал: нужны совместимый тюнер, CI/CI+ интерфейс, модуль и активная карта оператора.",
                "/kak-nastroit-tsifrovye-kanaly-na-televizore/",
                "Проверить приём каналов",
            );
            if first == "antenna" || second != "yes" {
                p.status = "needs_review";
                p.title = "Условия CAM не подтверждены";
                p.steps.push("Сверьте тип вещания, тюнер и CI/CI+ интерфейс точной модели с требованиями оператора. Для обычного открытого эфира CAM обычно не является первым звеном диагностики.");
            } else {
                p.steps.push("Выключите ТВ, установите адаптер, CAM и карту строго по схеме производителя, затем включите и проверьте, определяется ли модуль в меню CI.");
                p.steps.push(match third { "not_detected" => "Если модуль не определяется, не прикладывайте силу: проверьте ориентацию, адаптер и совместимость у производителя ТВ и оператора.", "encoded" => "Если модуль виден, но канал закодирован, проверьте активацию карты, подписку и привязку у оператора.", _ => "Если нет сигнала, сначала диагностируйте кабель, антенну/тарелку, выбранный источник и настройку каналов — CAM не исправит отсутствие сигнала." });
            }
            p
        }
        "tv-pin-reset" => {
            if !allowed(first, &["tv", "app", "operator"])
                || !allowed(second, &["known", "unknown"])
                || !allowed(third, &["keep", "reset_ok"])
            {
                return Err("Выберите владельца PIN, наличие модели и допустимость сброса.");
            }
            let mut p = base(
                "Восстановите PIN у правильного владельца",
                "Не вводите PIN на этом сайте и не используйте комбинации сервисного меню. Несколько неверных попыток могут вызвать временную блокировку.",
                "/kak-sbrosit-televizor-do-zavodskih-nastroek/",
                "Проверить последствия полного сброса",
            );
            p.status = "needs_review";
            if second == "unknown" {
                p.title = "Сначала определите точную модель и владельца запроса";
                p.steps.push("Найдите модель на шильдике или в обычном информационном меню. Экран приложения или оператора может запрашивать не PIN телевизора.");
            } else {
                p.title = "Используйте только официальную процедуру точной модели";
            }
            p.steps.push(match first { "app" => "Если PIN показывает приложение, используйте восстановление аккаунта этого сервиса; сброс телевизора не меняет пароль приложения.", "operator" => "Если PIN относится к приставке или оператору, обратитесь к инструкции и поддержке оператора; настройки ТВ здесь вторичны.", _ => "Откройте официальную инструкцию производителя для точной модели и года. Используйте штатный сброс PIN только при физическом доступе к своему телевизору." });
            p.steps.push(if third == "keep" { "Если важно сохранить каналы, приложения и входы, не выполняйте заводской сброс. Сначала уточните отдельную процедуру восстановления PIN." } else { "Перед полным сбросом зафиксируйте сеть, каналы и входы и убедитесь, что знаете данные собственных аккаунтов. Полный сброс — последний шаг." });
            p
        }
        "tv-arc-no-sound" => {
            if !allowed(first, &["both_arc", "one_arc", "unknown"])
                || !allowed(second, &["on", "off", "unknown"])
                || !allowed(third, &["silent", "intermittent", "tv_speakers"])
            {
                return Err("Выберите порты, состояние CEC и симптом.");
            }
            let mut p = base(
                "Проверьте обратный аудиоканал по цепочке",
                "ARC/eARC работает только через соответствующие порты. Форматы звука и CEC зависят от пары устройств; сброс саундбара не является первым шагом.",
                "/kak-podklyuchit-saundbar-k-televizoru/",
                "Проверить схему подключения саундбара",
            );
            if first != "both_arc" || second != "on" {
                p.status = "needs_review";
                p.title = "Сначала подтвердите порты ARC и HDMI-CEC";
                p.steps.push("Соедините именно порт ТВ с маркировкой ARC/eARC с таким же портом аудиоустройства и включите HDMI-CEC на обоих. Обычный HDMI-порт не заменяет ARC.");
            } else {
                p.steps.push("Выберите на ТВ внешний ресивер/аудиосистему, а на саундбаре вход TV ARC/eARC. Полностью обесточьте оба устройства и включите снова.");
                p.steps.push(match third { "intermittent" => "Проверьте кабель и прямое соединение без промежуточного коммутатора. Затем временно выберите базовый совместимый аудиоформат для диагностики.", "tv_speakers" => "Если ТВ возвращается на свои динамики, проверьте, сохраняется ли выбор аудиосистемы и видит ли CEC подключённое устройство.", _ => "Для проверки запустите обычный телеканал и базовый аудиоформат. Если он работает, отдельно проверяйте сложные форматы и eARC." });
            }
            p
        }
        _ => return Err("Этот помощник не поддерживается."),
    };
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_valid_combination_is_bounded_and_actionable() {
        let cases = [
            (
                "usb-video-codec",
                vec!["not_open", "no_video", "no_sound"],
                vec!["yes", "no", "unknown"],
                vec!["works", "fails", "unknown"],
            ),
            (
                "tv-dlna",
                vec!["windows", "mac", "nas"],
                vec!["yes", "no", "unknown"],
                vec!["visible", "no_server", "no_files"],
            ),
            (
                "tv-usb-recording",
                vec!["antenna", "cable", "hdmi"],
                vec!["yes", "no", "unknown"],
                vec!["first", "fails", "playback"],
            ),
            (
                "tv-channel-order",
                vec!["antenna", "cable", "satellite"],
                vec!["yes", "no", "unknown"],
                vec!["reorder", "lost", "favorites"],
            ),
            (
                "tv-hdmi-cec",
                vec!["power", "volume", "input"],
                vec!["yes", "no", "unknown"],
                vec!["first", "partial", "none"],
            ),
            (
                "tv-airplay-failure",
                vec!["iphone", "mac"],
                vec!["yes", "no", "unknown"],
                vec!["invisible", "no_video", "no_sound"],
            ),
            (
                "tv-transport",
                vec!["original", "tv_box", "none"],
                vec!["upright", "flat", "unknown"],
                vec!["enough", "alone"],
            ),
            (
                "tv-cam-module",
                vec!["cable", "satellite", "antenna"],
                vec!["yes", "no", "unknown"],
                vec!["not_detected", "encoded", "no_signal"],
            ),
            (
                "tv-pin-reset",
                vec!["tv", "app", "operator"],
                vec!["known", "unknown"],
                vec!["keep", "reset_ok"],
            ),
            (
                "tv-arc-no-sound",
                vec!["both_arc", "one_arc", "unknown"],
                vec!["on", "off", "unknown"],
                vec!["silent", "intermittent", "tv_speakers"],
            ),
        ];
        let mut checked = 0;
        for (task, firsts, seconds, thirds) in cases {
            for first in &firsts {
                for second in &seconds {
                    for third in &thirds {
                        let result = plan(task, first, second, third).unwrap();
                        assert!(!result.steps.is_empty(), "{task}/{first}/{second}/{third}");
                        assert!(result.next_href.starts_with('/'));
                        assert!(["ready", "needs_review"].contains(&result.status));
                        checked += 1;
                    }
                }
            }
            assert!(plan(task, "bad", seconds[0], thirds[0]).is_err());
        }
        assert!(checked >= 200);
        assert!(plan("unknown", "", "", "").is_err());
    }

    #[test]
    fn unknown_or_unsafe_conditions_fail_closed() {
        assert_eq!(
            plan("usb-video-codec", "not_open", "unknown", "works")
                .unwrap()
                .status,
            "needs_review"
        );
        assert_eq!(
            plan("tv-dlna", "windows", "unknown", "visible")
                .unwrap()
                .status,
            "needs_review"
        );
        assert_eq!(
            plan("tv-usb-recording", "hdmi", "yes", "first")
                .unwrap()
                .status,
            "needs_review"
        );
        assert_eq!(
            plan("tv-transport", "none", "flat", "alone")
                .unwrap()
                .status,
            "needs_review"
        );
        assert_eq!(
            plan("tv-pin-reset", "tv", "known", "keep").unwrap().status,
            "needs_review"
        );
        assert_eq!(
            plan("tv-arc-no-sound", "unknown", "unknown", "silent")
                .unwrap()
                .status,
            "needs_review"
        );
    }
}
