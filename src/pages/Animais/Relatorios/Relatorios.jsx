import { useEffect, useMemo, useRef, useState } from "react";

import DatasetBuilder from "./DatasetBuilder";
import ReportComposer, { createDefaultBlocks } from "./ReportComposer";
import SmartGrid from "./SmartGrid";
import { getColumnsForDataset } from "./ColumnsCatalog";
import { MOCK_DATASETS } from "./mockDatasets";
import reportStorage from "./reportStorage";
import "./smartGrid.css";
import "./print.css";

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState("planilha");
  const [datasetKey, setDatasetKey] = useState("plantel");
  const [rows, setRows] = useState(MOCK_DATASETS.plantel.rows);
  const [columns, setColumns] = useState(
    getColumnsForDataset("plantel").slice(0, 4)
  );
  const [reportBlocks, setReportBlocks] = useState(() =>
    createDefaultBlocks()
  );
  const [modalType, setModalType] = useState(null);
  const [modelName, setModelName] = useState("");
  const [models, setModels] = useState([]);
  const skipDefaultColumnsRef = useRef(false);

  const datasetOptions = useMemo(
    () => [{ key: "plantel", label: "Plantel" }],
    []
  );

  useEffect(() => {
    const dataset = MOCK_DATASETS[datasetKey];
    setRows(dataset?.rows ?? []);
    if (skipDefaultColumnsRef.current) {
      skipDefaultColumnsRef.current = false;
      return;
    }
    setColumns(getColumnsForDataset(datasetKey).slice(0, 4));
  }, [datasetKey]);

  useEffect(() => {
    if (!modalType) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setModalType(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalType]);

  const refreshModels = () => {
    setModels(reportStorage.listModels());
  };

  const openSaveModal = () => {
    setModelName("");
    setModalType("save");
  };

  const openLoadModal = () => {
    refreshModels();
    setModalType("load");
  };

  const handleSaveModel = () => {
    if (!modelName.trim()) {
      return;
    }

    const payload = {
      datasetKey,
      columns,
      blocks: reportBlocks,
      activeTab,
    };

    reportStorage.saveModel({
      id: `model-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      name: modelName.trim(),
      payload,
      updatedAt: Date.now(),
    });
    refreshModels();
    setModalType(null);
  };

  const handleLoadModel = (id) => {
    const model = reportStorage.loadModel(id);
    if (!model?.payload) {
      return;
    }

    const { datasetKey: nextDatasetKey, columns: nextColumns, blocks, activeTab: nextTab } =
      model.payload;

    if (nextDatasetKey && nextDatasetKey !== datasetKey) {
      skipDefaultColumnsRef.current = true;
      setDatasetKey(nextDatasetKey);
    } else {
      skipDefaultColumnsRef.current = false;
    }
    if (Array.isArray(nextColumns)) {
      setColumns(nextColumns);
    }
    if (Array.isArray(blocks)) {
      setReportBlocks(blocks);
    }
    if (nextTab) {
      setActiveTab(nextTab);
    }
    setModalType(null);
  };

  const handleDeleteModel = (id) => {
    reportStorage.deleteModel(id);
    refreshModels();
  };

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
        <div className="relatorios-header__actions">
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
          <div className="relatorios-model-actions">
            <button type="button" onClick={openSaveModal}>
              Salvar Modelo
            </button>
            <button type="button" onClick={openLoadModal}>
              Carregar
            </button>
            <button type="button" onClick={openLoadModal}>
              Excluir
            </button>
          </div>
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
            blocks={reportBlocks}
            setBlocks={setReportBlocks}
          />
        )}
      </div>
      {modalType && (
        <div className="relatorios-modal">
          <button
            type="button"
            className="relatorios-modal__overlay"
            aria-label="Fechar modal"
            onClick={() => setModalType(null)}
          />
          <div
            className="relatorios-modal__content"
            role="dialog"
            aria-modal="true"
          >
            {modalType === "save" ? (
              <>
                <h3>Salvar modelo</h3>
                <label className="relatorios-modal__field">
                  <span>Nome do modelo</span>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(event) => setModelName(event.target.value)}
                    placeholder="Ex: Layout padrão"
                  />
                </label>
                <div className="relatorios-modal__actions">
                  <button type="button" onClick={() => setModalType(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveModel}
                    disabled={!modelName.trim()}
                  >
                    Confirmar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Modelos salvos</h3>
                <div className="relatorios-modal__list">
                  {models.length === 0 ? (
                    <p>Nenhum modelo salvo ainda.</p>
                  ) : (
                    models.map((model) => (
                      <div key={model.id} className="relatorios-modal__item">
                        <div>
                          <strong>{model.name}</strong>
                          <span>
                            {model.updatedAt
                              ? new Date(model.updatedAt).toLocaleString()
                              : "Sem data"}
                          </span>
                        </div>
                        <div className="relatorios-modal__item-actions">
                          <button
                            type="button"
                            onClick={() => handleLoadModel(model.id)}
                          >
                            Carregar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteModel(model.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="relatorios-modal__actions">
                  <button type="button" onClick={() => setModalType(null)}>
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
