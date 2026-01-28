// src/pages/Leite/AbaCMT.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { enqueue, kvGet, kvSet } from "../../offline/localDB";
import Select from "react-select";
import "../../styles/tabelaModerna.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

/* ============================================================
   IMPORTANTE
   - Banco deve ter: leite_cmt_testes.dia (DATE)
   - Índice único: (animal_id, dia, ordenha)
   - Horário (momento) é informativo. Chave = Dia + Ordenha.
============================================================ */

/* ---------- helpers data ---------- */
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toDateInputValue(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(dateStrYYYYMMDD, delta) {
  const [y, m, d] = dateStrYYYYMMDD.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toDateInputValue(dt);
}
function nowLocalDatetimeInput() {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = pad2(dt.getMonth() + 1);
  const d = pad2(dt.getDate());
  const hh = pad2(dt.getHours());
  const mm = pad2(dt.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}
function formatBRDate(isoOrDate) {
  const dt = new Date(isoOrDate);
  if (Number.isNaN(dt.getTime())) return String(isoOrDate || "");
  const dd = pad2(dt.getDate());
  const mm = pad2(dt.getMonth() + 1);
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function formatBRDateTime(isoOrTs) {
  const dt = new Date(isoOrTs);
  if (Number.isNaN(dt.getTime())) return String(isoOrTs || "");
  const dd = pad2(dt.getDate());
  const mm = pad2(dt.getMonth() + 1);
  const yyyy = dt.getFullYear();
  const hh = pad2(dt.getHours());
  const mi = pad2(dt.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

const CACHE_KEY_MEDICOES = "cache:leite:medicoes:list";

const getCacheList = async () => {
  const cached = await kvGet(CACHE_KEY_MEDICOES);
  return Array.isArray(cached) ? cached : [];
};

const upsertCacheList = (list, item, matchFn) => {
  const idx = list.findIndex(matchFn);
  const next = [...list];
  if (idx >= 0) {
    next[idx] = { ...next[idx], ...item };
  } else {
    next.push(item);
  }
  return next;
};

const gerarUUID = () => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (err) {
    console.warn("Falha ao gerar UUID com crypto.randomUUID", err);
  }
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

/* obtém “dia” do teste priorizando coluna dia */
function getDiaDoTeste(t) {
  if (t?.dia) return String(t.dia).slice(0, 10); // YYYY-MM-DD
  const dt = new Date(t?.momento);
  if (Number.isNaN(dt.getTime())) return "";
  return toDateInputValue(dt);
}

/* ---------- helpers CMT ---------- */
const CORES_RESULTADO = {
  "0": "#10b981",
  "+": "#facc15",
  "++": "#f97316",
  "+++": "#ef4444",
};

const QUARTOS = [
  { sigla: "PE", nome: "Posterior Esquerdo" },
  { sigla: "PD", nome: "Posterior Direito" },
  { sigla: "TE", nome: "Anterior Esquerdo" },
  { sigla: "TD", nome: "Anterior Direito" },
];

function scoreResultado(r) {
  if (r === "0") return 0;
  if (r === "+") return 1;
  if (r === "++") return 2;
  if (r === "+++") return 3;
  return 0;
}
function positivosCount(cmt) {
  const vals = ["TE", "TD", "PE", "PD"].map((q) => cmt?.[q]?.resultado || "");
  return vals.filter((v) => v && v !== "0").length;
}
function severidadeTotal(cmt) {
  const vals = ["TE", "TD", "PE", "PD"].map((q) => cmt?.[q]?.resultado || "");
  return vals.reduce((acc, v) => acc + scoreResultado(v), 0);
}

/* ---------- react-select: options ---------- */
const ordenhaOptions = [
  { value: null, label: "—" },
  { value: 1, label: "1ª ordenha" },
  { value: 2, label: "2ª ordenha" },
  { value: 3, label: "3ª ordenha" },
];

function labelOrdenha(v) {
  if (v === 1) return "1ª ordenha";
  if (v === 2) return "2ª ordenha";
  if (v === 3) return "3ª ordenha";
  return "—";
}

const resultadoOptions = [
  { value: "", label: "Selecione" },
  { value: "0", label: "Negativo (0)" },
  { value: "+", label: "+" },
  { value: "++", label: "++" },
  { value: "+++", label: "+++" },
];

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

/* ===================== COMPONENT ===================== */
export default function AbaCMT({ vaca, historicoInicial = [], onSalvarRegistro }) {
  if (!vaca?.id) {
    return (
      <div style={{ padding: "1rem", color: "crimson" }}>
        Vaca não encontrada (sem <strong>id</strong>).
      </div>
    );
  }

  const hoje = toDateInputValue(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);

  const [momento, setMomento] = useState(() => nowLocalDatetimeInput());
  const [ordenha, setOrdenha] = useState(null);

  /* ============================================================
     RESPONSÁVEIS (AGORA NO BANCO: leite_responsaveis)
     - Select usa option { value: id, label: nome }
     - Salva no CMT: operador = option.label (nome)
  ============================================================ */
  const [responsaveisOptions, setResponsaveisOptions] = useState([]);
  const [operadorOption, setOperadorOption] = useState(null);

  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [mostrarNovoResp, setMostrarNovoResp] = useState(false);

  const [obsGeral, setObsGeral] = useState("");

  const [cmt, setCmt] = useState({
    TE: { resultado: "", observacao: "" },
    TD: { resultado: "", observacao: "" },
    PE: { resultado: "", observacao: "" },
    PD: { resultado: "", observacao: "" },
  });

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [historico, setHistorico] = useState(() =>
    Array.isArray(historicoInicial) ? historicoInicial : []
  );
  const [testesDoDia, setTestesDoDia] = useState([]);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);

  // id do registro atual para (dia + ordenha). Controla UPDATE vs INSERT.
  const [testeEditandoId, setTesteEditandoId] = useState(null);

  // Lactações (partos)
  const [lactacoes, setLactacoes] = useState([]);
  const [lactacaoSelecionada, setLactacaoSelecionada] = useState(null);

  const colunasTabela = useMemo(
    () => [
      { key: "dia", label: "Dia" },
      { key: "datahora", label: "Data/Hora" },
      { key: "ordenha", label: "Ordenha" },
      { key: "te", label: "TE", className: "st-td-center" },
      { key: "td", label: "TD", className: "st-td-center" },
      { key: "pe", label: "PE", className: "st-td-center" },
      { key: "pd", label: "PD", className: "st-td-center" },
      { key: "responsavel", label: "Responsável" },
      { key: "acoes", label: "Ações", className: "st-td-right" },
    ],
    []
  );

  const handleColEnter = (colKey) => {
    setHoveredColKey(colKey);
    setHoveredRowId(null);
  };

  const handleCellEnter = (rowId, colKey) => {
    setHoveredRowId(rowId);
    setHoveredColKey(colKey);
  };

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ao trocar o dia, ajusta o “momento” (visual) */
  useEffect(() => {
    const dt = new Date();
    const hh = pad2(dt.getHours());
    const mm = pad2(dt.getMinutes());
    setMomento(`${diaSelecionado}T${hh}:${mm}`);
  }, [diaSelecionado]);

  const handleChangeQuarto = (quarto, campo, valor) => {
    setCmt((prev) => ({
      ...prev,
      [quarto]: { ...prev[quarto], [campo]: valor },
    }));
  };

  /* ---------- RESPONSÁVEIS: carregar do banco ---------- */
  const carregarResponsaveis = async () => {
    const { data, error } = await supabase
      .from("leite_responsaveis")
      .select("id, nome, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (!mountedRef.current) return;

    if (error) {
      console.warn("Falha ao carregar leite_responsaveis:", error);
      setErro((prev) => prev || "Aviso: não consegui carregar a lista de responsáveis.");
      setResponsaveisOptions([]);
      return;
    }

    const opts = (data || [])
      .filter((r) => (r?.nome || "").trim())
      .map((r) => ({
        value: r.id,
        label: String(r.nome).trim(),
      }));

    setResponsaveisOptions(opts);

    // se já existe um operador selecionado que não está mais na lista, mantém visualmente
    // (não força reset)
  };

  /* ---------- RESPONSÁVEIS: criar novo no banco ---------- */
  const salvarNovoResponsavelFn = async () => {
    const nome = (novoResponsavel || "").trim();
    if (!nome) return;

    setErro("");
    setSalvando(true);

    try {
      // tenta achar existente por nome (case-insensitive aproximado)
      // (sem índice UNIQUE, isso evita duplicar na maioria dos casos)
      const { data: jaExiste, error: errBusca } = await supabase
        .from("leite_responsaveis")
        .select("id, nome, ativo")
        .ilike("nome", nome)
        .limit(1);

      if (errBusca) throw errBusca;

      let idFinal = null;
      let nomeFinal = nome;

      if (jaExiste && jaExiste.length > 0) {
        idFinal = jaExiste[0].id;
        nomeFinal = String(jaExiste[0].nome || nome).trim();

        // se estava inativo, reativa
        if (jaExiste[0].ativo === false) {
          const { error: errReativar } = await supabase
            .from("leite_responsaveis")
            .update({ ativo: true })
            .eq("id", idFinal);
          if (errReativar) throw errReativar;
        }
      } else {
        const { data: ins, error: errIns } = await supabase
          .from("leite_responsaveis")
          .insert({ nome: nome, ativo: true })
          .select("id, nome")
          .single();

        if (errIns) throw errIns;
        idFinal = ins?.id;
        nomeFinal = String(ins?.nome || nome).trim();
      }

      await carregarResponsaveis();

      // seleciona automaticamente
      if (idFinal) setOperadorOption({ value: idFinal, label: nomeFinal });

      setNovoResponsavel("");
      setMostrarNovoResp(false);
      setSalvando(false);
    } catch (e) {
      const msgErro = e?.message || "Erro ao salvar responsável.";
      setErro(msgErro);
      setSalvando(false);
    }
  };

  const limparFormulario = () => {
    setTesteEditandoId(null);
    setOrdenha(null);
    setOperadorOption(null);
    setObsGeral("");
    setCmt({
      TE: { resultado: "", observacao: "" },
      TD: { resultado: "", observacao: "" },
      PE: { resultado: "", observacao: "" },
      PD: { resultado: "", observacao: "" },
    });
    setMomento(nowLocalDatetimeInput());
  };

  /* ---------- lactações via eventos_reprodutivos ---------- */
  const carregarLactacoes = async () => {
    const { data, error } = await supabase
      .from("eventos_reprodutivos")
      .select("id, tipo_evento, data_evento")
      .eq("animal_id", vaca.id)
      .in("tipo_evento", ["parto", "secagem"])
      .order("data_evento", { ascending: false });

    if (!mountedRef.current) return;

    if (error) {
      setErro((prev) => prev || "Aviso: não consegui carregar lactações (eventos reprodutivos).");
      setLactacoes([]);
      setLactacaoSelecionada(null);
      return;
    }

    const eventos = (data || [])
      .filter((e) => e?.data_evento)
      .map((e) => ({ tipo: e.tipo_evento, dt: new Date(e.data_evento) }))
      .filter((e) => !Number.isNaN(e.dt.getTime()));

    const partosDesc = eventos.filter((e) => e.tipo === "parto").sort((a, b) => b.dt - a.dt);
    const secagensDesc = eventos.filter((e) => e.tipo === "secagem").sort((a, b) => b.dt - a.dt);

    const options = partosDesc.map((p, idx) => {
      const fim =
        secagensDesc
          .map((s) => s.dt)
          .filter((dt) => dt > p.dt)
          .sort((a, b) => a - b)[0] || null;

      const label = `Lactação ${idx + 1} — início ${formatBRDate(p.dt)}${
        fim ? ` → ${formatBRDate(fim)}` : ""
      }`;
      return { label, value: { inicio: p.dt, fim } };
    });

    setLactacoes(options);
    if (options.length > 0) setLactacaoSelecionada((prev) => prev || options[0]);
    else setLactacaoSelecionada(null);
  };

  /* ---------- fetch CMT ---------- */
  const carregarHistoricoCompleto = async () => {
    setErro("");
    setCarregando(true);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cacheList = await getCacheList();
      const cached = cacheList
        .filter((item) => item?.table === "leite_cmt_testes" && item?.payload?.teste?.animal_id === vaca.id)
        .map((item) => {
          const teste = item?.payload?.teste || {};
          const quartos = item?.payload?.quartos || [];
          const map = { TE: {}, TD: {}, PE: {}, PD: {} };
          quartos.forEach((q) => {
            map[q.quarto] = { resultado: q.resultado || "", observacao: q.observacao || "" };
          });
          return {
            ...teste,
            cmt: {
              TE: map.TE || { resultado: "", observacao: "" },
              TD: map.TD || { resultado: "", observacao: "" },
              PE: map.PE || { resultado: "", observacao: "" },
              PD: map.PD || { resultado: "", observacao: "" },
            },
          };
        })
        .sort((a, b) => new Date(b.momento).getTime() - new Date(a.momento).getTime());

      if (!mountedRef.current) return;

      setHistorico(cached);
      const doDia = cached.filter((t) => getDiaDoTeste(t) === diaSelecionado);
      setTestesDoDia(doDia);
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase
      .from("leite_cmt_testes")
      .select(
        `
        id,
        animal_id,
        dia,
        momento,
        ordenha,
        operador,
        obs_geral,
        created_at,
        leite_cmt_quartos (
          id,
          quarto,
          resultado,
          observacao
        )
      `
      )
      .eq("animal_id", vaca.id)
      .order("momento", { ascending: false });

    if (!mountedRef.current) return;

    if (error) {
      setErro(error.message || "Erro ao carregar histórico de CMT.");
      setCarregando(false);
      return;
    }

    const normalizado = (data || []).map((t) => {
      const map = { TE: {}, TD: {}, PE: {}, PD: {} };
      (t.leite_cmt_quartos || []).forEach((q) => {
        map[q.quarto] = { resultado: q.resultado || "", observacao: q.observacao || "" };
      });

      return {
        ...t,
        cmt: {
          TE: map.TE || { resultado: "", observacao: "" },
          TD: map.TD || { resultado: "", observacao: "" },
          PE: map.PE || { resultado: "", observacao: "" },
          PD: map.PD || { resultado: "", observacao: "" },
        },
      };
    });

    setHistorico(normalizado);

    const cacheList = await getCacheList();
    let cacheAtualizado = cacheList;
    normalizado.forEach((registro) => {
      const payload = {
        teste: {
          id: registro.id,
          animal_id: registro.animal_id,
          dia: registro.dia,
          momento: registro.momento,
          ordenha: registro.ordenha,
          operador: registro.operador,
          obs_geral: registro.obs_geral,
          created_at: registro.created_at,
        },
        quartos: ["TE", "TD", "PE", "PD"].map((q) => ({
          teste_id: registro.id,
          quarto: q,
          resultado: registro.cmt?.[q]?.resultado || "",
          observacao: registro.cmt?.[q]?.observacao || "",
        })),
      };
      cacheAtualizado = upsertCacheList(
        cacheAtualizado,
        {
          id: registro.id,
          table: "leite_cmt_testes",
          payload,
          updatedAt: new Date().toISOString(),
        },
        (item) => item?.table === "leite_cmt_testes" && item?.id === registro.id
      );
    });
    if (cacheAtualizado !== cacheList) {
      await kvSet(CACHE_KEY_MEDICOES, cacheAtualizado);
    }

    const doDia = normalizado.filter((t) => getDiaDoTeste(t) === diaSelecionado);
    setTestesDoDia(doDia);

    setCarregando(false);
  };

  useEffect(() => {
    carregarHistoricoCompleto();
    carregarLactacoes();
    carregarResponsaveis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaca?.id]);

  useEffect(() => {
    const doDia = (historico || []).filter((t) => getDiaDoTeste(t) === diaSelecionado);
    setTestesDoDia(doDia);
  }, [diaSelecionado, historico]);

  /* ============================================================
     AUTO-PREENCHER PELO DIA + ORDENHA
     - Quando mudar diaSelecionado ou ordenha:
       - se existir registro => preenche e vira edição
       - se não existir => limpa e vira novo
  ============================================================ */
  const preencherFormularioComRegistro = (t) => {
    setTesteEditandoId(t.id);

    // momento: usa o momento salvo (informativo)
    const dt = new Date(t.momento);
    const local = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(
      dt.getHours()
    )}:${pad2(dt.getMinutes())}`;
    setMomento(local);

    setOrdenha(t.ordenha != null ? Number(t.ordenha) : null);

    // responsável: tenta casar pelo NOME salvo no CMT (operador)
    const opNome = (t.operador || "").trim();
    const opt = opNome
      ? responsaveisOptions.find((o) => (o.label || "").trim() === opNome) || {
          value: "__legacy__",
          label: opNome,
        }
      : null;
    setOperadorOption(opt && opt.label ? opt : null);

    setObsGeral(t.obs_geral || "");

    setCmt({
      TE: { resultado: t.cmt?.TE?.resultado || "", observacao: t.cmt?.TE?.observacao || "" },
      TD: { resultado: t.cmt?.TD?.resultado || "", observacao: t.cmt?.TD?.observacao || "" },
      PE: { resultado: t.cmt?.PE?.resultado || "", observacao: t.cmt?.PE?.observacao || "" },
      PD: { resultado: t.cmt?.PD?.resultado || "", observacao: t.cmt?.PD?.observacao || "" },
    });
  };

  const limparParaNovoRegistro = () => {
    setTesteEditandoId(null);
    // mantém dia e ordenha
    setOperadorOption(null);
    setObsGeral("");
    setCmt({
      TE: { resultado: "", observacao: "" },
      TD: { resultado: "", observacao: "" },
      PE: { resultado: "", observacao: "" },
      PD: { resultado: "", observacao: "" },
    });
    const dt = new Date();
    setMomento(`${diaSelecionado}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`);
  };

  useEffect(() => {
    if (!ordenha || !diaSelecionado) {
      setTesteEditandoId(null);
      return;
    }

    const encontrado = (historico || []).find(
      (t) => getDiaDoTeste(t) === diaSelecionado && Number(t.ordenha) === Number(ordenha)
    );

    if (encontrado) preencherFormularioComRegistro(encontrado);
    else limparParaNovoRegistro();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaSelecionado, ordenha]);

  // quando a lista de responsáveis carrega, se o formulário estava com legacy,
  // tenta “resolver” para o registro correto (mesmo nome)
  useEffect(() => {
    if (!operadorOption?.label) return;
    if (operadorOption.value !== "__legacy__") return;

    const nome = (operadorOption.label || "").trim();
    if (!nome) return;

    const achou = responsaveisOptions.find((o) => (o.label || "").trim() === nome);
    if (achou) setOperadorOption(achou);
  }, [responsaveisOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- salvar ---------- */
  const validarAntesDeSalvar = () => {
    if (!diaSelecionado) return "Informe o dia do teste.";
    if (!momento) return "Informe a data/hora do teste.";
    if (!ordenha) return "Selecione a ordenha (1ª, 2ª ou 3ª).";

    const temAlgum = ["TE", "TD", "PE", "PD"].some((q) => (cmt?.[q]?.resultado || "").trim() !== "");
    if (!temAlgum) return "Selecione pelo menos um resultado de CMT.";
    return "";
  };

  const buscarTesteExistentePorChave = async (animalId, dia, ord) => {
    if (!ord) return null;

    const { data, error } = await supabase
      .from("leite_cmt_testes")
      .select("id")
      .eq("animal_id", animalId)
      .eq("dia", dia)
      .eq("ordenha", Number(ord))
      .maybeSingle();

    if (error) {
      console.warn("Falha ao checar existente por (animal,dia,ordenha):", error);
      return null;
    }
    return data?.id || null;
  };

  const salvarNoBanco = async () => {
    const msg = validarAntesDeSalvar();
    if (msg) {
      alert(msg);
      return;
    }

    setErro("");
    setSalvando(true);

    // SALVA NO CMT COMO TEXTO (compatível com seu banco atual):
    // operador = nome escolhido na tabela leite_responsaveis
    const operadorNome = operadorOption?.label ? String(operadorOption.label).trim() : null;

    const payloadTeste = {
      animal_id: vaca.id,
      dia: diaSelecionado,
      momento: new Date(momento).toISOString(),
      ordenha: Number(ordenha),
      operador: operadorNome,
      obs_geral: (obsGeral || "").trim() || null,
    };

    try {
      let testeId = testeEditandoId;
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

      if (!testeId) {
        if (!isOffline) {
          const existenteId = await buscarTesteExistentePorChave(vaca.id, diaSelecionado, ordenha);
          if (existenteId) {
            testeId = existenteId;
            setTesteEditandoId(existenteId);
          }
        } else {
          const cacheList = await getCacheList();
          const existente = cacheList.find(
            (item) =>
              item?.table === "leite_cmt_testes" &&
              item?.payload?.teste?.animal_id === vaca.id &&
              item?.payload?.teste?.dia === diaSelecionado &&
              Number(item?.payload?.teste?.ordenha) === Number(ordenha)
          );
          if (existente?.id) {
            testeId = existente.id;
            setTesteEditandoId(existente.id);
          }
        }
      }

      if (isOffline) {
        if (!testeId) {
          testeId = gerarUUID();
          setTesteEditandoId(testeId);
        }

        const payloadQuartos = ["TE", "TD", "PE", "PD"].map((q) => ({
          teste_id: testeId,
          quarto: q,
          resultado: (cmt?.[q]?.resultado || "").trim() || null,
          observacao: (cmt?.[q]?.observacao || "").trim() || null,
        }));

        const cacheList = await getCacheList();
        const payload = {
          teste: { ...payloadTeste, id: testeId },
          quartos: payloadQuartos,
        };
        const cacheAtualizado = upsertCacheList(
          cacheList,
          {
            id: testeId,
            table: "leite_cmt_testes",
            payload,
            updatedAt: new Date().toISOString(),
          },
          (item) =>
            item?.table === "leite_cmt_testes" &&
            item?.payload?.teste?.animal_id === vaca.id &&
            item?.payload?.teste?.dia === diaSelecionado &&
            Number(item?.payload?.teste?.ordenha) === Number(ordenha)
        );
        await kvSet(CACHE_KEY_MEDICOES, cacheAtualizado);
        await enqueue("leite_cmt_testes.upsert", payload);

        if (typeof onSalvarRegistro === "function") {
          onSalvarRegistro({ teste_id: testeId, ...payloadTeste, quartos: payloadQuartos });
        }

        alert("✅ CMT salvo/atualizado com sucesso (offline).");
        await carregarHistoricoCompleto();
        setSalvando(false);
        return;
      }

      if (testeId) {
        const { error: errUp } = await supabase
          .from("leite_cmt_testes")
          .update(payloadTeste)
          .eq("id", testeId);

        if (errUp) throw errUp;
      } else {
        const { data: ins, error: errIns } = await supabase
          .from("leite_cmt_testes")
          .insert(payloadTeste)
          .select("id")
          .single();

        if (errIns) throw errIns;
        testeId = ins?.id;
        setTesteEditandoId(testeId);
      }

      const payloadQuartos = ["TE", "TD", "PE", "PD"].map((q) => ({
        teste_id: testeId,
        quarto: q,
        resultado: (cmt?.[q]?.resultado || "").trim() || null,
        observacao: (cmt?.[q]?.observacao || "").trim() || null,
      }));

      const { error: errQuartos } = await supabase
        .from("leite_cmt_quartos")
        .upsert(payloadQuartos, { onConflict: "teste_id,quarto" });

      if (errQuartos) throw errQuartos;

      if (typeof onSalvarRegistro === "function") {
        onSalvarRegistro({ teste_id: testeId, ...payloadTeste, quartos: payloadQuartos });
      }

      alert("✅ CMT salvo/atualizado com sucesso.");
      await carregarHistoricoCompleto();
      setSalvando(false);
    } catch (e) {
      const msgErro = e?.message || "Erro ao salvar CMT.";
      setErro(msgErro);
      setSalvando(false);
    }
  };

  /* ---------- deletar ---------- */
  const deletarTeste = async (testeId) => {
    if (!testeId) return;
    const ok = window.confirm(
      "Tem certeza que deseja excluir este teste de CMT? (Os 4 quartos serão excluídos junto.)"
    );
    if (!ok) return;

    setErro("");
    setSalvando(true);

    const { error } = await supabase.from("leite_cmt_testes").delete().eq("id", testeId);

    if (error) {
      setErro(error.message || "Erro ao excluir.");
      setSalvando(false);
      return;
    }

    if (testeEditandoId === testeId) limparFormulario();
    await carregarHistoricoCompleto();
    setSalvando(false);
  };

  /* ============================================================
     FILTRO POR LACTAÇÃO
  ============================================================ */
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

    return (historico || []).filter((t) => {
      const ms = new Date(t.momento).getTime();
      return ms >= ini && ms <= fim;
    });
  }, [historico, intervaloLactacao]);

  const historicoAsc = useMemo(() => {
    return [...historicoFiltradoLactacao].sort(
      (a, b) => new Date(a.momento).getTime() - new Date(b.momento).getTime()
    );
  }, [historicoFiltradoLactacao]);

  /* ---------- gráficos ---------- */
  const dadosGraficoPorQuarto = useMemo(() => {
    return historicoAsc.map((t) => ({
      id: t.id,
      x: formatBRDateTime(t.momento),
      TE: scoreResultado(t.cmt?.TE?.resultado || "0"),
      TD: scoreResultado(t.cmt?.TD?.resultado || "0"),
      PE: scoreResultado(t.cmt?.PE?.resultado || "0"),
      PD: scoreResultado(t.cmt?.PD?.resultado || "0"),
      positivos: positivosCount(t.cmt),
      severidade: severidadeTotal(t.cmt),
      operador: t.operador || "—",
      ordenhaLabel: labelOrdenha(t.ordenha),
    }));
  }, [historicoAsc]);

  const dadosResumoLactacao = useMemo(() => {
    return historicoAsc.map((t) => ({
      id: t.id,
      x: formatBRDateTime(t.momento),
      positivos: positivosCount(t.cmt),
      severidade: severidadeTotal(t.cmt),
      operador: t.operador || "—",
      ordenhaLabel: labelOrdenha(t.ordenha),
    }));
  }, [historicoAsc]);

  const TooltipCustom = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload || {};

    return (
      <div style={tooltipBox}>
        <div style={{ fontWeight: 900, marginBottom: 4 }}>{label}</div>

        <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>
          <strong>Ordenha:</strong> {p.ordenhaLabel || "—"}
        </div>

        <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>
          <strong>Responsável:</strong> {p.operador || "—"}
        </div>

        {"TE" in p && (
          <>
            <div>
              <strong>TE:</strong> {p.TE}
            </div>
            <div>
              <strong>TD:</strong> {p.TD}
            </div>
            <div>
              <strong>PE:</strong> {p.PE}
            </div>
            <div>
              <strong>PD:</strong> {p.PD}
            </div>
            <div style={{ marginTop: 6 }}>
              <strong>Quartos positivos:</strong> {p.positivos} &nbsp;|&nbsp;{" "}
              <strong>Severidade:</strong> {p.severidade}
            </div>
          </>
        )}

        {"positivos" in p && !("TE" in p) && (
          <div style={{ marginTop: 4 }}>
            <strong>Quartos positivos:</strong> {p.positivos}
          </div>
        )}

        {"severidade" in p && !("TE" in p) && (
          <div style={{ marginTop: 4 }}>
            <strong>Severidade (0–12):</strong> {p.severidade}
          </div>
        )}
      </div>
    );
  };

  /* ---------- UI: QuartoBox ---------- */
  const QuartoBox = ({ sigla, nome }) => {
    const r = cmt?.[sigla]?.resultado || "";
    const value = resultadoOptions.find((o) => o.value === r) || resultadoOptions[0];

    return (
      <div style={box}>
        <div
          style={{
            width: 24,
            height: 24,
            margin: "0 auto 0.75rem",
            borderRadius: "50%",
            backgroundColor: CORES_RESULTADO[r] || "#e2e8f0",
          }}
        />
        <strong style={{ marginBottom: "0.5rem", display: "block" }}>
          {nome} ({sigla})
        </strong>

        <div style={{ marginBottom: "0.5rem", textAlign: "left" }}>
          <Select
            styles={selectBaseStyles}
            options={resultadoOptions}
            value={value}
            onChange={(opt) => handleChangeQuarto(sigla, "resultado", opt?.value ?? "")}
            isSearchable={false}
          />
        </div>

        <input
          placeholder="Observações do quarto"
          value={cmt?.[sigla]?.observacao || ""}
          onChange={(e) => handleChangeQuarto(sigla, "observacao", e.target.value)}
          style={input}
        />
      </div>
    );
  };

  /* ---------- render ---------- */
  return (
    <div style={{ padding: "1.5rem", fontFamily: "Poppins, system-ui, -apple-system" }}>
      {/* Cabeçalho */}
      <div style={headerRow}>
        <h3 style={{ margin: 0, fontWeight: 800, fontSize: "1.15rem" }}>
          📋 Registro CMT — Vaca {vaca.numero}
          {vaca.brinco ? ` / ${vaca.brinco}` : ""}
        </h3>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setDiaSelecionado((d) => addDays(d, -1))}
            style={btnGhost}
            title="Dia anterior"
          >
            ◀
          </button>

          <input
            type="date"
            value={diaSelecionado}
            onChange={(e) => setDiaSelecionado(e.target.value)}
            style={{ ...input, width: 170, height: 38 }}
          />

          <button
            type="button"
            onClick={() => setDiaSelecionado((d) => addDays(d, 1))}
            style={btnGhost}
            title="Próximo dia"
          >
            ▶
          </button>
        </div>
      </div>

      {erro && (
        <div style={erroBox}>
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {/* Formulário: momento + responsável + ordenha */}
      <div style={linha}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <label style={label}>Data/Hora do teste (informativo)</label>
          <input
            type="datetime-local"
            value={momento}
            onChange={(e) => setMomento(e.target.value)}
            style={input}
          />
          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            A chave é <strong>Dia + Ordenha</strong>. Ao trocar dia/ordenha, o sistema puxa o registro automaticamente.
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={label}>Ordenha</label>
          <Select
            styles={selectBaseStyles}
            options={ordenhaOptions}
            value={ordenhaOptions.find((o) => o.value === ordenha) || ordenhaOptions[0]}
            onChange={(opt) => setOrdenha(opt?.value ?? null)}
            isSearchable={false}
          />
        </div>

        {/* RESPONSÁVEL em REACT-SELECT (BUSCA DA TABELA leite_responsaveis) */}
        <div style={{ flex: 1.2, minWidth: 320 }}>
          <label style={label}>Responsável</label>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <Select
                styles={selectBaseStyles}
                options={responsaveisOptions}
                value={operadorOption}
                onChange={(opt) => setOperadorOption(opt)}
                isSearchable={true}
                placeholder="Selecione..."
                noOptionsMessage={() => "Nenhum responsável cadastrado"}
              />
            </div>

            <button
              onClick={() => setMostrarNovoResp((v) => !v)}
              style={btnIcon}
              title="Adicionar novo responsável"
              type="button"
            >
              ＋
            </button>
          </div>

          {mostrarNovoResp && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                value={novoResponsavel}
                onChange={(e) => setNovoResponsavel(e.target.value)}
                style={input}
                placeholder="Novo nome"
              />
              <button
                type="button"
                onClick={salvarNovoResponsavelFn}
                style={{ ...btnPrimary, opacity: salvando ? 0.7 : 1 }}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid dos 4 quartos */}
      <div style={grid4}>
        {QUARTOS.map((q) => (
          <QuartoBox key={q.sigla} sigla={q.sigla} nome={q.nome} />
        ))}
      </div>

      {/* Observação geral (abaixo do teste) */}
      <div style={{ marginTop: "1rem" }}>
        <label style={label}>Observação geral (opcional)</label>
        <textarea
          value={obsGeral}
          onChange={(e) => setObsGeral(e.target.value)}
          style={{ ...input, height: 80, resize: "vertical" }}
          placeholder="Ex.: teste repetido após queda de produção / suspeita clínica..."
        />
      </div>

      {/* Ações */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" onClick={limparFormulario} style={btnGhost}>
            Limpar
          </button>

          {testeEditandoId && (
            <span style={pillEditando}>
              Editando: <strong>{diaSelecionado}</strong> / <strong>{labelOrdenha(ordenha)}</strong>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={salvarNoBanco}
          style={{ ...btnPrimary, opacity: salvando ? 0.7 : 1 }}
          disabled={salvando}
        >
          {salvando ? "Salvando..." : testeEditandoId ? "💾 Atualizar" : "💾 Salvar"}
        </button>
      </div>

      <div style={divisor} />

      {/* ================== CONTROLE DE LACTAÇÃO ================== */}
      <div style={secHeader}>
        <h4 style={secTitle}>🐄 Lactação (filtro dos gráficos)</h4>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          {lactacoes.length === 0
            ? "Sem partos cadastrados em eventos reprodutivos."
            : "Selecione qual lactação deseja analisar."}
        </div>
      </div>

      <div style={{ ...card, marginBottom: "1rem" }}>
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
                ? `${formatBRDate(intervaloLactacao.inicio)} → ${formatBRDate(intervaloLactacao.fim)}`
                : "—"}
            </div>
          </div>

          <div style={{ flex: 0.7, minWidth: 220 }}>
            <label style={label}>Testes na lactação</label>
            <div style={{ ...input, background: "#f9fafb" }}>{historicoFiltradoLactacao.length}</div>
          </div>
        </div>
      </div>

      {/* ================== GRÁFICO PRINCIPAL (POR QUARTO) ================== */}
      <div style={secHeader}>
        <h4 style={secTitle}>📈 Curva por quarto (TE/TD/PE/PD)</h4>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          {carregando ? "Carregando..." : `${historicoFiltradoLactacao.length} teste(s) no filtro atual`}
        </div>
      </div>

      <div style={card}>
        <div style={chartTitle}>Evolução do CMT por quarto (0–3) na lactação selecionada</div>

        {dadosGraficoPorQuarto.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Sem dados para o gráfico.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={dadosGraficoPorQuarto}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} domain={[0, 3]} />
              <Tooltip content={<TooltipCustom />} />
              <Legend />
              <Line type="monotone" dataKey="TE" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="TD" stroke="#7c3aed" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="PE" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="PD" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ================== CURVAS RESUMO ================== */}
      <div style={grid2}>
        <div style={card}>
          <div style={chartTitle}>Quartos positivos (0–4) ao longo da lactação</div>
          {dadosResumoLactacao.length === 0 ? (
            <div style={{ color: "#6b7280" }}>Sem dados para o gráfico.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dadosResumoLactacao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} domain={[0, 4]} />
                <Tooltip content={<TooltipCustom />} />
                <Line type="monotone" dataKey="positivos" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card}>
          <div style={chartTitle}>Severidade total (0–12) ao longo da lactação</div>
          {dadosResumoLactacao.length === 0 ? (
            <div style={{ color: "#6b7280" }}>Sem dados para o gráfico.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dadosResumoLactacao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} domain={[0, 12]} />
                <Tooltip content={<TooltipCustom />} />
                <Line type="monotone" dataKey="severidade" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ================== REGISTROS DO DIA ================== */}
      <div style={{ marginTop: "1.25rem" }}>
        <div style={secHeader}>
          <h4 style={secTitle}>📅 Registros do dia</h4>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {carregando ? "Carregando..." : `${testesDoDia.length} teste(s) em ${diaSelecionado}`}
          </div>
        </div>

        <div style={card}>
          {testesDoDia.length === 0 ? (
            <div style={{ color: "#6b7280" }}>Nenhum CMT registrado neste dia.</div>
          ) : (
            <div className="st-table-container">
              <div className="st-table-wrap">
                <div className="st-scroll" style={{ overflowX: "auto" }}>
                  <table
                    className="st-table st-table--darkhead"
                    onMouseLeave={() => {
                      setHoveredRowId(null);
                      setHoveredColKey(null);
                    }}
                  >
                    <thead>
                      <tr>
                        {colunasTabela.map((coluna) => (
                          <th
                            key={coluna.key}
                            className={coluna.className || ""}
                            onMouseEnter={() => handleColEnter(coluna.key)}
                          >
                            <span className="st-th-label">{coluna.label}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {testesDoDia.map((t) => {
                        const rowId = t.id ?? t.momento ?? t.dia;
                        const rowHover = hoveredRowId === rowId;
                        return (
                          <tr key={rowId} className={rowHover ? "st-row-hover" : ""}>
                            <td
                              className={`${hoveredColKey === "dia" ? "st-col-hover" : ""} ${
                                rowHover ? "st-row-hover" : ""
                              } ${rowHover && hoveredColKey === "dia" ? "st-cell-hover" : ""}`}
                              onMouseEnter={() => handleCellEnter(rowId, "dia")}
                            >
                              {getDiaDoTeste(t)}
                            </td>
                            <td
                              className={`${hoveredColKey === "datahora" ? "st-col-hover" : ""} ${
                                rowHover ? "st-row-hover" : ""
                              } ${rowHover && hoveredColKey === "datahora" ? "st-cell-hover" : ""}`}
                              onMouseEnter={() => handleCellEnter(rowId, "datahora")}
                            >
                              {formatBRDateTime(t.momento)}
                            </td>
                            <td
                              className={`${hoveredColKey === "ordenha" ? "st-col-hover" : ""} ${
                                rowHover ? "st-row-hover" : ""
                              } ${rowHover && hoveredColKey === "ordenha" ? "st-cell-hover" : ""}`}
                              onMouseEnter={() => handleCellEnter(rowId, "ordenha")}
                            >
                              {t.ordenha ? labelOrdenha(Number(t.ordenha)) : "—"}
                            </td>

                            {["TE", "TD", "PE", "PD"].map((q) => {
                              const r = t.cmt?.[q]?.resultado || "";
                              const colKey = q.toLowerCase();
                              return (
                                <td
                                  key={q}
                                  className={`st-td-center ${hoveredColKey === colKey ? "st-col-hover" : ""} ${
                                    rowHover ? "st-row-hover" : ""
                                  } ${rowHover && hoveredColKey === colKey ? "st-cell-hover" : ""}`}
                                  onMouseEnter={() => handleCellEnter(rowId, colKey)}
                                >
                                  <span
                                    className="st-pill"
                                    style={{
                                      minWidth: 44,
                                      justifyContent: "center",
                                      background: r ? CORES_RESULTADO[r] || "#e5e7eb" : "#f3f4f6",
                                      color: "#111827",
                                    }}
                                    title={t.cmt?.[q]?.observacao || ""}
                                  >
                                    {r || "—"}
                                  </span>
                                </td>
                              );
                            })}

                            <td
                              className={`${hoveredColKey === "responsavel" ? "st-col-hover" : ""} ${
                                rowHover ? "st-row-hover" : ""
                              } ${rowHover && hoveredColKey === "responsavel" ? "st-cell-hover" : ""}`}
                              onMouseEnter={() => handleCellEnter(rowId, "responsavel")}
                            >
                              {t.operador || "—"}
                            </td>

                            <td
                              className={`st-td-right ${hoveredColKey === "acoes" ? "st-col-hover" : ""} ${
                                rowHover ? "st-row-hover" : ""
                              } ${rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""}`}
                              onMouseEnter={() => handleCellEnter(rowId, "acoes")}
                            >
                              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                <button
                                  type="button"
                                  onClick={() => deletarTeste(t.id)}
                                  className="st-btn"
                                  style={{ borderColor: "#fecaca", background: "#fee2e2", color: "#991b1b" }}
                                  title="Excluir"
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- estilos locais ---------------- */
const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  flexWrap: "wrap",
  marginBottom: "1rem",
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
  fontWeight: 700,
  color: "#111827",
};

const grid4 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "1.2rem",
  marginTop: "1.25rem",
};

const box = {
  border: "1px solid #e5e7eb",
  borderRadius: "1rem",
  padding: "1.05rem",
  textAlign: "center",
  boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
  backgroundColor: "#fafafa",
};

const linha = {
  display: "flex",
  gap: "1.2rem",
  marginTop: "0.75rem",
  flexWrap: "wrap",
};

const btnPrimary = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "0.65rem 1.25rem",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 8px 18px rgba(37,99,235,0.22)",
};

const btnGhost = {
  background: "#f9fafb",
  color: "#111827",
  border: "1px solid #e5e7eb",
  padding: "0.55rem 0.85rem",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: 800,
};

const btnIcon = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  width: 38,
  height: 38,
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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

const divisor = {
  marginTop: "1.25rem",
  marginBottom: "1.1rem",
  borderTop: "1px solid #e5e7eb",
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

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "1rem",
  padding: "1rem",
  background: "#fff",
  boxShadow: "0 10px 18px rgba(0,0,0,0.06)",
};

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
  marginTop: "1rem",
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
