const buildCounts = (rows, key) =>
  rows.reduce((acc, row) => {
    const value = row[key] ?? "Sem";
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

export default function BlockSummaryCards({ rows }) {
  const total = rows.length;
  const byCategoria = buildCounts(rows, "categoria");
  const byGrupo = buildCounts(rows, "grupo");

  return (
    <div className="report-block__grid">
      <div className="report-block__list">
        <strong>Total de animais</strong>
        <span>{total}</span>
      </div>
      <div className="report-block__list">
        <strong>Por categoria</strong>
        {Object.entries(byCategoria).map(([categoria, count]) => (
          <span key={categoria}>
            {categoria}: {count}
          </span>
        ))}
      </div>
      <div className="report-block__list">
        <strong>Por grupo</strong>
        {Object.entries(byGrupo).map(([grupo, count]) => (
          <span key={grupo}>
            {grupo}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}
