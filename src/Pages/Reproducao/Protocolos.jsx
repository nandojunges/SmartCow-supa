// src/pages/Reproducao/Protocolos.jsx
// Protocolos simplificados (sem backend/localStorage).

export default function Protocolos({ protocolos = [] }) {
  const lista = Array.isArray(protocolos) ? protocolos : [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Protocolos</h2>
        <span className="text-xs font-semibold text-gray-500">{lista.length}</span>
      </div>
      <div className="mt-3 space-y-2 text-sm text-gray-600">
        {lista.length === 0 ? (
          <p>Nenhum protocolo cadastrado.</p>
        ) : (
          <ul className="space-y-1">
            {lista.map((protocolo) => (
              <li key={protocolo.id ?? protocolo.nome} className="flex justify-between">
                <span>{protocolo.nome ?? protocolo.titulo ?? "—"}</span>
                <span className="text-xs text-gray-400">
                  {protocolo.descricao ?? protocolo.tipo ?? ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
