export default function ReportComposer({ totalAnimals }) {
  return (
    <div className="report-composer">
      <div>
        <h2>Relatório Final</h2>
      </div>
      <div className="report-composer__actions">
        <button type="button">Adicionar Bloco</button>
        <button type="button" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>
      <div className="report-composer__preview">
        <strong>Visita Técnica — (MVP)</strong>
        <span>Total de animais: {totalAnimals}</span>
      </div>
    </div>
  );
}
