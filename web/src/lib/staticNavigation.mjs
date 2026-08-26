export function installStaticNavigation(documentObject = globalThis.document) {
  const button = documentObject?.querySelector?.("[data-static-navigation-toggle]");
  const navigation = documentObject?.getElementById?.("site-primary-navigation");
  const openIcon = button?.querySelector?.("[data-static-navigation-open-icon]");
  const closeIcon = button?.querySelector?.("[data-static-navigation-close-icon]");
  if (!button || !navigation) return { dispose() {}, installed: false };

  function setOpen(open) {
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    navigation.classList.toggle("hidden", !open);
    navigation.classList.toggle("flex", open);
    openIcon?.classList.toggle("hidden", open);
    closeIcon?.classList.toggle("hidden", !open);
  }

  function toggle() {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  }

  function closeOnEscape(event) {
    if (event.key !== "Escape" || button.getAttribute("aria-expanded") !== "true") return;
    setOpen(false);
    button.focus();
  }

  function closeOnNavigation(event) {
    if (event.target?.closest?.("a")) setOpen(false);
  }

  button.addEventListener("click", toggle);
  documentObject.addEventListener("keydown", closeOnEscape);
  navigation.addEventListener("click", closeOnNavigation);
  return {
    installed: true,
    dispose() {
      button.removeEventListener("click", toggle);
      documentObject.removeEventListener("keydown", closeOnEscape);
      navigation.removeEventListener("click", closeOnNavigation);
    },
  };
}
