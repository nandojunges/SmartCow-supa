// HealthRecord.jsx
import React, { useMemo } from "react";
import { Stethoscope, Calendar, Activity } from "lucide-react";
import { formatDate, formatCurrency } from "../../utils/formatters";

export default function HealthRecord({ ocorrencias }) {
  const lista = useMemo(() => (Array.isArray(ocorrencias) ? ocorrencias : []), [ocorrencias]);

  if (lista.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-950 rounded-xl border border-slate-800 border-dashed">
        <Activity className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <p className="text-slate-400">Nenhuma ocorrência registrada</p>
        <p className="text-sm text-slate-600 mt-1">Animal saudável desde o nascimento</p>
      </div>
    );
  }

  const getSeverityPill = (severity) => {
    const s = String(severity || "").toLowerCase();
    switch (s) {
      case "grave":
        return { cls: "bg-red-500/20 text-red-400 border-red-500/30", label: "Grave" };
      case "moderada":
        return { cls: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Moderada" };
      case "leve":
        return { cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Leve" };
      default:
        return { cls: "bg-slate-800 text-slate-400 border-slate-700", label: severity || "—" };
    }
  };

  const getIconColor = (severity) => {
    const s = String(severity || "").toLowerCase();
    if (s === "grave") return "bg-red-500/10 text-red-400";
    if (s === "moderada") return "bg-amber-500/10 text-amber-400";
    if (s === "leve") return "bg-yellow-500/10 text-yellow-400";
    return "bg-slate-800/60 text-slate-400";
  };

  const toNumber = (v) => {
    if (v == null || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const num = Number(String(v).replace(",", "."));
    return Number.isFinite(num) ? num : null;
  };

  // Ordena: abertas primeiro, depois mais recentes
  const sorted = [...lista].sort((a, b) => {
    const aOpen = !a?.dataFim;
    const bOpen = !b?.dataFim;
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    const da = new Date(a?.dataInicio || 0).getTime();
    const db = new Date(b?.dataInicio || 0).getTime();
    return db - da;
  });

  return (
    <div className="space-y-4">
      {sorted.map((oco, idx) => {
        const key = oco?.id || `${oco?.tipo || "oco"}-${oco?.dataInicio || "x"}-${idx}`;
        const tipo = (oco?.tipo && String(oco.tipo)) || "Ocorrência";
        const grav = getSeverityPill(oco?.gravidade);
        const custoNum = toNumber(oco?.custo);
        const impactoNum = toNumber(oco?.impactoPeso);

        const sintomas = Array.isArray(oco?.sintomas)
          ? oco.sintomas.filter(Boolean).join(", ")
          : oco?.sintomas
          ? String(oco.sintomas)
          : "";

        return (
          <div
            key={key}
            className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
          >
            <div className="flex justify-between items-start mb-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconColor(
                    oco?.gravidade
                  )}`}
                >
                  <Stethoscope size={20} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-white font-medium capitalize truncate">{tipo}</h3>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded border ${grav.cls}`}>
                    {grav.label}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1 text-slate-400 text-sm">
                  <Calendar size={14} />
                  {formatDate(oco?.dataInicio)}
                </div>

                {oco?.dataFim ? (
                  <div className="text-xs text-emerald-400 mt-1">
                    Resolvido em {formatDate(oco.dataFim)}
                  </div>
                ) : (
                  <div className="text-xs text-amber-400 mt-1">Em andamento</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Sintomas</div>
                <p className="text-sm text-slate-300">{sintomas || "Não registrado"}</p>
              </div>

              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Tratamento</div>
                <p className="text-sm text-slate-300">{oco?.tratamento ? String(oco.tratamento) : "—"}</p>
              </div>

              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Custo</div>
                <p className="text-sm text-white">
                  {custoNum == null ? "—" : formatCurrency(custoNum)}
                </p>
              </div>
            </div>

            {impactoNum != null && impactoNum !== 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-950/20 border border-amber-900/30 rounded-lg px-3 py-2">
                <Activity size={16} />
                Impacto estimado no crescimento:{" "}
                <strong className="text-amber-300">{impactoNum.toFixed(1)} kg</strong>{" "}
                abaixo da curva esperada
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
