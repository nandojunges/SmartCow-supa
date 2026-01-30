import { useMemo, useState } from "react";

import { getColumnsForDataset } from "./ColumnsCatalog";

const WIDTH_PRESETS = {
  S: 90,
  M: 140,
  L: 220,
};

export default function DatasetBuilder({ datasetKey, columns, setColumns }) {
  const [searchTerm, setSearchTerm] = useState("");
  const catalog = useMemo(
    () => getColumnsForDataset(datasetKey),
    [datasetKey]
  );

  const selectedKeys = useMemo(
    () => new Set(columns.map((column) => column.key)),
    [columns]
  );

  const availableColumns = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return catalog.filter((column) => {
      if (selectedKeys.has(column.key)) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        column.label.toLowerCase().includes(normalized) ||
        column.key.toLowerCase().includes(normalized)
      );
    });
  }, [catalog, searchTerm, selectedKeys]);

  const handleMoveColumn = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= columns.length) {
      return;
    }

    setColumns((prevColumns) => {
      const nextColumns = [...prevColumns];
      const [moved] = nextColumns.splice(index, 1);
      nextColumns.splice(targetIndex, 0, moved);
      return nextColumns;
    });
  };

  const handleAddColumn = (column) => {
    setColumns((prevColumns) => {
      if (prevColumns.some((item) => item.key === column.key)) {
        return prevColumns;
      }

      return [...prevColumns, { ...column }];
    });
  };

  const handleRemoveColumn = (columnKey) => {
    setColumns((prevColumns) =>
      prevColumns.filter((column) => column.key !== columnKey)
    );
  };

  const handleRenameColumn = (columnKey, label) => {
    setColumns((prevColumns) =>
      prevColumns.map((column) =>
        column.key === columnKey ? { ...column, label } : column
      )
    );
  };

  const handleResizePreset = (columnKey, size) => {
    setColumns((prevColumns) =>
      prevColumns.map((column) =>
        column.key === columnKey
          ? { ...column, width: WIDTH_PRESETS[size] }
          : column
      )
    );
  };

  const handleAddNotes = () => {
    setColumns((prevColumns) => {
      if (prevColumns.some((column) => column.key === "anotacoes")) {
        return prevColumns;
      }

      return [
        ...prevColumns,
        {
          key: "anotacoes",
          label: "Anotações",
          width: 220,
          editable: true,
        },
      ];
    });
  };

  return (
    <div className="dataset-builder">
      <div className="dataset-builder__header">
        <h2>Configurar Planilha</h2>
        <p className="dataset-builder__note">
          Escolha as colunas do plantel e ajuste os detalhes.
        </p>
      </div>

      <label className="dataset-builder__search">
        <span>Buscar coluna...</span>
        <input
          type="search"
          placeholder="Digite para filtrar"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </label>

      <div className="dataset-builder__columns">
        <div>
          <h3>Disponíveis</h3>
          <ul>
            {availableColumns.map((column) => (
              <li key={column.key} className="dataset-builder__column-item">
                <div>
                  <strong>{column.label}</strong>
                  <span className="dataset-builder__meta">
                    {column.group}
                  </span>
                </div>
                <button
                  type="button"
                  className="dataset-builder__icon-button"
                  onClick={() => handleAddColumn(column)}
                >
                  +
                </button>
              </li>
            ))}
            {availableColumns.length === 0 && (
              <li className="dataset-builder__empty">Nenhuma coluna.</li>
            )}
          </ul>
        </div>

        <div>
          <h3>Selecionadas</h3>
          <ul>
            {columns.map((column, index) => (
              <li key={column.key} className="dataset-builder__column-item">
                <div className="dataset-builder__column-info">
                  <input
                    type="text"
                    value={column.label}
                    onChange={(event) =>
                      handleRenameColumn(column.key, event.target.value)
                    }
                  />
                  <span className="dataset-builder__meta">
                    {column.group ?? "Personalizada"}
                  </span>
                </div>
                <div className="dataset-builder__actions">
                  <div className="dataset-builder__presets">
                    {Object.keys(WIDTH_PRESETS).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleResizePreset(column.key, size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMoveColumn(index, -1)}
                    aria-label="Mover para cima"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveColumn(index, 1)}
                    aria-label="Mover para baixo"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveColumn(column.key)}
                    aria-label="Remover coluna"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
            {columns.length === 0 && (
              <li className="dataset-builder__empty">Selecione colunas.</li>
            )}
          </ul>
        </div>
      </div>

      <button
        type="button"
        className="dataset-builder__add"
        onClick={handleAddNotes}
      >
        + Anotações
      </button>
    </div>
  );
}
