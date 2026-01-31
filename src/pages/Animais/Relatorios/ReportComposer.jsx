import { useMemo, useState } from "react";

import BlockActionsChecklist from "./BlockActionsChecklist";
import BlockDataTable from "./BlockDataTable";
import BlockHeaderVisit from "./BlockHeaderVisit";
import BlockProtocolsPlan from "./BlockProtocolsPlan";
import BlockRichText from "./BlockRichText";
import BlockSummaryCards from "./BlockSummaryCards";

const BLOCK_TYPES = [
  { type: "headerVisit", label: "Header" },
  { type: "summaryCards", label: "Summary" },
  { type: "dataTable", label: "Table" },
  { type: "actionsChecklist", label: "Actions" },
  { type: "protocolsPlan", label: "Protocols" },
  { type: "richText", label: "Text" },
];

const createBlock = (type) => {
  const id = `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  switch (type) {
    case "headerVisit":
      return {
        id,
        type,
        data: {
          titulo: "Relatório de Visita Técnica",
          fazenda: "",
          data: "",
          tecnico: "",
        },
      };
    case "summaryCards":
      return { id, type, data: {} };
    case "dataTable":
      return { id, type, data: {} };
    case "actionsChecklist":
      return {
        id,
        type,
        data: {
          items: [
            { id: "a1", text: "Revisar dieta", done: false },
            { id: "a2", text: "Checar protocolo", done: false },
          ],
        },
      };
    case "protocolsPlan":
      return {
        id,
        type,
        data: {
          items: [
            { id: "p1", nome: "Pré-parto", grupo: "Lote 2", observacao: "" },
          ],
        },
      };
    case "richText":
      return {
        id,
        type,
        data: { text: "" },
      };
    default:
      return { id, type, data: {} };
  }
};

export const createDefaultBlocks = () => [
  createBlock("headerVisit"),
  createBlock("summaryCards"),
  createBlock("dataTable"),
  createBlock("actionsChecklist"),
  createBlock("protocolsPlan"),
  createBlock("richText"),
];

export default function ReportComposer({
  datasetKey,
  rows,
  columns,
  blocks,
  setBlocks,
}) {
  const [selectedType, setSelectedType] = useState(BLOCK_TYPES[0].type);
  const [internalBlocks, setInternalBlocks] = useState(() =>
    createDefaultBlocks()
  );
  const resolvedBlocks = blocks ?? internalBlocks;
  const updateBlocks = setBlocks ?? setInternalBlocks;

  const blockLabels = useMemo(
    () =>
      BLOCK_TYPES.reduce((acc, item) => {
        acc[item.type] = item.label;
        return acc;
      }, {}),
    []
  );

  const handleAddBlock = () => {
    updateBlocks((prevBlocks) => [...prevBlocks, createBlock(selectedType)]);
  };

  const handleMoveBlock = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= resolvedBlocks.length) {
      return;
    }

    updateBlocks((prevBlocks) => {
      const nextBlocks = [...prevBlocks];
      const [moved] = nextBlocks.splice(index, 1);
      nextBlocks.splice(targetIndex, 0, moved);
      return nextBlocks;
    });
  };

  const handleRemoveBlock = (id) => {
    updateBlocks((prevBlocks) => prevBlocks.filter((block) => block.id !== id));
  };

  const handleUpdateBlock = (id, data) => {
    updateBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === id ? { ...block, data } : block
      )
    );
  };

  const renderBlock = (block) => {
    switch (block.type) {
      case "headerVisit":
        return (
          <BlockHeaderVisit
            data={block.data}
            onChange={(data) => handleUpdateBlock(block.id, data)}
          />
        );
      case "summaryCards":
        return <BlockSummaryCards rows={rows} datasetKey={datasetKey} />;
      case "dataTable":
        return <BlockDataTable rows={rows} columns={columns} />;
      case "actionsChecklist":
        return (
          <BlockActionsChecklist
            data={block.data}
            onChange={(data) => handleUpdateBlock(block.id, data)}
          />
        );
      case "protocolsPlan":
        return (
          <BlockProtocolsPlan
            data={block.data}
            onChange={(data) => handleUpdateBlock(block.id, data)}
          />
        );
      case "richText":
        return (
          <BlockRichText
            data={block.data}
            onChange={(data) => handleUpdateBlock(block.id, data)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="report-composer">
      <div>
        <h2>Relatório Final</h2>
      </div>
      <div className="report-composer__actions">
        <select
          value={selectedType}
          onChange={(event) => setSelectedType(event.target.value)}
        >
          {BLOCK_TYPES.map((block) => (
            <option key={block.type} value={block.type}>
              {block.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={handleAddBlock}>
          Adicionar bloco
        </button>
        <button type="button" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>
      <div className="report-composer__preview">
        {resolvedBlocks.map((block, index) => (
          <div key={block.id} className="report-block">
            <div className="report-block__header">
              <h4>{blockLabels[block.type]}</h4>
              <div className="report-block__actions">
                <button
                  type="button"
                  onClick={() => handleMoveBlock(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveBlock(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveBlock(block.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
            {renderBlock(block)}
          </div>
        ))}
      </div>
    </div>
  );
}
