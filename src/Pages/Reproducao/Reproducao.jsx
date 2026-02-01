// src/pages/Reproducao/Reproducao.jsx
// -----------------------------------------------------------------------------
// Abas de Reprodução (sem modal aqui — o modal mora nos componentes internos).
// Abas: Visão Geral | Protocolos | Cadastro | Relatórios | Inseminações
// - Sem inline-style (mantém padrão visual do SmartCow)
// - Não inventa "banco fake" / localStorage
// - Aceita dados reais via props (se não passar, não quebra)
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
import Cadastro from "./Cadastro.jsx";
import Inseminacoes from "./Inseminacoes.jsx";
import Protocolos from "./Protocolos.jsx";
import Relatorios from "./Relatorios.jsx";
import VisaoGeral from "./VisaoGeral/VisaoGeral.jsx";
import SubAbasReproducao from "./components/SubAbasReproducao.jsx";

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
      { key: "actions", label: "Ações", className: "st-td-center col-acoes" },
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
        className="st-btn"
        onClick={() => handleRegistrar("IA", { animal_id: row.id })}
      >
        IA
      </button>
      <button
        type="button"
        className="st-btn"
        onClick={() => handleRegistrar("DG", { animal_id: row.id })}
      >
        DG
      </button>
      <button
        type="button"
        className="st-btn"
        onClick={() => handleRegistrar("PROTOCOLO", { animal_id: row.id })}
      >
        Protocolo
      </button>
      <button
        type="button"
        className="st-btn"
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
    <div className="w-full">
      <SubAbasReproducao
        abaAtiva={abaAtiva}
        onChange={setAbaAtiva}
        contadores={contadores}
      />
      <div id={`pane-${abaAtiva}`} role="tabpanel" aria-labelledby={abaAtiva}>
        {renderizarConteudo()}
      </div>
    </div>
  );
}
