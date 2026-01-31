// BezerraFilter.jsx
import React, { useMemo } from "react";
import { Search, X } from "lucide-react";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";

const DEFAULT_FILTERS = {
  search: "",
  status: "todos",
  categoria: "todos",
  lote: "todos",
};

export default function BezerraFilter({ filters, onChange, onClear }) {
  const safeFilters = { ...DEFAULT_FILTERS, ...(filters || {}) };

  const statusOptions = useMemo(
    () => [
      { value: "todos", label: "Todos os status" },
      { value: "saudavel", label: "Saudáveis" },
      { value: "alerta", label: "Alerta" },
      { value: "tratamento", label: "Em Tratamento" },
      { value: "critico", label: "Crítico" },
    ],
    []
  );

  const categoriaOptions = useMemo(
    () => [
      { value: "todos", label: "Todas as categorias" },
      { value: "neonatal", label: "Neonatal (0-7 dias)" },
      { value: "aleitamento", label: "Aleitamento (8-60 dias)" },
      { value: "transicao", label: "Transição (60-90 dias)" },
      { value: "desmamada", label: "Desmamada (90+ dias)" },
    ],
    []
  );

  const loteOptions = useMemo(
    () => [
      { value: "todos", label: "Todos os lotes" },
      { value: "2024-A", label: "Lote 2024-A" },
      { value: "2024-B", label: "Lote 2024-B" },
    ],
    []
  );

  const hasActiveFilters =
    (safeFilters.search || "").trim().length > 0 ||
    safeFilters.status !== "todos" ||
    safeFilters.categoria !== "todos" ||
    safeFilters.lote !== "todos";

  const update = (patch) => {
    onChange?.({ ...safeFilters, ...patch });
  };

  const handleClear = () => {
    if (onClear) return onClear();
    // fallback caso o pai não implemente onClear:
    onChange?.({ ...DEFAULT_FILTERS });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          placeholder="Buscar nome ou brinco..."
          value={safeFilters.search}
          onChange={(e) => update({ search: e.target.value })}
          icon={Search}
        />

        <Select
          value={safeFilters.status}
          onChange={(e) => update({ status: e.target.value })}
          options={statusOptions}
        />

        <Select
          value={safeFilters.categoria}
          onChange={(e) => update({ categoria: e.target.value })}
          options={categoriaOptions}
        />

        <Select
          value={safeFilters.lote}
          onChange={(e) => update({ lote: e.target.value })}
          options={loteOptions}
        />
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-sm text-slate-500">Filtros ativos</span>
          <Button variant="ghost" size="sm" onClick={handleClear} leftIcon={X}>
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
