import React, { useMemo, useState } from "react";

import Plantel from "./Plantel";
import Secagem from "./Secagem";
import PrePartoParto from "./PrePartoParto";

const LS_LAST_TAB = "subabas:last";

const TABS = [
  { id: "plantel", label: "Plantel" },
  { id: "secagem", label: "Secagem" },
  { id: "preparto_parto", label: "Pré-parto / Parto" },
];

export default function SubAbasAnimais({ animais = [], onRefresh, isOnline }) {
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem(LS_LAST_TAB) || "plantel";
    } catch {
      return "plantel";
    }
  });

  const contadores = useMemo(() => {
    const lista = Array.isArray(animais) ? animais : [];
    return {
      plantel: lista.length,
      secagem: 0,
      preparto_parto: 0,
    };
  }, [animais]);

  return (
    <div className="w-full">
      {/* ===== SUB-ABAS (ENTERPRISE) ===== */}
      <div
        style={{
          display: "flex",
          gap: 20,
          padding: "4px 6px 0",
          borderBottom: "1px solid #e5e7eb",
          marginBottom: 8,
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                try {
                  localStorage.setItem(LS_LAST_TAB, t.id);
                } catch {}
              }}
              style={{
                appearance: "none",
                background: active
                  ? "rgba(20,184,166,0.10)"
                  : "transparent",
                border: "1px solid",
                borderColor: active
                  ? "rgba(20,184,166,0.35)"
                  : "transparent",
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
              {t.label}

              {/* contador discreto */}
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
                {contadores[t.id]}
              </span>

              {/* marcador ativo (barra teal) */}
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

      {/* ===== CONTEÚDO ===== */}
      <div style={{ paddingTop: 2 }}>
        {tab === "plantel" && (
          <Plantel
            animais={animais}
            onAtualizado={onRefresh}
            onCountChange={() => {}}
            isOnline={isOnline}
          />
        )}

        {tab === "secagem" && <Secagem animais={animais} isOnline={isOnline} />}

        {tab === "preparto_parto" && (
          <PrePartoParto animais={animais} isOnline={isOnline} />
        )}
      </div>
    </div>
  );
}
