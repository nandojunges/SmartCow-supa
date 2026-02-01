// src/pages/Reproducao/Reproducao.jsx
// -----------------------------------------------------------------------------
// Tela única de Reprodução.
// - Visão Geral como painel/summary no topo
// - Tabela principal abaixo (tabelaModerna)
// - Botões abrem overlay simples com componentes existentes
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import Cadastro from "./Cadastro.jsx";
import Inseminacoes from "./Inseminacoes.jsx";
import Protocolos from "./Protocolos.jsx";
import Relatorios from "./Relatorios.jsx";
import VisaoGeral from "./VisaoGeral/VisaoGeral.jsx";
import TabelaReproducao from "./TabelaReproducao.jsx";
import "../../styles/tabelaModerna.css";

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
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(null);

  const animaisLista = Array.isArray(animais) ? animais : [];
  const tourosLista = Array.isArray(touros) ? touros : [];
  const inseminadoresLista = Array.isArray(inseminadores) ? inseminadores : [];
  const protocolosLista = Array.isArray(protocolos) ? protocolos : [];
  const eventosLista = Array.isArray(eventos) ? eventos : [];

  const filtrosStatus = [
    { key: "todos", label: "Todos" },
    { key: "vazia", label: "Vazia" },
    { key: "prenhe", label: "Prenhe" },
    { key: "ciclando", label: "Ciclando" },
    { key: "seca", label: "Seca" },
  ];

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
    return animaisLista.map((animal) => ({
      ...animal,
      animal: [animal.numero, animal.brinco, animal.nome]
        .filter(Boolean)
        .join(" · "),
      status: animal.status_reprodutivo ?? animal.statusReprodutivo ?? "—",
      ultimaIa: animal.ultima_ia ?? animal.ultimaIa ?? "—",
      previsao: animal.previsao ?? animal.observacao ?? animal.obs ?? "—",
    }));
  }, [animaisLista]);

  const rowsFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return rows.filter((row) => {
      const statusValor = String(row.status ?? "").toLowerCase();
      const passaStatus =
        filtroStatus === "todos" || statusValor.includes(filtroStatus);
      if (!passaStatus) return false;
      if (!termo) return true;
      return String(row.animal ?? "").toLowerCase().includes(termo);
    });
  }, [busca, filtroStatus, rows]);

  const handleRegistrar =
    typeof onRegistrar === "function" ? onRegistrar : () => {};

  useEffect(() => {
    if (!modalAberto) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setModalAberto(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalAberto]);

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
        onClick={() => {}}
      >
        Ficha
      </button>
    </div>
  );

  const renderizarModal = () => {
    if (!modalAberto) return null;

    let titulo = "";
    let conteudo = null;

    if (modalAberto === "protocolos") {
      titulo = "Protocolos";
      conteudo = <Protocolos protocolos={protocolosLista} />;
    }

    if (modalAberto === "cadastro") {
      titulo = "Cadastro";
      conteudo = (
        <Cadastro
          touros={tourosLista}
          inseminadores={inseminadoresLista}
        />
      );
    }

    if (modalAberto === "relatorios") {
      titulo = "Relatórios";
      conteudo = <Relatorios eventos={eventosLista} />;
    }

    if (modalAberto === "inseminacoes") {
      titulo = "Inseminações";
      conteudo = <Inseminacoes eventos={eventosLista} />;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setModalAberto(null);
          }
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">{titulo}</h2>
            <button
              type="button"
              className="st-btn"
              onClick={() => setModalAberto(null)}
              aria-label="Fechar modal"
            >
              Fechar
            </button>
          </div>
          <div className="max-h-[70vh] overflow-auto">{conteudo}</div>
        </div>
      </div>
    );
  };

  return (
    <section className="w-full space-y-6">
      <VisaoGeral
        animais={animaisLista}
        touros={tourosLista}
        inseminadores={inseminadoresLista}
        protocolos={protocolosLista}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="st-filter__label min-w-[220px]">
            Busca
            <input
              type="text"
              className="st-filter-input"
              placeholder="Buscar animal..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {filtrosStatus.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFiltroStatus(chip.key)}
                className={`st-chip ${
                  filtroStatus === chip.key ? "st-chip--info" : "st-chip--muted"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="st-btn"
            onClick={() => setModalAberto("protocolos")}
          >
            Protocolos
          </button>
          <button
            type="button"
            className="st-btn"
            onClick={() => setModalAberto("cadastro")}
          >
            Cadastro
          </button>
          <button
            type="button"
            className="st-btn"
            onClick={() => setModalAberto("relatorios")}
          >
            Relatórios
          </button>
          <button
            type="button"
            className="st-btn"
            onClick={() => setModalAberto("inseminacoes")}
          >
            Inseminações
          </button>
        </div>
      </div>

      <TabelaReproducao
        columns={columns}
        rows={rowsFiltradas}
        renderActions={renderRowActions}
        emptyMessage="Nenhum animal encontrado…"
      />

      {renderizarModal()}
    </section>
  );
}
