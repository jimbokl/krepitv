import { List, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./Brand.jsx";
import { MetrikaConsent } from "./MetrikaConsent.jsx";

const links = [
  { href: "/televizor-pishet-net-signala/", label: "Нет сигнала" },
  { href: "/kak-podklyuchit-telefon-k-televizoru/", label: "Телефон → ТВ" },
  { href: "/podbor/", label: "Подбор по модели" },
  { href: "/modeli/", label: "Телевизоры" },
  { href: "/kronshteyny/", label: "Кронштейны" },
  { href: "/razmery-televizora-po-diagonali/", label: "Размеры ТВ" },
  { href: "/vesa/", label: "VESA" },
  { href: "/spravochnik/", label: "Справочник" },
];

export function SiteHeader({ active = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <>
      <header className="relative border-b-2 border-ink bg-paper">
        <div className="mx-auto flex min-w-0 max-w-[1440px] items-center justify-between gap-3 px-5 py-4 sm:gap-6 sm:px-8">
          <Brand compact />

          <button
            aria-controls="site-primary-navigation"
            aria-expanded={menuOpen}
            className="flex size-11 shrink-0 items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-action xl:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            ref={menuButtonRef}
          >
            {menuOpen ? <X className="size-7" /> : <List className="size-7" />}
          </button>

          <nav
            className={`${menuOpen ? "flex" : "hidden"} absolute inset-x-4 top-full z-40 max-h-screen flex-col gap-1 overflow-y-auto rounded-md border border-line bg-white p-3 shadow-menu xl:static xl:flex xl:max-h-none xl:flex-row xl:items-center xl:gap-5 xl:overflow-visible xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none`}
            aria-label="Основная навигация"
            id="site-primary-navigation"
          >
            {links.map((link) => (
              <a
                aria-current={active === link.href ? "page" : undefined}
                className={`border-b-2 px-2 py-3 font-display text-base font-bold uppercase transition hover:text-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink xl:py-2 ${active === link.href ? "border-ink" : "border-transparent"}`}
                href={link.href}
                key={link.href}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <MetrikaConsent />
    </>
  );
}
