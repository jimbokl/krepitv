import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/roboto-condensed/700.css";
import "@fontsource/roboto-condensed/800.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import { App } from "./App.jsx";
import { loadCatalog } from "./lib/catalog.js";
import { bootClient } from "./lib/clientBoot.mjs";
import "./styles.css";

const rootElement = document.getElementById("root");

void bootClient({
  rootElement,
  loadCatalog,
  render(catalog) {
    createRoot(rootElement).render(
      <React.StrictMode>
        <App catalog={catalog} />
      </React.StrictMode>,
    );
  },
});
