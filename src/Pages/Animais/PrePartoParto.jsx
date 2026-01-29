// src/pages/Animais/PrePartoParto.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { enqueue, kvGet, kvSet } from "../../offline/localDB";
import "../../styles/tabelaModerna.css";
import ModalIniciarPreParto from "./ModalIniciarPreParto";
import ModalRegistrarParto from "./ModalRegistrarParto";

export const iconePreParto = "/icones/preparto.png";
export const rotuloPreParto = "Pré-parto/Parto";

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
    parseDateFlexible(animal.previsaoParto) ||
    parseDateFlexible(animal.previsao_parto_dt);
  if (direta) return direta;

  const ia =
    parseDateFlexible(animal.ultima_ia) ||
    parseDateFlexible(animal.ultimaIa) ||
    parseDateFlexible(animal.ultimaIA);
  return ia ? addDays(ia, 283) : null;
}

export default function PrePartoParto({ isOnline = navigator.onLine }) {
  const CACHE_KEY = "cache:animais:list";
  const CACHE_FALLBACK_KEY = "cache:animais:plantel:v1";

  const [animais, setAnimais] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [offlineAviso, setOfflineAviso] = useState("");
  const [hasCache, setHasCache] = useState(false);
  const [cacheMetadata, setCacheMetadata] = useState(null);

  const [diasPreParto, setDiasPreParto] = useState(30);

  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);

  const [modalPreParto, setModalPreParto] = useState(null);
  const [modalParto, setModalParto] = useState(null);
  const [acaoMensagem, setAcaoMensagem] = useState("");

  const LOTE_TABLE = "lotes";

  const lotesById = useMemo(() => {
    const map = {};
    (lotes || []).forEach((lote) => {
      if (lote?.id == null) return;
      map[lote.id] =
        lote.nome ?? lote.descricao ?? lote.titulo ?? lote.label ?? String(lote.id);
    });
    return map;
  }, [lotes]);

  const carregarAnimais = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("animais")
      .select("*")
      .eq("user_id", userId)
      .eq("ativo", true)
      .order("numero", { ascending: true });

    if (error) throw error;
    const lista = Array.isArray(data) ? data : [];
    setAnimais(lista);
    return lista;
  }, []);

  const carregarLotes = useCallback(async (userId) => {
    let { data, error } = await supabase
      .from(LOTE_TABLE)
      .select("*")
      .order("id", { ascending: true })
      .eq("user_id", userId);

    if (error && /column .*user_id.* does not exist/i.test(error.message || "")) {
      const retry = await supabase.from(LOTE_TABLE).select("*").order("id", { ascending: true });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Erro ao carregar lotes:", error);
      setLotes([]);
      return [];
    }

    const lista = Array.isArray(data) ? data : [];
    setLotes(lista);
    return lista;
  }, []);

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

    setHasCache(lista.length > 0);
    setCacheMetadata(cache?.updatedAt ? { updatedAt: cache.updatedAt } : null);
    return lista.length > 0;
  }, [CACHE_FALLBACK_KEY, CACHE_KEY]);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setCarregando(true);
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

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) throw new Error("Usuário não autenticado.");
        if (!ativo) return;

        const [animaisData] = await Promise.all([
          carregarAnimais(user.id),
          carregarLotes(user.id),
        ]);

        const payloadCache = {
          animais: animaisData,
          updatedAt: new Date().toISOString(),
        };
        await kvSet(CACHE_KEY, payloadCache);
        setHasCache(animaisData.length > 0);
        setCacheMetadata({ updatedAt: payloadCache.updatedAt });
      } catch (e) {
        console.error("Erro ao carregar pré-parto/parto:", e);
        if (!ativo) return;
        const cacheOk = await carregarDoCache();
        if (!cacheOk) {
          setErro(
            "Não foi possível carregar os animais. Sem dados offline ainda. Conecte na internet uma vez para baixar os animais."
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarDados();
    return () => {
      ativo = false;
    };
  }, [carregarAnimais, carregarDoCache, carregarLotes, isOnline]);

  const statusSyncTexto = useMemo(() => {
    if (!isOnline) {
      if (hasCache && cacheMetadata?.updatedAt) {
        const textoData = new Date(cacheMetadata.updatedAt).toLocaleString("pt-BR");
        return `Offline: usando dados salvos em ${textoData}`;
      }
      if (hasCache) {
        return "Offline: usando dados salvos no computador";
      }
      return "Offline: sem dados salvos no computador";
    }
    return "Online: dados atualizados";
  }, [cacheMetadata, hasCache, isOnline]);

  const linhasOrdenadas = useMemo(() => {
    const hoje = new Date();
    const base = Array.isArray(animais) ? animais : [];
    const filtrados = base
      .map((animal) => {
        const previsao = previsaoParto(animal);
        if (!previsao) return null;
        const diasParaParto = diffDias(previsao, hoje);
        return { animal, previsao, diasParaParto };
      })
      .filter(Boolean);

    return filtrados.sort((a, b) => (a.diasParaParto ?? 0) - (b.diasParaParto ?? 0));
  }, [animais]);

  const resumo = useMemo(() => {
    const total = linhasOrdenadas.length;
    const mediaDias =
      total > 0
        ? linhasOrdenadas.reduce((acc, item) => acc + (item.diasParaParto ?? 0), 0) /
          total
        : null;
    return { total, mediaDias };
  }, [linhasOrdenadas]);

  const iniciarPreParto = async (payload) => {
    if (!modalPreParto) return;
    setAcaoMensagem("");

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) throw new Error("Usuário não autenticado.");

      const evento = {
        animal_id: modalPreParto.id,
        tipo_evento: "preparto",
        data_evento: payload.dataInicio,
        user_id: user.id,
      };

      if (!navigator.onLine) {
        await enqueue("eventos_reprodutivos.insert", evento);
        setAcaoMensagem("✅ Pré-parto registrado offline. Será sincronizado ao reconectar.");
        setModalPreParto(null);
        return;
      }

      const { error } = await supabase.from("eventos_reprodutivos").insert(evento);
      if (error) throw error;

      setAcaoMensagem("✅ Pré-parto registrado com sucesso.");
      setModalPreParto(null);
    } catch (e) {
      console.error("Erro ao iniciar pré-parto:", e);
      setAcaoMensagem("❌ Não foi possível iniciar o pré-parto.");
    }
  };

  const registrarParto = async (payload) => {
    if (!modalParto) return;
    setAcaoMensagem("");

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) throw new Error("Usuário não autenticado.");

      const evento = {
        animal_id: modalParto.id,
        tipo_evento: "parto",
        data_evento: payload.dataParto,
        user_id: user.id,
      };

      if (!navigator.onLine) {
        await enqueue("eventos_reprodutivos.insert", evento);
        setAcaoMensagem("✅ Parto registrado offline. Será sincronizado ao reconectar.");
        setModalParto(null);
        return;
      }

      const { error } = await supabase.from("eventos_reprodutivos").insert(evento);
      if (error) throw error;

      setAcaoMensagem("✅ Parto registrado com sucesso.");
      setModalParto(null);
    } catch (e) {
      console.error("Erro ao registrar parto:", e);
      setAcaoMensagem("❌ Não foi possível registrar o parto.");
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
        <label className="st-filter__label" style={{ minWidth: 240 }}>
          Entram em pré-parto X dias antes do parto
          <input
            className="st-filter-input"
            type="number"
            min={1}
            value={diasPreParto}
            onChange={(event) => setDiasPreParto(Number(event.target.value || 0))}
          />
        </label>
      </div>

      <div className="st-filter-hint">{statusSyncTexto}</div>
      <div className="st-filter-hint">
        Dica: acompanhe a proximidade do parto para agir no momento certo.
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
              <col style={{ width: "20%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "11%" }} />
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
                <th className="st-td-center col-situacoes">
                  <span className="st-th-label">Situação</span>
                </th>
                <th className="st-td-center col-previsao">
                  <span className="st-th-label">Previsão parto</span>
                </th>
                <th className="st-td-center col-dias">
                  <span className="st-th-label">Dias p/ parto</span>
                </th>
                <th className="st-td-center col-status">
                  <span className="st-th-label">Status</span>
                </th>
                <th className="st-td-center col-acoes">
                  <span className="st-th-label">Ações</span>
                </th>
                <th className="st-td-center col-acoes">
                  <span className="st-th-label">Parto</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {linhasOrdenadas.length === 0 && !carregando && (
                <tr className="st-empty">
                  <td colSpan={8} className="st-td-center">
                    Nenhum animal com previsão de parto.
                  </td>
                </tr>
              )}

              {linhasOrdenadas.map((item, idx) => {
                const { animal, previsao, diasParaParto } = item;
                const rowId = animal.id ?? animal.numero ?? animal.brinco ?? idx;
                const rowHover = hoveredRowId === rowId;

                const sitProd = animal?.situacao_produtiva || "—";
                const sitReprod = animal?.situacao_reprodutiva || "—";

                const prodClass =
                  String(sitProd).toLowerCase().includes("lact")
                    ? "st-pill st-pill--ok"
                    : String(sitProd).toLowerCase().includes("seca")
                    ? "st-pill st-pill--mute"
                    : "st-pill st-pill--info";

                const reprClass =
                  String(sitReprod).toLowerCase().includes("pev")
                    ? "st-pill st-pill--info"
                    : String(sitReprod).toLowerCase().includes("vaz")
                    ? "st-pill st-pill--mute"
                    : "st-pill st-pill--info";

                let statusLabel = "Antecipada";
                let statusClass = "st-pill st-pill--info";

                if (diasParaParto != null && diasParaParto < 0) {
                  statusLabel = "Atrasada";
                  statusClass = "st-pill st-pill--warn";
                } else if (diasParaParto != null && diasParaParto <= diasPreParto) {
                  statusLabel = "No prazo";
                  statusClass = "st-pill st-pill--ok";
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
                      className={`st-td-center col-situacoes ${
                        hoveredColKey === "situacoes" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "situacoes" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(rowId);
                        setHoveredColKey("situacoes");
                      }}
                    >
                      <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                        {sitProd === "—" ? "—" : <span className={prodClass}>{sitProd}</span>}
                        {sitReprod === "—" ? "—" : (
                          <span className={reprClass}>{String(sitReprod).toUpperCase().slice(0, 3)}</span>
                        )}
                      </div>
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
                      <button type="button" className="st-btn" onClick={() => setModalPreParto(animal)}>
                        Iniciar pré-parto
                      </button>
                    </td>

                    <td
                      className={`st-td-center col-acoes ${
                        hoveredColKey === "parto" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "parto" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(rowId);
                        setHoveredColKey("parto");
                      }}
                    >
                      <button type="button" className="st-btn" onClick={() => setModalParto(animal)}>
                        Registrar parto
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
                      Média dias para parto: {Number.isFinite(resumo.mediaDias) ? Math.round(resumo.mediaDias) : "—"}
                    </span>
                    <span>Status: acompanhamento pré-parto</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {carregando && <div className="st-loading">Carregando...</div>}

      {modalPreParto && (
        <ModalIniciarPreParto
          animal={modalPreParto}
          lotes={lotes}
          onClose={() => setModalPreParto(null)}
          onSave={iniciarPreParto}
        />
      )}

      {modalParto && (
        <ModalRegistrarParto
          animal={modalParto}
          onClose={() => setModalParto(null)}
          onSave={registrarParto}
        />
      )}
    </section>
  );
}
