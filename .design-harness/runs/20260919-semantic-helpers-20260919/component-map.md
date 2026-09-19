# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Оболочка и таблица | SeoPage, SeoEvidenceGuide | extend | SSR и browser gate |
| Форма | input-control, primary-button | reuse | snapshots |
| VESA | VesaMatchCalculator | extend defaults | Rust tests |
| План подключения | Rust/WASM + ConnectionHelper | create | branch tests |
