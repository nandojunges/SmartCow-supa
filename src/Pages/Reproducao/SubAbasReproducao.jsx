import React from "react";

const TABS = [
  { id: "visaoGeral", label: "Visão Geral" },
  { id: "protocolos", label: "Protocolos" },
  { id: "cadastro", label: "Cadastro" },
  { id: "relatorios", label: "Relatórios" },
  { id: "inseminacoes", label: "Inseminações" },
];

export default function SubAbasReproducao({ abaAtiva, onChange, contadores }) {
  const handleKeyDown = (event) => {
    const idx = TABS.findIndex((t) => t.id === abaAtiva);
    if (idx === -1) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      onChange(TABS[(idx + 1) % TABS.length].id);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onChange(TABS[(idx - 1 + TABS.length) % TABS.length].id);
    }
  };

  return (
    <div className="w-full" onKeyDown={handleKeyDown} role="tablist">
      <div
        style={{
          display: "flex",
          gap: 20,
          padding: "4px 6px 0",
          borderBottom: "1px solid #e5e7eb",
          marginBottom: 8,
        }}
      >
        {TABS.map((tab) => {
          const active = abaAtiva === tab.id;
          const contador = contadores?.[tab.id] ?? 0;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`pane-${tab.id}`}
              onClick={() => onChange(tab.id)}
              style={{
                appearance: "none",
                background: active ? "rgba(20,184,166,0.10)" : "transparent",
                border: "1px solid",
                borderColor: active ? "rgba(20,184,166,0.35)" : "transparent",
                padding: "8px 12px 10px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: active ? 800 : 650,
                color: active ? "#0f766e" : "#334155",
                cursor: "pointer",
                position: "relative",
                outline: "none",
                transition:
                  "background 160ms ease, border-color 160ms ease, transform 120ms ease",
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "translateY(1px)")
              }
              onMouseUp={(e) =>
                (e.currentTarget.style.transform = "translateY(0px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0px)")
              }
              onFocus={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(20,184,166,0.25)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {tab.label}

              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: active
                    ? "rgba(15,118,110,0.12)"
                    : "rgba(148,163,184,0.18)",
                  color: active ? "#0f766e" : "#64748b",
                }}
              >
                {contador}
              </span>

              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    right: 10,
                    bottom: -2,
                    height: 2,
                    borderRadius: 2,
                    background: "#14b8a6",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}