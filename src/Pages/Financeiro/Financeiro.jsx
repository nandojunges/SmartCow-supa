// src/pages/Financeiro/Financeiro.jsx
import React, { useEffect, useMemo, useState, useCallback, useLayoutEffect } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import { enqueue, kvGet, kvSet } from "../../offline/localDB";

import "../../styles/tabelamoderna.css";
import "../../styles/botoes.css";

import ResumoFinanceiroCards from "./ResumoFinanceiroCards";
import ModalLancamentoFinanceiro from "./ModalLancamentoFinanceiro";
import ModalPeriodoFinanceiro from "./ModalPeriodoFinanceiro";

/* ===================== CONFIG ===================== */
const STICKY_OFFSET = 48;

const CATEGORIAS_PADRAO = [
  { value: "Receita Leite", label: "Receita Leite" },
  { value: "Compra Animal", label: "Compra Animal" },
  { value: "Venda Animal", label: "Venda Animal" },
  { value: "Estoque (Compra)", label: "Estoque (Compra)" },
  { value: "Saúde (Tratamento)", label: "Saúde (Tratamento)" },
  { value: "Fixos", label: "Fixos" },
  { value: "Mão de obra", label: "Mão de obra" },
  { value: "Energia", label: "Energia" },
  { value: "Manutenção", label: "Manutenção" },
  { value: "Máquinas/Implementos", label: "Máquinas/Implementos" },
  { value: "Impostos/Taxas", label: "Impostos/Taxas" },
  { value: "Outros", label: "Outros" },
];

const CACHE_FINANCEIRO_KEY = "cache:financeiro:lancamentos:list";

const ORIGENS_PADRAO = [
  { value: "Manual", label: "Manual" },
  { value: "Estoque", label: "Estoque" },
  { value: "Animais", label: "Animais" },
  { value: "Leite", label: "Leite" },
  { value: "Saúde", label: "Saúde" },
];

const rsStyles = {
  container: (b) => ({ ...b, width: "100%" }),
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    height: 42,
    borderRadius: 12,
    borderColor: state.isFocused ? "#2563eb" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #2563eb" : "none",
    fontSize: 14,
    ":hover": { borderColor: "#2563eb" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 12px" }),
  indicatorsContainer: (base) => ({ ...base, height: 42 }),
  menuPortal: (b) => ({ ...b, zIndex: 9999 }),
};

/* ===================== HELPERS ===================== */
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toISODateInput(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function brFromISO(iso) {
  if (!iso) return "";
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return String(iso);
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}
function moneyBR(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function firstLastOfMonth(refISO) {
  const ref = refISO ? new Date(`${refISO}T00:00:00`) : new Date();
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const ini = new Date(y, m, 1);
  const fim = new Date(y, m + 1, 0);
  return { ini: toISODateInput(ini), fim: toISODateInput(fim) };
}

function gerarUUID() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (error) {
    console.warn("Falha ao gerar UUID nativo:", error);
  }
  const randomPart = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${randomPart()}-${randomPart()}`;
}

function normalizeCacheList(cache) {
  return Array.isArray(cache) ? cache : Array.isArray(cache?.registros) ? cache.registros : [];
}

function upsertFinanceiroCache(list, item) {
  const next = [...list];
  const idx = next.findIndex((c) => String(c?.id || "") === String(item?.id || ""));
  if (idx >= 0) {
    next[idx] = { ...next[idx], ...item };
  } else {
    next.push(item);
  }
  return next;
}

function mergeFinanceiroCache(cacheAtual, fetched) {
  const base = Array.isArray(fetched) ? [...fetched] : [];
  const ids = new Set(base.map((row) => String(row?.id || "")));
  (Array.isArray(cacheAtual) ? cacheAtual : []).forEach((row) => {
    const id = String(row?.id || "");
    if (id && !ids.has(id)) {
      base.push(row);
    }
  });
  return base;
}

function filtrarPorPeriodo(list, periodo) {
  const ini = String(periodo?.ini || "");
  const fim = String(periodo?.fim || "");
  return (Array.isArray(list) ? list : []).filter((r) => {
    const data = String(r?.data || "");
    if (!data) return false;
    if (ini && data < ini) return false;
    if (fim && data > fim) return false;
    return true;
  });
}

// ✅ define se o lançamento mexe no caixa
function impactaCaixa(row) {
  // Se você ainda não tem a coluna, ela virá undefined -> consideramos que impacta (comportamento antigo)
  if (row?.impacta_caixa === false) return false;
  return true;
}

function tipoLabel(tipo) {
  return tipo === "ENTRADA" ? "Entrada" : tipo === "SAIDA" ? "Saída" : "—";
}

function isTratamento(row) {
  const cat = String(row?.categoria || "").toLowerCase();
  const org = String(row?.origem || "").toLowerCase();
  return cat.includes("saúde") || cat.includes("saude") || org === "saúde" || org === "saude";
}

function rowStyleByTipo(row) {
  const naoCaixa = !impactaCaixa(row);
  const tratamento = isTratamento(row);

  // prioridade: tratamento > saída > entrada > não-caixa
  if (tratamento) {
    return {
      background: "#FFFBEB",
      borderLeft: "6px solid #F59E0B",
    };
  }

  if (row?.tipo === "SAIDA") {
    return {
      background: "#FFF1F2",
      borderLeft: "6px solid #EF4444",
    };
  }

  if (row?.tipo === "ENTRADA") {
    return {
      background: "#EFF6FF",
      borderLeft: "6px solid #3B82F6",
    };
  }

  if (naoCaixa) {
    return {
      background: "#FFF7ED",
      borderLeft: "6px solid #F97316",
    };
  }

  return {};
}

/* ===================== MODAL INFO (detalhes) ===================== */
const infoOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
  padding: 12,
};

const infoCard = {
  background: "#fff",
  width: "min(720px, 96vw)",
  borderRadius: 16,
  boxShadow: "0 0 26px rgba(15,23,42,0.35)",
  overflow: "hidden",
  fontFamily: "Poppins, sans-serif",
};

const infoHeader = {
  background: "#1e3a8a",
  color: "#fff",
  padding: "12px 16px",
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const infoBody = { padding: 16, display: "grid", gap: 10 };

const infoRow = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: 12,
  alignItems: "start",
};

const infoKey = { fontSize: 12, fontWeight: 900, color: "#475569" };
const infoVal = { fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: "pre-wrap" };

/* usa o padrão do botoes.css (pill) */
const btnFecharInfo = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  padding: "6px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
};

/* ===================== PÁGINA FINANCEIRO ===================== */
export default function Financeiro() {
  const { fazendaAtualId } = useFazenda();
  const hojeISO = useMemo(() => toISODateInput(new Date()), []);
  const periodoPadrao = useMemo(() => firstLastOfMonth(hojeISO), [hojeISO]);

  // período real (início/fim)
  const [periodo, setPeriodo] = useState(() => ({
    ini: periodoPadrao.ini,
    fim: periodoPadrao.fim,
  }));

  // filtros principais
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [busca, setBusca] = useState("");

  // filtros extras
  const [mostrarMaisFiltros, setMostrarMaisFiltros] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState(null);
  const [filtroOrigem, setFiltroOrigem] = useState(null);

  // ✅ filtro opcional: mostrar custos que não mexem no caixa
  const [mostrarNaoCaixa, setMostrarNaoCaixa] = useState(true);

  // dados
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal lançamento
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);

  // modal período
  const [modalPeriodoAberto, setModalPeriodoAberto] = useState(false);

  // modal info
  const [infoAberto, setInfoAberto] = useState(false);
  const [infoLanc, setInfoLanc] = useState(null);

  const categoriasSelect = useMemo(() => CATEGORIAS_PADRAO, []);
  const origensSelect = useMemo(() => ORIGENS_PADRAO, []);

  const carregarLancamentos = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const cache = normalizeCacheList(await kvGet(CACHE_FINANCEIRO_KEY));
        setLancamentos(filtrarPorPeriodo(cache, periodo).map((r) => ({ ...r })));
        return;
      }

      if (!fazendaAtualId) {
        setLancamentos([]);
        return;
      }

      // ✅ tenta buscar com impacta_caixa (novo)
      let data = null;

      try {
        const resp = await withFazendaId(
          supabase
            .from("financeiro_lancamentos")
            .select(
              "id, data, tipo, categoria, origem, descricao, quantidade, unidade, valor_unitario, valor_total, observacao, impacta_caixa, created_at"
            )
            .gte("data", periodo.ini)
            .lte("data", periodo.fim),
          fazendaAtualId
        )
          .order("data", { ascending: true })
          .order("created_at", { ascending: true });

        if (resp.error) throw resp.error;
        data = resp.data || [];
      } catch (e) {
        // ✅ fallback: tabela ainda sem impacta_caixa
        const resp2 = await withFazendaId(
          supabase
            .from("financeiro_lancamentos")
            .select(
              "id, data, tipo, categoria, origem, descricao, quantidade, unidade, valor_unitario, valor_total, observacao, created_at"
            )
            .gte("data", periodo.ini)
            .lte("data", periodo.fim),
          fazendaAtualId
        )
          .order("data", { ascending: true })
          .order("created_at", { ascending: true });

        if (resp2.error) throw resp2.error;
        data = (resp2.data || []).map((r) => ({ ...r, impacta_caixa: true })); // comportamento antigo
      }

      const lista = (data || []).map((r) => ({ ...r }));
      setLancamentos(lista);

      const cacheAtual = normalizeCacheList(await kvGet(CACHE_FINANCEIRO_KEY));
      const merged = mergeFinanceiroCache(cacheAtual, lista);
      await kvSet(CACHE_FINANCEIRO_KEY, merged);
    } catch (e) {
      console.error("Financeiro: erro ao carregar:", e);
      setLancamentos([]);
    } finally {
      setLoading(false);
    }
  }, [fazendaAtualId, periodo.ini, periodo.fim]);

  // auto-carrega quando muda o período
  useEffect(() => {
    carregarLancamentos();
  }, [carregarLancamentos]);

  // atualização ao vivo (realtime)
  useEffect(() => {
    const channel = supabase
      .channel("sc-financeiro-lancamentos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "financeiro_lancamentos" },
        () => carregarLancamentos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregarLancamentos]);

  async function salvarLancamento(payload) {
    try {
      setLoading(true);

      if (!fazendaAtualId) {
        alert("Selecione uma fazenda para salvar lançamentos.");
        return;
      }

      const base = {
        fazenda_id: fazendaAtualId,
        data: payload.data,
        tipo: payload.tipo,
        categoria: payload.categoria,
        origem: payload.origem,
        descricao: payload.descricao,
        quantidade: payload.quantidade,
        unidade: payload.unidade,
        valor_unitario: payload.valor_unitario,
        valor_total: payload.valor_total,
        observacao: payload.observacao,
        impacta_caixa: payload.impacta_caixa !== false, // default true
      };

      const selectCols =
        "id, data, tipo, categoria, origem, descricao, quantidade, unidade, valor_unitario, valor_total, observacao, impacta_caixa, created_at";

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const cacheAtual = normalizeCacheList(await kvGet(CACHE_FINANCEIRO_KEY));
        const id = payload.id || gerarUUID();
        const existente = cacheAtual.find((item) => String(item?.id || "") === String(id));
        const novo = {
          ...base,
          id,
          created_at: existente?.created_at || new Date().toISOString(),
        };
        const atualizado = upsertFinanceiroCache(cacheAtual, novo);
        await kvSet(CACHE_FINANCEIRO_KEY, atualizado);
        await enqueue("financeiro.insert", novo);

        setLancamentos(filtrarPorPeriodo(atualizado, periodo).map((r) => ({ ...r })));
        setModalAberto(false);
        setEditando(null);
        return;
      }

      let saved = null;
      if (payload.id) {
        const { data, error } = await withFazendaId(
          supabase.from("financeiro_lancamentos").update(base),
          fazendaAtualId
        )
          .eq("id", payload.id)
          .select(selectCols)
          .single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase
          .from("financeiro_lancamentos")
          .insert([base])
          .select(selectCols)
          .single();
        if (error) throw error;
        saved = data;
      }

      if (saved) {
        const cacheAtual = normalizeCacheList(await kvGet(CACHE_FINANCEIRO_KEY));
        const atualizado = upsertFinanceiroCache(cacheAtual, saved);
        await kvSet(CACHE_FINANCEIRO_KEY, atualizado);
      }

      setModalAberto(false);
      setEditando(null);
      await carregarLancamentos();
    } catch (e) {
      console.error("Financeiro: erro salvar:", e);
      alert(
        "Erro ao salvar. Se você estiver tentando usar 'impacta_caixa', verifique se a coluna existe em financeiro_lancamentos."
      );
    } finally {
      setLoading(false);
    }
  }

  async function excluirLancamento(id) {
    const ok = window.confirm("Excluir este lançamento?");
    if (!ok) return;

    try {
      setLoading(true);
      const { error } = await withFazendaId(
        supabase.from("financeiro_lancamentos").delete(),
        fazendaAtualId
      ).eq("id", id);
      if (error) throw error;
      await carregarLancamentos();
    } catch (e) {
      console.error("Financeiro: erro excluir:", e);
      alert("Erro ao excluir.");
    } finally {
      setLoading(false);
    }
  }

  const filtrados = useMemo(() => {
    const b = (busca || "").trim().toLowerCase();

    return (lancamentos || []).filter((r) => {
      if (!mostrarNaoCaixa && !impactaCaixa(r)) return false;

      if (filtroTipo?.value && r.tipo !== filtroTipo.value) return false;
      if (filtroCategoria?.value && r.categoria !== filtroCategoria.value) return false;
      if (filtroOrigem?.value && r.origem !== filtroOrigem.value) return false;

      if (b) {
        const txt = [r.descricao, r.categoria, r.origem, r.observacao, r.unidade, r.tipo, r.data]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!txt.includes(b)) return false;
      }
      return true;
    });
  }, [lancamentos, busca, filtroCategoria, filtroOrigem, filtroTipo, mostrarNaoCaixa]);

  // ✅ Cards devem refletir SOMENTE o que mexe no caixa
  const resumo = useMemo(() => {
    let entradas = 0;
    let saidas = 0;

    for (const r of filtrados) {
      if (!impactaCaixa(r)) continue;

      const v = Number(r.valor_total || 0);
      if (r.tipo === "ENTRADA") entradas += v;
      else if (r.tipo === "SAIDA") saidas += v;
    }

    const saldo = entradas - saidas;
    return { entradas, saidas, saldo };
  }, [filtrados]);

  // ✅ livro-caixa: saldo acumulado por lançamento, mas só acumula os que mexem no caixa
  const linhasLivro = useMemo(() => {
    const rows = [...filtrados].sort((a, b) => {
      const da = String(a.data || "");
      const db = String(b.data || "");
      if (da !== db) return da.localeCompare(db);
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });

    let saldoAcum = 0;
    return rows.map((r) => {
      const v = Number(r.valor_total || 0);

      if (impactaCaixa(r)) {
        if (r.tipo === "ENTRADA") saldoAcum += v;
        else if (r.tipo === "SAIDA") saldoAcum -= v;
      }

      return { ...r, __saldoAcumulado: saldoAcum };
    });
  }, [filtrados]);

  // fix do “só aparece quando abre o inspecionar”
  useLayoutEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 60);
    return () => clearTimeout(t);
  }, [linhasLivro.length, loading, mostrarMaisFiltros]);

  function abrirInfoLanc(r) {
    setInfoLanc(r);
    setInfoAberto(true);
  }

  /* ===================== UI ===================== */
  const headerWrap = {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  };

  const label = { fontSize: 12, fontWeight: 900, color: "#374151", marginBottom: 4 };

  const input = {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const sticky = {
    position: "sticky",
    top: STICKY_OFFSET,
    zIndex: 5,
    background: "#fff",
    paddingBottom: 0,
    marginBottom: 0,
  };

  const filtrosRow = {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 320px) 220px 1fr auto auto",
    gap: 12,
    alignItems: "end",
    width: "100%",
  };

  const periodoBox = {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    background: "#fff",
    cursor: "pointer",
    boxSizing: "border-box",
  };

  const periodoTexto = {
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: 10,
    whiteSpace: "nowrap",
  };

  const contador = {
    height: 42,
    display: "flex",
    alignItems: "center",
    fontSize: 13,
    fontWeight: 800,
    color: "#64748b",
    paddingRight: 2,
    whiteSpace: "nowrap",
  };

  const extraFiltrosRow = {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    alignItems: "end",
  };

  const tdWrap = {
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    lineHeight: 1.2,
  };

  const chipNaoCaixa = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 900,
    color: "#7c2d12",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    padding: "3px 10px",
    borderRadius: 999,
    marginLeft: 10,
    whiteSpace: "nowrap",
  };

  const chipTratamento = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 900,
    color: "#92400e",
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    padding: "3px 10px",
    borderRadius: 999,
    marginLeft: 10,
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ padding: "14px 16px" }}>
      {/* Título + ações */}
      <div style={headerWrap}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", marginBottom: 2 }}>
            Financeiro
          </div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Livro-caixa do período • {brFromISO(periodo.ini)} até {brFromISO(periodo.fim)}
            {mostrarNaoCaixa ? <span style={chipNaoCaixa}>Mostrando custos que não impactam caixa</span> : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="botao-acao"
            onClick={() => {
              setEditando(null);
              setModalAberto(true);
            }}
            disabled={loading}
          >
            + Novo lançamento
          </button>
        </div>
      </div>

      {/* Cards (somente caixa) */}
      <ResumoFinanceiroCards resumo={resumo} />

      {/* Filtros (sticky) */}
      <div style={sticky}>
        <div style={filtrosRow}>
          <div>
            <div style={label}>Período</div>
            <div style={periodoBox} onClick={() => setModalPeriodoAberto(true)}>
              <div style={periodoTexto}>
                <span>{brFromISO(periodo.ini)}</span>
                <span style={{ color: "#94a3b8", fontWeight: 900 }}>→</span>
                <span>{brFromISO(periodo.fim)}</span>
              </div>
              <div style={{ opacity: 0.9, fontSize: 14 }}>📅</div>
            </div>
          </div>

          <div>
            <div style={label}>Tipo</div>
            <Select
              styles={rsStyles}
              menuPortalTarget={document.body}
              value={filtroTipo}
              onChange={setFiltroTipo}
              isClearable
              options={[
                { value: "ENTRADA", label: "Entrada" },
                { value: "SAIDA", label: "Saída" },
              ]}
              placeholder="Todos"
            />
          </div>

          <div>
            <div style={label}>Busca</div>
            <input
              style={input}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar (descrição, obs., categoria, origem...)"
            />
          </div>

          <button
            type="button"
            className="botao-editar"
            onClick={() => setMostrarMaisFiltros((v) => !v)}
            style={{ height: 42, padding: "0 14px", fontWeight: 800 }}
          >
            {mostrarMaisFiltros ? "Menos filtros" : "Mais filtros"}
          </button>

          <div style={contador}>{loading ? "Carregando..." : `${filtrados.length} lançamentos`}</div>
        </div>

        {mostrarMaisFiltros ? (
          <div style={extraFiltrosRow}>
            <div>
              <div style={label}>Categoria</div>
              <Select
                styles={rsStyles}
                menuPortalTarget={document.body}
                value={filtroCategoria}
                onChange={setFiltroCategoria}
                isClearable
                options={categoriasSelect}
                placeholder="Todas"
                isSearchable
              />
            </div>

            <div>
              <div style={label}>Origem</div>
              <Select
                styles={rsStyles}
                menuPortalTarget={document.body}
                value={filtroOrigem}
                onChange={setFiltroOrigem}
                isClearable
                options={origensSelect}
                placeholder="Todas"
                isSearchable
              />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="botao-editar"
                onClick={() => setMostrarNaoCaixa((v) => !v)}
                title="Mostrar/ocultar custos que não impactam o caixa"
                style={{
                  height: 38,
                  padding: "0 12px",
                  fontWeight: 800,
                  borderColor: mostrarNaoCaixa ? "#fed7aa" : "#1976d2",
                  color: mostrarNaoCaixa ? "#7c2d12" : "#1976d2",
                  backgroundColor: mostrarNaoCaixa ? "#fff7ed" : "transparent",
                }}
              >
                {mostrarNaoCaixa ? "Ocultar não-caixa" : "Mostrar não-caixa"}
              </button>

              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                “Não-caixa” (ex.: custo de tratamento) aparece na lista, mas não altera saldo.
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 8 }}>
        <table className="tabela-padrao tabela-plantel" style={{ width: "100%", tableLayout: "auto" }}>
          <thead>
            <tr>
              <th style={{ top: STICKY_OFFSET, width: 110, whiteSpace: "nowrap" }}>Data</th>
              <th style={{ top: STICKY_OFFSET, width: 90, whiteSpace: "nowrap" }}>Tipo</th>
              <th style={{ top: STICKY_OFFSET, width: 190, whiteSpace: "nowrap" }}>Categoria</th>
              <th style={{ top: STICKY_OFFSET, whiteSpace: "nowrap" }}>Descrição</th>

              <th style={{ top: STICKY_OFFSET, width: 140, textAlign: "right", whiteSpace: "nowrap" }}>Entrada</th>
              <th style={{ top: STICKY_OFFSET, width: 140, textAlign: "right", whiteSpace: "nowrap" }}>Saída</th>
              <th style={{ top: STICKY_OFFSET, width: 140, textAlign: "right", whiteSpace: "nowrap" }}>Saldo</th>

              <th style={{ top: STICKY_OFFSET, width: 70, textAlign: "center", whiteSpace: "nowrap" }}>Info</th>
              <th style={{ top: STICKY_OFFSET, width: 92, textAlign: "center", whiteSpace: "nowrap" }}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {linhasLivro.length === 0 && !loading && (
              <tr>
                <td colSpan={9} style={{ color: "#64748b", fontWeight: 800 }}>
                  Sem lançamentos no período.
                </td>
              </tr>
            )}

            {linhasLivro.map((r) => {
              const isEntrada = r.tipo === "ENTRADA";
              const isSaida = r.tipo === "SAIDA";

              const entradaVal = isEntrada ? Number(r.valor_total || 0) : 0;
              const saidaVal = isSaida ? Number(r.valor_total || 0) : 0;

              const desc = String(r.descricao || "").trim();
              const obs = String(r.observacao || "").trim();

              const temInfo =
                !!String(r.origem || "").trim() ||
                r.quantidade != null ||
                !!String(r.unidade || "").trim() ||
                r.valor_unitario != null ||
                !!obs;

              const naoCaixa = !impactaCaixa(r);
              const tratamento = isTratamento(r);

              return (
                <tr key={r.id} style={rowStyleByTipo(r)}>
                  <td style={{ whiteSpace: "nowrap" }}>{brFromISO(r.data)}</td>

                  <td style={{ whiteSpace: "nowrap", fontWeight: 900 }}>
                    {tipoLabel(r.tipo)}
                  </td>

                  <td style={tdWrap}>
                    {r.categoria || "—"}
                    {tratamento ? <span style={chipTratamento}>Tratamento</span> : null}
                    {!tratamento && naoCaixa ? <span style={chipNaoCaixa}>Não impacta caixa</span> : null}
                  </td>

                  <td style={tdWrap}>{desc || "—"}</td>

                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 900,
                      color: naoCaixa || tratamento ? "#92400e" : "#065f46",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isEntrada ? moneyBR(entradaVal) : "—"}
                  </td>

                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 900,
                      color: naoCaixa || tratamento ? "#92400e" : "#991b1b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isSaida ? moneyBR(saidaVal) : "—"}
                  </td>

                  <td style={{ textAlign: "right", fontWeight: 900, whiteSpace: "nowrap" }}>
                    {moneyBR(r.__saldoAcumulado)}
                  </td>

                  <td style={{ textAlign: "center" }}>
                    {temInfo || naoCaixa || tratamento ? (
                      <button
                        type="button"
                        className="botao-editar"
                        onClick={() => abrirInfoLanc(r)}
                        title="Ver detalhes"
                        style={{
                          height: 28,
                          padding: "0 10px",
                          fontWeight: 900,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        i
                      </button>
                    ) : (
                      <span style={{ color: "#94a3b8", fontWeight: 900 }}>—</span>
                    )}
                  </td>

                  <td style={{ textAlign: "center" }}>
                    <div className="botoes-tabela" style={{ justifyContent: "center" }}>
                      <button
                        className="botao-editar"
                        onClick={() => {
                          setEditando(r);
                          setModalAberto(true);
                        }}
                        title="Editar"
                        disabled={loading}
                      >
                        ✏️
                      </button>

                      <button
                        className="btn-excluir"
                        onClick={() => excluirLancamento(r.id)}
                        title="Excluir"
                        disabled={loading}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal lançamento */}
      <ModalLancamentoFinanceiro
        aberto={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setEditando(null);
        }}
        onSalvar={salvarLancamento}
        categorias={categoriasSelect}
        origens={origensSelect}
        valorInicial={
          editando
            ? {
                id: editando.id,
                data: editando.data,
                tipo: editando.tipo,
                categoria: editando.categoria,
                origem: editando.origem,
                descricao: editando.descricao,
                quantidade: editando.quantidade,
                unidade: editando.unidade,
                valor_unitario: editando.valor_unitario,
                valor_total: editando.valor_total,
                observacao: editando.observacao,
                impacta_caixa: editando.impacta_caixa !== false,
              }
            : null
        }
      />

      {/* Modal período */}
      <ModalPeriodoFinanceiro
        aberto={modalPeriodoAberto}
        onClose={() => setModalPeriodoAberto(false)}
        valorInicial={periodo}
        onAplicar={({ ini, fim }) => {
          setPeriodo({ ini, fim });
          setModalPeriodoAberto(false);
        }}
      />

      {/* Modal Info */}
      {infoAberto && infoLanc ? (
        <div
          style={infoOverlay}
          onMouseDown={() => {
            setInfoAberto(false);
            setInfoLanc(null);
          }}
        >
          <div style={infoCard} onMouseDown={(e) => e.stopPropagation()}>
            <div style={infoHeader}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span>Detalhes do lançamento</span>
                <span style={{ opacity: 0.9, fontWeight: 800 }}>
                  • {brFromISO(infoLanc.data)} • {tipoLabel(infoLanc.tipo)}
                </span>
                {isTratamento(infoLanc) ? <span style={chipTratamento}>Tratamento</span> : null}
                {!impactaCaixa(infoLanc) && !isTratamento(infoLanc) ? (
                  <span style={chipNaoCaixa}>Não impacta caixa</span>
                ) : null}
              </div>
              <button
                type="button"
                style={btnFecharInfo}
                onClick={() => {
                  setInfoAberto(false);
                  setInfoLanc(null);
                }}
              >
                Fechar
              </button>
            </div>

            <div style={infoBody}>
              <div style={infoRow}>
                <div style={infoKey}>Tipo</div>
                <div style={infoVal}>{tipoLabel(infoLanc.tipo)}</div>
              </div>

              <div style={infoRow}>
                <div style={infoKey}>Categoria</div>
                <div style={infoVal}>{infoLanc.categoria || "—"}</div>
              </div>

              <div style={infoRow}>
                <div style={infoKey}>Descrição</div>
                <div style={infoVal}>{String(infoLanc.descricao || "").trim() || "—"}</div>
              </div>

              <div style={infoRow}>
                <div style={infoKey}>Origem</div>
                <div style={infoVal}>{infoLanc.origem || "—"}</div>
              </div>

              <div style={infoRow}>
                <div style={infoKey}>Impacta caixa</div>
                <div style={infoVal}>{impactaCaixa(infoLanc) ? "Sim" : "Não (apenas custo/controle)"}</div>
              </div>

              <div style={infoRow}>
                <div style={infoKey}>Quantidade / Unidade</div>
                <div style={infoVal}>
                  {infoLanc.quantidade != null ? infoLanc.quantidade : "—"}
                  {infoLanc.unidade ? ` ${infoLanc.unidade}` : ""}
                </div>
              </div>

              <div style={infoRow}>
                <div style={infoKey}>Valor unitário</div>
                <div style={infoVal}>
                  {infoLanc.valor_unitario != null ? moneyBR(infoLanc.valor_unitario) : "—"}
                </div>
              </div>

              <div style={infoRow}>
                <div style={infoKey}>Valor total</div>
                <div style={infoVal}>{moneyBR(infoLanc.valor_total)}</div>
              </div>

              <div style={infoRow}>
                <div style={infoKey}>Observação</div>
                <div style={infoVal}>{String(infoLanc.observacao || "").trim() || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
