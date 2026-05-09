import React from "react";
import ReactDOM from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import { I18nProvider } from "./shared/i18n";
import App from "./app/App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </HeroUIProvider>
  </React.StrictMode>,
);
