// src/pages/Reproducao/Relatorios.jsx
// Relatórios simplificados (sem backend/localStorage).

export default function Relatorios({ eventos = [] }) {
  const lista = Array.isArray(eventos) ? eventos : [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-800">Relatórios</h2>
      <p className="mt-2 text-sm text-gray-600">
        Eventos registrados no período: <strong>{lista.length}</strong>
      </p>
      <div className="mt-3 text-xs text-gray-500">
        Os gráficos detalhados serão exibidos quando houver integração de dados.
      </div>
    </div>
  );
}
