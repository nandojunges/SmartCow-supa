// src/pages/Animais/SubAbasAnimais.jsx
import React, { useMemo, useState } from "react";

// Sub-abas (arquivos locais desta pasta)
import Plantel from "./Plantel";
import Secagem from "./Secagem";
import PrePartoParto from "./PrePartoParto";

const LS_LAST_TAB = "subabas:last";

/* helpers simples para ativo/inativo (mesma lógica básica do Plantel) */
function isInativo(a) {
  const st = String(a?.status ?? "").toLowerCase();
  if (st === "inativo") return true;
  if (a?.tipo_saida || a?.motivo_saida || a?.data_saida) return true;
  const saiu =
    Array.isArray(a?.historico?.saidas) &&
    a.historico.saidas.length > 0;
  return saiu;
}
const isAtivo = (a) => !isInativo(a);

/* Chips (abas compactas) */
function Chips({ selected, setSelected, contadores }) {
  const tabs = useMemo(
    () => [
      { id: "plantel", label: "Plantel" },
      { id: "secagem", label: "Secagem" },
      { id: "preparto_parto", label: "Pré-parto/Parto" },
    ],
    []
  );

  return (
    <div
      role="tablist"
      aria-label="Sub-abas de animais"
      style={{
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
      }}
    >
      {tabs.map((t) => {
        const active = selected === t.id;
        const qtd = contadores?.[t.id] ?? 0;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            aria-controls={`pane-${t.id}`}
            onClick={() => {
              setSelected(t.id);
              try {
                localStorage.setItem(LS_LAST_TAB, t.id);
              } catch {}
            }}
            tabIndex={active ? 0 : -1}
            title={t.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 28,
              padding: "0 12px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: active ? 700 : 600,
              border: "1px solid",
              borderColor: active ? "#2563eb" : "#e5e7eb",
              background: active ? "#eaf2ff" : "#fff",
              color: active ? "#1e3a8a" : "#334155",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <span>{t.label}</span>
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
              {qtd}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* Componente principal */
export default function SubAbasAnimais({ animais = [], onRefresh }) {
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem(LS_LAST_TAB) || "plantel";
    } catch {
      return "plantel";
    }
  });

  const contadores = useMemo(() => {
    const lista = Array.isArray(animais) ? animais : [];
    const ativos = lista.filter(isAtivo);

    return {
      plantel: ativos.length, // só animais ativos
      secagem: 0,             // vamos preencher depois, quando a lógica de secagem estiver pronta
      preparto_parto: 0,      // idem
    };
  }, [animais]);

  return (
    <div
      className="w-full"
      style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      }}
    >
      <Chips
        selected={tab}
        setSelected={setTab}
        contadores={contadores}
      />

      <div
        id={`pane-${tab}`}
        role="tabpanel"
        aria-labelledby={tab}
        style={{ padding: 12 }}
      >
        {tab === "plantel" && (
          <Plantel
            animais={animais}
            onAtualizado={onRefresh}
            onCountChange={() => {}}
          />
        )}

        {tab === "secagem" && (
          <Secagem animais={animais} />
        )}

        {tab === "preparto_parto" && (
          <PrePartoParto animais={animais} />
        )}
      </div>
    </div>
  );
}
