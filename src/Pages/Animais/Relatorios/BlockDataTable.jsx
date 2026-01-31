const getValue = (row, column) => {
  if (column.valueGetter) {
    return column.valueGetter(row);
  }

  return row[column.key];
};

export default function BlockDataTable({ rows, columns }) {
  return (
    <div>
      <table className="report-block__table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={`${row.id}-${column.key}`}>
                  {getValue(row, column) ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
