import { supabase } from "../lib/supabaseClient";
import { kvGet, kvSet } from "../offline/localDB";
import { getOfflineSession } from "../offline/offlineAuth";

const CACHE_KEY = "cache:leite:dashboard";

function normalizeCache(cache) {
  if (!cache || typeof cache !== "object") {
    return {
      vacas: [],
      lotes: [],
      medicoesByDate: {},
      ultimaMedicaoPorAnimal: {},
      metadata: { updatedAt: null, dateRange: null },
    };
  }
  return {
    vacas: Array.isArray(cache.vacas) ? cache.vacas : [],
    lotes: Array.isArray(cache.lotes) ? cache.lotes : [],
    medicoesByDate: cache.medicoesByDate || {},
    ultimaMedicaoPorAnimal: cache.ultimaMedicaoPorAnimal || {},
    metadata: cache.metadata || { updatedAt: null, dateRange: null },
  };
}

function updateDateRange(range, dateISO) {
  if (!dateISO) return range || null;
  if (!range || !range.min || !range.max) {
    return { min: dateISO, max: dateISO };
  }
  return {
    min: dateISO < range.min ? dateISO : range.min,
    max: dateISO > range.max ? dateISO : range.max,
  };
}

async function resolveUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    return { userId: null, error };
  }
  if (user?.id) {
    return { userId: user.id, error: null };
  }
  const offlineSession = await getOfflineSession();
  return { userId: offlineSession?.userId || null, error: null };
}

export async function fetchUltimaDataOnline() {
  const { userId, error } = await resolveUserId();
  if (error || !userId) {
    return { data: null, error: error || new Error("Usuário não encontrado") };
  }

  const { data, error: queryError } = await supabase
    .from("medicoes_leite")
    .select("data_medicao")
    .eq("user_id", userId)
    .order("data_medicao", { ascending: false })
    .limit(1);

  if (queryError) {
    return { data: null, error: queryError };
  }

  return { data: data?.[0]?.data_medicao || null, error: null };
}

export async function fetchLeiteOnline({ dateISO }) {
  const { userId, error: userError } = await resolveUserId();
  if (userError || !userId) {
    return { data: null, error: userError || new Error("Usuário não encontrado") };
  }

  const [animaisRes, lotesRes, medicoesRes, ultimaRes] = await Promise.all([
    supabase.from("animais").select("*").eq("user_id", userId),
    supabase
      .from("lotes")
      .select("id,nome,funcao,nivel_produtivo,ativo")
      .eq("funcao", "Lactação")
      .eq("ativo", true)
      .not("nivel_produtivo", "is", null)
      .order("nome", { ascending: true }),
    supabase
      .from("medicoes_leite")
      .select(
        "id, user_id, animal_id, data_medicao, tipo_lancamento, litros_manha, litros_tarde, litros_terceira, litros_total"
      )
      .eq("user_id", userId)
      .eq("data_medicao", dateISO),
    supabase
      .from("medicoes_leite")
      .select("animal_id, data_medicao, litros_manha, litros_tarde, litros_terceira, litros_total")
      .eq("user_id", userId)
      .order("data_medicao", { ascending: false })
      .limit(2000),
  ]);

  const error = animaisRes.error || lotesRes.error || medicoesRes.error || ultimaRes.error;
  if (error) {
    return { data: null, error };
  }

  const ultimaMedicaoPorAnimal = {};
  (ultimaRes.data || []).forEach((linha) => {
    if (!ultimaMedicaoPorAnimal[linha.animal_id]) {
      ultimaMedicaoPorAnimal[linha.animal_id] = linha;
    }
  });

  return {
    data: {
      userId,
      dateISO,
      vacas: Array.isArray(animaisRes.data) ? animaisRes.data : [],
      lotes: Array.isArray(lotesRes.data) ? lotesRes.data : [],
      medicoesDia: Array.isArray(medicoesRes.data) ? medicoesRes.data : [],
      ultimaMedicaoPorAnimal,
    },
    error: null,
  };
}

export async function saveLeiteCache(payload) {
  const cacheAtual = normalizeCache(await kvGet(CACHE_KEY));
  const dateISO = payload?.dateISO;
  const medicoesByDate = {
    ...cacheAtual.medicoesByDate,
    ...(dateISO ? { [dateISO]: payload?.medicoesDia || [] } : {}),
  };

  const dateRange = updateDateRange(cacheAtual.metadata?.dateRange, dateISO);
  const nextCache = {
    vacas: payload?.vacas || cacheAtual.vacas,
    lotes: payload?.lotes || cacheAtual.lotes,
    medicoesByDate,
    ultimaMedicaoPorAnimal: {
      ...cacheAtual.ultimaMedicaoPorAnimal,
      ...(payload?.ultimaMedicaoPorAnimal || {}),
    },
    metadata: {
      updatedAt: new Date().toISOString(),
      dateRange,
    },
  };

  await kvSet(CACHE_KEY, nextCache);
  console.info("[Leite] Cache atualizado:", nextCache.metadata);
  return nextCache;
}

export async function loadLeiteCache({ dateISO }) {
  const cache = normalizeCache(await kvGet(CACHE_KEY));
  const hasCache =
    (cache.vacas && cache.vacas.length > 0) ||
    (cache.lotes && cache.lotes.length > 0) ||
    Object.keys(cache.medicoesByDate || {}).length > 0;

  return {
    hasCache,
    vacas: cache.vacas,
    lotes: cache.lotes,
    medicoesDia: dateISO ? cache.medicoesByDate?.[dateISO] || [] : [],
    ultimaMedicaoPorAnimal: cache.ultimaMedicaoPorAnimal || {},
    metadata: cache.metadata || { updatedAt: null, dateRange: null },
  };
}

export async function hasLeiteCache() {
  const cache = await kvGet(CACHE_KEY);
  return !!cache;
}
