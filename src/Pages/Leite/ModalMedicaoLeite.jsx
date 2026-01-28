// src/pages/Leite/ModalMedicaoLeite.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/tabelaModerna.css";

/* ===== helpers ===== */
const toNum = (v) => parseFloat(String(v ?? "0").replace(",", ".")) || 0;
const LEITE_CACHE_KEY = "sc_leite_cache_v1";
const LEITE_PENDING_KEY = "sc_leite_pending_v1";

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

function readLeitePending() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEITE_PENDING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Falha ao ler fila offline de leite:", error);
    return [];
  }
}

function writeLeitePending(nextQueue) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LEITE_PENDING_KEY, JSON.stringify(nextQueue));
}

function resolveCachedUserId(cache) {
  const animal = (cache.lastAnimals || []).find((item) => item?.user_id || item?.userId);
  return animal?.user_id || animal?.userId || null;
}

function updateLeiteCache({ dateISO, medicoesDia, ultimaMedicaoPorAnimal, vacas, lotes }) {
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
              ultimaMedicaoPorAnimal: ultimaMedicaoPorAnimal || cacheAtual.byDate?.[dateISO]?.ultimaMedicaoPorAnimal || {},
            },
          }
        : {}),
    },
    lastAnimals: Array.isArray(vacas) ? vacas : cacheAtual.lastAnimals,
    lastLotes: Array.isArray(lotes) ? lotes : cacheAtual.lastLotes,
  };
  writeLeiteCache(nextCache);
  return nextCache;
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
  return Array.isArray(cache)
    ? cache
    : Array.isArray(cache?.medicoes)
    ? cache.medicoes
    : [];
}

function upsertMedicoesCache(list, itens) {
  const next = [...list];
  (itens || []).forEach((item) => {
    const idx = next.findIndex((c) => {
      if (item?.id && c?.id) return String(item.id) === String(c.id);
      return (
        String(c?.user_id || "") === String(item?.user_id || "") &&
        String(c?.animal_id || "") === String(item?.animal_id || "") &&
        String(c?.data_medicao || "") === String(item?.data_medicao || "")
      );
    });

    if (idx >= 0) {
      next[idx] = { ...next[idx], ...item };
    } else {
      next.push(item);
    }
  });
  return next;
}

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

function calcularDEL(partoBR) {
  const dt = parseBR(partoBR);
  if (!dt) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((hoje - dt) / 86400000));
}

// usa ultimo_parto (DATE do Supabase) e converte para BR
function getUltimoPartoBR(animal) {
  const iso = animal?.ultimo_parto;
  if (!iso) return "";
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? "" : toBR(dt);
}

// ✅ soma/subtrai dias em string ISO yyyy-mm-dd
function addDaysISO(iso, delta) {
  if (!iso) return iso;
  const dt = new Date(iso + "T00:00:00");
  dt.setDate(dt.getDate() + delta);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ===== opções de tipo de lançamento (react-select) ===== */
const opcoesTipoLancamento = [
  { value: "total", label: "Somente total (litros/dia)" },
  { value: "2", label: "2 ordenhas (manhã + tarde)" },
  { value: "3", label: "3 ordenhas (manhã + tarde + 3ª)" },
];

/* estilos do react-select para ficar no padrão dos inputs */
const selectTipoStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "40px",
    borderRadius: "0.75rem",
    borderColor: state.isFocused ? "#60a5fa" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 1px #60a5fa" : "none",
    "&:hover": { borderColor: "#60a5fa" },
    backgroundColor: "#f9fafb",
    fontSize: "0.95rem",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 0.75rem" }),
  menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden" }),
  menuPortal: (base) => ({ ...base, zIndex: 9999999 }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.95rem",
    backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#e5edff" : "#fff",
    color: state.isSelected ? "#fff" : "#111827",
    cursor: "pointer",
  }),
  singleValue: (base) => ({ ...base, color: "#111827" }),
};

/* ===== estilo base para inputs de litragem ===== */
const inputMedirBase = {
  width: "90px",
  minWidth: "80px",
  padding: "0.35rem 0.55rem",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#f9fafb",
  fontSize: "0.9rem",
  textAlign: "center",
  outline: "none",
  boxSizing: "border-box",
};

/* ===== react-select do Lote na tabela (compacto) ===== */
const selectLoteStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    height: 36,
    borderRadius: 999,
    borderColor: state.isFocused ? "#60a5fa" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 1px #60a5fa" : "none",
    backgroundColor: "#f9fafb",
    fontSize: 13,
    cursor: "pointer",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px" }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
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

/* ===================== TABELA DE MEDIÇÃO ===================== */
function TabelaMedicaoLeite({
  vacas = [],
  tipoLancamento,
  medicoes,
  onChange,
  onKeyDownCampo,
  lotesOptions = [],
  inputRefs,
  bloquearLote = false,
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

  const colunas = useMemo(() => {
    const base = [
      { key: "numero", label: "Número", sortable: true, align: "center" },
      { key: "brinco", label: "Brinco" },
      { key: "del", label: "DEL", sortable: true, align: "center" },
    ];
    const med = [];
    if (tipoLancamento !== "total") {
      med.push(
        { key: "manha", label: "Manhã", align: "right" },
        { key: "tarde", label: "Tarde", align: "right" }
      );
    }
    if (tipoLancamento === "3") {
      med.push({ key: "terceira", label: "3ª", align: "right" });
    }
    med.push({ key: "total", label: "Total", sortable: true, align: "right" });
    med.push({ key: "lote", label: "Lote", filterable: true });
    return [...base, ...med];
  }, [tipoLancamento]);

  const getLoteValue = (dados) => {
    const id = dados?.lote_id || null;
    if (!id) return null;
    return lotesOptions.find((o) => o.value === id) || null;
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
      const dados = medicoes[numeroStr] || {};
      const loteId = dados?.lote_id || null;

      if (filtroLote !== "__ALL__") {
        if (filtroLote === "__SEM_LOTE__") {
          if (loteId != null && loteId !== "") return false;
        } else if (String(loteId ?? "") !== String(filtroLote)) {
          return false;
        }
      }
      return true;
    });
  }, [filtroLote, medicoes, vacas]);

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
        const aTotal = toNum(aDados.total);
        const bTotal = toNum(bDados.total);
        return compareNumber(aTotal, bTotal) * factor;
      }
      return 0;
    });
    return sorted;
  }, [linhasFiltradas, medicoes, sortConfig]);

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
    <div>
      <div className="st-filter-hint" style={filterHintStyle}>
        Dica: clique no título das colunas habilitadas para ordenar ou filtrar. Clique novamente para fechar.
      </div>
      <div className="st-table-container">
        <div className="st-table-wrap">
          <div className="st-scroll" style={tabelaScrollX}>
            <table
              className="st-table st-table--darkhead"
              onMouseLeave={() => {
                setHoveredRowId(null);
                setHoveredColKey(null);
              }}
            >
              <thead>
                <tr>
                  {colunas.map((coluna) => (
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
                    <td colSpan={colunas.length} className="st-td-center">
                      Nenhuma vaca em lactação encontrada.
                    </td>
                  </tr>
                ) : (
                  linhasOrdenadas.map((vaca, rowIndex) => {
                    const numeroStr = String(vaca.numero ?? "");
                    const dados = medicoes[numeroStr] || {};
                    const del = calcularDEL(getUltimoPartoBR(vaca));
                    const rowId = vaca.id ?? vaca.numero ?? rowIndex;
                    const rowHover = hoveredRowId === rowId;

                    const inputs = [];

                    if (tipoLancamento !== "total") {
                      inputs.push(
                        <input
                          key="manha"
                          ref={(el) => (inputRefs.current[`${rowIndex}-manha`] = el)}
                          type="number"
                          inputMode="decimal"
                          className="input-medir"
                          style={inputMedirBase}
                          value={dados.manha ?? ""}
                          onChange={(e) => onChange(numeroStr, "manha", e.target.value)}
                          onKeyDown={(e) => onKeyDownCampo(e, rowIndex, "manha")}
                        />,
                        <input
                          key="tarde"
                          ref={(el) => (inputRefs.current[`${rowIndex}-tarde`] = el)}
                          type="number"
                          inputMode="decimal"
                          className="input-medir"
                          style={inputMedirBase}
                          value={dados.tarde ?? ""}
                          onChange={(e) => onChange(numeroStr, "tarde", e.target.value)}
                          onKeyDown={(e) => onKeyDownCampo(e, rowIndex, "tarde")}
                        />
                      );
                    }

                    if (tipoLancamento === "3") {
                      inputs.push(
                        <input
                          key="terceira"
                          ref={(el) => (inputRefs.current[`${rowIndex}-terceira`] = el)}
                          type="number"
                          inputMode="decimal"
                          className="input-medir"
                          style={inputMedirBase}
                          value={dados.terceira ?? ""}
                          onChange={(e) => onChange(numeroStr, "terceira", e.target.value)}
                          onKeyDown={(e) => onKeyDownCampo(e, rowIndex, "terceira")}
                        />
                      );
                    }

                    const totalReadOnly = tipoLancamento !== "total";
                    inputs.push(
                      <input
                        key="total"
                        ref={(el) => (inputRefs.current[`${rowIndex}-total`] = el)}
                        type="number"
                        inputMode="decimal"
                        className="input-medir"
                        style={{
                          ...inputMedirBase,
                          backgroundColor: totalReadOnly ? "#e5edff" : "#ffffff",
                          cursor: totalReadOnly ? "not-allowed" : "auto",
                          fontWeight: totalReadOnly ? 600 : 500,
                        }}
                        value={dados.total ?? ""}
                        readOnly={totalReadOnly}
                        onChange={(e) => !totalReadOnly && onChange(numeroStr, "total", e.target.value)}
                      />
                    );

                    return (
                      <tr key={rowId} className={rowHover ? "st-row-hover" : ""}>
                        <td
                          className={`${hoveredColKey === "numero" ? "st-col-hover" : ""} ${
                            rowHover ? "st-row-hover" : ""
                          } ${rowHover && hoveredColKey === "numero" ? "st-cell-hover" : ""} st-num st-td-center`}
                          onMouseEnter={() => handleCellEnter(rowId, "numero")}
                        >
                          {vaca.numero ?? "—"}
                        </td>
                        <td
                          className={`${hoveredColKey === "brinco" ? "st-col-hover" : ""} ${
                            rowHover ? "st-row-hover" : ""
                          } ${rowHover && hoveredColKey === "brinco" ? "st-cell-hover" : ""}`}
                          onMouseEnter={() => handleCellEnter(rowId, "brinco")}
                        >
                          {vaca.brinco ?? "—"}
                        </td>
                        <td
                          className={`${hoveredColKey === "del" ? "st-col-hover" : ""} ${
                            rowHover ? "st-row-hover" : ""
                          } ${rowHover && hoveredColKey === "del" ? "st-cell-hover" : ""} st-num st-td-center`}
                          onMouseEnter={() => handleCellEnter(rowId, "del")}
                        >
                          {String(del)}
                        </td>

                        {inputs.map((inputEl, idx) => {
                          const colKey = colunas[3 + idx]?.key || `input-${idx}`;
                          return (
                            <td
                              key={colKey}
                              className={`${hoveredColKey === colKey ? "st-col-hover" : ""} ${
                                rowHover ? "st-row-hover" : ""
                              } ${rowHover && hoveredColKey === colKey ? "st-cell-hover" : ""}`}
                              onMouseEnter={() => handleCellEnter(rowId, colKey)}
                            >
                              {inputEl}
                            </td>
                          );
                        })}

                        <td
                          className={`${hoveredColKey === "lote" ? "st-col-hover" : ""} ${
                            rowHover ? "st-row-hover" : ""
                          } ${rowHover && hoveredColKey === "lote" ? "st-cell-hover" : ""}`}
                          onMouseEnter={() => handleCellEnter(rowId, "lote")}
                        >
                          <div style={{ minWidth: 210 }}>
                            <Select
                              value={getLoteValue(dados)}
                              onChange={(opt) => {
                                const loteId = opt?.value || "";
                                onChange(numeroStr, "lote_id", loteId);
                              }}
                              options={lotesOptions}
                              styles={selectLoteStyles}
                              isClearable
                              placeholder="—"
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                              isDisabled={bloquearLote}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== MODAL MEDIÇÃO ===================== */

export default function ModalMedicaoLeite({
  aberto,
  dataInicial,
  vacas = [],
  medicoesIniciais = {},
  onFechar,
  onSalvar,
}) {
  const [dataMedicao, setDataMedicao] = useState(dataInicial);
  const [tipoLancamento, setTipoLancamento] = useState("2"); // padrão: 2 ordenhas

  const [medicoes, setMedicoes] = useState({});
  const [salvando, setSalvando] = useState(false);
  const inputRefs = useRef({});

  const [userId, setUserId] = useState(null);

  // ✅ lotes de Lactação (Alta/Média/Baixa) do banco
  const [lotesLeite, setLotesLeite] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(false);

  // ✅ persistência de lote dentro do modal (não “limpar” ao trocar datas)
  const loteCacheRef = useRef({}); // numeroStr -> lote_id (última seleção conhecida no modal)

  // ✅ bloquear lote no passado, a menos que habilite “Editar esta data”
  const [modoEdicaoPassado, setModoEdicaoPassado] = useState(false);

  const hojeISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }, []);

  const dataEhPassada = useMemo(() => {
    if (!dataMedicao) return false;
    return dataMedicao < hojeISO; // ISO yyyy-mm-dd: comparação por string funciona
  }, [dataMedicao, hojeISO]);

  const bloquearLote = dataEhPassada && !modoEdicaoPassado;

  const lotesOptions = useMemo(() => {
    return (lotesLeite || []).map((l) => ({
      value: l.id,
      label: `${l.nome} — ${l.nivel_produtivo}`,
      meta: { nome: l.nome, nivel: l.nivel_produtivo },
    }));
  }, [lotesLeite]);

  const calcularTotal = useCallback(
    ({ manha, tarde, terceira }) => {
      const m = toNum(manha);
      const t = toNum(tarde);
      const c = toNum(terceira);
      if (tipoLancamento === "3") return (m + t + c).toFixed(1);
      if (tipoLancamento === "2") return (m + t).toFixed(1);
      return ""; // no modo "total" quem digita é o usuário
    },
    [tipoLancamento]
  );

  // ✅ cria base vazia para TODAS as vacas (com cache de lote)
  const criarMapaVazio = useCallback(() => {
    const base = {};
    (vacas || []).forEach((v) => {
      const numeroStr = String(v.numero ?? "");
      const loteIdCache = loteCacheRef.current[numeroStr];
      base[numeroStr] = {
        lote_id: loteIdCache || v?.lote_id || "",
      };
    });
    return base;
  }, [vacas]);

  // ✅ listener global ESC para fechar
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => {
      if (e.key === "Escape") onFechar?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, onFechar]);

  // ✅ pega userId ao abrir
  useEffect(() => {
    if (!aberto) return;
    let ativo = true;

    (async () => {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        const cache = readLeiteCache();
        if (!ativo) return;
        setUserId(resolveCachedUserId(cache));
        return;
      }

      const { data: authData, error } = await supabase.auth.getUser();
      if (!ativo) return;

      if (error || !authData?.user) {
        console.error("Erro ao obter usuário:", error);
        setUserId(null);
        return;
      }
      setUserId(authData.user.id);
    })();

    return () => {
      ativo = false;
    };
  }, [aberto]);

  // ✅ carrega lotes do banco ao abrir (apenas Lactação com nível e ativo)
  useEffect(() => {
    if (!aberto) return;
    if (!userId) return;

    let ativo = true;
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    setLoadingLotes(true);

    (async () => {
      if (offline) {
        const cache = readLeiteCache();
        if (!ativo) return;
        setLotesLeite(Array.isArray(cache.lastLotes) ? cache.lastLotes : []);
        setLoadingLotes(false);
        return;
      }

      const { data, error } = await supabase
        .from("lotes")
        .select("id,nome,funcao,nivel_produtivo,ativo")
        .eq("funcao", "Lactação")
        .eq("ativo", true)
        .not("nivel_produtivo", "is", null)
        .order("nome", { ascending: true });

      if (!ativo) return;

      if (error) {
        console.error("Erro ao carregar lotes (Lactação):", error);
        setLotesLeite([]);
        setLoadingLotes(false);
        return;
      }

      setLotesLeite(Array.isArray(data) ? data : []);
      setLoadingLotes(false);
    })();

    return () => {
      ativo = false;
    };
  }, [aberto, userId]);

  // ✅ ao abrir: define data e carrega medições iniciais (se vierem)
  useEffect(() => {
    if (!aberto) return;

    setDataMedicao(dataInicial);

    const base = criarMapaVazio();
    Object.keys(base).forEach((numeroStr) => {
      base[numeroStr] = { ...base[numeroStr], ...(medicoesIniciais[numeroStr] || {}) };
    });

    setMedicoes(base);
  }, [aberto, dataInicial, medicoesIniciais, criarMapaVazio]);

  // ✅ reseta modo edição ao trocar a data (evita “ficar editando passado sem querer”)
  useEffect(() => {
    if (!aberto) return;
    setModoEdicaoPassado(false);
  }, [aberto, dataMedicao]);

  // ✅ helper: traduz lote_id -> nome (para salvar em medicoes_leite.lote)
  const nomeDoLote = useCallback(
    (loteId) => {
      if (!loteId) return "";
      const l = (lotesLeite || []).find((x) => x.id === loteId);
      return l?.nome || "";
    },
    [lotesLeite]
  );

  // ✅ CARREGAR DO BANCO SEMPRE QUE TROCAR A DATA
  const carregarMedicoesDaData = useCallback(
    async (dataISO) => {
      if (!aberto) return;
      if (!userId) return;

      const ids = (vacas || []).map((v) => v.id).filter(Boolean);
      const baseVazio = criarMapaVazio();

      if (ids.length === 0) {
        setMedicoes(baseVazio);
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const cache = readLeiteCache();
        const payload = cache.byDate?.[dataISO] || {};
        const filtradas = normalizeCacheList(payload.medicoesDia || []);

        if (filtradas.length > 0) {
          const tipoCache = filtradas[0]?.tipo_lancamento;
          if (tipoCache === "total" || tipoCache === "2" || tipoCache === "3") {
            setTipoLancamento(tipoCache);
          }
        }

        const mapa = { ...baseVazio };
        filtradas.forEach((r) => {
          const vaca = (vacas || []).find((v) => v.id === r.animal_id);
          if (!vaca) return;
          const numeroStr = String(vaca.numero ?? "");
          mapa[numeroStr] = {
            ...mapa[numeroStr],
            manha: r.litros_manha ?? "",
            tarde: r.litros_tarde ?? "",
            terceira: r.litros_terceira ?? "",
            total: r.litros_total ?? "",
          };
        });
        setMedicoes(mapa);
        return;
      }

      const { data: rows, error } = await supabase
        .from("medicoes_leite")
        .select(
          "id, user_id, animal_id, data_medicao, litros_manha, litros_tarde, litros_terceira, litros_total, tipo_lancamento"
        )
        .eq("user_id", userId)
        .eq("data_medicao", dataISO)
        .in("animal_id", ids);

      if (error) {
        console.error("Erro ao buscar medições do dia:", error);
        setMedicoes(baseVazio);
        return;
      }

      // se existir pelo menos 1 registro, usa o tipo do primeiro (modo edição)
      if (rows && rows.length > 0) {
        const tipoBanco = rows[0]?.tipo_lancamento;
        if (tipoBanco === "total" || tipoBanco === "2" || tipoBanco === "3") setTipoLancamento(tipoBanco);
      }

      const mapa = { ...baseVazio };

      rows?.forEach((r) => {
        const vaca = (vacas || []).find((v) => v.id === r.animal_id);
        if (!vaca) return;

        const numeroStr = String(vaca.numero ?? "");

        mapa[numeroStr] = {
          ...mapa[numeroStr],
          manha: r.litros_manha ?? "",
          tarde: r.litros_tarde ?? "",
          terceira: r.litros_terceira ?? "",
          total: r.litros_total ?? "",
        };
      });

      setMedicoes(mapa);

      if (rows && rows.length > 0) {
        updateLeiteCache({
          dateISO: dataISO,
          medicoesDia: rows,
          vacas,
          lotes: lotesLeite,
        });
      }
    },
    [aberto, userId, vacas, criarMapaVazio, lotesLeite]
  );

  // ✅ dispara o carregamento quando a data mudar
  useEffect(() => {
    if (!aberto) return;
    if (!dataMedicao) return;
    carregarMedicoesDaData(dataMedicao);
  }, [aberto, dataMedicao, carregarMedicoesDaData]);

  // ✅ quando trocar tipo, recalcula "total"
  useEffect(() => {
    if (!aberto) return;
    if (tipoLancamento === "total") return;

    setMedicoes((prev) => {
      const novo = { ...prev };
      Object.keys(novo).forEach((numeroStr) => {
        const d = novo[numeroStr] || {};
        const manha = d.manha ?? "";
        const tarde = d.tarde ?? "";
        const terceira = d.terceira ?? "";
        novo[numeroStr] = { ...d, total: calcularTotal({ manha, tarde, terceira }) };
      });
      return novo;
    });
  }, [tipoLancamento, aberto, calcularTotal]);

  const handleChange = (numero, campo, valor) => {
    const numeroStr = String(numero);

    setMedicoes((prev) => {
      const antigo = prev[numeroStr] || {};
      const atualizado = { ...antigo, [campo]: valor };

      // se mudou lote_id, atualiza cache local
      if (campo === "lote_id") {
        if (valor) {
          loteCacheRef.current[numeroStr] = valor;
        } else {
          delete loteCacheRef.current[numeroStr];
        }
      }

      if (tipoLancamento !== "total") {
        const manha = campo === "manha" ? valor : antigo.manha || "0";
        const tarde = campo === "tarde" ? valor : antigo.tarde || "0";
        const terceira = campo === "terceira" ? valor : antigo.terceira || "0";
        atualizado.total = calcularTotal({ manha, tarde, terceira });
      }

      return { ...prev, [numeroStr]: atualizado };
    });
  };

  const handleKeyDownCampo = (e, rowIndex, campo) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onFechar?.();
      return;
    }
    if (e.key !== "Enter" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

    let proxRow = rowIndex;
    if (e.key === "Enter" || e.key === "ArrowDown") proxRow = rowIndex + 1;
    if (e.key === "ArrowUp") proxRow = rowIndex - 1;
    if (proxRow < 0 || proxRow >= vacas.length) return;

    const el = inputRefs.current[`${proxRow}-${campo}`];
    if (el) {
      e.preventDefault();
      el.focus();
    }
  };

  // ✅ helper: monta payload SEM mandar null desnecessário
  const montarPayloadLinha = ({ userId, vaca, dados }) => {
    const base = {
      user_id: userId,
      animal_id: vaca.id,
      data_medicao: dataMedicao,
      tipo_lancamento: tipoLancamento,
      // compatibilidade: salva o NOME do lote no histórico da medição
      lote: dados.lote_id ? nomeDoLote(dados.lote_id) : null,
    };

    if (dados.total !== undefined && dados.total !== "") base.litros_total = toNum(dados.total);

    if (tipoLancamento !== "total") {
      if (dados.manha !== undefined && dados.manha !== "") base.litros_manha = toNum(dados.manha);
      if (dados.tarde !== undefined && dados.tarde !== "") base.litros_tarde = toNum(dados.tarde);

      if (tipoLancamento === "3") {
        if (dados.terceira !== undefined && dados.terceira !== "") base.litros_terceira = toNum(dados.terceira);
      }
    }

    return base;
  };

  const salvar = async () => {
    try {
      setSalvando(true);

      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      let resolvedUserId = null;

      if (offline) {
        const cache = readLeiteCache();
        resolvedUserId = resolveCachedUserId(cache);
        if (!resolvedUserId) {
          alert("Offline: não foi possível identificar o usuário nos dados salvos.");
          setSalvando(false);
          return;
        }
      } else {
        const { data: authData, error: userError } = await supabase.auth.getUser();
        const user = authData?.user;
        resolvedUserId = user?.id || null;

        if (userError || !resolvedUserId) {
          console.error("Erro ao obter usuário:", userError);
          alert("Não foi possível identificar o usuário logado.");
          setSalvando(false);
          return;
        }
      }

      const payload = [];
      const updatesAnimais = []; // { animal_id, lote_id }

      Object.entries(medicoes).forEach(([numeroStr, dados]) => {
        const temAlgumValor = dados.total || dados.manha || dados.tarde || dados.terceira;

        // se não tem nada preenchido e não definiu lote, ignora
        const vaca = vacas.find((v) => String(v.numero ?? "") === String(numeroStr));
        if (!vaca || !vaca.id) {
          console.warn("Vaca sem id ou não encontrada para numero", numeroStr);
          return;
        }

        const loteMudou = String(vaca.lote_id ?? "") !== String(dados.lote_id ?? "");
        if (!temAlgumValor && !loteMudou) return;

        // sempre que tiver valor (medição), salva registro
        if (temAlgumValor) {
          payload.push(montarPayloadLinha({ userId: resolvedUserId, vaca, dados }));
        }

        // se mudou o lote_id, atualiza animal.lote_id (para contar nos Lotes)
        if (loteMudou) {
          updatesAnimais.push({ animal_id: vaca.id, lote_id: dados.lote_id || null });
        }
      });

      if (offline) {
        const cache = readLeiteCache();
        const payloadExistente = normalizeCacheList(cache.byDate?.[dataMedicao]?.medicoesDia || []);
        let nextMedicoesDia = payloadExistente;

        let payloadComIds = payload;
        if (payload.length > 0) {
          payloadComIds = payload.map((item) => {
            const existente = payloadExistente.find(
              (c) =>
                String(c?.user_id || "") === String(item?.user_id || "") &&
                String(c?.animal_id || "") === String(item?.animal_id || "") &&
                String(c?.data_medicao || "") === String(item?.data_medicao || "")
            );
            return { ...item, id: existente?.id || gerarUUID() };
          });

          const cacheAtualizado = upsertMedicoesCache(payloadExistente, payloadComIds);
          nextMedicoesDia = cacheAtualizado;

          const ultimaMap = { ...(cache.byDate?.[dataMedicao]?.ultimaMedicaoPorAnimal || {}) };
          payloadComIds.forEach((item) => {
            ultimaMap[item.animal_id] = {
              animal_id: item.animal_id,
              data_medicao: item.data_medicao,
              litros_manha: item.litros_manha ?? null,
              litros_tarde: item.litros_tarde ?? null,
              litros_terceira: item.litros_terceira ?? null,
              litros_total: item.litros_total ?? null,
            };
          });

          updateLeiteCache({
            dateISO: dataMedicao,
            medicoesDia: nextMedicoesDia,
            ultimaMedicaoPorAnimal: ultimaMap,
            vacas,
            lotes: lotesLeite,
          });
        }

        if (updatesAnimais.length > 0) {
          const atualizadas = (cache.lastAnimals || []).map((animal) => {
            const update = updatesAnimais.find((u) => String(u.animal_id) === String(animal.id));
            if (!update) return animal;
            return { ...animal, lote_id: update.lote_id ?? null };
          });

          updateLeiteCache({
            dateISO: dataMedicao,
            medicoesDia: nextMedicoesDia,
            vacas: atualizadas,
            lotes: lotesLeite,
          });
        }

        const filaAtual = readLeitePending();
        const agora = new Date().toISOString();
        if (payloadComIds.length > 0) {
          filaAtual.push({
            type: "medicoes_leite.upsert",
            createdAt: agora,
            payload: payloadComIds,
          });
        }
        updatesAnimais.forEach((update) => {
          filaAtual.push({
            type: "animais.update",
            createdAt: agora,
            payload: { id: update.animal_id, lote_id: update.lote_id ?? null },
          });
        });
        writeLeitePending(filaAtual);

        alert("Salvo localmente. Será enviado ao reconectar.");
        onSalvar?.({ data: dataMedicao, tipoLancamento, medicoes });
        setSalvando(false);
        onFechar?.();
        return;
      }

      // 1) salva medições (se houver)
      let savedRows = [];
      if (payload.length > 0) {
        const { data: rows, error } = await supabase
          .from("medicoes_leite")
          .upsert(payload, { onConflict: "user_id,animal_id,data_medicao" })
          .select(
            "id, user_id, animal_id, data_medicao, tipo_lancamento, litros_manha, litros_tarde, litros_terceira, litros_total"
          );

        if (error) {
          console.error("Erro ao salvar medições:", error);
          alert("Erro ao salvar medições no banco. Veja o console para detalhes.");
          setSalvando(false);
          return;
        }

        savedRows = rows || [];
        updateLeiteCache({
          dateISO: dataMedicao,
          medicoesDia: savedRows,
          vacas,
          lotes: lotesLeite,
        });
      }

      // 2) atualiza lotes dos animais (para refletir contagem)
      if (updatesAnimais.length > 0) {
        const results = await Promise.all(
          updatesAnimais.map((u) => supabase.from("animais").update({ lote_id: u.lote_id }).eq("id", u.animal_id))
        );

        const algumErro = results.find((r) => r.error);
        if (algumErro?.error) {
          console.error("Erro ao atualizar lote_id em animais:", algumErro.error);
          alert("As medições salvaram, mas houve erro ao atualizar o lote das vacas (veja o console).");
        }
      }

      if (updatesAnimais.length > 0) {
        const atualizadas = (vacas || []).map((animal) => {
          const update = updatesAnimais.find((u) => String(u.animal_id) === String(animal.id));
          if (!update) return animal;
          return { ...animal, lote_id: update.lote_id ?? null };
        });
        updateLeiteCache({
          dateISO: dataMedicao,
          medicoesDia: savedRows.length > 0 ? savedRows : payload,
          vacas: atualizadas,
          lotes: lotesLeite,
        });
      }

      onSalvar?.({ data: dataMedicao, tipoLancamento, medicoes });

      // recarrega do banco para garantir consistência
      await carregarMedicoesDaData(dataMedicao);

      setSalvando(false);
      onFechar?.();
    } catch (err) {
      console.error("Erro inesperado ao salvar medições:", err);
      alert("Ocorreu um erro inesperado ao salvar as medições.");
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div style={overlay}>
      <div style={modalBig}>
        <div style={header}>
          <span>🥛 Registro da coleta de leite — {new Date(dataMedicao).toLocaleDateString("pt-BR")}</span>
          <button type="button" onClick={onFechar} style={botaoFecharHeader} disabled={salvando}>
            Fechar
          </button>
        </div>

        <div style={modalBody}>
          <div style={gridCompacto}>
            <div>
              <label style={labelEstilo}>Data da medição</label>

              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="botao-editar"
                  style={botaoSetaDiaRound}
                  onClick={() => setDataMedicao((d) => addDaysISO(d, -1))}
                  disabled={salvando}
                  title="Dia anterior"
                >
                  ◀
                </button>

                <input
                  type="date"
                  value={dataMedicao}
                  onChange={(e) => setDataMedicao(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && onFechar?.()}
                  style={inputBase}
                  disabled={salvando}
                />

                <button
                  type="button"
                  className="botao-editar"
                  style={botaoSetaDiaRound}
                  onClick={() => setDataMedicao((d) => addDaysISO(d, +1))}
                  disabled={salvando}
                  title="Próximo dia"
                >
                  ▶
                </button>
              </div>

              {dataEhPassada && (
                <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Data passada: o lote fica bloqueado para evitar mudança retroativa.
                  </span>
                  <button
                    type="button"
                    className="botao-editar"
                    style={{ ...botaoSetaDiaRound, width: "auto", padding: "0 14px", borderRadius: 999 }}
                    onClick={() => setModoEdicaoPassado((v) => !v)}
                    disabled={salvando}
                    title="Habilitar edição retroativa"
                  >
                    {modoEdicaoPassado ? "Bloquear edição" : "Editar esta data"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={labelEstilo}>Tipo de lançamento</label>
              <Select
                value={opcoesTipoLancamento.find((opt) => opt.value === tipoLancamento)}
                onChange={(opt) => setTipoLancamento(opt?.value ?? "2")}
                options={opcoesTipoLancamento}
                styles={selectTipoStyles}
                isDisabled={salvando}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
          </div>

          <div style={lotesInfoStyle}>
            {loadingLotes ? "Carregando lotes de Lactação…" : `Lotes disponíveis: ${(lotesLeite || []).length} (Alta/Média/Baixa Produção)`}
          </div>

          <TabelaMedicaoLeite
            vacas={vacas}
            tipoLancamento={tipoLancamento}
            medicoes={medicoes}
            onChange={handleChange}
            onKeyDownCampo={handleKeyDownCampo}
            lotesOptions={lotesOptions}
            inputRefs={inputRefs}
            bloquearLote={bloquearLote}
          />
        </div>

        <div style={modalFooter}>
          <button type="button" onClick={onFechar} style={botaoCancelar} disabled={salvando}>
            Cancelar
          </button>
          <button type="button" onClick={salvar} style={botaoConfirmar} disabled={salvando}>
            {salvando ? "Salvando..." : "📂 Salvar medições"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== estilos inline do modal ===== */

const overlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalBig = {
  background: "#fff",
  borderRadius: "1rem",
  width: "1100px",
  maxWidth: "95vw",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  fontFamily: "Poppins, sans-serif",
  boxShadow: "0 0 24px rgba(15,23,42,0.35)",
};

const header = {
  background: "#1e3a8a",
  color: "white",
  padding: "1rem 1.5rem",
  fontWeight: "bold",
  fontSize: "1.05rem",
  borderTopLeftRadius: "1rem",
  borderTopRightRadius: "1rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flex: "0 0 auto",
};

const modalBody = {
  padding: "1.25rem 1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
  overflowY: "auto",
  flex: "1 1 auto",
};

const modalFooter = {
  padding: "1rem 1.5rem",
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.9rem",
  borderTop: "1px solid #e2e8f0",
  background: "#fff",
  flex: "0 0 auto",
};

const gridCompacto = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "1.25rem",
  alignItems: "start",
};

const lotesInfoStyle = {
  fontSize: 12,
  color: "#64748b",
  marginTop: -6,
};

const filterHintStyle = {
  marginBottom: "0.5rem",
};

const tabelaScrollX = {
  width: "100%",
  overflowX: "auto",
  overflowY: "visible",
  WebkitOverflowScrolling: "touch",
};

const inputBase = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  fontSize: "0.95rem",
  borderRadius: "0.75rem",
  border: "1px solid #cbd5e1",
  backgroundColor: "#f9fafb",
  outline: "none",
  boxSizing: "border-box",
};

const labelEstilo = {
  marginBottom: "0.25rem",
  display: "inline-block",
  fontWeight: 600,
  fontSize: "0.9rem",
};

const botaoSetaDiaRound = {
  width: "42px",
  height: "42px",
  padding: 0,
  borderRadius: "9999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  fontWeight: 700,
};

const botaoFecharHeader = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  padding: "0.45rem 1.1rem",
  borderRadius: "999px",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: 600,
};

const botaoCancelar = {
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: "0.55rem 1.3rem",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9rem",
};

const botaoConfirmar = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "0.6rem 1.6rem",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "0.95rem",
};
