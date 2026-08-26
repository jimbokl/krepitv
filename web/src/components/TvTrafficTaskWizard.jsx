import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Broadcast,
  HandTap,
  Headphones,
  Info,
  Laptop,
  Power,
  SlidersHorizontal,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  TelevisionSimple,
  Usb,
  WarningCircle,
  WifiSlash,
  MonitorPlay,
} from "@phosphor-icons/react";
import { calculateTvTrafficTask } from "../lib/catalog.js";
import { emitResultCompleted } from "../lib/resultCompleted.mjs";

const sourceRegistry = {
  "microsoft-multiple-displays": {
    label: "Microsoft: экраны Windows",
    url: "https://support.microsoft.com/ru-RU/Windows/Hardware/Display-Graphics/how-to-use-multiple-monitors-in-windows",
  },
  "microsoft-wireless-display": {
    label: "Microsoft: беспроводной дисплей",
    url: "https://support.microsoft.com/ru-RU/Windows/Hardware/Display-Graphics/screen-mirroring-and-projecting-to-your-pc-or-wireless-display",
  },
  "apple-mac-tv-display": {
    label: "Apple: телевизор как дисплей Mac",
    url: "https://support.apple.com/ru-ru/guide/mac-help/mchlp1206/mac",
  },
  "apple-mac-airplay": {
    label: "Apple: AirPlay с Mac",
    url: "https://support.apple.com/ru-ru/guide/mac-help/mchld7e543a0/mac",
  },
  "vesa-displayport": {
    label: "VESA: DisplayPort через USB-C",
    url: "https://www.displayport.org/faq/",
  },
  "samsung-channel-setup": {
    label: "Samsung: эфирные и кабельные каналы",
    url: "https://www.samsung.com/ru/support/tv-audio-video/where-can-i-find-free-channels-on-my-samsung-tv/",
  },
  "lg-channel-autotune": {
    label: "LG: настройка цифровых каналов",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20153413221090",
  },
  "rtrs-digital-terrestrial": {
    label: "РТРС: цифровое эфирное ТВ",
    url: "https://plus.rtrs.ru/info/",
  },
  "sony-picture-settings": {
    label: "Sony: базовая настройка изображения",
    url: "https://www.sony.ru/electronics/support/articles/00190409",
  },
  "sony-hdr-picture-mode": {
    label: "Sony: режим изображения для HDR",
    url: "https://www.sony.ru/electronics/support/articles/00133796",
  },
  "samsung-picture-menu-availability": {
    label: "Samsung: доступность настроек изображения",
    url: "https://www.samsung.com/ru/support/tv-audio-video/menu-item-in-image-settings-has-greyed-out/",
  },
  "samsung-picture-test": {
    label: "Samsung: встроенный тест изображения",
    url: "https://www.samsung.com/ru/support/tv-audio-video/how-to-run-test-image-on-samsung-tv/",
  },
  "samsung-game-mode": {
    label: "Samsung: игровой режим",
    url: "https://www.samsung.com/ru/support/tv-audio-video/smart-tv-game-mode-turn-on/",
  },
  "samsung-black-screen": {
    label: "Samsung: нет изображения",
    url: "https://www.samsung.com/ru/support/tv-audio-video/what-to-do-if-there-is-black-screen-on-samsung-tv/",
  },
  "lg-sound-but-no-picture": {
    label: "LG: звук есть, изображения нет",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20155333777203",
  },
  "sony-sound-but-no-picture": {
    label: "Sony: нет изображения при наличии звука",
    url: "https://www.sony.ru/electronics/support/articles/00153674",
  },
  "sony-picture-sound-test": {
    label: "Sony: встроенная проверка изображения и звука",
    url: "https://www.sony.ru/electronics/support/articles/00173823",
  },
  "samsung-no-sound": {
    label: "Samsung: нет звука из динамиков ТВ",
    url: "https://www.samsung.com/ru/support/tv-audio-video/there-is-not-sound-on-tv/",
  },
  "lg-no-sound": {
    label: "LG: проверка отсутствующего звука",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20153413213150OLT",
  },
  "sony-no-sound": {
    label: "Sony: проверка звука телевизора",
    url: "https://www.sony.ru/electronics/support/articles/00090112",
  },
  "samsung-remote-not-working": {
    label: "Samsung: пульт не работает",
    url: "https://www.samsung.com/ru/support/tv-audio-video/tv-remote-control-is-not-working/",
  },
  "lg-remote-not-responding": {
    label: "LG: пульт не отвечает",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20153413220443",
  },
  "sony-remote-not-working": {
    label: "Sony: пульт не работает",
    url: "https://www.sony.ru/electronics/support/articles/00256916",
  },
  "google-android-tv-phone-remote": {
    label: "Google: телефон как пульт Android TV",
    url: "https://support.google.com/androidtv/answer/6122465?hl=ru",
  },
  "samsung-tv-wifi": {
    label: "Samsung: телевизор не видит сеть Wi-Fi",
    url: "https://www.samsung.com/ru/support/tv-audio-video/samsung-tv-cannot-find-wi-fi-network/",
  },
  "lg-tv-internet": {
    label: "LG: проверка подключения телевизора к интернету",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20155140884890",
  },
  "sony-tv-internet": {
    label: "Sony: телевизор не подключается к интернету",
    url: "https://www.sony.ru/electronics/support/articles/00127011",
  },
  "samsung-tv-turns-off": {
    label: "Samsung: телевизор выключается сам",
    url: "https://www.samsung.com/ru/support/tv-audio-video/how-to-troubleshoot-the-samsung-tv-that-keeps-turning-off-by-itself/",
  },
  "lg-tv-off-timer": {
    label: "LG: таймер выключения телевизора",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20153413206966",
  },
  "lg-tv-box-turns-off": {
    label: "LG: телевизор и внешняя приставка выключаются вместе",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20154967823534",
  },
  "sony-tv-auto-power": {
    label: "Sony: автоматическое выключение телевизора",
    url: "https://www.sony.ru/electronics/support/articles/00032613",
  },
  "samsung-usb-video": {
    label: "Samsung: телевизор не воспроизводит видео с USB",
    url: "https://www.samsung.com/ru/support/tv-audio-video/what-can-i-do-if-usb-video-files-cannot-be-played-on-samsung-tv/",
  },
  "google-android-tv-storage": {
    label: "Google: USB-накопитель в Android TV",
    url: "https://support.google.com/androidtv/answer/6299083?hl=ru",
  },
  "samsung-tv-soundbar-arc": {
    label: "Samsung: HDMI ARC для телевизора и саундбара",
    url: "https://www.samsung.com/ru/support/tv-audio-video/how-to-use-hdmi-arc-on-samsung-smart-tv/",
  },
  "sony-tv-soundbar-connect": {
    label: "Sony: подключение саундбара к телевизору",
    url: "https://www.sony.ru/electronics/support/articles/00014997",
  },
  "lg-tv-soundbar-connect": {
    label: "LG: HDMI, оптика и Bluetooth для саундбара",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20153413206539OLT",
  },
  "lg-tv-screen-cleaning": {
    label: "LG: безопасная очистка экрана телевизора",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20154713246835",
  },
  "sony-tv-screen-cleaning": {
    label: "Sony: очистка OLED- и ЖК-экрана",
    url: "https://www.sony.ru/electronics/support/articles/00167099",
  },
  "google-tv-device-setup": {
    label: "Google: настройка устройства Google TV",
    url: "https://support.google.com/googletv/answer/10050221?hl=ru",
  },
  "xiaomi-mi-box-compatibility": {
    label: "Xiaomi: совместимость Mi Box с телевизором",
    url: "https://www.mi.com/ru/support/article/KA-15498/",
  },
  "samsung-tv-external-hdmi": {
    label: "Samsung: внешний источник по HDMI",
    url: "https://www.samsung.com/ru/support/tv-audio-video/no-signal-while-connect-devices-through-hdmi/",
  },
  "samsung-tv-optical-audio": {
    label: "Samsung: подключение внешней аудиосистемы по оптике",
    url: "https://www.samsung.com/ru/support/tv-audio-video/how-to-connect-external-audio-using-an-optical-cable/",
  },
  "sony-tv-wireless-audio": {
    label: "Sony: беспроводные аудиоустройства для телевизора",
    url: "https://www.sony.ru/electronics/support/articles/00023605",
  },
  "sony-tv-bluetooth-audio": {
    label: "Sony: поддержка Bluetooth-аудио телевизором",
    url: "https://www.sony.ru/electronics/support/articles/00135146",
  },
  "lg-tv-audio-output": {
    label: "LG: выбор аудиовыхода телевизора",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20154713273543",
  },
  "samsung-tv-bluetooth-headphones": {
    label: "Samsung: Bluetooth-наушники и телевизор",
    url: "https://www.samsung.com/ru/support/tv-audio-video/how-to-connect-bluetooth-headphones-to-a-samsung-tv/",
  },
  "lg-tv-bluetooth-audio": {
    label: "LG: подключение Bluetooth-аудиоустройства",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20155333324133",
  },
  "samsung-tv-update-online": {
    label: "Samsung: обновление телевизора через интернет",
    url: "https://www.samsung.com/ru/support/tv-audio-video/how-can-i-update-the-samsung-tv-firmware-through-the-internet/",
  },
  "samsung-tv-update-usb": {
    label: "Samsung: обновление телевизора через USB",
    url: "https://www.samsung.com/ru/support/tv-audio-video/how-can-i-update-the-samsung-tv-firmware-using-a-usb-memory-stick/",
  },
  "samsung-tv-firmware-model": {
    label: "Samsung: прошивка для точной модели",
    url: "https://www.samsung.com/ru/support/tv-audio-video/where-can-i-download-a-firmware-for-my-samsung-tv/",
  },
  "lg-tv-update": {
    label: "LG: обновление ПО телевизора",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20153413220386OLT",
  },
  "sony-tv-update": {
    label: "Sony: обновление ПО телевизора",
    url: "https://www.sony.ru/electronics/support/articles/00119543",
  },
  "yaos-tv-update": {
    label: "Яндекс: обновление YaOS",
    url: "https://alice.yandex.ru/support/ru/tv/settings/update-firmware",
  },
  "samsung-tv-app-install": {
    label: "Samsung: установка приложения",
    url: "https://www.samsung.com/ru/support/tv-audio-video/how-to-install-an-app-on-samsung-tv/",
  },
  "lg-tv-app-install": {
    label: "LG: установка приложения",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20155331408377",
  },
  "google-tv-app-install": {
    label: "Google TV: установка приложений",
    url: "https://support.google.com/googletv/answer/10050570?hl=ru",
  },
  "yaos-tv-apps": {
    label: "Яндекс: приложения на ТВ Станции",
    url: "https://alice.yandex.ru/support/ru/tv/apps/tv-yndx",
  },
  "samsung-tv-reset": {
    label: "Samsung: полный сброс настроек",
    url: "https://www.samsung.com/ru/support/tv-audio-video/how-do-i-reset-settings-on-my-samsung-tv/",
  },
  "lg-tv-reset": {
    label: "LG: полный сброс настроек",
    url: "https://www.lg.com/ru/support/product-help/CT20206007-20154159901753",
  },
  "sony-tv-reset": {
    label: "Sony: полный сброс настроек",
    url: "https://www.sony.ru/electronics/support/articles/00262856",
  },
  "yaos-tv-reset": {
    label: "Яндекс: сброс ТВ Станции",
    url: "https://alice.yandex.ru/support/ru/tv/settings/reset-settings",
  },
};

const sourceAliases = {
  "apple-mac-tv": "apple-mac-tv-display",
  "lg-digital-channels": "lg-channel-autotune",
  "rtrs-dtv": "rtrs-digital-terrestrial",
  "sony-picture-guide": "sony-picture-settings",
  "samsung-picture-settings": "samsung-picture-menu-availability",
  "samsung-adaptive-picture": "samsung-picture-menu-availability",
};

const configs = {
  "laptop-to-tv": {
    Icon: Laptop,
    kicker: "Подключение без перебора кабелей",
    title: "Мастер ноутбук → телевизор",
    description: "Выберите систему и предполагаемый путь. Мастер отделит полноценный HDMI от USB-C без видеовыхода и беспроводной протокол от общей надписи Wi-Fi.",
    buttonLabel: "Показать способ подключения",
    loadingLabel: "Проверяем видеовыход и режим экрана…",
    toolId: "laptop_tv_connection",
    primary: {
      legend: "1. Какая система на ноутбуке?",
      options: [
        ["windows", "Windows", "Win + P, Win + K и проверка Miracast"],
        ["macos", "macOS", "Дисплеи, видеокабель или AirPlay"],
        ["other", "Другая система", "Нужна инструкция точной модели"],
        ["unknown", "Не знаю", "Сначала определим систему и порты"],
      ],
    },
    secondary: {
      legend: "2. Как хотите подключить?",
      options: [
        ["hdmi", "HDMI", "Полноразмерный видеовыход на ноутбуке"],
        ["usb-c", "USB-C", "Только с подтверждённым видеовыходом"],
        ["wireless", "Без провода", "Miracast или AirPlay должны быть на обоих устройствах"],
        ["unknown", "Не знаю", "Сначала сверим разъёмы и функции"],
      ],
    },
    tertiary: {
      defaultValue: "mirror",
      legend: "Что должно быть на телевизоре?",
      options: [
        ["mirror", "Повтор экрана"],
        ["extend", "Второй рабочий стол"],
        ["video", "Фильм или презентация"],
        ["game", "Игра"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: ({ secondary }) => secondary === "wireless"
        ? "Поддержка Miracast или AirPlay подтверждена у телевизора?"
        : "Видеовыход через этот разъём подтверждён в паспорте ноутбука?",
      show: ({ secondary }) => ["usb-c", "wireless"].includes(secondary),
    },
    referenceSourceIds: [
      "microsoft-wireless-display",
      "apple-mac-tv-display",
      "apple-mac-airplay",
      "vesa-displayport",
    ],
    next: {
      href: "/televizor-pishet-net-signala/",
      label: "Изображение раньше было, а теперь пропало? Открыть диагностику «Нет сигнала»",
    },
  },
  "digital-channels": {
    Icon: Broadcast,
    kicker: "Поиск каналов без потери источника",
    title: "Мастер настройки цифровых каналов",
    description: "Сначала отделим эфирную антенну от кабельного оператора и внешней приставки. Только после этого появится подходящий порядок поиска.",
    buttonLabel: "Составить план настройки",
    loadingLabel: "Разделяем источник и устройство настройки…",
    toolId: "digital_channel_setup",
    primary: {
      legend: "1. Откуда приходят каналы?",
      options: [
        ["antenna", "Эфирная антенна", "Комнатная, наружная или общедомовая сеть"],
        ["cable", "Кабельный оператор", "Коаксиальный кабель прямо в телевизор"],
        ["provider-box", "Приставка оператора", "HDMI или AV от отдельной коробки"],
        ["satellite", "Спутниковая приставка", "Список каналов хранит приёмник"],
        ["unknown", "Не знаю", "Проследим подключённый кабель"],
      ],
    },
    secondary: {
      legend: "2. Где открывается список каналов?",
      options: [
        ["built-in", "В меню телевизора", "Используется встроенный тюнер"],
        ["external", "В меню приставки", "Нужен её пульт и инструкция"],
        ["unknown", "Не знаю", "Сначала определим устройство"],
      ],
    },
    tertiary: {
      defaultValue: "first-setup",
      legend: "Что происходит сейчас?",
      options: [
        ["first-setup", "Настраиваю впервые"],
        ["zero-channels", "Поиск находит 0 каналов"],
        ["some-missing", "Пропали отдельные каналы"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Доступный антенный или операторский кабель подключён плотно?",
      show: ({ primary, secondary }) => secondary === "built-in" && ["antenna", "cable"].includes(primary),
    },
    referenceSourceIds: [
      "samsung-channel-setup",
      "lg-channel-autotune",
      "rtrs-digital-terrestrial",
    ],
    next: {
      href: "/televizor-pishet-net-signala/",
      label: "Каналы уже работали и внезапно исчезли? Открыть диагностику сигнала",
    },
  },
  "picture-setup": {
    Icon: SlidersHorizontal,
    kicker: "Обратимая настройка без чужих цифр",
    title: "Мастер настройки изображения",
    description: "Получите базовый режим под комнату и контент, затем меняйте один параметр за раз. Сервис не выдаёт универсальные числа за профессиональную калибровку.",
    buttonLabel: "Получить план настройки",
    loadingLabel: "Собираем обратимый порядок сравнения…",
    toolId: "picture_setup",
    primary: {
      legend: "1. Что вы настраиваете?",
      options: [
        ["everyday", "Обычный просмотр", "ТВ, приложения и смешанный контент"],
        ["movie", "Фильмы и сериалы", "Спокойная обработка и постоянный свет"],
        ["sports", "Спорт", "Отдельная проверка движения"],
        ["game", "Игры", "Задержка управления важнее украшений"],
      ],
    },
    secondary: {
      legend: "2. Как обычно освещена комната?",
      options: [
        ["dark", "Темно", "Вечерний просмотр"],
        ["mixed", "Освещение меняется", "Обычная гостиная"],
        ["bright", "Светло", "Дневной свет и отражения"],
      ],
    },
    tertiary: {
      defaultValue: "baseline",
      legend: "Что хотите исправить?",
      options: [
        ["baseline", "Нужна базовая настройка"],
        ["too-dark", "Слишком темно"],
        ["too-bright", "Слишком ярко"],
        ["unnatural", "Неестественные цвета"],
        ["motion", "Рывки или «мыльная опера»"],
        ["lag", "Задержка в игре"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Телевизор подтверждает, что сейчас воспроизводится HDR?",
      show: () => true,
    },
    referenceSourceIds: [
      "sony-picture-settings",
      "samsung-picture-menu-availability",
      "samsung-picture-test",
      "samsung-game-mode",
      "sony-hdr-picture-mode",
    ],
    next: {
      href: "/rasstoyanie-do-televizora-i-diagonal/",
      label: "Проверить расстояние просмотра и диагональ",
    },
  },
  "sound-but-no-picture": {
    Icon: TelevisionSimple,
    kicker: "Экран проверяем без аппаратного диагноза",
    title: "Мастер: звук есть, изображения нет",
    description: "Проверим собственное меню телевизора, источник звука и один выбранный видеопуть. Мастер остановится до вскрытия, измерений и догадок о внутренней детали.",
    buttonLabel: "Получить безопасный план",
    loadingLabel: "Отделяем экран телевизора от источника…",
    toolId: "tv_sound_without_picture",
    primary: {
      legend: "1. Видно ли меню телевизора или шкалу громкости?",
      options: [
        ["yes", "Да", "Собственная графика телевизора появляется"],
        ["no", "Нет", "Экран остаётся чёрным и при открытии меню"],
        ["unknown", "Не знаю", "Сначала выполним безопасную проверку меню"],
      ],
    },
    secondary: {
      legend: "2. Откуда сейчас слышен звук?",
      options: [
        ["tv-speakers", "Из телевизора", "Звук идёт из встроенных динамиков ТВ"],
        ["external-audio", "Из внешней аудиосистемы", "Саундбар, ресивер, колонка или наушники"],
        ["unknown", "Не знаю", "Сначала определим устройство воспроизведения"],
      ],
    },
    tertiary: {
      defaultValue: "unknown",
      legend: "На каком источнике пропало изображение?",
      options: [
        ["tv-app", "Приложение телевизора"],
        ["channels", "Телеканалы"],
        ["hdmi", "HDMI-устройство"],
        ["unknown", "Не знаю"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "На других доступных источниках экран тоже остаётся чёрным?",
      show: () => true,
    },
    referenceSourceIds: [
      "samsung-black-screen",
      "lg-sound-but-no-picture",
      "sony-sound-but-no-picture",
      "sony-picture-sound-test",
    ],
    next: {
      href: "/televizor-pishet-net-signala/",
      label: "Телевизор показывает сообщение «Нет сигнала»? Открыть отдельную проверку",
    },
  },
  "no-sound": {
    Icon: SpeakerSlash,
    kicker: "Сначала выход звука, потом источник",
    title: "Мастер: изображение есть, звука нет",
    description: "Определим активный выход звука и отделим динамики телевизора от саундбара, наушников, приложения, канала или HDMI-устройства.",
    buttonLabel: "Составить план проверки звука",
    loadingLabel: "Проверяем выход звука и источник…",
    toolId: "tv_picture_without_sound",
    primary: {
      legend: "1. Откуда должен звучать телевизор?",
      options: [
        ["tv-speakers", "Из динамиков телевизора", "Без внешней аудиосистемы"],
        ["soundbar-receiver", "Из саундбара или ресивера", "HDMI ARC/eARC, оптика или другой вход"],
        ["headphones-bluetooth", "Из наушников или Bluetooth-устройства", "Проводное или беспроводное устройство"],
        ["unknown", "Не знаю", "Сначала определим выбранный выход"],
      ],
    },
    secondary: {
      legend: "2. Откуда сейчас идёт изображение?",
      options: [
        ["tv-app", "Приложение телевизора", "Онлайн-кинотеатр или другое встроенное приложение"],
        ["channels", "Телеканалы", "Эфир, кабель или операторская приставка"],
        ["hdmi", "HDMI-устройство", "Приставка, консоль или компьютер"],
        ["unknown", "Не знаю", "Сначала определим активный источник"],
      ],
    },
    tertiary: {
      defaultValue: "unknown",
      legend: "Видно ли на экране mute или нулевую громкость?",
      options: [
        ["yes", "Да"],
        ["no", "Нет"],
        ["unknown", "Не знаю"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Внешняя аудиосистема включена и на ней выбран нужный вход?",
      show: ({ primary }) => ["soundbar-receiver", "headphones-bluetooth"].includes(primary),
    },
    referenceSourceIds: [
      "samsung-no-sound",
      "lg-no-sound",
      "sony-no-sound",
      "sony-picture-sound-test",
    ],
    next: {
      href: "/televizor-zvuk-est-izobrazheniya-net/",
      label: "Экран стал чёрным, но звук остался? Открыть проверку изображения",
    },
  },
  "remote-not-working": {
    Icon: HandTap,
    kicker: "Управление без универсальных комбинаций",
    title: "Мастер: не работает пульт от телевизора",
    description: "Отделим управление самим телевизором от комплектного, универсального или экранного пульта. Сопряжение останется модельной проверкой.",
    buttonLabel: "Показать следующую проверку",
    loadingLabel: "Разделяем телевизор и пульт…",
    toolId: "tv_remote_control",
    primary: {
      legend: "1. Телевизор управляется кнопкой на корпусе или официальным приложением?",
      options: [
        ["yes", "Да", "Телевизор реагирует другим доступным способом"],
        ["no", "Нет", "Реакции нет и без этого пульта"],
        ["unknown", "Не знаю", "Кнопка недоступна или приложение не настроено"],
      ],
    },
    secondary: {
      legend: "2. Какой пульт вы проверяете?",
      options: [
        ["original", "Комплектный пульт ТВ", "Пульт из комплекта телевизора"],
        ["universal", "Универсальный или от приставки", "Может требовать собственный код настройки"],
        ["app", "Приложение на телефоне", "Совместимость и сопряжение зависят от платформы"],
        ["unknown", "Не знаю", "Сначала определим владельца и тип пульта"],
      ],
    },
    tertiary: {
      defaultValue: "unknown",
      legend: "Новые батарейки установлены с правильной полярностью?",
      options: [
        ["yes", "Да"],
        ["no", "Нет"],
        ["unknown", "Не знаю"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Работает ли хотя бы часть кнопок этого пульта?",
      show: ({ secondary }) => secondary !== "app",
    },
    referenceSourceIds: [
      "samsung-remote-not-working",
      "lg-remote-not-responding",
      "sony-remote-not-working",
      "google-android-tv-phone-remote",
    ],
    next: {
      href: "/televizor-pishet-net-signala/",
      label: "Пульт работает, но на экране «Нет сигнала»? Проверить источник",
    },
  },
  "turns-off": {
    Icon: Power,
    kicker: "Сначала признаки опасности, потом закономерность",
    title: "Мастер: телевизор сам выключается",
    description: "Отделим таймер или управление внешнего HDMI-устройства от случайного повторяющегося выключения. При запахе, дыме, искрах, жидкости, сильном нагреве, красном мигающем индикаторе либо повреждённых, горячих или мокрых кабеле, вилке или розетке мастер сразу остановит самостоятельную проверку.",
    buttonLabel: "Получить безопасный план",
    loadingLabel: "Проверяем признаки и время выключения…",
    toolId: "tv_turns_off",
    skipSecondary: ({ primary }) => Boolean(primary && primary !== "no"),
    primary: {
      legend: "1. Есть запах гари, дым, искры, жидкость, сильный нагрев, красный мигающий индикатор либо повреждённые, горячие или мокрые кабель, вилка или розетка?",
      options: [
        ["yes", "Да", "Ничего больше не включайте и не разбирайте"],
        ["no", "Нет", "Явных опасных признаков не наблюдается"],
        ["unknown", "Не знаю", "Не проверяйте то, что недоступно без перемещения настенного телевизора"],
      ],
    },
    secondary: {
      legend: "2. Когда телевизор выключается?",
      options: [
        ["same-time", "В одно время или через одинаковый интервал", "Проверим только таймеры и автоотключение"],
        ["after-hdmi", "После действия с HDMI-устройством", "Приставка или консоль включается либо выключается рядом"],
        ["random", "Без заметной закономерности", "Случайно во время обычного просмотра"],
        ["unknown", "Не знаю", "Сначала зафиксируем момент без догадок"],
      ],
    },
    tertiary: {
      defaultValue: "unknown",
      legend: "Это произошло один раз или повторяется?",
      options: [
        ["once", "Один раз"],
        ["repeats", "Повторяется"],
        ["unknown", "Не знаю"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Вокруг корпуса свободно проходит воздух без доступа за настенным телевизором?",
      show: () => true,
    },
    referenceSourceIds: [
      "samsung-tv-turns-off",
      "lg-tv-off-timer",
      "lg-tv-box-turns-off",
      "sony-tv-auto-power",
    ],
    next: {
      href: "/televizor-zvuk-est-izobrazheniya-net/",
      label: "Телевизор не выключается, а только теряет изображение? Проверить экран",
    },
  },
  "no-internet": {
    Icon: WifiSlash,
    kicker: "Сеть проверяем без паролей и сбросов",
    title: "Мастер: телевизор не подключается к интернету",
    description: "Отделим телевизор от роутера, провайдера и одного приложения. Не вводите на сайте название сети, пароль, IP- или MAC-адрес: мастер их не запрашивает.",
    buttonLabel: "Составить план проверки сети",
    loadingLabel: "Разделяем телевизор, сеть и приложение…",
    toolId: "tv_no_internet",
    primary: {
      legend: "1. На других устройствах в этой же сети интернет работает?",
      options: [
        ["yes", "Да", "Телефон или компьютер открывает сайты через ту же сеть"],
        ["no", "Нет", "Интернет не работает и на других устройствах"],
        ["unknown", "Не знаю", "Сначала выполним проверку без ввода данных сети"],
      ],
    },
    secondary: {
      legend: "2. Телевизор видит нужную сеть?",
      options: [
        ["yes", "Да, сеть видна", "Название есть в списке доступных сетей"],
        ["no", "Нет, сеть не видна", "Другие сети могут быть видны или список пуст"],
        ["wired", "Подключён сетевым кабелем", "Wi-Fi для этого подключения не используется"],
        ["unknown", "Не знаю", "Сначала определим способ подключения"],
      ],
    },
    tertiary: {
      defaultValue: "unknown",
      legend: "Где именно нет доступа?",
      options: [
        ["one-app", "Только в одном приложении"],
        ["all-apps", "Во всех приложениях"],
        ["unknown", "Не знаю"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Доступный сетевой кабель подключён, а на роутере нет явного сигнала ошибки?",
      show: ({ secondary }) => secondary === "wired",
    },
    referenceSourceIds: [
      "samsung-tv-wifi",
      "lg-tv-internet",
      "sony-tv-internet",
    ],
    next: {
      href: "/televizor-ne-vidit-fleshku/",
      label: "Хотите открыть медиафайл с обычной флешки? Проверить USB",
    },
  },
  "usb-not-seen": {
    Icon: Usb,
    kicker: "Распознавание отдельно от формата файла",
    title: "Мастер: телевизор не видит флешку",
    description: "Проверим обычную USB-флешку с медиафайлами — не телефон и не диск для записи. Не форматируйте и не регистрируйте накопитель: это может удалить данные. Сначала нужна резервная копия и инструкция точной модели.",
    buttonLabel: "Показать безопасную проверку USB",
    loadingLabel: "Разделяем накопитель, порт и медиафайл…",
    toolId: "tv_usb_not_seen",
    primary: {
      legend: "1. Телевизор показывает флешку в источниках или файловом менеджере?",
      options: [
        ["yes", "Да", "Накопитель виден, но проблема остаётся"],
        ["no", "Нет", "Флешка не появляется в интерфейсе телевизора"],
        ["unknown", "Не знаю", "Сначала найдём безопасный способ проверить распознавание"],
      ],
    },
    secondary: {
      legend: "2. Эта флешка открывается на другом доступном устройстве?",
      options: [
        ["yes", "Да", "Файлы видны на компьютере или другом устройстве"],
        ["no", "Нет", "Накопитель не открывается и там"],
        ["unknown", "Не проверял", "Не форматируйте накопитель ради проверки"],
      ],
    },
    tertiary: {
      defaultValue: "unknown",
      legend: "Что именно не получается?",
      options: [
        ["drive-not-shown", "Флешка не отображается"],
        ["file-not-shown", "Флешка видна, файла нет"],
        ["file-not-playing", "Файл виден, но не открывается"],
        ["unknown", "Не знаю"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "В инструкции точной модели подтверждены этот USB-порт и просмотр медиа?",
      show: () => true,
    },
    referenceSourceIds: [
      "samsung-usb-video",
      "google-android-tv-storage",
    ],
    next: {
      href: "/televizor-ne-podklyuchaetsya-k-internetu/",
      label: "Проблема только в онлайн-приложениях? Проверить подключение к интернету",
    },
  },
  "soundbar-to-tv": {
    Icon: SpeakerHigh,
    kicker: "Подключение по видимым подписям",
    title: "Мастер: саундбар → телевизор",
    description: "Сопоставьте только те выходы и входы, подписи которых видны на обоих устройствах. Названия меню, HDMI-CEC и возможности Bluetooth зависят от точных моделей — мастер их не угадывает.",
    buttonLabel: "Показать способ подключения",
    loadingLabel: "Сверяем выход телевизора и вход саундбара…",
    toolId: "soundbar_to_tv",
    primary: {
      legend: "1. Какая подпись есть на выходе телевизора?",
      options: [
        ["earc", "HDMI eARC", "На разъёме явно указано eARC"],
        ["arc", "HDMI ARC", "На разъёме явно указано ARC"],
        ["optical", "Optical / Digital Audio Out", "Оптический аудиовыход"],
        ["analog", "Наушники / Audio Out", "Аналоговый аудиовыход"],
        ["bluetooth", "Bluetooth", "Подтверждён в инструкции телевизора"],
        ["none", "Подходящего выхода нет", "Совпадающая подпись не найдена"],
        ["unknown", "Не знаю", "Порт не виден или подпись не читается"],
      ],
    },
    secondary: {
      legend: "2. Какая совпадающая подпись есть на входе саундбара?",
      options: [
        ["earc", "HDMI eARC", "На разъёме явно указано eARC"],
        ["arc", "HDMI ARC", "На разъёме явно указано ARC"],
        ["optical", "Optical / Digital Audio In", "Оптический аудиовход"],
        ["analog", "AUX / Audio In", "Аналоговый аудиовход"],
        ["bluetooth", "Bluetooth", "Подтверждён в инструкции саундбара"],
        ["none", "Подходящего входа нет", "Совпадающая подпись не найдена"],
        ["unknown", "Не знаю", "Порт не виден или подпись не читается"],
      ],
    },
    tertiary: {
      defaultValue: "unknown",
      legend: "Нужные порты доступны без перемещения настенного телевизора?",
      options: [
        ["yes", "Да"],
        ["no", "Нет"],
        ["unknown", "Не уверен"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Кабели, разъёмы, вилки и розетки выглядят безопасно?",
      options: [
        ["safe", "Да, повреждений нет"],
        ["unsafe", "Нет, есть повреждение, нагрев или влага"],
        ["unknown", "Не уверен"],
      ],
      show: () => true,
    },
    referenceSourceIds: [
      "samsung-tv-soundbar-arc",
      "sony-tv-soundbar-connect",
      "lg-tv-soundbar-connect",
    ],
    next: {
      href: "/net-zvuka-na-televizore/",
      label: "Подключение совпадает, но звука нет? Открыть диагностику звука",
    },
  },
  "screen-cleaning": {
    Icon: Sparkle,
    kicker: "Сначала самый щадящий способ",
    title: "Мастер безопасной очистки экрана",
    description: "Начните с чистой сухой микрофибры. Не распыляйте жидкость на экран, не давите, не скоблите и не применяйте универсальную химию: влажный способ допустим только по инструкции точной модели.",
    buttonLabel: "Показать безопасный шаг",
    loadingLabel: "Проверяем состояние экрана и безопасную границу…",
    toolId: "screen_cleaning",
    primary: {
      legend: "1. Что видно на экране?",
      options: [
        ["clear", "Пыль или отпечатки", "Нет трещин, отслоения и жидкости внутри"],
        ["damage", "Трещина или отслоение", "Самостоятельную очистку нужно остановить"],
        ["liquid", "Жидкость внутри или у кромки", "Не нажимайте и не включайте телевизор"],
        ["unknown", "Не уверен", "Состояние нельзя безопасно подтвердить"],
      ],
    },
    secondary: {
      legend: "2. Телевизор выключен и экран остыл?",
      options: [
        ["off-cool", "Да, выключен и остыл", "Можно продолжить безопасную проверку"],
        ["on", "Нет, телевизор включён", "Сначала выключите его"],
        ["warm", "Выключен, но ещё тёплый", "Дождитесь остывания"],
        ["unknown", "Не уверен", "Не начинайте очистку"],
      ],
    },
    tertiary: {
      defaultValue: "unknown",
      legend: "Что есть для первого шага?",
      options: [
        ["clean-dry-microfiber", "Чистая сухая микрофибра"],
        ["other", "Другая салфетка или средство"],
        ["unknown", "Не уверен"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Вилка, кабель и розетка безопасны и доступны без усилия?",
      options: [
        ["safe", "Да, доступны и целы"],
        ["unsafe", "Нет, есть нагрев, повреждение или влага"],
        ["inaccessible", "Вилка недоступна безопасно"],
        ["unknown", "Не уверен"],
      ],
      columns: "grid-cols-1 sm:grid-cols-2",
      show: () => true,
    },
    referenceSourceIds: [
      "lg-tv-screen-cleaning",
      "sony-tv-screen-cleaning",
    ],
    next: {
      href: "/nastroyka-izobrazheniya-televizora/",
      label: "Экран чистый? Перейти к безопасной настройке изображения",
    },
  },
  "smart-tv-box": {
    Icon: MonitorPlay,
    kicker: "Вход, питание и настройка отдельно",
    title: "Мастер: Smart TV-приставка → телевизор",
    description: "Сопоставьте видеовыход приставки с подписанным входом телевизора. Питание, сеть, аккаунт и пульт — отдельные этапы; AV, переходники и питание от USB не предполагаются без инструкции точной модели.",
    buttonLabel: "Показать план подключения",
    loadingLabel: "Сверяем видеопорты и этапы запуска…",
    toolId: "smart_tv_box",
    primary: {
      legend: "1. Какой свободный вход есть на телевизоре?",
      options: [
        ["hdmi", "HDMI", "Подпись видна у доступного входа"],
        ["av", "AV", "Композитный вход подтверждён инструкцией ТВ"],
        ["none", "Подходящего входа нет", "Совпадающий вход не найден"],
        ["unknown", "Не знаю", "Порт или подпись не видны"],
      ],
    },
    secondary: {
      legend: "2. Какой видеовыход есть на приставке?",
      options: [
        ["hdmi", "HDMI", "Подпись видна на приставке"],
        ["av", "AV", "Выход подтверждён инструкцией точной модели"],
        ["unknown", "Не знаю", "Нужно сверить корпус и инструкцию"],
      ],
    },
    tertiary: {
      defaultValue: "unknown",
      legend: "Вход телевизора доступен без перемещения настенного экрана?",
      options: [
        ["yes", "Да"],
        ["no", "Нет"],
        ["unknown", "Не уверен"],
      ],
    },
    detail: {
      defaultValue: "unknown",
      legend: () => "Что уже подтверждено для отдельного запуска приставки?",
      options: [
        ["power-and-network", "Штатное питание и сеть"],
        ["power-only", "Только штатное питание"],
        ["no-power", "Штатного питания нет"],
        ["unsafe", "Есть повреждение, нагрев или влага"],
        ["unknown", "Не знаю"],
      ],
      columns: "grid-cols-1 sm:grid-cols-2",
      show: () => true,
    },
    referenceSourceIds: [
      "google-tv-device-setup",
      "xiaomi-mi-box-compatibility",
      "samsung-tv-external-hdmi",
    ],
    next: {
      href: "/televizor-pishet-net-signala/",
      label: "Приставка включена, но телевизор пишет «Нет сигнала»? Проверить источник",
    },
  },
  "tv-speakers": {
    Icon: SpeakerHigh,
    requireConfirmation: true,
    kicker: "Один подтверждённый аудиопуть",
    title: "Мастер: колонки → телевизор",
    description: "Сопоставьте выход телевизора со входом активной аудиосистемы. Пассивные колонки нельзя подключать к телевизору напрямую: для них нужен совместимый усилитель или ресивер.",
    buttonLabel: "Показать безопасный аудиопуть",
    loadingLabel: "Сверяем выход, вход и модельную совместимость…",
    toolId: "tv_speakers",
    primary: {
      legend: "1. Какой аудиовыход подтверждён у телевизора?",
      options: [
        ["bluetooth", "Bluetooth-аудио", "Именно вывод звука, а не только Bluetooth-функции"],
        ["optical", "Optical / Digital Audio Out", "Оптический аудиовыход"],
        ["analog-3.5", "Audio Out 3,5 мм", "Подтверждённый аналоговый выход"],
        ["hdmi-arc", "HDMI ARC", "Явная маркировка ARC у порта"],
        ["unknown", "Не знаю", "Нужно сверить подпись и инструкцию модели"],
      ],
    },
    secondary: {
      legend: "2. Какой вход есть у акустики?",
      options: [
        ["bluetooth", "Bluetooth-аудио", "Активная акустика принимает звук по Bluetooth"],
        ["optical", "Optical In", "Оптический аудиовход"],
        ["analog-3.5", "AUX / Audio In 3,5 мм", "Активный аналоговый вход"],
        ["hdmi-arc", "HDMI ARC", "Явная маркировка ARC у входа"],
        ["passive-wire", "Только провод пассивной колонки", "Прямого входа и собственного усиления нет"],
        ["unknown", "Не знаю", "Нужно сверить маркировку и инструкцию"],
      ],
    },
    tertiary: {
      defaultValue: "",
      legend: "Совместимость подтверждена, а разъём доступен без перемещения настенного телевизора?",
      options: [
        ["yes", "Да, оба условия выполнены"],
        ["no", "Нет, хотя бы одно не выполнено"],
        ["unknown", "Не уверен"],
      ],
    },
    detail: {
      defaultValue: "",
      legend: () => "Доступные кабели, разъёмы и питание выглядят безопасно?",
      options: [
        ["safe", "Да, опасных признаков нет"],
        ["unsafe", "Нет, есть повреждение, нагрев или влага"],
        ["unknown", "Не уверен"],
      ],
      show: () => true,
    },
    referenceSourceIds: [
      "samsung-tv-optical-audio",
      "sony-tv-wireless-audio",
      "sony-tv-bluetooth-audio",
      "lg-tv-audio-output",
    ],
    next: {
      href: "/kak-podklyuchit-naushniki-k-televizoru/",
      label: "Нужен звук только для одного зрителя? Открыть мастер наушников",
    },
  },
  "tv-headphones": {
    Icon: Headphones,
    requireConfirmation: true,
    kicker: "Совместимость до сопряжения",
    title: "Мастер: наушники → телевизор",
    description: "Наличие Bluetooth само по себе не подтверждает вывод звука на наушники. Мастер сопоставит Bluetooth-аудио, выход 3,5 мм или документированный оптический путь без случайных переходников.",
    buttonLabel: "Показать безопасный путь",
    loadingLabel: "Сверяем выход телевизора и путь наушников…",
    toolId: "tv_headphones",
    primary: {
      legend: "1. Какой аудиовыход подтверждён у телевизора?",
      options: [
        ["bluetooth", "Bluetooth-аудио", "Вывод звука подтверждён для точной модели"],
        ["headphones-3.5", "Headphones 3,5 мм", "Явно маркированный выход для наушников"],
        ["optical", "Optical / Digital Audio Out", "Оптический аудиовыход"],
        ["none", "Подходящего выхода нет", "Ни один путь не подтверждён"],
        ["unknown", "Не знаю", "Нужно сверить корпус и инструкцию"],
      ],
    },
    secondary: {
      legend: "2. Какой путь поддерживают наушники?",
      options: [
        ["bluetooth", "Bluetooth", "Наушники готовы к обычному сопряжению"],
        ["analog-3.5", "Аналоговый штекер 3,5 мм", "Проводные наушники"],
        ["optical-transmitter", "Подтверждённый оптический передатчик", "Отдельно питаемый тракт из инструкции"],
        ["unknown", "Не знаю", "Нужно сверить точные модели"],
      ],
    },
    tertiary: {
      defaultValue: "",
      legend: "Совместимость подтверждена, а разъём доступен без перемещения настенного телевизора?",
      options: [
        ["yes", "Да, оба условия выполнены"],
        ["no", "Нет, хотя бы одно не выполнено"],
        ["unknown", "Не уверен"],
      ],
    },
    detail: {
      defaultValue: "",
      legend: () => "Кабели, передатчик и питание выглядят безопасно?",
      options: [
        ["safe", "Да, опасных признаков нет"],
        ["unsafe", "Нет, есть повреждение, нагрев или влага"],
        ["unknown", "Не уверен"],
      ],
      show: () => true,
    },
    referenceSourceIds: [
      "samsung-tv-bluetooth-headphones",
      "sony-tv-bluetooth-audio",
      "sony-tv-wireless-audio",
      "lg-tv-bluetooth-audio",
    ],
    next: {
      href: "/kak-podklyuchit-kolonki-k-televizoru/",
      label: "Нужен звук для комнаты? Открыть мастер подключения колонок",
    },
  },
  "tv-firmware-update": {
    Icon: Power,
    requireConfirmation: true,
    kicker: "Точная модель до обновления",
    title: "Мастер обновления телевизора",
    description: "Выберите платформу и только официальный способ для точной модели. Крепи ТВ не хранит прошивки и остановит план, если обновление уже идёт, модель не подтверждена или питание выглядит небезопасно.",
    buttonLabel: "Показать безопасный план",
    loadingLabel: "Сверяем платформу и состояние обновления…",
    toolId: "tv_firmware_update",
    primary: {
      legend: "1. Какая платформа у телевизора?",
      options: [
        ["samsung", "Samsung", "Точная модель из обычного информационного экрана"],
        ["lg-webos", "LG webOS", "Платформа подтверждена по модели"],
        ["google-android", "Google TV или Android TV", "Система подтверждена по модели"],
        ["yaos", "YaOS", "ТВ Станция или телевизор на YaOS"],
        ["other", "Другая платформа", "Нужна отдельная официальная инструкция"],
        ["unknown", "Не знаю", "Сначала определим платформу по точной модели"],
      ],
    },
    secondary: {
      legend: "2. Какой официальный способ доступен?",
      options: [
        ["network", "Через сеть", "Штатный раздел обновления телевизора"],
        ["official-usb", "Официальный файл на USB", "Только пакет со страницы точной модели"],
        ["unknown", "Не знаю", "Способ ещё не подтверждён инструкцией"],
      ],
    },
    tertiary: {
      defaultValue: "",
      legend: "Инструкция и файл относятся к точной модели и региону?",
      options: [
        ["yes", "Да, совпадение подтверждено"],
        ["no", "Нет, есть расхождение"],
        ["unknown", "Не уверен"],
      ],
    },
    detail: {
      defaultValue: "",
      legend: () => "В каком состоянии телевизор сейчас?",
      options: [
        ["ready", "Готов к обновлению", "Обновление не запущено, питание устойчиво"],
        ["update-running", "Обновление уже идёт", "Нельзя выключать питание или извлекать USB"],
        ["unsafe", "Есть опасный признак", "Нагрев, жидкость, искры или повреждение"],
        ["unknown", "Не уверен", "Безопасное состояние не подтверждено"],
      ],
      columns: "grid-cols-1 sm:grid-cols-2",
      show: () => true,
    },
    confirmationTitle: "Подтвердите модель и безопасное состояние",
    confirmationDescription: "Без этих двух ответов мастер не разрешит начинать обновление. Уже идущий процесс нельзя прерывать выключением питания, сбросом или извлечением USB.",
    referenceSourceIds: [
      "samsung-tv-update-online",
      "samsung-tv-update-usb",
      "samsung-tv-firmware-model",
      "lg-tv-update",
      "sony-tv-update",
      "yaos-tv-update",
    ],
    next: {
      href: "/kak-ustanovit-prilozhenie-na-televizor/",
      label: "Телевизор обновлён? Проверить штатную установку приложения",
    },
  },
  "tv-app-install": {
    Icon: MonitorPlay,
    requireConfirmation: true,
    kicker: "Только официальный магазин",
    title: "Мастер установки приложения",
    description: "Проверьте платформу, наличие приложения в её официальном магазине, сеть, учётную запись и свободное место. Мастер не предлагает APK, смену региона или обход системных ограничений.",
    buttonLabel: "Показать штатный путь",
    loadingLabel: "Проверяем магазин и условия установки…",
    toolId: "tv_app_install",
    primary: {
      legend: "1. Какая платформа у телевизора?",
      options: [
        ["samsung", "Samsung", "Точная модель из обычного информационного экрана"],
        ["lg-webos", "LG webOS", "Платформа подтверждена по модели"],
        ["google-android", "Google TV или Android TV", "Система подтверждена по модели"],
        ["yaos", "YaOS", "ТВ Станция или телевизор на YaOS"],
        ["other", "Другая платформа", "Нужна отдельная официальная инструкция"],
        ["unknown", "Не знаю", "Сначала определим платформу по точной модели"],
      ],
    },
    secondary: {
      legend: "2. Что показывает официальный магазин?",
      options: [
        ["official-store", "Приложение найдено", "Карточка открыта в штатном магазине платформы"],
        ["not-found", "Приложение не найдено", "В официальном каталоге его нет"],
        ["apk-only", "Нашёл только файл APK", "Официальный магазин путь не подтверждает"],
        ["unknown", "Не знаю", "Источник приложения ещё не проверен"],
      ],
    },
    tertiary: {
      defaultValue: "",
      legend: "Сеть и учётная запись магазина готовы?",
      options: [
        ["ready", "Да, оба условия готовы"],
        ["no-network", "Нет подключения к сети"],
        ["no-account", "Нет готовой учётной записи"],
        ["unknown", "Не уверен"],
      ],
    },
    detail: {
      defaultValue: "",
      legend: () => "Что официальный магазин сообщает о памяти?",
      options: [
        ["enough-space", "Места достаточно"],
        ["low-space", "Места не хватает"],
        ["unknown", "Не знаю"],
      ],
      show: () => true,
    },
    confirmationTitle: "Подтвердите условия штатной установки",
    confirmationDescription: "Мастер продолжит только после проверки сети, учётной записи и памяти. Название платформы не гарантирует наличие приложения для конкретной модели и региона.",
    referenceSourceIds: [
      "samsung-tv-app-install",
      "lg-tv-app-install",
      "google-tv-app-install",
      "yaos-tv-apps",
    ],
    next: {
      href: "/televizor-ne-podklyuchaetsya-k-internetu/",
      label: "Магазин не открывается? Проверить подключение телевизора к интернету",
    },
  },
  "tv-factory-reset": {
    Icon: TelevisionSimple,
    requireConfirmation: true,
    kicker: "Необратимое действие — только последним шагом",
    title: "Мастер полного сброса",
    description: "Полный сброс удаляет учётные записи, сеть, каналы, настройки и установленные приложения. Он не откатывает прошивку и не заменяет обычный перезапуск или диагностику.",
    buttonLabel: "Проверить границу сброса",
    loadingLabel: "Проверяем цель и готовность к удалению…",
    toolId: "tv_factory_reset",
    primary: {
      legend: "1. Какая платформа у телевизора?",
      options: [
        ["samsung", "Samsung", "Точная модель из обычного информационного экрана"],
        ["lg-webos", "LG webOS", "Платформа подтверждена по модели"],
        ["google-android", "Google TV или Android TV", "Система подтверждена по модели"],
        ["yaos", "YaOS", "ТВ Станция или телевизор на YaOS"],
        ["other", "Другая платформа", "Нужна отдельная официальная инструкция"],
        ["unknown", "Не знаю", "Сначала определим платформу по точной модели"],
      ],
    },
    secondary: {
      legend: "2. Зачем нужен сброс?",
      options: [
        ["restart-only", "Нужен только перезапуск", "Удалять данные и настройки не требуется"],
        ["troubleshooting", "Для подтверждённой диагностики", "Сброс прямо указан следующим шагом для точной модели"],
        ["sale-transfer", "Перед продажей или передачей", "Нужно удалить данные владельца"],
        ["unknown", "Не уверен", "Цель полного сброса не подтверждена"],
      ],
    },
    tertiary: {
      defaultValue: "",
      legend: "Владелец готов потерять настройки и данные?",
      options: [
        ["ready-to-erase", "Да, последствия проверены"],
        ["not-ready", "Нет, данные или доступы не готовы"],
        ["unknown", "Не уверен"],
      ],
    },
    detail: {
      defaultValue: "",
      legend: () => "В каком состоянии телевизор сейчас?",
      options: [
        ["normal-menu", "Обычное меню доступно", "Можно следовать инструкции точной модели"],
        ["no-menu", "Обычное меню недоступно", "Скрытый сброс не используем"],
        ["update-running", "Обновление уже идёт", "Сброс и выключение запрещены"],
        ["unsafe", "Есть опасный признак", "Нагрев, жидкость, искры или повреждение"],
        ["unknown", "Не уверен", "Состояние нельзя подтвердить"],
      ],
      columns: "grid-cols-1 sm:grid-cols-2",
      show: () => true,
    },
    confirmationTitle: "Явно подтвердите готовность к удалению",
    confirmationDescription: "Полный сброс удаляет пользовательские настройки, настроенные каналы, учётные записи и данные, а также установленные приложения. Прошивка при этом не откатывается.",
    referenceSourceIds: [
      "samsung-tv-reset",
      "lg-tv-reset",
      "sony-tv-reset",
      "yaos-tv-reset",
    ],
    next: {
      href: "/televizor-sam-vyklyuchaetsya/",
      label: "Сброс рассматривается из-за отключений? Сначала открыть диагностику",
    },
  },
};

const statusCopy = {
  ready: ["Маршрут готов", "Условия подтверждены", "text-verified"],
  "action-plan": ["План проверки готов", "Начните с одного безопасного действия", "text-verified"],
  "needs-check": ["План проверки", "Нужно подтвердить один признак", "text-technical"],
  "no-direct-path": ["Маршрут остановлен", "Совместимость не подтверждена", "text-action"],
  "provider-path": ["Источник определён", "Настройка выполняется на приставке", "text-technical"],
  "reversible-baseline": ["План готов", "Изменения можно вернуть", "text-verified"],
  "service-boundary": ["Самостоятельную проверку останавливаем", "Нужна модельная поддержка или сервис", "text-action"],
  "external-path": ["Внешний путь определён", "Следующая проверка — у подключённого устройства", "text-technical"],
};

const resultTypes = {
  ready: "ready_plan",
  "action-plan": "action_plan",
  "needs-check": "needs_check_plan",
  "no-direct-path": "no_direct_path_plan",
  "provider-path": "provider_path_plan",
  "reversible-baseline": "reversible_baseline_plan",
  "service-boundary": "service_boundary_plan",
  "external-path": "external_path_plan",
};

const sourceOptionalStepIds = new Set([
  "provider-channel-list",
]);

function localPlanError() {
  return new Error("Локальный модуль вернул неполный или неподдерживаемый план");
}

function requirePlanText(value) {
  if (typeof value !== "string" || !value.trim()) throw localPlanError();
  return value.trim();
}

export function normalizeTvTrafficTaskPlan(rawPlan, expectedTask) {
  if (!rawPlan || typeof rawPlan !== "object" || Array.isArray(rawPlan)) throw localPlanError();
  const status = requirePlanText(rawPlan.status);
  const task = requirePlanText(rawPlan.task);
  if (!Object.hasOwn(resultTypes, status) || task !== expectedTask) throw localPlanError();
  // The published picture setup predates this bounded diagnostic cohort and can
  // append one HDR-context step to its four-step reversible baseline.
  const maxSteps = expectedTask === "picture-setup" ? 5 : 4;
  if (!Array.isArray(rawPlan.steps) || rawPlan.steps.length === 0 || rawPlan.steps.length > maxSteps) {
    throw localPlanError();
  }

  const stepIds = new Set();
  const steps = rawPlan.steps.map((rawStep) => {
    if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) throw localPlanError();
    const id = requirePlanText(rawStep.id);
    if (stepIds.has(id)) throw localPlanError();
    stepIds.add(id);
    if (!Array.isArray(rawStep.source_ids)) throw localPlanError();
    const sourceIds = [...new Set(rawStep.source_ids.map((sourceId) => {
      const sourceIdText = requirePlanText(sourceId);
      const normalizedId = sourceAliases[sourceIdText] ?? sourceIdText;
      if (!sourceRegistry[normalizedId]) throw localPlanError();
      return normalizedId;
    }))];
    if (sourceIds.length === 0 && !sourceOptionalStepIds.has(id)) throw localPlanError();
    return {
      id,
      title: requirePlanText(rawStep.title),
      instruction: requirePlanText(rawStep.instruction),
      source_ids: sourceIds,
      stop_condition: requirePlanText(rawStep.stop_condition),
    };
  });

  if (!Array.isArray(rawPlan.warnings) || rawPlan.warnings.length > 3) throw localPlanError();
  const warnings = rawPlan.warnings.map(requirePlanText);
  const primaryStepId = rawPlan.primary_step_id == null
    ? steps[0].id
    : requirePlanText(rawPlan.primary_step_id);
  if (!stepIds.has(primaryStepId)) throw localPlanError();

  return {
    status,
    task,
    primary_step_id: primaryStepId,
    headline: requirePlanText(rawPlan.headline),
    explanation: requirePlanText(rawPlan.explanation),
    steps,
    warnings,
    privacy: requirePlanText(rawPlan.privacy),
  };
}

export function TvTrafficTaskWizard({ task }) {
  const config = configs[task];
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [tertiary, setTertiary] = useState(config?.tertiary.defaultValue ?? "");
  const [detail, setDetail] = useState(config?.detail.defaultValue ?? "unknown");
  const [requestState, setRequestState] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const resultHeadingRef = useRef(null);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  const resultSources = useMemo(() => {
    if (!result) return [];
    const ids = new Set(
      result.steps.flatMap((step) => step.source_ids),
    );
    return [...ids].map((id) => ({ id, ...sourceRegistry[id] }));
  }, [result]);

  if (!config) return null;
  const Icon = config.Icon;
  const secondarySkipped = config.skipSecondary?.({ primary }) === true;
  const detailVisible = !secondarySkipped && config.detail.show({ primary, secondary });
  const requiresConfirmation = config.requireConfirmation === true && !secondarySkipped;
  const canSubmit = Boolean(
    primary
      && (secondarySkipped || secondary)
      && (!requiresConfirmation || (tertiary && (!detailVisible || detail))),
  );

  function invalidate() {
    requestGenerationRef.current += 1;
    setRequestState("idle");
    setResult(null);
    setError(null);
  }

  function choose(setter, value) {
    setter(value);
    invalidate();
  }

  async function runCalculation() {
    if (!canSubmit || requestState === "loading") return;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    setRequestState("loading");
    setError(null);
    setResult(null);
    try {
      const rawPlan = await calculateTvTrafficTask({
        task,
        primary,
        secondary: secondarySkipped ? "unknown" : secondary,
        tertiary: secondarySkipped ? "unknown" : tertiary,
        detail: detailVisible ? detail : "unknown",
      });
      const plan = normalizeTvTrafficTaskPlan(rawPlan, task);
      if (generation !== requestGenerationRef.current) return;
      setResult(plan);
      setRequestState("ready");
      emitResultCompleted(window, {
        toolId: config.toolId,
        resultType: resultTypes[plan.status],
      });
    } catch (caught) {
      if (generation !== requestGenerationRef.current) return;
      setResult(null);
      setRequestState("error");
      setError(caught instanceof Error ? caught.message : "Не удалось составить план");
    }
  }

  async function submit(event) {
    event.preventDefault();
    await runCalculation();
  }

  const confirmationFields = (
    <div className="space-y-7 pb-5 pt-2">
      <ChoiceGrid
        columns="sm:grid-cols-3"
        disabled={requestState === "loading"}
        legend={config.tertiary.legend}
        name={`${task}-tertiary`}
        onChange={(value) => choose(setTertiary, value)}
        options={config.tertiary.options}
        value={tertiary}
      />
      {detailVisible ? (
        <TriStateChoice
          columns="grid-cols-1 sm:grid-cols-3"
          configuredColumns={config.detail.columns}
          disabled={requestState === "loading"}
          legend={config.detail.legend({ primary, secondary })}
          name={`${task}-detail`}
          onChange={(value) => choose(setDetail, value)}
          options={config.detail.options}
          value={detail}
        />
      ) : null}
    </div>
  );

  return (
    <section
      className="border-y-2 border-ink py-7"
      data-analytics-tool={config.toolId}
      data-tv-traffic-task={task}
      id="мастер"
    >
      <div className="grid min-w-0 gap-7 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-wrap items-start gap-4">
          <Icon aria-hidden="true" className="size-[min(3.5rem,18vw)] shrink-0 text-action" />
          <div className="min-w-[min(12rem,100%)] flex-1 [overflow-wrap:anywhere]">
            <p className="font-mono text-[min(0.75rem,4.5vw)] uppercase tracking-[0.12em] text-action">
              {config.kicker}
            </p>
            <h2 className="mt-2 font-display text-[min(2.25rem,14vw)] font-bold leading-none">
              {config.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {config.description}
            </p>
          </div>
        </div>

        <form aria-busy={requestState === "loading"} className="min-w-0" onSubmit={submit}>
          <ChoiceGrid
            columns="sm:grid-cols-2"
            disabled={requestState === "loading"}
            legend={config.primary.legend}
            name={`${task}-primary`}
            onChange={(value) => choose(setPrimary, value)}
            options={config.primary.options}
            value={primary}
          />

          {primary && !secondarySkipped ? (
            <div className="mt-7" data-wizard-step="secondary">
              <ChoiceGrid
                columns="sm:grid-cols-2"
                disabled={requestState === "loading"}
                legend={config.secondary.legend}
                name={`${task}-secondary`}
                onChange={(value) => choose(setSecondary, value)}
                options={config.secondary.options}
                value={secondary}
              />
            </div>
          ) : secondarySkipped ? (
            <p
              className="mt-5 border-l-2 border-danger pl-4 text-sm font-semibold leading-relaxed text-danger"
              data-wizard-secondary-skipped={primary === "yes" ? "danger" : "unconfirmed"}
              role="status"
            >
              {primary === "yes"
                ? "Опасные признаки отмечены. Дополнительные наблюдения не нужны — остановите самостоятельную проверку."
                : "Безопасность не подтверждена. Второй вопрос не нужен — мастер даст безопасную границу остановки."}
            </p>
          ) : (
            <p className="mt-5 border-l-2 border-line pl-4 text-sm text-muted" aria-live="polite">
              Далее — уточним второе наблюдение.
            </p>
          )}

          {primary && secondary && !secondarySkipped ? (
            requiresConfirmation ? (
              <section
                className="mt-7 border-y-2 border-ink py-5"
                data-wizard-confirmation-required="true"
              >
                <h3 className="font-display text-xl font-bold">
                  {config.confirmationTitle ?? "Обязательное подтверждение перед расчётом"}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {config.confirmationDescription
                    ?? "Отметьте совместимость, безопасный доступ и состояние подключения. Без этих ответов мастер не предложит действие."}
                </p>
                <div className="mt-5">{confirmationFields}</div>
              </section>
            ) : (
              <details className="group mt-7 border-y border-line py-1">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
                  Уточнить наблюдения — необязательно
                  <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                {confirmationFields}
              </details>
            )
          ) : null}

          <button
            className="primary-button mt-7 min-h-14 w-full sm:w-auto"
            disabled={!canSubmit || requestState === "loading"}
            type="submit"
          >
            {requestState === "loading" ? config.loadingLabel : config.buttonLabel}
            {requestState !== "loading" ? <ArrowRight aria-hidden="true" /> : null}
          </button>

          {requestState === "loading" ? (
            <p className="mt-2 text-sm text-muted" role="status">
              Ответы сохранены. Загружаем локальный модуль.
            </p>
          ) : null}

          {error ? (
            <div className="mt-5 border-2 border-danger p-4" role="alert">
              <div className="flex gap-3">
                <WarningCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-danger" />
                <div>
                  <p className="font-semibold text-danger">Не удалось составить план.</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{error}. Выбранные ответы сохранены.</p>
                </div>
              </div>
              <button
                className="secondary-button mt-4 min-h-12"
                disabled={requestState === "loading"}
                onClick={() => void runCalculation()}
                type="button"
              >
                Повторить
              </button>
            </div>
          ) : null}
        </form>
      </div>

      {result ? (
        <TrafficTaskResult
          config={config}
          result={result}
          resultHeadingRef={resultHeadingRef}
          sources={resultSources}
          task={task}
        />
      ) : null}
    </section>
  );
}

function ChoiceGrid({ columns = "sm:grid-cols-3", disabled = false, legend, name, onChange, options, value }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="font-display text-xl font-bold">{legend}</legend>
      <div className={`mt-3 grid gap-px border border-ink bg-ink ${columns}`}>
        {options.map(([optionValue, label, description], optionIndex) => (
          <label
            className={`relative flex min-h-16 flex-col justify-center bg-paper px-4 py-3 transition focus-within:z-10 focus-within:ring-2 focus-within:ring-action ${
              columns.includes("sm:grid-cols-2") && options.length % 2 === 1 && optionIndex === options.length - 1
                ? "sm:col-span-2"
                : ""
            } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${
              value === optionValue ? "bg-white text-ink" : "hover:bg-white/70"
            }`}
            key={optionValue}
          >
            <input
              checked={value === optionValue}
              className="peer sr-only"
              name={name}
              onChange={() => onChange(optionValue)}
              type="radio"
              value={optionValue}
            />
            <span className="font-display text-lg font-bold [overflow-wrap:anywhere] peer-checked:text-action">{label}</span>
            {description ? <span className="mt-1 text-xs leading-relaxed text-muted">{description}</span> : null}
            <span className="absolute right-3 top-3 size-2 rounded-full border border-ink bg-paper peer-checked:border-action peer-checked:bg-action" aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TriStateChoice({
  columns = "grid-cols-1 sm:grid-cols-3",
  configuredColumns,
  disabled = false,
  legend,
  name,
  onChange,
  options = [
    ["yes", "Да"],
    ["no", "Нет"],
    ["unknown", "Не знаю"],
  ],
  value,
}) {
  return (
    <ChoiceGrid
      columns={configuredColumns ?? columns}
      disabled={disabled}
      legend={legend}
      name={name}
      onChange={onChange}
      options={options}
      value={value}
    />
  );
}

function TrafficTaskResult({ config, result, resultHeadingRef, sources, task }) {
  const [kicker, statusLabel, statusClassName] = statusCopy[result.status];
  const primaryStep = result.steps.find((step) => step.id === result.primary_step_id);
  const remainingSteps = result.steps.filter((step) => step.id !== result.primary_step_id);
  return (
    <section
      className="mt-8 border-t-2 border-ink pt-7"
      data-tv-traffic-result={result.status}
      data-tv-traffic-result-task={task}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">{kicker}</p>
          <h2
            className="mt-2 font-display text-4xl font-extrabold leading-tight outline-none focus-visible:ring-2 focus-visible:ring-action"
            ref={resultHeadingRef}
            tabIndex={-1}
          >
            {result.headline}
          </h2>
          <p className="mt-3 max-w-4xl leading-relaxed text-muted">{result.explanation}</p>
        </div>
        <div className="border-l-2 border-line pl-5">
          <p className="font-mono text-xs uppercase text-muted">Статус</p>
          <p className={`mt-2 font-display text-2xl font-bold ${statusClassName}`}>{statusLabel}</p>
        </div>
      </div>

      <TrafficTaskStep index={1} primary step={primaryStep} />

      {remainingSteps.length ? (
        <details className="group mt-6 border-y border-line py-1" data-tv-traffic-remaining="true">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
            Если не помогло — ещё {remainingSteps.length === 1 ? "одна проверка" : `${remainingSteps.length} проверки`}
            <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <ol className="border-t border-line">
            {remainingSteps.map((step, index) => (
              <TrafficTaskStep index={index + 2} key={step.id} step={step} />
            ))}
          </ol>
        </details>
      ) : null}

      {task === "picture-setup" ? <PictureCheckPatterns /> : null}

      <details className="group mt-7 border-y border-line py-1">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
          Ограничения результата
          <span className="text-action transition group-open:rotate-45" aria-hidden="true">+</span>
        </summary>
        <div className="space-y-3 pb-5 pt-1">
          {result.warnings.map((warning) => (
            <p className="flex gap-3 text-sm leading-relaxed text-muted" key={warning}>
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-technical" />
              {warning}
            </p>
          ))}
          <p className="text-sm leading-relaxed text-muted">{result.privacy}</p>
        </div>
      </details>

      {sources.length ? (
        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Источники результата">
          {sources.map((source) => (
            <a
              className="text-technical underline underline-offset-4"
              data-tv-traffic-source={source.id}
              href={source.url}
              key={source.id}
              rel="noreferrer"
              target="_blank"
            >
              {source.label}
            </a>
          ))}
        </nav>
      ) : null}

      <p className="mt-6">
        <a className="font-semibold text-action underline underline-offset-4" href={config.next.href}>
          {config.next.label} <ArrowRight aria-hidden="true" className="inline size-4" />
        </a>
      </p>
    </section>
  );
}

function TrafficTaskStep({ index, primary = false, step }) {
  const content = (
    <div className="grid min-w-0 gap-4 py-5 sm:grid-cols-[3rem_minmax(0,1fr)]">
      <span className="font-display text-3xl font-extrabold text-action" aria-hidden="true">{index}</span>
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
          {primary ? "Сделайте сейчас" : `Проверка ${index}`}
        </p>
        <h3 className="mt-2 font-display text-2xl font-bold [overflow-wrap:anywhere]">{step.title}</h3>
        <p className="mt-2 max-w-4xl leading-relaxed">{step.instruction}</p>
        <p className="mt-3 border-l-2 border-technical pl-4 text-sm leading-relaxed text-muted">
          <strong className="text-ink">Остановитесь, если:</strong> {step.stop_condition}
        </p>
      </div>
    </div>
  );

  if (primary) {
    return (
      <article className="mt-7 border-y-2 border-ink" data-tv-traffic-primary-step={step.id}>
        {content}
      </article>
    );
  }
  return <li className="border-b border-line last:border-b-0" data-tv-traffic-step={step.id}>{content}</li>;
}

function PictureCheckPatterns() {
  const shades = ["opacity-5", "opacity-10", "opacity-20", "opacity-30", "opacity-40", "opacity-50", "opacity-60", "opacity-70", "opacity-80", "opacity-90"];
  return (
    <section className="mt-8 border-t border-line pt-6" data-picture-check-patterns="true">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">Локальные тест-паттерны</p>
      <h3 className="mt-2 font-display text-3xl font-extrabold">Сравните, не копируя чужие числа</h3>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
        Откройте страницу на телевизоре или выведите её тем же способом, который настраиваете. Паттерны помогают сравнить режимы, но не измеряют точность панели.
      </p>
      <div className="mt-5 grid gap-px border border-ink bg-ink lg:grid-cols-3">
        <figure className="bg-paper p-4">
          <figcaption className="font-display text-xl font-bold">Ступени серого</figcaption>
          <div className="mt-4 grid h-40 grid-cols-5 border border-line bg-white" aria-label="Десять ступеней серого">
            {shades.map((opacity) => <span className={`bg-ink ${opacity}`} key={opacity} />)}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">Соседние ступени должны различаться; точное число уровней зависит от всей цепочки.</p>
        </figure>
        <figure className="bg-paper p-4">
          <figcaption className="font-display text-xl font-bold">Чёрно-белая сетка</figcaption>
          <svg className="mt-4 block h-40 w-full border border-line bg-white text-ink" role="img" viewBox="0 0 10 8" aria-label="Чередующаяся чёрно-белая сетка для проверки резкости">
            {Array.from({ length: 80 }, (_, index) => {
              const x = index % 10;
              const y = Math.floor(index / 10);
              return (x + y) % 2 === 0 ? <rect fill="currentColor" height="1" key={index} width="1" x={x} y={y} /> : null;
            })}
          </svg>
          <p className="mt-3 text-xs leading-relaxed text-muted">Ищите лишние светлые контуры; меняйте только резкость или аналогичный параметр.</p>
        </figure>
        <figure className="bg-paper p-4">
          <figcaption className="font-display text-xl font-bold">Равномерное поле</figcaption>
          <div className="mt-4 h-40 border border-line bg-line" aria-label="Равномерное нейтральное поле" />
          <p className="mt-3 text-xs leading-relaxed text-muted">Смотрите с обычного места. Фото телефона, компрессия и углы обзора могут создавать ложные пятна.</p>
        </figure>
      </div>
    </section>
  );
}

export function TvTrafficTaskReference({ task }) {
  const config = configs[task];
  if (!config) return null;
  return (
    <section className="border-b-2 border-ink py-7" data-tv-traffic-reference={task}>
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Проверено 1 августа 2026</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold">Откуда взяты шаги</h2>
      <p className="mt-3 max-w-4xl leading-relaxed text-muted">
        Мастер использует только совпадающие безопасные действия из официальных инструкций. Точные названия меню, поддержка функций и модельные процедуры всегда проверяются по инструкции телевизора или подключённого устройства.
      </p>
      <nav className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Официальные источники мастера">
        {config.referenceSourceIds.map((id) => (
          <a
            className="text-technical underline underline-offset-4"
            data-tv-traffic-reference-source={id}
            href={sourceRegistry[id].url}
            key={id}
            rel="noreferrer"
            target="_blank"
          >
            {sourceRegistry[id].label}
          </a>
        ))}
      </nav>
    </section>
  );
}
