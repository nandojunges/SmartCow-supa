// src/layout/NavegacaoPrincipal.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// SEM ADMIN E SEM RELATÓRIOS
const ABAS_BASE = [
  { id: "inicio",     label: "INÍCIO",              icone: "/icones/home.png",       title: "Página inicial" },
  { id: "animais",    label: "ANIMAIS",             icone: "/icones/plantel.png",    title: "Controle de animais" },
  { id: "bezerras",   label: "BEZERRAS",            icone: "/icones/bezerra.png",    title: "Controle das bezerras" },
  { id: "reproducao", label: "REPRODUÇÃO",          icone: "/icones/reproducao.png", title: "Reprodução e fertilidade" },
  { id: "leite",      label: "LEITE",               icone: "/icones/leite.png",      title: "Controle leiteiro" },
  { id: "saude",      label: "SAÚDE",               icone: "/icones/saude.png",      title: "Controle sanitário" },
  { id: "consumo",    label: "CONSUMO E REPOSIÇÃO", icone: "/icones/estoque.png",    title: "Gestão de estoque" },
  { id: "financeiro", label: "FINANCEIRO",          icone: "/icones/financeiro.png", title: "Relatórios financeiros" },
  { id: "calendario", label: "CALENDÁRIO",          icone: "/icones/calendario.png", title: "Agenda de atividades" },
  { id: "ajustes",    label: "AJUSTES",             icone: "/icones/indicadores.png",title: "Configurações do sistema" },
];

export default function NavegacaoPrincipal() {
  const navigate = useNavigate();
  const location = useLocation();
  const abaAtiva = location.pathname.split("/")[1] || "inicio";

  const abas = ABAS_BASE;
  const sizeBase = 65;

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#1c3586",
        padding: "12px 16px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Botão Sair, fixo no canto direito */}
      <button
        onClick={async () => {
          await supabase.auth.signOut(); // App.jsx volta pro Login
        }}
        title="Sair do sistema"
        style={{
          position: "absolute",
          top: 8,
          right: 16,
          backgroundColor: "#dc2626",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "6px 12px",
          cursor: "pointer",
          fontWeight: "bold",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          transition: "background-color 0.2s ease, opacity 0.2s ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = "#b91c1c";
          e.currentTarget.style.opacity = 0.9;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "#dc2626";
          e.currentTarget.style.opacity = 1;
        }}
      >
        Sair
      </button>

      {/* Abas – ocupando 100% da largura */}
      <nav
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-evenly",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {abas.map((aba) => {
          const isAtiva = abaAtiva === aba.id;
          const size = isAtiva ? sizeBase + 15 : sizeBase;

          return (
            <div
              key={aba.id}
              data-id={aba.id}
              onClick={() => navigate(`/${aba.id}`)}
              title={aba.title}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "100px",
                flexShrink: 0,
                cursor: "pointer",
                borderRadius: "14px",
                padding: "10px 6px",
                textAlign: "center",
                backgroundColor: isAtiva ? "white" : "transparent",
                boxShadow: isAtiva ? "0 4px 12px rgba(0, 0, 0, 0.1)" : "none",
                transition: "all 0.2s ease-in-out",
              }}
            >
              <img
                alt={aba.label}
                src={aba.icone}
                onError={(e) => (e.currentTarget.src = "/icones/padrao.png")}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  objectFit: "contain",
                  transition: "all 0.2s ease-in-out",
                }}
              />
              <span
                style={{
                  marginTop: "8px",
                  fontSize: "15px",
                  fontWeight: isAtiva ? 700 : 600,
                  color: isAtiva ? "#000" : "#fff",
                  textAlign: "center",
                }}
              >
                {aba.label}
              </span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
