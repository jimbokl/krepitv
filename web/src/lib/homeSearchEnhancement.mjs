import { filterModelSearchResults, findExactModelSearchResult } from "./modelSearch.mjs";

// Enhance the existing HTML form: no React runtime or replacement of typed input.
export function enhanceHomeSearch(island, search, windowObject = globalThis.window) {
  const form = island.querySelector("form");
  const input = form?.querySelector('input[name="model"]');
  if (!form || !input || form.dataset.homeSearchEnhanced === "true") return false;
  const documentObject = island.ownerDocument;
  const wrapper = documentObject.createElement("div");
  wrapper.className = "relative min-w-0";
  input.before(wrapper);
  wrapper.append(input);
  const menu = documentObject.createElement("div");
  menu.id = "home-model-suggestions";
  menu.className = "relative mt-2 z-30 overflow-hidden rounded-md border border-line bg-white shadow-menu lg:absolute lg:inset-x-0 lg:top-[calc(100%+0.5rem)] lg:mt-0";
  menu.hidden = true;
  wrapper.append(menu);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", menu.id);
  input.setAttribute("aria-expanded", "false");
  form.dataset.modelSearchCount = String(search.length);
  form.dataset.homeSearchEnhanced = "true";
  let results = [];
  let activeIndex = -1;

  function hide() {
    menu.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeIndex = -1;
  }

  function choose(item, navigate = false) {
    input.value = item.title;
    hide();
    if (navigate) windowObject.location.assign(item.href || `/modeli/${item.id}/`);
  }

  function setActive(index) {
    activeIndex = index;
    for (const [position, option] of [...menu.children].entries()) {
      option.setAttribute("aria-selected", String(position === index));
      option.classList.toggle("bg-paper", position === index);
    }
    if (index >= 0) input.setAttribute("aria-activedescendant", `${menu.id}-option-${index}`);
    else input.removeAttribute("aria-activedescendant");
  }

  function show() {
    results = filterModelSearchResults(search, input.value);
    menu.replaceChildren();
    if (!input.value.trim()) return hide();
    menu.hidden = false;
    input.setAttribute("aria-expanded", "true");
    menu.setAttribute("role", results.length ? "listbox" : "region");
    menu.setAttribute("aria-label", results.length ? "Найденные модели" : "Модель не найдена");
    if (!results.length) {
      menu.setAttribute("aria-live", "polite");
      const message = documentObject.createElement("p");
      message.className = "px-5 py-4 text-sm leading-relaxed text-muted";
      message.textContent = "Такой модели пока нет в проверенной базе. Уточните полный код на наклейке сзади телевизора.";
      const fallback = documentObject.createElement("a");
      fallback.href = "/vesa/";
      fallback.className = "mx-5 mb-4 inline-flex min-h-11 items-center font-semibold text-technical underline underline-offset-4";
      fallback.textContent = "Проверить VESA вручную →";
      menu.append(message, fallback);
      return setActive(-1);
    }
    menu.removeAttribute("aria-live");
    for (const [index, item] of results.entries()) {
      const option = documentObject.createElement("button");
      option.type = "button";
      option.id = `${menu.id}-option-${index}`;
      option.className = "flex w-full items-center justify-between gap-4 border-b border-line px-5 py-4 text-left text-lg last:border-b-0 hover:bg-paper focus:bg-paper focus:outline-none";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.dataset.analyticsStartClick = "true";
      option.tabIndex = -1;
      option.textContent = item.title;
      option.addEventListener("click", () => choose(item));
      option.addEventListener("pointermove", () => setActive(index));
      menu.append(option);
    }
    setActive(-1);
  }

  input.addEventListener("input", show);
  input.addEventListener("focus", show);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") return hide();
    if (["ArrowDown", "ArrowUp"].includes(event.key) && results.length) {
      event.preventDefault();
      if (menu.hidden) show();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActive(activeIndex < 0 ? (direction === 1 ? 0 : results.length - 1) : (activeIndex + direction + results.length) % results.length);
    } else if (event.key === "Enter" && !menu.hidden && activeIndex >= 0) {
      event.preventDefault();
      choose(results[activeIndex], true);
    }
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const exact = findExactModelSearchResult(search, input.value);
    if (exact) choose(exact, true);
    else show();
  });
  documentObject.addEventListener("pointerdown", (event) => {
    if (!island.contains(event.target)) hide();
  });
  if (input.value && documentObject.activeElement === input) show();
  return true;
}
