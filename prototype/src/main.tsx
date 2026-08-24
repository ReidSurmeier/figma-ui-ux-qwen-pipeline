import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Desktop } from "./Desktop";
import { OptionsWindow } from "./OptionsWindow";
import "./styles.css";

const parameters = new URLSearchParams(window.location.search);
const legacyView = parameters.get("view");
const isolatedWindow = parameters.get("isolate");
const isolatedOptions = legacyView === "options";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isolatedOptions ? <div className="options-isolated"><OptionsWindow /></div> : <Desktop onlyWindowId={isolatedWindow || undefined} />}
  </StrictMode>,
);
