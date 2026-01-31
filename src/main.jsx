// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { FazendaProvider } from "./context/FazendaContext.jsx";
import "./index.css";

const appTree = (
  <BrowserRouter>
    <FazendaProvider>
      <App />
    </FazendaProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  import.meta.env.DEV ? appTree : <React.StrictMode>{appTree}</React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(console.error);
  });
}
