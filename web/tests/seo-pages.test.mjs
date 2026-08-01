import assert from "node:assert/strict";
import test from "node:test";
import {
  getHomeDiagnosticPages,
  getHomeFeaturedPages,
  getModelContextPages,
  getRelatedPages,
  isIndexableSeoPage,
} from "../src/lib/seoPages.mjs";

test("home features only explicitly prioritized indexable traffic tools", () => {
  const catalog = [
    { id: "vesa", indexable: true },
    { id: "wall-planner", home_priority: 3, indexable: true },
    { id: "tv-dimensions", home_priority: 2, indexable: true },
    { id: "phone-to-tv", home_priority: 1, indexable: true },
    { id: "tv-no-signal", home_priority: 1, indexable: true },
    { id: "laptop-to-tv", home_priority: 4, indexable: true },
    { id: "digital-channels", home_priority: 5, indexable: true },
    { id: "picture-setup", home_priority: 6, indexable: true },
    { id: "thin", home_priority: 5, indexable: false },
    { id: "unprioritized", indexable: true },
  ];

  assert.deepEqual(
    getHomeFeaturedPages(catalog, 7).map((page) => page.id),
    [
      "phone-to-tv",
      "tv-no-signal",
      "tv-dimensions",
      "wall-planner",
      "laptop-to-tv",
      "digital-channels",
      "picture-setup",
    ],
  );
});

test("traffic utilities link to each other without creating diagnostic variants", () => {
  const catalog = [
    { id: "phone-to-tv", kind: "calculator", indexable: true },
    { id: "tv-no-signal", kind: "calculator", indexable: true },
    { id: "tv-dimensions", kind: "calculator", indexable: true },
    { id: "wall-planner", kind: "calculator", indexable: true },
    { id: "laptop-to-tv", kind: "calculator", indexable: true },
    { id: "digital-channels", kind: "calculator", indexable: true },
    { id: "picture-setup", kind: "calculator", indexable: true },
    { id: "tv-sound-no-picture", kind: "calculator", indexable: true },
    { id: "tv-no-sound", kind: "calculator", indexable: true },
    { id: "tv-remote-not-working", kind: "calculator", indexable: true },
    { id: "tv-turns-off", kind: "calculator", indexable: true },
    { id: "tv-no-internet", kind: "calculator", indexable: true },
    { id: "tv-usb-not-seen", kind: "calculator", indexable: true },
    { id: "soundbar-to-tv", kind: "calculator", indexable: true },
    { id: "screen-cleaning", kind: "calculator", indexable: true },
    { id: "smart-tv-box", kind: "calculator", indexable: true },
    { id: "tv-speakers", kind: "calculator", indexable: true },
    { id: "tv-headphones", kind: "calculator", indexable: true },
    { id: "tv-energy-consumption", kind: "calculator", indexable: true },
    { id: "viewing-distance", kind: "calculator", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["laptop-to-tv", "tv-no-signal", "tv-no-internet", "tv-usb-not-seen", "smart-tv-box", "picture-setup"],
  );
  assert.deepEqual(
    getRelatedPages(catalog[1], catalog).map((page) => page.id),
    ["tv-sound-no-picture", "digital-channels", "laptop-to-tv", "phone-to-tv", "tv-no-internet", "tv-turns-off"],
  );
  assert.deepEqual(
    getRelatedPages(catalog[7], catalog).map((page) => page.id),
    ["tv-no-signal", "picture-setup", "tv-no-sound", "tv-turns-off", "tv-remote-not-working", "laptop-to-tv"],
  );
  assert.deepEqual(
    getRelatedPages(catalog[8], catalog).map((page) => page.id),
    ["tv-speakers", "tv-headphones", "soundbar-to-tv", "tv-sound-no-picture", "tv-no-signal", "tv-remote-not-working"],
  );
  assert.deepEqual(
    getRelatedPages(catalog[9], catalog).map((page) => page.id),
    ["tv-no-sound", "tv-sound-no-picture", "tv-no-signal", "tv-turns-off", "digital-channels", "phone-to-tv"],
  );
  assert.deepEqual(
    getRelatedPages(catalog[10], catalog).map((page) => page.id),
    ["tv-energy-consumption", "tv-no-internet", "tv-no-signal", "tv-sound-no-picture", "tv-no-sound", "picture-setup"],
  );
  assert.deepEqual(
    getRelatedPages(catalog[11], catalog).map((page) => page.id),
    ["tv-usb-not-seen", "digital-channels", "tv-no-signal", "phone-to-tv", "laptop-to-tv", "smart-tv-box"],
  );
  assert.deepEqual(
    getRelatedPages(catalog[12], catalog).map((page) => page.id),
    ["tv-no-internet", "tv-no-signal", "laptop-to-tv", "phone-to-tv", "tv-remote-not-working", "digital-channels"],
  );
});

test("home diagnostic block uses six canonical pages without generated variants", () => {
  const catalog = [
    { id: "tv-no-sound", path: "/net-zvuka-na-televizore/", indexable: true },
    { id: "tv-remote-not-working", path: "/ne-rabotaet-pult-ot-televizora/", indexable: true },
    { id: "tv-sound-no-picture", path: "/televizor-zvuk-est-izobrazheniya-net/", indexable: true },
    { id: "tv-no-signal", path: "/televizor-pishet-net-signala/", indexable: true },
    { id: "tv-turns-off", path: "/televizor-sam-vyklyuchaetsya/", indexable: true },
    { id: "tv-no-internet", path: "/televizor-ne-podklyuchaetsya-k-internetu/", indexable: true },
    { id: "tv-usb-not-seen", path: "/televizor-ne-vidit-fleshku/", indexable: true },
    { id: "tv-no-internet-copy", path: "/copy-2/", indexable: false },
    { id: "tv-sound-no-picture-copy", path: "/copy/", indexable: false },
  ];

  assert.deepEqual(
    getHomeDiagnosticPages(catalog).map((page) => page.id),
    [
      "tv-sound-no-picture",
      "tv-no-sound",
      "tv-remote-not-working",
      "tv-turns-off",
      "tv-no-internet",
      "tv-usb-not-seen",
    ],
  );
});

const pages = [
  { id: "current", kind: "calculator", indexable: true },
  { id: "thin-same-kind", kind: "calculator", indexable: false },
  { id: "same-kind", kind: "calculator", indexable: true },
  { id: "other-kind", kind: "guide", indexable: true },
  { id: "missing-policy", kind: "guide" },
];

test("treats only explicitly indexable pages as indexable", () => {
  assert.equal(isIndexableSeoPage(pages[0]), true);
  assert.equal(isIndexableSeoPage(pages[1]), false);
  assert.equal(isIndexableSeoPage(pages[4]), false);
});

test("related pages exclude current and noindex pages", () => {
  assert.deepEqual(
    getRelatedPages(pages[0], pages).map((page) => page.id),
    ["same-kind", "other-kind"],
  );
});

test("model context links only to existing indexable brand, diagonal and VESA hubs", () => {
  const model = {
    brand: "LG",
    diagonal_inches: 55,
    vesa_width_mm: 300,
    vesa_height_mm: 200,
  };
  const catalog = [
    { id: "brand-lg", path: "/kronshteyn-dlya-televizora-lg/", indexable: true },
    { id: "diagonal-55", path: "/kronshteyn-dlya-televizora-55-dyuyma/", indexable: true },
    { id: "vesa-300x200", path: "/vesa/300x200/", indexable: true },
    { id: "vesa-200x200", path: "/vesa/200x200/", indexable: false },
  ];

  assert.deepEqual(getModelContextPages(model, catalog), [
    {
      id: "brand-lg",
      label: "Кронштейны для телевизоров LG",
      path: "/kronshteyn-dlya-televizora-lg/",
    },
    {
      id: "diagonal-55",
      label: "Кронштейны для телевизоров 55″",
      path: "/kronshteyn-dlya-televizora-55-dyuyma/",
    },
    {
      id: "vesa-300x200",
      label: "Модели с VESA 300×200",
      path: "/vesa/300x200/",
    },
  ]);
});

test("model context sends exact models to the two main traffic tools", () => {
  const model = {
    brand: "LG",
    diagonal_inches: 55,
    vesa_width_mm: 300,
    vesa_height_mm: 200,
  };
  const catalog = [
    { id: "tv-dimensions", path: "/razmery-televizora-po-diagonali/", indexable: true },
    { id: "wall-planner", path: "/televizor-na-stene/", indexable: true },
  ];

  assert.deepEqual(getModelContextPages(model, catalog), [
    {
      id: "tv-dimensions",
      label: "Сверить размеры экрана и корпуса",
      path: "/razmery-televizora-po-diagonali/",
    },
    {
      id: "wall-planner",
      label: "Примерить телевизор на стене",
      path: "/televizor-na-stene/",
    },
  ]);
});

test("model context suppresses a single VESA hub when official sources conflict", () => {
  const model = {
    brand: "Hisense",
    diagonal_inches: 55,
    vesa_width_mm: 400,
    vesa_height_mm: 300,
    wall_mount_screws: {
      vesa_conflict: {
        catalog_value: "400×300 мм",
        manual_value: "400×400 мм",
      },
    },
  };
  const catalog = [
    { id: "brand-hisense", path: "/kronshteyn-dlya-televizora-hisense/", indexable: true },
    { id: "diagonal-55", path: "/kronshteyn-dlya-televizora-55-dyuyma/", indexable: true },
    { id: "vesa-400x300", path: "/vesa/400x300/", indexable: true },
  ];

  assert.deepEqual(
    getModelContextPages(model, catalog).map((page) => page.id),
    ["brand-hisense", "diagonal-55"],
  );
});

test("model with an official screw passport links to the shared screw lookup", () => {
  const model = {
    brand: "Samsung",
    diagonal_inches: 43,
    vesa_width_mm: 200,
    vesa_height_mm: 200,
    wall_mount_screws: {
      groups: [{ thread: "M8", quantity: 4 }],
    },
  };
  const catalog = [
    { id: "brand-samsung", path: "/kronshteyn-dlya-televizora-samsung/", indexable: true },
    { id: "diagonal-43", path: "/kronshteyn-dlya-televizora-43-dyuyma/", indexable: true },
    { id: "tv-mount-screws", path: "/vinty-dlya-krepleniya-televizora/", indexable: true },
    { id: "vesa-200x200", path: "/vesa/200x200/", indexable: true },
  ];

  assert.deepEqual(getModelContextPages(model, catalog), [
    {
      id: "brand-samsung",
      label: "Кронштейны для телевизоров Samsung",
      path: "/kronshteyn-dlya-televizora-samsung/",
    },
    {
      id: "diagonal-43",
      label: "Кронштейны для телевизоров 43″",
      path: "/kronshteyn-dlya-televizora-43-dyuyma/",
    },
    {
      id: "tv-mount-screws",
      label: "Винты VESA по точной модели",
      path: "/vinty-dlya-krepleniya-televizora/",
    },
    {
      id: "vesa-200x200",
      label: "Модели с VESA 200×200",
      path: "/vesa/200x200/",
    },
  ]);
});

test("master page leads to the compatibility chain before generic calculators", () => {
  const catalog = [
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "tv-zone-sockets", kind: "calculator", indexable: true },
    { id: "viewing-distance", kind: "calculator", indexable: true },
    { id: "vesa", kind: "guide", indexable: true },
    { id: "full-motion-mount", kind: "mechanism", indexable: true },
    { id: "mounting-height", kind: "calculator", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["mounting-map", "tv-zone-sockets", "vesa", "full-motion-mount", "mounting-height", "viewing-distance"],
  );
});

test("mounting map leads to the geometry and compatibility chain", () => {
  const catalog = [
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "tv-zone-sockets", kind: "calculator", indexable: true },
    { id: "viewing-distance", kind: "calculator", indexable: true },
    { id: "vesa", kind: "guide", indexable: true },
    { id: "how-to-find-vesa", kind: "guide", indexable: true },
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "mounting-height", kind: "calculator", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["tv-zone-sockets", "wall-mounted-tv", "mounting-height", "vesa", "how-to-find-vesa", "viewing-distance"],
  );
});

test("TV-zone socket page leads back to mounting geometry and compatibility", () => {
  const catalog = [
    { id: "tv-zone-sockets", kind: "calculator", indexable: true },
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "mounting-height", kind: "calculator", indexable: true },
    { id: "vesa", kind: "guide", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["mounting-map", "wall-mounted-tv", "mounting-height", "vesa"],
  );
});

test("tilt mount page leads to height, mounting, and mechanism checks", () => {
  const catalog = [
    { id: "tilt-mount", kind: "mechanism", indexable: true },
    { id: "buy-tv-mount", kind: "commercial", indexable: true },
    { id: "mount-brand-onkron", kind: "mount-brand", indexable: true },
    { id: "mounting-height", kind: "calculator", indexable: true },
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "fixed-mount", kind: "mechanism", indexable: true },
    { id: "full-motion-mount", kind: "mechanism", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["buy-tv-mount", "mount-brand-onkron", "mounting-height", "mounting-map", "wall-mounted-tv", "fixed-mount"],
  );
});

test("VESA matcher stays on the VESA hub and links to measurement guidance", () => {
  const catalog = [
    { id: "vesa", kind: "guide", indexable: true },
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "how-to-find-vesa", kind: "guide", indexable: true },
    { id: "vesa-200x200", kind: "vesa", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["wall-mounted-tv", "how-to-find-vesa", "vesa-200x200"],
  );
});

test("screw lookup leads to VESA, measurement and mounting checks", () => {
  const catalog = [
    { id: "tv-mount-screws", kind: "screws", indexable: true },
    { id: "vesa", kind: "guide", indexable: true },
    { id: "how-to-find-vesa", kind: "guide", indexable: true },
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "buy-tv-mount", kind: "commercial", indexable: true },
    { id: "fixed-mount", kind: "mechanism", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["vesa", "how-to-find-vesa", "mounting-map", "wall-mounted-tv", "buy-tv-mount", "fixed-mount"],
  );
});
