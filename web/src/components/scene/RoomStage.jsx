import { useId } from "react";

// The room's front wall is orthographic: exact geometry is never distorted by
// the decorative floor/wall depth. Instruction poses are explicitly illustrative.
export function RoomStage({ diagram, kind = "planner", pose = "front", focus = "none", children }) {
  const id = useId().replaceAll(":", "");
  const wall = diagram?.wall ?? { x: 90, y: 60, width: 800, height: 510 };
  const screen = diagram?.screen ?? { x: 300, y: 205, width: 385, height: 217 };
  const furniture = diagram?.furniture ?? (!diagram ? { x: 265, y: 472, width: 460, height: 98 } : null);
  const eyeY = diagram?.eyeLineY ?? 328;
  const center = diagram?.center ?? { x: 492.5, y: 313.5 };
  const back = ["back", "rails"].includes(pose);
  const exploded = pose === "plate";
  const revealPower = (kind === "sockets" && ["plate", "cables"].includes(pose)) || (kind === "mounting" && pose === "cables");
  const tvX = revealPower ? -140 : exploded ? 120 : back ? -60 : 0;
  const tvY = revealPower ? -85 : exploded ? -38 : back ? -32 : 0;
  const tvTransform = `translate(${tvX}px, ${tvY}px)`;
  const socketX = screen.x + screen.width * 0.82;
  const socketY = wall.y + wall.height * 0.58;
  const powerVisible = revealPower;
  const hdmiVisible = kind === "hdmi" || (kind === "mounting" && pose === "cables");
  const sourceX = screen.x + screen.width * 0.65;
  const sourceY = furniture ? furniture.y - 36 : wall.y + wall.height - 60;
  const portX = screen.x + screen.width + tvX + 7;
  const portY = screen.y + screen.height * 0.65 + tvY;
  return <>
    <defs>
      <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="var(--color-paper)" /><stop offset="1" stopColor="var(--color-line)" /></linearGradient>
      <linearGradient id={`${id}-screen`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="var(--color-ink)" /><stop offset="0.55" stopColor="var(--color-muted)" /><stop offset="1" stopColor="var(--color-ink)" /></linearGradient>
      <linearGradient id={`${id}-light`}><stop stopColor="var(--color-surface)" stopOpacity="0.42" /><stop offset="1" stopColor="var(--color-surface)" stopOpacity="0" /></linearGradient>
      <filter height="160%" id={`${id}-shadow`} width="160%" x="-30%" y="-30%"><feDropShadow dx="0" dy="12" floodColor="var(--color-ink)" floodOpacity="0.22" stdDeviation="10" /></filter>
    </defs>
    <rect className="room-stage__ground" height="650" width="1000" />
    <path d={`M${wall.x},${wall.y} l-35,24 v${wall.height} l35,-24 Z`} fill="var(--color-line)" />
    <path d={`M${wall.x},${wall.y + wall.height} h${wall.width} l55,45 H${wall.x - 35} Z`} fill="var(--color-muted)" opacity="0.4" />
    <rect fill={`url(#${id}-wall)`} rx="2" {...wall} />
    <path d={`M${wall.x + wall.width * 0.1},${wall.y} h${wall.width * 0.35} l${wall.width * 0.2},${wall.height} H${wall.x + wall.width * 0.3} Z`} fill={`url(#${id}-light)`} />
    <line stroke="var(--color-surface)" strokeOpacity="0.6" strokeWidth="4" x1={wall.x} x2={wall.x + wall.width} y1={wall.y + wall.height - 8} y2={wall.y + wall.height - 8} />
    {furniture ? <g className={`room-stage__furniture ${focus === "space" ? "is-highlighted" : ""}`}>
      <rect fill="var(--color-ink)" opacity="0.1" rx="5" x={furniture.x + 10} y={furniture.y + 10} width={furniture.width} height={furniture.height} />
      <rect fill="var(--color-muted)" rx="2" {...furniture} />
      <path d={`M${furniture.x},${furniture.y} l12,-10 h${Math.max(0, furniture.width - 12)} v10 Z`} fill="var(--color-paper)" />
      <line stroke="var(--color-line)" strokeOpacity="0.5" x1={furniture.x + furniture.width / 2} x2={furniture.x + furniture.width / 2} y1={furniture.y + 5} y2={furniture.y + furniture.height - 5} />
      {!diagram ? <rect fill="var(--color-ink)" height="16" rx="8" width="155" x={furniture.x + 145} y={furniture.y - 18} /> : null}
    </g> : null}
    <g className={`room-stage__plate ${exploded || focus === "socket" ? "is-visible" : ""}`}>
      <rect fill="var(--color-muted)" height={screen.height * 0.44} rx="4" stroke="var(--color-ink)" strokeWidth="4" width={screen.width * 0.62} x={screen.x + screen.width * 0.19} y={screen.y + screen.height * 0.28} />
      <path d={`M${screen.x + screen.width * 0.24},${center.y - 28} H${screen.x + screen.width * 0.76} M${screen.x + screen.width * 0.24},${center.y + 28} H${screen.x + screen.width * 0.76}`} stroke="var(--color-line)" strokeWidth="9" />
      <path d={`M${center.x},${center.y - 28} l45,-18 l-25,56 l45,-18`} fill="none" stroke="var(--color-ink)" strokeLinejoin="round" strokeWidth="12" />
    </g>
    {kind === "sockets" ? <rect fill="none" height={screen.height} rx="7" stroke="var(--color-action)" strokeDasharray="10 7" strokeWidth="3" width={screen.width} x={screen.x} y={screen.y} /> : null}
    <g className={`room-stage__socket ${powerVisible ? "is-visible" : ""}`} transform={`translate(${socketX},${socketY})`}>
      <rect fill="var(--color-surface)" height="45" rx="5" stroke="var(--color-muted)" strokeWidth="2" width="45" />
      <circle cx="22.5" cy="22.5" fill="var(--color-paper)" r="15" stroke="var(--color-line)" />
      <circle cx="16" cy="22" fill="var(--color-ink)" r="2.5" /><circle cx="29" cy="22" fill="var(--color-ink)" r="2.5" />
    </g>
    <g className="room-stage__television" style={{ transform: tvTransform }}>
      <rect fill="var(--color-ink)" filter={`url(#${id}-shadow)`} rx="7" {...screen} />
      <rect fill={back ? "var(--color-muted)" : `url(#${id}-screen)`} height={Math.max(1, screen.height - 12)} rx="3" width={Math.max(1, screen.width - 12)} x={screen.x + 6} y={screen.y + 6} />
      {back ? <>
        <rect fill="var(--color-ink)" height={screen.height * 0.25} width={screen.width * 0.58} x={screen.x + screen.width * 0.21} y={screen.y + screen.height * 0.7} />
        <rect fill="var(--color-paper)" height="18" rx="1" width="68" x={screen.x + 25} y={screen.y + screen.height - 32} />
        <path d={`M${screen.x + 31},${screen.y + screen.height - 26} h43 m-43,5 h25`} stroke="var(--color-muted)" strokeWidth="2" />
        {[0.34, 0.66].flatMap(x => [0.26, 0.65].map(y => <circle cx={screen.x + screen.width * x} cy={screen.y + screen.height * y} fill="var(--color-ink)" key={`${x}-${y}`} r="5" stroke="var(--color-action)" strokeWidth="3" />))}
        {pose === "rails" ? [0.34, 0.66].map(x => <rect className="room-stage__rail" fill="var(--color-line)" height={screen.height * 0.7} key={x} rx="2" stroke="var(--color-ink)" strokeWidth="3" width="14" x={screen.x + screen.width * x - 7} y={screen.y + screen.height * 0.11} />) : null}
      </> : <>
        <path d={`M${screen.x + 8},${screen.y + 8} h${screen.width * 0.43} l${screen.width * 0.14},${screen.height - 16} H${screen.x + 8} Z`} fill={`url(#${id}-light)`} opacity="0.24" />
        {focus === "signal" || focus === "done" ? <g className="room-stage__picture"><path d={`M${screen.x + 12},${screen.y + screen.height - 12} v-${screen.height * 0.2} l${screen.width * 0.27},-${screen.height * 0.3} l${screen.width * 0.18},${screen.height * 0.12} l${screen.width * 0.29},-${screen.height * 0.26} l${screen.width * 0.21},${screen.height * 0.3} v${screen.height * 0.34} Z`} fill="var(--color-line)" opacity="0.32" /><circle cx={screen.x + screen.width * 0.7} cy={screen.y + screen.height * 0.26} fill="var(--color-paper)" opacity="0.8" r={screen.height * 0.085} /></g> : null}
      </>}
    </g>
    <g className={`room-stage__cable ${powerVisible && pose === "cables" ? "is-visible" : ""}`} data-room-connection="power">
      <rect fill="var(--color-ink)" height="29" rx="8" stroke="var(--color-action)" strokeWidth="3" width="29" x={socketX + 8} y={socketY + 8} />
      <path d={`M${socketX + 23},${socketY + 24} C${socketX + 95},${socketY + 24} ${socketX + 90},${socketY + 110} ${socketX + 28},${socketY + 110} S${screen.x + screen.width + tvX - 12},${socketY + 80} ${screen.x + screen.width + tvX - 12},${screen.y + screen.height + tvY - 6}`} fill="none" stroke="var(--color-ink)" strokeLinecap="round" strokeWidth="8" />
      <circle cx={socketX + 23} cy={socketY + 23} fill="var(--color-action)" r="5" />
    </g>
    <g className={`room-stage__cable ${hdmiVisible ? "is-visible" : ""}`} data-room-connection="hdmi">
      <path d={`M${sourceX + 72},${sourceY + 16} C${portX + 80},${sourceY + 55} ${portX + 80},${portY + 80} ${portX},${portY}`} fill="none" stroke="var(--color-ink)" strokeLinecap="round" strokeWidth="8" />
      <path className={focus === "signal" || focus === "cable" ? "room-stage__signal" : ""} d={`M${sourceX + 72},${sourceY + 16} C${portX + 80},${sourceY + 55} ${portX + 80},${portY + 80} ${portX},${portY}`} fill="none" stroke="var(--color-action)" strokeLinecap="round" strokeWidth="3" />
      <rect fill="var(--color-ink)" height="30" rx="4" stroke="var(--color-muted)" strokeWidth="2" width="100" x={sourceX} y={sourceY} />
      <circle cx={sourceX + 87} cy={sourceY + 15} fill="var(--color-verified)" r="3" />
      <rect fill="var(--color-action)" height="15" rx="2" width="15" x={portX - 7} y={portY - 7} />
      <text fill="var(--color-ink)" fontFamily="var(--font-mono)" fontSize="22" x={portX + 18} y={portY - 12}>HDMI</text>
    </g>
    <g className={`room-stage__eyes ${focus === "height" || diagram ? "is-visible" : ""}`}>
      <line stroke="var(--color-technical)" strokeDasharray="9 7" strokeWidth="3" x1={wall.x + 8} x2={wall.x + wall.width - 8} y1={eyeY} y2={eyeY} />
      <circle cx={wall.x + 24} cy={eyeY} fill="var(--color-surface)" r="14" stroke="var(--color-technical)" strokeWidth="3" />
      <circle cx={wall.x + 24} cy={eyeY} fill="var(--color-technical)" r="5" />
    </g>
    {focus === "space" ? <rect fill="none" height={screen.height} rx="7" stroke="var(--color-action)" strokeDasharray="10 7" strokeWidth="3" width={screen.width} x={screen.x} y={screen.y} /> : null}
    {children}
  </>;
}
