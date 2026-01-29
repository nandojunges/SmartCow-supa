// src/layout/SistemaBase.jsx
import NavegacaoPrincipal from "./NavegacaoPrincipal";
import { Outlet } from "react-router-dom";

export default function SistemaBase({ tipoConta }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f3f4f6",
        fontFamily: "'Inter', 'Poppins', sans-serif",
      }}
    >
      {/* TOPO COM AS ABAS */}
      <header
        style={{
          width: "100%",
          backgroundColor: "#1c3586",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          zIndex: 10,
        }}
      >
        {/* Agora sem maxWidth, ocupa toda a tela */}
        <NavegacaoPrincipal tipoConta={tipoConta} />
      </header>

      {/* CONTEÚDO DAS PÁGINAS */}
      <main
        style={{
          flex: 1,
          width: "100%",
          overflowY: "auto",
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            width: "100%",
            padding: "16px 16px 32px 16px",
            boxSizing: "border-box",
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
