// src/pages/Animais/PrePartoParto.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import Select from "react-select";

export const iconePreParto = "/icones/preparto.png";
export const rotuloPreParto = "Pré-parto/Parto";

const STICKY_OFFSET = 48;

/* ===== utils visuais simples ===== */

// Parser simples que aceita Date, timestamp, dd/mm/aaaa e ISO
function parseDate(any) {
  if (!any) return null;
  if (any instanceof Date && Number.isFinite(any.getTime())) return any;

  if (typeof any === "number") {
    const ms = any > 1e12 ? any : any * 1000;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  if (typeof any === "string") {
    const s = any.trim();

    // dd/mm/aaaa
    const mBR = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (mBR) {
      const dd = Number(mBR[1]);
      const mm = Number(mBR[2]);
      const yyyy = Number(mBR[3]);
      const d = new Date(yyyy, mm - 1, dd);
      return Number.isFinite(d.getTime()) ? d : null;
    }

    // yyyy-mm-dd ou ISO completo
    const d2 = new Date(s);
    return Number.isFinite(d2.getTime()) ? d2 : null;
  }

  return null;
}

function formatBR(dt) {
  return dt ? dt.toLocaleDateString("pt-BR") : "—";
}

function idadeTexto(nascimento) {
  const dt = parseDate(nascimento);
  if (!dt) return "—";
  const meses = Math.max(
    0,
    Math.floor(
      (Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
  );
  return `${Math.floor(meses / 12)}a ${meses % 12}m`;
}

// só para ter alguma previsão visual se vier última IA
function addDays(dt, n) {
  const d = new Date(dt.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

function calcPrevisaoParto(rec) {
  if (!rec) return null;

  // se já vier previsão em alguma chave
  const pp =
    parseDate(rec.previsao_parto) ||
    parseDate(rec.previsaoParto) ||
    parseDate(rec.previsao_parto_dt);
  if (pp) return pp;

  // fallback: ultima IA (super simples, só para visual)
  const ia =
    parseDate(rec.ultima_ia) ||
    parseDate(rec.ultimaIa) ||
    parseDate(rec.ultimaIA);
  return ia ? addDays(ia, 283) : null;
}

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
const fmtData = (val) => {
  const d = onlyDigits(val).slice(0, 8);
  const p1 = d.slice(0, 2),
    p2 = d.slice(2, 4),
    p3 = d.slice(4, 8);
  return [p1, p2, p3].filter(Boolean).join("/");
};

function toISO(val) {
  const dt = parseDate(val);
  if (!dt) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ===== helper para fechar modais (ESC + clique fora) ===== */
function useModalClose(refBox, onClose) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    const onClick = (e) => {
      if (refBox.current && !refBox.current.contains(e.target)) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [refBox, onClose]);
}

/* ===== estilos de tabela ===== */
const tableClasses =
  "w-full border-separate [border-spacing:0_4px] text-[14px] text-[#333] table-auto";
const thBase =
  "bg-[#e6f0ff] px-3 py-3 text-left font-bold text-[16px] text-[#1e3a8a] border-b-2 border-[#a8c3e6] sticky z-10 whitespace-nowrap cursor-pointer";
const tdBase =
  "px-4 py-2 border-b border-[#eee] whitespace-nowrap transition-transform";
const tdClamp = tdBase + " overflow-hidden text-ellipsis";
const rowBase = "bg-white shadow-xs transition-colors";
const rowAlt = "even:bg-[#f7f7f8]";
const bgHL = "bg-[rgba(33,150,243,0.08)]";
const ringCell =
  "relative z-[1] ring-1 ring-[#1e3a8a]/30 shadow-sm scale-[1.01]";

/* ===== react-select style ===== */
const selectStyle = {
  control: (base) => ({
    ...base,
    height: 44,
    minHeight: 44,
    borderRadius: 8,
    borderColor: "#ccc",
    boxShadow: "none",
    fontSize: "0.95rem",
  }),
  menu: (b) => ({ ...b, zIndex: 9999 }),
};

/* ========================= MODAL PARTO (MÃE) ========================= */
function ModalParto({ animal, onCancelar, onContinuar }) {
  const boxRef = useRef(null);
  useModalClose(boxRef, onCancelar);

  const [data, setData] = useState("");
  const [facilidade, setFacilidade] = useState(null);
  const [retencao, setRetencao] = useState(null);
  const [drench, setDrench] = useState(null);
  const [anti, setAnti] = useState(null);
  const [principio, setPrincipio] = useState(null);
  const [dose, setDose] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [brix, setBrix] = useState("");
  const [brixNaoMedido, setBrixNaoMedido] = useState(false);
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");

  const optSimNao = useMemo(
    () => ["Sim", "Não"].map((v) => ({ value: v, label: v })),
    []
  );
  const optFac = useMemo(
    () =>
      [
        "Sem auxílio",
        "Auxílio leve",
        "Auxílio moderado",
        "Auxílio intenso",
        "Cesárea",
        "Distocia grave",
      ].map((v) => ({ value: v, label: v })),
    []
  );

  const continuar = () => {
    if (!data || !facilidade?.value) {
      setErro("Preencha Data e Facilidade.");
      return;
    }
    setErro("");
    // Apenas encaminha os dados para o próximo modal (layout)
    onContinuar?.({
      data,
      facilidade: facilidade?.value,
      retencaoPlacenta: retencao?.value || "",
      drench: drench?.value || "",
      antiInflamatorio: anti?.value || "",
      principioAtivo:
        anti?.value === "Sim"
          ? principio?.value || principio?.label || ""
          : "",
      dose: anti?.value === "Sim" ? dose : "",
      temperatura,
      brix: brixNaoMedido ? "Não medido" : brix,
      observacoes: obs,
    });
  };

  const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };
  const modal = {
    background: "#fff",
    borderRadius: "1rem",
    width: 900,
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "Poppins, sans-serif",
  };
  const header = {
    background: "#1e40af",
    color: "#fff",
    padding: "12px 16px",
    fontWeight: 700,
  };
  const body = {
    padding: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: "2rem",
    rowGap: "12px",
    overflowY: "auto",
    flex: 1,
  };
  const footer = {
    padding: "12px 16px",
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    borderTop: "1px solid #e5e7eb",
  };
  const input = {
    width: "100%",
    height: 44,
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: "0 12px",
    boxSizing: "border-box",
  };

  return (
    <div style={overlay}>
      <div ref={boxRef} style={modal}>
        <div style={header}>
          🐄 Parto — Nº {animal?.numero} • Brinco {animal?.brinco}
        </div>
        <div style={body}>
          <div>
            <label>Data *</label>
            <input
              value={data}
              onChange={(e) => setData(fmtData(e.target.value))}
              placeholder="dd/mm/aaaa"
              style={input}
            />
          </div>
          <div>
            <label>Facilidade *</label>
            <Select
              options={optFac}
              value={facilidade}
              onChange={setFacilidade}
              styles={selectStyle}
              placeholder="Selecione…"
            />
          </div>
          <div>
            <label>Retenção de placenta</label>
            <Select
              options={optSimNao}
              value={retencao}
              onChange={setRetencao}
              styles={selectStyle}
              placeholder="Selecione…"
            />
          </div>
          <div>
            <label>Fornecido drench?</label>
            <Select
              options={optSimNao}
              value={drench}
              onChange={setDrench}
              styles={selectStyle}
              placeholder="Selecione…"
            />
          </div>
          <div>
            <label>Anti-inflamatório?</label>
            <Select
              options={optSimNao}
              value={anti}
              onChange={setAnti}
              styles={selectStyle}
              placeholder="Selecione…"
            />
          </div>
          <div>
            <label>Temperatura (°C)</label>
            <input
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value)}
              style={input}
            />
          </div>
          {anti?.value === "Sim" && (
            <>
              <div>
                <label>Princípio ativo</label>
                <Select
                  options={[]}
                  value={principio}
                  onChange={setPrincipio}
                  styles={selectStyle}
                  isSearchable
                  isClearable
                  placeholder="Digite/Selecione…"
                />
              </div>
              <div>
                <label>Dose (mL)</label>
                <input
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  style={input}
                />
              </div>
            </>
          )}
          <div>
            <label>BRIX do colostro (%)</label>
            <input
              value={brixNaoMedido ? "" : brix}
              disabled={!!brixNaoMedido}
              onChange={(e) => setBrix(e.target.value)}
              style={input}
            />
          </div>
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
            }}
          >
            <input
              type="checkbox"
              checked={brixNaoMedido}
              onChange={() => setBrixNaoMedido((v) => !v)}
            />
            <span>Não medido</span>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Observações</label>
            <textarea
              rows={3}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 8,
                resize: "none",
              }}
            />
          </div>
          {erro && (
            <div
              style={{
                gridColumn: "1 / -1",
                color: "#b91c1c",
                fontWeight: 600,
              }}
            >
              ⚠️ {erro}
            </div>
          )}
        </div>
        <div style={footer}>
          <button
            className="px-4 py-2 rounded-md border"
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-md text-white"
            style={{ background: "#2563eb" }}
            onClick={continuar}
          >
            Continuar para bezerro(s)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================= MODAL INICIAR PRÉ-PARTO ========================= */
function ModalIniciarPreParto({
  animal,
  diasDefault = 30,
  onCancelar,
  onSalvo,
}) {
  const boxRef = useRef(null);
  useModalClose(boxRef, onCancelar);

  const hojeBR = new Date().toLocaleDateString("pt-BR");
  const [data, setData] = useState(hojeBR);
  const [dias, setDias] = useState(diasDefault);
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");

  const hiddenDateRef = useRef(null);
  const openPicker = () => {
    const el = hiddenDateRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  };
  const onHiddenDateChange = (e) => {
    const iso = e.target.value; // yyyy-mm-dd
    if (!iso) return;
    const [y, m, d] = iso.split("-").map(Number);
    const br = `${String(d).padStart(2, "0")}/${String(m).padStart(
      2,
      "0"
    )}/${y}`;
    setData(br);
  };

  const salvar = () => {
    const dt = parseDate(data);
    if (!dt) {
      setErro("Informe uma data válida (dd/mm/aaaa).");
      return;
    }
    setErro("");
    // Apenas fecha o modal e chama callback visual
    onSalvo?.({
      data,
      dias: Number(dias) || diasDefault,
      obs,
    });
  };

  const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };
  const modal = {
    background: "#fff",
    borderRadius: "1rem",
    width: 560,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "Poppins, sans-serif",
  };
  const header = {
    background: "#1e40af",
    color: "#fff",
    padding: "12px 16px",
    fontWeight: 700,
  };
  const body = {
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
  const footer = {
    padding: 16,
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    borderTop: "1px solid #e5e7eb",
  };

  return (
    <div style={overlay}>
      <div ref={boxRef} style={modal}>
        <div style={header}>
          🍼 Iniciar pré-parto — Nº {animal?.numero} • Brinco{" "}
          {animal?.brinco}
        </div>
        <div style={body}>
          <div>
            <label className="font-medium">Data de início *</label>
            <div className="relative">
              <input
                value={data}
                onChange={(e) => setData(fmtData(e.target.value))}
                placeholder="dd/mm/aaaa"
                className="w-full h-11 border rounded px-3 pr-11"
                aria-label="Data de início do pré-parto (dd/mm/aaaa)"
              />
              <button
                type="button"
                onClick={openPicker}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-gray-100"
                title="Abrir calendário"
                aria-label="Abrir calendário"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="2"
                    stroke="#1e3a8a"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M8 2v4M16 2v4M3 9h18"
                    stroke="#1e3a8a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <input
                ref={hiddenDateRef}
                type="date"
                className="sr-only"
                value={toISO(data)}
                onChange={onHiddenDateChange}
              />
            </div>
          </div>
          <div>
            <label className="font-medium">Dias (parâmetro)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              className="w-full h-11 border rounded px-3"
            />
          </div>
          <div>
            <label className="font-medium">Observações</label>
            <textarea
              rows={3}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          {erro && (
            <div className="text-red-600 font-semibold">{erro}</div>
          )}
        </div>
        <div style={footer}>
          <button
            className="px-4 py-2 rounded-md border"
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-md text-white"
            style={{ background: "#2563eb" }}
            onClick={salvar}
          >
            Iniciar pré-parto
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== texto sobre colostro (apenas visual) ===== */
const complementoColostro =
  "💡 A colostragem é o primeiro e mais importante manejo sanitário do bezerro. O fornecimento imediato e em volume adequado é essencial para garantir imunidade, saúde intestinal e bom desenvolvimento.";

/* ===================== MODAL BEZERROS ===================== */
function ModalBezerros({ vaca, dadosMae, onCancelar, onFinalizado }) {
  const boxRef = useRef(null);
  useModalClose(boxRef, onCancelar);

  const [tipoNascimento, setTipoNascimento] = useState("Femea");
  const [pelagens, setPelagens] = useState([]);
  const [novaPelagem, setNovaPelagem] = useState("");
  const [mostrarCampoPelagem, setMostrarCampoPelagem] = useState(false);

  const gerarBezerros = useCallback((tipo) => {
    const base = {
      sexo:
        tipo === "Macho" || tipo === "Femea" ? tipo : "Femea",
      peso: "",
      pelagem: "",
      colostro: "Sim",
      origemColostro: "Mãe",
      brix: "",
      horaParto: "",
      horaColostro: "",
      ocorrencia: "",
      observacoes: "",
      brinco: "",
      numero: "",
    };
    if (tipo === "Gemeos") return [{ ...base }, { ...base }];
    return [{ ...base }];
  }, []);

  const [bezerros, setBezerros] = useState(
    gerarBezerros("Femea")
  );
  useEffect(() => {
    setBezerros(gerarBezerros(tipoNascimento));
  }, [tipoNascimento, gerarBezerros]);

  const selectPadrao = (options, value, onChange) => (
    <Select
      options={options.map((v) => ({ value: v, label: v }))}
      value={value ? { value, label: value } : null}
      onChange={(opt) => onChange(opt?.value || "")}
      styles={{
        control: (base) => ({
          ...base,
          height: 44,
          borderRadius: 10,
        }),
      }}
      placeholder="Selecione..."
    />
  );

  const salvarPelagemLocal = () => {
    if (!novaPelagem.trim()) return;
    setPelagens((p) => [...p, novaPelagem.trim()]);
    setNovaPelagem("");
    setMostrarCampoPelagem(false);
  };

  const atualizar = (i, campo, valor) => {
    setBezerros((arr) => {
      const copia = [...arr];
      copia[i] = { ...copia[i], [campo]: valor };
      return copia;
    });
  };

  const salvar = () => {
    // Aqui apenas finalizamos visualmente, sem salvar nada
    onFinalizado?.({ bezerros, dadosMae, vaca });
  };

  const overlay = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  };
  const modal = {
    background: "#fff",
    borderRadius: "1rem",
    width: "880px",
    maxHeight: "95vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    fontFamily: "Poppins, sans-serif",
  };
  const topo = {
    background: "#1e40af",
    color: "white",
    padding: "1rem 1.5rem",
    fontWeight: "bold",
    fontSize: "1.1rem",
    borderTopLeftRadius: "1rem",
    borderTopRightRadius: "1rem",
  };
  const corpo = { padding: "1.5rem" };
  const input = {
    width: "100%",
    height: "44px",
    padding: "0.75rem",
    fontSize: "0.95rem",
    borderRadius: "0.6rem",
    border: "1px solid #ccc",
    margin: "0.5rem 0",
    boxSizing: "border-box",
  };
  const grid = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: "1.5rem",
    rowGap: "1.2rem",
    marginTop: "1rem",
    alignItems: "center",
  };

  return (
    <div style={overlay}>
      <div ref={boxRef} style={modal}>
        <div style={topo}>
          🐮 Cadastrar Bezerro(s) da Vaca {vaca?.numero}
        </div>
        <div style={corpo}>
          <label>Tipo de Nascimento</label>
          {selectPadrao(
            ["Macho", "Femea", "Gemeos"],
            tipoNascimento,
            setTipoNascimento
          )}

          {bezerros.map((b, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                borderRadius: "0.5rem",
                marginTop: "1rem",
              }}
            >
              <strong>
                Bezerro {i + 1}
                {b.numero ? ` – Nº ${b.numero}` : ""}
              </strong>
              <div style={grid}>
                <div>
                  <label>Sexo</label>
                  {selectPadrao(
                    ["Macho", "Femea"],
                    b.sexo,
                    (v) => atualizar(i, "sexo", v)
                  )}
                </div>
                <div>
                  <label>Peso ao nascer (kg)</label>
                  <input
                    type="number"
                    value={b.peso}
                    onChange={(e) =>
                      atualizar(i, "peso", e.target.value)
                    }
                    style={input}
                  />
                </div>

                <div>
                  <label>Pelagem</label>
                  {selectPadrao(
                    pelagens,
                    b.pelagem,
                    (v) => atualizar(i, "pelagem", v)
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMostrarCampoPelagem(true)}
                    className="px-3 py-2 rounded-md border"
                    title="Adicionar pelagem"
                  >
                    ＋
                  </button>
                </div>

                <div>
                  <label>Recebeu colostro?</label>
                  {selectPadrao(
                    ["Sim", "Não"],
                    b.colostro,
                    (v) => atualizar(i, "colostro", v)
                  )}
                </div>

                <div>
                  <label>Brinco</label>
                  <input
                    value={b.brinco}
                    onChange={(e) =>
                      atualizar(i, "brinco", e.target.value)
                    }
                    style={input}
                  />
                </div>
                <div>
                  <label>Número</label>
                  <input
                    value={b.numero}
                    onChange={(e) =>
                      atualizar(i, "numero", e.target.value)
                    }
                    style={input}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Ocorrência ao nascer</label>
                  {selectPadrao(
                    [
                      "Sem ocorrência",
                      "Fraco ao nascer",
                      "Não respirava",
                      "Lesão visível",
                      "Problema locomotor",
                      "Outros",
                    ],
                    b.ocorrencia,
                    (v) => atualizar(i, "ocorrencia", v)
                  )}
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Observações</label>
                  <textarea
                    rows={3}
                    value={b.observacoes}
                    onChange={(e) =>
                      atualizar(i, "observacoes", e.target.value)
                    }
                    style={{
                      ...input,
                      resize: "none",
                      height: "80px",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {mostrarCampoPelagem && (
            <div
              style={{
                marginTop: "0.75rem",
                display: "flex",
                gap: "0.5rem",
              }}
            >
              <input
                value={novaPelagem}
                onChange={(e) => setNovaPelagem(e.target.value)}
                placeholder="Nova pelagem"
                style={{
                  flex: 1,
                  height: "44px",
                  padding: "0.75rem",
                  fontSize: "0.95rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #ccc",
                }}
              />
              <button
                type="button"
                className="px-3 py-2 rounded-md border"
                onClick={salvarPelagemLocal}
              >
                Salvar
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md border"
                onClick={() => {
                  setMostrarCampoPelagem(false);
                  setNovaPelagem("");
                }}
              >
                Cancelar
              </button>
            </div>
          )}

          <div
            style={{
              marginTop: "1rem",
              fontSize: "0.9rem",
              color: "#374151",
            }}
          >
            {complementoColostro}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "1rem",
            gap: "0.5rem",
          }}
        >
          <button
            className="px-4 py-2 rounded-md border"
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-md text-white"
            style={{ background: "#2563eb" }}
            onClick={salvar}
          >
            💾 Salvar Bezerro(s)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== LISTA: PRÉ-PARTO / PARTO (layout) ===================== */
export default function PrePartoParto({
  animais = [],
  onCountChange,
}) {
  const [preDaysRaw, setPreDaysRaw] = useState("30");
  const [preDays, setPreDays] = useState(30);

  // efeitos de hover refinados (só visual)
  const [hoverCol, setHoverCol] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [hoverCell, setHoverCell] = useState({
    r: null,
    c: null,
  });

  const [sel, setSel] = useState(null);
  const [dadosMae, setDadosMae] = useState(null);
  const [showParto, setShowParto] = useState(false);
  const [showBezerros, setShowBezerros] = useState(false);
  const [showIniciarPreParto, setShowIniciarPreParto] =
    useState(false);

  const [loading] = useState(false);
  const [erro] = useState("");

  const commitPreDays = useCallback(() => {
    const n = Math.max(
      1,
      Math.min(365, parseInt(preDaysRaw, 10) || 1)
    );
    setPreDaysRaw(String(n));
    setPreDays(n);
  }, [preDaysRaw]);

  // aqui usamos apenas os animais que chegam por props
  const listaOrdenada = useMemo(() => {
    const base = Array.isArray(animais) ? animais : [];
    // só para garantir consistência visual, ordenamos por previsão de parto
    return [...base].sort((a, b) => {
      const pa = calcPrevisaoParto(a);
      const pb = calcPrevisaoParto(b);
      if (!pa && !pb) return 0;
      if (!pa) return 1;
      if (!pb) return -1;
      return pa - pb;
    });
  }, [animais]);

  useEffect(() => {
    onCountChange?.(listaOrdenada.length);
  }, [listaOrdenada.length, onCountChange]);

  const colunas = useMemo(
    () => [
      "Número",
      "Brinco",
      "Categoria",
      "Idade",
      "Raça",
      "Previsão de parto",
      "Dias para o parto (simulado)",
      "Ação",
    ],
    []
  );

  return (
    <section className="w-full py-6 font-sans">
      <div className="px-2 md:px-4 lg:px-6">
        <div className="mb-2 flex items-center gap-3">
          <label className="font-semibold text-[#1e3a8a]">
            Entram em pré-parto a partir de
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={preDaysRaw}
            onChange={(e) => setPreDaysRaw(e.target.value)}
            onBlur={commitPreDays}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitPreDays();
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setPreDaysRaw(String(preDays ?? 30));
                e.currentTarget.blur();
              }
            }}
            className="w-24 px-3 py-2 rounded-md border border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          />
          <span className="text-sm text-gray-600">
            dias antes do parto
          </span>
          <div className="ml-auto text-sm">
            {loading ? (
              <span className="text-[#1e3a8a]">
                Carregando…
              </span>
            ) : (
              <span className="text-gray-600">
                Total: <strong>{listaOrdenada.length}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="mb-4 text-xs text-gray-600">
          <span className="inline-flex items-center mr-3">
            <span className="w-3 h-3 rounded-sm bg-red-500 inline-block mr-1.5"></span>{" "}
            Atrasada (somente visual)
          </span>
          <span className="inline-flex items-center mr-3">
            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block mr-1.5"></span>{" "}
            No prazo (somente visual)
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 rounded-sm bg-gray-400 inline-block mr-1.5"></span>{" "}
            Antecipada (somente visual)
          </span>
        </div>

        {erro && (
          <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-300 px-3 py-2 rounded">
            {erro}
          </div>
        )}

        <table className={tableClasses}>
          <colgroup>
            <col style={{ width: 70 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 95 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 220 }} />
          </colgroup>
          <thead>
            <tr>
              {colunas.map((c, i) => (
                <th
                  key={c}
                  onMouseEnter={() => setHoverCol(i)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={`${thBase} ${
                    hoverCol === i ? bgHL : ""
                  }`}
                  style={{ top: STICKY_OFFSET }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listaOrdenada.map((v, rIdx) => {
              const numero = v.numero ?? "—";
              const brinco = v.brinco ?? "—";
              const categoria = v.categoria ?? "—";
              const idade = idadeTexto(v.nascimento);
              const raca = v.raca ?? "—";
              const pp = calcPrevisaoParto(v);
              const prevParto = formatBR(pp);
              const diasPara = pp
                ? Math.round(
                    (pp.getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  )
                : "—";

              // só para dar cor diferente (visual, sem lógica pesada)
              const bucketClass =
                typeof diasPara === "number" && diasPara < 0
                  ? "bg-red-50 border-l-4 border-red-500 text-red-700"
                  : "hover:bg-[#eaf5ff]";

              const TD = (content, cIdx, clamp = true) => {
                const isRowHL = hoverRow === rIdx;
                const isColHL = hoverCol === cIdx;
                const isCellHL =
                  hoverCell.r === rIdx &&
                  hoverCell.c === cIdx;
                const klass = `${clamp ? tdClamp : tdBase} ${
                  isRowHL || isColHL ? bgHL : ""
                } ${isCellHL ? ringCell : ""}`;
                return (
                  <td
                    className={klass}
                    onMouseEnter={() => {
                      setHoverRow(rIdx);
                      setHoverCol(cIdx);
                      setHoverCell({ r: rIdx, c: cIdx });
                    }}
                    onMouseLeave={() => {
                      setHoverRow(null);
                      setHoverCell({ r: null, c: null });
                    }}
                  >
                    {content}
                  </td>
                );
              };

              return (
                <tr
                  key={v.id ?? rIdx}
                  className={`${rowBase} ${rowAlt} ${bucketClass}`}
                  onMouseEnter={() => setHoverRow(rIdx)}
                  onMouseLeave={() => setHoverRow(null)}
                >
                  {TD(numero, 0)}
                  {TD(brinco, 1)}
                  {TD(categoria, 2)}
                  {TD(idade, 3)}
                  {TD(raca, 4)}
                  {TD(prevParto, 5)}
                  {TD(
                    typeof diasPara === "number"
                      ? `${diasPara} dia(s)`
                      : "—",
                    6
                  )}
                  <td
                    className={`${tdBase} ${
                      hoverCol === 7 || hoverRow === rIdx
                        ? bgHL
                        : ""
                    } ${
                      hoverCell.r === rIdx &&
                      hoverCell.c === 7
                        ? ringCell
                        : ""
                    }`}
                    onMouseEnter={() => {
                      setHoverRow(rIdx);
                      setHoverCol(7);
                      setHoverCell({ r: rIdx, c: 7 });
                    }}
                    onMouseLeave={() => {
                      setHoverRow(null);
                      setHoverCell({ r: null, c: null });
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-md border border-[#1e3a8a]/20 hover:border-[#1e3a8a] text-[#1e3a8a]"
                        onClick={() => {
                          setSel(v);
                          setShowIniciarPreParto(true);
                        }}
                        title="Iniciar pré-parto"
                      >
                        Iniciar pré-parto
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-md border border-[#1e3a8a]/20 hover:border-[#1e3a8a] text-[#1e3a8a]"
                        onClick={() => {
                          setSel(v);
                          setDadosMae(null);
                          setShowParto(true);
                        }}
                        title="Registrar parto"
                      >
                        Parto
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && listaOrdenada.length === 0 && (
              <tr>
                <td className={tdBase} colSpan={colunas.length}>
                  <div className="text-center text-gray-600 py-6">
                    Nenhum animal listado para pré-parto/parto
                    (somente layout).
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Modais – apenas layout, sem integrações */}
        {showIniciarPreParto && sel && (
          <ModalIniciarPreParto
            animal={sel}
            diasDefault={preDays ?? 30}
            onCancelar={() => {
              setShowIniciarPreParto(false);
              setSel(null);
            }}
            onSalvo={() => {
              setShowIniciarPreParto(false);
              setSel(null);
            }}
          />
        )}

        {showParto && sel && (
          <ModalParto
            animal={sel}
            onCancelar={() => {
              setShowParto(false);
              setSel(null);
            }}
            onContinuar={(dados) => {
              setDadosMae(dados);
              setShowParto(false);
              setShowBezerros(true);
            }}
          />
        )}

        {showBezerros && sel && dadosMae && (
          <ModalBezerros
            vaca={sel}
            dadosMae={dadosMae}
            onCancelar={() => {
              setShowBezerros(false);
              setSel(null);
              setDadosMae(null);
            }}
            onFinalizado={() => {
              setShowBezerros(false);
              setSel(null);
              setDadosMae(null);
            }}
          />
        )}
      </div>
    </section>
  );
}
