import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFazenda } from "../../context/FazendaContext";
import SelecioneFazenda from "../../components/SelecioneFazenda";

// Subpáginas (mantidas para visualização do layout)
import Estoque from "./Estoque";
import Dieta from "./Dieta";
import Lotes from "./Lotes";
import Limpeza from "./Limpeza";
import CalendarioSanitario from "./CalendarioSanitario";

const LS_LAST_TAB = "consumo:subabas:last";

/* ========================= Chips (abas compactas) ========================= */
function Chips({ selected, setSelected, contadores }) {
  const tabs = useMemo(
    () => [
      { id: "estoque", label: "Estoque" },
      { id: "lotes", label: "Lotes" },
      { id: "dieta", label: "Dietas" },
      { id: "limpeza", label: "Limpeza" },
      { id: "calendario", label: "Calendário Sanitário" },
    ],
    []
  );

  const onKey = useCallback(
    (e) => {
      const idx = tabs.findIndex((t) => t.id === selected);
      if (idx === -1) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelected(tabs[(idx + 1) % tabs.length].id);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelected(tabs[(idx - 1 + tabs.length) % tabs.length].id);
      }
    },
    [selected, setSelected, tabs]
  );

  return (
    <div
      role="tablist"
      aria-label="Sub-abas de consumo e reposição"
      onKeyDown={onKey}
      style={chips.wrap}
    >
      {tabs.map((t) => {
        const active = selected === t.id;
        const qtd = contadores?.[t.id];

        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            aria-controls={`pane-${t.id}`}
            onClick={() => setSelected(t.id)}
            tabIndex={active ? 0 : -1}
            title={t.label}
            style={{
              ...chips.btn,
              borderColor: active ? "#2563eb" : "#e5e7eb",
              background: active ? "#eaf2ff" : "#fff",
              color: active ? "#1e3a8a" : "#334155",
              fontWeight: active ? 700 : 600,
            }}
          >
            <span>{t.label}</span>

            {/* Badge provisório (depois ligamos nos dados reais do Supabase) */}
            <span
              style={{
                minWidth: 18,
                height: 18,
                padding: "0 6px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: active ? "#1e40af" : "#e5e7eb",
                color: active ? "#fff" : "#111827",
              }}
            >
              {Number.isFinite(qtd) ? qtd : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ========================= Página principal (layout-only) ========================= */
export default function ConsumoReposicao() {
  const { fazendaAtualId } = useFazenda();
  const [tab, setTab] = useState(() => localStorage.getItem(LS_LAST_TAB) || "estoque");

  useEffect(() => {
    localStorage.setItem(LS_LAST_TAB, tab);
  }, [tab]);

  // Contadores “placeholder” (depois reconstruímos com Supabase)
  const [counts] = useState({
    estoque: null,
    lotes: null,
    dieta: null,
    limpeza: null,
    calendario: null,
  });

  if (!fazendaAtualId) {
    return <SelecioneFazenda />;
  }

  return (
    <div style={ui.page}>
      <Chips selected={tab} setSelected={setTab} contadores={counts} />

      <div id={`pane-${tab}`} role="tabpanel" aria-labelledby={tab} style={{ padding: 12 }}>
        {tab === "estoque" && <Estoque />}
        {tab === "lotes" && <Lotes />}
        {tab === "dieta" && <Dieta />}
        {tab === "limpeza" && <Limpeza />}
        {tab === "calendario" && <CalendarioSanitario />}
      </div>
    </div>
  );
}

/* ========================= Estilos inline ========================= */
const ui = {
  page: {
    padding: 12,
    background: "#f6f7fb",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    minHeight: "100dvh",
    borderRadius: 16,
  },
};

const chips = {
  wrap: {
    position: "sticky",
    top: 0,
    zIndex: 5,
    display: "flex",
    gap: 8,
    padding: 6,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    minHeight: 40,
    alignItems: "center",
    overflowX: "auto",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 28,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background .15s ease, color .15s ease, border-color .15s ease",
  },
};
