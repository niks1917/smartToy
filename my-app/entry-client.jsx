import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./src//components/App";
import "./base.css";

ReactDOM.hydrateRoot(
  document.getElementById("root"),
  <StrictMode>
    <App />
  </StrictMode>,
);
