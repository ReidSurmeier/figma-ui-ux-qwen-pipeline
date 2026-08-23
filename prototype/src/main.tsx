import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Desktop } from "./Desktop";
import { OptionsWindow } from "./OptionsWindow";
import "./styles.css";

const isolatedOptions = new URLSearchParams(window.location.search).get("view") === "options";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isolatedOptions ? <div className="options-isolated"><OptionsWindow /></div> : <Desktop />}
  </StrictMode>,
);
