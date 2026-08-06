export function isIndexableSeoPage(page) {
  return page?.indexable === true;
}

export function getHomeFeaturedPages(pages, limit = 4) {
  return pages
    .filter(
      (page) =>
        isIndexableSeoPage(page)
        && Number.isInteger(page.home_priority)
        && page.home_priority > 0,
    )
    .sort(
      (left, right) =>
        left.home_priority - right.home_priority
        || left.id.localeCompare(right.id, "ru"),
    )
    .slice(0, limit);
}

const HOME_DIAGNOSTIC_PAGE_IDS = [
  "tv-wont-turn-on",
  "tv-freezes",
  "tv-dark-screen",
  "tv-sound-no-picture",
  "tv-no-sound",
  "tv-remote-not-working",
  "tv-turns-off",
  "tv-no-internet",
  "tv-usb-not-seen",
];

export function getHomeDiagnosticPages(pages) {
  return HOME_DIAGNOSTIC_PAGE_IDS.flatMap((id) => {
    const page = pages.find((item) => item.id === id && isIndexableSeoPage(item));
    return page ? [page] : [];
  });
}

export function getRelatedPages(page, pages, limit = 6) {
  const preferred = preferredRelatedIds(page.id);
  return pages
    .filter((item) => item.id !== page.id && isIndexableSeoPage(item))
    .map((item, index) => ({
      item,
      index,
      score: preferred.includes(item.id)
        ? preferred.indexOf(item.id)
        : preferred.length + (item.kind === page.kind ? 0 : 1),
    }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .slice(0, limit)
    .map(({ item }) => item);
}

export function getModelContextPages(model, pages) {
  if (!model) return [];

  const candidates = [
    {
      id: "tv-dimensions",
      label: "Сверить размеры экрана и корпуса",
    },
    {
      id: "wall-planner",
      label: "Примерить телевизор на стене",
    },
    {
      id: "vesa",
      label: "VESA по модели и ручная проверка",
    },
    {
      id: `brand-${String(model.brand ?? "").trim().toLocaleLowerCase("ru-RU")}`,
      label: `Кронштейны для телевизоров ${model.brand}`,
    },
    {
      id: `diagonal-${Number(model.diagonal_inches)}`,
      label: `Кронштейны для телевизоров ${Number(model.diagonal_inches)}″`,
    },
  ];
  if (model.wall_mount_screws?.groups?.length) {
    candidates.push({
      id: "tv-mount-screws",
      label: "Винты VESA по точной модели",
    });
  }
  if (!model.wall_mount_screws?.vesa_conflict) {
    candidates.push({
      id: `vesa-${model.vesa_width_mm}x${model.vesa_height_mm}`,
      label: `Модели с VESA ${model.vesa_width_mm}×${model.vesa_height_mm}`,
    });
  }

  return candidates.flatMap((candidate) => {
    const page = pages.find((item) => item.id === candidate.id && isIndexableSeoPage(item));
    return page ? [{ ...candidate, path: page.path }] : [];
  });
}

function preferredRelatedIds(pageId) {
  if (pageId === "tv-mount-screws") {
    return [
      "vesa",
      "how-to-find-vesa",
      "mounting-map",
      "wall-mounted-tv",
      "buy-tv-mount",
      "fixed-mount",
    ];
  }
  if (pageId.startsWith("mount-brand-")) {
    return [
      "buy-tv-mount",
      "extendable-mount",
      "full-motion-mount",
      "tilt-mount",
      "mount-brand-onkron",
      "mount-brand-kromax",
      "mount-brand-holder",
      "mount-brand-itechmount",
      "mount-brand-godoo",
    ];
  }
  if (pageId.startsWith("brand-")) {
    return [
      "diagonal-50",
      "diagonal-55",
      "diagonal-75",
      "vesa-300x300",
      "vesa-400x400",
      "brand-lg",
      "brand-samsung",
      "brand-hisense",
      "brand-tcl",
      "brand-xiaomi",
    ];
  }
  if (pageId.startsWith("diagonal-")) {
    return [
      "tv-dimensions",
      "buy-tv-mount",
      "mounting-height",
      "vesa",
      "brand-lg",
      "brand-samsung",
      "brand-hisense",
      "brand-tcl",
      "brand-xiaomi",
    ];
  }
  if (/^vesa-\d+x\d+$/i.test(pageId)) {
    return [
      "vesa",
      "how-to-find-vesa",
      "buy-tv-mount",
      "diagonal-50",
      "diagonal-55",
      "diagonal-75",
      "brand-lg",
      "brand-samsung",
    ];
  }

  const groups = {
    "tv-wont-turn-on": ["tv-freezes", "tv-remote-not-working", "tv-turns-off", "tv-dark-screen", "tv-model-lookup", "tv-firmware-update"],
    "tv-antenna-connect": ["digital-channels", "digital-box-connect", "tv-no-signal", "tv-model-lookup", "tv-aspect-ratio", "smart-tv-box"],
    "tv-freezes": ["tv-wont-turn-on", "tv-factory-reset", "tv-firmware-update", "tv-app-install", "tv-remote-not-working", "tv-no-internet"],
    "digital-box-connect": ["smart-tv-box", "tv-antenna-connect", "tv-no-signal", "digital-channels", "game-console-to-tv", "tv-aspect-ratio"],
    "tv-dark-screen": ["tv-sound-no-picture", "picture-setup", "tv-aspect-ratio", "tv-no-signal", "tv-wont-turn-on", "screen-cleaning"],
    "tv-storage-cleanup": ["tv-app-install", "tv-freezes", "tv-firmware-update", "tv-factory-reset", "tv-no-internet", "tv-model-lookup"],
    "phone-tv-remote": ["tv-remote-not-working", "phone-to-tv", "tv-no-internet", "tv-model-lookup", "tv-app-install", "tv-no-signal"],
    "game-console-to-tv": ["tv-no-signal", "picture-setup", "smart-tv-box", "tv-aspect-ratio", "soundbar-to-tv", "digital-box-connect"],
    "tv-model-lookup": ["vesa", "tv-mount-screws", "tv-firmware-update", "tv-app-install", "tv-wont-turn-on", "buy-tv-mount"],
    "tv-aspect-ratio": ["picture-setup", "tv-dark-screen", "tv-no-signal", "game-console-to-tv", "tv-dimensions", "viewing-distance"],
    "tv-no-signal": ["tv-sound-no-picture", "digital-channels", "laptop-to-tv", "phone-to-tv", "tv-no-internet", "tv-turns-off"],
    "tv-sound-no-picture": ["tv-no-signal", "picture-setup", "tv-no-sound", "tv-turns-off", "tv-remote-not-working", "laptop-to-tv"],
    "tv-no-sound": ["tv-speakers", "tv-headphones", "soundbar-to-tv", "tv-sound-no-picture", "tv-no-signal", "tv-remote-not-working", "tv-turns-off"],
    "tv-remote-not-working": ["phone-tv-remote", "tv-no-sound", "tv-sound-no-picture", "tv-no-signal", "tv-turns-off", "digital-channels"],
    "tv-turns-off": ["tv-energy-consumption", "tv-no-internet", "tv-no-signal", "tv-sound-no-picture", "tv-no-sound", "picture-setup"],
    "tv-no-internet": ["tv-usb-not-seen", "digital-channels", "tv-no-signal", "phone-to-tv", "laptop-to-tv", "smart-tv-box", "tv-turns-off"],
    "tv-usb-not-seen": ["tv-no-internet", "tv-no-signal", "laptop-to-tv", "phone-to-tv", "tv-remote-not-working", "digital-channels"],
    "phone-to-tv": ["laptop-to-tv", "tv-no-signal", "tv-no-internet", "tv-usb-not-seen", "smart-tv-box", "picture-setup", "tv-dimensions"],
    "laptop-to-tv": ["tv-no-signal", "phone-to-tv", "tv-no-internet", "tv-usb-not-seen", "picture-setup", "digital-channels"],
    "digital-channels": ["tv-antenna-connect", "digital-box-connect", "tv-no-signal", "tv-no-internet", "picture-setup", "laptop-to-tv", "phone-to-tv"],
    "picture-setup": ["tv-aspect-ratio", "tv-dark-screen", "screen-cleaning", "tv-energy-consumption", "viewing-distance", "tv-dimensions", "wall-planner", "tv-no-signal"],
    "soundbar-to-tv": ["tv-speakers", "tv-no-sound", "tv-no-signal", "picture-setup", "tv-sound-no-picture", "smart-tv-box"],
    "screen-cleaning": ["picture-setup", "tv-sound-no-picture", "tv-turns-off", "tv-no-sound", "wall-planner", "soundbar-to-tv"],
    "smart-tv-box": ["digital-box-connect", "game-console-to-tv", "tv-no-signal", "tv-no-internet", "phone-to-tv", "digital-channels", "soundbar-to-tv"],
    "tv-speakers": ["soundbar-to-tv", "tv-headphones", "tv-no-sound", "smart-tv-box", "picture-setup", "tv-no-signal"],
    "tv-headphones": ["tv-speakers", "soundbar-to-tv", "tv-no-sound", "tv-no-internet", "smart-tv-box", "tv-remote-not-working"],
    "tv-energy-consumption": ["tv-turns-off", "picture-setup", "tv-dimensions", "viewing-distance", "smart-tv-box", "screen-cleaning"],
    "tv-firmware-update": ["tv-app-install", "tv-factory-reset", "tv-no-internet", "tv-turns-off", "tv-remote-not-working", "smart-tv-box"],
    "tv-app-install": ["tv-storage-cleanup", "tv-no-internet", "tv-firmware-update", "smart-tv-box", "tv-factory-reset", "phone-to-tv"],
    "tv-factory-reset": ["tv-firmware-update", "tv-app-install", "tv-turns-off", "tv-no-internet", "tv-remote-not-working", "picture-setup"],
    "wall-mounted-tv": ["mounting-map", "tv-zone-sockets", "vesa", "full-motion-mount", "mounting-height"],
    "wall-planner": ["tv-dimensions", "mounting-height", "mounting-map", "tv-zone-sockets", "viewing-distance", "wall-mounted-tv"],
    "tv-dimensions": ["wall-planner", "viewing-distance", "diagonal-43", "diagonal-55", "diagonal-65", "mounting-height"],
    "mounting-map": ["tv-mount-screws", "tv-zone-sockets", "wall-mounted-tv", "mounting-height", "vesa", "how-to-find-vesa"],
    "tv-zone-sockets": ["mounting-map", "wall-mounted-tv", "mounting-height", "vesa"],
    vesa: ["tv-model-lookup", "tv-mount-screws", "wall-mounted-tv", "how-to-find-vesa"],
    "fixed-mount": ["buy-tv-mount", "mount-brand-onkron", "wall-mounted-tv", "tilt-mount", "full-motion-mount", "mounting-height"],
    "tilt-mount": ["buy-tv-mount", "mount-brand-onkron", "mounting-height", "mounting-map", "wall-mounted-tv", "fixed-mount"],
    "full-motion-mount": ["extendable-mount", "buy-tv-mount", "mount-brand-onkron", "wall-mounted-tv", "fixed-mount", "tilt-mount"],
    "buy-tv-mount": ["wall-mounted-tv", "extendable-mount", "mount-brand-onkron", "vesa", "fixed-mount", "tilt-mount"],
    "extendable-mount": ["buy-tv-mount", "full-motion-mount", "wall-mounted-tv", "mount-brand-onkron", "vesa", "mounting-map"],
    "how-to-find-vesa": ["tv-mount-screws", "vesa", "vesa-200x200", "vesa-300x200"],
    "mounting-height": ["mounting-map", "tilt-mount", "tv-zone-sockets", "wall-mounted-tv", "viewing-distance", "diagonal-55"],
    "viewing-distance": ["tv-dimensions", "mounting-height", "diagonal-55", "full-motion-mount"],
  };
  return groups[pageId] ?? ["vesa", "how-to-find-vesa", "mounting-height"];
}
