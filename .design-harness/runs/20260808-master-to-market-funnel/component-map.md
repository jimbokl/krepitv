# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Общий следующий шаг | `primary-button`, border/grid tokens | create `MountFunnelNextStep` | React screenshot + SSR verify |
| Подбор по модели | `GuidedSelectionPage` | reuse | success-state test |
| Карточка кронштейна | `CompatibilityCard` + `MountDetailLink` | reuse | existing component tests |
| Переход на Маркет | `MountPage` + `AffiliateOffer`/search fallback | reuse | 25/25 whole-site verify |
