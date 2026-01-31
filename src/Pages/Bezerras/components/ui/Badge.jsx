// components/ui/Badge.jsx
import React from "react";

const VARIANTS = {
  neonatal: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  aleitamento: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  transicao: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  desmamada: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function Badge({ children, variant = "neonatal", className = "" }) {
  const style = VARIANTS[variant] || VARIANTS.neonatal;

  return (
    <span
      className={[
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
        style,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
