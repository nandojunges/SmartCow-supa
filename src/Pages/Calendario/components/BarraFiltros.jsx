import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  CheckCircle2,
  Circle,
  LayoutGrid,
  List,
  CalendarDays,
  RotateCcw,
} from 'lucide-react';

const VIEW_MODES = [
  { key: 'roleta', label: 'Roleta', icon: List },
  { key: 'grade', label: 'Mês', icon: LayoutGrid },
  { key: 'semana', label: 'Semana', icon: CalendarDays },
];

const STATUS_FILTERS = [
  { key: 'todas', label: 'Todas', icon: null },
  { key: 'pendentes', label: 'Pendentes', icon: Circle },
  { key: 'concluidas', label: 'Concluídas', icon: CheckCircle2 },
];

export function BarraFiltros({
  viewMode,
  onChangeViewMode,
  filtros,
  onChangeFiltros,
  categorias,
  onLimparFiltros,
  totalTarefas,
  tarefasFiltradas,
}) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [buscaLocal, setBuscaLocal] = useState(filtros.busca);

  const handleBuscaChange = (valor) => {
    setBuscaLocal(valor);
    onChangeFiltros({ ...filtros, busca: valor });
  };

  const toggleCategoria = (categoriaKey) => {
    const novasCategorias = filtros.categorias.includes(categoriaKey)
      ? filtros.categorias.filter(c => c !== categoriaKey)
      : [...filtros.categorias, categoriaKey];
    onChangeFiltros({ ...filtros, categorias: novasCategorias });
  };

  const temFiltrosAtivos = filtros.categorias.length > 0 || filtros.status !== 'todas' || filtros.busca;

  return (
    <div className="barra-filtros">
      {/* Busca e View Mode */}
      <div className="linha-principal">
        <div className="campo-busca">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar tarefas..."
            value={buscaLocal}
            onChange={(e) => handleBuscaChange(e.target.value)}
          />
          {buscaLocal && (
            <button onClick={() => handleBuscaChange('')} className="limpar-busca">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="view-modes">
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.key}
                onClick={() => onChangeViewMode(mode.key)}
                className={viewMode === mode.key ? 'ativo' : ''}
                title={mode.label}
              >
                <Icon size={18} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className={`btn-filtros ${mostrarFiltros ? 'ativo' : ''} ${temFiltrosAtivos ? 'tem-filtros' : ''}`}
        >
          <Filter size={18} />
          <span>Filtros</span>
          {temFiltrosAtivos && (
            <span className="badge-filtros">
              {filtros.categorias.length + (filtros.status !== 'todas' ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Painel de filtros avançados */}
      <AnimatePresence>
        {mostrarFiltros && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="painel-filtros"
          >
            {/* Filtro por status */}
            <div className="secao-filtro">
              <span className="secao-titulo">Status</span>
              <div className="opcoes-status">
                {STATUS_FILTERS.map((status) => {
                  const Icon = status.icon;
                  return (
                    <button
                      key={status.key}
                      onClick={() => onChangeFiltros({ ...filtros, status: status.key })}
                      className={filtros.status === status.key ? 'selecionado' : ''}
                    >
                      {Icon && <Icon size={14} />}
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtro por categoria */}
            <div className="secao-filtro">
              <span className="secao-titulo">Categorias</span>
              <div className="opcoes-categorias">
                {Object.entries(categorias).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => toggleCategoria(key)}
                    className={filtros.categorias.includes(key) ? 'selecionado' : ''}
                    style={{ '--cor-categoria': cat.cor }}
                  >
                    <span className="cor-indicador" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resultados e limpar */}
            <div className="filtros-footer">
              <span className="resultados">
                Mostrando {tarefasFiltradas} de {totalTarefas} tarefas
              </span>
              {temFiltrosAtivos && (
                <button onClick={onLimparFiltros} className="btn-limpar">
                  <RotateCcw size={14} />
                  Limpar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
