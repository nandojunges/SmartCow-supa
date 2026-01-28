// src/pages/Leite/Leite.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import ModalMedicaoLeite from "./ModalMedicaoLeite";
import FichaLeiteira from "./FichaLeiteira";
import ResumoLeiteDia from "./ResumoLeiteDia";
import "../../styles/tabelaModerna.css";

/* ===== helpers de data / DEL ===== */
function parseBR(str) {
  if (!str || str.length !== 10) return null;
  const [d, m, y] = str.split("/").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function toBR(dt) {
  if (!dt) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatISOToBR(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? "" : toBR(dt);
}

function calcularDEL(partoBR) {
  const dt = parseBR(partoBR);
  if (!dt) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((hoje - dt) / 86400000));
}

function ymdHoje() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje.toISOString().split("T")[0];
}

function addDaysISO(iso, delta) {
  if (!iso) return iso;
  const dt = new Date(iso + "T00:00:00");
  dt.setDate(dt.getDate() + delta);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Último parto (usa coluna ultimo_parto do Supabase) */
function getUltimoPartoBR(animal) {
  const iso = animal?.ultimo_parto; // DATE no Supabase
  if (!iso) return "";
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? "" : toBR(dt);
}

/** Normaliza texto (minúsculo, sem acento) */
function normalizar(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Regra: está em lactação? */
function isLactatingAnimal(a) {
  const categoriaNorm = normalizar(a?.categoria);
  const statusProdNorm = normalizar(a?.situacao_pro || a?.situaco_pro);

  const temUltimoParto = !!a?.ultimo_parto;

  // Negativos claros
  if (statusProdNorm.includes("seca") || categoriaNorm.includes("seca")) {
    return false;
  }

  // Positivos claros via texto
  if (statusProdNorm.startsWith("lact")) return true;
  if (categoriaNorm.includes("lact")) return true;

  // fallback: tem último parto e não está marcada como seca
  if (!statusProdNorm && temUltimoParto) return true;

  return false;
}

/* ===================== react-select (Lote) ===================== */
const selectLoteStyles = {
  container: (base) => ({ ...base, width: "100%" }),
  control: (base, state) => ({
    ...base,
    minHeight: 34,
    height: 34,
    borderRadius: 999,
    borderColor: state.isFocused ? "#60a5fa" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 1px #60a5fa" : "none",
    backgroundColor: "#f9fafb",
    fontSize: 13,
    cursor: "pointer",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px" }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999999 }),
  menu: (base) => ({ ...base, zIndex: 9999999, borderRadius: 12, overflow: "hidden" }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#e5edff" : "#fff",
    color: state.isSelected ? "#fff" : "#111827",
    cursor: "pointer",
    paddingTop: 10,
    paddingBottom: 10,
  }),
};

/* =================== TABELA RESUMO DO DIA =================== */
function TabelaResumoDia({
  vacas = [],
  medicoes = {},
  dataTabela,
  onClickFicha,
  onClickRegistrar,

  // lote (vigente na dataTabela) + edição
  lotesOptions = [],
  loteEfetivoPorNumero = {},
  loteEditPorNumero = {},
  onChangeLote,
  salvarLotes,
  salvandoLotes,
  podeEditarLote,
  isOffline,
  hasCache,
  ultimaMedicaoPorAnimal,
  dataEhPassada,
  modoEdicaoPassado,
  toggleModoEdicaoPassado,
}) {
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);
  const [openPopoverKey, setOpenPopoverKey] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filtroLote, setFiltroLote] = useState("__ALL__");
  const popoverRef = useRef(null);
  const triggerRefs = useRef({});
  const [popoverStyle, setPopoverStyle] = useState({
    left: "50%",
    transform: "translateX(-50%)",
  });

  const toNum = (v) => parseFloat(String(v ?? "0").replace(",", ".")) || 0;

  const colunas = useMemo(
    () => [
      { key: "numero", label: "Número", sortable: true, align: "center", width: 70 },
      { key: "brinco", label: "Brinco", width: 80 },
      { key: "del", label: "DEL", sortable: true, align: "center", width: 60 },
      { key: "manha", label: "Manhã", align: "right", width: 70 },
      { key: "tarde", label: "Tarde", align: "right", width: 70 },
      { key: "terceira", label: "3ª", align: "right", width: 55 },
      { key: "total", label: "Total", sortable: true, align: "right", width: 75 },
      { key: "ultima", label: "Última Medição", width: 130 },
      { key: "lote", label: "Lote", filterable: true, width: 220 },
      { key: "acoes", label: "Ações", align: "center", width: 170 },
    ],
    []
  );

  const colunasExibidas = useMemo(
    () => colunas,
    [colunas]
  );

  const getLoteValue = (numeroStr) => {
    const loteId = loteEditPorNumero[numeroStr] ?? loteEfetivoPorNumero[numeroStr] ?? null;
    if (!loteId) return null;
    return lotesOptions.find((o) => o.value === loteId) || null;
  };

  const lotesFiltroOptions = useMemo(() => {
    const base = (lotesOptions || []).map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
    return [
      { value: "__ALL__", label: "Todos" },
      { value: "__SEM_LOTE__", label: "Sem lote" },
      ...base,
    ];
  }, [lotesOptions]);

  const resolveOption = useCallback((options, value) => {
    const found = options.find((opt) => String(opt.value) === String(value));
    return found || options[0] || null;
  }, []);

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
    return vacas.filter((vaca) => {
      const numeroStr = String(vaca.numero ?? "");
      const loteId = loteEditPorNumero[numeroStr] ?? loteEfetivoPorNumero[numeroStr] ?? null;

      if (filtroLote !== "__ALL__") {
        if (filtroLote === "__SEM_LOTE__") {
          if (loteId != null && loteId !== "") return false;
        } else if (String(loteId ?? "") !== String(filtroLote)) {
          return false;
        }
      }
      return true;
    });
  }, [filtroLote, loteEditPorNumero, loteEfetivoPorNumero, vacas]);

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
      if (sortConfig.key === "numero") {
        const aNum = Number(a?.numero);
        const bNum = Number(b?.numero);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
          return (aNum - bNum) * factor;
        }
        const aStr = String(a?.numero || "");
        const bStr = String(b?.numero || "");
        return aStr.localeCompare(bStr) * factor;
      }
      if (sortConfig.key === "del") {
        const aDel = calcularDEL(getUltimoPartoBR(a));
        const bDel = calcularDEL(getUltimoPartoBR(b));
        return compareNumber(aDel, bDel) * factor;
      }
      if (sortConfig.key === "total") {
        const aDados = medicoes[String(a?.numero ?? "")] || {};
        const bDados = medicoes[String(b?.numero ?? "")] || {};
        const aTotal =
          aDados.total !== undefined && aDados.total !== ""
            ? toNum(aDados.total)
            : toNum(aDados.manha) + toNum(aDados.tarde) + toNum(aDados.terceira);
        const bTotal =
          bDados.total !== undefined && bDados.total !== ""
            ? toNum(bDados.total)
            : toNum(bDados.manha) + toNum(bDados.tarde) + toNum(bDados.terceira);
        return compareNumber(aTotal, bTotal) * factor;
      }
      return 0;
    });
    return sorted;
  }, [linhasFiltradas, medicoes, sortConfig]);

  const resumoTabela = useMemo(() => {
    const total = linhasOrdenadas.length;
    const delSoma = linhasOrdenadas.reduce((acc, vaca) => acc + calcularDEL(getUltimoPartoBR(vaca)), 0);
    const mediaDel = total > 0 ? delSoma / total : null;
    return { total, mediaDel };
  }, [linhasOrdenadas]);

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

      if (desiredRight > window.innerWidth - 8) {
        left = window.innerWidth - 8 - popRect.width - thRect.left;
      }
      if (desiredLeft < 8) {
        left = 8 - thRect.left;
      }

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* barra de lote (salvar / editar passado) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Data da tabela: <strong>{String(dataTabela || "").split("-").reverse().join("/") || "—"}</strong>{" "}
          {dataEhPassada ? " (passado)" : " (hoje/futuro)"}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {dataEhPassada && (
            <button
              type="button"
              className="botao-editar"
              style={{ ...navBtnRound, width: "auto", padding: "0 14px", borderRadius: 999 }}
              onClick={toggleModoEdicaoPassado}
              disabled={salvandoLotes}
              title="Habilitar edição retroativa de lote"
            >
              {modoEdicaoPassado ? "Bloquear edição" : "Editar esta data"}
            </button>
          )}

          <button
            type="button"
            className="botao-acao"
            onClick={salvarLotes}
            disabled={salvandoLotes || !podeEditarLote || isOffline}
            title={
              isOffline
                ? "Disponível ao reconectar"
                : !podeEditarLote
                ? "Edição de lote está bloqueada nesta data"
                : "Salvar lotes alterados"
            }
          >
            {salvandoLotes ? "Salvando lotes..." : "💾 Salvar lote do dia"}
          </button>
        </div>
      </div>

      <div className="st-filter-hint">
        Dica: clique no título das colunas habilitadas para ordenar ou filtrar. Clique novamente para fechar.
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
            {colunasExibidas.map((coluna) => (
              <col key={coluna.key} style={{ width: coluna.width }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              {colunasExibidas.map((coluna) => (
                <th
                  key={coluna.key}
                  onMouseEnter={() => handleColEnter(coluna.key)}
                  ref={(el) => {
                    triggerRefs.current[coluna.key] = el;
                  }}
                  style={{ position: coluna.filterable ? "relative" : undefined }}
                >
                  {coluna.sortable || coluna.filterable ? (
                    <button
                      type="button"
                      data-filter-trigger={coluna.filterable ? "true" : undefined}
                      onClick={() => {
                        if (coluna.sortable) toggleSort(coluna.key);
                        if (coluna.filterable) handleTogglePopover(coluna.key);
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
                      <span className="st-th-label">{coluna.label}</span>
                      {sortConfig.key === coluna.key && sortConfig.direction && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  ) : (
                    <span className="st-th-label">{coluna.label}</span>
                  )}
                  {openPopoverKey === coluna.key && coluna.filterable && (
                    <div
                      ref={popoverRef}
                      className="st-filter-popover"
                      style={popoverStyle}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label className="st-filter__label">
                        Lote
                        <Select
                          className="st-select--compact"
                          classNamePrefix="st-select"
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          styles={selectLoteStyles}
                          options={lotesFiltroOptions}
                          value={resolveOption(lotesFiltroOptions, filtroLote)}
                          onChange={(option) => setFiltroLote(option?.value ?? "__ALL__")}
                        />
                      </label>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {linhasOrdenadas.length === 0 ? (
              <tr className="st-empty">
                <td colSpan={colunasExibidas.length} className="st-td-center">
                  {isOffline && !hasCache ? "Sem dados offline disponíveis." : "Nenhuma vaca em lactação encontrada."}
                </td>
              </tr>
            ) : (
              linhasOrdenadas.map((vaca, rowIndex) => {
                const numeroStr = String(vaca.numero ?? "");
                const dados = medicoes[numeroStr] || {};

                const totalCalc = (toNum(dados.manha) + toNum(dados.tarde) + toNum(dados.terceira)).toFixed(1);

                const del = calcularDEL(getUltimoPartoBR(vaca));

                const ultimaRegistro = ultimaMedicaoPorAnimal?.[vaca.id];
                const ultimaMed = ultimaRegistro?.data_medicao
                  ? formatISOToBR(ultimaRegistro.data_medicao)
                  : dados.total
                  ? String(dataTabela || "").split("-").reverse().join("/")
                  : "—";
                const rowId = vaca.id ?? vaca.numero ?? rowIndex;
                const rowHover = hoveredRowId === rowId;

                const colunas = [
                  { key: "numero", value: vaca.numero ?? "—", className: "st-num st-td-center" },
                  { key: "brinco", value: vaca.brinco ?? "—" },
                  { key: "del", value: String(del), className: "st-num st-td-center" },
                  { key: "manha", value: dados.manha ?? "—", className: "st-num st-td-right" },
                  { key: "tarde", value: dados.tarde ?? "—", className: "st-num st-td-right" },
                  { key: "terceira", value: dados.terceira ?? "—", className: "st-num st-td-right" },
                  { key: "total", value: dados.total ?? totalCalc ?? "—", className: "st-num st-td-right" },
                  { key: "ultima", value: ultimaMed },
                ];

                return (
                  <tr key={rowId} className={rowHover ? "st-row-hover" : ""}>
                    {colunas.map((coluna) => (
                      <td
                        key={coluna.key}
                        className={`${hoveredColKey === coluna.key ? "st-col-hover" : ""} ${
                          rowHover ? "st-row-hover" : ""
                        } ${rowHover && hoveredColKey === coluna.key ? "st-cell-hover" : ""} ${
                          coluna.className || ""
                        }`}
                        title={coluna.key === "numero" || coluna.key === "brinco" ? String(coluna.value) : undefined}
                        onMouseEnter={() => handleCellEnter(rowId, coluna.key)}
                      >
                        {coluna.value}
                      </td>
                    ))}

                    {/* Lote (vigente) — editável só quando permitido */}
                    <td
                      className={`${hoveredColKey === "lote" ? "st-col-hover" : ""} ${
                        rowHover ? "st-row-hover" : ""
                      } ${rowHover && hoveredColKey === "lote" ? "st-cell-hover" : ""}`}
                      onMouseEnter={() => handleCellEnter(rowId, "lote")}
                    >
                      <div style={{ width: "100%", minWidth: 0 }}>
                        <Select
                          value={getLoteValue(numeroStr)}
                          onChange={(opt) => onChangeLote(numeroStr, opt?.value || null)}
                          options={lotesOptions}
                          styles={selectLoteStyles}
                          isClearable
                          placeholder="—"
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          isDisabled={!podeEditarLote || salvandoLotes}
                        />
                      </div>
                    </td>

                    {/* Ações */}
                    <td
                      className={`st-td-center ${hoveredColKey === "acoes" ? "st-col-hover" : ""} ${
                        rowHover ? "st-row-hover" : ""
                      } ${rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""}`}
                      onMouseEnter={() => handleCellEnter(rowId, "acoes")}
                    >
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button type="button" className="st-btn" onClick={() => onClickFicha?.(vaca)}>
                          Ficha
                        </button>

                        <button type="button" className="st-btn" onClick={() => onClickRegistrar?.(vaca)}>
                          Registrar
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
              <td colSpan={colunasExibidas.length}>
                <div className="st-summary-row__content">
                  <span>Total de vacas exibidas: {resumoTabela.total}</span>
                  <span>
                    Média DEL (vacas exibidas):{" "}
                    {Number.isFinite(resumoTabela.mediaDel)
                      ? Math.round(resumoTabela.mediaDel)
                      : "—"}
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </div>
  );
}

/* =========================== PÁGINA LEITE =========================== */

function mergeMedicoesDia(existentes = {}, novas = {}) {
  return { ...existentes, ...novas };
}

const LEITE_CACHE_KEY = "sc_leite_cache_v1";

function readLeiteCache() {
  if (typeof localStorage === "undefined") {
    return { updatedAt: null, byDate: {}, lastAnimals: [], lastLotes: [] };
  }
  try {
    const raw = localStorage.getItem(LEITE_CACHE_KEY);
    if (!raw) return { updatedAt: null, byDate: {}, lastAnimals: [], lastLotes: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { updatedAt: null, byDate: {}, lastAnimals: [], lastLotes: [] };
    }
    return {
      updatedAt: parsed.updatedAt || null,
      byDate: parsed.byDate && typeof parsed.byDate === "object" ? parsed.byDate : {},
      lastAnimals: Array.isArray(parsed.lastAnimals) ? parsed.lastAnimals : [],
      lastLotes: Array.isArray(parsed.lastLotes) ? parsed.lastLotes : [],
    };
  } catch (error) {
    console.warn("Falha ao ler cache de leite:", error);
    return { updatedAt: null, byDate: {}, lastAnimals: [], lastLotes: [] };
  }
}

function writeLeiteCache(nextCache) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LEITE_CACHE_KEY, JSON.stringify(nextCache));
}

function hasLeiteCache(cache) {
  if (!cache) return false;
  return (
    (cache.lastAnimals && cache.lastAnimals.length > 0) ||
    (cache.lastLotes && cache.lastLotes.length > 0) ||
    Object.keys(cache.byDate || {}).length > 0
  );
}

function getCacheDateRange(cache) {
  const dates = Object.keys(cache?.byDate || {});
  if (dates.length === 0) return null;
  dates.sort();
  return { min: dates[0], max: dates[dates.length - 1] };
}

function updateLeiteCache({ dateISO, vacas, lotes, medicoesDia, ultimaMedicaoPorAnimal }) {
  const cacheAtual = readLeiteCache();
  const nextCache = {
    updatedAt: new Date().toISOString(),
    byDate: {
      ...cacheAtual.byDate,
      ...(dateISO
        ? {
            [dateISO]: {
              dateISO,
              medicoesDia: medicoesDia || [],
              ultimaMedicaoPorAnimal: ultimaMedicaoPorAnimal || {},
            },
          }
        : {}),
    },
    lastAnimals: Array.isArray(vacas) ? vacas : cacheAtual.lastAnimals,
    lastLotes: Array.isArray(lotes) ? lotes : cacheAtual.lastLotes,
  };
  writeLeiteCache(nextCache);
  console.log("LEITE cache atualizado");
  return nextCache;
}

export default function Leite() {
  const [vacas, setVacas] = useState([]);
  const [ultimaMedicaoPorAnimal, setUltimaMedicaoPorAnimal] = useState({});
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [hasCache, setHasCache] = useState(false);
  const [cacheMetadata, setCacheMetadata] = useState({ updatedAt: null, dateRange: null });
  const [sincronizado, setSincronizado] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const vacasLactacao = useMemo(() => {
    const filtradas = vacas.filter(isLactatingAnimal);
    console.log("Leite - vacas em lactação (filtradas):", filtradas);
    return filtradas;
  }, [vacas]);

  const [dataAtual, setDataAtual] = useState(ymdHoje()); // calendário
  const [dataTabela, setDataTabela] = useState(null); // tabela
  const jaSetouUltimaTabelaRef = useRef(false);

  const [medicoesPorDia, setMedicoesPorDia] = useState({});
  const medicoesDoDiaTabela = medicoesPorDia[dataTabela] || {};

  const [modalAberto, setModalAberto] = useState(false);
  const [vacaSelecionada, setVacaSelecionada] = useState(null);

  const [fichaAberta, setFichaAberta] = useState(false);
  const [vacaFicha, setVacaFicha] = useState(null);

  // ✅ lotes de Lactação do banco (para selects)
  const [lotesLeite, setLotesLeite] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(false);

  const lotesOptions = useMemo(() => {
    return (lotesLeite || []).map((l) => ({
      value: l.id,
      label: `${l.nome} — ${l.nivel_produtivo}`,
      meta: { nome: l.nome, nivel: l.nivel_produtivo },
    }));
  }, [lotesLeite]);

  // ✅ controle de edição retroativa
  const hojeISO = useMemo(() => ymdHoje(), []);
  const dataEhPassada = useMemo(() => {
    if (!dataTabela) return false;
    return dataTabela < hojeISO;
  }, [dataTabela, hojeISO]);

  const [modoEdicaoPassado, setModoEdicaoPassado] = useState(false);
  useEffect(() => {
    setModoEdicaoPassado(false);
  }, [dataTabela]);

  const podeEditarLote = useMemo(() => {
    return !dataEhPassada || modoEdicaoPassado;
  }, [dataEhPassada, modoEdicaoPassado]);

  const loteEfetivoPorNumero = useMemo(() => {
    const mapNumeroToLoteId = {};
    vacasLactacao.forEach((v) => {
      const numeroStr = String(v.numero ?? "");
      if (v?.lote_id) {
        mapNumeroToLoteId[numeroStr] = v.lote_id;
      }
    });
    return mapNumeroToLoteId;
  }, [vacasLactacao]);
  const [loteEditPorNumero, setLoteEditPorNumero] = useState({});
  const [salvandoLotes, setSalvandoLotes] = useState(false);

  const statusSyncTexto = useMemo(() => {
    if (isOffline) {
      if (hasCache && cacheMetadata?.updatedAt) {
        const textoData = new Date(cacheMetadata.updatedAt).toLocaleString("pt-BR");
        return `Offline: usando dados salvos em ${textoData}`;
      }
      return "Offline: sem dados salvos no computador";
    }
    return sincronizado ? "Online: dados atualizados" : "Online: dados atualizados";
  }, [isOffline, hasCache, cacheMetadata, sincronizado]);

  const montarMapaMedicoes = useCallback((rows, listaVacas) => {
    const mapaPorNumero = {};
    (rows || []).forEach((linha) => {
      const vaca = (listaVacas || []).find((v) => v.id === linha.animal_id);
      if (!vaca) return;
      const numeroStr = String(vaca.numero ?? "");
      mapaPorNumero[numeroStr] = {
        manha:
          linha.litros_manha !== null && linha.litros_manha !== undefined
            ? String(linha.litros_manha)
            : "",
        tarde:
          linha.litros_tarde !== null && linha.litros_tarde !== undefined
            ? String(linha.litros_tarde)
            : "",
        terceira:
          linha.litros_terceira !== null && linha.litros_terceira !== undefined
            ? String(linha.litros_terceira)
            : "",
        total:
          linha.litros_total !== null && linha.litros_total !== undefined
            ? String(linha.litros_total)
            : "",
      };
    });
    return mapaPorNumero;
  }, []);

  const fetchUltimaDataOnline = useCallback(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return { data: null, error: authError || new Error("Usuário não encontrado") };
    }

    const { data, error } = await supabase
      .from("medicoes_leite")
      .select("data_medicao")
      .eq("user_id", authData.user.id)
      .order("data_medicao", { ascending: false })
      .limit(1);

    if (error) {
      return { data: null, error };
    }

    return { data: data?.[0]?.data_medicao || null, error: null };
  }, []);

  const loadData = useCallback(
    async (dateISO) => {
      if (!dateISO) return;

      if (isOffline) {
        setLoadingLotes(false);
        const cache = readLeiteCache();
        const possuiCache = hasLeiteCache(cache);
        const dateRange = getCacheDateRange(cache);
        setHasCache(possuiCache);
        setCacheMetadata({ updatedAt: cache.updatedAt, dateRange });

        if (!possuiCache) {
          setVacas([]);
          setLotesLeite([]);
          setUltimaMedicaoPorAnimal({});
          setMedicoesPorDia((prev) => ({ ...prev, [dateISO]: {} }));
          return;
        }

        const payload = cache.byDate?.[dateISO] || {};
        const vacasCache = cache.lastAnimals || [];
        setVacas(vacasCache);
        setLotesLeite(cache.lastLotes || []);
        setUltimaMedicaoPorAnimal(payload?.ultimaMedicaoPorAnimal || {});
        const mapaPorNumero = montarMapaMedicoes(payload?.medicoesDia || [], vacasCache);
        setMedicoesPorDia((prev) => ({
          ...prev,
          [dateISO]: mapaPorNumero,
        }));
        return;
      }

      try {
        setLoadingLotes(true);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
          console.error("Erro ao obter usuário:", authError);
          setLoadingLotes(false);
          return;
        }

        const userId = authData.user.id;

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
          console.error("Erro ao carregar dados de leite:", error);
          setLoadingLotes(false);
          return;
        }

        const vacasData = Array.isArray(animaisRes.data) ? animaisRes.data : [];
        const lotesData = Array.isArray(lotesRes.data) ? lotesRes.data : [];
        const medicoesDia = Array.isArray(medicoesRes.data) ? medicoesRes.data : [];

        const ultimaMedicaoMap = {};
        (ultimaRes.data || []).forEach((linha) => {
          if (!ultimaMedicaoMap[linha.animal_id]) {
            ultimaMedicaoMap[linha.animal_id] = linha;
          }
        });

        setVacas(vacasData);
        setLotesLeite(lotesData);
        setUltimaMedicaoPorAnimal(ultimaMedicaoMap);

        const mapaPorNumero = montarMapaMedicoes(medicoesDia, vacasData);
        setMedicoesPorDia((prev) => ({
          ...prev,
          [dateISO]: mapaPorNumero,
        }));

        setLoadingLotes(false);
        const cacheAtualizado = updateLeiteCache({
          dateISO,
          vacas: vacasData,
          lotes: lotesData,
          medicoesDia,
          ultimaMedicaoPorAnimal: ultimaMedicaoMap,
        });
        setCacheMetadata({ updatedAt: cacheAtualizado.updatedAt, dateRange: getCacheDateRange(cacheAtualizado) });
        setHasCache(true);
        setSincronizado(true);
      } catch (e) {
        console.error("Erro inesperado ao carregar dados de leite:", e);
        setLoadingLotes(false);
      }
    },
    [isOffline, montarMapaMedicoes]
  );

  /* ===== Resumo do dia (baseado na DATA DA TABELA) ===== */
  const resumoDia = useMemo(() => {
    const toNum = (v) => parseFloat(String(v ?? "0").replace(",", ".")) || 0;

    let producaoTotal = 0;
    let melhor = null;
    let pior = null;
    let qtdComMedicao = 0;

    vacasLactacao.forEach((vaca) => {
      const numeroStr = String(vaca.numero ?? "");
      const dados = medicoesDoDiaTabela[numeroStr] || {};

      const total =
        dados.total !== undefined && dados.total !== ""
          ? toNum(dados.total)
          : toNum(dados.manha) + toNum(dados.tarde) + toNum(dados.terceira);

      if (total > 0) {
        producaoTotal += total;
        qtdComMedicao += 1;
        if (!melhor || total > melhor.total) melhor = { vaca, total };
        if (!pior || total < pior.total) pior = { vaca, total };
      }
    });

    const mediaPorVaca = vacasLactacao.length > 0 ? producaoTotal / vacasLactacao.length : 0;

    return {
      producaoTotal: producaoTotal.toFixed(1),
      mediaPorVaca: mediaPorVaca.toFixed(1),
      melhor,
      pior,
      qtdComMedicao,
    };
  }, [vacasLactacao, medicoesDoDiaTabela]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    (async () => {
      if (jaSetouUltimaTabelaRef.current) return;

      if (isOffline) {
        const cache = readLeiteCache();
        if (!ativo) return;
        const possuiCache = hasLeiteCache(cache);
        const dateRange = getCacheDateRange(cache);
        setHasCache(possuiCache);
        setCacheMetadata({ updatedAt: cache.updatedAt, dateRange });
        const fallbackDate = dateRange?.max || ymdHoje();
        setDataTabela(fallbackDate);
        setDataAtual(fallbackDate);
        jaSetouUltimaTabelaRef.current = true;
        return;
      }

      const { data, error } = await fetchUltimaDataOnline();
      if (!ativo) return;
      if (error) {
        console.error("Erro ao buscar última data de medição:", error);
      }
      const resolvedDate = data || ymdHoje();
      setDataTabela(resolvedDate);
      setDataAtual(resolvedDate);
      jaSetouUltimaTabelaRef.current = true;
    })();

    return () => {
      ativo = false;
    };
  }, [isOffline, fetchUltimaDataOnline]);

  useEffect(() => {
    let ativo = true;

    (async () => {
      if (!dataTabela) return;

      await loadData(dataTabela);
    })();

    return () => {
      ativo = false;
    };
  }, [dataTabela, loadData, reloadKey]);

  // ✅ navegação (setas) muda tabela E calendário juntos
  const irParaAnterior = () => {
    const base = dataTabela || dataAtual || ymdHoje();
    const nova = addDaysISO(base, -1);
    setDataTabela(nova);
    setDataAtual(nova);
  };

  const irParaProxima = () => {
    const base = dataTabela || dataAtual || ymdHoje();
    const nova = addDaysISO(base, +1);
    setDataTabela(nova);
    setDataAtual(nova);
  };

  const abrirMedicaoColetiva = () => {
    setVacaSelecionada(null);
    setModalAberto(true);
  };

  const abrirMedicaoDaVaca = (vaca) => {
    setVacaSelecionada(vaca);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setVacaSelecionada(null);
  };

  // ✅ SALVAR medições: tabela vai para o dia salvo; calendário volta para HOJE
  const handleSalvarMedicoes = async ({ data, medicoes }) => {
    setMedicoesPorDia((prev) => {
      const existentes = prev[data] || {};
      const mescladas = mergeMedicoesDia(existentes, medicoes);
      return { ...prev, [data]: mescladas };
    });

    if (data) {
      const rows = [];
      const ultimaMap = { ...ultimaMedicaoPorAnimal };
      Object.entries(medicoes || {}).forEach(([numeroStr, dados]) => {
        const vaca = vacasLactacao.find((v) => String(v.numero ?? "") === String(numeroStr));
        if (!vaca?.id) return;
        const temAlgumValor =
          dados?.total !== undefined ||
          dados?.manha !== undefined ||
          dados?.tarde !== undefined ||
          dados?.terceira !== undefined;
        if (!temAlgumValor) return;
        const linha = {
          animal_id: vaca.id,
          data_medicao: data,
          litros_manha: dados?.manha ?? null,
          litros_tarde: dados?.tarde ?? null,
          litros_terceira: dados?.terceira ?? null,
          litros_total: dados?.total ?? null,
        };
        rows.push(linha);
        ultimaMap[vaca.id] = linha;
      });

      if (rows.length > 0) {
        const cacheAtualizado = updateLeiteCache({
          dateISO: data,
          vacas,
          lotes: lotesLeite,
          medicoesDia: rows,
          ultimaMedicaoPorAnimal: ultimaMap,
        });
        setUltimaMedicaoPorAnimal(ultimaMap);
        setCacheMetadata({ updatedAt: cacheAtualizado.updatedAt, dateRange: getCacheDateRange(cacheAtualizado) });
        setHasCache(true);
      }
    }

    setDataTabela(data);
    setDataAtual(ymdHoje());
    setReloadKey((prev) => prev + 1);
  };

  // Abre a ficha leiteira
  const handleClickFicha = (vaca) => {
    setVacaFicha(vaca);
    setFichaAberta(true);
  };

  const fecharFicha = () => {
    setFichaAberta(false);
    setVacaFicha(null);
  };

  // ✅ editar lote na tabela (não salva ainda)
  const onChangeLote = (numeroStr, loteId) => {
    if (!podeEditarLote) return;
    setLoteEditPorNumero((prev) => ({ ...prev, [String(numeroStr)]: loteId }));
  };

  // ✅ salvar lote(s) do dia
  const salvarLotes = async () => {
    try {
      if (!podeEditarLote) return;
      if (!dataTabela) return;
      if (isOffline) {
        return;
      }

      setSalvandoLotes(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setSalvandoLotes(false);
        return;
      }

      const alteradas = Object.entries(loteEditPorNumero).filter(([_, loteId]) => loteId !== undefined);
      if (alteradas.length === 0) {
        setSalvandoLotes(false);
        return;
      }

      const updatesAnimais = [];

      alteradas.forEach(([numeroStr, loteId]) => {
        const vaca = vacasLactacao.find((v) => String(v.numero ?? "") === String(numeroStr));
        if (!vaca?.id) return;

        if (String(vaca.lote_id ?? "") !== String(loteId ?? "")) {
          updatesAnimais.push({ animal_id: vaca.id, lote_id: loteId ?? null });
        }
      });

      if (updatesAnimais.length > 0) {
        const results = await Promise.all(
          updatesAnimais.map((u) => supabase.from("animais").update({ lote_id: u.lote_id }).eq("id", u.animal_id))
        );
        const algumErro = results.find((r) => r.error);
        if (algumErro?.error) {
          console.error("Erro ao atualizar lote_id em animais:", algumErro.error);
          alert("O lote do dia foi salvo, mas houve erro ao atualizar lote atual do animal (veja console).");
        }
      }

      setVacas((prev) =>
        (prev || []).map((v) => {
          const numeroStr = String(v.numero ?? "");
          if (!(numeroStr in loteEditPorNumero)) return v;
          return { ...v, lote_id: loteEditPorNumero[numeroStr] ?? null };
        })
      );
      setLoteEditPorNumero({});

      setReloadKey((prev) => prev + 1);
      setSalvandoLotes(false);
    } catch (e) {
      console.error("Erro inesperado ao salvar lotes:", e);
      alert("Erro inesperado ao salvar lotes.");
      setSalvandoLotes(false);
    }
  };

  return (
    <div className="w-full px-6 py-4 font-sans">
      {/* Toolbar superior */}
      <div style={toolbar}>
        <button type="button" onClick={abrirMedicaoColetiva} className="botao-acao">
          ➕ Nova Medição
        </button>

        <div style={toolbarRight}>
          <button type="button" onClick={irParaAnterior} title="Dia anterior" className="botao-editar" style={navBtnRound}>
            ‹
          </button>

          <input
            type="date"
            value={dataAtual}
            onChange={(e) => setDataAtual(e.target.value)}
            className="border border-gray-300 text-base font-medium shadow-sm"
            style={inputToolbar}
          />

          <button type="button" onClick={irParaProxima} title="Próximo dia" className="botao-editar" style={navBtnRound}>
            ›
          </button>
        </div>
      </div>

      <ResumoLeiteDia resumoDia={resumoDia} qtdLactacao={vacasLactacao.length} />

      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
        {statusSyncTexto}
      </div>

      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
        {loadingLotes
          ? "Carregando lotes de Lactação..."
          : `Lotes disponíveis: ${(lotesLeite || []).length} (Alta/Média/Baixa Produção)`}
      </div>

      <TabelaResumoDia
        vacas={vacasLactacao}
        medicoes={medicoesDoDiaTabela}
        dataTabela={dataTabela || ymdHoje()}
        onClickFicha={handleClickFicha}
        onClickRegistrar={abrirMedicaoDaVaca}
        lotesOptions={lotesOptions}
        loteEfetivoPorNumero={loteEfetivoPorNumero}
        loteEditPorNumero={loteEditPorNumero}
        onChangeLote={onChangeLote}
        salvarLotes={salvarLotes}
        salvandoLotes={salvandoLotes}
        podeEditarLote={podeEditarLote}
        isOffline={isOffline}
        hasCache={hasCache}
        ultimaMedicaoPorAnimal={ultimaMedicaoPorAnimal}
        dataEhPassada={dataEhPassada}
        modoEdicaoPassado={modoEdicaoPassado}
        toggleModoEdicaoPassado={() => setModoEdicaoPassado((v) => !v)}
      />

      {modalAberto && (
        <ModalMedicaoLeite
          aberto={modalAberto}
          dataInicial={dataAtual}
          vacas={vacaSelecionada ? [vacaSelecionada] : vacasLactacao}
          medicoesIniciais={medicoesPorDia[dataAtual] || {}}
          onFechar={fecharModal}
          onSalvar={handleSalvarMedicoes}
        />
      )}

      {fichaAberta && vacaFicha && <FichaLeiteira vaca={vacaFicha} onFechar={fecharFicha} />}
    </div>
  );
}

/* ===== estilos comuns locais (para toolbar) ===== */
const toolbar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const toolbarRight = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const inputToolbar = {
  width: 180,
  height: 36,
  padding: "0 10px",
  borderRadius: 8,
};

const navBtnRound = {
  width: 38,
  height: 36,
  padding: 0,
  borderRadius: "9999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  fontSize: 18,
};
