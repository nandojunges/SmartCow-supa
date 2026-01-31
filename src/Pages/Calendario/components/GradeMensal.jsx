import { motion } from 'framer-motion';
import { useCallback } from 'react';

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function GradeMensal({
  dias,
  dataSelecionada,
  onSelecionarDia,
  tarefas,
  formatarDataChave,
}) {
  const ehHoje = useCallback((data) => {
    const hoje = new Date();
    return data.toDateString() === hoje.toDateString();
  }, []);

  const estaSelecionado = useCallback((data) => {
    return data.toDateString() === dataSelecionada.toDateString();
  }, [dataSelecionada]);

  const obterInfoTarefas = useCallback((data) => {
    const tarefasDoDia = tarefas[formatarDataChave(data)] || [];
    const total = tarefasDoDia.length;
    const concluidas = tarefasDoDia.filter(t => t.concluida).length;
    const pendentes = total - concluidas;
    return { total, concluidas, pendentes };
  }, [tarefas, formatarDataChave]);

  return (
    <div className="grade-mensal">
      <div className="cabecalho-grade">
        {diasSemana.map(dia => (
          <div key={dia} className="dia-cabecalho">{dia}</div>
        ))}
      </div>

      <div className="corpo-grade">
        {dias.map(({ data, foraDoMes }, index) => {
          const selecionado = estaSelecionado(data);
          const hoje = ehHoje(data);
          const { total, concluidas, pendentes } = obterInfoTarefas(data);

          return (
            <motion.div
              key={index}
              onClick={() => onSelecionarDia(data)}
              className={`celula-dia ${selecionado ? 'selecionado' : ''} ${hoje ? 'hoje' : ''} ${foraDoMes ? 'fora-mes' : ''}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="numero-celula">{data.getDate()}</span>

              {total > 0 && (
                <div className="barra-progresso">
                  <div
                    className="progresso-concluido"
                    style={{ width: `${(concluidas / total) * 100}%` }}
                  />
                </div>
              )}

              {total > 0 && (
                <div className="contador-tarefas">
                  {pendentes > 0 && (
                    <span className="contador-pendentes">{pendentes}</span>
                  )}
                  {concluidas > 0 && (
                    <span className="contador-concluidas">{concluidas}</span>
                  )}
                </div>
              )}

              {selecionado && (
                <motion.div
                  className="selecao-indicador"
                  layoutId="selecao-grade"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
