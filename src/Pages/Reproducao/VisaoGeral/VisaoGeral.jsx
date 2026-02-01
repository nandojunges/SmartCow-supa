// src/pages/Reproducao/VisaoGeral/VisaoGeral.jsx
// -----------------------------------------------------------------------------
// Visão Geral (Reprodução) - versão limpa sem backend/localStorage.
// Recebe dados via props e renderiza resumo.
// -----------------------------------------------------------------------------

export default function VisaoGeral({
  animais = [],
  touros = [],
  inseminadores = [],
  protocolos = [],
}) {
  const animaisLista = Array.isArray(animais) ? animais : [];
  const protocolosLista = Array.isArray(protocolos) ? protocolos : [];
  const tourosLista = Array.isArray(touros) ? touros : [];
  const inseminadoresLista = Array.isArray(inseminadores)
    ? inseminadores
    : [];

  const cards = [
    { label: "Animais", value: animaisLista.length },
    { label: "Protocolos", value: protocolosLista.length },
    { label: "Touros", value: tourosLista.length },
    { label: "Inseminadores", value: inseminadoresLista.length },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-800">Visão geral</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <p className="text-xs font-semibold uppercase text-slate-500">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-800">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
