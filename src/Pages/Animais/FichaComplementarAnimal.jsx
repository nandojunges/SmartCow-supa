// src/pages/Animais/FichaComplementarAnimal.jsx
import React from "react";

export default function FichaComplementarAnimal({
  numero,
  brinco,
  nascimento,
  sexo,
  raca,
  titulo = "Ficha complementar",
}) {
  // por enquanto é apenas visual; depois vamos ligar com pai, mãe,
  // último parto, última IA, etc.
  return (
    <div>
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: 15,
          fontWeight: 900,
          color: "#0f172a",
        }}
      >
        {titulo}
      </h3>

      <div style={linha}>
        <span style={k}>Número</span>
        <span style={v}>{numero || "—"}</span>
      </div>
      <div style={linha}>
        <span style={k}>Brinco</span>
        <span style={v}>{brinco || "—"}</span>
      </div>
      <div style={linha}>
        <span style={k}>Nascimento</span>
        <span style={v}>{nascimento || "—"}</span>
      </div>
      <div style={linha}>
        <span style={k}>Sexo</span>
        <span style={v}>
          {sexo === "femea" ? "Fêmea" : sexo === "macho" ? "Macho" : "—"}
        </span>
      </div>
      <div style={linha}>
        <span style={k}>Raça</span>
        <span style={v}>{raca || "—"}</span>
      </div>

      <div style={divisor} />

      <div style={linha}>
        <span style={k}>Pai</span>
        <span style={v}>—</span>
      </div>
      <div style={linha}>
        <span style={k}>Mãe</span>
        <span style={v}>—</span>
      </div>
      <div style={linha}>
        <span style={k}>Último parto</span>
        <span style={v}>—</span>
      </div>
      <div style={linha}>
        <span style={k}>Última IA</span>
        <span style={v}>—</span>
      </div>
      <div style={linha}>
        <span style={k}>Previsão de parto</span>
        <span style={v}>—</span>
      </div>

      <p
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "#6b7280",
        }}
      >
        Em breve esta ficha vai puxar automaticamente o histórico completo
        (pai, mãe, partos, secagens e inseminações) do animal.
      </p>
    </div>
  );
}

const linha = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  marginBottom: 5,
};

const k = { color: "#64748b", fontWeight: 700 };
const v = { color: "#111827", fontWeight: 900 };

const divisor = {
  height: 1,
  background: "#e5e7eb",
  margin: "8px 0",
};
