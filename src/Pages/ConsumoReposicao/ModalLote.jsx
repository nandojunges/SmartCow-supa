// src/pages/ConsumoReposicao/ModalLote.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import "../../styles/botoes.css";

/* ===================== REACT SELECT ===================== */
const rsStyles = {
  container: (base) => ({
    ...base,
    width: "100%",
    boxSizing: "border-box",
    minWidth: 0,
  }),
  control: (base, state) => ({
    ...base,
    height: 44,
    minHeight: 44,
    borderRadius: 10,
    borderColor: state.isFocused ? "#2563eb" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #2563eb" : "none",
    ":hover": { borderColor: "#2563eb" },
    fontSize: 14,
    backgroundColor: "#fff",
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
  }),
  valueContainer: (b) => ({
    ...b,
    padding: "0 12px",
    minWidth: 0,
    boxSizing: "border-box",
  }),
  indicatorsContainer: (b) => ({ ...b, height: 44 }),
  menuPortal: (b) => ({ ...b, zIndex: 99999 }),
  menu: (b) => ({ ...b, zIndex: 99999 }),
};

/* ===================== MODAL BASE ===================== */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.70)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 18,
};

const modalCard = {
  width: "min(980px, 96vw)",
  maxHeight: "92vh",
  background: "#fff",
  borderRadius: 18,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
  fontFamily: "Poppins, sans-serif",
  boxSizing: "border-box",
  border: "1px solid rgba(17,24,39,0.06)",
};

const modalHeader = {
  background: "#1e40af",
  color: "#fff",
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const modalBody = {
  padding: 18,
  overflowY: "auto",
  boxSizing: "border-box",
};

/* ===================== HELPERS: TECLADO ===================== */
function useGlobalEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

function ModalBase({ title, children, onClose }) {
  useGlobalEscape(onClose);

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div style={{ fontWeight: 900, letterSpacing: 0.2, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </div>

          {/* botão X alinhado e consistente */}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 20,
              fontWeight: 900,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              flexShrink: 0,
            }}
            title="Fechar (ESC)"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div style={modalBody}>{children}</div>
      </div>
    </div>
  );
}

/* ===================== COMPONENTES EXPORTADOS ===================== */

export function ModalLoteCadastro({ title, initialValue, onClose, onCancel, onSave }) {
  return (
    <ModalBase title={title} onClose={onClose}>
      <CadastroLoteModal value={initialValue} onCancel={onCancel} onSave={onSave} />
    </ModalBase>
  );
}

export function ModalLoteInfo({ lote, onClose }) {
  return (
    <ModalBase title={`📋 ${lote?.nome || "Lote"} — ${lote?.funcao || "—"}`} onClose={onClose}>
      <div style={{ fontSize: 14, color: "#374151" }}>
        Esta tela é apenas layout por enquanto.
        <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          Quando conectarmos ao Supabase, aqui vamos listar os animais do lote e calcular a contagem real.
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button className="botao-acao pequeno" onClick={onClose}>
          Fechar
        </button>
      </div>
    </ModalBase>
  );
}

export function ModalConfirmarExclusao({ title = "Confirmar exclusão", onClose, onCancel, onConfirm }) {
  return (
    <ModalBase title={title} onClose={onClose}>
      <div style={{ fontSize: 14, color: "#374151" }}>Deseja realmente excluir este lote?</div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button className="botao-cancelar pequeno" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn-excluir" onClick={onConfirm}>
          Excluir
        </button>
      </div>
    </ModalBase>
  );
}

/* ===================== FORM CADASTRO/EDIÇÃO ===================== */
function CadastroLoteModal({ value, onCancel, onSave }) {
  const funcoes = useMemo(
    () => ["Lactação", "Tratamento", "Descarte", "Secagem", "Pré-parto", "Novilhas", "Outro"],
    []
  );
  const niveis = useMemo(() => ["Alta Produção", "Média Produção", "Baixa Produção"], []);
  const tratamentos = useMemo(() => ["Mastite", "Pós-parto", "Outro"], []);
  const motivos = useMemo(() => ["Produção baixa", "Lesão", "Problemas podais", "Outro"], []);

  const [form, setForm] = useState(value || {});
  useEffect(() => setForm(value || {}), [value]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // refs para navegação por teclado
  const refNome = useRef(null);
  const refFuncao = useRef(null);
  const refNivel = useRef(null);
  const refTrat = useRef(null);
  const refMotivo = useRef(null);
  const refDesc = useRef(null);
  const refAtivo = useRef(null);
  const refBtnSalvar = useRef(null);

  // foco inicial ao abrir
  useEffect(() => {
    const t = setTimeout(() => refNome.current?.focus?.(), 60);
    return () => clearTimeout(t);
  }, []);

  // limpa campos dependentes quando troca função
  useEffect(() => {
    if (!form) return;
    if (form.funcao !== "Lactação" && form.nivelProducao) set("nivelProducao", "");
    if (form.funcao !== "Tratamento" && form.tipoTratamento) set("tipoTratamento", "");
    if (form.funcao !== "Descarte" && form.motivoDescarte) set("motivoDescarte", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.funcao]);

  const camposVisiveis = useMemo(() => {
    const arr = [refNome, refFuncao];
    if (form?.funcao === "Lactação") arr.push(refNivel);
    if (form?.funcao === "Tratamento") arr.push(refTrat);
    if (form?.funcao === "Descarte") arr.push(refMotivo);
    arr.push(refDesc, refAtivo, refBtnSalvar);
    return arr;
  }, [form?.funcao]);

  const isReactSelectInput = () => {
    const active = document.activeElement;
    // input interno do react-select costuma ter aria-autocomplete="list"
    return active?.getAttribute?.("aria-autocomplete") === "list";
  };

  const focusByIndex = (idx) => {
    const r = camposVisiveis[Math.max(0, Math.min(idx, camposVisiveis.length - 1))];
    const el = r?.current;
    if (!el) return;

    // normal input/checkbox/button
    if (el?.focus) return el.focus();

    // fallback: busca input interno
    const inner = el.querySelector?.("input");
    inner?.focus?.();
  };

  const findCurrentIndex = () => {
    const active = document.activeElement;
    const idx = camposVisiveis.findIndex((r) => {
      const el = r?.current;
      if (!el) return false;
      if (el === active) return true;
      if (el.contains && el.contains(active)) return true;
      return false;
    });
    return idx >= 0 ? idx : 0;
  };

  const onKeyDownForm = (e) => {
    const key = e.key;

    if (key === "Escape") {
      e.preventDefault();
      onCancel?.();
      return;
    }

    // se estiver dentro do react-select, não sequestrar setas/enter
    if (isReactSelectInput()) return;

    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      const idx = findCurrentIndex();
      const next = key === "ArrowDown" ? idx + 1 : idx - 1;
      focusByIndex(next);
      return;
    }

    if (key === "Enter") {
      e.preventDefault();
      const idx = findCurrentIndex();
      const lastIdx = camposVisiveis.length - 1;

      // último campo = salvar
      if (idx >= lastIdx - 1) {
        onSave?.(form);
      } else {
        focusByIndex(idx + 1);
      }
      return;
    }
  };

  return (
    <div onKeyDown={onKeyDownForm} style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", boxSizing: "border-box" }}>
      {/* grid: minmax(0,...) impede estouro; classe aplicada para responsivo */}
      <div
        className="lote-grid-2col"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 360px)",
          gap: 12,
          alignItems: "end",
          width: "100%",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        <Input
          inputRef={refNome}
          label="Nome *"
          value={form?.nome}
          onChange={(v) => set("nome", v)}
          placeholder="Ex: Lote 1"
        />

        <SelectRS
          outerRef={refFuncao}
          label="Função *"
          value={form?.funcao}
          options={funcoes}
          onChange={(v) => set("funcao", v)}
        />
      </div>

      {form?.funcao === "Lactação" && (
        <SelectRS
          outerRef={refNivel}
          label="Nível Produtivo *"
          value={form?.nivelProducao}
          options={niveis}
          onChange={(v) => set("nivelProducao", v)}
        />
      )}

      {form?.funcao === "Tratamento" && (
        <SelectRS
          outerRef={refTrat}
          label="Tipo de Tratamento *"
          value={form?.tipoTratamento}
          options={tratamentos}
          onChange={(v) => set("tipoTratamento", v)}
        />
      )}

      {form?.funcao === "Descarte" && (
        <SelectRS
          outerRef={refMotivo}
          label="Motivo do Descarte *"
          value={form?.motivoDescarte}
          options={motivos}
          onChange={(v) => set("motivoDescarte", v)}
        />
      )}

      <Input
        inputRef={refDesc}
        label="Descrição"
        value={form?.descricao}
        onChange={(v) => set("descricao", v)}
        placeholder="Opcional"
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#f9fafb",
          width: "100%",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: "#374151" }}>Status</span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 28,
              padding: "0 14px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 900,
              background: "#fff",
              border: `1.5px solid ${form?.ativo ? "#86efac" : "#e5e7eb"}`,
              color: form?.ativo ? "#065f46" : "#374151",
              flexShrink: 0,
            }}
          >
            {form?.ativo ? "Ativo" : "Inativo"}
          </span>
        </div>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
          <input
            ref={refAtivo}
            type="checkbox"
            checked={!!form?.ativo}
            onChange={(e) => set("ativo", e.target.checked)}
          />
          Ativo
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="botao-cancelar pequeno" onClick={onCancel}>
          Cancelar
        </button>
        <button ref={refBtnSalvar} className="botao-acao pequeno" onClick={() => onSave(form)}>
          Salvar
        </button>
      </div>

      {/* Responsivo real */}
      <style>{`
        @media (max-width: 820px) {
          .lote-grid-2col {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ===================== CAMPOS ===================== */
function Input({ label, value, onChange = () => {}, type = "text", placeholder = "", inputRef }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", minWidth: 0, boxSizing: "border-box" }}>
      <label style={{ fontSize: 12, fontWeight: 900, color: "#374151" }}>{label}</label>
      <input
        ref={inputRef}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 44,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid #d1d5db",
          background: "#fff",
          outline: "none",
          boxSizing: "border-box",
          minWidth: 0,
        }}
        onFocus={(e) => (e.target.style.boxShadow = "0 0 0 1px #2563eb")}
        onBlur={(e) => (e.target.style.boxShadow = "none")}
      />
    </div>
  );
}

function SelectRS({ label, value, onChange, options = [], placeholder = "Selecione...", outerRef }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const valObj = opts.find((o) => o.value === value) || null;

  return (
    <div
      ref={outerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflow: "hidden", // impede vazamento lateral
      }}
    >
      <label style={{ fontSize: 12, fontWeight: 900, color: "#374151" }}>{label}</label>

      <Select
        value={valObj}
        onChange={(opt) => onChange(opt?.value ?? "")}
        options={opts}
        placeholder={placeholder}
        isClearable
        styles={rsStyles}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      />
    </div>
  );
}
