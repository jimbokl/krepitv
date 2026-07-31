import { useEffect, useState } from "react";
import { loadCatalog } from "../lib/catalog.js";

export function useCatalog() {
  const [state, setState] = useState({
    status: "loading",
    models: [],
    mounts: [],
    search: [],
    seoPages: [],
    compatibilityEdges: [],
    commercialProfiles: [],
    affiliateOffers: [],
    hubAffiliateOffers: [],
    error: null,
  });

  useEffect(() => {
    let active = true;
    loadCatalog()
      .then((catalog) => {
        if (active) setState({ status: "ready", error: null, ...catalog });
      })
      .catch((error) => {
        if (active) {
          setState((current) => ({
            ...current,
            status: "error",
            error: error instanceof Error ? error.message : "Неизвестная ошибка",
          }));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
