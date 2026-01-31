import { useEffect, useRef, useState } from "react";

const getColumnWidth = (width) =>
  typeof width === "number" ? `${width}px` : width;

export default function SmartGrid({
  rows,
  columns,
  onChangeCell,
  onResizeColumn,
  onReorderColumns,
}) {
  const resizeState = useRef(null);
  const dragColumnKey = useRef(null);
  const [dragOverKey, setDragOverKey] = useState(null);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!resizeState.current || !onResizeColumn) {
        return;
      }

      const { key, startX, startWidth } = resizeState.current;
      const delta = event.clientX - startX;
      const nextWidth = Math.max(80, startWidth + delta);
      onResizeColumn(key, nextWidth);
    };

    const handleMouseUp = () => {
      resizeState.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onResizeColumn]);

  const startResize = (event, column) => {
    if (!onResizeColumn) {
      return;
    }

    event.preventDefault();
    resizeState.current = {
      key: column.key,
      startX: event.clientX,
      startWidth: column.width ?? 120,
    };
  };

  const handleDragStart = (event, column) => {
    if (!onReorderColumns) {
      return;
    }

    if (event.target.closest(".sc-grid__resize-handle")) {
      event.preventDefault();
      return;
    }

    dragColumnKey.current = column.key;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", column.key);
  };

  const handleDragOver = (event, column) => {
    if (!onReorderColumns || !dragColumnKey.current) {
      return;
    }

    event.preventDefault();
    setDragOverKey(column.key);
  };

  const handleDragLeave = (column) => {
    if (dragOverKey === column.key) {
      setDragOverKey(null);
    }
  };

  const handleDrop = (event, column) => {
    if (!onReorderColumns) {
      return;
    }

    event.preventDefault();
    const fromKey = dragColumnKey.current;
    const toKey = column.key;
    dragColumnKey.current = null;
    setDragOverKey(null);

    if (fromKey && toKey && fromKey !== toKey) {
      onReorderColumns(fromKey, toKey);
    }
  };

  const handleDragEnd = () => {
    dragColumnKey.current = null;
    setDragOverKey(null);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  };

  const handleTextareaInput = (event) => {
    event.target.style.height = "auto";
    event.target.style.height = `${event.target.scrollHeight}px`;
  };

  const getValue = (row, column) => {
    if (column.valueGetter) {
      return column.valueGetter(row);
    }

    return row[column.key];
  };

  return (
    <div className="sc-grid">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: getColumnWidth(column.width) }}
                draggable={Boolean(onReorderColumns)}
                className={
                  dragOverKey === column.key
                    ? "sc-grid__header--drag-over"
                    : undefined
                }
                onDragStart={(event) => handleDragStart(event, column)}
                onDragOver={(event) => handleDragOver(event, column)}
                onDragLeave={() => handleDragLeave(column)}
                onDrop={(event) => handleDrop(event, column)}
                onDragEnd={handleDragEnd}
              >
                <span className="sc-grid__header-label">{column.label}</span>
                <span
                  className="sc-grid__resize-handle"
                  role="separator"
                  aria-label={`Redimensionar ${column.label}`}
                  onMouseDown={(event) => startResize(event, column)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td
                  key={`${row.id}-${column.key}`}
                  style={{ width: getColumnWidth(column.width) }}
                >
                  {column.editable ? (
                    column.key === "anotacoes" ? (
                      <textarea
                        className="sc-grid__notes"
                        value={row[column.key] ?? ""}
                        onChange={(event) =>
                          onChangeCell?.(
                            row.id,
                            column.key,
                            event.target.value
                          )
                        }
                        onInput={handleTextareaInput}
                      />
                    ) : (
                      <input
                        type="text"
                        value={row[column.key] ?? ""}
                        onChange={(event) =>
                          onChangeCell?.(
                            row.id,
                            column.key,
                            event.target.value
                          )
                        }
                        onKeyDown={handleInputKeyDown}
                      />
                    )
                  ) : (
                    getValue(row, column) ?? ""
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
