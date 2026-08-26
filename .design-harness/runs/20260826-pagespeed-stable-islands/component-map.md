# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Поиск на главной | ModelSearch | reuse внутри HomeSearchIsland | unit + home screenshot |
| Свежие офферы модели | AffiliateOffer | reuse внутри ModelOffersIsland | unit + model screenshot |
| Мастер подбора | GuidedSelectionPage | extend режимом embedded | unit + podbor screenshot |
| Первый полезный экран | Rust SSR | extend стабильными island markers | Rust tests + performance probe |
| Стили | Tailwind tokens | reuse | drift scan |
