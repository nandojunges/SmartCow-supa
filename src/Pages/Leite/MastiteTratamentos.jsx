// src/pages/Leite/MastiteTratamentos.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";

/**
 * Tratamentos: sempre vinculados a um caso
 * - Produto pode vir do estoque (preenche carências automaticamente)
 * - OU pode ser digitado livre (se não usa estoque)
 * - Responsável é obrigatório (puxa tabela e permite criar novo)
 *
 * Props:
 * - vaca
 * - caso (caso selecionado)
 * - casos (lista)
 * - tratamentos (lista global)
 * - persist(nextTratamentos)
 * - produtosEstoque (opcional)
 * - responsaveis (opcional)
 * - onCriarResponsavel(nome) -> async {id,nome} (opcional)
 */
export default function MastiteTratamentos({
  vaca,
  caso,
  casos,
  tratamentos,
  abrirCaso,
  setTab,
  persist,
  produtosEstoque = [],
  responsaveis = [],
  onCriarResponsavel,
}) {
  const styles = useMemo(() => selectStyles(), []);

  const [draft, setDraft] = useState(() => novoTrat(null));

  useEffect(() => {
    // quando muda caso selecionado, reseta draft
    setDraft(novoTrat(caso?.id || null));
  }, [caso?.id]);

  const tratamentosDoCaso = useMemo(() => {
    const id = caso?.id;
    return (tratamentos || [])
      .filter((t) => t.caso_id === id)
      .slice()
      .sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || ""));
  }, [tratamentos, caso?.id]);

  // Produtos do estoque -> options com metadata
  const produtoOptions = useMemo(() => {
    return (produtosEstoque || []).map((p) => ({
      value: p.id || p.nome,
      label: p.nome,
      data: p, // carências etc.
    }));
  }, [produtosEstoque]);

  // Responsáveis -> options
  const respOptions = useMemo(() => {
    return (responsaveis || []).map((r) => ({
      value: r.id || r.nome,
      label: r.nome,
      data: r,
    }));
  }, [responsaveis]);

  // Caso options (para trocar caso dentro da aba, se quiser)
  const casoOptions = useMemo(() => {
    return (casos || []).map((c) => ({
      value: c.id,
      label: `${fmtISO(c.data)} • ${c.tipo === "clinica" ? "Clínica" : "Subclínica"}`,
      data: c,
    }));
  }, [casos]);

  function salvarTratamento() {
    const idCaso = draft.caso_id || caso?.id;
    if (!idCaso) return alert("Selecione um caso antes de registrar tratamento.");

    if (!draft.data_inicio) return alert("Informe data de início.");
    if (!draft.tipo) return alert("Informe tipo.");
    if (!String(draft.produto || "").trim()) return alert("Informe o produto/protocolo.");
    if (!String(draft.responsavel || "").trim()) return alert("Responsável é obrigatório.");

    const t = { ...draft, caso_id: idCaso };

    const lista = [...(tratamentos || [])];
    const ix = lista.findIndex((x) => x.id === t.id);
    if (ix >= 0) lista[ix] = t;
    else lista.unshift(t);

    persist(lista);
    setDraft(novoTrat(idCaso));
    alert("✅ Tratamento salvo.");
  }

  function editarTratamento(id) {
    const t = (tratamentos || []).find((x) => x.id === id);
    if (!t) return;
    setDraft(t);
  }

  function removerTratamento(id) {
    const ok = window.confirm("Remover este tratamento?");
    if (!ok) return;
    const lista = (tratamentos || []).filter((t) => t.id !== id);
    persist(lista);
  }

  async function criarResponsavel(nome) {
    // se tiver callback, cria no banco e devolve
    if (typeof onCriarResponsavel === "function") {
      const novo = await onCriarResponsavel(nome);
      if (novo?.nome) {
        setDraft((d) => ({ ...d, responsavel: novo.nome }));
        return;
      }
    }
    // fallback local
    setDraft((d) => ({ ...d, responsavel: nome }));
  }

  function onSelecionarProduto(opt) {
    if (!opt) {
      setDraft((d) => ({
        ...d,
        produto: "",
        produto_origem: "manual",
        carencia_leite: "",
        carencia_carne: "",
      }));
      return;
    }

    // Se veio do estoque, preenche carências automaticamente
    const p = opt.data;
    if (p) {
      setDraft((d) => ({
        ...d,
        produto: p.nome || opt.label,
        produto_origem: "estoque",
        produto_estoque_id: p.id || null,
        carencia_leite: p.carencia_leite ?? d.carencia_leite ?? "",
        carencia_carne: p.carencia_carne ?? d.carencia_carne ?? "",
      }));
    } else {
      // manual
      setDraft((d) => ({
        ...d,
        produto: opt.label,
        produto_origem: "manual",
      }));
    }
  }

  if (!vaca) return null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card
        title="Tratamentos"
        subtitle="Produto pode vir do estoque (autopreenche carências) ou ser digitado. Responsável é obrigatório."
        right={
          <div style={{ minWidth: 280 }}>
            <div style={ui.smallLabel}>Caso selecionado</div>
            <Select
              styles={styles}
              options={casoOptions}
              value={casoOptions.find((o) => o.value === (caso?.id || null)) || null}
              onChange={(opt) => {
                if (opt?.value) {
                  abrirCaso(opt.value);
                  setTab("trat");
                }
              }}
              placeholder="Selecione um caso..."
            />
          </div>
        }
      >
        {!caso ? (
          <div style={{ color: "#991b1b", fontWeight: 900 }}>
            Selecione um caso na aba “Casos” para registrar tratamento.
          </div>
        ) : (
          <>
            <div style={ui.grid2}>
              <Field label="Data início">
                <input
                  type="date"
                  value={draft.data_inicio || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, data_inicio: e.target.value }))}
                  style={ui.input}
                />
              </Field>
              <Field label="Data fim (opcional)">
                <input
                  type="date"
                  value={draft.data_fim || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, data_fim: e.target.value }))}
                  style={ui.input}
                />
              </Field>
            </div>

            <div style={{ ...ui.grid2, marginTop: 10 }}>
              <Field label="Tipo">
                <Select
                  styles={styles}
                  options={[
                    { value: "IMM", label: "IMM" },
                    { value: "Sistêmico", label: "Sistêmico" },
                    { value: "Suporte", label: "Suporte" },
                  ]}
                  value={{ value: draft.tipo || "IMM", label: draft.tipo || "IMM" }}
                  onChange={(opt) => setDraft((d) => ({ ...d, tipo: opt?.value || "IMM" }))}
                />
              </Field>

              <Field label="Produto / Protocolo">
                {produtoOptions.length ? (
                  <CreatableSelect
                    styles={styles}
                    options={produtoOptions}
                    value={
                      draft.produto
                        ? { value: draft.produto_estoque_id || draft.produto, label: draft.produto }
                        : null
                    }
                    onChange={onSelecionarProduto}
                    onCreateOption={(label) => onSelecionarProduto({ label })}
                    placeholder="Selecione do estoque ou digite..."
                    formatCreateLabel={(x) => `Usar manual: "${x}"`}
                  />
                ) : (
                  <CreatableSelect
                    styles={styles}
                    options={[]}
                    value={draft.produto ? { value: draft.produto, label: draft.produto } : null}
                    onChange={(opt) => setDraft((d) => ({ ...d, produto: opt?.label || "" }))}
                    onCreateOption={(label) => setDraft((d) => ({ ...d, produto: label }))}
                    placeholder="Digite o produto/protocolo..."
                    formatCreateLabel={(x) => `Usar manual: "${x}"`}
                  />
                )}
              </Field>
            </div>

            <div style={{ ...ui.grid2, marginTop: 10 }}>
              <Field label="Responsável (obrigatório)">
                <CreatableSelect
                  styles={styles}
                  options={respOptions}
                  value={draft.responsavel ? { value: draft.responsavel, label: draft.responsavel } : null}
                  onChange={(opt) => setDraft((d) => ({ ...d, responsavel: opt?.label || "" }))}
                  onCreateOption={(label) => criarResponsavel(label)}
                  placeholder="Selecione ou cadastre..."
                  formatCreateLabel={(x) => `Cadastrar responsável: "${x}"`}
                />
              </Field>

              <Field label="Nº de aplicações / dias">
                <input
                  value={draft.aplicacoes || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, aplicacoes: e.target.value }))}
                  style={ui.input}
                  placeholder="Ex.: 3"
                />
              </Field>
            </div>

            <div style={{ ...ui.grid2, marginTop: 10 }}>
              <Field label="Carência leite">
                <input
                  value={draft.carencia_leite || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, carencia_leite: e.target.value }))}
                  style={ui.input}
                  placeholder="Ex.: 72h"
                />
              </Field>

              <Field label="Carência carne">
                <input
                  value={draft.carencia_carne || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, carencia_carne: e.target.value }))}
                  style={ui.input}
                  placeholder="Ex.: 14d"
                />
              </Field>
            </div>

            <div style={{ marginTop: 10 }}>
              <Field label="Observação">
                <input
                  value={draft.observacao || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, observacao: e.target.value }))}
                  style={ui.input}
                  placeholder="Ex.: aplicou em RF, resposta boa em 48h..."
                />
              </Field>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="success" onClick={salvarTratamento}>
                💾 Salvar Tratamento
              </Btn>
              <Btn onClick={() => setDraft(novoTrat(caso.id))} title="Limpar">
                ↺ Limpar
              </Btn>
            </div>
          </>
        )}
      </Card>

      <Card title="Tratamentos registrados" subtitle="Edite/Remova. Isso alimenta taxa de sucesso por produto.">
        {!caso ? (
          <div style={{ color: "#64748b", fontWeight: 800 }}>Selecione um caso.</div>
        ) : tratamentosDoCaso.length === 0 ? (
          <div style={{ color: "#64748b", fontWeight: 800 }}>Nenhum tratamento registrado.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {tratamentosDoCaso.map((t) => (
              <div key={t.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 1000 }}>
                    {fmtISO(t.data_inicio)} • {t.tipo} • {t.produto}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Btn onClick={() => editarTratamento(t.id)} title="Editar">
                      ✏️ Editar
                    </Btn>
                    <Btn variant="danger" onClick={() => removerTratamento(t.id)} title="Remover">
                      🗑️ Remover
                    </Btn>
                  </div>
                </div>

                <div style={{ marginTop: 6, color: "#334155", fontWeight: 800 }}>
                  Resp.: {t.responsavel || "—"} • Aplicações: {t.aplicacoes || "—"} • Car. leite:{" "}
                  {t.carencia_leite || "—"} • Car. carne: {t.carencia_carne || "—"}
                </div>

                {t.observacao ? (
                  <div style={{ marginTop: 6, color: "#64748b", fontWeight: 800 }}>{t.observacao}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ===================== helpers ===================== */

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function hojeISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function novoTrat(casoId) {
  return {
    id: uid(),
    caso_id: casoId,
    data_inicio: hojeISO(),
    data_fim: "",
    tipo: "IMM",
    produto: "",
    produto_origem: "manual", // manual | estoque
    produto_estoque_id: null,
    responsavel: "",
    aplicacoes: "",
    carencia_leite: "",
    carencia_carne: "",
    observacao: "",
  };
}

function fmtISO(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return d.toLocaleDateString("pt-BR");
}

function selectStyles() {
  return {
    control: (base) => ({
      ...base,
      borderRadius: 12,
      borderColor: "#cbd5e1",
      minHeight: 44,
      boxShadow: "none",
      fontWeight: 800,
    }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    option: (base) => ({ ...base, fontWeight: 800 }),
    placeholder: (base) => ({ ...base, color: "#94a3b8", fontWeight: 800 }),
  };
}

/* ===================== UI ===================== */

function Field({ label, children }) {
  return (
    <div>
      <div style={ui.smallLabel}>{label}</div>
      {children}
    </div>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div style={ui.card}>
      <div style={ui.cardHeader}>
        <div>
          <div style={ui.cardTitle}>{title}</div>
          {subtitle ? <div style={ui.cardSub}>{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "neutral", title, disabled }) {
  const palettes = {
    neutral: { bg: "#f8fafc", bd: "rgba(51,65,85,.25)", c: "#0f172a" },
    success: { bg: "#f0fdf4", bd: "rgba(22,101,52,.25)", c: "#166534" },
    danger: { bg: "#fef2f2", bd: "rgba(153,27,27,.25)", c: "#991b1b" },
    primary: { bg: "#eff6ff", bd: "rgba(30,58,138,.25)", c: "#1e3a8a" },
  };
  const p = palettes[variant] || palettes.neutral;

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 12px",
        borderRadius: 12,
        border: `1px solid ${p.bd}`,
        background: disabled ? "#f1f5f9" : p.bg,
        color: disabled ? "#94a3b8" : p.c,
        fontWeight: 1000,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

const ui = {
  card: {
    border: "1px solid #e5e7eb",
    background: "white",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  cardTitle: { fontWeight: 1000, fontSize: "0.98rem" },
  cardSub: { fontSize: "0.85rem", color: "#64748b", marginTop: 2, fontWeight: 800 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  input: {
    width: "100%",
    padding: "0.6rem 0.65rem",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: "0.92rem",
    outline: "none",
    boxSizing: "border-box",
    background: "white",
    fontWeight: 800,
  },
  smallLabel: { fontWeight: 1000, fontSize: "0.84rem", marginBottom: 6, color: "#0f172a" },
};
