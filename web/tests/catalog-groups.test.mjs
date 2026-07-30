import assert from "node:assert/strict";
import test from "node:test";
import { groupCatalogItemsByBrand } from "../src/lib/catalogGroups.mjs";

test("каталог группируется по брендам без изменения порядка", () => {
  const samsungA = { brand: "Samsung", id: "a" };
  const lg = { brand: "LG", id: "b" };
  const samsungC = { brand: "Samsung", id: "c" };
  const groups = groupCatalogItemsByBrand([samsungA, lg, samsungC]);

  assert.deepEqual(groups, [
    { brand: "Samsung", items: [samsungA, samsungC] },
    { brand: "LG", items: [lg] },
  ]);
});

test("вложенная модель группируется через переданный селектор", () => {
  const groups = groupCatalogItemsByBrand(
    [{ model: { brand: "TCL", id: "x" } }],
    (item) => item.model.brand,
  );

  assert.equal(groups[0].brand, "TCL");
  assert.equal(groups[0].items.length, 1);
});
