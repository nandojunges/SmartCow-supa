import { useState } from "react";
import "../../../styles/tabelaModerna.css";

export default function TabelaReproducao({
  columns = [],
  rows = [],
  renderActions,
  emptyMessage = "Nenhum animal encontrado…",
}) {
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);

  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="st-table-container">
      <div className="st-table-wrap">
        <table
          className="st-table st-table--darkhead"
          onMouseLeave={() => {
            setHoveredRowId(null);
            setHoveredColKey(null);
          }}
        >
          <thead>
            <tr>
              {safeColumns.map((column) => (
                <th
                  key={column.key}
                  className={column.className}
                  onMouseEnter={() => setHoveredColKey(column.key)}
                >
                  <span className="st-th-label">{column.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeRows.length === 0 ? (
              <tr>
                <td
                  colSpan={safeColumns.length || 1}
                  style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              safeRows.map((row, index) => {
                const rowId = row?.id ?? row?.animal_id ?? index;
                const rowHover = hoveredRowId === rowId;

                return (
                  <tr
                    key={rowId}
                    className={rowHover ? "st-row-hover" : ""}
                    onMouseEnter={() => setHoveredRowId(rowId)}
                  >
                    {safeColumns.map((column) => {
                      const colHover = hoveredColKey === column.key;
                      const cellHover = rowHover && colHover;
                      const accessor =
                        typeof column.accessor === "function"
                          ? column.accessor
                          : (item) => item?.[column.key];
                      const cellValue =
                        column.key === "actions" && renderActions
                          ? renderActions(row)
                          : accessor(row);

                      return (
                        <td
                          key={`${rowId}-${column.key}`}
                          className={[
                            column.className,
                            colHover ? "st-col-hover" : "",
                            rowHover ? "st-row-hover" : "",
                            cellHover ? "st-cell-hover" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onMouseEnter={() => setHoveredColKey(column.key)}
                        >
                          {cellValue ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
