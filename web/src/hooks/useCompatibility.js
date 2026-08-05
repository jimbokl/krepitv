import { useEffect, useState } from "react";
import { findCompatibleMounts } from "../lib/catalog.js";

export function useCompatibility(model, mounts, mechanism = "any", retryKey = 0) {
  const [state, setState] = useState({
    status: "idle",
    matches: [],
    error: null,
  });

  useEffect(() => {
    let active = true;
    if (!model || !mounts.length) {
      setState({ status: "idle", matches: [], error: null });
      return () => {
        active = false;
      };
    }

    setState({ status: "loading", matches: [], error: null });
    findCompatibleMounts(model, mounts, mechanism)
      .then((matches) => {
        if (active) setState({ status: "ready", matches, error: null });
      })
      .catch((error) => {
        if (active) {
          setState({
            status: "error",
            matches: [],
            error:
              error instanceof Error
                ? error.message
                : "Не удалось проверить совместимость",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [mechanism, model, mounts, retryKey]);

  return state;
}
