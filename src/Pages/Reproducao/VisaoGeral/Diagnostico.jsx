// src/pages/Reproducao/VisaoGeral/Diagnostico.jsx
// Componente simplificado (sem backend/localStorage).

export default function Diagnostico({ open = false, onClose }) {
  if (!open) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          Registrar diagnóstico
        </h3>
        <button
          type="button"
          className="text-xs font-semibold text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Formulário simplificado aguardando integração.
      </p>
    </div>
  );
}
