// src/pages/ConsumoReposicao/ModalAjustesEstoque.jsx
// ✅ SOMENTE LAYOUT (SEM BACKEND)
// Modal separado para Ajustes de Estoque (mínimos por categoria)

import React, { useEffect, useMemo, useState } from "react";
import "../../styles/botoes.css";

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalCard = {
  background: "#fff",
  borderRadius: "1rem",
  width: "860px",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  fontFamily: "Poppins, sans-serif",
  overflow: "hidden",
};

const modalHeader = {
  background: "#1e40af",
  color: "#fff",
  padding: "1rem 1.2rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

export default function ModalAjustesEstoque({ open, minimos, onChange, onClose }) {
  const categorias = useMemo(() => Object.keys(minimos || {}), [minimos]);
  const [local, setLocal] = useState(() => ({ ...(minimos || {}) }));

  useEffect(() => {
    setLocal({ ...(minimos || {}) });
  }, [minimos]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const setCat = (cat, v) => {
    const num = Number(v);
    setLocal((p) => ({ ...p, [cat]: Number.isFinite(num) ? num : p[cat] }));
  };

  const salvar = () => {
    onChange?.(local);
    onClose?.();
  };

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <span style={{ fontWeight: "bold" }}>Ajustes de Estoque</span>
          <button className="px-2 text-white/90 hover:text-white" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-auto">
          <div className="text-sm text-gray-600 mb-3">
            Defina o mínimo por categoria para o alerta “Estoque baixo”.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categorias.map((cat) => (
              <div key={cat} className="border rounded-xl p-3 bg-white">
                <div className="font-bold text-[#1e3a8a] mb-2">{cat}</div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-[#374151]">Mínimo</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 rounded border border-gray-300 bg-white"
                    value={String(local?.[cat] ?? 1)}
                    onChange={(e) => setCat(cat, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button className="botao-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button className="botao-acao" onClick={salvar}>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
