// BezerraCard.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";
import Badge from "../ui/Badge";

export default function BezerraCard({ bezerra, isSelected, onSelect }) {
  const navigate = useNavigate();

  const pesagens = Array.isArray(bezerra?.pesagens) ? bezerra.pesagens : [];

  // última e penúltima pesagem (seguro)
  const lastWeight = pesagens.length ? pesagens[pesagens.length - 1] : null;
  const previousWeight = pesagens.length >= 2 ? pesagens[pesagens.length - 2] : null;

  const weightDiff = useMemo(() => {
    const lw = Number(lastWeight?.peso);
    const pw = Number(previousWeight?.peso);
    if (Number.isFinite(lw) && Number.isFinite(pw)) return lw - pw;
    return 0;
  }, [lastWeight, previousWeight]);

  // GMD médio ponderado por dias (mais correto que média simples)
  const gmd = useMemo(() => {
    if (pesagens.length < 2) return 0;

    let ganhoTotal = 0;
    let diasTotal = 0;

    for (let i = 1; i < pesagens.length; i++) {
      const p0 = pesagens[i - 1];
      const p1 = pesagens[i];

      const w0 = Number(p0?.peso);
      const w1 = Number(p1?.peso);
      const d0 = Number(p0?.idadeDias);
      const d1 = Number(p1?.idadeDias);

      if (!Number.isFinite(w0) || !Number.isFinite(w1) || !Number.isFinite(d0) || !Number.isFinite(d1)) continue;

      const days = d1 - d0;
      if (days <= 0) continue;

      ganhoTotal += w1 - w0;
      diasTotal += days;
    }

    return diasTotal > 0 ? ganhoTotal / diasTotal : 0;
  }, [pesagens]);

  const categoriaLabel =
    bezerra?.categoria === "neonatal"
      ? "Neonatal"
      : bezerra?.categoria === "aleitamento"
      ? "Aleitamento"
      : bezerra?.categoria === "transicao"
      ? "Transição"
      : "Desmamada";

  const status = bezerra?.status || "saudavel";

  const statusClass =
    status === "saudavel"
      ? "bg-emerald-500/20 text-emerald-400"
      : status === "alerta"
      ? "bg-amber-500/20 text-amber-400"
      : status === "critico"
      ? "bg-red-500/20 text-red-400"
      : "bg-blue-500/20 text-blue-400";

  const handleOpen = () => {
    if (!bezerra?.id) return;
    navigate(`/bezerras/${bezerra.id}`);
  };

  return (
    <div
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleOpen();
      }}
      className={`relative bg-slate-900 border rounded-xl p-5 cursor-pointer transition-all group outline-none ${
        isSelected ? "border-cyan-500 shadow-lg shadow-cyan-500/10" : "border-slate-800 hover:border-slate-700"
      }`}
    >
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${statusClass}`}>
            {(bezerra?.nome?.charAt?.(0) || bezerra?.brinco?.charAt?.(0) || "B").toUpperCase()}
          </div>

          <div className="min-w-0">
            <h3 className="text-white font-bold group-hover:text-cyan-400 transition-colors truncate">
              {bezerra?.brinco || "—"}
            </h3>
            <p className="text-slate-500 text-sm truncate">{bezerra?.nome || ""}</p>
          </div>
        </div>

        {/* Checkbox não dispara clique no card */}
        <input
          type="checkbox"
          checked={!!isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onSelect?.(bezerra);
          }}
          className="w-5 h-5 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 bg-slate-800"
          aria-label="Selecionar bezerra para comparação"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-950 rounded-lg p-3">
          <div className="text-slate-500 text-xs mb-1">Peso Atual</div>
          <div className="text-white font-bold">{Number(bezerra?.pesoAtual || 0)} kg</div>

          <div className={`text-xs flex items-center gap-1 mt-1 ${weightDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            <TrendingUp size={12} />
            {weightDiff >= 0 ? "+" : ""}
            {weightDiff.toFixed(1)} kg
          </div>
        </div>

        <div className="bg-slate-950 rounded-lg p-3">
          <div className="text-slate-500 text-xs mb-1">GMD</div>
          <div className="text-white font-bold">{gmd.toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">kg/dia</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Badge variant={bezerra?.categoria}>{categoriaLabel}</Badge>

        {/* Botão explícito (mas o card inteiro também abre) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
        >
          Detalhes <ChevronRight size={16} />
        </button>
      </div>

      {status !== "saudavel" && (
        <div className="absolute top-4 right-4">
          <AlertTriangle size={16} className={status === "critico" ? "text-red-500" : "text-amber-500"} />
        </div>
      )}
    </div>
  );
}
