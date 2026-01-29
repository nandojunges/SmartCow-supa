// src/pages/ConsumoReposicao/Dieta.jsx
// ✅ Principal — tabela, totais, modais (Supabase)
// - Carrega dietas do banco ao entrar
// - Editar busca itens em dietas_itens para preencher ModalDieta
// - Excluir remove do banco e recarrega

import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/tabelaModerna.css";
import "../../styles/botoes.css";

import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import { enqueue, kvGet, kvSet } from "../../offline/localDB";
import ModalDieta from "./ModalDieta";

const CACHE_DIETA_KEY = "cache:dieta:list";

function dateOnlyToISO(d) {
  // d vem como "YYYY-MM-DD" (DATE do Postgres)
  if (!d) return new Date().toISOString();
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
}

export default function Dieta({ onCountChange }) {
  const { fazendaAtualId } = useFazenda();
  const [dietas, setDietas] = useState([]);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [openPopoverKey, setOpenPopoverKey] = useState(null);
  const [filtros, setFiltros] = useState({ lote: "__ALL__" });

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [modal, setModal] = useState({ open: false, dieta: null });
  const [excluir, setExcluir] = useState({ open: false, dieta: null });

  const normalizeDietaCache = useCallback((cache) => {
    return Array.isArray(cache) ? cache : [];
  }, []);

  const updateCache = useCallback(
    async (nextList) => {
      setDietas(nextList);
      await kvSet(CACHE_DIETA_KEY, nextList);
    },
    []
  );

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

  const loteOptions = useMemo(() => {
    const values = Array.from(
      new Set((dietas || []).map((d) => d.lote).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return values;
  }, [dietas]);

  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      if (prev.direction === "desc") return { key: null, direction: null };
      return { key, direction: "asc" };
    });
  };

  const handleTogglePopover = (key) => {
    setOpenPopoverKey((prev) => (prev === key ? null : key));
  };

  useEffect(() => {
    if (!openPopoverKey) return undefined;
    const handleClick = (event) => {
      if (event.target.closest('[data-filter-trigger="true"]')) return;
      setOpenPopoverKey(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openPopoverKey]);

  const dietasExibidas = useMemo(() => {
    let lista = Array.isArray(dietas) ? [...dietas] : [];

    if (filtros.lote !== "__ALL__") {
      lista = lista.filter((d) => d.lote === filtros.lote);
    }

    if (sortConfig.key) {
      const dir = sortConfig.direction === "desc" ? -1 : 1;
      lista.sort((a, b) => {
        switch (sortConfig.key) {
          case "lote":
            return String(a.lote || "").localeCompare(String(b.lote || "")) * dir;
          case "numVacas":
            return (Number(a.numVacas || 0) - Number(b.numVacas || 0)) * dir;
          case "custoVacaDia":
            return (Number(a.custoVacaDia || 0) - Number(b.custoVacaDia || 0)) * dir;
          case "custoTotal":
            return (Number(a.custoTotal || 0) - Number(b.custoTotal || 0)) * dir;
          case "data":
            return (new Date(a.data).getTime() - new Date(b.data).getTime()) * dir;
          default:
            return 0;
        }
      });
    }

    return lista;
  }, [dietas, filtros, sortConfig]);

  const resumo = useMemo(() => {
    const total = dietasExibidas.length;
    const vacas = dietasExibidas.reduce((acc, d) => acc + Number(d.numVacas || 0), 0);
    const totalCusto = dietasExibidas.reduce((acc, d) => acc + Number(d.custoTotal || 0), 0);
    const custoMedioVaca = vacas ? totalCusto / vacas : 0;
    return { total, totalCusto, custoMedioVaca };
  }, [dietasExibidas]);

  /** ===================== LOAD DIETAS (BANCO) ===================== */
  const loadDietas = useCallback(async () => {
    setLoading(true);
    setErro("");

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cache = normalizeDietaCache(await kvGet(CACHE_DIETA_KEY));
      setDietas(cache);
      setLoading(false);
      return;
    }

    if (!fazendaAtualId) {
      setDietas([]);
      setLoading(false);
      setErro("Selecione uma fazenda para carregar as dietas.");
      return;
    }

    const { data, error } = await withFazendaId(
      supabase
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
        ),
      fazendaAtualId
    ).order("dia", { ascending: false });

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

    await updateCache(list);
    setLoading(false);
  }, [fazendaAtualId, normalizeDietaCache, updateCache]);

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
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const ingredientes = Array.isArray(dietaRow?.ingredientes) && dietaRow.ingredientes.length
          ? dietaRow.ingredientes
          : null;

        if (!ingredientes) {
          setErro("Sem itens da dieta em cache para edição offline.");
          return;
        }

        setModal({
          open: true,
          dieta: {
            id: dietaRow.id,
            lote_id: dietaRow.lote_id,
            lote_nome: dietaRow.lote,
            numVacas: dietaRow.numVacas,
            data: dietaRow.data,
            observacao: dietaRow.observacao || "",
            ingredientes,
          },
        });
        return;
      }

      setLoading(true);
      setErro("");

      try {
        // busca itens para preencher o modal
        const { data: itens, error: eItens } = await withFazendaId(
          supabase.from("dietas_itens").select("produto_id, quantidade_kg_vaca"),
          fazendaAtualId
        )
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
    [fazendaAtualId]
  );

  /** ===================== SALVOU NO MODAL ===================== */
  const salvar = useCallback(
    async (saved) => {
      setModal({ open: false, dieta: null });
      if (saved?.offline) {
        const nextList = (() => {
          const base = Array.isArray(dietas) ? [...dietas] : [];
          const idx = base.findIndex((d) => String(d.id) === String(saved.id));
          if (idx >= 0) {
            base[idx] = { ...base[idx], ...saved };
          } else {
            base.push(saved);
          }
          return base.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        })();
        await updateCache(nextList);
        return;
      }
      await loadDietas();
    },
    [dietas, loadDietas, updateCache]
  );

  /** ===================== EXCLUIR ===================== */
  const pedirExclusao = (dietaRow) => setExcluir({ open: true, dieta: dietaRow });

  const confirmarExclusao = useCallback(async () => {
    const d = excluir.dieta;
    if (!d?.id) {
      setExcluir({ open: false, dieta: null });
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const nextList = (dietas || []).filter((item) => String(item.id) !== String(d.id));
      await updateCache(nextList);
      await enqueue("dieta.delete", { id: d.id });
      setExcluir({ open: false, dieta: null });
      return;
    }

    setLoading(true);
    setErro("");

    try {
      // primeiro itens (caso não tenha FK cascade)
      const { error: eItens } = await withFazendaId(
        supabase.from("dietas_itens").delete(),
        fazendaAtualId
      ).eq("dieta_id", d.id);
      if (eItens) throw eItens;

      const { error: eDiet } = await withFazendaId(
        supabase.from("dietas").delete(),
        fazendaAtualId
      ).eq("id", d.id);
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
  }, [dietas, excluir.dieta, fazendaAtualId, loadDietas, updateCache]);

  return (
    <section className="w-full py-6">
      <div className="px-2 md:px-4 lg:px-6">
        <div className="mb-4 flex justify-between">
          <button className="botao-acao" onClick={abrirNovo} disabled={loading}>
            + Nova Dieta
          </button>
        </div>

        {erro ? (
          <div className="st-alert st-alert--danger">{erro}</div>
        ) : null}

        <div className="st-filter-hint">
          Dica: clique no título das colunas habilitadas para ordenar/filtrar. Clique novamente para
          fechar.
        </div>
        <div className="st-table-container">
          <div className="st-table-wrap">
            <table
              className="st-table st-table--darkhead"
              onMouseLeave={() => {
                setHoveredRowId(null);
                setHoveredColKey(null);
              }}
            >
              <thead>
                <tr>
                  <th
                    className="col-lote"
                    onMouseEnter={() => setHoveredColKey("lote")}
                    style={{ position: "relative" }}
                  >
                    <button
                      type="button"
                      data-filter-trigger="true"
                      onClick={() => {
                        toggleSort("lote");
                        handleTogglePopover("lote");
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span className="st-th-label">Lote</span>
                      {sortConfig.key === "lote" && sortConfig.direction && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                    {openPopoverKey === "lote" && (
                      <div
                        className="st-filter-popover"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <label className="st-filter__label">
                          Lote
                          <select
                            className="st-filter-input"
                            value={filtros.lote}
                            onChange={(event) =>
                              setFiltros((prev) => ({
                                ...prev,
                                lote: event.target.value,
                              }))
                            }
                          >
                            <option value="__ALL__">Todos</option>
                            {loteOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </th>
                  <th
                    className="st-td-center col-numvacas"
                    onMouseEnter={() => setHoveredColKey("numVacas")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("numVacas")}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span className="st-th-label">Nº de Vacas</span>
                      {sortConfig.key === "numVacas" && sortConfig.direction && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th
                    className="st-td-center col-custo-dia"
                    onMouseEnter={() => setHoveredColKey("custoVacaDia")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("custoVacaDia")}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span className="st-th-label">Custo Vaca/dia</span>
                      {sortConfig.key === "custoVacaDia" && sortConfig.direction && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th
                    className="st-td-center col-custo-total"
                    onMouseEnter={() => setHoveredColKey("custoTotal")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("custoTotal")}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span className="st-th-label">Custo Total</span>
                      {sortConfig.key === "custoTotal" && sortConfig.direction && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="st-td-center col-custo-mes">
                    <span className="st-th-label">Custo Vaca/mês</span>
                  </th>
                  <th
                    className="st-td-center col-data"
                    onMouseEnter={() => setHoveredColKey("data")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("data")}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span className="st-th-label">Data</span>
                      {sortConfig.key === "data" && sortConfig.direction && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="st-td-center col-acoes">
                    <span className="st-th-label">Ação</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr className="st-empty">
                    <td colSpan={colunas.length} style={{ textAlign: "center" }}>
                      Carregando...
                    </td>
                  </tr>
                ) : dietasExibidas.length === 0 ? (
                  <tr className="st-empty">
                    <td colSpan={colunas.length} style={{ textAlign: "center" }}>
                      Nenhuma dieta cadastrada.
                    </td>
                  </tr>
                ) : (
                  dietasExibidas.map((d) => {
                    const rowId = d.id;
                    const rowHover = hoveredRowId === rowId;
                    return (
                      <tr key={rowId} className={rowHover ? "st-row-hover" : ""}>
                        <td
                          className={`${hoveredColKey === "lote" ? "st-col-hover" : ""} ${
                            rowHover ? "st-row-hover" : ""
                          } ${rowHover && hoveredColKey === "lote" ? "st-cell-hover" : ""}`}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("lote");
                          }}
                        >
                          {d.lote}
                        </td>

                        <td
                          className={`st-td-center st-num ${
                            hoveredColKey === "numVacas" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "numVacas" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("numVacas");
                          }}
                        >
                          {d.numVacas}
                        </td>

                        <td
                          className={`st-td-center st-num ${
                            hoveredColKey === "custoVacaDia" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "custoVacaDia" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("custoVacaDia");
                          }}
                        >
                          {formatBRL(d.custoVacaDia)}
                        </td>

                        <td
                          className={`st-td-center st-num ${
                            hoveredColKey === "custoTotal" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "custoTotal" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("custoTotal");
                          }}
                        >
                          {formatBRL(d.custoTotal)}
                        </td>

                        <td className="st-td-center st-num">{formatBRL(Number(d.custoVacaDia || 0) * 30)}</td>

                        <td
                          className={`st-td-center ${
                            hoveredColKey === "data" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "data" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("data");
                          }}
                        >
                          {formatDateBR(d.data)}
                        </td>

                        <td className="st-td-center">
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            <button className="st-btn" onClick={() => abrirEditar(d)} disabled={loading}>
                              Editar
                            </button>
                            <button className="st-btn" onClick={() => pedirExclusao(d)} disabled={loading}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              <tfoot>
                <tr className="st-summary-row">
                  <td colSpan={7}>
                    <div className="st-summary-row__content">
                      <span>Total de dietas exibidas: {resumo.total}</span>
                      <span>Custo total: {formatBRL(resumo.totalCusto)}</span>
                      <span>Custo médio por vaca: {formatBRL(resumo.custoMedioVaca)}</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

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
