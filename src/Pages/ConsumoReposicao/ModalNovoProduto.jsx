// src/pages/ConsumoReposicao/ModalNovoProduto.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import "../../styles/botoes.css";

/* ===================== REACT-SELECT ===================== */
const rsStyles = {
  container: (b) => ({ ...b, width: "100%", boxSizing: "border-box" }),
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    height: 44,
    borderRadius: 10,
    borderColor: state.isFocused ? "#2563eb" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #2563eb" : "none",
    fontSize: 14,
    ":hover": { borderColor: "#2563eb" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 12px" }),
  indicatorsContainer: (base) => ({ ...base, height: 44 }),
  menuPortal: (b) => ({ ...b, zIndex: 99999 }),
  menu: (b) => ({ ...b, zIndex: 99999 }),
};

/* ===================== MODAL ===================== */
export default function ModalNovoProduto({ open, onClose, onSaved, initial = null }) {
  const categorias = useMemo(
    () => ["Cozinha", "Higiene e Limpeza", "Farmácia", "Reprodução", "Materiais Gerais"],
    []
  );

  const unidades = useMemo(() => ["kg", "g", "litros", "mL", "un", "doses"], []);

  const tiposFarmacia = useMemo(
    () => ["Antibiótico", "Anti-inflamatório", "Antiparasitário", "Hormônio", "Vacina", "Outros"],
    []
  );

  const [form, setForm] = useState(() => toForm(initial));
  useEffect(() => setForm(toForm(initial)), [initial]);

  const isFarmacia = form.categoria === "Farmácia";
  const isAntibiotico = isFarmacia && form.tipoFarmacia === "Antibiótico";
  const isEdit = !!initial?.id;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Se sair de Farmácia, limpa campos específicos
  useEffect(() => {
    if (!isFarmacia) {
      setForm((f) => ({
        ...f,
        tipoFarmacia: "",
        carenciaLeiteDias: "",
        carenciaCarneDias: "",
        semCarenciaLeite: false,
        semCarenciaCarne: false,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoria]);

  if (!open) return null;

  const catOpts = categorias.map((c) => ({ value: c, label: c }));
  const uniOpts = unidades.map((u) => ({ value: u, label: u }));
  const tipoFarmOpts = tiposFarmacia.map((t) => ({ value: t, label: t }));

  const validarAntesDeSalvar = () => {
    const payload = normalizePayload(form, { isEdit });

    // produto (sempre)
    if (!payload.produto.nomeComercial || !payload.produto.categoria || !payload.produto.unidade) {
      alert("Preencha os campos obrigatórios do produto.");
      return null;
    }

    if (isFarmacia && !payload.produto.tipoFarmacia) {
      alert("Na categoria Farmácia, selecione o tipo (ex: Antibiótico, Hormônio...).");
      return null;
    }

    if (isAntibiotico) {
      const okLeite =
        payload.produto.semCarenciaLeite || Number(payload.produto.carenciaLeiteDias) >= 0;
      const okCarne =
        payload.produto.semCarenciaCarne || Number(payload.produto.carenciaCarneDias) >= 0;
      if (!okLeite || !okCarne) {
        alert(
          "Para Antibiótico, informe a carência (leite e carne) ou marque “Sem carência” em cada um."
        );
        return null;
      }
    }

    // lote (entrada)
    if (!payload.lote && !isEdit) {
      // novo produto precisa vir com entrada inicial (porque sua tela mostra estoque)
      alert("Informe a entrada inicial (quantidade e valor total).");
      return null;
    }

    if (payload.lote) {
      if (Number.isNaN(payload.lote.quantidade) || payload.lote.quantidade <= 0) {
        alert("Quantidade da entrada inválida.");
        return null;
      }
      if (Number.isNaN(payload.lote.valorTotal) || payload.lote.valorTotal < 0) {
        alert("Valor total da entrada inválido.");
        return null;
      }
    }

    return payload;
  };

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
        <div style={header}>
          <span>{isEdit ? "Editar Produto" : "Novo Produto"}</span>
          <button className="fechar-modal" onClick={onClose}>
            ×
          </button>
        </div>

        {/* ✅ body com scroll interno */}
        <div style={contentWrap}>
          {/* ===== GRID “TOPO” ===== */}
          <div style={topGrid}>
            {/* Linha 1: Nome (esq) + vazio (dir) */}
            <div style={{ gridColumn: "1 / 2" }}>
              <Campo
                label="Nome Comercial *"
                value={form.nomeComercial}
                onChange={(v) => setForm((f) => ({ ...f, nomeComercial: v }))}
              />
            </div>
            <div style={{ gridColumn: "2 / 3" }} />

            {/* Linha 2: Categoria (esq) + Tipo Farmácia (dir quando Farmácia) */}
            <div style={{ gridColumn: "1 / 2" }}>
              <CampoSelect
                label="Categoria *"
                options={catOpts}
                value={form.categoria}
                onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
                placeholder="Selecione..."
              />
            </div>

            <div style={{ gridColumn: "2 / 3" }}>
              {isFarmacia ? (
                <CampoSelect
                  label="Tipo (Farmácia) *"
                  options={tipoFarmOpts}
                  value={form.tipoFarmacia}
                  onChange={(v) => setForm((f) => ({ ...f, tipoFarmacia: v }))}
                  placeholder="Selecione..."
                />
              ) : null}
            </div>

            {/* Linha 3 (condicional): Carências */}
            {isAntibiotico ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={boxFarmacia}>
                  <div style={boxTitle}>Carência (obrigatória para Antibiótico)</div>
                  <div style={grid2}>
                    <CarenciaBlock
                      titulo="Leite"
                      dias={form.carenciaLeiteDias}
                      setDias={(v) => setForm((f) => ({ ...f, carenciaLeiteDias: v }))}
                      sem={form.semCarenciaLeite}
                      setSem={(v) =>
                        setForm((f) => ({
                          ...f,
                          semCarenciaLeite: v,
                          carenciaLeiteDias: v ? "" : f.carenciaLeiteDias,
                        }))
                      }
                    />
                    <CarenciaBlock
                      titulo="Carne"
                      dias={form.carenciaCarneDias}
                      setDias={(v) => setForm((f) => ({ ...f, carenciaCarneDias: v }))}
                      sem={form.semCarenciaCarne}
                      setSem={(v) =>
                        setForm((f) => ({
                          ...f,
                          semCarenciaCarne: v,
                          carenciaCarneDias: v ? "" : f.carenciaCarneDias,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* ===== RESTO DO FORM ===== */}
          <div style={formGrid}>
            <CampoSelect
              label="Unidade *"
              options={uniOpts}
              value={form.unidade}
              onChange={(v) => setForm((f) => ({ ...f, unidade: v }))}
              placeholder="Selecione..."
            />

            <Campo
              label={isEdit ? "Entrada (Quantidade) — opcional" : "Entrada (Quantidade) *"}
              type="number"
              value={form.qtdEntrada}
              onChange={(v) => setForm((f) => ({ ...f, qtdEntrada: v }))}
              placeholder="Ex: 25"
            />

            <Campo
              label={isEdit ? "Entrada (Valor Total R$) — opcional" : "Entrada (Valor Total R$) *"}
              type="number"
              value={form.valorTotalEntrada}
              onChange={(v) => setForm((f) => ({ ...f, valorTotalEntrada: v }))}
              placeholder="Ex: 250"
            />

            <Campo
              label="Apresentação"
              placeholder="Ex: Frasco 100mL / Galão 5L"
              value={form.apresentacao}
              onChange={(v) => setForm((f) => ({ ...f, apresentacao: v }))}
            />

            <Campo
              label="Validade (da entrada)"
              type="date"
              value={form.validadeEntrada}
              onChange={(v) => setForm((f) => ({ ...f, validadeEntrada: v }))}
            />

            <div />
          </div>

          <div style={footer}>
            <button className="botao-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="botao-acao"
              onClick={() => {
                const payload = validarAntesDeSalvar();
                if (!payload) return;
                onSaved?.(payload);
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== CAMPOS ===================== */
function Campo({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="label-form">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function CampoSelect({ label, options, value, onChange, placeholder = "Selecione..." }) {
  return (
    <div>
      <label className="label-form">{label}</label>
      <Select
        options={options}
        value={options.find((o) => o.value === value) || null}
        onChange={(opt) => onChange(opt?.value || "")}
        styles={rsStyles}
        placeholder={placeholder}
        isClearable
        menuPortalTarget={document.body}
      />
    </div>
  );
}

function CarenciaBlock({ titulo, dias, setDias, sem, setSem }) {
  return (
    <div style={carenciaCard}>
      <div style={carenciaTitle}>{titulo}</div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="number"
          value={dias ?? ""}
          onChange={(e) => setDias(e.target.value)}
          disabled={!!sem}
          placeholder="Dias"
          style={{
            ...inputStyle,
            width: 140,
            opacity: sem ? 0.6 : 1,
          }}
        />

        <label style={checkRow}>
          <input type="checkbox" checked={!!sem} onChange={(e) => setSem(e.target.checked)} />
          <span style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>Sem carência</span>
        </label>
      </div>
    </div>
  );
}

/* ===================== HELPERS ===================== */
function toForm(initial) {
  const d = initial || {};
  return {
    // produto
    nomeComercial: d.nomeComercial ?? "",
    categoria: d.categoria ?? "",
    unidade: d.unidade ?? "",
    apresentacao: d.apresentacao ?? "",

    tipoFarmacia: d.tipoFarmacia ?? "",
    carenciaLeiteDias: d.carenciaLeiteDias ?? "",
    carenciaCarneDias: d.carenciaCarneDias ?? "",
    semCarenciaLeite: !!d.semCarenciaLeite,
    semCarenciaCarne: !!d.semCarenciaCarne,

    // entrada (lote) — em edição fica vazio (não “altera estoque” sem querer)
    qtdEntrada: "",
    valorTotalEntrada: "",
    validadeEntrada: "",
  };
}

function normalizePayload(f, { isEdit }) {
  const produto = {
    nomeComercial: String(f.nomeComercial || "").trim(),
    categoria: String(f.categoria || "").trim(),
    unidade: String(f.unidade || "").trim(),
    apresentacao: String(f.apresentacao || "").trim(),

    tipoFarmacia: String(f.tipoFarmacia || "").trim() || null,
    carenciaLeiteDias:
      f.carenciaLeiteDias === "" || f.carenciaLeiteDias == null ? null : Number(f.carenciaLeiteDias),
    carenciaCarneDias:
      f.carenciaCarneDias === "" || f.carenciaCarneDias == null ? null : Number(f.carenciaCarneDias),
    semCarenciaLeite: !!f.semCarenciaLeite,
    semCarenciaCarne: !!f.semCarenciaCarne,
  };

  // lote só existe se o usuário preencheu algo
  const qtd = f.qtdEntrada === "" || f.qtdEntrada == null ? null : Number(f.qtdEntrada);
  const val = f.valorTotalEntrada === "" || f.valorTotalEntrada == null ? null : Number(f.valorTotalEntrada);

  const algum = (qtd != null && qtd !== 0) || (val != null && val !== 0) || !!f.validadeEntrada;

  let lote = null;

  if (algum) {
    // para “novo”, vamos exigir quantidade e valor total (na validação)
    lote = {
      quantidade: Number(qtd || 0),
      valorTotal: Number(val || 0),
      validade: f.validadeEntrada ? toIsoDate00(f.validadeEntrada) : null,
    };
  } else if (!isEdit) {
    // novo sem entrada -> validação vai bloquear
    lote = null;
  }

  return { produto, lote };
}

function toIsoDate00(yyyyMmDd) {
  // mantém uma ISO estável (sem timezone quebrando a data)
  // ex: "2025-12-15" -> "2025-12-15T00:00:00.000Z"
  return new Date(`${yyyyMmDd}T00:00:00`).toISOString();
}

/* ===================== ESTILOS ===================== */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: 16,
};

const modalCard = {
  width: "980px",
  maxWidth: "96vw",
  maxHeight: "92vh",
  background: "#fff",
  borderRadius: "16px",
  overflow: "hidden",
  fontFamily: "Poppins, sans-serif",
  boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  display: "flex",
  flexDirection: "column",
};

const header = {
  background: "#1e40af",
  color: "#fff",
  padding: "14px 18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: 800,
  fontSize: "1.05rem",
  flex: "0 0 auto",
};

const contentWrap = {
  padding: 18,
  boxSizing: "border-box",
  overflow: "auto",
  flex: "1 1 auto",
};

const topGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  columnGap: 24,
  rowGap: 14,
  alignItems: "start",
  marginBottom: 14,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  columnGap: 24,
  rowGap: 14,
  alignItems: "start",
};

const footer = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 18,
  paddingBottom: 2,
};

const inputStyle = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const boxFarmacia = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
};

const boxTitle = {
  fontSize: 13,
  fontWeight: 900,
  color: "#1f2937",
  marginBottom: 10,
};

const carenciaCard = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
};

const carenciaTitle = {
  fontSize: 13,
  fontWeight: 900,
  color: "#111827",
  marginBottom: 8,
};

const checkRow = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  userSelect: "none",
};
