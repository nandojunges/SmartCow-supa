import React, { useMemo, useState, useContext, useCallback } from "react";
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  CheckSquare,
  Square,
  ArrowUpDown,
  Download,
} from "lucide-react";

import { mockBezerras } from "../data/mockData"; // ajuste se necessário
import { BezerrasContext } from "../Bezerras"; // ✅ no nosso pai é BezerrasContext

// -------------------------------------------------------
// BezerraList (sem Router / sem Tailwind)
// -------------------------------------------------------
export default function BezerraList({
  onAbrirBezerra,      // (id) => void  -> abre detalhe
  onIrComparativo,     // () => void    -> troca pra aba comparativo
  onNovoCadastro,      // () => void    -> abrir modal/ação futura
}) {
  const ctx = useContext(BezerrasContext);

  const selectedBezerras = ctx?.selectedBezerras || [];
  const toggleBezerraSelection = ctx?.toggleBezerraSelection || (() => {});
  const limparSelecao = ctx?.limparSelecao || (() => {});

  const [filters, setFilters] = useState({
    search: "",
    status: "todos",
    categoria: "todos",
    lote: "todos", // ainda não usado (fica pronto)
  });

  const [sortConfig, setSortConfig] = useState({
    key: "dataNascimento",
    direction: "desc",
  });

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key ? (prev.direction === "asc" ? "desc" : "asc") : "asc",
    }));
  }, []);

  const filteredBezerras = useMemo(() => {
    const q = (filters.search || "").trim().toLowerCase();

    const list = (mockBezerras || [])
      .filter((bezerra) => {
        const nome = (bezerra?.nome || "").toLowerCase();
        const brinco = (bezerra?.brinco || "").toLowerCase();

        const matchesSearch = !q || nome.includes(q) || brinco.includes(q);
        const matchesStatus = filters.status === "todos" || bezerra?.status === filters.status;
        const matchesCategoria =
          filters.categoria === "todos" || bezerra?.categoria === filters.categoria;

        // lote ainda não aplicado (mantendo compatível)
        return matchesSearch && matchesStatus && matchesCategoria;
      })
      .sort((a, b) => {
        const dir = sortConfig.direction === "asc" ? 1 : -1;
        const key = sortConfig.key;

        // pesoAtual numérico
        if (key === "pesoAtual") {
          const av = Number(a?.pesoAtual || 0);
          const bv = Number(b?.pesoAtual || 0);
          return (av - bv) * dir;
        }

        // nome/brinco como string
        if (key === "nome" || key === "brinco") {
          const av = String(a?.[key] || "");
          const bv = String(b?.[key] || "");
          return av.localeCompare(bv, "pt-BR") * dir;
        }

        // datas
        const ad = new Date(a?.[key] || 0).getTime();
        const bd = new Date(b?.[key] || 0).getTime();
        return (ad - bd) * dir;
      });

    return list;
  }, [filters, sortConfig]);

  const exportToCSV = useCallback(() => {
    // aqui tu pode plugar tua exportação real depois.
    alert(`Exportando ${filteredBezerras.length} registros...`);
  }, [filteredBezerras.length]);

  const total = filteredBezerras.length;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.h2}>Gestão de Bezerras</h2>
          <p style={s.sub}>Total de {total} animais cadastrados</p>
        </div>

        <div style={s.actions}>
          <button onClick={exportToCSV} style={s.btnGhost}>
            <Download size={18} />
            Exportar
          </button>

          <button onClick={onNovoCadastro} style={s.btnPrimary}>
            <Plus size={18} />
            Novo Cadastro
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={s.filtersCard}>
        <div style={s.filtersGrid}>
          <div style={s.searchWrap}>
            <Search size={16} style={s.searchIcon} />
            <input
              type="text"
              placeholder="Buscar nome ou brinco..."
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              style={s.searchInput}
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            style={s.select}
          >
            <option value="todos">Todos os status</option>
            <option value="saudavel">Saudáveis</option>
            <option value="alerta">Alerta</option>
            <option value="tratamento">Em Tratamento</option>
            <option value="critico">Crítico</option>
          </select>

          <select
            value={filters.categoria}
            onChange={(e) => setFilters((p) => ({ ...p, categoria: e.target.value }))}
            style={s.select}
          >
            <option value="todos">Todas as categorias</option>
            <option value="neonatal">Neonatal (0-7 dias)</option>
            <option value="aleitamento">Aleitamento (8-60 dias)</option>
            <option value="transicao">Transição (60-90 dias)</option>
            <option value="desmamada">Desmamada (90+ dias)</option>
          </select>

          <button
            style={s.btnFilter}
            onClick={() => alert("Mais filtros: lote / faixa idade / origem (podemos fazer depois)")}
            title="Abrir filtros avançados"
          >
            <Filter size={18} />
            Mais Filtros
          </button>
        </div>

        {selectedBezerras.length > 0 && (
          <div style={s.selectionBar}>
            <span style={s.selectionTxt}>{selectedBezerras.length} selecionadas</span>

            <button
              style={s.linkBtn}
              onClick={() => (typeof onIrComparativo === "function" ? onIrComparativo() : null)}
            >
              Comparar selecionadas
            </button>

            <button style={s.linkBtnDanger} onClick={limparSelecao}>
              Limpar seleção
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr>
              <Th style={{ width: 44 }} />
              <Th sortable onClick={() => handleSort("brinco")}>
                Animal <ArrowUpDown size={14} style={s.sortIcon} />
              </Th>
              <Th>Categoria</Th>
              <Th sortable onClick={() => handleSort("pesoAtual")}>
                Peso Atual <ArrowUpDown size={14} style={s.sortIcon} />
              </Th>
              <Th>GMD</Th>
              <Th>Status</Th>
              <Th>Próximo Manejo</Th>
              <Th style={{ width: 44 }} />
            </tr>
          </thead>

          <tbody>
            {filteredBezerras.map((bezerra) => {
              const isSelected = selectedBezerras.some((b) => b.id === bezerra.id);

              const gmdNum = calcGMD(bezerra);
              const gmdLabel = Number.isFinite(gmdNum) ? gmdNum.toFixed(2) : "—";

              const proximo = bezerra?.manejos?.find((m) => m.status === "pendente") || null;
              const proxTipo = proximo?.tipo ? String(proximo.tipo).replaceAll("_", " ") : "Nenhum";
              const proxData = proximo?.data || "—";

              return (
                <tr
                  key={bezerra.id}
                  style={{
                    ...s.tr,
                    ...(isSelected ? s.trSelected : null),
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isSelected ? s.trSelected.background : "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? s.trSelected.background : "white")}
                >
                  <td style={s.td}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBezerraSelection(bezerra);
                      }}
                      style={s.selectBtn}
                      title={isSelected ? "Remover da seleção" : "Selecionar para comparar"}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} style={{ color: "#2563eb" }} />
                      ) : (
                        <Square size={20} style={{ color: "#64748b" }} />
                      )}
                    </button>
                  </td>

                  <td
                    style={{ ...s.td, cursor: "pointer" }}
                    onClick={() => (typeof onAbrirBezerra === "function" ? onAbrirBezerra(bezerra.id) : null)}
                    title="Abrir ficha"
                  >
                    <div style={s.animalCell}>
                      <div style={s.avatar}>
                        {(bezerra?.nome || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={s.animalTop}>
                          <span style={s.brinco}>{bezerra?.brinco || "—"}</span>
                        </div>
                        <div style={s.animalSub}>
                          {bezerra?.nome || "—"} • {bezerra?.origem || "—"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={s.td}>
                    <Badge variant={bezerra?.categoria}>
                      {labelCategoria(bezerra?.categoria)}
                    </Badge>
                  </td>

                  <td style={s.td}>
                    <div style={s.peso}>{Number(bezerra?.pesoAtual || 0)} kg</div>
                    <div style={s.pesoSub}>PN: {Number(bezerra?.pesoNascimento || 0)} kg</div>
                  </td>

                  <td style={s.td}>
                    <span style={{ ...s.gmd, color: gmdColor(gmdNum) }}>
                      {gmdLabel} <span style={s.gmdUnit}>kg/dia</span>
                    </span>
                  </td>

                  <td style={s.td}>
                    <StatusBadge status={bezerra?.status} />
                  </td>

                  <td style={s.td}>
                    <div style={s.manejo}>{proxTipo}</div>
                    <div style={s.manejoSub}>{proxData}</div>
                  </td>

                  <td style={s.td}>
                    <button
                      style={s.moreBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        alert("Menu de ações (editar / imprimir / histórico) — fazemos depois.");
                      }}
                      title="Ações"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredBezerras.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...s.td, padding: 18, color: "#64748b", textAlign: "center" }}>
                  Nenhuma bezerra encontrada com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Helpers locais (mantém robustez)
// -------------------------------------------------------
function calcGMD(bezerra) {
  const p = bezerra?.pesagens || [];
  if (!Array.isArray(p) || p.length < 2) return NaN;

  const first = p[0];
  const last = p[p.length - 1];
  const pesoIni = Number(first?.peso);
  const pesoFim = Number(last?.peso);
  const diaIni = Number(first?.idadeDias);
  const diaFim = Number(last?.idadeDias);

  const dias = diaFim - diaIni;
  if (!Number.isFinite(pesoIni) || !Number.isFinite(pesoFim) || !Number.isFinite(dias) || dias <= 0) return NaN;

  return (pesoFim - pesoIni) / dias;
}

function labelCategoria(cat) {
  switch (cat) {
    case "neonatal":
      return "Neonatal";
    case "aleitamento":
      return "Aleitamento";
    case "transicao":
      return "Transição";
    case "desmamada":
      return "Desmamada";
    default:
      return "—";
  }
}

function gmdColor(v) {
  if (!Number.isFinite(v)) return "#64748b";
  if (v >= 0.7) return "#059669"; // verde
  if (v >= 0.5) return "#b45309"; // âmbar
  return "#dc2626"; // vermelho
}

// -------------------------------------------------------
// Componentes UI simples (sem dependências externas)
// -------------------------------------------------------
function Th({ children, style, onClick, sortable }) {
  return (
    <th
      onClick={onClick}
      style={{
        ...s.th,
        ...(sortable ? s.thSortable : null),
        ...(style || null),
      }}
    >
      {children}
    </th>
  );
}

function StatusBadge({ status }) {
  const conf = {
    saudavel: { bg: "#dcfce7", fg: "#166534", bd: "#86efac", label: "Saudável" },
    alerta: { bg: "#ffedd5", fg: "#9a3412", bd: "#fdba74", label: "Alerta" },
    tratamento: { bg: "#dbeafe", fg: "#1e40af", bd: "#93c5fd", label: "Tratamento" },
    critico: { bg: "#fee2e2", fg: "#991b1b", bd: "#fca5a5", label: "Crítico" },
  };

  const c = conf[status] || { bg: "#f1f5f9", fg: "#334155", bd: "#cbd5e1", label: "—" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${c.bd}`,
        background: c.bg,
        color: c.fg,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {c.label}
    </span>
  );
}

function Badge({ variant, children }) {
  const map = {
    neonatal: { bg: "#eef2ff", fg: "#3730a3", bd: "#c7d2fe" },
    aleitamento: { bg: "#ecfeff", fg: "#155e75", bd: "#a5f3fc" },
    transicao: { bg: "#f0fdf4", fg: "#166534", bd: "#86efac" },
    desmamada: { bg: "#fef9c3", fg: "#854d0e", bd: "#fde047" },
  };

  const c = map[variant] || { bg: "#f1f5f9", fg: "#334155", bd: "#cbd5e1" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${c.bd}`,
        background: c.bg,
        color: c.fg,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// -------------------------------------------------------
// Estilos (no padrão SmartCow: limpo e funcional)
// -------------------------------------------------------
const s = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },
  h2: {
    margin: 0,
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 1100,
  },
  sub: {
    margin: "6px 0 0 0",
    color: "#64748b",
    fontWeight: 800,
  },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },

  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #e5e7eb",
    background: "white",
    color: "#0f172a",
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 1000,
    boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid rgba(37,99,235,.25)",
    background: "#2563eb",
    color: "white",
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 1100,
    boxShadow: "0 6px 18px rgba(37,99,235,.18)",
  },

  filtersCard: {
    border: "1px solid #e5e7eb",
    background: "white",
    borderRadius: 16,
    padding: 12,
    boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr",
    gap: 10,
  },
  searchWrap: { position: "relative" },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
  },
  searchInput: {
    width: "100%",
    padding: "10px 12px 10px 36px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontWeight: 900,
    color: "#0f172a",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontWeight: 900,
    color: "#0f172a",
    background: "white",
  },
  btnFilter: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    cursor: "pointer",
    fontWeight: 1000,
    color: "#0f172a",
  },

  selectionBar: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  selectionTxt: { color: "#64748b", fontWeight: 900 },
  linkBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#2563eb",
    fontWeight: 1100,
    padding: 0,
  },
  linkBtnDanger: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#dc2626",
    fontWeight: 1100,
    padding: 0,
  },

  tableCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
    background: "white",
    boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px 12px",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: ".04em",
    color: "#64748b",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },
  thSortable: {
    cursor: "pointer",
    userSelect: "none",
  },
  sortIcon: { marginLeft: 6, verticalAlign: "middle", color: "#94a3b8" },

  tr: {
    background: "white",
    transition: "background .12s ease",
  },
  trSelected: {
    background: "#eff6ff",
  },
  td: {
    padding: "12px 12px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "middle",
  },

  selectBtn: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },

  animalCell: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#0f172a",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 1100,
  },
  animalTop: { display: "flex", alignItems: "center", gap: 10 },
  brinco: { fontWeight: 1100, color: "#0f172a" },
  animalSub: { fontSize: 12, color: "#64748b", fontWeight: 800 },

  peso: { color: "#0f172a", fontWeight: 1100 },
  pesoSub: { color: "#64748b", fontSize: 12, fontWeight: 800 },

  gmd: { fontWeight: 1100 },
  gmdUnit: { color: "#64748b", fontSize: 12, fontWeight: 800 },

  manejo: { color: "#0f172a", fontWeight: 1000 },
  manejoSub: { color: "#64748b", fontSize: 12, fontWeight: 800 },

  moreBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "white",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    color: "#0f172a",
  },
};
