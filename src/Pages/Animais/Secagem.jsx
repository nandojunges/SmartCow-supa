// src/Pages/Animais/Secagem.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import Select from "react-select";

export const iconeSecagem = "/icones/secagem.png";
export const rotuloSecagem = "Secagem";

/* ===== utils simples, só pra layout ===== */

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

    // yyyy-mm-dd ou ISO
    const d2 = new Date(s);
    return Number.isFinite(d2.getTime()) ? d2 : null;
  }

  return null;
}

function formatBR(dt) {
  return dt ? dt.toLocaleDateString("pt-BR") : "—";
}

function addDays(dt, n) {
  const d = new Date(dt.getTime());
  d.setDate(d.getDate() + n);
  return d;
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

// previsão de parto simples (só visual)
function calcPrevisaoParto(animal) {
  if (!animal) return null;
  const pp =
    parseDate(animal.previsao_parto) ||
    parseDate(animal.previsaoParto);
  if (pp) return pp;

  const ia =
    parseDate(animal.ultima_ia) ||
    parseDate(animal.ultimaIa) ||
    parseDate(animal.ultimaIA);
  return ia ? addDays(ia, 283) : null;
}

/* ===== helper para modais (ESC + clique fora) ===== */
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

/* ===== estilos de tabela (mesmo padrão das outras telas) ===== */
const tableClasses =
  "w-full border-separate [border-spacing:0_4px] text-[14px] text-[#333] table-auto";
const thBase =
  "bg-[#e6f0ff] px-3 py-3 text-left font-bold text-[16px] text-[#1e3a8a] border-b-2 border-[#a8c3e6] sticky z-10 whitespace-nowrap";
const tdBase =
  "px-4 py-2 border-b border-[#eee] whitespace-nowrap transition-transform";
const tdClamp = tdBase + " overflow-hidden text-ellipsis";
const rowBase = "bg-white shadow-xs transition-colors";
const rowAlt = "even:bg-[#f7f7f8]";
const bgHL = "bg-[rgba(33,150,243,0.08)]";
const ringCell =
  "relative z-[1] ring-1 ring-[#1e3a8a]/30 shadow-sm scale-[1.01]";
const STICKY_OFFSET = 48;

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

/* ======================= MODAL SECAGEM (layout) ======================= */

function ModalSecagem({ animal, onClose }) {
  const boxRef = useRef(null);
  useModalClose(boxRef, onClose);

  const [dataSecagem, setDataSecagem] = useState(
    new Date().toLocaleDateString("pt-BR")
  );
  const [planoTrat, setPlanoTrat] = useState(null);
  const [diasCarenciaCarne, setDiasCarenciaCarne] = useState("");
  const [diasCarenciaLeite, setDiasCarenciaLeite] = useState("");
  const [principioAtivo, setPrincipioAtivo] = useState(null);
  const [nomeComercial, setNomeComercial] = useState("");
  const [responsavel, setResponsavel] = useState("");
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
    setDataSecagem(br);
  };

  const planoOptions = [
    "Secagem apenas antibiótico intramamário",
    "Secagem com antibiótico + selante",
    "Secagem seletiva",
    "Outro protocolo",
  ].map((v) => ({ value: v, label: v }));

  const principiosOptions = [
    "Cloxacilina",
    "Cefalexina",
    "Cefalonium",
    "Outros",
  ].map((v) => ({ value: v, label: v }));

  const salvar = () => {
    const dt = parseDate(dataSecagem);
    if (!dt) {
      setErro("Informe uma data de secagem válida (dd/mm/aaaa).");
      return;
    }
    setErro("");
    // Aqui é só layout: poderíamos dar um console.log se quisesse ver o objeto,
    // mas para o momento basta fechar o modal.
    // console.log("Secagem simulada:", { ... });
    onClose?.();
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
    width: 700,
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "Poppins, sans-serif",
  };
  const header = {
    background: "#0f172a",
    color: "#fff",
    padding: "12px 16px",
    fontWeight: 700,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };
  const body = {
    padding: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: "1.5rem",
    rowGap: "0.75rem",
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
          <span>
            🧴 Secagem — Nº {animal?.numero} • Brinco{" "}
            {animal?.brinco}
          </span>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded hover:bg-white/10"
          >
            ESC
          </button>
        </div>

        <div style={body}>
          <div style={{ gridColumn: "1 / -1", marginBottom: 4 }}>
            <div className="text-xs text-gray-600">
              Preencha os dados da secagem (somente layout, sem
              integração).
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Número do animal
            </label>
            <input
              style={input}
              value={animal?.numero ?? ""}
              disabled
            />
          </div>
          <div>
            <label className="text-sm font-medium">Brinco</label>
            <input
              style={input}
              value={animal?.brinco ?? ""}
              disabled
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Data da secagem *
            </label>
            <div className="relative">
              <input
                value={dataSecagem}
                onChange={(e) =>
                  setDataSecagem(fmtData(e.target.value))
                }
                placeholder="dd/mm/aaaa"
                style={{ ...input, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={openPicker}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-gray-100"
                title="Abrir calendário"
                aria-label="Abrir calendário"
              >
                <svg
                  width="18"
                  height="18"
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
                value={toISO(dataSecagem)}
                onChange={onHiddenDateChange}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Plano de tratamento
            </label>
            <Select
              options={planoOptions}
              value={planoTrat}
              onChange={setPlanoTrat}
              styles={selectStyle}
              placeholder="Selecione ou cadastre depois..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Dias de carência (carne)
            </label>
            <input
              style={input}
              type="number"
              value={diasCarenciaCarne}
              onChange={(e) =>
                setDiasCarenciaCarne(e.target.value)
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Dias de carência (leite)
            </label>
            <input
              style={input}
              type="number"
              value={diasCarenciaLeite}
              onChange={(e) =>
                setDiasCarenciaLeite(e.target.value)
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Princípio ativo
            </label>
            <Select
              options={principiosOptions}
              value={principioAtivo}
              onChange={setPrincipioAtivo}
              styles={selectStyle}
              isSearchable
              isClearable
              placeholder="Selecione ou digite..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Nome comercial
            </label>
            <input
              style={input}
              value={nomeComercial}
              onChange={(e) =>
                setNomeComercial(e.target.value)
              }
              placeholder="Ex.: Lactomast, Tomorrow..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Responsável
            </label>
            <input
              style={input}
              value={responsavel}
              onChange={(e) =>
                setResponsavel(e.target.value)
              }
              placeholder="Nome de quem aplicou o protocolo"
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label className="text-sm font-medium">
              Observações
            </label>
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
              placeholder="Reações, conduta extra, recomendações..."
            />
          </div>

          {erro && (
            <div
              style={{
                gridColumn: "1 / -1",
                color: "#b91c1c",
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              ⚠️ {erro}
            </div>
          )}
        </div>

        <div style={footer}>
          <button
            className="px-4 py-2 rounded-md border"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-md text-white"
            style={{ background: "#16a34a" }}
            onClick={salvar}
          >
            ✅ Aplicar secagem (layout)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================= LISTA SECAGEM (layout) ======================= */

export default function Secagem({
  animais = [],
  onCountChange,
}) {
  const [hoverCol, setHoverCol] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [hoverCell, setHoverCell] = useState({
    r: null,
    c: null,
  });

  const [selecionado, setSelecionado] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [erro] = useState("");
  const [loading] = useState(false);

  // ordenar só para ficar bonitinho (por previsão de parto)
  const listaOrdenada = useMemo(() => {
    const base = Array.isArray(animais) ? animais : [];
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
      "Previsão de parto (simulada)",
      "Data ideal de secagem (simulada)",
      "Ação",
    ],
    []
  );

  return (
    <section className="w-full py-6 font-sans">
      <div className="px-2 md:px-4 lg:px-6">
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[#1e3a8a]">
            Controle de Secagem (layout)
          </h2>
          <span className="text-xs text-gray-500">
            Somente visual — sem salvar nada ainda.
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
            <col style={{ width: 90 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 200 }} />
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
              const dataSecagem = pp
                ? formatBR(addDays(pp, -60)) // simulação 60 dias antes
                : "—";

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
                  className={`${rowBase} ${rowAlt} hover:bg-[#eaf5ff]`}
                  onMouseEnter={() => setHoverRow(rIdx)}
                  onMouseLeave={() => setHoverRow(null)}
                >
                  {TD(numero, 0)}
                  {TD(brinco, 1)}
                  {TD(categoria, 2)}
                  {TD(idade, 3)}
                  {TD(raca, 4)}
                  {TD(prevParto, 5)}
                  {TD(dataSecagem, 6)}
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
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md border border-[#16a34a]/40 hover:border-[#16a34a] text-[#166534] text-sm"
                      onClick={() => {
                        setSelecionado(v);
                        setShowModal(true);
                      }}
                      title="Registrar secagem"
                    >
                      Registrar secagem
                    </button>
                  </td>
                </tr>
              );
            })}

            {!loading && listaOrdenada.length === 0 && (
              <tr>
                <td className={tdBase} colSpan={colunas.length}>
                  <div className="text-center text-gray-600 py-6">
                    Nenhuma vaca listada para secagem (somente
                    layout).
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {showModal && selecionado && (
          <ModalSecagem
            animal={selecionado}
            onClose={() => {
              setShowModal(false);
              setSelecionado(null);
            }}
          />
        )}
      </div>
    </section>
  );
}
