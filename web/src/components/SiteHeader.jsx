import { List, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Brand } from "./Brand.jsx";

const links = [
  { href: "/podbor/", label: "Подбор по модели" },
  { href: "/vesa/", label: "Справочник VESA" },
  { href: "/#kak-vybrat", label: "Как выбрать" },
  { href: "/metodika/", label: "Проверка данных" },
];

export function SiteHeader({ active = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-6">
          <Brand compact />
          <p className="hidden max-w-[17rem] border-l border-line pl-6 font-mono text-xs uppercase leading-tight lg:block">
            Независимый сервис проверки совместимости кронштейнов и телевизоров
          </p>
        </div>

        <button
          className="rounded p-2 focus:outline-none focus:ring-2 focus:ring-action lg:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          type="button"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
        >
          {menuOpen ? <X className="size-7" /> : <List className="size-7" />}
        </button>

        <nav
          className={`${menuOpen ? "flex" : "hidden"} absolute inset-x-4 top-[5.3rem] z-40 flex-col gap-1 rounded-md border border-line bg-white p-3 shadow-menu lg:static lg:flex lg:flex-row lg:items-center lg:gap-7 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
          aria-label="Основная навигация"
        >
          {links.map((link) => (
            <a
              className={`border-b-2 px-2 py-3 font-display text-base font-bold uppercase transition hover:text-action lg:py-2 ${active === link.href ? "border-ink" : "border-transparent"}`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
