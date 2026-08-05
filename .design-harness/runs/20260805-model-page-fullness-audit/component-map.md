# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Заголовок и паспорт модели | `ModelPage`, `ModelFacts` | reuse | SSR и screenshots |
| Доказательство совместимости | `CompatibilityProof` | reuse | verified count и conditional warning |
| Короткий блок предложений | `AffiliateOffer` | extend | теперь только `verified-fit` |
| Полный список креплений | `CatalogBrandGroups` | reuse | группы под native `<details>` |
