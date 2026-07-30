export function groupCatalogItemsByBrand(items, getBrand = (item) => item?.brand) {
  const groups = [];
  const groupByBrand = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const brand = String(getBrand(item) ?? "").trim() || "Без бренда";
    let group = groupByBrand.get(brand);
    if (!group) {
      group = { brand, items: [] };
      groupByBrand.set(brand, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  return groups;
}
