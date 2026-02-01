import React, { useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import "../../styles/tabelaModerna.css";

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

  if (a.saida_id || a.tipo_saida || a.data_saida || a.motivo || a.observacoes || a.valor) {
    return true;
  }

  return Boolean(a.id);
};

export default function Inativas({
  animais = [], // recebido pronto do Animais.jsx (já inativos formatados)
  onAtualizar, // função do pai para recarregar listas após reativar
  onVerFicha, // opcional: (animal) => void
}) {
  const { fazendaAtualId } = useFazenda();
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);
  const [okMsg, setOkMsg] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  const nowrapEllipsis = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

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
    if (!fazendaAtualId) {
      setOkMsg("⚠️ Selecione uma fazenda antes de reativar.");
      setTimeout(() => setOkMsg(""), 2500);
      return;
    }
    if (!navigator.onLine) {
      setOkMsg("⚠️ Sem conexão. Conecte para reativar o animal.");
      setTimeout(() => setOkMsg(""), 2500);
      return;
    }

    setLoadingId(id);
    try {
      // 1) Volta o animal para ativo
      const { error: erroAtivo } = await withFazendaId(
        supabase.from("animais").update({ ativo: true }),
        fazendaAtualId
      ).eq("id", id);

      if (erroAtivo) throw erroAtivo;

      // 2) Remove a saída vinculada (quando existir)
      if (saida_id) {
        const { error: erroDelete } = await withFazendaId(
          supabase.from("saidas_animais").delete(),
          fazendaAtualId
        ).eq("id", saida_id);

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
    { key: "numero", label: "Número", className: "col-numero", style: nowrapEllipsis },
    { key: "categoria", label: "Categoria", className: "col-categoria", style: nowrapEllipsis },
    { key: "tipoSaida", label: "Tipo de saída", className: "col-tipo", style: nowrapEllipsis },
    { key: "motivo", label: "Motivo", className: "col-motivo", style: nowrapEllipsis },
    { key: "data", label: "Data", className: "st-td-center col-data", style: nowrapEllipsis },
    { key: "valor", label: "Valor", className: "st-td-center col-valor", style: nowrapEllipsis },
    {
      key: "observacoes",
      label: "Observações",
      className: "col-observacoes",
      style: nowrapEllipsis,
    },
    { key: "acoes", label: "Ações", className: "st-td-center col-acoes" },
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

        <div className="st-table-container">
          <div className="st-table-wrap">
            <table
              className="st-table st-table--darkhead"
              onMouseLeave={() => {
                setHoveredRowId(null);
                setHoveredColKey(null);
              }}
            >
              <colgroup>
                <col style={{ width: "10%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr>
                  {colunas.map((coluna) => (
                    <th
                      key={coluna.key}
                      className={`${coluna.className} ${
                        hoveredColKey === coluna.key ? "st-col-hover" : ""
                      }`}
                      onMouseEnter={() => setHoveredColKey(coluna.key)}
                      style={coluna.style}
                    >
                      <span className="st-th-label">{coluna.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {lista.map((a, rIdx) => {
                  const tipoSaida = a.tipo_saida || "—";
                  const motivoSaida = a.motivo || "—";
                  const dataSaida = a.data_saida || null;
                  const valorSaida = a.valor ?? null;
                  const observacoesSaida = a.observacoes || "—";

                  const idRow = a.id ?? `${a.numero}-${rIdx}`;
                  const busy = loadingId === a.id;

                  const rowHover = hoveredRowId === idRow;

                  return (
                    <tr key={idRow} className={rowHover ? "st-row-hover" : ""}>
                      <td
                        className={`${colunas[0].className} ${
                          hoveredColKey === "numero" ? "st-col-hover" : ""
                        } ${rowHover ? "st-row-hover" : ""} ${
                          rowHover && hoveredColKey === "numero"
                            ? "st-cell-hover"
                            : ""
                        }`}
                        style={colunas[0].style}
                        onMouseEnter={() => {
                          setHoveredRowId(idRow);
                          setHoveredColKey("numero");
                        }}
                      >
                        {a.numero || a.brinco || "—"}
                      </td>

                      <td
                        className={`${colunas[1].className} ${
                          hoveredColKey === "categoria" ? "st-col-hover" : ""
                        } ${rowHover ? "st-row-hover" : ""} ${
                          rowHover && hoveredColKey === "categoria"
                            ? "st-cell-hover"
                            : ""
                        }`}
                        style={colunas[1].style}
                        onMouseEnter={() => {
                          setHoveredRowId(idRow);
                          setHoveredColKey("categoria");
                        }}
                      >
                        {a.categoria || a.tipo || "—"}
                      </td>

                      <td
                        className={`${colunas[2].className} ${
                          hoveredColKey === "tipoSaida" ? "st-col-hover" : ""
                        } ${rowHover ? "st-row-hover" : ""} ${
                          rowHover && hoveredColKey === "tipoSaida"
                            ? "st-cell-hover"
                            : ""
                        }`}
                        style={colunas[2].style}
                        onMouseEnter={() => {
                          setHoveredRowId(idRow);
                          setHoveredColKey("tipoSaida");
                        }}
                      >
                        {tipoSaida}
                      </td>

                      <td
                        className={`${colunas[3].className} ${
                          hoveredColKey === "motivo" ? "st-col-hover" : ""
                        } ${rowHover ? "st-row-hover" : ""} ${
                          rowHover && hoveredColKey === "motivo"
                            ? "st-cell-hover"
                            : ""
                        }`}
                        style={colunas[3].style}
                        onMouseEnter={() => {
                          setHoveredRowId(idRow);
                          setHoveredColKey("motivo");
                        }}
                      >
                        {motivoSaida}
                      </td>

                      <td
                        className={`${colunas[4].className} ${
                          hoveredColKey === "data" ? "st-col-hover" : ""
                        } ${rowHover ? "st-row-hover" : ""} ${
                          rowHover && hoveredColKey === "data"
                            ? "st-cell-hover"
                            : ""
                        }`}
                        style={colunas[4].style}
                        onMouseEnter={() => {
                          setHoveredRowId(idRow);
                          setHoveredColKey("data");
                        }}
                      >
                        {fmtData(dataSaida)}
                      </td>

                      <td
                        className={`${colunas[5].className} ${
                          hoveredColKey === "valor" ? "st-col-hover" : ""
                        } ${rowHover ? "st-row-hover" : ""} ${
                          rowHover && hoveredColKey === "valor"
                            ? "st-cell-hover"
                            : ""
                        }`}
                        style={colunas[5].style}
                        onMouseEnter={() => {
                          setHoveredRowId(idRow);
                          setHoveredColKey("valor");
                        }}
                      >
                        {fmtValor(valorSaida)}
                      </td>

                      <td
                        className={`${colunas[6].className} ${
                          hoveredColKey === "observacoes" ? "st-col-hover" : ""
                        } ${rowHover ? "st-row-hover" : ""} ${
                          rowHover && hoveredColKey === "observacoes"
                            ? "st-cell-hover"
                            : ""
                        }`}
                        style={colunas[6].style}
                        onMouseEnter={() => {
                          setHoveredRowId(idRow);
                          setHoveredColKey("observacoes");
                        }}
                      >
                        {observacoesSaida}
                      </td>

                      <td
                        className={`${colunas[7].className} ${
                          hoveredColKey === "acoes" ? "st-col-hover" : ""
                        } ${rowHover ? "st-row-hover" : ""} ${
                          rowHover && hoveredColKey === "acoes"
                            ? "st-cell-hover"
                            : ""
                        }`}
                        onMouseEnter={() => {
                          setHoveredRowId(idRow);
                          setHoveredColKey("acoes");
                        }}
                      >
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
                  <tr className="st-empty">
                    <td colSpan={colunas.length} className="st-td-center">
                      Nenhum animal inativo registrado.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                <tr className="st-summary-row">
                  <td colSpan={colunas.length}>
                    <div className="st-summary-row__content">
                      <span>Total exibidos: {lista.length}</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ✅ ESTE FECHAMENTO ESTAVA FALTANDO NO TEU ARQUIVO */}
      </div>
    </section>
  );
}
