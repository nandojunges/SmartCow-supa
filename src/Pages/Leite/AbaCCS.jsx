// src/pages/Leite/AbaCCS.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import { enqueue, kvGet, kvSet } from "../../offline/localDB";
import Select from "react-select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  ReferenceArea,
} from "recharts";

import "../../styles/botoes.css"; // ajuste o caminho se necessário

let MEMO_ABA_CCS = {
  data: null,
  lastAt: 0,
};

/* ===================== helpers ===================== */
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toDateInputValue(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatBRDate(iso) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return String(iso || "");
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}
function formatBRDateObj(dt) {
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return "—";
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
const toInt = (s) => {
  const n = parseInt(onlyDigits(s), 10);
  return Number.isFinite(n) ? n : 0;
};
const toPtBRNumber = (n) => Number(n || 0).toLocaleString("pt-BR");

const CACHE_CCS_KEY = "cache:leite:ccs:list";

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
  return Array.isArray(cache)
    ? cache
    : Array.isArray(cache?.registros)
    ? cache.registros
    : [];
}

function upsertCcsCache(list, item) {
  const next = [...list];
  const idx = next.findIndex((c) => {
    if (item?.id && c?.id) return String(item.id) === String(c.id);
    return (
      String(c?.animal_id || "") === String(item?.animal_id || "") &&
      String(c?.dia || "").slice(0, 10) === String(item?.dia || "").slice(0, 10)
    );
  });
  if (idx >= 0) {
    next[idx] = { ...next[idx], ...item };
  } else {
    next.push(item);
  }
  return next;
}

/* ===================== react-select styles ===================== */
const selectBaseStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: 12,
    borderColor: state.isFocused ? "#2563eb" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(37,99,235,0.15)" : "none",
    minHeight: 38,
    fontSize: "0.92rem",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px" }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, paddingRight: 10 }),
  menu: (base) => ({ ...base, borderRadius: 12, overflow: "hidden" }),
};

/* ===================== thresholds CCS ===================== */
const CCS_OK = 200000; // <= OK
const CCS_ALERTA = 500000; // > OK e <= ALERTA => Atenção; acima => Alerta

function faixaCCS(v) {
  const n = Number(v || 0);
  if (n <= CCS_OK) return { label: "OK", color: "#22c55e" };
  if (n <= CCS_ALERTA) return { label: "Atenção", color: "#f59e0b" };
  return { label: "Alerta", color: "#ef4444" };
}

/* ===================== COMPONENT ===================== */
export default function AbaCCS({ vaca }) {
  const { fazendaAtualId } = useFazenda();
  const memoData = MEMO_ABA_CCS.data || {};
  if (!vaca?.id) {
    return (
      <div style={{ padding: "1rem", color: "crimson" }}>
        Vaca não encontrada (sem <strong>id</strong>).
      </div>
    );
  }

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => (mountedRef.current = false);
  }, []);

  const hoje = toDateInputValue(new Date());

  // formulário
  const [dia, setDia] = useState(hoje);
  const [ccsTxt, setCcsTxt] = useState("");
  const [metodo, setMetodo] = useState("");
  const [observacao, setObservacao] = useState("");

  // selects
  const [labs, setLabs] = useState([]);
  const [resp, setResp] = useState([]);
  const [labSel, setLabSel] = useState(null);
  const [respSel, setRespSel] = useState(null);

  // cadastro rápido
  const [mostrarNovoLab, setMostrarNovoLab] = useState(false);
  const [novoLab, setNovoLab] = useState("");
  const [mostrarNovoResp, setMostrarNovoResp] = useState(false);
  const [novoResp, setNovoResp] = useState("");

  // histórico
  const [carregando, setCarregando] = useState(() => !memoData.historico);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [historico, setHistorico] = useState(() => memoData.historico ?? []); // histórico completo
  const [registroEditandoId, setRegistroEditandoId] = useState(null);

  // lactações
  const [lactacoes, setLactacoes] = useState(() => memoData.lactacoes ?? []);
  const [lactacaoSelecionada, setLactacaoSelecionada] = useState(null);

  useEffect(() => {
    const memo = MEMO_ABA_CCS.data;
    if (memo?.historico === historico && memo?.lactacoes === lactacoes) return;
    MEMO_ABA_CCS.data = {
      ...(memo || {}),
      historico,
      lactacoes,
    };
    MEMO_ABA_CCS.lastAt = Date.now();
  }, [historico, lactacoes]);

  const labsOptions = useMemo(
    () => (labs || []).map((l) => ({ value: l.id, label: l.nome })),
    [labs]
  );
  const respOptions = useMemo(
    () => (resp || []).map((r) => ({ value: r.id, label: r.nome })),
    [resp]
  );

  /* ---------- carregar listas ---------- */
  const carregarListas = async () => {
    const [r1, r2] = await Promise.all([
      withFazendaId(
        supabase.from("leite_laboratorios").select("id,nome,ativo"),
        fazendaAtualId
      )
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      withFazendaId(
        supabase.from("leite_responsaveis").select("id,nome,ativo"),
        fazendaAtualId
      )
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

    if (!mountedRef.current) return;

    if (r1.error) console.warn("Erro labs:", r1.error);
    if (r2.error) console.warn("Erro resp:", r2.error);

    setLabs(r1.data || []);
    setResp(r2.data || []);
  };

  /* ---------- lactações via eventos_reprodutivos ---------- */
  const carregarLactacoes = async () => {
    const { data, error } = await withFazendaId(
      supabase.from("eventos_reprodutivos").select("id, tipo_evento, data_evento"),
      fazendaAtualId
    )
      .eq("animal_id", vaca.id)
      .in("tipo_evento", ["parto", "secagem"])
      .order("data_evento", { ascending: false });

    if (!mountedRef.current) return;

    if (error) {
      console.warn("Erro lactações:", error);
      setLactacoes([]);
      setLactacaoSelecionada(null);
      return;
    }

    const eventos = (data || [])
      .filter((e) => e?.data_evento)
      .map((e) => ({ tipo: e.tipo_evento, dt: new Date(e.data_evento) }))
      .filter((e) => !Number.isNaN(e.dt.getTime()));

    const partosDesc = eventos
      .filter((e) => e.tipo === "parto")
      .sort((a, b) => b.dt - a.dt);
    const secagensDesc = eventos
      .filter((e) => e.tipo === "secagem")
      .sort((a, b) => b.dt - a.dt);

    const options = partosDesc.map((p, idx) => {
      const fim =
        secagensDesc
          .map((s) => s.dt)
          .filter((dt) => dt > p.dt)
          .sort((a, b) => a - b)[0] || null;

      const label = `Lactação ${idx + 1} — início ${formatBRDateObj(p.dt)}${
        fim ? ` → ${formatBRDateObj(fim)}` : ""
      }`;

      return { label, value: { inicio: p.dt, fim } };
    });

    setLactacoes(options);
    if (options.length > 0) setLactacaoSelecionada((prev) => prev || options[0]);
    else setLactacaoSelecionada(null);
  };

  /* ---------- carregar histórico CCS ---------- */
  const carregarHistorico = async () => {
    setErro("");
    const memoFresh = MEMO_ABA_CCS.data && Date.now() - MEMO_ABA_CCS.lastAt < 30000;
    const hasData = Array.isArray(historico) && historico.length > 0;
    if (memoFresh && hasData) {
      setCarregando(false);
      setAtualizando(false);
      return;
    }
    if (hasData) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cache = normalizeCacheList(await kvGet(CACHE_CCS_KEY));
      const filtrado = cache.filter((h) => String(h?.animal_id || "") === String(vaca.id));
      setHistorico(filtrado);
      setCarregando(false);
      setAtualizando(false);
      return;
    }

    const { data, error } = await withFazendaId(
      supabase
        .from("leite_ccs_registros")
        .select(
          `
        id,
        animal_id,
        dia,
        ccs,
        metodo,
        observacao,
        laboratorio_id,
        responsavel_id,
        leite_laboratorios: laboratorio_id ( id, nome ),
        leite_responsaveis: responsavel_id ( id, nome )
      `
        ),
      fazendaAtualId
    )
      .eq("animal_id", vaca.id)
      .order("dia", { ascending: false });

    if (!mountedRef.current) return;

    if (error) {
      setErro(error.message || "Erro ao carregar histórico de CCS.");
      setCarregando(false);
      setAtualizando(false);
      return;
    }

    setHistorico(data || []);
    const cacheAtual = normalizeCacheList(await kvGet(CACHE_CCS_KEY));
    const atualizado = (data || []).reduce((acc, item) => upsertCcsCache(acc, item), cacheAtual);
    await kvSet(CACHE_CCS_KEY, atualizado);
    setCarregando(false);
    setAtualizando(false);
  };

  useEffect(() => {
    if (!fazendaAtualId) {
      return;
    }
    carregarListas();
    carregarHistorico();
    carregarLactacoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaca?.id, fazendaAtualId]);

  /* ===========================================================
     AUTO-PREENCHER PELO DIA (histórico completo)
  =========================================================== */
  useEffect(() => {
    if (!dia) return;

    const existente = (historico || []).find((h) => String(h.dia).slice(0, 10) === dia);
    if (existente) {
      setRegistroEditandoId(existente.id);
      setCcsTxt(existente.ccs != null ? toPtBRNumber(existente.ccs) : "");
      setMetodo(existente.metodo || "");
      setObservacao(existente.observacao || "");

      const labId = existente.laboratorio_id || null;
      const respId = existente.responsavel_id || null;

      setLabSel(
        labId ? { value: labId, label: existente.leite_laboratorios?.nome || "—" } : null
      );
      setRespSel(
        respId ? { value: respId, label: existente.leite_responsaveis?.nome || "—" } : null
      );

      setMostrarNovoLab(false);
      setMostrarNovoResp(false);
      setNovoLab("");
      setNovoResp("");
    } else {
      setRegistroEditandoId(null);
      setCcsTxt("");
      setMetodo("");
      setObservacao("");
      setLabSel(null);
      setRespSel(null);
      setMostrarNovoLab(false);
      setMostrarNovoResp(false);
      setNovoLab("");
      setNovoResp("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia, historico]);

  /* ===========================================================
     FILTRO POR LACTAÇÃO (gráficos + navegação por registros)
  =========================================================== */
  const intervaloLactacao = useMemo(() => {
    const v = lactacaoSelecionada?.value;
    if (!v?.inicio) return null;
    const inicio = v.inicio;
    const fim = v.fim ? v.fim : new Date();
    return { inicio, fim };
  }, [lactacaoSelecionada]);

  const historicoFiltradoLactacao = useMemo(() => {
    if (!intervaloLactacao) return [...(historico || [])];
    const ini = intervaloLactacao.inicio.getTime();
    const fim = intervaloLactacao.fim.getTime();

    return (historico || []).filter((h) => {
      const ms = new Date(String(h.dia).slice(0, 10)).getTime();
      return ms >= ini && ms <= fim;
    });
  }, [historico, intervaloLactacao]);

  const hasHistorico = historico.length > 0;

  const datasDisponiveis = useMemo(() => {
    const uniq = new Set(
      (historicoFiltradoLactacao || []).map((h) => String(h.dia).slice(0, 10))
    );
    return Array.from(uniq).sort((a, b) => new Date(a) - new Date(b));
  }, [historicoFiltradoLactacao]);

  const pularParaRegistro = (delta) => {
    if (!datasDisponiveis.length) return;

    const atual = String(dia || "").slice(0, 10);
    const idx = datasDisponiveis.indexOf(atual);

    if (idx === -1) {
      const alvo =
        delta > 0
          ? datasDisponiveis.find((d) => d > atual) || datasDisponiveis[datasDisponiveis.length - 1]
          : [...datasDisponiveis].reverse().find((d) => d < atual) || datasDisponiveis[0];
      setDia(alvo);
      return;
    }

    const novoIdx = idx + delta;
    if (novoIdx < 0 || novoIdx >= datasDisponiveis.length) return;

    setDia(datasDisponiveis[novoIdx]);
  };

  /* ---------- cadastrar lab/resp ---------- */
  const cadastrarLab = async () => {
    const nome = (novoLab || "").trim();
    if (!nome) return;

    setSalvando(true);
    setErro("");

    const { data, error } = await supabase
      .from("leite_laboratorios")
      .insert({ nome, ativo: true, fazenda_id: fazendaAtualId })
      .select("id,nome")
      .single();

    if (!mountedRef.current) return;

    if (error) {
      setErro(error.message || "Erro ao cadastrar laboratório.");
      setSalvando(false);
      return;
    }

    await carregarListas();
    setLabSel({ value: data.id, label: data.nome });
    setNovoLab("");
    setMostrarNovoLab(false);
    setSalvando(false);
  };

  const cadastrarResp = async () => {
    const nome = (novoResp || "").trim();
    if (!nome) return;

    setSalvando(true);
    setErro("");

    const { data, error } = await supabase
      .from("leite_responsaveis")
      .insert({ nome, ativo: true, fazenda_id: fazendaAtualId })
      .select("id,nome")
      .single();

    if (!mountedRef.current) return;

    if (error) {
      setErro(error.message || "Erro ao cadastrar responsável.");
      setSalvando(false);
      return;
    }

    await carregarListas();
    setRespSel({ value: data.id, label: data.nome });
    setNovoResp("");
    setMostrarNovoResp(false);
    setSalvando(false);
  };

  /* ---------- salvar CCS (upsert por animal+dia) ---------- */
  const salvarCCS = async () => {
    const ccs = toInt(ccsTxt);

    if (!dia) {
      alert("Informe a data (dia).");
      return;
    }
    if (!ccs || ccs <= 0) {
      alert("Informe um valor de CCS válido.");
      return;
    }

    setErro("");
    setSalvando(true);

    const payload = {
      fazenda_id: fazendaAtualId,
      animal_id: vaca.id,
      dia,
      ccs,
      laboratorio_id: labSel?.value || null,
      responsavel_id: respSel?.value || null,
      metodo: (metodo || "").trim() || null,
      observacao: (observacao || "").trim() || null,
    };

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const cacheAtual = normalizeCacheList(await kvGet(CACHE_CCS_KEY));
        const existente = cacheAtual.find(
          (h) =>
            String(h?.animal_id || "") === String(vaca.id) &&
            String(h?.dia || "").slice(0, 10) === String(dia)
        );
        const registroId = registroEditandoId || existente?.id || gerarUUID();

        const registroLocal = {
          ...payload,
          id: registroId,
          leite_laboratorios: labSel
            ? { id: labSel.value, nome: labSel.label }
            : existente?.leite_laboratorios || null,
          leite_responsaveis: respSel
            ? { id: respSel.value, nome: respSel.label }
            : existente?.leite_responsaveis || null,
        };

        const cacheAtualizado = upsertCcsCache(cacheAtual, registroLocal);
        await kvSet(CACHE_CCS_KEY, cacheAtualizado);
        await enqueue("leite_ccs_registros.upsert", { ...payload, id: registroId });

        setRegistroEditandoId(registroId);
        setHistorico(
          cacheAtualizado.filter((h) => String(h?.animal_id || "") === String(vaca.id))
        );
        setSalvando(false);
        return;
      }

      const { data, error } = await supabase
        .from("leite_ccs_registros")
        .upsert(payload, { onConflict: "animal_id,dia" })
        .select("id")
        .single();

      if (!mountedRef.current) return;
      if (error) throw error;

      setRegistroEditandoId(data?.id || registroEditandoId || null);

      alert(registroEditandoId ? "✅ CCS atualizado." : "✅ CCS salvo.");
      await carregarHistorico();
      setSalvando(false);
    } catch (e) {
      setErro(e?.message || "Erro ao salvar CCS.");
      setSalvando(false);
    }
  };

  /* ---------- deletar CCS ---------- */
  const deletarCCS = async (id) => {
    if (!id) return;
    const ok = window.confirm("Tem certeza que deseja excluir este registro de CCS?");
    if (!ok) return;

    setErro("");
    setSalvando(true);

    const { error } = await withFazendaId(
      supabase.from("leite_ccs_registros").delete(),
      fazendaAtualId
    ).eq("id", id);

    if (!mountedRef.current) return;

    if (error) {
      setErro(error.message || "Erro ao excluir.");
      setSalvando(false);
      return;
    }

    if (registroEditandoId === id) {
      setRegistroEditandoId(null);
      setCcsTxt("");
      setMetodo("");
      setObservacao("");
      setLabSel(null);
      setRespSel(null);
    }

    await carregarHistorico();
    setSalvando(false);
  };

  /* ---------- dados para gráficos (usando filtro lactação) ---------- */
  const historicoAsc = useMemo(() => {
    return [...(historicoFiltradoLactacao || [])].sort(
      (a, b) => new Date(a.dia).getTime() - new Date(b.dia).getTime()
    );
  }, [historicoFiltradoLactacao]);

  const dadosGrafico = useMemo(() => {
    return historicoAsc.map((h) => {
      const f = faixaCCS(h.ccs);
      return {
        id: h.id,
        iso: String(h.dia).slice(0, 10),
        x: formatBRDate(h.dia),
        ccs: Number(h.ccs || 0),
        faixa: f.label,
        cor: f.color,
        laboratorio: h.leite_laboratorios?.nome || "—",
        responsavel: h.leite_responsaveis?.nome || "—",
        metodo: h.metodo || "—",
        observacao: h.observacao || "",
      };
    });
  }, [historicoAsc]);

  const TooltipCustom = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload || {};
    return (
      <div style={tooltipBox}>
        <div style={{ fontWeight: 900, marginBottom: 4 }}>{label}</div>
        <div>
          <strong>CCS:</strong> {toPtBRNumber(p.ccs)} células/mL
        </div>

        <div style={{ marginTop: 6, fontSize: 12, color: "#374151" }}>
          <div>
            <strong>Faixa:</strong>{" "}
            <span style={{ fontWeight: 900, color: p.cor }}>{p.faixa}</span>
          </div>
          <div>
            <strong>Lab:</strong> {p.laboratorio}
          </div>
          <div>
            <strong>Resp:</strong> {p.responsavel}
          </div>
          <div>
            <strong>Método:</strong> {p.metodo}
          </div>
        </div>

        {p.observacao ? (
          <div style={{ marginTop: 8, fontSize: 12, color: "#111827" }}>
            <strong>Obs:</strong> {p.observacao}
          </div>
        ) : null}
      </div>
    );
  };

  const faixaAtual = faixaCCS(toInt(ccsTxt));

  // barras finas + scroll horizontal
  const barMinWidth = 18;
  const chartWidth = Math.max(640, dadosGrafico.length * barMinWidth);

  // limite superior para ReferenceArea vermelho
  const yMax =
    dadosGrafico.length > 0
      ? Math.max(...dadosGrafico.map((d) => d.ccs), CCS_ALERTA + 1)
      : CCS_ALERTA + 1;

  /* ===================== render ===================== */
  return (
    <div style={{ padding: "1.5rem", fontFamily: "Poppins, system-ui, -apple-system" }}>
      {/* Cabeçalho */}
      <div style={headerRow}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: "1.15rem" }}>
            🧪 Registro de análises de CCS
          </h3>
          <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
            Tendência e risco de mastite subclínica por vaca.
          </div>
        </div>

        <div style={pill}>
          Vaca nº {vaca.numero || vaca.id}
          {vaca.brinco ? ` — Brinco ${vaca.brinco}` : ""}
        </div>
      </div>

      {erro && (
        <div style={erroBox}>
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {/* ================== REGISTRO (PRIMEIRO) ================== */}
      <div style={card}>
        <div style={gridForm}>
          {/* Dia */}
          <div>
            <label style={label}>Data (dia)</label>

            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              <button
                type="button"
                style={btnGhostCircle}
                onClick={() => pularParaRegistro(-1)}
                title="Voltar para o registro anterior (pula dias sem registro)"
                disabled={!datasDisponiveis.length}
              >
                ◀
              </button>

              <input
                type="date"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                style={{ ...input, height: 42 }}
              />

              <button
                type="button"
                style={btnGhostCircle}
                onClick={() => pularParaRegistro(1)}
                title="Ir para o próximo registro (pula dias sem registro)"
                disabled={!datasDisponiveis.length}
              >
                ▶
              </button>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              {datasDisponiveis.length
                ? `Navegação por registros (no filtro atual): ${datasDisponiveis.length} dia(s) com CCS.`
                : "Sem registros de CCS no filtro atual."}
            </div>
          </div>

          {/* CCS */}
          <div>
            <label style={label}>CCS (células/mL)</label>
            <input
              type="text"
              value={ccsTxt}
              onChange={(e) => {
                const n = onlyDigits(e.target.value);
                setCcsTxt(n ? toPtBRNumber(parseInt(n, 10)) : "");
              }}
              placeholder="Ex.: 250.000"
              style={{ ...input, height: 42 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              Referência: OK ≤ {toPtBRNumber(CCS_OK)} | Alerta ≥ {toPtBRNumber(CCS_ALERTA)}
              {ccsTxt ? (
                <span style={{ marginLeft: 10, fontWeight: 900, color: faixaAtual.color }}>
                  • {faixaAtual.label}
                </span>
              ) : null}
            </div>
          </div>

          {/* Método */}
          <div>
            <label style={label}>Método (opcional)</label>
            <input
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              placeholder="Ex.: Contagem eletrônica / laboratório"
              style={{ ...input, height: 42 }}
            />
          </div>

          {/* Laboratório */}
          <div>
            <label style={label}>Laboratório (opcional)</label>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <Select
                  styles={selectBaseStyles}
                  options={labsOptions}
                  value={labSel}
                  onChange={(opt) => setLabSel(opt)}
                  isSearchable
                  isClearable
                  placeholder="Selecione..."
                  noOptionsMessage={() => "Nenhum laboratório cadastrado"}
                />
              </div>

              <button
                type="button"
                className="botao-plus"
                title="Adicionar novo laboratório"
                onClick={() => setMostrarNovoLab((v) => !v)}
              >
                ＋
              </button>
            </div>

            {mostrarNovoLab && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  value={novoLab}
                  onChange={(e) => setNovoLab(e.target.value)}
                  style={{ ...input, height: 42 }}
                  placeholder="Novo nome"
                />
                <button
                  type="button"
                  className="botao-acao pequeno"
                  onClick={cadastrarLab}
                  disabled={salvando}
                >
                  Salvar
                </button>
              </div>
            )}
          </div>

          {/* Responsável */}
          <div>
            <label style={label}>Responsável (opcional)</label>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <Select
                  styles={selectBaseStyles}
                  options={respOptions}
                  value={respSel}
                  onChange={(opt) => setRespSel(opt)}
                  isSearchable
                  isClearable
                  placeholder="Selecione..."
                  noOptionsMessage={() => "Nenhum responsável cadastrado"}
                />
              </div>

              <button
                type="button"
                className="botao-plus"
                title="Adicionar novo responsável"
                onClick={() => setMostrarNovoResp((v) => !v)}
              >
                ＋
              </button>
            </div>

            {mostrarNovoResp && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  value={novoResp}
                  onChange={(e) => setNovoResp(e.target.value)}
                  style={{ ...input, height: 42 }}
                  placeholder="Novo nome"
                />
                <button
                  type="button"
                  className="botao-acao pequeno"
                  onClick={cadastrarResp}
                  disabled={salvando}
                >
                  Salvar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Observações */}
        <div style={{ marginTop: "1rem" }}>
          <label style={label}>Observações (opcional)</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            style={{ ...input, height: 90, resize: "vertical" }}
            placeholder="Resultados, contexto do lote, histórico, suspeitas..."
          />
        </div>

        {/* Ações */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "1rem",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {registroEditandoId ? (
              <span style={pillEditando}>
                Editando: <strong>{dia}</strong>
              </span>
            ) : (
              <span style={{ fontSize: 12, color: "#6b7280" }}>Novo registro (dia sem CCS ainda)</span>
            )}
          </div>

          <button
            type="button"
            className="botao-acao"
            onClick={salvarCCS}
            disabled={salvando}
            style={{ opacity: salvando ? 0.7 : 1 }}
          >
            {salvando ? "Salvando..." : registroEditandoId ? "💾 Atualizar" : "💾 Salvar"}
          </button>
        </div>
      </div>

      {/* ================== LACTAÇÃO (TEM QUE FICAR ANTES DOS GRÁFICOS) ================== */}
      <div style={{ marginTop: "1.1rem" }}>
        <div style={secHeader}>
          <h4 style={secTitle}>🐄 Lactação (filtro dos gráficos e navegação)</h4>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Selecione a lactação para analisar CCS apenas naquele período.
          </div>
        </div>

        <div style={card}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 320 }}>
              <label style={label}>Lactação</label>
              <Select
                styles={selectBaseStyles}
                options={lactacoes}
                value={lactacaoSelecionada}
                onChange={(opt) => setLactacaoSelecionada(opt)}
                isSearchable={false}
                placeholder="Selecione a lactação..."
              />
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <label style={label}>Intervalo usado</label>
              <div style={{ ...input, background: "#f9fafb" }}>
                {intervaloLactacao
                  ? `${formatBRDateObj(intervaloLactacao.inicio)} → ${formatBRDateObj(
                      intervaloLactacao.fim
                    )}`
                  : "—"}
              </div>
            </div>

            <div style={{ flex: 0.7, minWidth: 220 }}>
              <label style={label}>Registros na lactação</label>
              <div style={{ ...input, background: "#f9fafb" }}>
                {historicoFiltradoLactacao.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================== GRÁFICOS ================== */}
      <div style={{ marginTop: "1.25rem" }}>
        <div style={secHeader}>
          <h4 style={secTitle}>📈 Evolução da CCS</h4>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {carregando && !hasHistorico
              ? "Carregando..."
              : atualizando
              ? "Atualizando..."
              : `${historicoFiltradoLactacao.length} registro(s) no filtro`}
          </div>
        </div>

        <div style={grid2}>
          {/* Curva */}
          <div style={card}>
            <div style={chartTitle}>Curva (linha)</div>
            {dadosGrafico.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Sem dados para o gráfico.</div>
            ) : (
              <div style={{ width: "100%", overflowX: "auto" }}>
                <div style={{ minWidth: Math.max(640, dadosGrafico.length * 14) }}>
                  <LineChart
                    width={Math.max(640, dadosGrafico.length * 14)}
                    height={260}
                    data={dadosGrafico}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis />
                    <ReferenceArea y1={0} y2={CCS_OK} fill="#22c55e" fillOpacity={0.08} />
                    <ReferenceArea y1={CCS_OK} y2={CCS_ALERTA} fill="#f59e0b" fillOpacity={0.1} />
                    <ReferenceArea y1={CCS_ALERTA} y2={yMax} fill="#ef4444" fillOpacity={0.08} />
                    <Tooltip content={<TooltipCustom />} />
                    <Line
                      type="monotone"
                      dataKey="ccs"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </div>
              </div>
            )}
          </div>

          {/* Barras + interpretação logo abaixo */}
          <div style={card}>
            <div style={chartTitle}>Faixa de risco (barras finas + fundo por faixa)</div>

            {dadosGrafico.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Sem dados para o gráfico.</div>
            ) : (
              <div style={{ width: "100%", overflowX: "auto", paddingBottom: 6 }}>
                <div style={{ minWidth: chartWidth }}>
                  <BarChart width={chartWidth} height={260} data={dadosGrafico} barCategoryGap={6}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis />
                    <ReferenceArea y1={0} y2={CCS_OK} fill="#22c55e" fillOpacity={0.1} />
                    <ReferenceArea y1={CCS_OK} y2={CCS_ALERTA} fill="#f59e0b" fillOpacity={0.12} />
                    <ReferenceArea y1={CCS_ALERTA} y2={yMax} fill="#ef4444" fillOpacity={0.1} />
                    <Tooltip content={<TooltipCustom />} />
                    <Bar dataKey="ccs" barSize={10} radius={[8, 8, 0, 0]}>
                      {dadosGrafico.map((e) => (
                        <Cell key={e.id} fill={e.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </div>
              </div>
            )}

            {dadosGrafico.length > 0 ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                Role horizontalmente para ver todas as barras quando houver muitos registros.
              </div>
            ) : null}

            {/* ================== INTERPRETAÇÃO (1 linha por faixa, largura total) ================== */}
            <div style={{ marginTop: "0.85rem" }}>
              <div style={faixaLinha}>
                <span
                  style={{
                    ...faixaPill,
                    background: "rgba(34,197,94,0.12)",
                    borderColor: "rgba(34,197,94,0.35)",
                    color: "#166534",
                  }}
                >
                  OK (≤ {toPtBRNumber(CCS_OK)})
                </span>
                <span style={faixaTexto}>
                  Perde menos produção e mantém melhor qualidade do leite; reduz risco de penalizações e aumenta chance de bônus.
                </span>
              </div>

              <div style={faixaLinha}>
                <span
                  style={{
                    ...faixaPill,
                    background: "rgba(245,158,11,0.14)",
                    borderColor: "rgba(245,158,11,0.4)",
                    color: "#92400e",
                  }}
                >
                  Atenção ({toPtBRNumber(CCS_OK)}–{toPtBRNumber(CCS_ALERTA)})
                </span>
                <span style={faixaTexto}>
                  Perde litros gradualmente e piora qualidade; indica risco maior de mastite subclínica (revisar rotina de ordenha, higiene e monitorar quartos).
                </span>
              </div>

              <div style={faixaLinha}>
                <span
                  style={{
                    ...faixaPill,
                    background: "rgba(239,68,68,0.12)",
                    borderColor: "rgba(239,68,68,0.35)",
                    color: "#7f1d1d",
                  }}
                >
                  Alerta (&gt; {toPtBRNumber(CCS_ALERTA)})
                </span>
                <span style={faixaTexto}>
                  Perde mais: queda importante de litros, maior descarte de leite, custo de tratamento e maior risco de cronificação/recorrência.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================== HISTÓRICO ================== */}
      <div style={{ marginTop: "1.25rem" }}>
        <div style={secHeader}>
          <h4 style={secTitle}>📝 Histórico (no filtro)</h4>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Ao mudar a data acima, o formulário puxa o registro automaticamente.
          </div>
        </div>

        <div style={card}>
          {historicoAsc.length === 0 ? (
            <div style={{ color: "#6b7280" }}>Nenhuma CCS cadastrada ainda (no filtro).</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[...historicoAsc].reverse().map((h) => {
                const f = faixaCCS(h.ccs);
                return (
                  <li
                    key={h.id}
                    style={{
                      padding: "0.65rem 0.2rem",
                      borderBottom: "1px dashed #e5e7eb",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {formatBRDate(h.dia)} — {toPtBRNumber(h.ccs)} células/mL{" "}
                        <span style={{ color: f.color, fontWeight: 900 }}>({f.label})</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                        Lab: {h.leite_laboratorios?.nome || "—"} | Resp: {h.leite_responsaveis?.nome || "—"} | Método:{" "}
                        {h.metodo || "—"}
                      </div>
                      {h.observacao ? (
                        <div style={{ fontSize: 13, color: "#374151", marginTop: 6 }}>
                          {h.observacao}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        ID: {String(h.id).slice(0, 8)}…
                      </span>

                      <button
                        type="button"
                        onClick={() => deletarCCS(h.id)}
                        style={{ ...btnSmall, borderColor: "#fecaca" }}
                        title="Excluir"
                        disabled={salvando}
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== styles locais ===================== */
const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  flexWrap: "wrap",
  marginBottom: "1rem",
};

const pill = {
  fontSize: "0.85rem",
  color: "#4b5563",
  background: "#f3f4f6",
  padding: "0.25rem 0.7rem",
  borderRadius: "999px",
};

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "1rem",
  padding: "1rem",
  background: "#fff",
  boxShadow: "0 10px 18px rgba(0,0,0,0.06)",
};

const gridForm = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "1rem",
};

const input = {
  width: "100%",
  padding: "0.55rem 0.7rem",
  borderRadius: "0.7rem",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  display: "block",
  fontSize: "0.92rem",
};

const label = {
  display: "block",
  fontSize: "0.9rem",
  marginBottom: "0.25rem",
  fontWeight: 800,
  color: "#111827",
};

const secHeader = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "1rem",
  flexWrap: "wrap",
  marginBottom: "0.6rem",
};

const secTitle = { margin: 0, fontSize: "1.02rem", fontWeight: 900 };

const chartTitle = {
  fontWeight: 900,
  marginBottom: "0.75rem",
  fontSize: "0.95rem",
  color: "#111827",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "1rem",
};

const pillEditando = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  color: "#1f2937",
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
  padding: "0.35rem 0.7rem",
  borderRadius: 999,
};

const erroBox = {
  marginTop: "0.75rem",
  marginBottom: "0.75rem",
  padding: "0.75rem 0.9rem",
  borderRadius: "0.9rem",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#991b1b",
};

const tooltipBox = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "0.5rem 0.75rem",
  fontSize: "0.85rem",
};

const btnSmall = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "0.35rem 0.6rem",
  cursor: "pointer",
  fontWeight: 800,
};

const btnGhostCircle = {
  background: "#f9fafb",
  color: "#111827",
  border: "1px solid #e5e7eb",
  width: 44,
  height: 44,
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

/* === interpretação em 1 linha (largura total) === */
const faixaLinha = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: "0.55rem 0.6rem",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#fff",
  marginTop: 10,
};

const faixaPill = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.25rem 0.6rem",
  borderRadius: 999,
  border: "1px solid",
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const faixaTexto = {
  flex: 1,
  fontSize: 13,
  color: "#374151",
  lineHeight: 1.35,
};
