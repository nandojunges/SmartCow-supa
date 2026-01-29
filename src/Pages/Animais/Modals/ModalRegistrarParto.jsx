import React, { useEffect, useState } from "react";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: 12,
};

const modalStyle = {
  background: "#fff",
  width: "min(720px, 95vw)",
  borderRadius: 16,
  boxShadow: "0 0 24px rgba(15,23,42,0.35)",
  overflow: "hidden",
  fontFamily: "Poppins, sans-serif",
};

const headerStyle = {
  background: "#1e3a8a",
  color: "#fff",
  padding: "14px 18px",
  fontWeight: 800,
  fontSize: "1.05rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const closeButtonStyle = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  padding: "6px 14px",
  borderRadius: "999px",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  height: 40,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  padding: "0 12px",
  fontSize: 14,
};

export default function ModalRegistrarParto({ animal, onClose, onSave }) {
  const [dataParto, setDataParto] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const salvar = () => {
    if (!dataParto) {
      setErro("Informe a data do parto.");
      return;
    }
    setErro("");
    onSave?.({
      dataParto,
      observacoes,
    });
  };

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={modalStyle} onMouseDown={(event) => event.stopPropagation()}>
        <div style={headerStyle}>
          <span>Registrar parto</span>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            Fechar
          </button>
        </div>

        <div style={{ padding: 18, display: "grid", gap: 12 }}>
          <div>
            <label style={{ fontWeight: 700, fontSize: 13 }}>Animal</label>
            <input style={inputStyle} value={`${animal?.numero ?? ""} • Brinco ${animal?.brinco ?? "—"}`} disabled />
          </div>

          <div>
            <label style={{ fontWeight: 700, fontSize: 13 }}>Data do parto *</label>
            <input
              style={inputStyle}
              type="date"
              value={dataParto}
              onChange={(event) => setDataParto(event.target.value)}
            />
          </div>

          <div>
            <label style={{ fontWeight: 700, fontSize: 13 }}>Observações</label>
            <textarea
              style={{ ...inputStyle, height: 90, paddingTop: 10 }}
              rows={3}
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Anotações sobre o parto"
            />
          </div>

          {erro && <div style={{ color: "#b91c1c", fontWeight: 700 }}>{erro}</div>}
        </div>

        <div
          style={{
            padding: 18,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <button type="button" onClick={onClose} style={{ ...closeButtonStyle, background: "#fff" }}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              padding: "8px 18px",
              borderRadius: 999,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Salvar parto
          </button>
        </div>
      </div>
    </div>
  );
}
