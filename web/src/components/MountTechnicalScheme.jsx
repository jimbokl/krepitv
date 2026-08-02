import { formatNumber } from "./ModelFacts.jsx";

const MECHANISM_COPY = {
  fixed: {
    label: "Фиксированный",
    description: "Экран удерживается в одном положении близко к стене.",
    diagramLabel: "фиксированный механизм между стеной и телевизором",
  },
  tilt: {
    label: "Наклонный",
    description: "Экран можно наклонить. Наклон на схеме условный: паспортного угла в каталоге нет.",
    diagramLabel: "наклонный механизм между стеной и телевизором",
  },
  "full-motion": {
    label: "Поворотный",
    description: "Экран можно отвести от стены на шарнирном рычаге. Сложенное и выдвинутое положения показаны без масштаба.",
    diagramLabel: "поворотный шарнирный механизм между стеной и телевизором",
  },
};

export function MountTechnicalScheme({ mount }) {
  const mechanism = MECHANISM_COPY[mount.mechanism] ?? {
    label: "Не указан",
    description: "Положение экрана показано условно: тип механизма не указан в исходных данных.",
    diagramLabel: "механизм между стеной и телевизором без указанного типа",
  };
  const distance = formatDistance(mount);
  const titleId = `mount-scheme-title-${mount.id}`;
  const noteId = `mount-scheme-note-${mount.id}`;

  return (
    <section
      className="min-w-0 border-b-2 border-ink py-7 [overflow-wrap:anywhere]"
      data-mount-technical-scheme={mount.id}
      data-mount-mechanism={mount.mechanism}
    >
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(22rem,1.18fr)] lg:items-start">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-action">
            Техническая схема, не фотография
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl" id={titleId}>
            Как кронштейн располагает телевизор
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">{mechanism.description}</p>

          <dl className="mt-5 grid min-w-0 grid-cols-2 gap-px border border-ink bg-ink sm:grid-cols-3">
            <SchemeFact label="Механизм" value={mechanism.label} />
            <SchemeFact label="От стены" value={distance} />
            <SchemeFact
              label="Диагональ"
              value={`${formatNumber(mount.min_diagonal_in)}–${formatNumber(mount.max_diagonal_in)}″`}
            />
            <SchemeFact label="Нагрузка" value={`до ${formatNumber(mount.max_load_kg)} кг`} />
            <SchemeFact label="VESA" value={`${mount.vesa.length} схем`} />
          </dl>

          <p className="mt-4 text-sm leading-relaxed text-muted" id={noteId}>
            Габариты деталей, длина рычагов и углы условные. Схема передаёт только тип механизма и паспортный диапазон расстояния от стены.
          </p>
        </div>

        <div className="min-w-0 overflow-hidden border border-ink bg-white p-3 sm:p-5">
          <svg
            aria-label={`Условная техническая схема: ${mechanism.diagramLabel}. Расстояние от стены ${distance}.`}
            aria-describedby={noteId}
            className="block h-auto w-full max-w-full text-ink"
            data-mount-scheme-svg="true"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            viewBox="0 0 640 340"
          >
            <rect className="fill-line" height="244" width="22" x="54" y="42" />
            <line className="stroke-ink" strokeWidth="3" vectorEffect="non-scaling-stroke" x1="88" x2="88" y1="42" y2="286" />
            <rect className="fill-action" height="116" rx="3" width="18" x="88" y="106" />
            <text className="fill-muted font-mono text-[18px]" x="42" y="316">СТЕНА</text>

            <MechanismDrawing mechanism={mount.mechanism} />

            <line className="stroke-technical" strokeWidth="2" vectorEffect="non-scaling-stroke" x1="98" x2="548" y1="302" y2="302" />
            <line className="stroke-technical" strokeWidth="2" vectorEffect="non-scaling-stroke" x1="98" x2="98" y1="292" y2="312" />
            <line className="stroke-technical" strokeWidth="2" vectorEffect="non-scaling-stroke" x1="548" x2="548" y1="292" y2="312" />
            <rect className="fill-white" height="30" width="220" x="213" y="287" />
            <text className="fill-technical font-mono text-[18px]" textAnchor="middle" x="323" y="308">
              ОТ СТЕНЫ: {distance}
            </text>
          </svg>
          <p className="mt-3 border-t border-line pt-3 font-mono text-xs uppercase text-muted">
            Стена → механизм → телевизор
          </p>
        </div>
      </div>
    </section>
  );
}

function SchemeFact({ label, value }) {
  return (
    <div className="min-w-0 bg-paper p-3">
      <dt className="font-mono text-[0.68rem] uppercase text-muted">{label}</dt>
      <dd className="mt-1 break-words font-display text-xl font-extrabold text-ink">{value}</dd>
    </div>
  );
}

function MechanismDrawing({ mechanism }) {
  if (mechanism === "full-motion") {
    return (
      <g data-mechanism-part="articulated-arm">
        <rect className="fill-none stroke-line" height="194" strokeDasharray="9 8" strokeWidth="3" vectorEffect="non-scaling-stroke" width="36" x="190" y="66" />
        <text className="fill-muted font-mono text-[16px]" x="172" y="52">СЛОЖЕНО</text>
        <polyline className="fill-none stroke-ink" points="106,164 228,104 365,205 514,164" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" vectorEffect="non-scaling-stroke" />
        <circle className="fill-action stroke-ink" cx="228" cy="104" r="12" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        <circle className="fill-action stroke-ink" cx="365" cy="205" r="12" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        <rect className="fill-paper stroke-ink" height="220" rx="5" strokeWidth="5" vectorEffect="non-scaling-stroke" width="48" x="514" y="54" />
        <rect className="fill-ink" height="94" rx="2" width="8" x="514" y="117" />
      </g>
    );
  }

  if (mechanism === "tilt") {
    return (
      <g data-mechanism-part="tilt-joint">
        <line className="stroke-ink" strokeLinecap="round" strokeWidth="16" vectorEffect="non-scaling-stroke" x1="106" x2="412" y1="164" y2="164" />
        <circle className="fill-action stroke-ink" cx="412" cy="164" r="14" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        <g transform="rotate(-8 442 164)">
          <rect className="fill-paper stroke-ink" height="220" rx="5" strokeWidth="5" vectorEffect="non-scaling-stroke" width="48" x="418" y="54" />
          <rect className="fill-ink" height="94" rx="2" width="8" x="418" y="117" />
        </g>
        <path className="fill-none stroke-technical" d="M 380 118 A 60 60 0 0 1 447 104" strokeDasharray="6 5" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        <text className="fill-muted font-mono text-[16px]" x="318" y="88">НАКЛОН УСЛОВНЫЙ</text>
      </g>
    );
  }

  return (
    <g data-mechanism-part="fixed-rails">
      <line className="stroke-ink" strokeLinecap="round" strokeWidth="14" vectorEffect="non-scaling-stroke" x1="106" x2="256" y1="132" y2="132" />
      <line className="stroke-ink" strokeLinecap="round" strokeWidth="14" vectorEffect="non-scaling-stroke" x1="106" x2="256" y1="196" y2="196" />
      <rect className="fill-paper stroke-ink" height="220" rx="5" strokeWidth="5" vectorEffect="non-scaling-stroke" width="48" x="256" y="54" />
      <rect className="fill-ink" height="94" rx="2" width="8" x="256" y="117" />
      <text className="fill-muted font-mono text-[16px]" x="178" y="238">БЕЗ ПОВОРОТА</text>
    </g>
  );
}

function formatDistance(mount) {
  if (mount.wall_distance_min_mm === mount.wall_distance_max_mm) {
    return `${formatNumber(mount.wall_distance_min_mm)} мм`;
  }
  return `${formatNumber(mount.wall_distance_min_mm)}–${formatNumber(mount.wall_distance_max_mm)} мм`;
}
