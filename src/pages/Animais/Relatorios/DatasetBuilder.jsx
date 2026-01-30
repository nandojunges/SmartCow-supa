export default function DatasetBuilder({ columns, setColumns }) {
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
          MVP: seleção de colunas vem no próximo passo
        </p>
      </div>

      <div className="dataset-builder__columns">
        <h3>Colunas ativas</h3>
        <ul>
          {columns.map((column, index) => (
            <li key={column.key} className="dataset-builder__column-item">
              <span>{column.label}</span>
              <div className="dataset-builder__actions">
                <button
                  type="button"
                  onClick={() => handleMoveColumn(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveColumn(index, 1)}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="dataset-builder__add" onClick={handleAddNotes}>
        + Anotações
      </button>
    </div>
  );
}
