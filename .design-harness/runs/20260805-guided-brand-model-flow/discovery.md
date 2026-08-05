# Discovery

Существующий `GuidedSelectionPage` уже содержит RailStep, ChoiceGrid, ModelSearch,
CompatibilityResult, TrustMark и privacy-safe result event. `ModelSearch` имеет клавиатурный
combobox-контракт. Каталог содержит поле `brand` и в моделях, и в поисковом индексе.

Повторно используются существующие primary/secondary button classes, цвета paper/ink/action/line,
типографика, focus rings, картинка монтажной системы и логика совместимости. Новый компонент или
изображение не требуются. Исправляется опасное текущее поведение: fallback на первую/вторую модель.
