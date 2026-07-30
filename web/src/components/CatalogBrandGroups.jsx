import { CaretDown } from "@phosphor-icons/react";
import { groupCatalogItemsByBrand } from "../lib/catalogGroups.mjs";

export function CatalogBrandGroups({
  countLabel,
  getBrand,
  items,
  listClassName = "",
  renderItem,
}) {
  const groups = groupCatalogItemsByBrand(items, getBrand);

  return (
    <div className="border-b border-line">
      {groups.map((group) => (
        <details className="group border-t border-line" key={group.brand}>
          <summary className="grid min-h-16 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
            <span className="font-display text-2xl font-extrabold">{group.brand}</span>
            <span className="font-mono text-xs uppercase text-muted">
              {countLabel}: {group.items.length}
            </span>
            <CaretDown
              aria-hidden="true"
              className="size-5 shrink-0 text-action transition group-open:rotate-180"
            />
          </summary>
          <div className={listClassName}>{group.items.map(renderItem)}</div>
        </details>
      ))}
    </div>
  );
}
