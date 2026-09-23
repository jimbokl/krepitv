// Controlled observations only: no model, account, title or free-text input.
export const SUBTITLE_SOURCES = Object.freeze([
  { id: "broadcast", label: "Телеканал через антенну или кабель" },
  { id: "app", label: "Встроенное приложение" },
  { id: "hdmi", label: "Приставка через HDMI" },
  { id: "multiple", label: "Несколько источников" },
  { id: "unknown", label: "Пока не знаю" },
]);

export const SUBTITLE_TESTS = Object.freeze({
  broadcast: [
    { id: "teletext", label: "Есть режим TTX/MIX или отдельная страница телетекста" },
    { id: "captions", label: "Текст поверх передачи, режим TTX не включён" },
    { id: "unclear", label: "Не могу различить" },
  ],
  app: [
    { id: "one_video", label: "Только в одном видео" },
    { id: "whole_app", label: "В разных видео этого приложения" },
    { id: "unclear", label: "Не удалось сравнить" },
  ],
  hdmi: [
    { id: "only_hdmi", label: "На другом входе текст исчез" },
    { id: "also_elsewhere", label: "На другом входе текст тоже есть" },
    { id: "unclear", label: "Не могу переключить вход" },
  ],
  multiple: [
    { id: "home_menu", label: "Текст виден даже поверх домашнего меню без видео" },
    { id: "content_only", label: "Только при просмотре видео или каналов" },
    { id: "unclear", label: "Не удалось проверить" },
  ],
  unknown: [
    { id: "one_source", label: "После переключения текст остался только в одном источнике" },
    { id: "many_sources", label: "Текст есть в нескольких источниках" },
    { id: "unclear", label: "Не могу переключить источник" },
  ],
});

export const SUBTITLE_ACCESS = Object.freeze([
  { id: "yes", label: "Да, субтитры нужны другому зрителю" },
  { id: "no", label: "Нет" },
  { id: "unknown", label: "Не знаю" },
]);

const ROUTES = Object.freeze({
  teletext: {
    title: "Вероятный источник — телетекст канала",
    action: "Проверьте режим TTX/MIX на пульте или экранном пульте. Закройте телетекст и вернитесь к тому же каналу. Кнопки и порядок переключения зависят от модели.",
    check: "Если текст исчез, причина была в режиме телетекста. Если нет — проверьте обычные субтитры канала по инструкции вашей модели.",
  },
  broadcast: {
    title: "Вероятный источник — субтитры телеканала",
    action: "Проверьте настройку субтитров для ТВ-вещания в инструкции точной модели. Не меняйте настройки онлайн-кинотеатра или приставки наугад.",
    check: "Вернитесь к тому же каналу и сравните другой канал: доступность субтитров зависит и от вещателя.",
  },
  app: {
    title: "Вероятный источник — плеер приложения",
    action: "Во время воспроизведения откройте настройки языка или значок субтитров в самом плеере. Если это только одно видео, проверьте именно его настройки.",
    check: "Сравните другое видео в этом приложении. Системная настройка телевизора может не влиять на субтитры приложения.",
  },
  external: {
    title: "Вероятный источник — HDMI-приставка или приложение на ней",
    action: "Откройте меню субтитров самой приставки или её видеоприложения. Меню телевизора не обязательно управляет текстом на HDMI-входе.",
    check: "Вернитесь на тот же HDMI-вход и проверьте тот же контент после обратимого изменения.",
  },
  tv_possible: {
    title: "Возможен интерфейсный текст телевизора, но источник ещё не подтверждён",
    action: "Без воспроизведения видео откройте настройки специальных возможностей точной модели. Сравните видимый текст с системным меню; не отключайте всё подряд.",
    check: "Если это не субтитры, а обычные надписи меню или уведомления, не меняйте настройки субтитров. Сверьтесь с руководством производителя.",
  },
  unknown: {
    title: "Источник пока не определён",
    action: "Сравните один телеканал, одно встроенное приложение и другой HDMI-вход, если они доступны. Запишите, где текст появляется и исчезает; затем повторите мастер.",
    check: "Если меню или вход недоступны, не сбрасывайте телевизор и не угадывайте настройку. Найдите руководство по полной модели или обратитесь в поддержку.",
  },
});

export function subtitleRoute(input) {
  const { source, observation, access } = input ?? {};
  if (!SUBTITLE_TESTS[source]?.some((item) => item.id === observation)) return null;
  if (!SUBTITLE_ACCESS.some((item) => item.id === access)) return null;

  let route = "unknown";
  if (source === "broadcast" && observation === "teletext") route = "teletext";
  if (source === "broadcast" && observation === "captions") route = "broadcast";
  if (source === "app" && observation !== "unclear") route = "app";
  if (source === "hdmi" && observation === "only_hdmi") route = "external";
  if (source === "multiple" && observation === "home_menu") route = "tv_possible";

  return {
    id: route,
    ...ROUTES[route],
    accessibility: access === "yes"
      ? "Субтитры нужны другому зрителю: сначала согласуйте изменение. По возможности меняйте настройку только в нужном канале, видео или приложении и сохраните способ вернуть её."
      : access === "unknown"
        ? "Если телевизором пользуются другие люди, спросите, нужны ли им субтитры, прежде чем менять общую настройку."
        : "Это обратимое изменение. Запомните исходное состояние настройки, чтобы при необходимости вернуть субтитры.",
  };
}

export function validSubtitleState(input) {
  const source = SUBTITLE_SOURCES.some((item) => item.id === input?.source) ? input.source : "";
  const observation = SUBTITLE_TESTS[source]?.some((item) => item.id === input?.observation)
    ? input.observation : "";
  const access = SUBTITLE_ACCESS.some((item) => item.id === input?.access) ? input.access : "";
  return { source, observation, access };
}
