# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Паспортные факты | `ModelFacts`, `TvModel` | reuse | VESA, диагональ и масса из реестра |
| Каноническая ссылка | `modelHref`, `/modeli/{id}/` | reuse | exact id `tcl-65c7k` |
| Карточная композиция | border/line/paper/action Tailwind-токены | extend | один responsive grid без нового CSS |
| Поле точной модели | `ModelSearch` | refine | полный русский placeholder помещается на ширине 320 px |
| Направление действия | `ArrowRight` | reuse | тот же icon и focus-ring, что на главной |
| SSR parity | `home_page_body` | extend | тот же marker, href и паспортные факты |
