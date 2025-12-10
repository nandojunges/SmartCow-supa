// src/pages/Animais/FichaComplementarAnimal.jsx
import React from "react";

export default function FichaComplementarAnimal({
  numero,
  brinco,
  nascimento,
  sexo,
  raca,
  pai,
  mae,
  ultimoParto,
  ultimaIA,
  previsaoParto,
}) {
  const safe = (v) => (v && String(v).trim() ? v : "—");

  return (
    <div style={card}>
      <div style={cardHeader}>
        <div style={cardTitle}>Ficha complementar</div>
      </div>

      <div style={grid}>
        <LinhaKV rotulo="Número" valor={safe(numero)} />
        <LinhaKV rotulo="Brinco" valor={safe(brinco)} />
        <LinhaKV rotulo="Nascimento" valor={safe(nascimento)} />
        <LinhaKV rotulo="Sexo" valor={safe(sexo)} />
        <LinhaKV rotulo="Raça" valor={safe(raca)} />

        <Separador />

        <LinhaKV rotulo="Pai" valor={safe(pai)} />
        <LinhaKV rotulo="Mãe" valor={safe(mae)} />

        <Separador />

        <LinhaKV rotulo="Último parto" valor={safe(ultimoParto)} />
        <LinhaKV rotulo="Última IA" valor={safe(ultimaIA)} />
        <LinhaKV rotulo="Previsão de parto" valor={safe(previsaoParto)} />
      </div>

      <div style={notaRodape}>
        Em breve esta ficha vai puxar automaticamente o histórico completo
        (pai, mãe, partos, secagens e inseminações) do animal.
      </div>
    </div>
  );
}

/* ========== componentes internos ========== */

function LinhaKV({ rotulo, valor }) {
  return (
    <div style={rowKV}>
      <span style={k}>{rotulo}</span>
      <span style={v}>{valor}</span>
    </div>
  );
}

function Separador() {
  return <div style={separator} />;
}

/* ========== estilos locais (baseados no projeto antigo) ========== */

const card = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
  marginTop: 12,
  fontFamily: "Poppins, system-ui, sans-serif",
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const cardTitle = {
  fontWeight: 900,
  fontSize: 16,
  color: "#0f172a",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 6,
};

const rowKV = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 14,
};

const k = {
  color: "#64748b",
  fontWeight: 700,
};

const v = {
  color: "#111827",
  fontWeight: 900,
};

const separator = {
  height: 1,
  background: "#e5e7eb",
  margin: "6px 0",
};

const notaRodape = {
  marginTop: 10,
  fontSize: 12,
  color: "#94a3b8",
  lineHeight: 1.4,
};
