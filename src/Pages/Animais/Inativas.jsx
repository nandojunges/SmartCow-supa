// src/Pages/Animais/Inativas.jsx
import React, { useMemo } from "react";

/**
 * Layout simples de Inativas:
 * - usa apenas os dados recebidos via props.animais
 * - não faz chamadas de API
 * - só mostra uma tabela de exemplo
 */
export default function Inativas({
  animais = [],
  onAtualizar, // reservado para futuro
  onVerFicha,  // callback para abrir ficha se quiser
}) {
  // Se tiver algum campo de status, filtra. Senão, usa tudo mesmo só pra layout.
  const inativos = useMemo(() => {
    if (!Array.isArray(animais)) return [];
    return animais.filter((a) => {
      const st = String(a?.status ?? "").toLowerCase();
      if (st === "inativo") return true;
      if (a?.tipo_saida || a?.motivo_saida || a?.data_saida) return true;
      return false;
    });
  }, [animais]);

  return (
    <section className="w-full h-full px-4 py-6 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6">
        <header className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-blue-900">
              Animais Inativos
            </h1>
            <p className="text-sm text-gray-500">
              Lista apenas para visualização de layout. Funcionalidades serão adicionadas depois.
            </p>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full border-separate [border-spacing:0_6px] text-sm text-gray-800">
            <thead>
              <tr>
                <th className="bg-blue-50 text-blue-900 font-semibold px-3 py-2 text-left rounded-l-lg">
                  Número
                </th>
                <th className="bg-blue-50 text-blue-900 font-semibold px-3 py-2 text-left">
                  Brinco
                </th>
                <th className="bg-blue-50 text-blue-900 font-semibold px-3 py-2 text-left">
                  Motivo saída
                </th>
                <th className="bg-blue-50 text-blue-900 font-semibold px-3 py-2 text-left">
                  Data saída
                </th>
                <th className="bg-blue-50 text-blue-900 font-semibold px-3 py-2 text-left rounded-r-lg">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {inativos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-gray-400 py-6"
                  >
                    Nenhum animal inativo para exibir (layout de teste).
                  </td>
                </tr>
              ) : (
                inativos.map((a, idx) => (
                  <tr
                    key={a.id ?? a.numero ?? a.brinco ?? idx}
                    className="bg-white shadow-xs hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-3 py-2 border-b border-gray-100">
                      {a.numero ?? "—"}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      {a.brinco ?? "—"}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      {a.motivo_saida ?? a.motivo ?? "—"}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      {a.data_saida ?? "—"}
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      <button
                        type="button"
                        onClick={() =>
                          onVerFicha && onVerFicha(a)
                        }
                        className="text-blue-700 border border-blue-200 hover:border-blue-500 hover:bg-blue-50 rounded-md px-3 py-1 text-xs font-semibold"
                      >
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          * Este componente está apenas com layout estático (sem lógica de banco).{" "}
          Depois conectamos filtros, paginação e relatórios.
        </p>
      </div>
    </section>
  );
}
