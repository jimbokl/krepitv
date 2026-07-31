import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyVesaLookupSelection,
  findVesaModel,
  verifiedMountCountFor,
  vesaConflictFor,
} from "../src/lib/vesaModelLookup.mjs";

const models = [
  {
    id: "plain-tv",
    vesa_width_mm: 200,
    vesa_height_mm: 200,
  },
  {
    id: "conflict-tv",
    vesa_width_mm: 400,
    vesa_height_mm: 300,
    wall_mount_screws: {
      vesa_conflict: {
        catalog_value: "400×300 мм",
        manual_value: "400×400 мм",
        note: "Нужен замер",
      },
    },
  },
];

test("поиск VESA различает проверенный размер, конфликт и неизвестную модель", () => {
  assert.equal(findVesaModel(models, { id: "plain-tv" }), models[0]);
  assert.deepEqual(classifyVesaLookupSelection(models, { id: "plain-tv" }), {
    model: models[0],
    status: "verified-size",
  });
  assert.deepEqual(classifyVesaLookupSelection(models, { id: "conflict-tv" }), {
    model: models[1],
    status: "source-conflict",
  });
  assert.deepEqual(classifyVesaLookupSelection(models, { id: "missing" }), {
    model: null,
    status: "unknown",
  });
});

test("конфликт VESA останавливает автоподбор, а обычный счётчик учитывает только verified-fit", () => {
  assert.equal(vesaConflictFor(models[0]), null);
  assert.equal(vesaConflictFor(models[1]).manual_value, "400×400 мм");
  assert.equal(verifiedMountCountFor(models[0], [
    { tv_id: "plain-tv", compatible: true, fit_status: "verified-fit" },
    { tv_id: "plain-tv", compatible: true, fit_status: "conditional-fit" },
    { tv_id: "plain-tv", compatible: false, fit_status: "verified-fit" },
    { tv_id: "other", compatible: true, fit_status: "verified-fit" },
  ]), 1);
  assert.equal(verifiedMountCountFor(models[1], [
    { tv_id: "conflict-tv", compatible: true, fit_status: "verified-fit" },
  ]), 0);
});
