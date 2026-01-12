// src/pages/ConsumoReposicao/ConsumoReposicao.jsx
import React, { useMemo, useState, useEffect } from "react";
import "../../styles/tabelaModerna.css";

const allValue = "__ALL__";

const abasDisponiveis = [
  { id: "estoque", label: "Estoque" },
  { id: "lotes", label: "Lotes" },
  { id: "dietas", label: "Dietas" },
  { id: "limpeza", label: "Limpeza" },
  { id: "sanitario", label: "Calendário Sanitário" },
];

const estoqueBase = [
  {
    id: 1,
    produto: "Ração inicial",
    categoria: "Ração",
    quantidade: 1200,
    unidade: "kg",
    validade: "2025-03-10",
    minimo: 500,
    valorUnitario: 2.4,
  },
  {
    id: 2,
    produto: "Silagem de milho",
    categoria: "Volumoso",
    quantidade: 4200,
    unidade: "kg",
    validade: "2025-05-20",
    minimo: 3000,
    valorUnitario: 0.65,
  },
  {
    id: 3,
    produto: "Suplemento mineral",
    categoria: "Mineral",
    quantidade: 380,
    unidade: "kg",
    validade: "2024-12-15",
    minimo: 400,
    valorUnitario: 6.2,
  },
  {
    id: 4,
    produto: "Vacina clostridial",
    categoria: "Sanidade",
    quantidade: 85,
    unidade: "doses",
    validade: "2024-09-30",
    minimo: 60,
    valorUnitario: 18.5,
  },
];

const lotesBase = [
  {
    id: 1,
    nome: "Lote A",
    vacas: 48,
    funcao: "Lactação",
    nivel: "Alta",
    status: "Ativo",
  },
  {
    id: 2,
    nome: "Lote B",
    vacas: 36,
    funcao: "Pré-parto",
    nivel: "Média",
    status: "Ativo",
  },
  {
    id: 3,
    nome: "Lote C",
    vacas: 22,
    funcao: "Secas",
    nivel: "Baixa",
    status: "Inativo",
  },
];

const dietasBase = [
  {
    id: 1,
    nome: "Dieta Produção",
    lote: "Lactação",
    custoTotal: 1850,
    custoPorVaca: 38.5,
    status: "Ativa",
  },
  {
    id: 2,
    nome: "Dieta Pré-parto",
    lote: "Pré-parto",
    custoTotal: 980,
    custoPorVaca: 27.8,
    status: "Ativa",
  },
  {
    id: 3,
    nome: "Dieta Secas",
    lote: "Secas",
    custoTotal: 620,
    custoPorVaca: 24.6,
    status: "Revisão",
  },
];

const limpezaBase = [
  {
    id: 1,
    item: "Lavagem da ordenhadeira",
    frequencia: "Diária",
    proxima: "2024-10-12",
    responsavel: "Equipe Ordenha",
    status: "Programado",
  },
  {
    id: 2,
    item: "Sanitização do tanque",
    frequencia: "Semanal",
    proxima: "2024-10-15",
    responsavel: "João",
    status: "Em dia",
  },
  {
    id: 3,
    item: "Limpeza do bebedouro",
    frequencia: "Semanal",
    proxima: "2024-10-09",
    responsavel: "Maria",
    status: "Atrasado",
  },
];

const sanitarioBase = [
  {
    id: 1,
    procedimento: "Vacina IBR/BVD",
    data: "2024-10-14",
    status: "Agendado",
    lote: "Lactação",
    responsavel: "Dra. Ana",
  },
  {
    id: 2,
    procedimento: "Vermifugação",
    data: "2024-10-08",
    status: "Atrasado",
    lote: "Bezerras",
    responsavel: "Carlos",
  },
  {
    id: 3,
    procedimento: "Exame de brucelose",
    data: "2024-10-20",
    status: "Agendado",
    lote: "Reprodução",
    responsavel: "Dra. Ana",
  },
];

function parseDateFlexible(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value);
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const dt = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const dt = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function formatDate(value) {
  const dt = parseDateFlexible(value);
  if (!dt) return "—";
  return dt.toLocaleDateString("pt-BR");
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function sortRows(rows, sortConfig, accessors) {
  if (!sortConfig?.key || !sortConfig.direction) return rows;
  const getter = accessors[sortConfig.key];
  if (!getter) return rows;
  const dir = sortConfig.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = getter(a);
    const vb = getter(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1 * dir;
    if (vb == null) return -1 * dir;
    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * dir;
    }
    return String(va).localeCompare(String(vb), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    }) * dir;
  });
}

function toggleSortFor(setter, tabId, key) {
  setter((prev) => {
    const current = prev[tabId] || { key: null, direction: null };
    if (current.key !== key) {
      return { ...prev, [tabId]: { key, direction: "asc" } };
    }
    if (current.direction === "asc") {
      return { ...prev, [tabId]: { key, direction: "desc" } };
    }
    return { ...prev, [tabId]: { key: null, direction: null } };
  });
}

const estiloTabs = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
};

export default function ConsumoReposicao() {
  const [abaAtiva, setAbaAtiva] = useState("estoque");
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);
  const [openPopoverKey, setOpenPopoverKey] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    estoque: { key: "produto", direction: "asc" },
    lotes: { key: "nome", direction: "asc" },
    dietas: { key: "nome", direction: "asc" },
    limpeza: { key: "item", direction: "asc" },
    sanitario: { key: "procedimento", direction: "asc" },
  });

  const [filtrosEstoque, setFiltrosEstoque] = useState({
    categoria: allValue,
    unidade: allValue,
  });
  const [filtrosLotes, setFiltrosLotes] = useState({
    funcao: allValue,
    nivel: allValue,
    status: allValue,
  });
  const [filtrosDietas, setFiltrosDietas] = useState({
    lote: allValue,
  });
  const [filtrosLimpeza, setFiltrosLimpeza] = useState({
    frequencia: allValue,
    status: allValue,
  });
  const [filtrosSanitario, setFiltrosSanitario] = useState({
    status: allValue,
  });

  useEffect(() => {
    function handleClick(event) {
      const target = event.target;
      const trigger = target.closest("[data-filter-trigger='true']");
      const popover = target.closest("[data-filter-popover='true']");
      if (!trigger && !popover) {
        setOpenPopoverKey(null);
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const estoqueCategorias = useMemo(() => {
    return Array.from(new Set(estoqueBase.map((item) => item.categoria)));
  }, []);

  const estoqueUnidades = useMemo(() => {
    return Array.from(new Set(estoqueBase.map((item) => item.unidade)));
  }, []);

  const lotesFuncoes = useMemo(() => {
    return Array.from(new Set(lotesBase.map((item) => item.funcao)));
  }, []);

  const lotesNiveis = useMemo(() => {
    return Array.from(new Set(lotesBase.map((item) => item.nivel)));
  }, []);

  const lotesStatus = useMemo(() => {
    return Array.from(new Set(lotesBase.map((item) => item.status)));
  }, []);

  const dietasLotes = useMemo(() => {
    return Array.from(new Set(dietasBase.map((item) => item.lote)));
  }, []);

  const limpezaFrequencias = useMemo(() => {
    return Array.from(new Set(limpezaBase.map((item) => item.frequencia)));
  }, []);

  const limpezaStatus = useMemo(() => {
    return Array.from(new Set(limpezaBase.map((item) => item.status)));
  }, []);

  const sanitarioStatus = useMemo(() => {
    return Array.from(new Set(sanitarioBase.map((item) => item.status)));
  }, []);

  const estoqueRows = useMemo(() => {
    let rows = estoqueBase;
    if (filtrosEstoque.categoria !== allValue) {
      rows = rows.filter((item) => item.categoria === filtrosEstoque.categoria);
    }
    if (filtrosEstoque.unidade !== allValue) {
      rows = rows.filter((item) => item.unidade === filtrosEstoque.unidade);
    }
    return sortRows(rows, sortConfig.estoque, {
      produto: (item) => item.produto,
      quantidade: (item) => item.quantidade,
      validade: (item) => parseDateFlexible(item.validade)?.getTime() ?? null,
    });
  }, [filtrosEstoque, sortConfig.estoque]);

  const lotesRows = useMemo(() => {
    let rows = lotesBase;
    if (filtrosLotes.funcao !== allValue) {
      rows = rows.filter((item) => item.funcao === filtrosLotes.funcao);
    }
    if (filtrosLotes.nivel !== allValue) {
      rows = rows.filter((item) => item.nivel === filtrosLotes.nivel);
    }
    if (filtrosLotes.status !== allValue) {
      rows = rows.filter((item) => item.status === filtrosLotes.status);
    }
    return sortRows(rows, sortConfig.lotes, {
      nome: (item) => item.nome,
      vacas: (item) => item.vacas,
    });
  }, [filtrosLotes, sortConfig.lotes]);

  const dietasRows = useMemo(() => {
    let rows = dietasBase;
    if (filtrosDietas.lote !== allValue) {
      rows = rows.filter((item) => item.lote === filtrosDietas.lote);
    }
    return sortRows(rows, sortConfig.dietas, {
      nome: (item) => item.nome,
      custoTotal: (item) => item.custoTotal,
      custoPorVaca: (item) => item.custoPorVaca,
    });
  }, [filtrosDietas, sortConfig.dietas]);

  const limpezaRows = useMemo(() => {
    let rows = limpezaBase;
    if (filtrosLimpeza.frequencia !== allValue) {
      rows = rows.filter((item) => item.frequencia === filtrosLimpeza.frequencia);
    }
    if (filtrosLimpeza.status !== allValue) {
      rows = rows.filter((item) => item.status === filtrosLimpeza.status);
    }
    return sortRows(rows, sortConfig.limpeza, {
      item: (item) => item.item,
      proxima: (item) => parseDateFlexible(item.proxima)?.getTime() ?? null,
    });
  }, [filtrosLimpeza, sortConfig.limpeza]);

  const sanitarioRows = useMemo(() => {
    let rows = sanitarioBase;
    if (filtrosSanitario.status !== allValue) {
      rows = rows.filter((item) => item.status === filtrosSanitario.status);
    }
    return sortRows(rows, sortConfig.sanitario, {
      procedimento: (item) => item.procedimento,
      data: (item) => parseDateFlexible(item.data)?.getTime() ?? null,
    });
  }, [filtrosSanitario, sortConfig.sanitario]);

  const resumoEstoque = useMemo(() => {
    const totalItens = estoqueRows.length;
    const totalValor = estoqueRows.reduce(
      (acc, item) => acc + item.quantidade * item.valorUnitario,
      0
    );
    const abaixoMinimo = estoqueRows.filter((item) => item.quantidade < item.minimo)
      .length;
    return { totalItens, totalValor, abaixoMinimo };
  }, [estoqueRows]);

  const resumoLotes = useMemo(() => {
    const totalLotes = lotesRows.length;
    const totalVacas = lotesRows.reduce((acc, item) => acc + item.vacas, 0);
    const ativos = lotesRows.filter((item) => item.status === "Ativo").length;
    const inativos = lotesRows.filter((item) => item.status !== "Ativo").length;
    return { totalLotes, totalVacas, ativos, inativos };
  }, [lotesRows]);

  const resumoDietas = useMemo(() => {
    const totalDietas = dietasRows.length;
    const mediaCusto =
      totalDietas > 0
        ? dietasRows.reduce((acc, item) => acc + item.custoPorVaca, 0) / totalDietas
        : null;
    return { totalDietas, mediaCusto };
  }, [dietasRows]);

  const resumoLimpeza = useMemo(() => {
    const totalItens = limpezaRows.length;
    const atrasados = limpezaRows.filter((item) => item.status === "Atrasado").length;
    return { totalItens, atrasados };
  }, [limpezaRows]);

  const resumoSanitario = useMemo(() => {
    const totalEventos = sanitarioRows.length;
    const hoje = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + 7);
    const vencidos = sanitarioRows.filter((item) => {
      const dt = parseDateFlexible(item.data);
      return dt && dt < hoje;
    }).length;
    const proximos = sanitarioRows.filter((item) => {
      const dt = parseDateFlexible(item.data);
      return dt && dt >= hoje && dt <= limite;
    }).length;
    return { totalEventos, vencidos, proximos };
  }, [sanitarioRows]);

  const pillStatus = (status) => {
    const lower = String(status).toLowerCase();
    if (lower.includes("ativo") || lower.includes("agend") || lower.includes("em dia")) {
      return "st-pill st-pill--ok";
    }
    if (lower.includes("atras") || lower.includes("inativo")) {
      return "st-pill st-pill--warn";
    }
    if (lower.includes("revis")) {
      return "st-pill st-pill--info";
    }
    return "st-pill st-pill--mute";
  };

  const handleCellEnter = (rowId, colKey) => {
    setHoveredRowId(rowId);
    setHoveredColKey(colKey);
  };

  const togglePopover = (key) => {
    setOpenPopoverKey((prev) => (prev === key ? null : key));
  };

  return (
    <section className="w-full">
      <div style={estiloTabs}>
        {abasDisponiveis.map((aba) => {
          const ativa = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAbaAtiva(aba.id)}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: ativa ? "#ffffff" : "#f1f5f9",
                fontWeight: 800,
                color: ativa ? "#1e40af" : "#64748b",
                boxShadow: ativa ? "inset 0 2px 0 #2563eb" : "none",
                cursor: "pointer",
              }}
            >
              {aba.label}
            </button>
          );
        })}
      </div>

      {abaAtiva === "estoque" && (
        <div>
          <div className="st-filter-hint">
            Dica: clique no título das colunas habilitadas para ordenar/filtrar. Clique
            novamente para fechar.
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
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ position: "relative" }}>
                      <button
                        type="button"
                        onClick={() => toggleSortFor(setSortConfig, "estoque", "produto")}
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
                        <span className="st-th-label">Produto</span>
                        {sortConfig.estoque?.key === "produto" &&
                          sortConfig.estoque?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.estoque.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th style={{ position: "relative" }}>
                      <button
                        type="button"
                        data-filter-trigger="true"
                        onClick={() => togglePopover("estoque-categoria")}
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
                        <span className="st-th-label">Categoria</span>
                      </button>
                      {openPopoverKey === "estoque-categoria" && (
                        <div
                          className="st-filter-popover"
                          data-filter-popover="true"
                        >
                          <label className="st-filter__label">
                            Categoria
                            <select
                              className="st-filter-input"
                              value={filtrosEstoque.categoria}
                              onChange={(event) =>
                                setFiltrosEstoque((prev) => ({
                                  ...prev,
                                  categoria: event.target.value,
                                }))
                              }
                            >
                              <option value={allValue}>Todas</option>
                              {estoqueCategorias.map((categoria) => (
                                <option key={categoria} value={categoria}>
                                  {categoria}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </th>
                    <th className="st-td-right">
                      <button
                        type="button"
                        onClick={() => toggleSortFor(setSortConfig, "estoque", "quantidade")}
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
                        <span className="st-th-label">Quantidade</span>
                        {sortConfig.estoque?.key === "quantidade" &&
                          sortConfig.estoque?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.estoque.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th style={{ position: "relative" }}>
                      <button
                        type="button"
                        data-filter-trigger="true"
                        onClick={() => togglePopover("estoque-unidade")}
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
                        <span className="st-th-label">Unidade</span>
                      </button>
                      {openPopoverKey === "estoque-unidade" && (
                        <div
                          className="st-filter-popover"
                          data-filter-popover="true"
                        >
                          <label className="st-filter__label">
                            Unidade
                            <select
                              className="st-filter-input"
                              value={filtrosEstoque.unidade}
                              onChange={(event) =>
                                setFiltrosEstoque((prev) => ({
                                  ...prev,
                                  unidade: event.target.value,
                                }))
                              }
                            >
                              <option value={allValue}>Todas</option>
                              {estoqueUnidades.map((unidade) => (
                                <option key={unidade} value={unidade}>
                                  {unidade}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </th>
                    <th>
                      <button
                        type="button"
                        onClick={() => toggleSortFor(setSortConfig, "estoque", "validade")}
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
                        <span className="st-th-label">Validade</span>
                        {sortConfig.estoque?.key === "validade" &&
                          sortConfig.estoque?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.estoque.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th className="st-td-right">
                      <span className="st-th-label">Valor total</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {estoqueRows.map((item) => {
                    const rowHover = hoveredRowId === item.id;
                    const total = item.quantidade * item.valorUnitario;
                    const abaixoMinimo = item.quantidade < item.minimo;
                    return (
                      <tr key={item.id} className={rowHover ? "st-row-hover" : ""}>
                        <td
                          className={`${
                            hoveredColKey === "produto" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "produto" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "produto")}
                        >
                          <div className="st-entity">
                            <div className="st-entity__top">
                              <span className="st-entity__id">
                                {String(item.id).padStart(2, "0")}
                              </span>
                              <div className="st-entity__meta st-truncate">{item.produto}</div>
                            </div>
                            <div className="st-entity__sub">
                              <span className="st-subitem">Mínimo {item.minimo}</span>
                              <span className="st-dot">•</span>
                              <span className="st-subitem">
                                {abaixoMinimo ? "Abaixo do mínimo" : "Ok"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "categoria")}
                          className={`${
                            hoveredColKey === "categoria" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "categoria" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className="st-pill st-pill--info">{item.categoria}</span>
                        </td>
                        <td
                          className={`st-td-right st-num ${
                            hoveredColKey === "quantidade" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "quantidade" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "quantidade")}
                        >
                          {item.quantidade}
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "unidade")}
                          className={`${
                            hoveredColKey === "unidade" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "unidade" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className="st-pill st-pill--mute">{item.unidade}</span>
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "validade")}
                          className={`${
                            hoveredColKey === "validade" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "validade" ? "st-cell-hover" : ""
                          }`}
                        >
                          {formatDate(item.validade)}
                        </td>
                        <td
                          className={`st-td-right st-num ${
                            hoveredColKey === "valor" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "valor" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "valor")}
                        >
                          {formatCurrency(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="st-summary-row">
                    <td colSpan={6}>
                      <div className="st-summary-row__content">
                        <span>Total de itens exibidos: {resumoEstoque.totalItens}</span>
                        <span>Valor total: {formatCurrency(resumoEstoque.totalValor)}</span>
                        <span>Abaixo do mínimo: {resumoEstoque.abaixoMinimo}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === "lotes" && (
        <div>
          <div className="st-filter-hint">
            Dica: clique no título das colunas habilitadas para ordenar/filtrar. Clique
            novamente para fechar.
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
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        onClick={() => toggleSortFor(setSortConfig, "lotes", "nome")}
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
                        {sortConfig.lotes?.key === "nome" &&
                          sortConfig.lotes?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.lotes.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th className="st-td-right">
                      <button
                        type="button"
                        onClick={() => toggleSortFor(setSortConfig, "lotes", "vacas")}
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
                        <span className="st-th-label">Nº de vacas</span>
                        {sortConfig.lotes?.key === "vacas" &&
                          sortConfig.lotes?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.lotes.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th style={{ position: "relative" }}>
                      <button
                        type="button"
                        data-filter-trigger="true"
                        onClick={() => togglePopover("lotes-funcao")}
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
                      {openPopoverKey === "lotes-funcao" && (
                        <div className="st-filter-popover" data-filter-popover="true">
                          <label className="st-filter__label">
                            Função
                            <select
                              className="st-filter-input"
                              value={filtrosLotes.funcao}
                              onChange={(event) =>
                                setFiltrosLotes((prev) => ({
                                  ...prev,
                                  funcao: event.target.value,
                                }))
                              }
                            >
                              <option value={allValue}>Todas</option>
                              {lotesFuncoes.map((funcao) => (
                                <option key={funcao} value={funcao}>
                                  {funcao}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </th>
                    <th style={{ position: "relative" }}>
                      <button
                        type="button"
                        data-filter-trigger="true"
                        onClick={() => togglePopover("lotes-nivel")}
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
                        <span className="st-th-label">Nível produtivo</span>
                      </button>
                      {openPopoverKey === "lotes-nivel" && (
                        <div className="st-filter-popover" data-filter-popover="true">
                          <label className="st-filter__label">
                            Nível
                            <select
                              className="st-filter-input"
                              value={filtrosLotes.nivel}
                              onChange={(event) =>
                                setFiltrosLotes((prev) => ({
                                  ...prev,
                                  nivel: event.target.value,
                                }))
                              }
                            >
                              <option value={allValue}>Todos</option>
                              {lotesNiveis.map((nivel) => (
                                <option key={nivel} value={nivel}>
                                  {nivel}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </th>
                    <th style={{ position: "relative" }}>
                      <button
                        type="button"
                        data-filter-trigger="true"
                        onClick={() => togglePopover("lotes-status")}
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
                      {openPopoverKey === "lotes-status" && (
                        <div className="st-filter-popover" data-filter-popover="true">
                          <label className="st-filter__label">
                            Status
                            <select
                              className="st-filter-input"
                              value={filtrosLotes.status}
                              onChange={(event) =>
                                setFiltrosLotes((prev) => ({
                                  ...prev,
                                  status: event.target.value,
                                }))
                              }
                            >
                              <option value={allValue}>Todos</option>
                              {lotesStatus.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </th>
                    <th className="st-td-center">
                      <span className="st-th-label">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lotesRows.map((item) => {
                    const rowHover = hoveredRowId === item.id;
                    return (
                      <tr key={item.id} className={rowHover ? "st-row-hover" : ""}>
                        <td
                          className={`${
                            hoveredColKey === "nome" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "nome" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "nome")}
                        >
                          <div className="st-entity">
                            <div className="st-entity__top">
                              <span className="st-entity__id">{item.nome.slice(-1)}</span>
                              <div className="st-entity__meta st-truncate">{item.nome}</div>
                            </div>
                            <div className="st-entity__sub">
                              <span className="st-subitem">{item.funcao}</span>
                              <span className="st-dot">•</span>
                              <span className="st-subitem">{item.nivel} produção</span>
                            </div>
                          </div>
                        </td>
                        <td
                          className={`st-td-right st-num ${
                            hoveredColKey === "vacas" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "vacas" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "vacas")}
                        >
                          {item.vacas}
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "funcao")}
                          className={`${
                            hoveredColKey === "funcao" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "funcao" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className="st-pill st-pill--info">{item.funcao}</span>
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "nivel")}
                          className={`${
                            hoveredColKey === "nivel" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "nivel" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className="st-pill st-pill--mute">{item.nivel}</span>
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "status")}
                          className={`${
                            hoveredColKey === "status" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "status" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className={pillStatus(item.status)}>{item.status}</span>
                        </td>
                        <td
                          className={`st-td-center ${
                            hoveredColKey === "acoes" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "acoes")}
                        >
                          <button type="button" className="st-btn">
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="st-summary-row">
                    <td colSpan={6}>
                      <div className="st-summary-row__content">
                        <span>Total de lotes exibidos: {resumoLotes.totalLotes}</span>
                        <span>Total de vacas: {resumoLotes.totalVacas}</span>
                        <span>
                          Ativos: {resumoLotes.ativos} • Inativos: {resumoLotes.inativos}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === "dietas" && (
        <div>
          <div className="st-filter-hint">
            Dica: clique no título das colunas habilitadas para ordenar/filtrar. Clique
            novamente para fechar.
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
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        onClick={() => toggleSortFor(setSortConfig, "dietas", "nome")}
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
                        <span className="st-th-label">Nome da dieta</span>
                        {sortConfig.dietas?.key === "nome" &&
                          sortConfig.dietas?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.dietas.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th style={{ position: "relative" }}>
                      <button
                        type="button"
                        data-filter-trigger="true"
                        onClick={() => togglePopover("dietas-lote")}
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
                        <span className="st-th-label">Lote/Grupo</span>
                      </button>
                      {openPopoverKey === "dietas-lote" && (
                        <div className="st-filter-popover" data-filter-popover="true">
                          <label className="st-filter__label">
                            Lote/Grupo
                            <select
                              className="st-filter-input"
                              value={filtrosDietas.lote}
                              onChange={(event) =>
                                setFiltrosDietas((prev) => ({
                                  ...prev,
                                  lote: event.target.value,
                                }))
                              }
                            >
                              <option value={allValue}>Todos</option>
                              {dietasLotes.map((lote) => (
                                <option key={lote} value={lote}>
                                  {lote}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </th>
                    <th className="st-td-right">
                      <button
                        type="button"
                        onClick={() => toggleSortFor(setSortConfig, "dietas", "custoTotal")}
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
                        <span className="st-th-label">Custo total</span>
                        {sortConfig.dietas?.key === "custoTotal" &&
                          sortConfig.dietas?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.dietas.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th className="st-td-right">
                      <button
                        type="button"
                        onClick={() =>
                          toggleSortFor(setSortConfig, "dietas", "custoPorVaca")
                        }
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
                        <span className="st-th-label">Custo por vaca</span>
                        {sortConfig.dietas?.key === "custoPorVaca" &&
                          sortConfig.dietas?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.dietas.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th>
                      <span className="st-th-label">Status</span>
                    </th>
                    <th className="st-td-center">
                      <span className="st-th-label">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dietasRows.map((item) => {
                    const rowHover = hoveredRowId === item.id;
                    return (
                      <tr key={item.id} className={rowHover ? "st-row-hover" : ""}>
                        <td
                          className={`${
                            hoveredColKey === "nome" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "nome" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "nome")}
                        >
                          <div className="st-entity">
                            <div className="st-entity__top">
                              <span className="st-entity__id">{item.id}</span>
                              <div className="st-entity__meta st-truncate">{item.nome}</div>
                            </div>
                            <div className="st-entity__sub">
                              <span className="st-subitem">Grupo {item.lote}</span>
                              <span className="st-dot">•</span>
                              <span className="st-subitem">{item.status}</span>
                            </div>
                          </div>
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "lote")}
                          className={`${
                            hoveredColKey === "lote" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "lote" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className="st-pill st-pill--info">{item.lote}</span>
                        </td>
                        <td
                          className={`st-td-right st-num ${
                            hoveredColKey === "custoTotal" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "custoTotal" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "custoTotal")}
                        >
                          {formatCurrency(item.custoTotal)}
                        </td>
                        <td
                          className={`st-td-right st-num ${
                            hoveredColKey === "custoPorVaca" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "custoPorVaca" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "custoPorVaca")}
                        >
                          {formatCurrency(item.custoPorVaca)}
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "status")}
                          className={`${
                            hoveredColKey === "status" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "status" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className={pillStatus(item.status)}>{item.status}</span>
                        </td>
                        <td
                          className={`st-td-center ${
                            hoveredColKey === "acoes" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "acoes")}
                        >
                          <button type="button" className="st-btn">
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="st-summary-row">
                    <td colSpan={6}>
                      <div className="st-summary-row__content">
                        <span>Total de dietas: {resumoDietas.totalDietas}</span>
                        <span>
                          Custo médio por vaca: {formatCurrency(resumoDietas.mediaCusto)}
                        </span>
                        <span>Dietas em revisão: 1</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === "limpeza" && (
        <div>
          <div className="st-filter-hint">
            Dica: clique no título das colunas habilitadas para ordenar/filtrar. Clique
            novamente para fechar.
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
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        onClick={() => toggleSortFor(setSortConfig, "limpeza", "item")}
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
                        <span className="st-th-label">Item/Produto</span>
                        {sortConfig.limpeza?.key === "item" &&
                          sortConfig.limpeza?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.limpeza.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th style={{ position: "relative" }}>
                      <button
                        type="button"
                        data-filter-trigger="true"
                        onClick={() => togglePopover("limpeza-frequencia")}
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
                        <span className="st-th-label">Frequência</span>
                      </button>
                      {openPopoverKey === "limpeza-frequencia" && (
                        <div className="st-filter-popover" data-filter-popover="true">
                          <label className="st-filter__label">
                            Frequência
                            <select
                              className="st-filter-input"
                              value={filtrosLimpeza.frequencia}
                              onChange={(event) =>
                                setFiltrosLimpeza((prev) => ({
                                  ...prev,
                                  frequencia: event.target.value,
                                }))
                              }
                            >
                              <option value={allValue}>Todas</option>
                              {limpezaFrequencias.map((frequencia) => (
                                <option key={frequencia} value={frequencia}>
                                  {frequencia}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </th>
                    <th>
                      <button
                        type="button"
                        onClick={() => toggleSortFor(setSortConfig, "limpeza", "proxima")}
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
                        <span className="st-th-label">Próxima data</span>
                        {sortConfig.limpeza?.key === "proxima" &&
                          sortConfig.limpeza?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.limpeza.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th>
                      <span className="st-th-label">Responsável</span>
                    </th>
                    <th style={{ position: "relative" }}>
                      <button
                        type="button"
                        data-filter-trigger="true"
                        onClick={() => togglePopover("limpeza-status")}
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
                      {openPopoverKey === "limpeza-status" && (
                        <div className="st-filter-popover" data-filter-popover="true">
                          <label className="st-filter__label">
                            Status
                            <select
                              className="st-filter-input"
                              value={filtrosLimpeza.status}
                              onChange={(event) =>
                                setFiltrosLimpeza((prev) => ({
                                  ...prev,
                                  status: event.target.value,
                                }))
                              }
                            >
                              <option value={allValue}>Todos</option>
                              {limpezaStatus.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </th>
                    <th className="st-td-center">
                      <span className="st-th-label">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {limpezaRows.map((item) => {
                    const rowHover = hoveredRowId === item.id;
                    return (
                      <tr key={item.id} className={rowHover ? "st-row-hover" : ""}>
                        <td
                          className={`${
                            hoveredColKey === "item" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "item" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "item")}
                        >
                          <div className="st-entity">
                            <div className="st-entity__top">
                              <span className="st-entity__id">{item.id}</span>
                              <div className="st-entity__meta st-truncate">{item.item}</div>
                            </div>
                            <div className="st-entity__sub">
                              <span className="st-subitem">{item.frequencia}</span>
                              <span className="st-dot">•</span>
                              <span className="st-subitem">{item.responsavel}</span>
                            </div>
                          </div>
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "frequencia")}
                          className={`${
                            hoveredColKey === "frequencia" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "frequencia" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className="st-pill st-pill--info">{item.frequencia}</span>
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "proxima")}
                          className={`${
                            hoveredColKey === "proxima" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "proxima" ? "st-cell-hover" : ""
                          }`}
                        >
                          {formatDate(item.proxima)}
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "responsavel")}
                          className={`${
                            hoveredColKey === "responsavel" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "responsavel" ? "st-cell-hover" : ""
                          }`}
                        >
                          {item.responsavel}
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "status")}
                          className={`${
                            hoveredColKey === "status" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "status" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className={pillStatus(item.status)}>{item.status}</span>
                        </td>
                        <td
                          className={`st-td-center ${
                            hoveredColKey === "acoes" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "acoes")}
                        >
                          <button type="button" className="st-btn">
                            Registrar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="st-summary-row">
                    <td colSpan={6}>
                      <div className="st-summary-row__content">
                        <span>Total de itens: {resumoLimpeza.totalItens}</span>
                        <span>Atrasados: {resumoLimpeza.atrasados}</span>
                        <span>Próximos 7 dias: 1</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === "sanitario" && (
        <div>
          <div className="st-filter-hint">
            Dica: clique no título das colunas habilitadas para ordenar/filtrar. Clique
            novamente para fechar.
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
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        onClick={() =>
                          toggleSortFor(setSortConfig, "sanitario", "procedimento")
                        }
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
                        <span className="st-th-label">Manejo/Procedimento</span>
                        {sortConfig.sanitario?.key === "procedimento" &&
                          sortConfig.sanitario?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.sanitario.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        onClick={() => toggleSortFor(setSortConfig, "sanitario", "data")}
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
                        <span className="st-th-label">Data prevista</span>
                        {sortConfig.sanitario?.key === "data" &&
                          sortConfig.sanitario?.direction && (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                              {sortConfig.sanitario.direction === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                      </button>
                    </th>
                    <th style={{ position: "relative" }}>
                      <button
                        type="button"
                        data-filter-trigger="true"
                        onClick={() => togglePopover("sanitario-status")}
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
                      {openPopoverKey === "sanitario-status" && (
                        <div className="st-filter-popover" data-filter-popover="true">
                          <label className="st-filter__label">
                            Status
                            <select
                              className="st-filter-input"
                              value={filtrosSanitario.status}
                              onChange={(event) =>
                                setFiltrosSanitario((prev) => ({
                                  ...prev,
                                  status: event.target.value,
                                }))
                              }
                            >
                              <option value={allValue}>Todos</option>
                              {sanitarioStatus.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </th>
                    <th>
                      <span className="st-th-label">Lote/Grupo</span>
                    </th>
                    <th>
                      <span className="st-th-label">Responsável</span>
                    </th>
                    <th className="st-td-center">
                      <span className="st-th-label">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sanitarioRows.map((item) => {
                    const rowHover = hoveredRowId === item.id;
                    return (
                      <tr key={item.id} className={rowHover ? "st-row-hover" : ""}>
                        <td
                          className={`${
                            hoveredColKey === "procedimento" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "procedimento"
                              ? "st-cell-hover"
                              : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "procedimento")}
                        >
                          <div className="st-entity">
                            <div className="st-entity__top">
                              <span className="st-entity__id">{item.id}</span>
                              <div className="st-entity__meta st-truncate">
                                {item.procedimento}
                              </div>
                            </div>
                            <div className="st-entity__sub">
                              <span className="st-subitem">{item.lote}</span>
                              <span className="st-dot">•</span>
                              <span className="st-subitem">{item.responsavel}</span>
                            </div>
                          </div>
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "data")}
                          className={`${
                            hoveredColKey === "data" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "data" ? "st-cell-hover" : ""
                          }`}
                        >
                          {formatDate(item.data)}
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "status")}
                          className={`${
                            hoveredColKey === "status" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "status" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className={pillStatus(item.status)}>{item.status}</span>
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "lote")}
                          className={`${
                            hoveredColKey === "lote" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "lote" ? "st-cell-hover" : ""
                          }`}
                        >
                          <span className="st-pill st-pill--info">{item.lote}</span>
                        </td>
                        <td
                          onMouseEnter={() => handleCellEnter(item.id, "responsavel")}
                          className={`${
                            hoveredColKey === "responsavel" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "responsavel" ? "st-cell-hover" : ""
                          }`}
                        >
                          {item.responsavel}
                        </td>
                        <td
                          className={`st-td-center ${
                            hoveredColKey === "acoes" ? "st-col-hover" : ""
                          } ${rowHover ? "st-row-hover" : ""} ${
                            rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""
                          }`}
                          onMouseEnter={() => handleCellEnter(item.id, "acoes")}
                        >
                          <button type="button" className="st-btn">
                            Confirmar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="st-summary-row">
                    <td colSpan={6}>
                      <div className="st-summary-row__content">
                        <span>Total de eventos: {resumoSanitario.totalEventos}</span>
                        <span>Vencidos: {resumoSanitario.vencidos}</span>
                        <span>Próximos 7 dias: {resumoSanitario.proximos}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
