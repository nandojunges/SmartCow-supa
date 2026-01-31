import { motion } from 'framer-motion';
import { useCallback } from 'react';
import { Clock, CheckCircle2, Circle } from 'lucide-react';

const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function VisualizacaoSemanal({
  dias,
  dataSelecionada,
  onSelecionarDia,
  onToggleTarefa,
  tarefas,
  formatarDataChave,
  categorias,
}) {
  const ehHoje = useCallback((data) => {
    const hoje = new Date();
    return data.toDateString() === hoje.toDateString();
  }, []);

  const estaSelecionado = useCallback((data) => {
    return data.toDateString() === dataSelecionada.toDateString();
  }, [dataSelecionada]);

  const obterTarefasDoDia = useCallback((data) => {
    const lista = tarefas[formatarDataChave(data)] || [];
    return lista.sort((a, b) => {
      if (a.horario && b.horario) return a.horario.localeCompare(b.horario);
      if (a.horario) return -1;
      if (b.horario) return 1;
      return 0;
    });
  }, [tarefas, formatarDataChave]);

  return (
    <div className="visualizacao-semanal">
      {dias.map(({ data }, index) => {
        const selecionado = estaSelecionado(data);
        const hoje = ehHoje(data);
        const tarefasDoDia = obterTarefasDoDia(data);

        return (
          <motion.div
            key={index}
            onClick={() => onSelecionarDia(data)}
            className={`coluna-dia ${selecionado ? 'selecionado' : ''} ${hoje ? 'hoje' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="cabecalho-coluna">
              <span className="nome-dia">{diasSemana[data.getDay()]}</span>
              <span className="numero-dia-semana">{data.getDate()}</span>
              {tarefasDoDia.length > 0 && (
                <span className="badge-total">{tarefasDoDia.length}</span>
              )}
            </div>

            <div className="lista-tarefas-semana">
              {tarefasDoDia.length === 0 ? (
                <div className="sem-tarefas-semana">
                  <span className="texto-vazio">Sem tarefas</span>
                </div>
              ) : (
                tarefasDoDia.map((tarefa, idx) => (
                  <motion.div
                    key={tarefa.id}
                    className={`tarefa-semana ${tarefa.concluida ? 'concluida' : ''}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTarefa(data, tarefa.id);
                    }}
                  >
                    <div
                      className="indicador-categoria"
                      style={{ backgroundColor: categorias[tarefa.categoria]?.cor || '#999' }}
                    />
                    <div className="info-tarefa-semana">
                      <span className="titulo-tarefa-semana">{tarefa.titulo}</span>
                      {tarefa.horario && (
                        <span className="horario-tarefa-semana">
                          <Clock size={10} />
                          {tarefa.horario}
                        </span>
                      )}
                    </div>
                    <div className="status-tarefa">
                      {tarefa.concluida ? (
                        <CheckCircle2 size={16} className="icon-concluido" />
                      ) : (
                        <Circle size={16} className="icon-pendente" />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
