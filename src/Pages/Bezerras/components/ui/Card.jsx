// components/ui/Card.jsx
import React from "react";

export const Card = ({
  title,
  value,
  trend,
  trendUp,
  icon: Icon,
  color = "cyan",
  className = "",
}) => {
  const colorClasses = {
    cyan: "text-cyan-400 bg-cyan-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    red: "text-red-400 bg-red-500/10",
  };

  const resolvedColor = colorClasses[color] || colorClasses.cyan;
  const hasTrend = trend != null && String(trend).trim() !== "";
  const trendClass =
    trendUp === true ? "text-emerald-400" : trendUp === false ? "text-red-400" : "text-slate-400";
  const arrow =
    trendUp === true ? "↑" : trendUp === false ? "↓" : "";

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm font-medium">{title}</span>

        <div className={`p-2 rounded-lg ${resolvedColor}`}>
          {Icon ? <Icon size={20} /> : null}
        </div>
      </div>

      <div className="text-2xl font-bold text-white mb-2">{value}</div>

      {hasTrend ? (
        <div className={`text-xs flex items-center gap-1 ${trendClass}`}>
          {arrow ? <span>{arrow}</span> : null}
          <span>{trend}</span>
        </div>
      ) : null}
    </div>
  );
};

export default Card;
