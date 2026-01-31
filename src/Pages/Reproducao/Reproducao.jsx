// src/pages/Reproducao/Reproducao.jsx
// -----------------------------------------------------------------------------
// Abas de Reprodução (sem modal aqui — o modal mora nos componentes internos).
// Abas: Visão Geral | Protocolos | Cadastro | Relatórios | Inseminações
// - Sem inline-style (mantém padrão visual do SmartCow)
// - Não inventa "banco fake" / localStorage
// - Aceita dados reais via props (se não passar, não quebra)
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
import Protocolos from "./Protocolos.jsx";
import VisaoGeral from "./VisaoGeral/VisaoGeral.jsx";
import Cadastro from "./Cadastro.jsx";
import Relatorios from "./Relatorios.jsx";
import Inseminacoes from "./Inseminacoes.jsx";

/* ========================= SubAbasReproducao (tabs) ========================= */
function SubAbasReproducao({ selected, setSelected, contadores }) {
  const tabs = [
    { id: "visaoGeral", label: "Visão Geral" },
    { id: "protocolos", label: "Protocolos" },
    { id: "cadastro", label: "Cadastro" },
    { id: "relatorios", label: "Relatórios" },
    { id: "inseminacoes", label: "Inseminações" },
  ];

  const onKey = (event) => {
    const idx = tabs.findIndex((t) => t.id === selected);
    if (idx === -1) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSelected(tabs[(idx + 1) % tabs.length].id);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSelected(tabs[(idx - 1 + tabs.length) % tabs.length].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Sub-abas de reprodução"
      onKeyDown={onKey}
      className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur px-3 py-2"
    >
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const active = selected === tab.id;
          const qtd = contadores?.[tab.id] ?? 0;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              aria-controls={`pane-${tab.id}`}
              onClick={() => setSelected(tab.id)}
              tabIndex={active ? 0 : -1}
              className={[
                "relative inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all",
                active
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
              ].join(" ")}
              title={tab.label}
            >
              <span>{tab.label}</span>
              <span
                className={[
                  "ml-1 inline-flex min-w-[22px] items-center justify-center rounded-full px-2 text-xs font-bold",
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
  touros = [],
  inseminadores = [],
  protocolos = [],
  eventos = [],
  onRegistrar,
}) {
  const [abaAtiva, setAbaAtiva] = useState("visaoGeral");

  const contadores = useMemo(() => {
    const a = Array.isArray(animais) ? animais : [];
    const p = Array.isArray(protocolos) ? protocolos : [];
    const t = Array.isArray(touros) ? touros : [];
    const i = Array.isArray(inseminadores) ? inseminadores : [];
    const e = Array.isArray(eventos) ? eventos : [];

    return {
      visaoGeral: a.length,
      protocolos: p.length,
      cadastro: t.length + i.length,
      relatorios: e.length,
      inseminacoes: e.length,
    };
  }, [animais, protocolos, touros, inseminadores, eventos]);

  const columns = useMemo(
    () => [
      { key: "animal", label: "Animal", className: "st-col-animal" },
      { key: "status", label: "Status reprodutivo" },
      { key: "ultimaIa", label: "Última IA" },
      { key: "previsao", label: "Previsão / Observação", className: "st-td-wrap" },
      { key: "actions", label: "Ações", className: "st-td-center" },
    ],
    []
  );

  const rows = useMemo(() => {
    const safeAnimais = Array.isArray(animais) ? animais : [];
    return safeAnimais.map((animal) => ({
      ...animal,
      animal: [animal.numero, animal.brinco, animal.nome]
        .filter(Boolean)
        .join(" · "),
      status: animal.status_reprodutivo ?? animal.statusReprodutivo ?? "—",
      ultimaIa: animal.ultima_ia ?? animal.ultimaIa ?? "—",
      previsao: animal.previsao ?? animal.observacao ?? animal.obs ?? "—",
    }));
  }, [animais]);

  const handleRegistrar = (tipo, payload) => {
    if (typeof onRegistrar === "function") return onRegistrar(tipo, payload);
    console.log("[Reproducao] onRegistrar ausente:", tipo, payload);
  };

  const renderRowActions = (row) => (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
        onClick={() => handleRegistrar("IA", { animal_id: row.id })}
      >
        IA
      </button>
      <button
        type="button"
        className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
        onClick={() => handleRegistrar("DG", { animal_id: row.id })}
      >
        DG
      </button>
      <button
        type="button"
        className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
        onClick={() => handleRegistrar("PROTOCOLO", { animal_id: row.id })}
      >
        Protocolo
      </button>
      <button
        type="button"
        className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        onClick={() => console.log("Ficha:", row)}
      >
        Ficha
      </button>
    </div>
  );

  const renderizarConteudo = () => {
    switch (abaAtiva) {
      case "visaoGeral":
        return (
          <VisaoGeral
            animais={animais}
            touros={touros}
            inseminadores={inseminadores}
            protocolos={protocolos}
            columns={columns}
            rows={rows}
            renderActions={renderRowActions}
          />
        );

      case "protocolos":
        return <Protocolos protocolos={protocolos} />;

      case "cadastro":
        return <Cadastro touros={touros} inseminadores={inseminadores} />;

      case "relatorios":
        return <Relatorios eventos={eventos} />;

      case "inseminacoes":
        return <Inseminacoes eventos={eventos} />;

      default:
        return null;
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <SubAbasReproducao
        selected={abaAtiva}
        setSelected={setAbaAtiva}
        contadores={contadores}
      />

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
