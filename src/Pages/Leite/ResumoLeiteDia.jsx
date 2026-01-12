// src/pages/Leite/ResumoLeiteDia.jsx
import React from "react";

/* ========== CARD RESUMO ========== */
function CardResumo({ titulo, valor, subtitulo }) {
  return (
    <div
      style={{
        background: "#f1f5f9",
        borderRadius: "12px",
        padding: "12px 14px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: 70,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 2,
        }}
      >
        {valor}
      </div>

      {subtitulo && (
        <div style={{ fontSize: 12, color: "#6b7280" }}>{subtitulo}</div>
      )}
    </div>
  );
}

/**
 * Resumo do dia (cards do print)
 * props:
 * - resumoDia: { producaoTotal, mediaPorVaca, melhor, pior, qtdComMedicao }
 * - qtdLactacao: number
 */
export default function ResumoLeiteDia({ resumoDia, qtdLactacao = 0 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: "12px",
        marginBottom: "16px",
      }}
    >
      <CardResumo
        titulo="Produção total do dia"
        valor={`${resumoDia?.producaoTotal ?? "0.0"} L`}
        subtitulo={
          (resumoDia?.qtdComMedicao ?? 0) > 0
            ? `${resumoDia.qtdComMedicao} vacas com medição`
            : "Sem medições neste dia"
        }
      />

      <CardResumo
        titulo="Média por vaca"
        valor={`${resumoDia?.mediaPorVaca ?? "0.0"} L/vaca`}
        subtitulo={`${qtdLactacao} vacas em lactação`}
      />

      <CardResumo
        titulo="Melhor vaca do dia"
        valor={
          resumoDia?.melhor ? `${resumoDia.melhor.total.toFixed(1)} L` : "—"
        }
        subtitulo={
          resumoDia?.melhor
            ? `Nº ${resumoDia.melhor.vaca.numero} • Brinco ${
                resumoDia.melhor.vaca.brinco ?? "—"
              }`
            : "Sem dados"
        }
      />

      <CardResumo
        titulo="Pior vaca do dia"
        valor={resumoDia?.pior ? `${resumoDia.pior.total.toFixed(1)} L` : "—"}
        subtitulo={
          resumoDia?.pior
            ? `Nº ${resumoDia.pior.vaca.numero} • Brinco ${
                resumoDia.pior.vaca.brinco ?? "—"
              }`
            : "Sem dados"
        }
      />
    </div>
  );
}
