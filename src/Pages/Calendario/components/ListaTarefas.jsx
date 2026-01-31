import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Check,
  Clock,
  Calendar,
  Trash2,
  Edit2,
  GripVertical,
  Bell,
  Repeat,
  Tag,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function ListaTarefas({
  tarefas,
  data,
  categorias,
  onToggle,
  onExcluir,
  onEditar,
  onReorder,
  onAgendarLembrete,
}) {
  const [tarefaEditando, setTarefaEditando] = useState(null);
  const [menuAberto, setMenuAberto] = useState(null);

  const getPrioridadeIcon = (prioridade) => {
    switch (prioridade) {
      case 'alta': return <AlertCircle size={14} className="prioridade-alta" />;
      case 'media': return <AlertCircle size={14} className="prioridade-media" />;
      case 'baixa': return <AlertCircle size={14} className="prioridade-baixa" />;
      default: return null;
    }
  };

  const getRecorrenciaLabel = (recorrencia) => {
    if (!recorrencia) return null;
    const labels = {
      diaria: 'Diária',
      semanal: 'Semanal',
      mensal: 'Mensal',
    };
    return labels[recorrencia];
  };

  return (
    <div className="lista-tarefas-avancada">
      <AnimatePresence mode="popLayout">
        {tarefas.length === 0 ? (
          <motion.div
            key="vazio"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="estado-vazio"
          >
            <div className="icone-vazio">
              <CheckCircle2 size={48} />
            </div>
            <h4>Nenhuma tarefa</h4>
            <p>Adicione uma nova tarefa para começar</p>
          </motion.div>
        ) : (
          <Reorder.Group
            axis="y"
            values={tarefas}
            onReorder={onReorder}
            className="reorder-list"
          >
            {tarefas.map((tarefa, index) => (
              <Reorder.Item
                key={tarefa.id}
                value={tarefa}
                className={`tarefa-item ${tarefa.concluida ? 'concluida' : ''}`}
                whileDrag={{ scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="tarefa-conteudo"
                >
                  {/* Handle para drag */}
                  <div className="drag-handle">
                    <GripVertical size={18} />
                  </div>

                  {/* Checkbox */}
                  <button
                    onClick={() => onToggle(data, tarefa.id)}
                    className={`checkbox-animado ${tarefa.concluida ? 'concluido' : ''}`}
                    style={{
                      '--cor-categoria': categorias[tarefa.categoria]?.cor || '#999',
                    }}
                  >
                    <motion.div
                      className="check-fill"
                      initial={false}
                      animate={{ scale: tarefa.concluida ? 1 : 0 }}
                    />
                    <AnimatePresence>
                      {tarefa.concluida && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Check size={14} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  {/* Conteúdo */}
                  <div className="tarefa-info">
                    <div className="tarefa-header">
                      <span className={`tarefa-titulo ${tarefa.concluida ? 'riscado' : ''}`}>
                        {getPrioridadeIcon(tarefa.prioridade)}
                        {tarefa.titulo}
                      </span>

                      <div className="tarefa-badges">
                        {tarefa.recorrencia && (
                          <span className="badge-recorrencia">
                            <Repeat size={10} />
                            {getRecorrenciaLabel(tarefa.recorrencia)}
                          </span>
                        )}
                        {tarefa.lembrete && (
                          <span className="badge-lembrete">
                            <Bell size={10} />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="tarefa-meta">
                      {tarefa.horario && (
                        <span className="meta-item">
                          <Clock size={12} />
                          {tarefa.horario}
                        </span>
                      )}
                      <span
                        className="meta-item categoria"
                        style={{ color: categorias[tarefa.categoria]?.cor }}
                      >
                        <Tag size={12} />
                        {categorias[tarefa.categoria]?.label || 'Sem categoria'}
                      </span>
                      {tarefa.descricao && (
                        <span className="meta-item descricao-preview">
                          {tarefa.descricao.substring(0, 50)}
                          {tarefa.descricao.length > 50 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="tarefa-acoes">
                    <button
                      onClick={() => onAgendarLembrete && onAgendarLembrete(tarefa)}
                      className={`acao-btn ${tarefa.lembrete ? 'ativo' : ''}`}
                      title="Lembrete"
                    >
                      <Bell size={16} />
                    </button>

                    <div className="menu-container">
                      <button
                        onClick={() => setMenuAberto(menuAberto === tarefa.id ? null : tarefa.id)}
                        className="acao-btn"
                      >
                        <MoreVertical size={16} />
                      </button>

                      <AnimatePresence>
                        {menuAberto === tarefa.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="menu-dropdown"
                          >
                            <button
                              onClick={() => {
                                setTarefaEditando(tarefa);
                                onEditar && onEditar(tarefa);
                                setMenuAberto(null);
                              }}
                            >
                              <Edit2 size={14} />
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                onExcluir(data, tarefa.id);
                                setMenuAberto(null);
                              }}
                              className="perigo"
                            >
                              <Trash2 size={14} />
                              Excluir
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </AnimatePresence>
    </div>
  );
}
