import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import {
  filterModelSearchResults,
  findExactModelSearchResult,
} from "../lib/catalog.js";

export function ModelSearch({
  search,
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder = "Введите модель ТВ",
  buttonLabel = "Найти совместимые",
  compact = false,
  autoFocus = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const results = useMemo(
    () => filterModelSearchResults(search, value),
    [search, value],
  );
  const exactSelection = useMemo(
    () => findExactModelSearchResult(search, value),
    [search, value],
  );

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function choose(item) {
    onChange(item.title);
    onSelect?.(item);
    setOpen(false);
  }

  function submit(event) {
    event.preventDefault();
    if (exactSelection) {
      choose(exactSelection);
      onSubmit?.(exactSelection);
    } else {
      setOpen(true);
    }
  }

  return (
    <form
      className={`relative grid gap-3 ${compact ? "lg:grid-cols-[minmax(0,1fr)_auto]" : "md:grid-cols-[minmax(0,1fr)_22rem]"}`}
      onSubmit={submit}
      ref={rootRef}
    >
      <div className="relative">
        <MagnifyingGlass
          aria-hidden="true"
          className={`pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink ${compact ? "size-7" : "size-9"}`}
          weight="regular"
        />
        <input
          autoComplete="off"
          autoFocus={autoFocus}
          aria-label="Модель телевизора"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="варианты-моделей"
          role="combobox"
          className={`w-full border-2 bg-white pl-16 pr-14 font-sans text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20 ${compact ? "h-[4.4rem] rounded-md border-ink text-xl" : "h-[5rem] rounded-md border-action text-2xl sm:text-3xl"}`}
          onChange={(event) => {
            onChange(event.target.value);
            onSelect?.(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          value={value}
        />
        {value ? (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-2 text-muted transition hover:bg-line/50 hover:text-ink focus:outline-none focus:ring-2 focus:ring-action"
            onClick={() => {
              onChange("");
              onSelect?.(null);
              setOpen(true);
            }}
            type="button"
            aria-label="Очистить модель"
          >
            <X className="size-6" />
          </button>
        ) : null}

        {open && (value || results.length) ? (
          <div
            className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-md border border-line bg-white shadow-menu"
            id="варианты-моделей"
            role="listbox"
            aria-label="Найденные модели"
          >
            {results.length ? (
              results.map((item) => (
                <button
                  className="flex w-full items-center justify-between gap-4 border-b border-line px-5 py-4 text-left text-lg last:border-b-0 hover:bg-paper focus:bg-paper focus:outline-none"
                  key={item.id}
                  onClick={() => choose(item)}
                  role="option"
                  type="button"
                >
                  <span className="font-semibold text-ink">{item.title}</span>
                  <span className="text-sm text-muted">Проверенная модель</span>
                </button>
              ))
            ) : (
              <p className="px-5 py-4 text-muted">
                Такой модели пока нет в проверенной базе.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <button
        className={`inline-flex items-center justify-center rounded-md bg-action px-7 font-display font-bold text-white transition hover:bg-[#d94108] focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "h-[4.4rem] text-xl" : "h-[5rem] text-2xl"}`}
        disabled={!exactSelection}
        type="submit"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
