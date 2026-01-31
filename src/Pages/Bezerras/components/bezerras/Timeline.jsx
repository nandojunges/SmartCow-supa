// Timeline.jsx
import React, { useMemo } from "react";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatDate } from "../../utils/formatters";

export default function Timeline({ events }) {
  const list = useMemo(() => {
    const arr = Array.isArray(events) ? events : [];

    // opcional: ordenar por data ASC (linha do tempo)
    const sorted = [...arr].sort((a, b) => {
      const da = new Date(a?.date || 0).getTime();
      const db = new Date(b?.date || 0).getTime();
      return da - db;
    });

    return sorted;
  }, [events]);

  const getIcon = (status) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "completed":
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      case "pending":
        return <Clock size={16} className="text-amber-400" />;
      case "alert":
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-cyan-400" />;
    }
  };

  if (!list.length) {
    return (
      <div className="text-center py-8 bg-slate-950 rounded-xl border border-slate-800 border-dashed">
        <p className="text-slate-400">Nenhum evento no período</p>
        <p className="text-sm text-slate-600 mt-1">Quando houver, eles aparecem aqui em ordem de data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {list.map((event, index) => {
        const key =
          event?.id ||
          `${event?.title || "event"}-${event?.date || "x"}-${event?.status || "s"}-${index}`;

        return (
          <div key={key} className="flex gap-4 relative group">
            {index !== list.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-800 group-hover:bg-slate-700 transition-colors" />
            )}

            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mt-0.5">
              {getIcon(event?.status)}
            </div>

            <div className="flex-1 pb-6 min-w-0">
              <div className="flex justify-between items-start gap-3">
                <h4 className="text-white text-sm font-medium truncate">
                  {event?.title || "Evento"}
                </h4>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {formatDate(event?.date)}
                </span>
              </div>

              {event?.description ? (
                <p className="text-sm text-slate-400 mt-1">{event.description}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
