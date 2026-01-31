// src/Pages/Calendario/Calendario.jsx
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

// Hooks
import { useCalendar } from "./hooks/useCalendar";
import { useNotifications } from "./hooks/useNotifications";
import { useToast, Notificacoes } from "./components/Notificacoes";

// Componentes
import { BarraNavegacao } from "./components/BarraNavegacao";
import { BarraFiltros } from "./components/BarraFiltros";
import { RoletaDias } from "./components/RoletaDias";
import { GradeMensal } from "./components/GradeMensal";
import { VisualizacaoSemanal } from "./components/VisualizacaoSemanal";
import { ListaTarefas } from "./components/ListaTarefas";
import { FormularioTarefa } from "./components/FormularioTarefa";
import { DashboardEstatisticas } from "./components/DashboardEstatisticas";

// Estilos
import "./Calendario.css";

export default function Calendario() {
  const {
    dataAtual,
    dataSelecionada,
    setDataSelecionada,
    viewMode,
    setViewMode,
    filtros,
    setFiltros,
    categorias,
    adicionarTarefa,
    atualizarTarefa,
    excluirTarefa,
    moverTarefa,
    toggleConcluida,
    obterTarefasDoDia,
    tarefasFiltradas,
    formatarDataChave,
    gerarDias,
    navegarParaHoje,
    mudarMes,
    mudarSemana,
    estatisticas,

    // ✅ IMPORTANTE: use o store do hook ao invés de ler localStorage no render.
    // Ajuste o nome conforme seu hook expõe:
    // Ex.: tarefas, tarefasPorDia, store, tarefasStore, etc.
    tarefas, // <-- se no seu hook não existir, troque por "tarefasStore" ou o que você tiver
  } = useCalendar();

  const { permissao, solicitarPermissao, notificarTarefa } = useNotifications();
  const toast = useToast();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState(null);
  const [mostrarDashboard, setMostrarDashboard] = useState(false);

  // Dados computados
  const dias = useMemo(() => {
    const modo = viewMode === "semana" ? "semana" : "mes";
    return gerarDias(modo);
  }, [gerarDias, viewMode]);

  const tarefasDoDia = useMemo(() => {
    return tarefasFiltradas(dataSelecionada);
  }, [tarefasFiltradas, dataSelecionada]);

  const totalTarefas = useMemo(() => {
    return obterTarefasDoDia(dataSelecionada).length;
  }, [obterTarefasDoDia, dataSelecionada]);

  // Handlers
  const handleSelecionarDia = useCallback(
    (data) => setDataSelecionada(data),
    [setDataSelecionada]
  );

  const handleAdicionarTarefa = useCallback(
    (tarefaData) => {
      if (tarefaData?.id) {
        atualizarTarefa(dataSelecionada, tarefaData.id, tarefaData);
        toast.sucesso("Tarefa atualizada com sucesso!");
      } else {
        const novaTarefa = adicionarTarefa(dataSelecionada, tarefaData);
        toast.sucesso("Tarefa criada com sucesso!");

        if (tarefaData?.lembrete && permissao === "granted") {
          notificarTarefa(
            novaTarefa,
            dataSelecionada,
            parseInt(tarefaData.lembrete, 10)
          );
        }
      }

      setTarefaEditando(null);
      setMostrarFormulario(false);
    },
    [adicionarTarefa, atualizarTarefa, dataSelecionada, toast, permissao, notificarTarefa]
  );

  const handleToggleTarefa = useCallback(
    (data, tarefaId) => {
      toggleConcluida(data, tarefaId);
      const tarefa = obterTarefasDoDia(data).find((t) => t.id === tarefaId);
      if (tarefa && !tarefa.concluida) toast.sucesso("Tarefa concluída! 🎉");
    },
    [toggleConcluida, obterTarefasDoDia, toast]
  );

  const handleExcluirTarefa = useCallback(
    (data, tarefaId) => {
      if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
        excluirTarefa(data, tarefaId);
        toast.info("Tarefa excluída");
      }
    },
    [excluirTarefa, toast]
  );

  const handleEditarTarefa = useCallback((tarefa) => {
    setTarefaEditando(tarefa);
    setMostrarFormulario(true);
  }, []);

  const handleReorderTarefas = useCallback((novaOrdem) => {
    // Se seu hook tiver reorder real, plugue aqui.
    // Ex.: moverTarefa(...)
    console.log("Reordenar:", novaOrdem);
  }, []);

  const handleLimparFiltros = useCallback(() => {
    setFiltros({ categorias: [], status: "todas", busca: "" });
    toast.info("Filtros limpos");
  }, [setFiltros, toast]);

  const handleExportar = useCallback(() => {
    const dados = localStorage.getItem("calendario-tarefas");
    const blob = new Blob([dados || "{}"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calendario-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.sucesso("Dados exportados!");
  }, [toast]);

  const handleImportar = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const dados = JSON.parse(event.target.result);
          localStorage.setItem("calendario-tarefas", JSON.stringify(dados));
          window.location.reload();
        } catch {
          toast.erro("Erro ao importar arquivo");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [toast]);

  const handleAgendarLembrete = useCallback(
    (tarefa) => {
      if (permissao !== "granted") {
        solicitarPermissao().then((concedida) => {
          if (concedida) {
            notificarTarefa(tarefa, dataSelecionada, 15);
            toast.sucesso("Lembrete agendado!");
          }
        });
      } else {
        notificarTarefa(tarefa, dataSelecionada, 15);
        toast.sucesso("Lembrete agendado!");
      }
    },
    [permissao, solicitarPermissao, notificarTarefa, dataSelecionada, toast]
  );

  // ✅ Renderizar visualização atual (SEM localStorage aqui)
  const renderizarVisualizacao = () => {
    const propsBase = {
      dias,
      dataSelecionada,
      onSelecionarDia: handleSelecionarDia,
      formatarDataChave,
    };

    // ✅ Se o seu hook usa outro nome, troque aqui:
    const tarefasStore = tarefas || {};

    switch (viewMode) {
      case "roleta":
        return <RoletaDias {...propsBase} tarefas={tarefasStore} />;

      case "grade":
        return <GradeMensal {...propsBase} tarefas={tarefasStore} />;

      case "semana":
        return (
          <VisualizacaoSemanal
            {...propsBase}
            tarefas={tarefasStore}
            onToggleTarefa={handleToggleTarefa}
            categorias={categorias}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="calendario-container">
      <Notificacoes notificacoes={toast.notificacoes} onRemover={toast.remover} />

      <BarraNavegacao
        dataAtual={dataAtual}
        dataSelecionada={dataSelecionada}
        viewMode={viewMode}
        onMudarMes={mudarMes}
        onMudarSemana={mudarSemana}
        onIrParaHoje={navegarParaHoje}
        onToggleDashboard={() => setMostrarDashboard((v) => !v)}
        mostrarDashboard={mostrarDashboard}
        onExportar={handleExportar}
        onImportar={handleImportar}
      />

      <AnimatePresence>
        {mostrarDashboard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <DashboardEstatisticas
              estatisticas={estatisticas}
              dataSelecionada={dataSelecionada}
              tarefasHoje={obterTarefasDoDia(new Date())}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <BarraFiltros
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        filtros={filtros}
        onChangeFiltros={setFiltros}
        categorias={categorias}
        onLimparFiltros={handleLimparFiltros}
        totalTarefas={totalTarefas}
        tarefasFiltradas={tarefasDoDia.length}
      />

      <div className="area-visualizacao">{renderizarVisualizacao()}</div>

      {viewMode !== "semana" && (
        <div className="area-tarefas">
          <div className="tarefas-header">
            <div>
              <h3>
                {dataSelecionada.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              <p>
                {tarefasDoDia.length}{" "}
                {tarefasDoDia.length === 1 ? "tarefa" : "tarefas"}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setTarefaEditando(null);
                setMostrarFormulario(true);
              }}
              className="btn-adicionar"
              type="button"
              aria-label="Adicionar tarefa"
            >
              <Plus size={20} />
            </motion.button>
          </div>

          <ListaTarefas
            tarefas={tarefasDoDia}
            data={dataSelecionada}
            categorias={categorias}
            onToggle={handleToggleTarefa}
            onExcluir={handleExcluirTarefa}
            onEditar={handleEditarTarefa}
            onReorder={handleReorderTarefas}
            onAgendarLembrete={handleAgendarLembrete}
          />
        </div>
      )}

      <FormularioTarefa
        aberto={mostrarFormulario}
        onFechar={() => {
          setMostrarFormulario(false);
          setTarefaEditando(null);
        }}
        onSalvar={handleAdicionarTarefa}
        categorias={categorias}
        tarefaParaEditar={tarefaEditando}
        dataSelecionada={dataSelecionada}
      />
    </div>
  );
}
