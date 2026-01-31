// src/pages/Reproducao/Cadastro.jsx
// Cadastro simplificado (sem backend/localStorage).

export default function Cadastro({ touros = [], inseminadores = [] }) {
  const listaTouros = Array.isArray(touros) ? touros : [];
  const listaInseminadores = Array.isArray(inseminadores) ? inseminadores : [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Touros</h2>
          <span className="text-xs font-semibold text-gray-500">
            {listaTouros.length}
          </span>
        </div>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          {listaTouros.length === 0 ? (
            <p>Nenhum touro cadastrado.</p>
          ) : (
            <ul className="space-y-1">
              {listaTouros.map((touro) => (
                <li key={touro.id ?? touro.nome} className="flex justify-between">
                  <span>{touro.nome ?? touro.codigo ?? "—"}</span>
                  <span className="text-xs text-gray-400">
                    {touro.raca ?? touro.origem ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Inseminadores</h2>
          <span className="text-xs font-semibold text-gray-500">
            {listaInseminadores.length}
          </span>
        </div>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          {listaInseminadores.length === 0 ? (
            <p>Nenhum inseminador cadastrado.</p>
          ) : (
            <ul className="space-y-1">
              {listaInseminadores.map((inseminador) => (
                <li
                  key={inseminador.id ?? inseminador.nome}
                  className="flex justify-between"
                >
                  <span>{inseminador.nome ?? "—"}</span>
                  <span className="text-xs text-gray-400">
                    {inseminador.telefone ?? inseminador.registro ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
