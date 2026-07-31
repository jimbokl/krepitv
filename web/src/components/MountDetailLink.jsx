import { mountDetailClickHandlers } from "../lib/mountDetailClick.mjs";

export function MountDetailLink({
  children,
  className = "",
  href,
  placement = "compatibility_result",
}) {
  const handlers = mountDetailClickHandlers(globalThis.window, placement);
  return (
    <a
      {...handlers}
      className={className}
      data-mount-detail-placement={placement}
      href={href}
    >
      {children}
    </a>
  );
}
