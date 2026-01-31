// src/pages/Reproducao/VisaoGeral/VisaoGeral.jsx
// -----------------------------------------------------------------------------
// Visão Geral (Reprodução) - versão limpa sem backend/localStorage.
// Recebe dados via props e renderiza tabela padrão (tabelaModerna).
// -----------------------------------------------------------------------------

import TabelaReproducao from "../TabelaReproducao.jsx";

export default function VisaoGeral({
  animais = [],
  touros = [],
  inseminadores = [],
  protocolos = [],
  columns = [],
  rows = [],
  renderActions,
}) {
  const totalAnimais = Array.isArray(animais) ? animais.length : 0;
  const totalTouros = Array.isArray(touros) ? touros.length : 0;
  const totalInseminadores = Array.isArray(inseminadores)
    ? inseminadores.length
    : 0;
  const totalProtocolos = Array.isArray(protocolos) ? protocolos.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold text-blue-700">Animais</p>
          <p className="text-2xl font-bold text-blue-900">{totalAnimais}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-700">Touros</p>
          <p className="text-2xl font-bold text-emerald-900">{totalTouros}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700">Inseminadores</p>
          <p className="text-2xl font-bold text-amber-900">
            {totalInseminadores}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-600">Protocolos</p>
          <p className="text-2xl font-bold text-slate-900">{totalProtocolos}</p>
        </div>
      </div>

      <TabelaReproducao
        columns={columns}
        rows={rows}
        renderActions={renderActions}
        emptyMessage="Nenhum animal encontrado…"
      />
    </div>
  );
}
