// src/pages/Reproducao/VisaoGeral/VisaoGeral.jsx
// -----------------------------------------------------------------------------
// Visão Geral (Reprodução) - versão limpa sem backend/localStorage.
// Recebe dados via props e renderiza tabela padrão (tabelaModerna).
// -----------------------------------------------------------------------------

import TabelaReproducao from "../components/TabelaReproducao.jsx";

export default function VisaoGeral({
  animais = [],
  touros = [],
  inseminadores = [],
  protocolos = [],
  columns = [],
  rows = [],
  renderActions,
}) {
  return (
    <TabelaReproducao
      columns={columns}
      rows={rows}
      renderActions={renderActions}
      emptyMessage="Nenhum animal encontrado…"
    />
  );
}
