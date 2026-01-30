import { useState } from "react";

import DatasetBuilder from "./DatasetBuilder";
import ReportComposer from "./ReportComposer";
import SmartGrid from "./SmartGrid";
import { MOCK_DATASETS } from "./mockDatasets";
import "./smartGrid.css";
import "./print.css";

const initialColumns = [
  { key: "numero", label: "Número", width: 90 },
  { key: "brinco", label: "Brinco", width: 140 },
  { key: "categoria", label: "Categoria", width: 140 },
  { key: "grupo", label: "Grupo", width: 140 },
];

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState("planilha");
  const [rows, setRows] = useState(MOCK_DATASETS.plantel.rows);
  const [columns, setColumns] = useState(initialColumns);

  const handleChangeCell = (rowId, columnKey, value) => {
    const column = columns.find((item) => item.key === columnKey);
    if (!column?.editable) {
      return;
    }

    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId ? { ...row, [columnKey]: value } : row
      )
    );
  };

  return (
    <section className="relatorios-page">
      <header className="relatorios-header">
        <div>
          <h1>Relatórios</h1>
        </div>
        <div className="relatorios-tabs">
          <button
            type="button"
            className={activeTab === "planilha" ? "is-active" : ""}
            onClick={() => setActiveTab("planilha")}
          >
            Planilha
          </button>
          <button
            type="button"
            className={activeTab === "final" ? "is-active" : ""}
            onClick={() => setActiveTab("final")}
          >
            Relatório Final
          </button>
        </div>
      </header>

      <div className="relatorios-card">
        {activeTab === "planilha" ? (
          <div className="relatorios-planilha">
            <aside className="relatorios-sidebar">
              <DatasetBuilder
                rows={rows}
                columns={columns}
                setRows={setRows}
                setColumns={setColumns}
              />
            </aside>
            <div className="relatorios-grid">
              <SmartGrid
                rows={rows}
                columns={columns}
                onChangeCell={handleChangeCell}
              />
            </div>
          </div>
        ) : (
          <ReportComposer totalAnimals={rows.length} />
        )}
      </div>
    </section>
  );
}
