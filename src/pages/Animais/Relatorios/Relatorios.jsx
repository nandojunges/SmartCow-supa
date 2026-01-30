import { useEffect, useMemo, useState } from "react";

import DatasetBuilder from "./DatasetBuilder";
import ReportComposer from "./ReportComposer";
import SmartGrid from "./SmartGrid";
import { getColumnsForDataset } from "./ColumnsCatalog";
import { MOCK_DATASETS } from "./mockDatasets";
import "./smartGrid.css";
import "./print.css";

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState("planilha");
  const [datasetKey, setDatasetKey] = useState("plantel");
  const [rows, setRows] = useState(MOCK_DATASETS.plantel.rows);
  const [columns, setColumns] = useState(
    getColumnsForDataset("plantel").slice(0, 4)
  );

  const datasetOptions = useMemo(
    () => [{ key: "plantel", label: "Plantel" }],
    []
  );

  useEffect(() => {
    const dataset = MOCK_DATASETS[datasetKey];
    setRows(dataset?.rows ?? []);
    setColumns(getColumnsForDataset(datasetKey).slice(0, 4));
  }, [datasetKey]);

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

  const handleResizeColumn = (columnKey, width) => {
    setColumns((prevColumns) =>
      prevColumns.map((column) =>
        column.key === columnKey ? { ...column, width } : column
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
            className={activeTab === "relatorio" ? "is-active" : ""}
            onClick={() => setActiveTab("relatorio")}
          >
            Relatório Final
          </button>
        </div>
      </header>

      <div className="relatorios-card">
        {activeTab === "planilha" ? (
          <div className="relatorios-planilha">
            <aside className="relatorios-sidebar">
              <label className="dataset-builder__search">
                <span>Dataset</span>
                <select
                  value={datasetKey}
                  onChange={(event) => setDatasetKey(event.target.value)}
                >
                  {datasetOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <DatasetBuilder
                datasetKey={datasetKey}
                columns={columns}
                setColumns={setColumns}
              />
            </aside>
            <div className="relatorios-grid">
              <SmartGrid
                rows={rows}
                columns={columns}
                onChangeCell={handleChangeCell}
                onResizeColumn={handleResizeColumn}
              />
            </div>
          </div>
        ) : (
          <ReportComposer
            datasetKey={datasetKey}
            rows={rows}
            columns={columns}
          />
        )}
      </div>
    </section>
  );
}
