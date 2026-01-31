import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  Tag,
  AlignLeft,
  Bell,
  Repeat,
  AlertCircle,
  Check,
  ChevronDown,
} from 'lucide-react';

const PRIORIDADES = [
  { key: 'baixa', label: 'Baixa', cor: '#10b981' },
  { key: 'media', label: 'Média', cor: '#f59e0b' },
  { key: 'alta', label: 'Alta', cor: '#ef4444' },
];

const RECORRENCIAS = [
  { key: null, label: 'Não repetir' },
  { key: 'diaria', label: 'Todos os dias' },
  { key: 'semanal', label: 'Toda semana' },
  { key: 'mensal', label: 'Todo mês' },
];

const LEMBRETES = [
  { key: null, label: 'Sem lembrete' },
  { key: '0', label: 'Na hora' },
  { key: '5', label: '5 minutos antes' },
  { key: '15', label: '15 minutos antes' },
  { key: '30', label: '30 minutos antes' },
  { key: '60', label: '1 hora antes' },
];

export function FormularioTarefa({
  aberto,
  onFechar,
  onSalvar,
  categorias,
  tarefaParaEditar = null,
  dataSelecionada,
}) {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    horario: '',
    categoria: Object.keys(categorias)[0] || 'trabalho',
    prioridade: 'media',
    recorrencia: null,
    lembrete: null,
  });

  const [abaAtiva, setAbaAtiva] = useState('basico');
  const [mostrarSelectCategoria, setMostrarSelectCategoria] = useState(false);

  useEffect(() => {
    if (tarefaParaEditar) {
      setFormData({
        titulo: tarefaParaEditar.titulo || '',
        descricao: tarefaParaEditar.descricao || '',
        horario: tarefaParaEditar.horario || '',
        categoria: tarefaParaEditar.categoria || Object.keys(categorias)[0],
        prioridade: tarefaParaEditar.prioridade || 'media',
        recorrencia: tarefaParaEditar.recorrencia || null,
        lembrete: tarefaParaEditar.lembrete || null,
      });
    } else {
      setFormData({
        titulo: '',
        descricao: '',
        horario: '',
        categoria: Object.keys(categorias)[0] || 'trabalho',
        prioridade: 'media',
        recorrencia: null,
        lembrete: null,
      });
    }
  }, [tarefaParaEditar, categorias, aberto]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo.trim()) return;

    onSalvar({
      ...formData,
      id: tarefaParaEditar?.id,
    });

    onFechar();
  };

  if (!aberto) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        onClick={onFechar}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="modal-conteudo"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>{tarefaParaEditar ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
            <button onClick={onFechar} className="btn-fechar">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Abas */}
            <div className="abas">
              <button
                type="button"
                className={abaAtiva === 'basico' ? 'ativa' : ''}
                onClick={() => setAbaAtiva('basico')}
              >
                Básico
              </button>
              <button
                type="button"
                className={abaAtiva === 'avancado' ? 'ativa' : ''}
                onClick={() => setAbaAtiva('avancado')}
              >
                Avançado
              </button>
            </div>

            {/* Conteúdo das abas */}
            <div className="form-conteudo">
              {abaAtiva === 'basico' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="aba-basico"
                >
                  <div className="campo">
                    <input
                      type="text"
                      placeholder="O que precisa ser feito?"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      className="input-titulo"
                      autoFocus
                    />
                  </div>

                  <div className="campo-row">
                    <div className="campo">
                      <label>
                        <Clock size={14} />
                        Horário
                      </label>
                      <input
                        type="time"
                        value={formData.horario}
                        onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                      />
                    </div>

                    <div className="campo">
                      <label>
                        <Tag size={14} />
                        Categoria
                      </label>
                      <div className="select-custom">
                        <button
                          type="button"
                          onClick={() => setMostrarSelectCategoria(!mostrarSelectCategoria)}
                          className="select-trigger"
                          style={{ '--cor-categoria': categorias[formData.categoria]?.cor }}
                        >
                          <span
                            className="cor-categoria"
                            style={{ backgroundColor: categorias[formData.categoria]?.cor }}
                          />
                          {categorias[formData.categoria]?.label}
                          <ChevronDown size={14} />
                        </button>

                        <AnimatePresence>
                          {mostrarSelectCategoria && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="select-dropdown"
                            >
                              {Object.entries(categorias).map(([key, cat]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, categoria: key });
                                    setMostrarSelectCategoria(false);
                                  }}
                                  className={formData.categoria === key ? 'selecionado' : ''}
                                >
                                  <span
                                    className="cor-categoria"
                                    style={{ backgroundColor: cat.cor }}
                                  />
                                  {cat.label}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="campo">
                    <label>
                      <AlignLeft size={14} />
                      Descrição (opcional)
                    </label>
                    <textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Adicione detalhes..."
                      rows={3}
                    />
                  </div>
                </motion.div>
              )}

              {abaAtiva === 'avancado' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="aba-avancado"
                >
                  <div className="campo">
                    <label>
                      <AlertCircle size={14} />
                      Prioridade
                    </label>
                    <div className="prioridade-opcoes">
                      {PRIORIDADES.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          className={formData.prioridade === p.key ? 'selecionado' : ''}
                          onClick={() => setFormData({ ...formData, prioridade: p.key })}
                          style={{ '--cor-prioridade': p.cor }}
                        >
                          <span className="indicador" />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="campo">
                    <label>
                      <Repeat size={14} />
                      Recorrência
                    </label>
                    <div className="recorrencia-opcoes">
                      {RECORRENCIAS.map((r) => (
                        <button
                          key={r.key || 'none'}
                          type="button"
                          className={formData.recorrencia === r.key ? 'selecionado' : ''}
                          onClick={() => setFormData({ ...formData, recorrencia: r.key })}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="campo">
                    <label>
                      <Bell size={14} />
                      Lembrete
                    </label>
                    <div className="lembrete-opcoes">
                      {LEMBRETES.map((l) => (
                        <button
                          key={l.key || 'none'}
                          type="button"
                          className={formData.lembrete === l.key ? 'selecionado' : ''}
                          onClick={() => setFormData({ ...formData, lembrete: l.key })}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={onFechar} className="btn-cancelar">
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-salvar"
                disabled={!formData.titulo.trim()}
              >
                <Check size={18} />
                {tarefaParaEditar ? 'Salvar' : 'Criar Tarefa'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
