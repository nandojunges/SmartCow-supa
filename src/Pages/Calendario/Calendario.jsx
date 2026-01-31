import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, Clock, Calendar as CalendarIcon } from 'lucide-react';

// Dados de exemplo para tarefas
const tarefasExemplo = {
  '2025-01-15': [
    { id: 1, titulo: 'Reunião com equipe', horario: '09:00', concluida: true, categoria: 'trabalho' },
    { id: 2, titulo: 'Revisar documentos', horario: '14:00', concluida: false, categoria: 'trabalho' },
  ],
  '2025-01-16': [
    { id: 3, titulo: 'Consulta médica', horario: '10:30', concluida: false, categoria: 'pessoal' },
    { id: 4, titulo: 'Comprar mantimentos', horario: '16:00', concluida: true, categoria: 'pessoal' },
    { id: 5, titulo: 'Estudar React', horario: '19:00', concluida: false, categoria: 'estudo' },
  ],
  '2025-01-17': [
    { id: 6, titulo: 'Entrega do projeto', horario: '17:00', concluida: false, categoria: 'trabalho' },
  ],
  '2025-01-18': [
    { id: 7, titulo: 'Cinema com amigos', horario: '20:00', concluida: false, categoria: 'lazer' },
  ],
  '2025-01-19': [
    { id: 8, titulo: 'Academia', horario: '07:00', concluida: true, categoria: 'saude' },
    { id: 9, titulo: 'Preparar apresentação', horario: '15:00', concluida: false, categoria: 'trabalho' },
  ],
  '2025-01-20': [
    { id: 10, titulo: 'Reunião de planejamento', horario: '10:00', concluida: false, categoria: 'trabalho' },
    { id: 11, titulo: 'Dentista', horario: '14:30', concluida: false, categoria: 'saude' },
  ],
};

const categorias = {
  trabalho: { cor: '#3b82f6', label: 'Trabalho' },
  pessoal: { cor: '#8b5cf6', label: 'Pessoal' },
  estudo: { cor: '#f59e0b', label: 'Estudo' },
  lazer: { cor: '#10b981', label: 'Lazer' },
  saude: { cor: '#ef4444', label: 'Saúde' },
};

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function Calendario() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [tarefas, setTarefas] = useState(tarefasExemplo);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({ titulo: '', horario: '', categoria: 'trabalho' });
  const roletaRef = useRef(null);
  const [estaArrastando, setEstaArrastando] = useState(false);
  const [posicaoInicial, setPosicaoInicial] = useState(0);
  const [scrollInicial, setScrollInicial] = useState(0);

  // Gerar dias do mês atual
  const gerarDiasDoMes = () => {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const dias = [];

    // Dias do mês anterior para preencher o início
    const diaSemanaPrimeiro = primeiroDia.getDay();
    for (let i = diaSemanaPrimeiro - 1; i >= 0; i--) {
      const dia = new Date(ano, mes, -i);
      dias.push({ data: dia, foraDoMes: true });
    }

    // Dias do mês atual
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      dias.push({ data: new Date(ano, mes, dia), foraDoMes: false });
    }

    // Dias do próximo mês para preencher o final
    const diaSemanaUltimo = ultimoDia.getDay();
    for (let i = 1; i < 7 - diaSemanaUltimo; i++) {
      dias.push({ data: new Date(ano, mes + 1, i), foraDoMes: true });
    }

    return dias;
  };

  const dias = gerarDiasDoMes();

  // Formatar data para chave do objeto de tarefas
  const formatarDataChave = (data) => {
    return data.toISOString().split('T')[0];
  };

  // Obter tarefas do dia selecionado
  const tarefasDoDia = tarefas[formatarDataChave(dataSelecionada)] || [];

  // Navegar para mês anterior/próximo
  const mudarMes = (direcao) => {
    setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() + direcao, 1));
  };

  // Selecionar um dia
  const selecionarDia = (data) => {
    setDataSelecionada(data);
  };

  // Adicionar nova tarefa
  const adicionarTarefa = (e) => {
    e.preventDefault();
    const chave = formatarDataChave(dataSelecionada);
    const novaTarefaObj = {
      id: Date.now(),
      titulo: novaTarefa.titulo,
      horario: novaTarefa.horario,
      concluida: false,
      categoria: novaTarefa.categoria,
    };

    setTarefas(prev => ({
      ...prev,
      [chave]: [...(prev[chave] || []), novaTarefaObj]
    }));

    setNovaTarefa({ titulo: '', horario: '', categoria: 'trabalho' });
    setMostrarFormulario(false);
  };

  // Toggle concluir tarefa
  const toggleTarefa = (tarefaId) => {
    const chave = formatarDataChave(dataSelecionada);
    setTarefas(prev => ({
      ...prev,
      [chave]: prev[chave].map(t => t.id === tarefaId ? { ...t, concluida: !t.concluida } : t)
    }));
  };

  // Excluir tarefa
  const excluirTarefa = (tarefaId) => {
    const chave = formatarDataChave(dataSelecionada);
    setTarefas(prev => ({
      ...prev,
      [chave]: prev[chave].filter(t => t.id !== tarefaId)
    }));
  };

  // Drag para roleta
  const iniciarArrasto = (e) => {
    setEstaArrastando(true);
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    setPosicaoInicial(clientX);
    setScrollInicial(roletaRef.current.scrollLeft);
  };

  const arrastar = (e) => {
    if (!estaArrastando) return;
    e.preventDefault();
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const diferenca = clientX - posicaoInicial;
    roletaRef.current.scrollLeft = scrollInicial - diferenca;
  };

  const finalizarArrasto = () => {
    setEstaArrastando(false);
  };

  // Scroll suave para o dia selecionado na roleta
  useEffect(() => {
    if (roletaRef.current) {
      const diaElement = roletaRef.current.querySelector(`[data-dia="${dataSelecionada.getDate()}"]`);
      if (diaElement) {
        diaElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [dataSelecionada]);

  // Verificar se é hoje
  const ehHoje = (data) => {
    const hoje = new Date();
    return data.toDateString() === hoje.toDateString();
  };

  // Verificar se está selecionado
  const estaSelecionado = (data) => {
    return data.toDateString() === dataSelecionada.toDateString();
  };

  // Verificar se tem tarefas
  const temTarefas = (data) => {
    return (tarefas[formatarDataChave(data)] || []).length > 0;
  };

  return (
    <div style={styles.container}>
      {/* Header com navegação de mês */}
      <div style={styles.header}>
        <button onClick={() => mudarMes(-1)} style={styles.botaoNavegacao}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={styles.tituloMes}>
          {meses[dataAtual.getMonth()]} {dataAtual.getFullYear()}
        </h2>
        <button onClick={() => mudarMes(1)} style={styles.botaoNavegacao}>
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Roleta de dias */}
      <div
        ref={roletaRef}
        style={styles.roleta}
        onMouseDown={iniciarArrasto}
        onMouseMove={arrastar}
        onMouseUp={finalizarArrasto}
        onMouseLeave={finalizarArrasto}
        onTouchStart={iniciarArrasto}
        onTouchMove={arrastar}
        onTouchEnd={finalizarArrasto}
      >
        {dias.map(({ data, foraDoMes }, index) => (
          <div
            key={index}
            data-dia={data.getDate()}
            onClick={() => selecionarDia(data)}
            style={{
              ...styles.diaCard,
              ...(foraDoMes && styles.diaForaDoMes),
              ...(estaSelecionado(data) && styles.diaSelecionado),
              ...(ehHoje(data) && !estaSelecionado(data) && styles.diaHoje),
            }}
          >
            <span style={styles.diaSemana}>{diasSemana[data.getDay()]}</span>
            <span style={{
              ...styles.numeroDia,
              ...(estaSelecionado(data) && styles.numeroDiaSelecionado),
            }}>
              {data.getDate()}
            </span>
            {temTarefas(data) && <div style={styles.indicadorTarefa} />}
          </div>
        ))}
      </div>

      {/* Área de tarefas do dia */}
      <div style={styles.areaTarefas}>
        <div style={styles.cabecalhoTarefas}>
          <div>
            <h3 style={styles.tituloTarefas}>
              <CalendarIcon size={20} style={{ marginRight: 8 }} />
              {dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <p style={styles.subtituloTarefas}>
              {tarefasDoDia.length} {tarefasDoDia.length === 1 ? 'tarefa' : 'tarefas'}
            </p>
          </div>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            style={styles.botaoAdicionar}
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Formulário de nova tarefa */}
        {mostrarFormulario && (
          <form onSubmit={adicionarTarefa} style={styles.formulario}>
            <input
              type="text"
              placeholder="Nome da tarefa..."
              value={novaTarefa.titulo}
              onChange={(e) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })}
              style={styles.input}
              required
            />
            <div style={styles.linhaFormulario}>
              <input
                type="time"
                value={novaTarefa.horario}
                onChange={(e) => setNovaTarefa({ ...novaTarefa, horario: e.target.value })}
                style={{ ...styles.input, flex: 1 }}
                required
              />
              <select
                value={novaTarefa.categoria}
                onChange={(e) => setNovaTarefa({ ...novaTarefa, categoria: e.target.value })}
                style={{ ...styles.input, flex: 2 }}
              >
                {Object.entries(categorias).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <button type="submit" style={styles.botaoSalvar}>
              Adicionar Tarefa
            </button>
          </form>
        )}

        {/* Lista de tarefas */}
        <div style={styles.listaTarefas}>
          {tarefasDoDia.length === 0 ? (
            <div style={styles.semTarefas}>
              <p>Nenhuma tarefa para este dia</p>
              <p style={styles.dica}>Clique no + para adicionar uma tarefa</p>
            </div>
          ) : (
            tarefasDoDia
              .sort((a, b) => a.horario.localeCompare(b.horario))
              .map((tarefa) => (
                <div
                  key={tarefa.id}
                  style={{
                    ...styles.tarefa,
                    ...(tarefa.concluida && styles.tarefaConcluida),
                  }}
                >
                  <button
                    onClick={() => toggleTarefa(tarefa.id)}
                    style={{
                      ...styles.checkbox,
                      backgroundColor: tarefa.concluida ? categorias[tarefa.categoria].cor : 'transparent',
                      borderColor: categorias[tarefa.categoria].cor,
                    }}
                  >
                    {tarefa.concluida && <Check size={14} color="white" />}
                  </button>
                  <div style={styles.infoTarefa}>
                    <span style={{
                      ...styles.tituloTarefa,
                      ...(tarefa.concluida && styles.tituloTarefaConcluido),
                    }}>
                      {tarefa.titulo}
                    </span>
                    <span style={styles.horarioTarefa}>
                      <Clock size={12} style={{ marginRight: 4 }} />
                      {tarefa.horario}
                    </span>
                  </div>
                  <span
                    style={{
                      ...styles.tagCategoria,
                      backgroundColor: `${categorias[tarefa.categoria].cor}20`,
                      color: categorias[tarefa.categoria].cor,
                    }}
                  >
                    {categorias[tarefa.categoria].label}
                  </span>
                  <button
                    onClick={() => excluirTarefa(tarefa.id)}
                    style={styles.botaoExcluir}
                  >
                    ×
                  </button>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: 24,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  botaoNavegacao: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
    borderRadius: 8,
    transition: 'background 0.2s',
    ':hover': {
      background: '#f3f4f6',
    },
  },
  tituloMes: {
    fontSize: 24,
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  roleta: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    padding: '16px 4px',
    marginBottom: 24,
    cursor: 'grab',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
  diaCard: {
    flexShrink: 0,
    width: 72,
    height: 90,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    border: '2px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    userSelect: 'none',
  },
  diaForaDoMes: {
    opacity: 0.4,
  },
  diaSelecionado: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    transform: 'scale(1.05)',
    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
  },
  diaHoje: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  diaSemana: {
    fontSize: 12,
    fontWeight: 500,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  numeroDia: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1f2937',
  },
  numeroDiaSelecionado: {
    color: 'white',
  },
  indicadorTarefa: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  areaTarefas: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  cabecalhoTarefas: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  tituloTarefas: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    textTransform: 'capitalize',
  },
  subtituloTarefas: {
    fontSize: 14,
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  botaoAdicionar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#2563eb',
      transform: 'scale(1.05)',
    },
  },
  formulario: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    marginBottom: 12,
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': {
      borderColor: '#3b82f6',
    },
  },
  linhaFormulario: {
    display: 'flex',
    gap: 12,
  },
  botaoSalvar: {
    width: '100%',
    padding: 12,
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    ':hover': {
      backgroundColor: '#2563eb',
    },
  },
  listaTarefas: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  semTarefas: {
    textAlign: 'center',
    padding: 40,
    color: '#9ca3af',
  },
  dica: {
    fontSize: 14,
    marginTop: 8,
  },
  tarefa: {
    display: 'flex',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    transition: 'all 0.2s',
  },
  tarefaConcluida: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginRight: 16,
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  infoTarefa: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  tituloTarefa: {
    fontSize: 15,
    fontWeight: 500,
    color: '#1f2937',
  },
  tituloTarefaConcluido: {
    textDecoration: 'line-through',
    color: '#9ca3af',
  },
  horarioTarefa: {
    fontSize: 13,
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
  },
  tagCategoria: {
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    marginRight: 12,
  },
  botaoExcluir: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
    transition: 'color 0.2s',
    ':hover': {
      color: '#ef4444',
    },
  },
};
