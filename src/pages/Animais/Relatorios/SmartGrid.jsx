import { useEffect, useRef } from "react";

const getColumnWidth = (width) =>
  typeof width === "number" ? `${width}px` : width;

export default function SmartGrid({
  rows,
  columns,
  onChangeCell,
  onResizeColumn,
}) {
  const resizeState = useRef(null);

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
                    <input
                      type="text"
                      value={row[column.key] ?? ""}
                      onChange={(event) =>
                        onChangeCell?.(row.id, column.key, event.target.value)
                      }
                    />
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
