# Component And Asset Map — план переиспользования

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Монтажная сцена | `WallPlannerDiagram.jsx`, `HeightPlanDiagram.jsx` | extend | Уже есть геометрия, перемещение ТВ и подписанные высоты |
| Схема кронштейна | `MountTechnicalScheme.jsx`, `installation-kit/PlacementPanel.jsx` | reuse / extend | Есть проверяемые слои и отдельная точная геометрия стеновой площадки |
| Вычисление | `WallPlannerCalculator.jsx`, `MountingMapCalculator.jsx` | reuse | Существующая Rust/WASM-логика выдаёт результат, графика его не заменяет |
| Финальный выбор | `installation-kit/MountChoiceStep.jsx` | reuse | Уже фильтрует подтверждённую совместимость |
| Палитра и типографика | `DESIGN.md` | reuse | Существующий визуальный контракт |
| Общие шаги/переходы | нет | create | Нынешние SVG живут отдельно; общий плеер уберёт дублирование |

Реализованные примитивы: `InstructionScene` (плеер, шаги, управление движением), `RoomStage` (SVG-объекты комнаты) и `instructionScenes.mjs` (четыре сценария и привязка шести URL). `RoomStage` принимает либо условную иллюстрацию, либо точную геометрию существующего планировщика. Сцена и планировщик выделены в отдельные route chunks, чтобы не увеличивать общий SEO-чанк сверх действующего бюджета.
