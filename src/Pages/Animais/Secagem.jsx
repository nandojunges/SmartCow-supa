// src/Pages/Animais/Secagem.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import { enqueue, kvGet, kvSet } from "../../offline/localDB";
import "../../styles/tabelaModerna.css";
import ModalRegistrarSecagem from "./ModalRegistrarSecagem";

export const iconeSecagem = "/icones/secagem.png";
export const rotuloSecagem = "Secagem";

let MEMO_SECAGEM = {
  data: null,
  lastAt: 0,
};

const KEY = "cfg_manejo_repro";
const DEFAULT_CFG = {
  dias_antes_parto_para_secagem: 60,
  dias_antecedencia_preparar_secagem: 7,
  dias_antes_parto_para_preparto: 30,
};

const cfgKey = (userId, fazendaId) => `${KEY}:${userId || "anon"}:${fazendaId || "none"}`;

async function loadConfigManejo(userId, fazendaId) {
  if (!userId || !fazendaId) return { ...DEFAULT_CFG };
  try {
    const { data, error, status } = await supabase
      .from("config_manejo_repro")
      .select("*")
      .eq("user_id", userId)
      .eq("fazenda_id", fazendaId)
      .single();

    if (error) {
      if (status === 406 || error.code === "PGRST116") {
        const defaults = { ...DEFAULT_CFG, user_id: userId, fazenda_id: fazendaId };
        await supabase
          .from("config_manejo_repro")
          .upsert(defaults, { onConflict: "user_id,fazenda_id" });
        await kvSet(cfgKey(userId, fazendaId), defaults);
        return defaults;
      }
      throw error;
    }

    if (data) {
      await kvSet(cfgKey(userId, fazendaId), data);
      return { ...DEFAULT_CFG, ...data };
    }
  } catch (error) {
    const cached = await kvGet(cfgKey(userId, fazendaId));
    return { ...DEFAULT_CFG, ...(cached || {}), user_id: userId, fazenda_id: fazendaId };
  }
  return { ...DEFAULT_CFG, user_id: userId, fazenda_id: fazendaId };
}

async function saveCfg(userId, fazendaId, patch) {
  if (!userId || !fazendaId) return null;
  const cached = (await kvGet(cfgKey(userId, fazendaId))) || {};
  const merged = {
    ...cached,
    ...patch,
    user_id: userId,
    fazenda_id: fazendaId,
  };
  await kvSet(cfgKey(userId, fazendaId), merged);
  try {
    const { error } = await supabase
      .from("config_manejo_repro")
      .upsert(merged, { onConflict: "user_id,fazenda_id" });
    if (error) throw error;
  } catch (error) {
    await enqueue("cfg_manejo_upsert", merged);
  }
  return merged;
}

/* ========= helpers de data ========= */
function parseDateFlexible(s) {
  if (!s) return null;
  if (typeof s !== "string") s = String(s);

  // ISO: yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = +m[1];
    const mo = +m[2];
    const d = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

  // BR: dd/mm/aaaa
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const d = +m[1];
    const mo = +m[2];
    const y = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

  const dt = new Date(s);
  return Number.isFinite(+dt) ? dt : null;
}

function addDays(dt, n) {
  const d = new Date(dt.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

function formatBR(dt) {
  return dt ? dt.toLocaleDateString("pt-BR") : "—";
}

function diffDias(target, base = new Date()) {
  if (!target) return null;
  const diff = Math.round((target.getTime() - base.getTime()) / 86400000);
  return Number.isFinite(diff) ? diff : null;
}

function previsaoParto(animal) {
  if (!animal) return null;
  const direta =
    parseDateFlexible(animal.previsao_parto) ||
    parseDateFlexible(animal.previsaoParto);
  if (direta) return direta;

  const ia =
    parseDateFlexible(animal.ultima_ia) ||
    parseDateFlexible(animal.ultimaIa) ||
    parseDateFlexible(animal.ultimaIA);
  return ia ? addDays(ia, 283) : null;
}

function resolveSituacaoProdutiva(animal) {
  if (!animal) return "—";
  if (animal?.sexo === "macho") return "não lactante";
  const delValor = Number(animal?.del);
  if (Number.isFinite(delValor)) return "lactante";
  return "seca";
}

function mapearReproPorAnimal(lista = []) {
  const map = {};
  lista.forEach((item) => {
    const id = item?.animal_id ?? item?.id;
    if (!id) return;
    map[id] = item;
  });
  return map;
}

function mesclarReproEmAnimais(animais = [], repro = []) {
  const mapRepro = mapearReproPorAnimal(repro);
  return animais.map((animal) => {
    const reproRow = mapRepro[animal?.id];
    if (!reproRow) return animal;
    const { id, animal_id, ...rest } = reproRow || {};
    return { ...animal, ...rest };
  });
}

export default function Secagem({ isOnline = navigator.onLine }) {
  const { fazendaAtualId } = useFazenda();
  const CACHE_KEY = "cache:animais:list";
  const CACHE_FALLBACK_KEY = "cache:animais:plantel:v1";

  const memoData = MEMO_SECAGEM.data || {};
  const [animais, setAnimais] = useState(() => memoData.animais ?? []);
  const [lotes, setLotes] = useState(() => memoData.lotes ?? []);
  const [carregando, setCarregando] = useState(() => !memoData.animais);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [offlineAviso, setOfflineAviso] = useState("");
  const [cfg, setCfg] = useState(null);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [userId, setUserId] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [animalSelecionado, setAnimalSelecionado] = useState(null);
  const [acaoMensagem, setAcaoMensagem] = useState("");

  const LOTE_TABLE = "lotes";

  useEffect(() => {
    const memo = MEMO_SECAGEM.data;
    if (memo?.animais === animais && memo?.lotes === lotes) return;
    MEMO_SECAGEM.data = {
      ...(memo || {}),
      animais,
      lotes,
    };
    MEMO_SECAGEM.lastAt = Date.now();
  }, [animais, lotes]);

  const lotesById = useMemo(() => {
    const map = {};
    (lotes || []).forEach((lote) => {
      if (lote?.id == null) return;
      map[lote.id] =
        lote.nome ?? lote.descricao ?? lote.titulo ?? lote.label ?? String(lote.id);
    });
    return map;
  }, [lotes]);

  const carregarAnimais = useCallback(async () => {
    const [animaisRes, reproRes] = await Promise.all([
      withFazendaId(supabase.from("animais").select("*"), fazendaAtualId)
        .eq("ativo", true)
        .order("numero", { ascending: true }),
      supabase
        .from("v_repro_tabela")
        .select("*")
        .eq("fazenda_id", fazendaAtualId)
        .order("numero", { ascending: true }),
    ]);

    if (animaisRes.error) throw animaisRes.error;
    if (reproRes.error) throw reproRes.error;
    const lista = Array.isArray(animaisRes.data) ? animaisRes.data : [];
    const reproLista = Array.isArray(reproRes.data) ? reproRes.data : [];
    const combinados = mesclarReproEmAnimais(lista, reproLista);
    setAnimais(combinados);
    return combinados;
  }, [fazendaAtualId]);

  const carregarLotes = useCallback(async () => {
    const { data, error } = await withFazendaId(
      supabase.from(LOTE_TABLE).select("*"),
      fazendaAtualId
    ).order("id", { ascending: true });

    if (error) {
      console.error("Erro ao carregar lotes:", error);
      return [];
    }

    const lista = Array.isArray(data) ? data : [];
    setLotes(lista);
    return lista;
  }, [LOTE_TABLE, fazendaAtualId]);

  const carregarDoCache = useCallback(async () => {
    const cachePrimario = await kvGet(CACHE_KEY);
    const cacheFallback = cachePrimario ? null : await kvGet(CACHE_FALLBACK_KEY);
    const cache = cachePrimario ?? cacheFallback;
    if (!cache) return false;

    const lista = Array.isArray(cache)
      ? cache
      : Array.isArray(cache.animais)
      ? cache.animais
      : [];

    if (Array.isArray(lista)) {
      setAnimais(lista.filter((animal) => animal?.ativo !== false));
    }

    return lista.length > 0;
  }, [CACHE_FALLBACK_KEY, CACHE_KEY]);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      const memoFresh =
        MEMO_SECAGEM.data && Date.now() - MEMO_SECAGEM.lastAt < 30000;
      const hasData =
        (Array.isArray(animais) && animais.length > 0) ||
        (Array.isArray(lotes) && lotes.length > 0);

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
      setErro("");
      setOfflineAviso("");

      try {
        if (!isOnline) {
          const cacheOk = await carregarDoCache();
          if (!cacheOk) {
            setOfflineAviso("Offline: sem dados salvos no computador");
          }
          return;
        }

        if (!fazendaAtualId) {
          throw new Error("Selecione uma fazenda para continuar.");
        }
        if (!ativo) return;

        const [animaisData] = await Promise.all([
          carregarAnimais(),
          carregarLotes(),
        ]);

        const payloadCache = {
          animais: animaisData,
          updatedAt: new Date().toISOString(),
        };
        await kvSet(CACHE_KEY, payloadCache);
      } catch (e) {
        console.error("Erro ao carregar secagem:", e);
        if (!ativo) return;
        const cacheOk = await carregarDoCache();
        if (!cacheOk) {
          setErro(
            "Não foi possível carregar os animais. Sem dados offline ainda. Conecte na internet uma vez para baixar os animais."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    }

    carregarDados();
    return () => {
      ativo = false;
    };
  }, [
    carregarAnimais,
    carregarDoCache,
    carregarLotes,
    fazendaAtualId,
    isOnline,
  ]);

  useEffect(() => {
    let ativo = true;

    async function carregarConfig() {
      setLoadingCfg(true);
      const { data, error } = await supabase.auth.getUser();
      const uid = !error && data?.user?.id ? data.user.id : null;
      if (!ativo) return;
      setUserId(uid);
      if (!fazendaAtualId) {
        setErro("Selecione uma fazenda para ajustar os parâmetros de secagem.");
      }
      const cfgCarregada = await loadConfigManejo(uid, fazendaAtualId);
      if (!ativo) return;
      setCfg(cfgCarregada);
      setLoadingCfg(false);
    }

    carregarConfig();
    return () => {
      ativo = false;
    };
  }, [fazendaAtualId]);

  const diasAntes = cfg?.dias_antes_parto_para_secagem;
  const diasAviso = cfg?.dias_antecedencia_preparar_secagem;

  const linhasOrdenadas = useMemo(() => {
    if (loadingCfg || diasAntes == null) return [];
    const hoje = new Date();
    const janelaMax = addDays(hoje, 120);
    const base = Array.isArray(animais) ? animais : [];

    const filtrados = base
      .filter((animal) => {
        const delValor = Number(animal?.del);
        if (!Number.isFinite(delValor)) return false;
        const previsao = previsaoParto(animal);
        if (!previsao) return false;
        const dataSecagemIdeal = addDays(previsao, -Number(diasAntes));
        return dataSecagemIdeal <= janelaMax;
      })
      .map((animal) => {
        const previsao = previsaoParto(animal);
        const dataSecagemIdeal = previsao ? addDays(previsao, -Number(diasAntes)) : null;
        const diasParaParto = diffDias(previsao, hoje);
        const diasParaSecagem = diffDias(dataSecagemIdeal, hoje);
        return {
          animal,
          previsao,
          dataSecagemIdeal,
          diasParaParto,
          diasParaSecagem,
        };
      });

    return filtrados.sort((a, b) => {
      const diffA = Math.abs(a.diasParaSecagem ?? 0);
      const diffB = Math.abs(b.diasParaSecagem ?? 0);
      return diffA - diffB;
    });
  }, [animais, diasAntes, loadingCfg]);

  const resumo = useMemo(() => {
    const total = linhasOrdenadas.length;
    const mediaParto =
      total > 0
        ? linhasOrdenadas.reduce((acc, item) => acc + (item.diasParaParto ?? 0), 0) /
          total
        : null;
    const mediaSecagem =
      total > 0
        ? linhasOrdenadas.reduce((acc, item) => acc + (item.diasParaSecagem ?? 0), 0) /
          total
        : null;
    return { total, mediaParto, mediaSecagem };
  }, [linhasOrdenadas]);

  const hasAnimais = linhasOrdenadas.length > 0;

  const abrirModal = (animal) => {
    setAnimalSelecionado(animal);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setAnimalSelecionado(null);
  };

  const registrarSecagem = async (payload) => {
    if (!animalSelecionado) return;
    setAcaoMensagem("");

    try {
      if (!fazendaAtualId) {
        throw new Error("Selecione uma fazenda para registrar a secagem.");
      }

      const evento = {
        animal_id: animalSelecionado.id,
        tipo: "SECAGEM",
        data_evento: payload.dataSecagem,
        observacoes: payload.observacoes || null,
        fazenda_id: fazendaAtualId,
        user_id: userId,
      };

      if (!navigator.onLine) {
        await enqueue("repro_eventos.insert", evento);
        setAcaoMensagem("✅ Secagem registrada offline. Será sincronizada ao reconectar.");
        fecharModal();
        return;
      }

      const { error } = await supabase
        .from("repro_eventos")
        .insert(evento);

      if (error) throw error;

      setAcaoMensagem("✅ Secagem registrada com sucesso.");
      fecharModal();
    } catch (e) {
      console.error("Erro ao registrar secagem:", e);
      setAcaoMensagem("❌ Não foi possível registrar a secagem.");
    }
  };

  return (
    <section className="w-full">
      {erro && <div className="st-alert st-alert--danger">{erro}</div>}
      {offlineAviso && <div className="st-filter-hint">{offlineAviso}</div>}
      {acaoMensagem && <div className="st-filter-hint">{acaoMensagem}</div>}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-end",
          marginBottom: 12,
        }}
      >
        {!loadingCfg && cfg && (
          <>
            <label
              className="st-filter__label"
              style={{ maxWidth: 260, flex: "1 1 260px" }}
            >
              Dias antes do parto para secar
              <input
                className="st-filter-input"
                style={{ width: 90 }}
                type="number"
                min={1}
                value={diasAntes}
                onChange={(event) => {
                  const value = Number(event.target.value || 0);
                  setCfg((prev) =>
                    prev ? { ...prev, dias_antes_parto_para_secagem: value } : prev
                  );
                  saveCfg(userId, fazendaAtualId, {
                    dias_antes_parto_para_secagem: value,
                  });
                }}
              />
            </label>
            <label
              className="st-filter__label"
              style={{ maxWidth: 260, flex: "1 1 260px" }}
            >
              Avisar/preparar com antecedência
              <input
                className="st-filter-input"
                style={{ width: 90 }}
                type="number"
                min={0}
                value={diasAviso}
                onChange={(event) => {
                  const value = Number(event.target.value || 0);
                  setCfg((prev) =>
                    prev
                      ? { ...prev, dias_antecedencia_preparar_secagem: value }
                      : prev
                  );
                  saveCfg(userId, fazendaAtualId, {
                    dias_antecedencia_preparar_secagem: value,
                  });
                }}
              />
            </label>
          </>
        )}
      </div>

      {atualizando && hasAnimais && (
        <div className="text-xs text-slate-500 mb-2">Atualizando secagem...</div>
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
              <col style={{ width: "20%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="col-animal st-col-animal">
                  <span className="st-th-label">Animal</span>
                </th>
                <th className="col-lote">
                  <span className="st-th-label">Lote atual</span>
                </th>
                <th className="st-td-center col-sitprod">
                  <span className="st-th-label">Sit. produtiva</span>
                </th>
                <th className="st-td-center col-previsao">
                  <span className="st-th-label">Previsão parto</span>
                </th>
                <th className="st-td-center col-dias">
                  <span className="st-th-label">Dias p/ parto</span>
                </th>
                <th className="st-td-center col-secagem">
                  <span className="st-th-label">Secagem ideal</span>
                </th>
                <th className="st-td-center col-status">
                  <span className="st-th-label">Status</span>
                </th>
                <th className="st-td-center col-acoes">
                  <span className="st-th-label">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {linhasOrdenadas.length === 0 && !carregando && (
                <tr className="st-empty">
                  <td colSpan={8} className="st-td-center">
                    Nenhum animal na janela de secagem.
                  </td>
                </tr>
              )}

              {linhasOrdenadas.map((item, idx) => {
                const { animal, previsao, dataSecagemIdeal, diasParaParto, diasParaSecagem } =
                  item;
                const rowId = animal.id ?? animal.numero ?? animal.brinco ?? idx;
                const rowHover = hoveredRowId === rowId;
                const sitProd = resolveSituacaoProdutiva(animal);

                const prodClass =
                  String(sitProd).toLowerCase().includes("lact")
                    ? "st-pill st-pill--ok"
                    : String(sitProd).toLowerCase().includes("seca")
                    ? "st-pill st-pill--mute"
                    : "st-pill st-pill--info";

                let statusLabel = "Planejada";
                let statusClass = "st-pill st-pill--info";

                if (diasParaSecagem != null && diasParaSecagem < 0) {
                  statusLabel = "Atrasada";
                  statusClass = "st-pill st-pill--warn";
                } else if (diasParaParto != null && diasParaParto <= diasAntes) {
                  statusLabel = "Na hora";
                  statusClass = "st-pill st-pill--ok";
                } else if (
                  diasParaParto != null &&
                  diasParaParto <= diasAntes + diasAviso &&
                  diasParaParto > diasAntes
                ) {
                  statusLabel = "Preparar";
                  statusClass = "st-pill st-pill--warn";
                }

                return (
                  <tr key={rowId} className={rowHover ? "st-row-hover" : ""}>
                    <td
                      className={`col-animal st-col-animal ${
                        hoveredColKey === "animal" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "animal" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(rowId);
                        setHoveredColKey("animal");
                      }}
                    >
                      <div className="st-animal">
                        <span className="st-animal-num">{animal.numero ?? "—"}</span>
                        <div className="st-animal-main">
                          <div className="st-animal-title">
                            {animal?.raca_nome || "Vaca"} <span className="st-dot">•</span>{" "}
                            {animal?.sexo === "macho"
                              ? "Macho"
                              : animal?.sexo === "femea"
                              ? "Fêmea"
                              : animal?.sexo || "—"}
                          </div>
                          <div className="st-animal-sub">
                            <span>Brinco {animal.brinco || "—"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td
                      className={`col-lote ${
                        hoveredColKey === "lote" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "lote" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(rowId);
                        setHoveredColKey("lote");
                      }}
                    >
                      {lotesById[animal?.lote_id] || "Sem lote"}
                    </td>

                    <td
                      className={`st-td-center col-sitprod ${
                        hoveredColKey === "sitprod" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "sitprod" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(rowId);
                        setHoveredColKey("sitprod");
                      }}
                    >
                      {sitProd === "—" ? "—" : <span className={prodClass}>{sitProd}</span>}
                    </td>

                    <td
                      className={`st-td-center col-previsao ${
                        hoveredColKey === "previsao" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "previsao" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(rowId);
                        setHoveredColKey("previsao");
                      }}
                    >
                      {formatBR(previsao)}
                    </td>

                    <td
                      className={`st-td-center st-num col-dias ${
                        hoveredColKey === "dias" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "dias" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(rowId);
                        setHoveredColKey("dias");
                      }}
                    >
                      {diasParaParto ?? "—"}
                    </td>

                    <td
                      className={`st-td-center col-secagem ${
                        hoveredColKey === "secagem" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "secagem" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(rowId);
                        setHoveredColKey("secagem");
                      }}
                    >
                      {formatBR(dataSecagemIdeal)}
                    </td>

                    <td
                      className={`st-td-center col-status ${
                        hoveredColKey === "status" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "status" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(rowId);
                        setHoveredColKey("status");
                      }}
                    >
                      <span className={statusClass}>{statusLabel}</span>
                    </td>

                    <td
                      className={`st-td-center col-acoes ${
                        hoveredColKey === "acoes" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(rowId);
                        setHoveredColKey("acoes");
                      }}
                    >
                      <button type="button" className="st-btn" onClick={() => abrirModal(animal)}>
                        Registrar secagem
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
                    <span>Total exibidos: {resumo.total}</span>
                    <span>
                      Média dias para parto: {Number.isFinite(resumo.mediaParto) ? Math.round(resumo.mediaParto) : "—"}
                    </span>
                    <span>
                      Média dias para secagem: {Number.isFinite(resumo.mediaSecagem) ? Math.round(resumo.mediaSecagem) : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {carregando && !hasAnimais && <div className="st-loading">Carregando...</div>}

      {modalAberto && animalSelecionado && (
        <ModalRegistrarSecagem
          animal={animalSelecionado}
          onClose={fecharModal}
          onSave={registrarSecagem}
        />
      )}
    </section>
  );
}
