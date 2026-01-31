import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Calendar,
  TrendingUp,
  Target,
  Clock,
  Award,
} from 'lucide-react';

export function DashboardEstatisticas({ estatisticas, dataSelecionada, tarefasHoje }) {
  const { total, concluidas, pendentes, hoje, porCategoria } = estatisticas;

  const taxaConclusao = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  const taxaHoje = hoje.total > 0 ? Math.round((hoje.concluidas / hoje.total) * 100) : 0;

  const getMensagemMotivacional = () => {
    if (taxaHoje === 100 && hoje.total > 0) return '🎉 Parabéns! Você concluiu todas as tarefas de hoje!';
    if (taxaHoje >= 75) return '🔥 Excelente progresso! Continue assim!';
    if (taxaHoje >= 50) return '💪 Você está indo bem! Falta pouco!';
    if (hoje.total === 0) return '🌟 Comece seu dia adicionando tarefas!';
    return '🚀 Vamos lá! Você consegue completar suas tarefas!';
  };

  return (
    <div className="dashboard-estatisticas">
      {/* Cards principais */}
      <div className="cards-principais">
        <motion.div
          className="stat-card progresso-geral"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-icon">
            <Target size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-valor">{taxaConclusao}%</span>
            <span className="stat-label">Taxa de Conclusão</span>
          </div>
          <div className="progresso-circular">
            <svg viewBox="0 0 36 36">
              <path
                className="circulo-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="circulo-progresso"
                strokeDasharray={`${taxaConclusao}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </motion.div>

        <motion.div
          className="stat-card hoje"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-icon azul">
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-valor">{hoje.total}</span>
            <span className="stat-label">Tarefas Hoje</span>
          </div>
          <div className="mini-stats">
            <span className="mini-stat concluidas">
              <CheckCircle2 size={12} />
              {hoje.concluidas}
            </span>
            <span className="mini-stat pendentes">
              <Circle size={12} />
              {hoje.pendentes}
            </span>
          </div>
        </motion.div>

        <motion.div
          className="stat-card total"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-icon roxo">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-valor">{total}</span>
            <span className="stat-label">Total de Tarefas</span>
          </div>
        </motion.div>
      </div>

      {/* Mensagem motivacional */}
      <motion.div
        className="mensagem-motivacional"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Award size={20} />
        <p>{getMensagemMotivacional()}</p>
      </motion.div>

      {/* Gráfico por categoria */}
      <motion.div
        className="grafico-categorias"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h4>
          <Clock size={16} />
          Tarefas por Categoria
        </h4>

        <div className="barras-categorias">
          {porCategoria
            .filter(cat => cat.total > 0)
            .sort((a, b) => b.total - a.total)
            .map((cat, index) => {
              const percentual = cat.total > 0 ? (cat.concluidas / cat.total) * 100 : 0;

              return (
                <motion.div
                  key={cat.key}
                  className="barra-categoria"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <div className="categoria-info">
                    <span
                      className="cor-categoria"
                      style={{ backgroundColor: cat.cor }}
                    />
                    <span className="nome-categoria">{cat.label}</span>
                    <span className="contagem-categoria">
                      {cat.concluidas}/{cat.total}
                    </span>
                  </div>
                  <div className="barra-container">
                    <motion.div
                      className="barra-progresso-cat"
                      style={{ backgroundColor: cat.cor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentual}%` }}
                      transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                    />
                  </div>
                </motion.div>
              );
            })}
        </div>
      </motion.div>
    </div>
  );
}
