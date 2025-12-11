// CODEX: Ajustar ESTE arquivo Inativas.jsx para:
// 1. Usar o objeto vindo de Animais.jsx (animaisInativos) já com os campos:
//      id, numero, brinco, saida_id, tipo_saida, motivo_saida, data_saida, observacao_saida, valor_saida.
// 2. Garantir que a coluna "Observações" exiba corretamente o texto salvo em banco,
//    tentando nestas chaves, na ordem:
//      a.observacao_saida ?? a.observacao ?? a.observacoesSaida ?? a.observacoes_saida ?? "—"
// 3. Manter o layout de tabela com a classe "tabela-padrao", colunas:
//      "Número", "Categoria", "Tipo de Saída", "Motivo", "Data", "Valor", "Observações", "Ações".
// 4. A função "isInativo(a)" deve simplesmente garantir que só entrem animais realmente inativos, por exemplo:
//      - se (a.status ?? "").toLowerCase() === "inativo" → true
//      - se tiver qualquer um: a.tipo_saida, a.data_saida, a.motivo_saida, a.observacao_saida → true
//      - caso contrário → false.
// 5. A função "reativar" deve RECEBER o objeto do animal inteiro (não apenas o id), por exemplo:
//      const reativar = async (animal) => { ... }
//    e dentro dela:
//      - pegar const { id, saida_id } = animal;
//      - se não houver id, retornar.
// 6. No fluxo de reativação:
//      - Atualizar o animal para ativo:
//          supabase
//            .from("animais")
//            .update({ ativo: true })
//            .eq("id", id);
//      - SE existir saida_id (não nulo), deletar apenas essa linha da tabela saidas_animais:
//          supabase
//            .from("saidas_animais")
//            .delete()
//            .eq("id", saida_id);
//      - Em caso de sucesso, setar mensagem "✅ Animal reativado." e chamar onAtualizar?.()
//        para que o componente pai recarregue as listas de ativos/inativos.
// 7. O botão "Reativar" na tabela deve chamar reativar(a), e não reativar(a.id).
// 8. Manter o restante do layout (botões, classes, etc.) exatamente como está.
import React, { useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/* ===== helpers ===== */
const fmtData = (d, fallback = "—") => {
  if (!d) return fallback;
  if (typeof d === "string" && d.includes("/")) return d; // já está dd/mm/aaaa
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("pt-BR");
};

const fmtValor = (v) => {
  if (v == null || v === "") return "—";
  const num =
    typeof v === "number"
      ? v
      : parseFloat(String(v).replace(/[^0-9,.-]/g, "").replace(",", "."));
  return Number.isNaN(num)
    ? v
    : num.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
};

// segurança extra: garante que só inativos entrem na lista
const isInativo = (a) => {
  if (!a) return false;
  if ((a.status ?? "").toLowerCase() === "inativo") return true;
  if (
    a.tipo_saida ||
    a.data_saida ||
    a.motivo_saida ||
    a.observacao_saida
  )
    return true;
  return false;
};

export default function Inativas({
  animais = [],   // recebido pronto do Animais.jsx (já inativos formatados)
  onAtualizar,   // função do pai para recarregar listas após reativar
  onVerFicha,    // opcional: (animal) => void
}) {
  const [hoverCol, setHoverCol] = useState(null);
  const [okMsg, setOkMsg] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  const lista = useMemo(
    () => (Array.isArray(animais) ? animais : []).filter(isInativo),
    [animais]
  );

  const doVerFicha = (animal) => {
    if (typeof onVerFicha === "function") {
      onVerFicha(animal);
    }
  };

  const reativar = async (animal) => {
    const { id, saida_id } = animal || {};
    if (!id) return;

    setLoadingId(id);
    try {
      // 1) Volta o animal para ativo
      const { error: erroAtivo } = await supabase
        .from("animais")
        .update({ ativo: true })
        .eq("id", id);

      if (erroAtivo) throw erroAtivo;

      // 2) Remove a saída vinculada (quando existir)
      if (saida_id) {
        const { error: erroDelete } = await supabase
          .from("saidas_animais")
          .delete()
          .eq("id", saida_id);

        if (erroDelete) throw erroDelete;
      }

      setOkMsg("✅ Animal reativado.");
      // pede para o componente pai recarregar tudo (ativos + inativos)
      onAtualizar?.();
    } catch (e) {
      console.error("Erro ao reativar animal:", e);
      setOkMsg("❌ Falha ao reativar no servidor.");
    } finally {
      setLoadingId(null);
      setTimeout(() => setOkMsg(""), 2500);
    }
  };

  const colunas = [
    "Número",
    "Categoria",
    "Tipo de Saída",
    "Motivo",
    "Data",
    "Valor",
    "Observações",
    "Ações",
  ];

  return (
    <section className="w-full py-6 font-sans">
      <div className="px-2 md:px-4 lg:px-6">
        <h2 className="text-xl font-bold mb-3 text-[#1e3a8a]">
          ❌ Animais Inativos
        </h2>

        {!!okMsg && (
          <div className="mb-3 text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded">
            {okMsg}
          </div>
        )}

        <div style={{ width: "100%", overflowX: "auto" }}>
          <table className="tabela-padrao">
            <thead>
              <tr>
                {colunas.map((c, i) => (
                  <th
                    key={c}
                    className={hoverCol === i ? "coluna-hover" : ""}
                    onMouseEnter={() => setHoverCol(i)}
                    onMouseLeave={() => setHoverCol(null)}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {lista.map((a, rIdx) => {
                const tipoSaida = a.tipo_saida || "—";
                const motivoSaida = a.motivo_saida || "—";
                const dataSaida = a.data_saida || null;
                const valorSaida = a.valor_saida ?? a.valor_venda ?? null;

                // pega observação independente do nome da chave
                const observacoesSaida =
                  a.observacao_saida ??
                  a.observacao ??
                  a.observacoesSaida ??
                  a.observacoes_saida ??
                  "—";

                const idRow = a.id ?? `${a.numero}-${rIdx}`;
                const busy = loadingId === a.id;

                return (
                  <tr key={idRow}>
                    <td>{a.numero || a.brinco || "—"}</td>
                    <td>{a.categoria || a.tipo || "—"}</td>
                    <td>{tipoSaida}</td>
                    <td className="coluna-limitada">{motivoSaida}</td>
                    <td>{fmtData(dataSaida)}</td>
                    <td>{fmtValor(valorSaida)}</td>
                    <td className="coluna-limitada">{observacoesSaida}</td>
                    <td className="coluna-acoes">
                      <div className="botoes-tabela">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-md border border-[#1e3a8a]/40 text-[#1e3a8a] text-sm hover:border-[#1e3a8a] transition-colors"
                          onClick={() => doVerFicha(a)}
                          title="Ver ficha do animal"
                        >
                          📋 Ver Ficha
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-md border text-emerald-700 text-sm transition-colors ${
                            busy
                              ? "opacity-60 cursor-wait border-emerald-700/40"
                              : "border-emerald-700/40 hover:border-emerald-700"
                          }`}
                          onClick={() => !busy && reativar(a)}
                          disabled={busy}
                          title="Reativar animal"
                        >
                          🔁 {busy ? "Reativando…" : "Reativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {lista.length === 0 && (
                <tr>
                  <td colSpan={colunas.length}>
                    <div className="text-center text-gray-600 py-6">
                      Nenhum animal inativo registrado.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
