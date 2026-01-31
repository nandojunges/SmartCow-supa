// src/pages/Reproducao/Reproducao.jsx
// -----------------------------------------------------------------------------
// Abas de Reprodução (sem modal aqui — o modal mora em Protocolos.jsx).
// Abas: Visão Geral | Protocolos | Cadastro | Relatórios
// - Sem inline-style (mantém padrão visual do SmartCow)
// - Não inventa "banco fake" / localStorage
// - Aceita dados reais via props (se não passar, não quebra)
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
import Protocolos from "./Protocolos.jsx";
import VisaoGeral from "./VisaoGeral/VisaoGeral.jsx";
import Cadastro from "./Cadastro.jsx";
import Relatorios from "./Relatorios.jsx";

/* ========================= SubAbasReproducao (tabs) ========================= */
function SubAbasReproducao({ selected, setSelected, contadores }) {
  const tabs = [
    { id: "visaoGeral", label: "Visão Geral", icon: "🐄" },
    { id: "protocolos", label: "Protocolos", icon: "📋" },
    { id: "cadastro", label: "Cadastro", icon: "📝" },
    { id: "relatorios", label: "Relatórios", icon: "📊" },
  ];

  const onKey = (e) => {
    const idx = tabs.findIndex((t) => t.id === selected);
    if (idx === -1) return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      setSelected(tabs[(idx + 1) % tabs.length].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSelected(tabs[(idx - 1 + tabs.length) % tabs.length].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Sub-abas de reprodução"
      onKeyDown={onKey}
      className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-3 py-2"
    >
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const active = selected === t.id;
          const qtd = contadores?.[t.id] ?? 0;

          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              aria-controls={`pane-${t.id}`}
              onClick={() => setSelected(t.id)}
              tabIndex={active ? 0 : -1}
              className={[
                "relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap",
                "transition-all border",
                active
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
              ].join(" ")}
              title={t.label}
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span>{t.label}</span>

              <span
                className={[
                  "ml-1 inline-flex items-center justify-center min-w-[22px] h-[18px] px-2 rounded-full text-xs font-bold",
                  active ? "bg-white text-blue-700" : "bg-blue-100 text-blue-700",
                ].join(" ")}
                title={`${qtd}`}
              >
                {qtd}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== Componente raiz ============================== */
/**
 * Props opcionais (pra plugar no teu estado central depois):
 * - animais, protocolos, touros, inseminadores, eventos
 * - onRegistrar: callback usado pelo VisaoGeral ao salvar IA/DG/protocolo etc.
 */
export default function Reproducao({
  animais = [],
  protocolos = [],
  touros = [],
  inseminadores = [],
  eventos = [],
  onRegistrar, // (tipo, payload) => void
}) {
  const [abaAtiva, setAbaAtiva] = useState("visaoGeral");

  // Contadores: sem gambi de onCountChange (mais confiável)
  const contadores = useMemo(() => {
    const a = Array.isArray(animais) ? animais : [];
    const p = Array.isArray(protocolos) ? protocolos : [];
    const t = Array.isArray(touros) ? touros : [];
    const i = Array.isArray(inseminadores) ? inseminadores : [];
    const e = Array.isArray(eventos) ? eventos : [];

    return {
      visaoGeral: a.length, // pode mudar pra "urgentes" depois
      protocolos: p.length,
      cadastro: t.length + i.length,
      relatorios: e.length,
    };
  }, [animais, protocolos, touros, inseminadores, eventos]);

  const handleRegistrar = (tipo, payload) => {
    // mantém compatibilidade: se não passar onRegistrar, não quebra
    if (typeof onRegistrar === "function") return onRegistrar(tipo, payload);
    console.log("[Reproducao] onRegistrar ausente:", tipo, payload);
  };

  const renderizarConteudo = () => {
    switch (abaAtiva) {
      case "visaoGeral":
        return (
          <VisaoGeral
            animais={animais} // <-- aqui estava o erro: você passava []
            onRegistrar={handleRegistrar}
            touros={touros}
            inseminadores={inseminadores}
            protocolos={protocolos}
          />
        );

      case "protocolos":
        // modal vive dentro de Protocolos.jsx
        return <Protocolos />;

      case "cadastro":
        return <Cadastro />;

      case "relatorios":
        return <Relatorios />;

      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <SubAbasReproducao selected={abaAtiva} setSelected={setAbaAtiva} contadores={contadores} />

      <div
        id={`pane-${abaAtiva}`}
        role="tabpanel"
        aria-labelledby={abaAtiva}
        className="p-4 md:p-6"
      >
        {renderizarConteudo()}
      </div>
    </div>
  );
}
