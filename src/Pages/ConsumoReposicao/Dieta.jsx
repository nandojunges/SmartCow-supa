// src/pages/ConsumoReposicao/Dieta.jsx
// ✅ Principal — tabela, totais, modais (Supabase)
// - Carrega dietas do banco ao entrar
// - Editar busca itens em dietas_itens para preencher ModalDieta
// - Excluir remove do banco e recarrega

import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/tabelamoderna.css";
import "../../styles/botoes.css";

import { supabase } from "../../lib/supabaseClient";
import ModalDieta from "./ModalDieta";

const STICKY_OFFSET = 48;

function dateOnlyToISO(d) {
  // d vem como "YYYY-MM-DD" (DATE do Postgres)
  if (!d) return new Date().toISOString();
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
}

export default function Dieta({ onCountChange }) {
  const [dietas, setDietas] = useState([]);
  const [hoverCol, setHoverCol] = useState(null);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [modal, setModal] = useState({ open: false, dieta: null });
  const [excluir, setExcluir] = useState({ open: false, dieta: null });

  useEffect(() => onCountChange?.(dietas.length), [dietas.length, onCountChange]);

  const colunas = [
  "Lote",
  "Nº de Vacas",
  "Custo Vaca/dia",
  "Custo Total",
  "Custo Vaca/mês",
  "Data",
  "Ação",
];

  const totais = useMemo(() => {
    const vacas = dietas.reduce((a, d) => a + Number(d.numVacas || 0), 0);
    const total = dietas.reduce((a, d) => a + Number(d.custoTotal || 0), 0);
    return {
      vacas,
      total,
      porVacaDia: vacas ? total / vacas : 0,
      porVacaMes: vacas ? (total / vacas) * 30 : 0,
    };
  }, [dietas]);

  /** ===================== LOAD DIETAS (BANCO) ===================== */
  const loadDietas = useCallback(async () => {
    setLoading(true);
    setErro("");

    const { data: sess } = await supabase.auth.getSession();
    const uid = sess?.session?.user?.id;

    if (!uid) {
      setDietas([]);
      setLoading(false);
      setErro("Sessão expirada. Faça login novamente.");
      return;
    }

    const { data, error } = await supabase
      .from("dietas")
      .select(
        `
        id,
        lote_id,
        dia,
        numvacas_snapshot,
        custo_total,
        custo_vaca_dia,
        observacao,
        created_at,
        lotes ( nome )
      `
      )
      .eq("user_id", uid) // ajuda mesmo com RLS
      .order("dia", { ascending: false });

    if (error) {
      console.error("Erro loadDietas:", error);
      setErro(error?.message || "Erro ao carregar dietas.");
      setDietas([]);
      setLoading(false);
      return;
    }

    const list = (data || []).map((r) => ({
      id: r.id,
      lote_id: r.lote_id,
      lote: r?.lotes?.nome || "—",
      numVacas: Number(r.numvacas_snapshot || 0),
      custoTotal: Number(r.custo_total || 0),
      custoVacaDia: Number(r.custo_vaca_dia || 0),
      // para tabela e ordenação
      data: dateOnlyToISO(r.dia),
      // para exibir exatamente o que está no banco
      dia_db: r.dia,
      observacao: r.observacao || "",
    }));

    setDietas(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDietas();
  }, [loadDietas]);

  /** ===================== NOVO / EDITAR ===================== */
  const abrirNovo = () =>
    setModal({
      open: true,
      dieta: {
        id: null,
        lote_id: "",
        lote_nome: "",
        numVacas: 0,
        ingredientes: [{ produto_id: "", quantidade: "" }],
        data: new Date().toISOString(),
        observacao: "",
      },
    });

  const abrirEditar = useCallback(
    async (dietaRow) => {
      setLoading(true);
      setErro("");

      try {
        // busca itens para preencher o modal
        const { data: itens, error: eItens } = await supabase
          .from("dietas_itens")
          .select("produto_id, quantidade_kg_vaca")
          .eq("dieta_id", dietaRow.id)
          .order("created_at", { ascending: true });

        if (eItens) throw eItens;

        const ingredientes = (itens || []).map((it) => ({
          produto_id: it.produto_id,
          quantidade: String(it.quantidade_kg_vaca ?? ""),
        }));

        setModal({
          open: true,
          dieta: {
            id: dietaRow.id,
            lote_id: dietaRow.lote_id,
            lote_nome: dietaRow.lote,
            numVacas: dietaRow.numVacas,
            data: dietaRow.data, // ISO
            observacao: dietaRow.observacao || "",
            ingredientes: ingredientes.length ? ingredientes : [{ produto_id: "", quantidade: "" }],
          },
        });
      } catch (err) {
        console.error("Erro abrirEditar (itens):", err);
        setErro(err?.message || "Erro ao abrir edição.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /** ===================== SALVOU NO MODAL ===================== */
  const salvar = useCallback(async () => {
    // ModalDieta já salvou no banco; aqui só recarrega a tabela
    setModal({ open: false, dieta: null });
    await loadDietas();
  }, [loadDietas]);

  /** ===================== EXCLUIR ===================== */
  const pedirExclusao = (dietaRow) => setExcluir({ open: true, dieta: dietaRow });

  const confirmarExclusao = useCallback(async () => {
    const d = excluir.dieta;
    if (!d?.id) {
      setExcluir({ open: false, dieta: null });
      return;
    }

    setLoading(true);
    setErro("");

    try {
      // primeiro itens (caso não tenha FK cascade)
      const { error: eItens } = await supabase.from("dietas_itens").delete().eq("dieta_id", d.id);
      if (eItens) throw eItens;

      const { error: eDiet } = await supabase.from("dietas").delete().eq("id", d.id);
      if (eDiet) throw eDiet;

      setExcluir({ open: false, dieta: null });
      await loadDietas();
    } catch (err) {
      console.error("Erro excluir dieta:", err);
      setErro(err?.message || "Erro ao excluir dieta.");
      setExcluir({ open: false, dieta: null });
    } finally {
      setLoading(false);
    }
  }, [excluir.dieta, loadDietas]);

  return (
    <section className="w-full py-6">
      <div className="px-2 md:px-4 lg:px-6">
        <div className="mb-4 flex justify-between">
          <button className="botao-acao" onClick={abrirNovo} disabled={loading}>
            + Nova Dieta
          </button>
        </div>

        {erro ? (
          <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#991b1b", fontWeight: 800 }}>
            {erro}
          </div>
        ) : null}

        <table className="tabela-padrao">
          <thead>
            <tr>
              {colunas.map((c, i) => (
                <th
                  key={c}
                  style={{ top: STICKY_OFFSET }}
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
            {loading ? (
              <tr>
                <td colSpan={colunas.length} className="text-center py-6">
                  Carregando...
                </td>
              </tr>
            ) : dietas.length === 0 ? (
              <tr>
                <td colSpan={colunas.length} className="text-center py-6">
                  Nenhuma dieta cadastrada.
                </td>
              </tr>
            ) : (
              dietas.map((d) => (
                <tr key={d.id}>
                  <td className={hoverCol === 0 ? "coluna-hover" : ""}>{d.lote}</td>

                  <td className={hoverCol === 1 ? "coluna-hover" : ""} align="center">
                    {d.numVacas}
                  </td>

                  <td className={hoverCol === 2 ? "coluna-hover" : ""} align="center">
                    {formatBRL(d.custoTotal)}
                  </td>

                  <td className={hoverCol === 3 ? "coluna-hover" : ""} align="center">
                    {formatBRL(d.custoVacaDia)}
                  </td>

                  <td className={hoverCol === 4 ? "coluna-hover" : ""} align="center">
                    {formatBRL(Number(d.custoVacaDia || 0) * 30)}
                  </td>

                  <td className={hoverCol === 5 ? "coluna-hover" : ""} align="center">
                    {formatDateBR(d.data)}
                  </td>

                  <td className="coluna-acoes">
                    <div className="botoes-tabela">
                      <button className="botao-editar" onClick={() => abrirEditar(d)} disabled={loading}>
                        Editar
                      </button>
                      <button className="botao-excluir" onClick={() => pedirExclusao(d)} disabled={loading}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          <tfoot>
            <tr>
              <td>
                <strong>Totais</strong>
              </td>
              <td align="center">{totais.vacas}</td>
              <td align="center">{formatBRL(totais.total)}</td>
              <td align="center">{formatBRL(totais.porVacaDia)}</td>
              <td align="center">{formatBRL(totais.porVacaMes)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>

        {modal.open && (
          <ModalDieta
            value={modal.dieta}
            onCancel={() => setModal({ open: false, dieta: null })}
            onSave={salvar}
          />
        )}

        {excluir.open && (
          <Confirmacao
            titulo="Excluir dieta"
            texto={`Deseja excluir a dieta do lote "${excluir.dieta?.lote || "—"}" na data ${formatDateBR(excluir.dieta?.data)}?`}
            onCancel={() => setExcluir({ open: false, dieta: null })}
            onConfirm={confirmarExclusao}
          />
        )}
      </div>
    </section>
  );
}

/* helpers simples */
function formatBRL(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDateBR(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

/* modal confirmação simples */
function Confirmacao({ titulo, texto, onCancel, onConfirm }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: 14,
      }}
      onMouseDown={onCancel}
    >
      <div
        style={{
          width: 520,
          maxWidth: "96vw",
          background: "#fff",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
          fontFamily: "Poppins, sans-serif",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>{titulo}</div>
        <div style={{ color: "#334155", fontWeight: 700, marginBottom: 14 }}>{texto}</div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="botao-cancelar" onClick={onCancel}>
            Cancelar
          </button>
          <button className="botao-excluir" onClick={onConfirm}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
