// src/pages/Financeiro/ResumoFinanceiroCards.jsx
import React from "react";

function moneyBR(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CardResumo({ titulo, valor, subtitulo }) {
  return (
    <div
      style={{
        background: "#f1f5f9",
        borderRadius: 12,
        padding: "12px 14px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: 76,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        {titulo}
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 2 }}>
        {valor}
      </div>

      {subtitulo && <div style={{ fontSize: 12, color: "#6b7280" }}>{subtitulo}</div>}
    </div>
  );
}

/**
 * Cards do Financeiro (você pode mexer aqui à vontade sem encostar na tabela).
 * props:
 * - resumo: { entradas, saidas, saldo }
 * - custoFixo: number
 */
export default function ResumoFinanceiroCards({ resumo, custoFixo }) {
  const entradas = resumo?.entradas ?? 0;
  const saidas = resumo?.saidas ?? 0;
  const saldo = resumo?.saldo ?? 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <CardResumo
        titulo="Saldo do período"
        valor={moneyBR(saldo)}
        subtitulo={`Entradas ${moneyBR(entradas)} • Saídas ${moneyBR(saidas)}`}
      />

      <CardResumo
        titulo="Entradas"
        valor={moneyBR(entradas)}
        subtitulo="Receita (leite, vendas, outros)"
      />

      <CardResumo
        titulo="Saídas"
        valor={moneyBR(saidas)}
        subtitulo="Compras, fixos, tratamentos, etc."
      />

      <CardResumo
        titulo="Resultado menos fixo"
        valor={moneyBR(saldo - (Number(custoFixo) || 0))}
        subtitulo={
          (Number(custoFixo) || 0) > 0
            ? `Fixos estimados: ${moneyBR(custoFixo)}`
            : "Defina os fixos para comparar"
        }
      />
    </div>
  );
}
