import { KitSection } from "./KitSection.jsx";
export function ToolsPanel({ section }) { return <KitSection id="tools" section={section} title="Инструменты и расходники"><ul className="mt-4 grid gap-2 sm:grid-cols-2">{(section.items ?? []).map((item) => <li className="border border-line bg-white p-3" key={item}>{item}</li>)}</ul></KitSection>; }
