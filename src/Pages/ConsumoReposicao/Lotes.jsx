// src/pages/ConsumoReposicao/Lotes.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazendaAtiva } from "../../context/FazendaAtivaContext";
import { enqueue, kvGet, kvSet } from "../../offline/localDB";

import "../../styles/tabelaModerna.css";
import "../../styles/botoes.css";

import { ModalLoteCadastro, ModalLoteInfo, ModalConfirmarExclusao } from "./ModalLote";

const CACHE_LOTES_KEY = "cache:lotes:list";

function normalizeLotesCache(cache) {
  return Array.isArray(cache) ? cache : [];
}

function generateLocalId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fallback abaixo
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/* ===================== helpers (map modal <-> banco) ===================== */
// Banco usa: nivel_produtivo
// Modal usa: nivelProducao
function dbToUiLote(row) {
  if (!row) return row;
  return {
    ...row,
    nivelProducao: row.nivel_produtivo ?? "",
    numVacas: Number(row.num_animais ?? 0),
  };
}

function uiToDbPayload(form) {
  if (!form) return form;

  // limpa campos dependentes (banco exige nivel_produtivo NULL se não for lactação)
  const funcao = form.funcao || "Outro";

  const payload = {
    nome: String(form.nome || "").trim(),
    funcao,
    descricao: String(form.descricao || "").trim() || null,
    ativo: !!form.ativo,
    nivel_produtivo: null,
  };

  if (funcao === "Lactação") {
    payload.nivel_produtivo = String(form.nivelProducao || form.nivel_produtivo || "").trim() || null;
  }

  return payload;
}

export default function Lotes() {
  const { fazendaAtivaId } = useFazendaAtiva();
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [openPopoverKey, setOpenPopoverKey] = useState(null);
  const [filtros, setFiltros] = useState({
    funcao: "__ALL__",
    nivel: "__ALL__",
    status: "__ALL__",
  });
  const [cad, setCad] = useState({ open: false, index: null, lote: null });
  const [info, setInfo] = useState(null);
  const [excluirId, setExcluirId] = useState(null);

  const updateCache = useCallback(async (nextList) => {
    setLotes(nextList);
    await kvSet(CACHE_LOTES_KEY, nextList);
  }, []);

  const colunas = useMemo(
    () => ["Nome", "Nº de Vacas", "Função", "Nível Produtivo", "Status", "Ação"],
    []
  );

  const funcaoOptions = useMemo(() => {
    const values = Array.from(
      new Set((lotes || []).map((l) => l.funcao).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return values;
  }, [lotes]);

  const nivelOptions = useMemo(() => {
    const values = Array.from(
      new Set((lotes || []).map((l) => l.nivelProducao).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return values;
  }, [lotes]);

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

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cache = normalizeLotesCache(await kvGet(CACHE_LOTES_KEY));
      setLotes(cache);
      setLoading(false);
      return;
    }

    // View que você criou: v_lotes_com_contagem
    if (!fazendaAtivaId) {
      setErro("Selecione uma fazenda para carregar os lotes.");
      setLotes([]);
      setLoading(false);
      return;
    }

    const { data, error } = await withFazendaId(
      supabase
        .from("v_lotes_com_contagem")
        .select("id,nome,funcao,nivel_produtivo,descricao,ativo,num_animais,created_at,updated_at"),
      fazendaAtivaId
    ).order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar lotes:", error);
      setErro("Não foi possível carregar os lotes. Verifique suas permissões (RLS) e tente novamente.");
      setLotes([]);
      setLoading(false);
      return;
    }

    await updateCache((data || []).map(dbToUiLote));
    setLoading(false);
  }, [fazendaAtivaId, updateCache]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirCadastro = () =>
    setCad({
      open: true,
      index: null,
      lote: {
        id: null,
        nome: "",
        funcao: "Lactação",
        nivelProducao: "",
        descricao: "",
        ativo: true,
        numVacas: 0,
      },
    });

  const abrirEdicao = (i) => {
    const item = lotes[i];
    if (!item) return;
    setCad({ open: true, index: i, lote: JSON.parse(JSON.stringify(item)) });
  };

  /* ===================== CRUD SUPABASE ===================== */
  const salvarBanco = async (loteFinal) => {
    const nome = String(loteFinal?.nome || "").trim();
    const funcao = String(loteFinal?.funcao || "").trim();

    if (!nome || !funcao) return alert("Preencha os campos obrigatórios.");
    if (funcao === "Lactação" && !String(loteFinal?.nivelProducao || "").trim())
      return alert("Informe o nível produtivo.");

    setLoading(true);
    setErro("");

    const payload = {
      ...uiToDbPayload(loteFinal),
      fazenda_id: fazendaAtivaId || null,
    };

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const localId = loteFinal?.id || generateLocalId();
        const loteUi = {
          ...loteFinal,
          id: localId,
          nivelProducao: loteFinal?.nivelProducao || loteFinal?.nivel_produtivo || "",
          nivel_produtivo:
            loteFinal?.funcao === "Lactação"
              ? String(loteFinal?.nivelProducao || loteFinal?.nivel_produtivo || "").trim() || null
              : null,
        };

        const nextList = (
          loteFinal?.id
            ? lotes.map((l) => (String(l.id) === String(loteFinal.id) ? { ...l, ...loteUi } : l))
            : [...lotes, loteUi]
        ).sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")));

        await updateCache(nextList);

        await enqueue(loteFinal?.id ? "lotes.update" : "lotes.insert", {
          id: localId,
          payload: { ...payload, id: localId },
        });

        setCad({ open: false, index: null, lote: null });
        setLoading(false);
        return;
      }

      if (loteFinal?.id) {
        const { error } = await withFazendaId(
          supabase.from("lotes").update(payload),
          fazendaAtivaId
        ).eq("id", loteFinal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lotes").insert(payload);
        if (error) throw error;
      }

      setCad({ open: false, index: null, lote: null });
      await carregar();
    } catch (e) {
      console.error("Erro ao salvar lote:", e);
      setErro("Não foi possível salvar o lote. Confira os campos e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const alternarAtivoBanco = async (loteId, ativoAtual) => {
    if (!loteId) return;
    setLoading(true);
    setErro("");

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const nextList = lotes.map((l) =>
          String(l.id) === String(loteId) ? { ...l, ativo: !ativoAtual } : l
        );
        await updateCache(nextList);
        await enqueue("lotes.update", { id: loteId, payload: { ativo: !ativoAtual } });
        setLoading(false);
        return;
      }

      const { error } = await withFazendaId(
        supabase.from("lotes").update({ ativo: !ativoAtual }),
        fazendaAtivaId
      ).eq("id", loteId);
      if (error) throw error;
      await carregar();
    } catch (e) {
      console.error("Erro ao alternar ativo:", e);
      setErro("Não foi possível alterar o status. Verifique permissões (RLS).");
      setLoading(false);
    }
  };

  const confirmarExclusaoBanco = async () => {
    if (!excluirId) return;

    setLoading(true);
    setErro("");

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const nextList = lotes.filter((l) => String(l.id) !== String(excluirId));
        await updateCache(nextList);
        await enqueue("lotes.delete", { id: excluirId });
        setExcluirId(null);
        setLoading(false);
        return;
      }

      const { error } = await withFazendaId(
        supabase.from("lotes").delete(),
        fazendaAtivaId
      ).eq("id", excluirId);
      if (error) throw error;

      setExcluirId(null);
      await carregar();
    } catch (e) {
      console.error("Erro ao excluir lote:", e);
      setErro("Não foi possível excluir o lote. Se houver animais vinculados, o lote será removido e o lote_id fica null.");
      setLoading(false);
    }
  };

  const lotesExibidos = useMemo(() => {
    let lista = Array.isArray(lotes) ? [...lotes] : [];

    if (filtros.funcao !== "__ALL__") {
      lista = lista.filter((l) => l.funcao === filtros.funcao);
    }
    if (filtros.nivel !== "__ALL__") {
      lista = lista.filter((l) => l.nivelProducao === filtros.nivel);
    }
    if (filtros.status !== "__ALL__") {
      const ativo = filtros.status === "Ativo";
      lista = lista.filter((l) => !!l.ativo === ativo);
    }

    if (sortConfig.key) {
      const dir = sortConfig.direction === "desc" ? -1 : 1;
      lista.sort((a, b) => {
        switch (sortConfig.key) {
          case "nome":
            return String(a.nome || "").localeCompare(String(b.nome || "")) * dir;
          case "numVacas":
            return (Number(a.numVacas || 0) - Number(b.numVacas || 0)) * dir;
          case "nivel":
            return String(a.nivelProducao || "").localeCompare(String(b.nivelProducao || "")) * dir;
          default:
            return 0;
        }
      });
    }

    return lista;
  }, [lotes, filtros, sortConfig]);

  const resumo = useMemo(() => {
    const total = lotesExibidos.length;
    const totalVacas = lotesExibidos.reduce((acc, l) => acc + Number(l.numVacas || 0), 0);
    const ativos = lotesExibidos.filter((l) => l.ativo).length;
    const inativos = total - ativos;
    return { total, totalVacas, ativos, inativos };
  }, [lotesExibidos]);

  return (
    <section style={{ width: "100%", padding: "24px 0" }}>
      <div style={{ padding: "0 12px" }}>
        <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button className="botao-acao pequeno" onClick={abrirCadastro} disabled={loading}>
            + Cadastrar Lote
          </button>
          <div />
        </div>

        {erro && (
          <div className="st-alert st-alert--danger">{erro}</div>
        )}

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
              <colgroup>
                <col style={{ width: "22%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>

              <thead>
                <tr>
                  <th
                    className="col-nome"
                    onMouseEnter={() => setHoveredColKey("nome")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("nome")}
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
                      <span className="st-th-label">Nome</span>
                      {sortConfig.key === "nome" && sortConfig.direction && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
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
                    className="col-funcao"
                    onMouseEnter={() => setHoveredColKey("funcao")}
                    style={{ position: "relative" }}
                  >
                    <button
                      type="button"
                      data-filter-trigger="true"
                      onClick={() => handleTogglePopover("funcao")}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <span className="st-th-label">Função</span>
                    </button>
                    {openPopoverKey === "funcao" && (
                      <div
                        className="st-filter-popover"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <label className="st-filter__label">
                          Função
                          <select
                            className="st-filter-input"
                            value={filtros.funcao}
                            onChange={(event) =>
                              setFiltros((prev) => ({
                                ...prev,
                                funcao: event.target.value,
                              }))
                            }
                          >
                            <option value="__ALL__">Todas</option>
                            {funcaoOptions.map((opt) => (
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
                    className="col-nivel"
                    onMouseEnter={() => setHoveredColKey("nivel")}
                    style={{ position: "relative" }}
                  >
                    <button
                      type="button"
                      data-filter-trigger="true"
                      onClick={() => {
                        toggleSort("nivel");
                        handleTogglePopover("nivel");
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
                      <span className="st-th-label">Nível Produtivo</span>
                      {sortConfig.key === "nivel" && sortConfig.direction && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                    {openPopoverKey === "nivel" && (
                      <div
                        className="st-filter-popover"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <label className="st-filter__label">
                          Nível Produtivo
                          <select
                            className="st-filter-input"
                            value={filtros.nivel}
                            onChange={(event) =>
                              setFiltros((prev) => ({
                                ...prev,
                                nivel: event.target.value,
                              }))
                            }
                          >
                            <option value="__ALL__">Todos</option>
                            {nivelOptions.map((opt) => (
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
                    className="st-td-center col-status"
                    onMouseEnter={() => setHoveredColKey("status")}
                    style={{ position: "relative" }}
                  >
                    <button
                      type="button"
                      data-filter-trigger="true"
                      onClick={() => handleTogglePopover("status")}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <span className="st-th-label">Status</span>
                    </button>
                    {openPopoverKey === "status" && (
                      <div
                        className="st-filter-popover"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <label className="st-filter__label">
                          Status
                          <select
                            className="st-filter-input"
                            value={filtros.status}
                            onChange={(event) =>
                              setFiltros((prev) => ({
                                ...prev,
                                status: event.target.value,
                              }))
                            }
                          >
                            <option value="__ALL__">Todos</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                          </select>
                        </label>
                      </div>
                    )}
                  </th>
                  <th
                    className="st-td-center col-acoes"
                    onMouseEnter={() => setHoveredColKey("acoes")}
                  >
                    <span className="st-th-label">Ação</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr className="st-empty">
                    <td colSpan={colunas.length} style={{ textAlign: "center" }}>
                      Carregando…
                    </td>
                  </tr>
                ) : lotesExibidos.length === 0 ? (
                  <tr className="st-empty">
                    <td colSpan={colunas.length} style={{ textAlign: "center" }}>
                      Nenhum lote cadastrado.
                    </td>
                  </tr>
                ) : (
                  lotesExibidos.map((l, i) => {
                    const rowId = l.id || i;
                    const rowHover = hoveredRowId === rowId;
                    return (
                      <tr key={rowId} className={rowHover ? "st-row-hover" : ""}>
                        <td
                          className={`${hoveredColKey === "nome" ? "st-col-hover" : ""} ${
                            rowHover ? "st-row-hover" : ""
                          } ${rowHover && hoveredColKey === "nome" ? "st-cell-hover" : ""}`}
                          title={l.nome || ""}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("nome");
                          }}
                        >
                          {l.nome || "—"}
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
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span>{typeof l.numVacas === "number" ? l.numVacas : 0}</span>
                            <button
                              className="st-btn"
                              title="Informações do lote"
                              onClick={() => setInfo(l)}
                              style={{ height: 28, padding: "0 10px" }}
                            >
                              ℹ️
                            </button>
                          </div>
                        </td>

                        <td
                          className={`${hoveredColKey === "funcao" ? "st-col-hover" : ""} ${
                            rowHover ? "st-row-hover" : ""
                          } ${rowHover && hoveredColKey === "funcao" ? "st-cell-hover" : ""}`}
                          title={l.funcao || ""}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("funcao");
                          }}
                        >
                          {l.funcao || "—"}
                        </td>

                        <td
                          className={`${hoveredColKey === "nivel" ? "st-col-hover" : ""} ${
                            rowHover ? "st-row-hover" : ""
                          } ${rowHover && hoveredColKey === "nivel" ? "st-cell-hover" : ""}`}
                          title={l.nivelProducao || ""}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("nivel");
                          }}
                        >
                          {l.funcao === "Lactação" ? l.nivelProducao || "—" : "—"}
                        </td>

                        <td
                          className={`st-td-center ${
                            hoveredColKey === "status" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "status" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("status");
                          }}
                        >
                          <span
                            className={`st-pill ${l.ativo ? "st-pill--ok" : "st-pill--mute"}`}
                          >
                            {l.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>

                        <td
                          className={`st-td-center ${
                            hoveredColKey === "acoes" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("acoes");
                          }}
                        >
                          <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="st-btn" onClick={() => abrirEdicao(i)}>
                              Editar
                            </button>

                            <button
                              className="st-btn"
                              onClick={() => alternarAtivoBanco(l.id, l.ativo)}
                            >
                              {l.ativo ? "Inativar" : "Ativar"}
                            </button>

                            <button className="st-btn" onClick={() => setExcluirId(l.id)}>
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
                  <td colSpan={6}>
                    <div className="st-summary-row__content">
                      <span>Total de lotes exibidos: {resumo.total}</span>
                      <span>Total de vacas somadas: {resumo.totalVacas}</span>
                      <span>
                        Ativos: {resumo.ativos} • Inativos: {resumo.inativos}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {cad.open && (
          <ModalLoteCadastro
            title={cad.index != null ? "✏️ Editar Lote" : "➕ Cadastro de Lote"}
            initialValue={cad.lote}
            onClose={() => setCad({ open: false, index: null, lote: null })}
            onCancel={() => setCad({ open: false, index: null, lote: null })}
            onSave={(payload) => salvarBanco(payload)}
          />
        )}

        {info && <ModalLoteInfo lote={info} onClose={() => setInfo(null)} />}

        {excluirId && (
          <ModalConfirmarExclusao
            title="Confirmar exclusão"
            onClose={() => setExcluirId(null)}
            onCancel={() => setExcluirId(null)}
            onConfirm={confirmarExclusaoBanco}
          />
        )}
      </div>
    </section>
  );
}
