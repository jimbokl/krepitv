import { Brand } from "./Brand.jsx";

const footerLinks = [
  { href: "/televizor-pishet-net-signala/", label: "Нет сигнала" },
  { href: "/kak-podklyuchit-telefon-k-televizoru/", label: "Телефон → ТВ" },
  { href: "/podbor/", label: "Подбор" },
  { href: "/modeli/", label: "Телевизоры" },
  { href: "/kronshteyny/", label: "Кронштейны" },
  { href: "/razmery-televizora-po-diagonali/", label: "Размеры ТВ" },
  { href: "/televizor-na-stene/", label: "Примерка на стене" },
  { href: "/na-kakoy-vysote-veshat-televizor/", label: "Высота установки" },
  { href: "/rasstoyanie-do-televizora-i-diagonal/", label: "Расстояние и диагональ" },
  { href: "/vesa/", label: "VESA" },
  { href: "/o-proekte/", label: "О проекте" },
  { href: "/metodika/", label: "Методика" },
  { href: "/kontakty/", label: "Контакты" },
  { href: "/politika-konfidencialnosti/", label: "Конфиденциальность" },
];

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-paper text-ink">
      <div className="mx-auto grid min-w-0 max-w-[1440px] gap-6 px-5 py-7 [overflow-wrap:anywhere] sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <Brand compact />
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Независимый справочный сервис. Не магазин и не представитель производителей.
          </p>
        </div>
        <nav
          className="flex min-w-0 flex-wrap gap-x-6 gap-y-3 font-display text-sm font-bold uppercase"
          aria-label="Инструменты и информация о сервисе"
        >
          {footerLinks.map((link) => (
            <a
              className="max-w-full rounded-sm underline decoration-line underline-offset-4 [overflow-wrap:anywhere] transition hover:text-action focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
