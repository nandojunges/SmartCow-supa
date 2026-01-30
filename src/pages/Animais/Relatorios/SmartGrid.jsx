export default function SmartGrid({ rows, columns, onChangeCell }) {
  return (
    <div className="sc-grid">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ width: column.width }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={`${row.id}-${column.key}`}>
                  {column.editable ? (
                    <input
                      type="text"
                      value={row[column.key] ?? ""}
                      onChange={(event) =>
                        onChangeCell(row.id, column.key, event.target.value)
                      }
                    />
                  ) : (
                    row[column.key]
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
