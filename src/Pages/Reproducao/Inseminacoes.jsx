// src/pages/Reproducao/Inseminacoes.jsx
// Inseminações simplificadas (sem backend/localStorage).

export default function Inseminacoes({ eventos = [] }) {
  const lista = Array.isArray(eventos) ? eventos : [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Inseminações</h2>
        <span className="text-xs font-semibold text-gray-500">{lista.length}</span>
      </div>
      <div className="mt-3 space-y-2 text-sm text-gray-600">
        {lista.length === 0 ? (
          <p>Nenhuma inseminação registrada.</p>
        ) : (
          <ul className="space-y-1">
            {lista.map((evento) => (
              <li key={evento.id ?? evento.data} className="flex justify-between">
                <span>{evento.animal ?? evento.animal_nome ?? "—"}</span>
                <span className="text-xs text-gray-400">
                  {evento.data ?? evento.data_evento ?? ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
