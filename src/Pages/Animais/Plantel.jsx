// src/pages/Animais/Plantel.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import { kvGet, kvSet } from "../../offline/localDB";
import "../../styles/tabelaModerna.css";
import FichaAnimal from "./FichaAnimal/FichaAnimal";

let MEMO_PLANTEL = { data: null, lastAt: 0 };

/* =========================
   Helpers de data
========================= */
function parseDateFlexible(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;

  // ISO yyyy-mm-dd
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = +m[1],
      mo = +m[2],
      d = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

  // BR dd/mm/yyyy
  m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const d = +m[1],
      mo = +m[2],
      y = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

  return null;
}

function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return null;
  const ms = dateA.getTime() - dateB.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function idadeTexto(nascimento) {
  const dt = parseDateFlexible(nascimento);
  if (!dt) return "—";

  const hoje = new Date();
  let meses =
    (hoje.getFullYear() - dt.getFullYear()) * 12 +
    (hoje.getMonth() - dt.getMonth());

  if (hoje.getDate() < dt.getDate()) meses -= 1;
  if (meses < 0) meses = 0;

  const anos = Math.floor(meses / 12);
  const rem = meses % 12;
  return `${anos}a ${rem}m`;
}

function formatProducao(valor) {
  const num = Number(valor);
  if (!Number.isFinite(num)) return "—";
  return num.toFixed(1).replace(".", ",");
}

/* =========================
   Cálculos via repro_eventos
========================= */
function calcDel({ ultimoPartoISO, ultimaSecagemISO }) {
  const parto = parseDateFlexible(ultimoPartoISO);
  if (!parto) return null;

  const secagem = parseDateFlexible(ultimaSecagemISO);
  if (secagem && secagem.getTime() > parto.getTime()) return null;

  return daysBetween(new Date(), parto);
}

function calcSituacaoProdutiva({
  sexo,
  mesesIdade,
  ultimoPartoISO,
  ultimaSecagemISO,
}) {
  if (sexo === "macho") return "não lactante";

  const del = calcDel({ ultimoPartoISO, ultimaSecagemISO });
  if (Number.isFinite(del)) return "lactante";

  const parto = parseDateFlexible(ultimoPartoISO);
  const secagem = parseDateFlexible(ultimaSecagemISO);

  if (secagem && (!parto || secagem.getTime() >= parto.getTime())) return "seca";
  if ((mesesIdade ?? 0) < 24) return "novilha";
  return "não lactante";
}

function calcSituacaoReprodutiva({ ultimaIAISO, ultimoPartoISO, ultimaSecagemISO }) {
  const ia = parseDateFlexible(ultimaIAISO);
  const parto = parseDateFlexible(ultimoPartoISO);
  const secagem = parseDateFlexible(ultimaSecagemISO);

  if (!ia) return "vazia";

  const temEventoDepoisDaIA =
    (parto && parto.getTime() > ia.getTime()) ||
    (secagem && secagem.getTime() > ia.getTime());

  if (!temEventoDepoisDaIA) return "inseminada";
  if (parto && parto.getTime() > ia.getTime()) return "PEV / pós-parto";
  return "vazia";
}

/* =========================
   Helpers cache (NOVO)
========================= */
function normalizeReproResumo(obj) {
  if (!obj || typeof obj !== "object") return {};
  return obj;
}

// fallback: se ainda não tem reproResumo (primeiro carregamento) usa colunas do animal
function fallbackFromAnimal(a) {
  // em animais, você pode ter: ultima_ia, ultimo_parto, (talvez ultima_secagem)
  // (aqui tratamos os nomes mais comuns)
  return {
    ultimaIAISO: a?.ultima_ia || a?.ultimaIAISO || null,
    ultimoPartoISO: a?.ultimo_parto || a?.ultimoPartoISO || null,
    ultimaSecagemISO: a?.ultima_secagem || a?.ultimaSecagemISO || null,
  };
}

/* =========================
   Componente
========================= */
export default function Plantel({ isOnline = navigator.onLine }) {
  const { fazendaAtualId } = useFazenda();

  const CACHE_ANIMAIS = "cache:animais:list";
  const CACHE_FALLBACK = "cache:animais:plantel:v1";

  // ✅ NOVOS caches do Plantel (local devido p/ reproResumo)
  const CACHE_PLANTEL_BUNDLE = `cache:plantel:bundle:${fazendaAtualId || "none"}:v1`;
  const CACHE_REPRO_RESUMO = `cache:plantel:reproResumo:${fazendaAtualId || "none"}:v1`;

  const memoData = MEMO_PLANTEL.data || {};
  const [animais, setAnimais] = useState(() => memoData.animais ?? []);
  const [racaMap, setRacaMap] = useState(() => memoData.racaMap ?? {});
  const [lotes, setLotes] = useState(() => memoData.lotes ?? []);
  const [reproResumo, setReproResumo] = useState(() => memoData.reproResumo ?? {});

  const [carregando, setCarregando] = useState(() => !memoData.animais);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [offlineAviso, setOfflineAviso] = useState("");
  const [loteAviso, setLoteAviso] = useState("");

  // UI
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);
  const [ultProducao, setUltProducao] = useState({});
  const [editingLoteId, setEditingLoteId] = useState(null);
  const [openPopoverKey, setOpenPopoverKey] = useState(null);
  const popoverRef = useRef(null);
  const triggerRefs = useRef({});
  const [popoverStyle, setPopoverStyle] = useState({
    left: "50%",
    transform: "translateX(-50%)",
  });

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filtros, setFiltros] = useState({
    lote: "__ALL__",
    situacaoProdutiva: "__ALL__",
    situacaoReprodutiva: "__ALL__",
    origem: "__ALL__",
    animalRaca: "__ALL__",
    animalSexo: "__ALL__",
    animalBusca: "",
  });

  const LOTE_FIELD = "lote_id";
  const LOTE_TABLE = "lotes";

  // ficha
  const [animalSelecionado, setAnimalSelecionado] = useState(null);
  const abrirFichaAnimal = (animal) => setAnimalSelecionado(animal);
  const fecharFichaAnimal = () => setAnimalSelecionado(null);

  // memo
  useEffect(() => {
    MEMO_PLANTEL.data = { animais, lotes, racaMap, reproResumo };
    MEMO_PLANTEL.lastAt = Date.now();
  }, [animais, lotes, racaMap, reproResumo]);

  /* =========================
     Loaders
  ========================= */
  const carregarAnimais = useCallback(async () => {
    const res = await withFazendaId(
      supabase.from("animais").select("*"),
      fazendaAtualId
    )
      .eq("ativo", true)
      .order("numero", { ascending: true });

    if (res.error) throw res.error;
    const lista = Array.isArray(res.data) ? res.data : [];
    setAnimais(lista);
    return lista;
  }, [fazendaAtualId]);

  const carregarLotes = useCallback(async () => {
    const { data, error } = await withFazendaId(
      supabase.from(LOTE_TABLE).select("*"),
      fazendaAtualId
    ).order("id", { ascending: true });

    if (error) return [];
    const lista = Array.isArray(data) ? data : [];
    setLotes(lista);
    return lista;
  }, [LOTE_TABLE, fazendaAtualId]);

  const carregarRacas = useCallback(async () => {
    const { data, error } = await withFazendaId(
      supabase.from("racas").select("id, nome"),
      fazendaAtualId
    );
    if (error) throw error;

    const map = {};
    (data || []).forEach((r) => (map[r.id] = r.nome));
    setRacaMap(map);
    return map;
  }, [fazendaAtualId]);

  // ✅ busca eventos reprodutivos e monta resumo por animal (e salva em cache local devido)
  const carregarResumoRepro = useCallback(
    async (animalIds) => {
      if (!fazendaAtualId) return {};
      if (!Array.isArray(animalIds) || animalIds.length === 0) {
        setReproResumo({});
        await kvSet(CACHE_REPRO_RESUMO, {});
        return {};
      }

      const { data, error } = await withFazendaId(
        supabase.from("repro_eventos").select("animal_id,tipo,data_evento"),
        fazendaAtualId
      )
        .in("animal_id", animalIds)
        .in("tipo", ["IA", "PARTO", "SECAGEM"])
        .order("data_evento", { ascending: false })
        .limit(5000);

      if (error) {
        console.error("Erro ao carregar repro_eventos:", error);
        setReproResumo({});
        await kvSet(CACHE_REPRO_RESUMO, {});
        return {};
      }

      const rows = Array.isArray(data) ? data : [];

      const map = {};
      for (const ev of rows) {
        const id = ev?.animal_id;
        if (!id) continue;

        if (!map[id])
          map[id] = {
            ultimaIAISO: null,
            ultimoPartoISO: null,
            ultimaSecagemISO: null,
          };

        if (ev.tipo === "IA" && !map[id].ultimaIAISO) map[id].ultimaIAISO = ev.data_evento;
        if (ev.tipo === "PARTO" && !map[id].ultimoPartoISO) map[id].ultimoPartoISO = ev.data_evento;
        if (ev.tipo === "SECAGEM" && !map[id].ultimaSecagemISO) map[id].ultimaSecagemISO = ev.data_evento;
      }

      setReproResumo(map);
      await kvSet(CACHE_REPRO_RESUMO, map);
      return map;
    },
    [fazendaAtualId, CACHE_REPRO_RESUMO]
  );

  const carregarDoCache = useCallback(async () => {
    // 1) tenta bundle do plantel (novo)
    const bundle = await kvGet(CACHE_PLANTEL_BUNDLE);
    if (bundle && typeof bundle === "object") {
      if (Array.isArray(bundle.animais)) setAnimais(bundle.animais.filter((a) => a?.ativo !== false));
      if (Array.isArray(bundle.lotes)) setLotes(bundle.lotes);
      if (bundle.racaMap && typeof bundle.racaMap === "object") setRacaMap(bundle.racaMap);
      if (bundle.reproResumo && typeof bundle.reproResumo === "object")
        setReproResumo(normalizeReproResumo(bundle.reproResumo));
      return true;
    }

    // 2) cai pro cache antigo de animais (mantém teu fluxo)
    const prim = await kvGet(CACHE_ANIMAIS);
    const fallback = prim ? null : await kvGet(CACHE_FALLBACK);
    const cache = prim ?? fallback;

    if (cache) {
      if (Array.isArray(cache)) {
        setAnimais(cache.filter((a) => a?.ativo !== false));
      } else if (Array.isArray(cache.animais)) {
        setAnimais(cache.animais.filter((a) => a?.ativo !== false));
      }
    }

    // 3) tenta reproResumo separado
    const repro = await kvGet(CACHE_REPRO_RESUMO);
    if (repro && typeof repro === "object") setReproResumo(normalizeReproResumo(repro));

    return Boolean(cache || repro);
  }, [
    CACHE_ANIMAIS,
    CACHE_FALLBACK,
    CACHE_PLANTEL_BUNDLE,
    CACHE_REPRO_RESUMO,
  ]);

  useEffect(() => {
    if (!fazendaAtualId) {
      setCarregando(false);
      setAtualizando(false);
      return;
    }

    let ativo = true;

    (async () => {
      const memoFresh = MEMO_PLANTEL.data && Date.now() - MEMO_PLANTEL.lastAt < 30000;
      const hasData = Array.isArray(animais) && animais.length > 0;

      if (memoFresh && hasData) {
        setCarregando(false);
        setAtualizando(false);
        return;
      }

      setErro("");
      setLoteAviso("");
      setOfflineAviso("");

      if (hasData) setAtualizando(true);
      else setCarregando(true);

      try {
        if (!isOnline) {
          const ok = await carregarDoCache();
          if (!ok) {
            setOfflineAviso(
              "Sem dados offline ainda. Conecte na internet uma vez para baixar os animais."
            );
          }
          return;
        }

        const [animaisData, lotesData, racasData] = await Promise.all([
          carregarAnimais(),
          carregarLotes(),
          carregarRacas(),
        ]);

        const ids = (animaisData || []).map((a) => a.id).filter(Boolean);
        const reproMap = await carregarResumoRepro(ids);

        // ✅ salva bundle completo (local devido do Plantel)
        await kvSet(CACHE_PLANTEL_BUNDLE, {
          animais: animaisData,
          lotes: lotesData,
          racaMap: racasData,
          reproResumo: reproMap,
          savedAt: Date.now(),
          fazenda_id: fazendaAtualId,
        });

        // mantém teu cache antigo também
        await kvSet(CACHE_ANIMAIS, animaisData);
      } catch (e) {
        console.error("Erro ao carregar plantel:", e);
        if (!ativo) return;
        const ok = await carregarDoCache();
        if (!ok)
          setErro(
            "Não foi possível carregar os animais. Conecte na internet uma vez para baixar os dados."
          );
      } finally {
        if (ativo) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [
    fazendaAtualId,
    isOnline,
    carregarAnimais,
    carregarLotes,
    carregarRacas,
    carregarResumoRepro,
    carregarDoCache,
    CACHE_ANIMAIS,
    CACHE_PLANTEL_BUNDLE,
    animais,
  ]);

  /* =========================
     Lotes (mantido)
  ========================= */
  const loteOptions = useMemo(() => {
    const base = (lotes || []).map((l) => ({
      value: l.id,
      label: l.nome ?? l.descricao ?? l.titulo ?? l.label ?? String(l.id ?? "—"),
    }));
    return [{ value: null, label: "Sem lote" }, ...base];
  }, [lotes]);

  const lotesById = useMemo(() => {
    const map = {};
    (lotes || []).forEach((l) => {
      if (l?.id == null) return;
      map[l.id] = l.nome ?? l.descricao ?? l.titulo ?? l.label ?? String(l.id);
    });
    return map;
  }, [lotes]);

  const resolveSelectedLote = useCallback(
    (animal) => {
      const val = animal?.[LOTE_FIELD];
      if (val == null) return loteOptions.find((o) => o.value === null) || null;
      return loteOptions.find((o) => o.value === val) || null;
    },
    [loteOptions]
  );

  const resolveLoteLabel = useCallback(
    (animal) => {
      const val = animal?.[LOTE_FIELD];
      if (val == null || val === "") return "Sem lote";
      return lotesById[val] || "Sem lote";
    },
    [lotesById]
  );

  const closeLoteEdit = useCallback(() => setEditingLoteId(null), []);
  const handleLoteBlur = useCallback(() => setTimeout(() => setEditingLoteId(null), 150), []);

  const handleSetLote = useCallback(
    async (animal, option) => {
      if (!animal?.id) return;

      if (!fazendaAtualId) {
        setLoteAviso("Selecione uma fazenda antes de alterar o lote.");
        return;
      }
      if (!navigator.onLine) {
        setLoteAviso("Sem conexão. Conecte para alterar o lote.");
        return;
      }

      const valorNovo = option?.value ?? null;
      const valorAnterior = animal?.[LOTE_FIELD] ?? null;

      setAnimais((prev) =>
        prev.map((a) => (a.id === animal.id ? { ...a, [LOTE_FIELD]: valorNovo } : a))
      );
      setLoteAviso("");

      try {
        const dataMudanca = new Date().toISOString().split("T")[0];

        const { error: histErr } = await supabase.from("animais_lote_historico").insert({
          animal_id: animal.id,
          lote_id: valorNovo,
          data_mudanca: dataMudanca,
          origem: "manual",
          fazenda_id: fazendaAtualId,
        });
        if (histErr) throw histErr;

        const { error: updErr } = await withFazendaId(
          supabase.from("animais").update({ [LOTE_FIELD]: valorNovo }),
          fazendaAtualId
        ).eq("id", animal.id);
        if (updErr) throw updErr;

        closeLoteEdit();
      } catch (e) {
        console.error(e);
        setAnimais((prev) =>
          prev.map((a) => (a.id === animal.id ? { ...a, [LOTE_FIELD]: valorAnterior } : a))
        );
        setLoteAviso("Não foi possível atualizar o lote. Tente novamente.");
      }
    },
    [fazendaAtualId, closeLoteEdit]
  );

  /* =========================
     Última produção (mantido)
  ========================= */
  useEffect(() => {
    let ativo = true;

    async function carregarUltimaProducao() {
      if (!isOnline) {
        if (ativo) setUltProducao({});
        return;
      }
      if (!Array.isArray(animais) || animais.length === 0) {
        if (ativo) setUltProducao({});
        return;
      }

      const ids = animais.map((a) => a.id).filter(Boolean);
      if (ids.length === 0) {
        if (ativo) setUltProducao({});
        return;
      }

      try {
        const { data, error } = await withFazendaId(
          supabase.from("medicoes_leite").select("*"),
          fazendaAtualId
        )
          .in("animal_id", ids)
          .order("data_medicao", { ascending: false })
          .limit(1200);

        if (error) {
          if (ativo) setUltProducao({});
          return;
        }

        const registros = Array.isArray(data) ? data : [];
        const mapa = {};
        for (const r of registros) {
          const id = r?.animal_id;
          if (!id || Object.prototype.hasOwnProperty.call(mapa, id)) continue;

          const totalRaw = r?.total ?? r?.total_litros ?? r?.litros_total;
          const total = Number(totalRaw);
          if (Number.isFinite(total)) {
            mapa[id] = total;
            continue;
          }

          const soma = ["manha", "tarde", "terceira", "noite"].reduce((acc, f) => {
            const v = Number(r?.[f] ?? 0);
            return Number.isFinite(v) ? acc + v : acc;
          }, 0);
          if (soma > 0) mapa[id] = soma;
        }

        if (ativo) setUltProducao(mapa);
      } catch {
        if (ativo) setUltProducao({});
      }
    }

    carregarUltimaProducao();
    return () => {
      ativo = false;
    };
  }, [animais, fazendaAtualId, isOnline]);

  /* =========================
     Resolver DEL / Status via resumo repro (AGORA COM FALLBACK)
  ========================= */
  const resolveMesesIdade = useCallback((animal) => {
    const nasc = parseDateFlexible(animal?.nascimento);
    if (!nasc) return 0;
    const hoje = new Date();
    let meses =
      (hoje.getFullYear() - nasc.getFullYear()) * 12 +
      (hoje.getMonth() - nasc.getMonth());
    if (hoje.getDate() < nasc.getDate()) meses -= 1;
    return Math.max(0, meses);
  }, []);

  const resolveRepro = useCallback(
    (animal) => {
      const id = animal?.id;
      const fromMap = id ? reproResumo?.[id] : null;
      if (fromMap && (fromMap.ultimaIAISO || fromMap.ultimoPartoISO || fromMap.ultimaSecagemISO)) {
        return fromMap;
      }
      // ✅ fallback: usa campos do animal enquanto reproResumo não veio
      return fallbackFromAnimal(animal);
    },
    [reproResumo]
  );

  const resolveDelValor = useCallback(
    (animal) => {
      const r = resolveRepro(animal);
      return calcDel(r);
    },
    [resolveRepro]
  );

  const resolveSituacaoProdutiva = useCallback(
    (animal) => {
      const r = resolveRepro(animal);
      return calcSituacaoProdutiva({
        sexo: animal?.sexo,
        mesesIdade: resolveMesesIdade(animal),
        ultimoPartoISO: r.ultimoPartoISO,
        ultimaSecagemISO: r.ultimaSecagemISO,
      });
    },
    [resolveMesesIdade, resolveRepro]
  );

  const resolveStatusReprodutivo = useCallback(
    (animal) => {
      const r = resolveRepro(animal);
      return calcSituacaoReprodutiva(r);
    },
    [resolveRepro]
  );

  /* =========================
     Filtros / ordenação (mantido)
  ========================= */
  const linhas = useMemo(() => (Array.isArray(animais) ? animais : []), [animais]);

  const situacoesProdutivas = useMemo(() => {
    const set = new Set();
    linhas.forEach((a) => set.add(resolveSituacaoProdutiva(a)));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [linhas, resolveSituacaoProdutiva]);

  const situacoesReprodutivas = useMemo(() => {
    const set = new Set();
    linhas.forEach((a) => set.add(resolveStatusReprodutivo(a)));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [linhas, resolveStatusReprodutivo]);

  const allValue = "__ALL__";
  const semLoteValue = "__SEM_LOTE__";

  const origensDisponiveis = useMemo(() => {
    const set = new Set();
    linhas.forEach((a) => {
      if (a?.origem) set.add(a.origem);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [linhas]);

  const racasDisponiveis = useMemo(() => {
    const map = new Map();
    linhas.forEach((a) => {
      const id = a?.raca_id;
      if (id == null) return;
      const nome = racaMap[id];
      if (nome) map.set(id, nome);
    });
    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [linhas, racaMap]);

  const sexosDisponiveis = useMemo(() => {
    const set = new Set();
    linhas.forEach((a) => {
      if (a?.sexo) set.add(a.sexo);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [linhas]);

  const situacaoProdutivaOptions = useMemo(
    () => [
      { value: allValue, label: "Todos" },
      { value: "lac", label: "LAC" },
      { value: "nao_lactante", label: "Não lactante" },
      ...situacoesProdutivas
        .filter((v) => !/lact|lac/i.test(v))
        .map((v) => ({ value: v, label: v })),
    ],
    [allValue, situacoesProdutivas]
  );

  const situacaoReprodutivaOptions = useMemo(
    () => [{ value: allValue, label: "Todos" }, ...situacoesReprodutivas.map((v) => ({ value: v, label: v }))],
    [allValue, situacoesReprodutivas]
  );

  const origemOptions = useMemo(
    () => [{ value: allValue, label: "Todos" }, ...origensDisponiveis.map((v) => ({ value: v, label: v }))],
    [allValue, origensDisponiveis]
  );

  const racaOptions = useMemo(
    () => [{ value: allValue, label: "Todas" }, ...racasDisponiveis.map((r) => ({ value: r.id, label: r.nome }))],
    [allValue, racasDisponiveis]
  );

  const sexoOptions = useMemo(
    () => [
      { value: allValue, label: "Todos" },
      ...sexosDisponiveis.map((s) => ({
        value: s,
        label: s === "macho" ? "Macho" : s === "femea" ? "Fêmea" : s,
      })),
    ],
    [allValue, sexosDisponiveis]
  );

  const loteOptionsFiltro = useMemo(
    () => [
      { value: allValue, label: "Todos" },
      { value: semLoteValue, label: "Sem lote" },
      ...(lotes || []).map((l) => ({
        value: l.id,
        label: l.nome ?? l.descricao ?? l.titulo ?? l.label ?? String(l.id ?? "—"),
      })),
    ],
    [allValue, lotes, semLoteValue]
  );

  const resolveOption = useCallback((options, value) => {
    const found = options.find((o) => String(o.value) === String(value));
    return found || options[0] || null;
  }, []);

  const selectStylesCompact = useMemo(
    () => ({
      container: (base) => ({ ...base, width: "100%", fontSize: 13 }),
      control: (base, state) => ({
        ...base,
        minHeight: 34,
        borderRadius: 10,
        fontWeight: 700,
        fontSize: 13,
        borderColor: state.isFocused ? "rgba(37,99,235,0.55)" : "rgba(37,99,235,0.25)",
        boxShadow: "none",
        backgroundColor: "#fff",
        cursor: "pointer",
        ":hover": { borderColor: "rgba(37,99,235,0.55)" },
      }),
      valueContainer: (base) => ({ ...base, padding: "0 8px" }),
      indicatorsContainer: (base) => ({ ...base, height: 34 }),
      menu: (base) => ({ ...base, zIndex: 20 }),
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    }),
    []
  );

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    if (!openPopoverKey) return;
    setPopoverStyle({ left: "50%", transform: "translateX(-50%)" });

    const updatePosition = () => {
      const triggerEl = triggerRefs.current?.[openPopoverKey];
      const popoverEl = popoverRef.current;
      if (!triggerEl || !popoverEl) return;

      const thRect = triggerEl.getBoundingClientRect();
      const popRect = popoverEl.getBoundingClientRect();
      let left = (thRect.width - popRect.width) / 2;
      const desiredLeft = thRect.left + left;
      const desiredRight = desiredLeft + popRect.width;

      if (desiredRight > window.innerWidth - 8)
        left = window.innerWidth - 8 - popRect.width - thRect.left;
      if (desiredLeft < 8) left = 8 - thRect.left;

      setPopoverStyle({ left: `${left}px`, transform: "translateX(0)" });
    };

    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openPopoverKey]);

  useEffect(() => {
    if (!openPopoverKey) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (popoverRef.current?.contains(target)) return;
      if (target?.closest?.("[data-filter-trigger='true']")) return;
      setOpenPopoverKey(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpenPopoverKey(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPopoverKey]);

  const handleColEnter = useCallback((colKey) => {
    setHoveredColKey(colKey);
    setHoveredRowId(null);
  }, []);

  const handleCellEnter = useCallback((rowId, colKey) => {
    setHoveredRowId(rowId);
    setHoveredColKey(colKey);
  }, []);

  const toggleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      if (prev.direction === "desc") return { key: null, direction: null };
      return { key, direction: "asc" };
    });
  }, []);

  const handleTogglePopover = useCallback((key) => {
    setOpenPopoverKey((prev) => (prev === key ? null : key));
  }, []);

  const linhasFiltradas = useMemo(() => {
    const busca = filtros.animalBusca.trim().toLowerCase();

    return linhas.filter((a) => {
      if (filtros.lote !== allValue) {
        if (filtros.lote === semLoteValue) {
          if (a?.[LOTE_FIELD] != null && a?.[LOTE_FIELD] !== "") return false;
        } else if (String(a?.[LOTE_FIELD]) !== String(filtros.lote)) return false;
      }

      if (filtros.situacaoProdutiva !== allValue) {
        const sit = String(resolveSituacaoProdutiva(a) || "");
        const isLact = /lact|lac/i.test(sit);
        if (filtros.situacaoProdutiva === "lac" && !isLact) return false;
        if (filtros.situacaoProdutiva === "nao_lactante" && isLact) return false;
        if (
          filtros.situacaoProdutiva !== "lac" &&
          filtros.situacaoProdutiva !== "nao_lactante" &&
          sit !== filtros.situacaoProdutiva
        )
          return false;
      }

      if (filtros.situacaoReprodutiva !== allValue) {
        const sit = String(resolveStatusReprodutivo(a) || "");
        if (sit !== filtros.situacaoReprodutiva) return false;
      }

      if (filtros.origem !== allValue) {
        const orig = String(a?.origem || "");
        if (orig !== filtros.origem) return false;
      }

      if (filtros.animalRaca !== allValue) {
        if (String(a?.raca_id) !== String(filtros.animalRaca)) return false;
      }

      if (filtros.animalSexo !== allValue) {
        const sx = String(a?.sexo || "");
        if (sx !== filtros.animalSexo) return false;
      }

      if (busca) {
        const numero = String(a?.numero || "").toLowerCase();
        const brinco = String(a?.brinco || "").toLowerCase();
        const nome = String(a?.nome || "").toLowerCase();
        if (!numero.includes(busca) && !brinco.includes(busca) && !nome.includes(busca))
          return false;
      }

      return true;
    });
  }, [
    linhas,
    filtros,
    allValue,
    semLoteValue,
    resolveSituacaoProdutiva,
    resolveStatusReprodutivo,
  ]);

  const linhasOrdenadas = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return linhasFiltradas;
    const sorted = [...linhasFiltradas];
    const factor = sortConfig.direction === "asc" ? 1 : -1;

    const compareNumber = (a, b) => {
      if (!Number.isFinite(a) && !Number.isFinite(b)) return 0;
      if (!Number.isFinite(a)) return 1;
      if (!Number.isFinite(b)) return -1;
      return a - b;
    };

    sorted.sort((a, b) => {
      if (sortConfig.key === "producao") {
        const aSit = String(resolveSituacaoProdutiva(a) || "");
        const bSit = String(resolveSituacaoProdutiva(b) || "");
        const aIsLact = /lact|lac/i.test(aSit);
        const bIsLact = /lact|lac/i.test(bSit);
        const aVal = aIsLact ? Number(ultProducao[a.id]) : null;
        const bVal = bIsLact ? Number(ultProducao[b.id]) : null;
        return compareNumber(aVal, bVal) * factor;
      }
      if (sortConfig.key === "del") {
        const aVal = resolveDelValor(a);
        const bVal = resolveDelValor(b);
        return compareNumber(aVal, bVal) * factor;
      }
      if (sortConfig.key === "animal") {
        const aNum = Number(a?.numero);
        const bNum = Number(b?.numero);
        if (Number.isFinite(aNum) && Number.isFinite(bNum))
          return (aNum - bNum) * factor;
        return String(a?.numero || "").localeCompare(String(b?.numero || "")) * factor;
      }
      return 0;
    });

    return sorted;
  }, [linhasFiltradas, sortConfig, ultProducao, resolveSituacaoProdutiva, resolveDelValor]);

  const resumo = useMemo(() => {
    const total = linhasOrdenadas.length;

    const somas = linhasOrdenadas.reduce(
      (acc, a) => {
        const sitProd = String(resolveSituacaoProdutiva(a) || "");
        const isLact = /lact|lac/i.test(sitProd);
        if (!isLact) return acc;
        const valor = Number(ultProducao[a?.id]);
        if (!Number.isFinite(valor)) return acc;
        return { soma: acc.soma + valor, qtd: acc.qtd + 1 };
      },
      { soma: 0, qtd: 0 }
    );

    const media = somas.qtd > 0 ? somas.soma / somas.qtd : null;

    const delSomas = linhasOrdenadas.reduce(
      (acc, a) => {
        const sitProd = String(resolveSituacaoProdutiva(a) || "");
        const isLact = /lact|lac/i.test(sitProd);
        if (!isLact) return acc;
        const del = resolveDelValor(a);
        if (!Number.isFinite(del)) return acc;
        return { soma: acc.soma + del, qtd: acc.qtd + 1 };
      },
      { soma: 0, qtd: 0 }
    );

    const mediaDel = delSomas.qtd > 0 ? delSomas.soma / delSomas.qtd : null;

    return { total, media, mediaDel };
  }, [linhasOrdenadas, ultProducao, resolveSituacaoProdutiva, resolveDelValor]);

  const hasAnimais = linhasOrdenadas.length > 0;

  return (
    <section className="w-full">
      {erro && <div className="st-alert st-alert--danger">{erro}</div>}
      {loteAviso && <div className="st-alert st-alert--warning">{loteAviso}</div>}
      {offlineAviso && <div className="st-filter-hint">{offlineAviso}</div>}

      <div className="st-filter-hint">
        Dica: clique no título da coluna para filtrar. Clique novamente para fechar.
      </div>

      {atualizando && hasAnimais && (
        <div className="text-xs text-slate-500 mb-2">Atualizando animais...</div>
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
              <col style={{ width: "19%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>

            <thead>
              <tr>
                <th
                  className="col-animal st-col-animal"
                  onMouseEnter={() => handleColEnter("animal")}
                  ref={(el) => {
                    triggerRefs.current.animal = el;
                  }}
                  style={{ position: "relative" }}
                >
                  <button
                    type="button"
                    data-filter-trigger="true"
                    onClick={() => {
                      toggleSort("animal");
                      handleTogglePopover("animal");
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
                    <span className="st-th-label">Animal</span>
                    {sortConfig.key === "animal" && sortConfig.direction && (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {sortConfig.direction === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>

                  {openPopoverKey === "animal" && (
                    <div
                      ref={popoverRef}
                      className="st-filter-popover"
                      style={popoverStyle}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="st-filter">
                        <label className="st-filter__label">
                          Raça
                          <Select
                            menuPortalTarget={portalTarget}
                            menuPosition="fixed"
                            menuShouldBlockScroll
                            styles={selectStylesCompact}
                            options={racaOptions}
                            value={resolveOption(racaOptions, filtros.animalRaca)}
                            onChange={(opt) =>
                              setFiltros((prev) => ({
                                ...prev,
                                animalRaca: opt?.value ?? allValue,
                              }))
                            }
                          />
                        </label>

                        <label className="st-filter__label">
                          Sexo
                          <Select
                            menuPortalTarget={portalTarget}
                            menuPosition="fixed"
                            menuShouldBlockScroll
                            styles={selectStylesCompact}
                            options={sexoOptions}
                            value={resolveOption(sexoOptions, filtros.animalSexo)}
                            onChange={(opt) =>
                              setFiltros((prev) => ({
                                ...prev,
                                animalSexo: opt?.value ?? allValue,
                              }))
                            }
                          />
                        </label>

                        <label className="st-filter__label">
                          Buscar (nº, brinco, nome)
                          <input
                            type="text"
                            value={filtros.animalBusca}
                            onChange={(ev) =>
                              setFiltros((prev) => ({
                                ...prev,
                                animalBusca: ev.target.value,
                              }))
                            }
                            placeholder="Digite para filtrar"
                            className="st-filter-input"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </th>

                <th
                  className="col-lote"
                  onMouseEnter={() => handleColEnter("lote")}
                  ref={(el) => {
                    triggerRefs.current.lote = el;
                  }}
                  style={{ position: "relative" }}
                >
                  <button
                    type="button"
                    data-filter-trigger="true"
                    onClick={() => handleTogglePopover("lote")}
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
                    <span className="st-th-label">Lote</span>
                  </button>

                  {openPopoverKey === "lote" && (
                    <div
                      ref={popoverRef}
                      className="st-filter-popover"
                      style={popoverStyle}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="st-filter__label">
                        Lote
                        <Select
                          menuPortalTarget={portalTarget}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          styles={selectStylesCompact}
                          options={loteOptionsFiltro}
                          value={resolveOption(loteOptionsFiltro, filtros.lote)}
                          onChange={(opt) =>
                            setFiltros((prev) => ({
                              ...prev,
                              lote: opt?.value ?? allValue,
                            }))
                          }
                        />
                      </label>
                    </div>
                  )}
                </th>

                <th
                  className="st-td-center col-sitprod"
                  onMouseEnter={() => handleColEnter("sitprod")}
                >
                  <button
                    type="button"
                    data-filter-trigger="true"
                    onClick={() => handleTogglePopover("sitprod")}
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
                    <span className="st-th-label">Situação produtiva</span>
                  </button>

                  {openPopoverKey === "sitprod" && (
                    <div
                      ref={popoverRef}
                      className="st-filter-popover"
                      style={popoverStyle}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="st-filter__label">
                        Situação produtiva
                        <Select
                          menuPortalTarget={portalTarget}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          styles={selectStylesCompact}
                          options={situacaoProdutivaOptions}
                          value={resolveOption(
                            situacaoProdutivaOptions,
                            filtros.situacaoProdutiva
                          )}
                          onChange={(opt) =>
                            setFiltros((prev) => ({
                              ...prev,
                              situacaoProdutiva: opt?.value ?? allValue,
                            }))
                          }
                        />
                      </label>
                    </div>
                  )}
                </th>

                <th
                  className="st-td-center col-sitreprod"
                  onMouseEnter={() => handleColEnter("sitreprod")}
                >
                  <button
                    type="button"
                    data-filter-trigger="true"
                    onClick={() => handleTogglePopover("sitreprod")}
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
                    <span className="st-th-label">Situação reprodutiva</span>
                  </button>

                  {openPopoverKey === "sitreprod" && (
                    <div
                      ref={popoverRef}
                      className="st-filter-popover"
                      style={popoverStyle}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="st-filter__label">
                        Situação reprodutiva
                        <Select
                          menuPortalTarget={portalTarget}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          styles={selectStylesCompact}
                          options={situacaoReprodutivaOptions}
                          value={resolveOption(
                            situacaoReprodutivaOptions,
                            filtros.situacaoReprodutiva
                          )}
                          onChange={(opt) =>
                            setFiltros((prev) => ({
                              ...prev,
                              situacaoReprodutiva: opt?.value ?? allValue,
                            }))
                          }
                        />
                      </label>
                    </div>
                  )}
                </th>

                <th
                  className="st-td-right col-producao"
                  onMouseEnter={() => handleColEnter("producao")}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort("producao")}
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
                    <span className="st-th-label">Última produção</span>
                    {sortConfig.key === "producao" && sortConfig.direction && (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {sortConfig.direction === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>

                <th className="st-td-right col-del" onMouseEnter={() => handleColEnter("del")}>
                  <button
                    type="button"
                    onClick={() => toggleSort("del")}
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
                    <span className="st-th-label">DEL</span>
                    {sortConfig.key === "del" && sortConfig.direction && (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {sortConfig.direction === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>

                <th className="col-origem" onMouseEnter={() => handleColEnter("origem")}>
                  <span className="st-th-label">Origem</span>
                </th>

                <th className="st-td-center col-acoes" onMouseEnter={() => handleColEnter("acoes")}>
                  <span className="st-th-label">Ações</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {linhasOrdenadas.length === 0 && !carregando && (
                <tr>
                  <td colSpan={8} style={{ padding: 18, color: "#64748b", fontWeight: 700 }}>
                    Nenhum animal cadastrado ainda.
                  </td>
                </tr>
              )}

              {linhasOrdenadas.map((a, idx) => {
                const idade = idadeTexto(a.nascimento);
                const racaNome = racaMap[a.raca_id] || "—";
                const sexoLabel =
                  a.sexo === "macho" ? "Macho" : a.sexo === "femea" ? "Fêmea" : a.sexo || "—";

                const sitProd = resolveSituacaoProdutiva(a);
                const sitReprod = resolveStatusReprodutivo(a);
                const delValor = resolveDelValor(a);
                const del = Number.isFinite(delValor) ? String(Math.round(delValor)) : "—";

                const isLact = /lact|lac/i.test(String(sitProd || ""));
                const litros = isLact ? ultProducao[a.id] : null;
                const producaoTexto =
                  isLact && Number.isFinite(Number(litros)) ? formatProducao(litros) : "—";

                const loteSelecionado = resolveSelectedLote(a);
                const isSemLote = !loteSelecionado || loteSelecionado.value == null;
                const loteLabel = resolveLoteLabel(a);

                const prodClass = String(sitProd).toLowerCase().includes("lact")
                  ? "st-pill st-pill--ok"
                  : String(sitProd).toLowerCase().includes("seca")
                    ? "st-pill st-pill--mute"
                    : "st-pill st-pill--info";

                const reprClass = String(sitReprod).toLowerCase().includes("pev")
                  ? "st-pill st-pill--info"
                  : String(sitReprod).toLowerCase().includes("vaz")
                    ? "st-pill st-pill--mute"
                    : "st-pill st-pill--info";

                const rowId = a.id ?? a.numero ?? a.brinco ?? idx;
                const rowHover = hoveredRowId === rowId;

                return (
                  <tr key={rowId} className={rowHover ? "st-row-hover" : ""}>
                    <td
                      className={`col-animal st-col-animal ${
                        hoveredColKey === "animal" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "animal" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "animal")}
                    >
                      <div className="st-animal">
                        <span className="st-animal-num" title={`Nº do animal: ${a.numero ?? "—"}`}>
                          {a.numero ?? "—"}
                        </span>

                        <div className="st-animal-main">
                          <div className="st-animal-title">
                            {racaNome} <span className="st-dot">•</span> {sexoLabel}
                          </div>
                          <div className="st-animal-sub">
                            <span>{idade}</span>
                            <span className="st-dot">•</span>
                            <span>Brinco {a.brinco || "—"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td
                      className={`col-lote ${hoveredColKey === "lote" ? "st-col-hover" : ""} ${
                        rowHover ? "st-row-hover" : ""
                      } ${rowHover && hoveredColKey === "lote" ? "st-cell-hover" : ""}`}
                      style={{ overflow: "visible", paddingLeft: 12, paddingRight: 12 }}
                      onMouseEnter={() => handleCellEnter(rowId, "lote")}
                    >
                      {editingLoteId === a.id ? (
                        <div
                          onKeyDown={(e) => {
                            if (e.key === "Escape") closeLoteEdit();
                          }}
                        >
                          <Select
                            autoFocus
                            menuIsOpen
                            menuPortalTarget={portalTarget}
                            menuPosition="fixed"
                            menuShouldBlockScroll
                            styles={selectStylesCompact}
                            options={loteOptions}
                            value={resolveSelectedLote(a)}
                            placeholder="Selecionar lote…"
                            onChange={(opt) => handleSetLote(a, opt)}
                            onBlur={handleLoteBlur}
                            isClearable
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingLoteId(a.id)}
                          title="Clique para alterar o lote"
                          className={`st-pill ${isSemLote ? "st-pill--mute" : "st-pill--info"}`}
                          style={{
                            width: "100%",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            height: 30,
                            padding: "0 12px",
                            cursor: "pointer",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {loteLabel}
                        </button>
                      )}
                    </td>

                    <td
                      className={`st-td-center col-sitprod ${
                        hoveredColKey === "sitprod" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "sitprod" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "sitprod")}
                    >
                      <span className={prodClass}>{sitProd === "lactante" ? "LAC" : sitProd}</span>
                    </td>

                    <td
                      className={`st-td-center col-sitreprod ${
                        hoveredColKey === "sitreprod" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "sitreprod" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "sitreprod")}
                    >
                      <span className={reprClass}>
                        {String(sitReprod).toUpperCase().slice(0, 3)}
                      </span>
                    </td>

                    <td
                      className={`st-td-right st-num col-producao ${
                        hoveredColKey === "producao" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "producao" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "producao")}
                    >
                      {producaoTexto}
                    </td>

                    <td
                      className={`st-td-right col-del ${hoveredColKey === "del" ? "st-col-hover" : ""} ${
                        rowHover ? "st-row-hover" : ""
                      } ${rowHover && hoveredColKey === "del" ? "st-cell-hover" : ""}`}
                      style={{ fontWeight: 900 }}
                      onMouseEnter={() => handleCellEnter(rowId, "del")}
                    >
                      {del}
                    </td>

                    <td
                      className={`col-origem st-td-wrap ${
                        hoveredColKey === "origem" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "origem" ? "st-cell-hover" : ""
                      }`}
                      style={{ fontWeight: 700 }}
                      onMouseEnter={() => handleCellEnter(rowId, "origem")}
                    >
                      {a.origem || "—"}
                    </td>

                    <td
                      className={`st-td-center col-acoes ${hoveredColKey === "acoes" ? "st-col-hover" : ""} ${
                        rowHover ? "st-row-hover" : ""
                      } ${rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""}`}
                      onMouseEnter={() => handleCellEnter(rowId, "acoes")}
                    >
                      <button onClick={() => abrirFichaAnimal(a)} className="st-btn">
                        Ficha
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="st-summary-row">
                <td colSpan={8}>
                  <div className="st-summary-row__content">
                    <span>Total de animais exibidos: {resumo.total}</span>
                    <span>
                      Média Última produção (LAC):{" "}
                      {Number.isFinite(resumo.media) ? formatProducao(resumo.media) : "—"}
                    </span>
                    <span>
                      Média DEL (LAC):{" "}
                      {Number.isFinite(resumo.mediaDel) ? Math.round(resumo.mediaDel) : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {carregando && !hasAnimais && <div className="st-loading">Carregando...</div>}

      {animalSelecionado && <FichaAnimal animal={animalSelecionado} onClose={fecharFichaAnimal} />}
    </section>
  );
}
