// src/pages/Financeiro/ModalLancamentoFinanceiro.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { useFazenda } from "../../context/FazendaContext";
import { withFazendaId } from "../../lib/fazendaScope";
import { supabase } from "../../lib/supabaseClient";

/* ===================== REACT-SELECT ===================== */
const rsStyles = {
  container: (b) => ({ ...b, width: "100%" }),
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    height: 44,
    borderRadius: 10,
    borderColor: state.isFocused ? "#60a5fa" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 1px #60a5fa" : "none",
    fontSize: 14,
    backgroundColor: "#f9fafb",
    ":hover": { borderColor: "#60a5fa" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 12px" }),
  indicatorsContainer: (base) => ({ ...base, height: 44 }),
  menuPortal: (b) => ({ ...b, zIndex: 999999 }),
  menu: (b) => ({ ...b, zIndex: 999999 }),
};

/* ===================== HELPERS ===================== */
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toISODateInput(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function asNumber(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function numBR(v, dec = 2) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}
function clampDateISO(s) {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

function normalizeOrigemOption(opt) {
  if (!opt) return null;
  const val = String(opt.value ?? opt.label ?? "").trim();
  if (!val) return null;
  if (val.toLowerCase() === "manual") {
    return { value: "Manual", label: "Manual (lançamento avulso)" };
  }
  // mantém label original, mas garante value coerente
  return { value: opt.value ?? opt.label ?? val, label: opt.label ?? val };
}

/* ===================== MODAL BASE ===================== */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: 12,
};

const modalCard = {
  background: "#fff",
  width: "min(980px, 96vw)",
  borderRadius: 16,
  boxShadow: "0 0 24px rgba(15,23,42,0.35)",
  overflow: "hidden",
  fontFamily: "Poppins, sans-serif",
};

const headerBlue = {
  background: "#1e3a8a",
  color: "#fff",
  padding: "14px 18px",
  fontWeight: 800,
  fontSize: "1.05rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const btnFecharHeader = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  padding: "6px 14px",
  borderRadius: "999px",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: 700,
};

function Modal({ titulo, onClose, children, footer, bloqueado }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !bloqueado) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, bloqueado]);

  return (
    <div style={overlay} onMouseDown={() => (!bloqueado ? onClose?.() : null)}>
      <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
        <div style={headerBlue}>
          <span>{titulo}</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnFecharHeader,
              opacity: bloqueado ? 0.6 : 1,
              cursor: bloqueado ? "not-allowed" : "pointer",
            }}
            disabled={bloqueado}
          >
            Fechar
          </button>
        </div>

        <div style={{ padding: 18 }}>{children}</div>

        {footer && (
          <div style={{ padding: 18, borderTop: "1px solid #e5e7eb" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Modal de lançamento do Financeiro
 * props:
 * - aberto: boolean
 * - onClose: fn
 * - onSalvar?: fn(payload)  (se você passar, ele usa sua função; se não passar, ele salva direto no Supabase)
 * - onSalvou?: fn()         (callback opcional pós-save)
 * - categorias: [{value,label}]
 * - origens: [{value,label}]
 * - valorInicial: objeto do lançamento (para edição) ou null
 */
export default function ModalLancamentoFinanceiro({
  aberto,
  onClose,
  onSalvar,
  onSalvou,
  categorias = [],
  origens = [],
  valorInicial,
}) {
  const { fazendaAtualId } = useFazenda();
  const hojeISO = toISODateInput(new Date());

  const tipoOpts = useMemo(
    () => [
      { value: "ENTRADA", label: "Entrada" },
      { value: "SAIDA", label: "Saída" },
    ],
    []
  );

  const origensNorm = useMemo(() => {
    const arr = Array.isArray(origens) ? origens : [];
    const norm = arr.map(normalizeOrigemOption).filter(Boolean);

    // garante "Manual" sempre disponível (primeiro item)
    const temManual = norm.some((o) => String(o.value).toLowerCase() === "manual");
    if (!temManual) {
      norm.unshift({ value: "Manual", label: "Manual (lançamento avulso)" });
    } else {
      // ajusta label do manual se vier "Manual" sem complemento
      for (let i = 0; i < norm.length; i++) {
        if (String(norm[i].value).toLowerCase() === "manual") {
          norm[i] = { value: "Manual", label: "Manual (lançamento avulso)" };
          break;
        }
      }
    }

    return norm;
  }, [origens]);

  const [tipo, setTipo] = useState(valorInicial?.tipo || "SAIDA"); // ENTRADA | SAIDA
  const [data, setData] = useState(valorInicial?.data || hojeISO);

  const [categoria, setCategoria] = useState(
    valorInicial?.categoria
      ? { value: valorInicial.categoria, label: valorInicial.categoria }
      : null
  );

  const [origem, setOrigem] = useState(
    valorInicial?.origem
      ? normalizeOrigemOption({ value: valorInicial.origem, label: valorInicial.origem })
      : { value: "Manual", label: "Manual (lançamento avulso)" }
  );

  const [descricao, setDescricao] = useState(valorInicial?.descricao || "");

  // detalhes opcionais
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
  const [quantidade, setQuantidade] = useState(valorInicial?.quantidade ?? "");
  const [unidade, setUnidade] = useState(valorInicial?.unidade ?? "");
  const [valorUnit, setValorUnit] = useState(valorInicial?.valor_unitario ?? "");

  const [valorTotal, setValorTotal] = useState(valorInicial?.valor_total ?? "");
  const [observacao, setObservacao] = useState(valorInicial?.observacao ?? "");

  const [salvando, setSalvando] = useState(false);
  const [erroTela, setErroTela] = useState("");

  const categoriaLower = String(categoria?.value || "").toLowerCase();
  const ehTratamento = categoriaLower.includes("trat");

  /* === rehidrata ao abrir === */
  useEffect(() => {
    if (!aberto) return;

    setErroTela("");
    setSalvando(false);

    setTipo(valorInicial?.tipo || "SAIDA");
    setData(valorInicial?.data || hojeISO);

    setCategoria(
      valorInicial?.categoria
        ? { value: valorInicial.categoria, label: valorInicial.categoria }
        : null
    );

    setOrigem(
      valorInicial?.origem
        ? normalizeOrigemOption({ value: valorInicial.origem, label: valorInicial.origem })
        : { value: "Manual", label: "Manual (lançamento avulso)" }
    );

    setDescricao(valorInicial?.descricao || "");

    // reset de UX: detalhes fechados ao abrir
    setMostrarDetalhes(false);

    setQuantidade(valorInicial?.quantidade ?? "");
    setUnidade(valorInicial?.unidade ?? "");
    setValorUnit(valorInicial?.valor_unitario ?? "");

    setValorTotal(valorInicial?.valor_total ?? "");
    setObservacao(valorInicial?.observacao ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  /* === auto-cálculo (só quando fizer sentido) === */
  useEffect(() => {
    // não atrapalha quem quer só "valor total" (livro-caixa puro)
    const temQ = String(quantidade).trim() !== "";
    const temVU = String(valorUnit).trim() !== "";
    const temVT = String(valorTotal).trim() !== "";

    if (!temQ && !temVU) return;

    const q = asNumber(quantidade);
    const vu = asNumber(valorUnit);
    const vt = asNumber(valorTotal);

    // qtd + unitário => total
    if (temQ && temVU) {
      const calc = q * vu;
      if (Math.abs(calc - vt) > 0.009) setValorTotal(numBR(calc, 2));
      return;
    }

    // qtd + total e unitário vazio => unitário
    if (temQ && temVT && !temVU) {
      const calc = q > 0 ? vt / q : 0;
      setValorUnit(numBR(calc, 4));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantidade, valorUnit, valorTotal]);

  if (!aberto) return null;

  /* ===================== ESTILO DOS CAMPOS ===================== */
  const label = {
    fontSize: 12,
    fontWeight: 800,
    color: "#374151",
    marginBottom: 6,
  };

  const input = {
    width: "100%",
    height: 44,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
    background: "#fff",
    boxSizing: "border-box",
  };

  const textarea = {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    padding: 12,
    outline: "none",
    fontSize: 14,
    minHeight: 110,
    resize: "vertical",
    boxSizing: "border-box",
  };

  const grid2 = {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "1fr 1fr",
    alignItems: "start",
  };

  const grid3 = {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "1fr 1fr 1fr",
    alignItems: "start",
  };

  const col = { display: "grid", gap: 16 };

  function validar() {
    if (!clampDateISO(data)) return "Data inválida.";
    if (!categoria?.value) return "Selecione a categoria.";
    if (!descricao.trim()) return "Informe a descrição.";
    const vt = asNumber(valorTotal);
    if (!(vt > 0)) return "Informe um valor total maior que zero.";
    return "";
  }

  function montarPayload() {
    return {
      id: valorInicial?.id,
      fazenda_id: fazendaAtualId,
      data,
      tipo,
      categoria: categoria.value,
      origem: origem?.value || "Manual",
      descricao: descricao.trim(),
      quantidade: String(quantidade).trim() === "" ? null : asNumber(quantidade),
      unidade: String(unidade || "").trim() || null,
      valor_unitario: String(valorUnit).trim() === "" ? null : asNumber(valorUnit),
      valor_total: asNumber(valorTotal),
      observacao: observacao?.trim() || null,
    };
  }

  async function salvarNoSupabase(payload) {
    const { id, ...dados } = payload;
    if (!fazendaAtualId) {
      throw new Error("Selecione uma fazenda antes de salvar o lançamento.");
    }

    if (id) {
      const { error } = await withFazendaId(
        supabase.from("financeiro_lancamentos").update(dados),
        fazendaAtualId
      ).eq("id", id);

      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("financeiro_lancamentos").insert([dados]);
    if (error) throw error;
  }

  async function salvar() {
    const erro = validar();
    if (erro) {
      setErroTela(erro);
      return;
    }

    const payload = montarPayload();

    try {
      setErroTela("");
      setSalvando(true);

      if (typeof onSalvar === "function") {
        await onSalvar(payload);
      } else {
        await salvarNoSupabase(payload);
      }

      onSalvou?.();
      onClose?.();
    } catch (e) {
      console.error("Financeiro: erro ao salvar lançamento:", e);
      setErroTela("Não foi possível salvar. Verifique tabela/colunas e permissões no Supabase.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo={valorInicial?.id ? "Editar lançamento" : "Novo lançamento"}
      onClose={onClose}
      bloqueado={salvando}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ minHeight: 18, color: "#b91c1c", fontWeight: 800, fontSize: 12 }}>
            {erroTela || ""}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              className="botao-cancelar"
              onClick={onClose}
              disabled={salvando}
              style={{ opacity: salvando ? 0.6 : 1, cursor: salvando ? "not-allowed" : "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="botao-acao"
              onClick={salvar}
              disabled={salvando}
              style={{ opacity: salvando ? 0.75 : 1, cursor: salvando ? "not-allowed" : "pointer" }}
            >
              {salvando ? "Salvando..." : "Salvar lançamento"}
            </button>
          </div>
        </div>
      }
    >
      <div style={col}>
        {/* ===== LINHA 1 (3 colunas) ===== */}
        <div style={grid3}>
          <div>
            <div style={label}>Tipo</div>
            <Select
              styles={rsStyles}
              menuPortalTarget={document.body}
              value={tipoOpts.find((o) => o.value === tipo) || tipoOpts[1]}
              onChange={(opt) => setTipo(opt?.value || "SAIDA")}
              options={tipoOpts}
              isSearchable={false}
              isDisabled={salvando}
            />
          </div>

          <div>
            <div style={label}>Data</div>
            <input
              style={input}
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              disabled={salvando}
            />
          </div>

          <div>
            <div style={label}>Origem</div>
            <Select
              styles={rsStyles}
              menuPortalTarget={document.body}
              value={origem}
              onChange={(opt) => setOrigem(normalizeOrigemOption(opt))}
              options={origensNorm}
              isSearchable
              placeholder="Selecione..."
              isDisabled={salvando}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
              Manual = lançamento direto no livro-caixa. Custos detalhados de tratamentos/estoque devem ser registrados no módulo correspondente.
            </div>
          </div>
        </div>

        {/* ===== LINHA 2 ===== */}
        <div style={grid2}>
          <div>
            <div style={label}>Categoria</div>
            <Select
              styles={rsStyles}
              menuPortalTarget={document.body}
              value={categoria}
              onChange={setCategoria}
              options={categorias}
              isSearchable
              placeholder="Selecione..."
              isDisabled={salvando}
            />
          </div>

          <div>
            <div style={label}>Descrição</div>
            <input
              style={input}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Compra de feno, energia, inseminação..."
              disabled={salvando}
            />
          </div>
        </div>

        {/* ===== VALOR TOTAL (sempre visível) ===== */}
        <div style={grid2}>
          <div>
            <div style={label}>Valor total</div>
            <input
              style={input}
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="Ex.: 359,00"
              disabled={salvando}
            />
            {ehTratamento && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                Para <b>tratamentos</b>: informe aqui o <b>custo total</b>. Os detalhes (produtos/doses/carência) ficam em Leite/Saúde.
              </div>
            )}
          </div>

          <div style={{ display: "grid", alignContent: "end" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Detalhes (opcional)</div>
              <button
                type="button"
                className="botao-cancelar"
                onClick={() => setMostrarDetalhes((v) => !v)}
                disabled={salvando}
                style={{
                  padding: "6px 12px",
                  opacity: salvando ? 0.6 : 1,
                  cursor: salvando ? "not-allowed" : "pointer",
                }}
              >
                {mostrarDetalhes ? "Ocultar detalhes" : "Adicionar detalhes de quantidade"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
              Use detalhes quando fizer sentido (kg, L, sacos, horas, etc.). Para manutenção/serviço, normalmente só o valor total basta.
            </div>
          </div>
        </div>

        {/* ===== DETALHES (colapsável) ===== */}
        {mostrarDetalhes && (
          <>
            {/* LINHA 3 */}
            <div style={grid2}>
              <div>
                <div style={label}>Quantidade</div>
                <input
                  style={input}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex.: 10"
                  disabled={salvando}
                />
              </div>

              <div>
                <div style={label}>Unidade</div>
                <input
                  style={input}
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  placeholder="Ex.: sacos, L, kg, horas..."
                  disabled={salvando}
                />
              </div>
            </div>

            {/* LINHA 4 */}
            <div style={grid2}>
              <div>
                <div style={label}>Valor unitário (opcional)</div>
                <input
                  style={input}
                  value={valorUnit}
                  onChange={(e) => setValorUnit(e.target.value)}
                  placeholder="Ex.: 35,90"
                  disabled={salvando}
                />
              </div>

              <div style={{ display: "grid", alignContent: "end" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Dica: se informar quantidade + valor unitário, o total calcula sozinho.
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== LINHA 5 ===== */}
        <div>
          <div style={label}>Observação (opcional)</div>
          <textarea
            style={textarea}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: nota fiscal, fornecedor, detalhes..."
            disabled={salvando}
          />
        </div>
      </div>
    </Modal>
  );
}
