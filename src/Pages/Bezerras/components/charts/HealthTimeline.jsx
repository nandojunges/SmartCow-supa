// HealthTimeline.jsx
import React, { useMemo } from "react";
import { Activity, Stethoscope, Pill, AlertTriangle } from "lucide-react";
import { formatDate, calculateAgeInDays } from "../../utils/formatters";

export default function HealthTimeline({ events, birthDate }) {
  const safeEvents = Array.isArray(events) ? events : [];

  const getEventIcon = (type) => {
    switch (type) {
      case "birth":
        return (
          <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400">
            <Activity size={16} />
          </div>
        );
      case "weight":
        return (
          <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
            ⚖
          </div>
        );
      case "health":
        return (
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center text-red-400">
            <Stethoscope size={16} />
          </div>
        );
      case "treatment":
        return (
          <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400">
            <Pill size={16} />
          </div>
        );
      case "alert":
        return (
          <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400">
            <AlertTriangle size={16} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
            ●
          </div>
        );
    }
  };

  const sortedEvents = useMemo(() => {
    // Ordena do mais recente pro mais antigo
    return [...safeEvents].sort((a, b) => {
      const da = new Date(a?.date);
      const db = new Date(b?.date);
      const ta = Number.isNaN(da.getTime()) ? 0 : da.getTime();
      const tb = Number.isNaN(db.getTime()) ? 0 : db.getTime();
      return tb - ta;
    });
  }, [safeEvents]);

  const hasBirthDate = !!birthDate;

  return (
    <div className="space-y-0">
      {sortedEvents.map((event, index) => {
        const age =
          hasBirthDate && event?.date
            ? calculateAgeInDays(birthDate, event.date)
            : null;

        const key = event?.id ?? `${event?.type ?? "evt"}-${event?.date ?? index}-${index}`;

        return (
          <div key={key} className="flex gap-4 relative">
            {index !== sortedEvents.length - 1 && (
              <div className="absolute left-4 top-8 bottom-0 w-px bg-slate-800" />
            )}

            <div className="flex-shrink-0 mt-1">{getEventIcon(event?.type)}</div>

            <div className="flex-1 pb-6">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-1 gap-3">
                  <h4 className="text-white font-medium text-sm">
                    {event?.title || "Evento"}
                  </h4>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(event?.date)}
                  </span>
                </div>

                {/* Mostra inclusive se age=0 */}
                {age !== null && age !== undefined && (
                  <div className="text-xs text-cyan-400 mb-1">{age} dias de vida</div>
                )}

                {event?.description ? (
                  <p className="text-sm text-slate-400 mt-1">{event.description}</p>
                ) : null}

                {event?.severity ? (
                  <span
                    className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                      event.severity === "grave"
                        ? "bg-red-500/20 text-red-400"
                        : event.severity === "moderada"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {event.severity}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
