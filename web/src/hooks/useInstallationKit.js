import { useEffect, useState } from "react";
import { buildInstallationKit } from "../lib/catalog.js";

const IDLE = Object.freeze({ status: "idle", plan: null, error: null });

export function useInstallationKit(values, revision = 0) {
  const [state, setState] = useState(IDLE);

  useEffect(() => {
    let active = true;
    if (!values) {
      setState(IDLE);
      return () => {
        active = false;
      };
    }

    setState({ status: "loading", plan: null, error: null });
    buildInstallationKit(values)
      .then((plan) => {
        if (active) setState({ status: "ready", plan, error: null });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          status: "error",
          plan: null,
          error: error instanceof Error
            ? error.message
            : "Не удалось собрать монтажный комплект.",
        });
      });

    return () => {
      active = false;
    };
  }, [revision, values]);

  return state;
}
