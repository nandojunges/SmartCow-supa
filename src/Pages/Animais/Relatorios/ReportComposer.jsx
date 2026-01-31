import { useMemo, useRef, useState } from "react";

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
  const dragBlockId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);
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

  const handleReorderBlocks = (fromId, toId) => {
    updateBlocks((prevBlocks) => {
      const fromIndex = prevBlocks.findIndex((block) => block.id === fromId);
      const toIndex = prevBlocks.findIndex((block) => block.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return prevBlocks;
      }

      const nextBlocks = [...prevBlocks];
      const [moved] = nextBlocks.splice(fromIndex, 1);
      nextBlocks.splice(toIndex, 0, moved);
      return nextBlocks;
    });
  };

  const handleUpdateBlock = (id, data) => {
    updateBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === id ? { ...block, data } : block
      )
    );
  };

  const handleDragStart = (event, blockId) => {
    dragBlockId.current = blockId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
  };

  const handleDragOver = (event, blockId) => {
    if (!dragBlockId.current) {
      return;
    }

    event.preventDefault();
    setDragOverId(blockId);
  };

  const handleDragLeave = (blockId) => {
    if (dragOverId === blockId) {
      setDragOverId(null);
    }
  };

  const handleDrop = (event, blockId) => {
    event.preventDefault();
    const fromId = dragBlockId.current;
    dragBlockId.current = null;
    setDragOverId(null);

    if (!fromId || fromId === blockId) {
      return;
    }

    handleReorderBlocks(fromId, blockId);
  };

  const handleDragEnd = () => {
    dragBlockId.current = null;
    setDragOverId(null);
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

  const headerBlock = resolvedBlocks.find(
    (block) => block.type === "headerVisit"
  );
  const headerData = headerBlock?.data ?? {};
  const title = headerData.titulo?.trim() || "Relatório de Visita Técnica";
  const dateValue = headerData.data
    ? new Date(headerData.data)
    : new Date();
  const dateLabel = Number.isNaN(dateValue.getTime())
    ? new Date().toLocaleDateString("pt-BR")
    : dateValue.toLocaleDateString("pt-BR");
  const technicianLabel = headerData.tecnico?.trim() || "—";

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
        <div className="report-composer__page-header">
          <div>
            <strong className="report-composer__page-title">{title}</strong>
            <div className="report-composer__page-meta">
              <span>Data: {dateLabel}</span>
              <span>Técnico: {technicianLabel}</span>
            </div>
          </div>
        </div>
        {resolvedBlocks.map((block, index) => (
          <div
            key={block.id}
            className={`report-block report-block--${block.type} ${
              dragOverId === block.id ? "is-drag-over" : ""
            }`}
            draggable
            onDragStart={(event) => handleDragStart(event, block.id)}
            onDragOver={(event) => handleDragOver(event, block.id)}
            onDragLeave={() => handleDragLeave(block.id)}
            onDrop={(event) => handleDrop(event, block.id)}
            onDragEnd={handleDragEnd}
          >
            <div className="report-block__header">
              <h4>{blockLabels[block.type]}</h4>
              <div className="report-block__actions">
                <button
                  type="button"
                  className="sc-btn-chip"
                  onClick={() => handleMoveBlock(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="sc-btn-chip"
                  onClick={() => handleMoveBlock(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="sc-btn-chip"
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
