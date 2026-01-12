import React, { useEffect, useMemo, useState } from "react";

/* ===== helpers ===== */
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function brFromISO(iso) {
  if (!iso) return "";
  const dt = new Date(iso + "T00:00:00");
  if (Number.isNaN(dt.getTime())) return String(iso);
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}
function clampISO(s) {
  if (!s) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}
function firstLastOfMonth(refISO) {
  const ref = refISO ? new Date(refISO + "T00:00:00") : new Date();
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const ini = new Date(y, m, 1);
  const fim = new Date(y, m + 1, 0);
  return { ini: toISODate(ini), fim: toISODate(fim) };
}

/* ===================== MODAL ===================== */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: 16,
};

const modalCard = {
  width: "min(760px, 96vw)",
  background: "#fff",
  borderRadius: 16,
  overflow: "hidden",
  fontFamily: "Poppins, sans-serif",
  boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
};

const header = {
  background: "#1e3a8a",
  color: "#fff",
  padding: "14px 18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: 900,
  fontSize: "1.05rem",
};

const btnHeader = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  padding: "0.45rem 1.1rem",
  borderRadius: "999px",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: 800,
};

const body = {
  padding: 18,
  display: "grid",
  gap: 14,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16, // ✅ espaço real entre as datas (não sobrepõe)
  alignItems: "end",
};

const label = {
  fontSize: 12,
  fontWeight: 900,
  color: "#374151",
  marginBottom: 6,
};

const input = {
  width: "100%",
  height: 46,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "0 12px",
  outline: "none",
  fontSize: 14,
  background: "#fff",
  boxSizing: "border-box",
};

const footer = {
  padding: 18,
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const btnSoft = {
  borderRadius: 999,
  padding: "10px 16px",
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  fontWeight: 900,
  cursor: "pointer",
};

const btnCancel = {
  borderRadius: 999,
  padding: "10px 16px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const btnApply = {
  borderRadius: 999,
  padding: "10px 18px",
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

export default function ModalPeriodoFinanceiro({
  aberto,
  onClose,
  valorInicial, // { ini, fim }
  onAplicar, // ({ ini, fim })
}) {
  const hojeISO = useMemo(() => toISODate(new Date()), []);
  const padraoMesAtual = useMemo(() => firstLastOfMonth(hojeISO), [hojeISO]);

  const [ini, setIni] = useState(valorInicial?.ini || padraoMesAtual.ini);
  const [fim, setFim] = useState(valorInicial?.fim || padraoMesAtual.fim);

  useEffect(() => {
    if (!aberto) return;
    setIni(valorInicial?.ini || padraoMesAtual.ini);
    setFim(valorInicial?.fim || padraoMesAtual.fim);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, onClose]);

  if (!aberto) return null;

  function aplicar() {
    const a = clampISO(ini);
    const b = clampISO(fim);
    if (!a || !b) {
      alert("Período inválido.");
      return;
    }
    if (a > b) {
      alert("O início não pode ser maior que o fim.");
      return;
    }
    onAplicar?.({ ini: a, fim: b });
  }

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
        <div style={header}>
          <span>Período</span>
          <button type="button" onClick={onClose} style={btnHeader}>
            Fechar
          </button>
        </div>

        <div style={body}>
          <div style={grid2}>
            <div>
              <div style={label}>Início</div>
              <input
                style={input}
                type="date"
                value={ini}
                onChange={(e) => setIni(e.target.value)}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                {brFromISO(ini)}
              </div>
            </div>

            <div>
              <div style={label}>Fim</div>
              <input
                style={input}
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                {brFromISO(fim)}
              </div>
            </div>
          </div>
        </div>

        <div style={footer}>
          <button
            type="button"
            style={btnSoft}
            onClick={() => {
              const p = firstLastOfMonth(hojeISO);
              setIni(p.ini);
              setFim(p.fim);
            }}
            title="Define automaticamente o mês atual"
          >
            Mês atual
          </button>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="button" style={btnCancel} onClick={onClose}>
              Cancelar
            </button>
            <button type="button" style={btnApply} onClick={aplicar}>
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
