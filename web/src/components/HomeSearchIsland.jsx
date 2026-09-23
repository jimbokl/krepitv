import { useState } from "react";
import { ModelSearch } from "./ModelSearch.jsx";

export function HomeSearchIsland({ search }) {
  const [query, setQuery] = useState("");

  function openModel(item) {
    window.location.assign(item.href || `/modeli/${item.id}/`);
  }

  return (
    <ModelSearch
      buttonLabel="Открыть модель"
      compact
      onChange={setQuery}
      onSubmit={openModel}
      placeholder="Например, TCL 55C7K"
      search={search}
      value={query}
    />
  );
}
