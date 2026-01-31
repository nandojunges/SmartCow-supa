import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { mockBezerras } from "../data/mockData";
import { formatDate } from "../utils/formatters";

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const diasNoMes = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  }, [currentDate]);

  const primeiroDia = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  }, [currentDate]);

  // Extrair todos os manejos pendentes/atrasados e ordenar por data
  const manejos = useMemo(() => {
    const all = (mockBezerras || []).flatMap((b) => {
      const list = Array.isArray(b?.manejos) ? b.manejos : [];
      return list
        .filter((m) => m?.status === "pendente" || m?.status === "atrasado")
        .map((m) => ({
          ...m,
          bezerraBrinco: b?.brinco || "—",
          bezerraNome: b?.nome || "—",
        }));
    });

    // manter só datas no formato yyyy-mm-dd (mínimo)
    const valid = all.filter((m) => typeof m?.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(m.data));

    valid.sort((a, b) => new Date(a.data) - new Date(b.data));
    return valid;
  }, []);

  const changeMonth = (increment) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1));
  };

  const getManejosDoDia = (dia) => {
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dd = String(dia).padStart(2, "0");
    const dataStr = `${yyyy}-${mm}-${dd}`;
    return manejos.filter((m) => m.data === dataStr);
  };

  const isToday = (dia) => {
    const now = new Date();
    return (
      now.getFullYear() === currentDate.getFullYear() &&
      now.getMonth() === currentDate.getMonth() &&
      now.getDate() === dia
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Calendário de Manejos</h2>
          <p className="text-slate-400">Agenda de protocolos e tarefas pendentes</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
            type="button"
          >
            <ChevronLeft size={20} />
          </button>

          <h3 className="text-xl font-bold text-white min-w-[220px] text-center">
            {currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </h3>

          <button
            onClick={() => changeMonth(1)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
            type="button"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {diasSemana.map((dia) => (
              <div key={dia} className="text-center text-sm font-medium text-slate-500 py-2">
                {dia}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: primeiroDia }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {Array.from({ length: diasNoMes }).map((_, i) => {
              const dia = i + 1;
              const manejosDia = getManejosDoDia(dia);
              const hoje = isToday(dia);

              return (
                <div
                  key={dia}
                  className={`aspect-square border rounded-lg p-2 flex flex-col justify-between cursor-pointer hover:border-cyan-500/50 transition-colors ${
                    hoje ? "bg-cyan-950/30 border-cyan-500/50" : "bg-slate-950 border-slate-800"
                  }`}
                  title={manejOSummary(manejosDia)}
                >
                  <span className={`text-sm font-medium ${hoje ? "text-cyan-400" : "text-slate-300"}`}>{dia}</span>

                  {manejosDia.length > 0 && (
                    <div className="space-y-1">
                      {manejosDia.slice(0, 3).map((m, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full ${m.status === "atrasado" ? "bg-red-500" : "bg-cyan-500"}`}
                          title={`${m.bezerraBrinco}: ${String(m.tipo || "").replace("_", " ")}`}
                        />
                      ))}

                      {manejosDia.length > 3 && (
                        <div className="text-[10px] text-slate-500 text-center">+{manejosDia.length - 3}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de Tarefas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Próximos Manejos</h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {manejos.length > 0 ? (
              manejos.slice(0, 10).map((manejo, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-slate-950 rounded-lg border border-slate-800">
                  <div
                    className={`mt-0.5 ${
                      manejo.status === "atrasado"
                        ? "text-red-400"
                        : manejo.status === "pendente"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {manejo.status === "atrasado" ? (
                      <AlertCircle size={18} />
                    ) : manejo.status === "pendente" ? (
                      <Clock size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="text-white font-medium text-sm capitalize">
                        {String(manejo.tipo || "—").replace("_", " ")}
                      </h4>

                      <span
                        className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                          manejo.status === "atrasado"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {formatDate(manejo.data)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 mt-1">
                      {manejo.bezerraBrinco} • {manejo.bezerraNome}
                    </p>

                    {manejo.protocolo && <p className="text-xs text-slate-500 mt-1">{manejo.protocolo}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500/50" />
                <p>Nenhum manejo pendente</p>
                <p className="text-xs mt-1">Todos os protocolos estão em dia</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function manejOSummary(manejosDia) {
  if (!manejosDia || manejosDia.length === 0) return "Sem manejos";
  return manejosDia
    .slice(0, 8)
    .map((m) => `${m.bezerraBrinco}: ${String(m.tipo || "").replace("_", " ")}`)
    .join("\n");
}
