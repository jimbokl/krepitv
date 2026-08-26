import { useState } from "react";
import { ModelSearch } from "./ModelSearch.jsx";

export function HomeSearchIsland({ search }) {
  const [query, setQuery] = useState("");

  function openModel(item) {
    window.location.assign(item.href || `/modeli/${item.id}/`);
  }

  return (
    <ModelSearch
      onChange={setQuery}
      onSubmit={openModel}
      search={search}
      value={query}
    />
  );
}
