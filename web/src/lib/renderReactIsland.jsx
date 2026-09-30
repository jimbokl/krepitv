import React from "react";
import { createRoot } from "react-dom/client";

export function renderReactIsland(element, Component, props) {
  createRoot(element).render(
    <React.StrictMode><Component {...props} /></React.StrictMode>,
  );
}
