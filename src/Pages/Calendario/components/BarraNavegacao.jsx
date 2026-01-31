// src/Pages/Calendario/components/BarraNavegacao.jsx
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  BarChart3,
  Download,
  Upload,
} from "lucide-react";

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function BarraNavegacao({
  dataAtual,
  dataSelecionada,
  viewMode,
  onMudarMes,
  onMudarSemana,
  onIrParaHoje,
  onToggleDashboard,
  mostrarDashboard,
  onExportar,
  onImportar,
}) {
  const formatarTitulo = () => {
    if (viewMode === "semana") {
      const inicioSemana = new Date(dataSelecionada);
      inicioSemana.setDate(dataSelecionada.getDate() - dataSelecionada.getDay());
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);

      if (inicioSemana.getMonth() === fimSemana.getMonth()) {
        return `${inicioSemana.getDate()} - ${fimSemana.getDate()} de ${
          meses[inicioSemana.getMonth()]
        }`;
      }
      return `${inicioSemana.getDate()} ${meses[inicioSemana.getMonth()]} - ${fimSemana.getDate()} ${
        meses[fimSemana.getMonth()]
      }`;
    }

    return `${meses[dataAtual.getMonth()]} ${dataAtual.getFullYear()}`;
  };

  const handleAnterior = () => {
    if (viewMode === "semana") onMudarSemana(-1);
    else onMudarMes(-1);
  };

  const handleProximo = () => {
    if (viewMode === "semana") onMudarSemana(1);
    else onMudarMes(1);
  };

  return (
    <div className="barra-navegacao">
      <div className="nav-principal">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAnterior}
          className="nav-btn"
          type="button"
        >
          <ChevronLeft size={20} />
        </motion.button>

        <motion.h2
          key={formatarTitulo()}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="titulo-nav"
        >
          <Calendar size={20} />
          {formatarTitulo()}
        </motion.h2>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleProximo}
          className="nav-btn"
          type="button"
        >
          <ChevronRight size={20} />
        </motion.button>
      </div>

      <div className="nav-acoes">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onIrParaHoje}
          className="btn-hoje"
          type="button"
        >
          <CalendarDays size={16} />
          Hoje
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleDashboard}
          className={`btn-dashboard ${mostrarDashboard ? "ativo" : ""}`}
          type="button"
          title="Dashboard"
        >
          <BarChart3 size={18} />
        </motion.button>

        <div className="separador" />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onExportar}
          className="btn-icon"
          title="Exportar dados"
          type="button"
        >
          <Download size={18} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onImportar}
          className="btn-icon"
          title="Importar dados"
          type="button"
        >
          <Upload size={18} />
        </motion.button>
      </div>
    </div>
  );
}
