import { Fragment } from "react";

export function Breadcrumbs({ items }) {
  return (
    <nav
      aria-label="Навигационная цепочка"
      className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted"
      data-visible-breadcrumbs="true"
    >
      {items.map((item, index) => (
        <Fragment key={`${item.href ?? "current"}-${item.label}`}>
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          {item.href && index < items.length - 1 ? (
            <a className="transition hover:text-action" href={item.href}>{item.label}</a>
          ) : (
            <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
