import data from "../../../data/subtitle_help.json" with { type: "json" };

export const SUBTITLE_HELP = data;
export { SUBTITLE_PAGE_IDS } from "./subtitlePages.mjs";
export const APPEARANCES = [
  { id: "dialogue", label: "Реплики внизу", hint: "Слова героев, иногда звуки в скобках" },
  { id: "teletext", label: "Текстовая страница", hint: "Цифры, новости, программа передач" },
  { id: "notice", label: "Надпись «888»", hint: "Или сообщение «скрытое субтитрирование»" },
  { id: "unknown", label: "Не похоже / не знаю", hint: "Поможем проверить без догадок" },
];
export const SOURCES = [
  { id: "broadcast", label: "Обычный телеканал", hint: "Антенна подключена прямо к ТВ" },
  { id: "youtube", label: "YouTube", hint: "Встроенное приложение или трансляция" },
  { id: "app", label: "Другое приложение", hint: "Кинопоиск, Иви, Okko, Wink…" },
  { id: "hdmi", label: "Приставка по HDMI", hint: "Канал включаю отдельным пультом" },
  { id: "usb", label: "Фильм с флешки", hint: "USB-накопитель подключён к ТВ" },
  { id: "unknown", label: "Не знаю / везде", hint: "Начнём с проверки источника" },
];
const unclear = { id: "unclear", label: "Не могу проверить / не уверен" };
export const NO_TEXT = { id: "no_text", label: "Текста нет — хочу включить субтитры" };
export const OBSERVATIONS = {
  broadcast: [{ id: "captions", label: "Реплики меняются вместе с речью" }, { id: "teletext", label: "Есть текстовая страница / режим TTX" }, { id: "announcement", label: "Только надпись про 888 или субтитрирование" }, unclear],
  youtube: [{ id: "cc_available", label: "В управлении роликом есть доступный CC" }, { id: "no_cc", label: "CC нет или он неактивен" }, { id: "outside", label: "Текст есть и после выхода из YouTube" }, unclear],
  app: [{ id: "player", label: "Текст только во время фильма в приложении" }, { id: "outside", label: "Текст остался после выхода из приложения" }, unclear],
  hdmi: [{ id: "only_hdmi", label: "На главном экране ТВ текста нет" }, { id: "also_elsewhere", label: "На другом входе текст тоже есть" }, unclear],
  usb: [{ id: "selectable", label: "В меню фильма есть выбор субтитров" }, { id: "sidecar", label: "Рядом с фильмом есть отдельный файл SRT" }, { id: "no_track", label: "Выбора дорожки нет, а текст есть" }, unclear],
  unknown: [{ id: "home_menu", label: "Текст виден даже в главном меню ТВ" }, { id: "content_only", label: "В главном меню текста нет" }, unclear],
};
export const REASONS = [
  { id: "button_missing", label: "Не нашёл кнопку" }, { id: "menu_differs", label: "Другое меню" },
  { id: "text_remains", label: "Текст остался" }, { id: "other", label: "Другая причина" },
];
export function cleanSubtitleAnswers(value = {}) {
  const appearance = APPEARANCES.some(x => x.id === value?.appearance) ? value.appearance : "";
  const source = SOURCES.some(x => x.id === value?.source) ? value.source : "";
  const goal = value?.goal === "enable" ? "enable" : "disable";
  const validObservation = OBSERVATIONS[source]?.some(x => x.id === value?.observation) || (source && goal === "enable" && value?.observation === "no_text");
  return { appearance, source, observation: validObservation ? value.observation : "", goal };
}
export function readSubtitlePlan(value) {
  if (!value || !Object.hasOwn(data.routes, value.route) || !["enable", "disable"].includes(value.goal)) throw new Error("Не удалось проверить маршрут. Попробуйте ещё раз.");
  return { ...data.routes[value.route], id: value.route, action: data.routes[value.route][value.goal], goal: value.goal };
}
export function subtitleHelpText(plan, platformId = "", pageId = "tv-disable-subtitles") {
  const platform = data.platforms.find(x => x.id === platformId);
  const sourcePage = { "tv-disable-subtitles": "kak-otklyuchit-subtitry-na-televizore", "tv-teletext-captions": "kak-ubrat-teletext-i-skrytye-subtitry", "youtube-tv-subtitles": "kak-otklyuchit-subtitry-youtube-na-televizore", "tv-usb-video-subtitles": "kak-otklyuchit-subtitry-v-filme-s-fleshki" }[pageId] ?? "kak-otklyuchit-subtitry-na-televizore";
  return ["Крепи ТВ — помощь с субтитрами", plan.title, plan.action, platform && plan.id === "broadcast" ? `${platform.label}: ${platform.path}. ${platform.scope}` : "", `Проверка: ${plan.check}`, "Если субтитры нужны другому зрителю, согласуйте изменение и запомните исходное состояние.", `https://krepitv.ru/${sourcePage}/#istochniki`].filter(Boolean).join("\n\n");
}
