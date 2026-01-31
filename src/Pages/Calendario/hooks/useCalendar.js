import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

const CATEGORIAS_PADRAO = {
  trabalho: { cor: '#3b82f6', label: 'Trabalho', icone: 'briefcase' },
  pessoal: { cor: '#8b5cf6', label: 'Pessoal', icone: 'user' },
  estudo: { cor: '#f59e0b', label: 'Estudo', icone: 'book-open' },
  lazer: { cor: '#10b981', label: 'Lazer', icone: 'gamepad-2' },
  saude: { cor: '#ef4444', label: 'Saúde', icone: 'heart' },
  financeiro: { cor: '#06b6d4', label: 'Financeiro', icone: 'dollar-sign' },
  importante: { cor: '#f97316', label: 'Importante', icone: 'alert-circle' },
};

export function useCalendar() {
  const [tarefas, setTarefas] = useLocalStorage('calendario-tarefas', {});
  const [categorias, setCategorias] = useLocalStorage('calendario-categorias', CATEGORIAS_PADRAO);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [viewMode, setViewMode] = useLocalStorage('calendario-view', 'roleta');
  const [filtros, setFiltros] = useState({
    categorias: [],
    status: 'todas',
    busca: '',
  });

  const formatarDataChave = useCallback((data) => {
    return data.toISOString().split('T')[0];
  }, []);

  const obterTarefasDoDia = useCallback((data) => {
    return tarefas[formatarDataChave(data)] || [];
  }, [tarefas, formatarDataChave]);

  const adicionarTarefa = useCallback((data, tarefa) => {
    const chave = formatarDataChave(data);
    const novaTarefa = {
      id: Date.now().toString(),
      ...tarefa,
      criadaEm: new Date().toISOString(),
      concluida: false,
    };

    setTarefas(prev => ({
      ...prev,
      [chave]: [...(prev[chave] || []), novaTarefa],
    }));

    return novaTarefa;
  }, [formatarDataChave, setTarefas]);

  const atualizarTarefa = useCallback((data, tarefaId, updates) => {
    const chave = formatarDataChave(data);
    setTarefas(prev => ({
      ...prev,
      [chave]: prev[chave]?.map(t =>
        t.id === tarefaId ? { ...t, ...updates, atualizadaEm: new Date().toISOString() } : t
      ) || [],
    }));
  }, [formatarDataChave, setTarefas]);

  const excluirTarefa = useCallback((data, tarefaId) => {
    const chave = formatarDataChave(data);
    setTarefas(prev => {
      const tarefasAtualizadas = prev[chave]?.filter(t => t.id !== tarefaId) || [];
      if (tarefasAtualizadas.length === 0) {
        const { [chave]: _, ...resto } = prev;
        return resto;
      }
      return { ...prev, [chave]: tarefasAtualizadas };
    });
  }, [formatarDataChave, setTarefas]);

  const moverTarefa = useCallback((dataOrigem, dataDestino, tarefaId) => {
    const chaveOrigem = formatarDataChave(dataOrigem);
    const chaveDestino = formatarDataChave(dataDestino);

    setTarefas(prev => {
      const tarefa = prev[chaveOrigem]?.find(t => t.id === tarefaId);
      if (!tarefa) return prev;

      return {
        ...prev,
        [chaveOrigem]: prev[chaveOrigem].filter(t => t.id !== tarefaId),
        [chaveDestino]: [...(prev[chaveDestino] || []), { ...tarefa, atualizadaEm: new Date().toISOString() }],
      };
    });
  }, [formatarDataChave, setTarefas]);

  const toggleConcluida = useCallback((data, tarefaId) => {
    const chave = formatarDataChave(data);
    setTarefas(prev => ({
      ...prev,
      [chave]: prev[chave]?.map(t =>
        t.id === tarefaId ? { ...t, concluida: !t.concluida, concluidaEm: !t.concluida ? new Date().toISOString() : null } : t
      ) || [],
    }));
  }, [formatarDataChave, setTarefas]);

  const adicionarCategoria = useCallback((chave, categoria) => {
    setCategorias(prev => ({ ...prev, [chave]: categoria }));
  }, [setCategorias]);

  const removerCategoria = useCallback((chave) => {
    setCategorias(prev => {
      const { [chave]: _, ...resto } = prev;
      return resto;
    });
  }, [setCategorias]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    const todasTarefas = Object.values(tarefas).flat();
    const hoje = new Date().toISOString().split('T')[0];
    const tarefasHoje = tarefas[hoje] || [];

    return {
      total: todasTarefas.length,
      concluidas: todasTarefas.filter(t => t.concluida).length,
      pendentes: todasTarefas.filter(t => !t.concluida).length,
      hoje: {
        total: tarefasHoje.length,
        concluidas: tarefasHoje.filter(t => t.concluida).length,
        pendentes: tarefasHoje.filter(t => !t.concluida).length,
      },
      porCategoria: Object.entries(categorias).map(([key, cat]) => ({
        ...cat,
        key,
        total: todasTarefas.filter(t => t.categoria === key).length,
        concluidas: todasTarefas.filter(t => t.categoria === key && t.concluida).length,
      })),
    };
  }, [tarefas, categorias]);

  // Tarefas filtradas
  const tarefasFiltradas = useCallback((data) => {
    let lista = obterTarefasDoDia(data);

    if (filtros.categorias.length > 0) {
      lista = lista.filter(t => filtros.categorias.includes(t.categoria));
    }

    if (filtros.status === 'concluidas') {
      lista = lista.filter(t => t.concluida);
    } else if (filtros.status === 'pendentes') {
      lista = lista.filter(t => !t.concluida);
    }

    if (filtros.busca) {
      const buscaLower = filtros.busca.toLowerCase();
      lista = lista.filter(t => t.titulo.toLowerCase().includes(buscaLower));
    }

    return lista.sort((a, b) => {
      if (a.horario && b.horario) return a.horario.localeCompare(b.horario);
      if (a.horario) return -1;
      if (b.horario) return 1;
      return 0;
    });
  }, [obterTarefasDoDia, filtros]);

  // Gerar dias para visualização
  const gerarDias = useCallback((modo = 'mes') => {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    const dias = [];

    if (modo === 'mes') {
      const primeiroDia = new Date(ano, mes, 1);
      const ultimoDia = new Date(ano, mes + 1, 0);

      const diaSemanaPrimeiro = primeiroDia.getDay();
      for (let i = diaSemanaPrimeiro - 1; i >= 0; i--) {
        dias.push({ data: new Date(ano, mes, -i), foraDoMes: true });
      }

      for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        dias.push({ data: new Date(ano, mes, dia), foraDoMes: false });
      }

      const diaSemanaUltimo = ultimoDia.getDay();
      for (let i = 1; i < 7 - diaSemanaUltimo; i++) {
        dias.push({ data: new Date(ano, mes + 1, i), foraDoMes: true });
      }
    } else if (modo === 'semana') {
      const inicioSemana = new Date(dataSelecionada);
      inicioSemana.setDate(dataSelecionada.getDate() - dataSelecionada.getDay());

      for (let i = 0; i < 7; i++) {
        const dia = new Date(inicioSemana);
        dia.setDate(inicioSemana.getDate() + i);
        dias.push({ data: dia, foraDoMes: false });
      }
    }

    return dias;
  }, [dataAtual, dataSelecionada]);

  const navegarParaHoje = useCallback(() => {
    const hoje = new Date();
    setDataAtual(hoje);
    setDataSelecionada(hoje);
  }, []);

  const mudarMes = useCallback((direcao) => {
    setDataAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + direcao, 1));
  }, []);

  const mudarSemana = useCallback((direcao) => {
    setDataSelecionada(prev => {
      const nova = new Date(prev);
      nova.setDate(prev.getDate() + (direcao * 7));
      return nova;
    });
  }, []);

  return {
    // Estados
    dataAtual,
    dataSelecionada,
    setDataSelecionada,
    viewMode,
    setViewMode,
    filtros,
    setFiltros,
    categorias,

    // Ações
    adicionarTarefa,
    atualizarTarefa,
    excluirTarefa,
    moverTarefa,
    toggleConcluida,
    adicionarCategoria,
    removerCategoria,

    // Helpers
    obterTarefasDoDia,
    tarefasFiltradas,
    formatarDataChave,
    gerarDias,
    navegarParaHoje,
    mudarMes,
    mudarSemana,

    // Dados
    estatisticas,
  };
}
