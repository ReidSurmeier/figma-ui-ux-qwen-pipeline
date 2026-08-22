import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { OptionsWindow } from "./OptionsWindow";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OptionsWindow />
  </StrictMode>,
);
