// src/Pages/Animais/CadastroAnimal.jsx
import React, { useEffect, useState } from "react";
import Select from "react-select";
import FichaComplementarAnimal from "./FichaComplementarAnimal";

/* ============================
   Helpers
============================ */
function formatarDataDigitada(valor) {
  const s = String(valor || "").replace(/\D/g, "").slice(0, 8);
  const dia = s.slice(0, 2);
  const mes = s.slice(2, 4);
  const ano = s.slice(4, 8);
  let out = [dia, mes, ano].filter(Boolean).join("/");

  if (out.length === 10) {
    const [d, m, a] = out.split("/").map(Number);
    const dt = new Date(a, (m || 1) - 1, d || 1);
    if (
      dt.getDate() !== d ||
      dt.getMonth() !== (m - 1) ||
      dt.getFullYear() !== a
    ) {
      out = "";
    }
  }
  return out;
}

function calcularIdadeECategoria(nascimento, sexo) {
  if (!nascimento || nascimento.length !== 10)
    return { idade: "", categoria: "", meses: 0 };

  const [dia, mes, ano] = nascimento.split("/").map(Number);
  const nascDate = new Date(ano, mes - 1, dia);
  if (Number.isNaN(+nascDate)) return { idade: "", categoria: "", meses: 0 };

  const diffMs = Date.now() - nascDate.getTime();
  const meses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const idade = `${Math.floor(meses / 12)}a ${meses % 12}m`;

  let categoria = "";
  if (meses < 2) categoria = "Bezerro(a)";
  else if (meses < 12) categoria = "Novilho(a)";
  else if (meses < 24)
    categoria = sexo === "macho" ? "Touro jovem" : "Novilha";
  else categoria = sexo === "macho" ? "Touro" : "Vaca adulta";

  return { idade, categoria, meses };
}

function maskMoedaBR(v) {
  let n = String(v || "").replace(/\D/g, "");
  if (!n) return "";
  n = (parseInt(n, 10) / 100).toFixed(2);
  const [int, dec] = n.split(".");
  const intComPontos = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intComPontos},${dec}`;
}

function parseDataBR(str) {
  if (!str) return null;
  const s = String(str).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  const dt = new Date(y, mo - 1, d);
  return Number.isNaN(+dt) ? null : dt;
}

function getUltimaData(lista) {
  const datas = (lista || [])
    .map(parseDataBR)
    .filter((d) => d instanceof Date);
  if (!datas.length) return "";
  datas.sort((a, b) => a.getTime() - b.getTime());
  const ultimo = datas[datas.length - 1];
  const dd = String(ultimo.getDate()).padStart(2, "0");
  const mm = String(ultimo.getMonth() + 1).padStart(2, "0");
  const yyyy = ultimo.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function previsaoPartoISO(ultimaIABR) {
  const dt = parseDataBR(ultimaIABR);
  if (!dt) return { iso: "", br: "" };
  const previsao = new Date(dt);
  previsao.setDate(previsao.getDate() + 283);
  const dd = String(previsao.getDate()).padStart(2, "0");
  const mm = String(previsao.getMonth() + 1).padStart(2, "0");
  const yyyy = previsao.getFullYear();
  return { iso: previsao.toISOString().split("T")[0], br: `${dd}/${mm}/${yyyy}` };
}

/* ============================
   Componente principal
============================ */
export default function CadastroAnimal() {
  const [mostrarFichaComplementar, setMostrarFichaComplementar] = useState(false);
  // básicos
  const [numero, setNumero] = useState("1");
  const [brinco, setBrinco] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [sexo, setSexo] = useState("");
  const [raca, setRaca] = useState("");
  const [novaRaca, setNovaRaca] = useState("");
  const [racasAdicionais, setRacasAdicionais] = useState([]);

  // complementar
  const [pai, setPai] = useState("");
  const [mae, setMae] = useState("");
  const [listaIAs, setListaIAs] = useState([""]);
  const [listaPartos, setListaPartos] = useState([""]);
  const [listaSecagens, setListaSecagens] = useState([""]);

  // situações calculadas
  const [sitProd, setSitProd] = useState("");
  const [sitReprod, setSitReprod] = useState("");

  // origem
  const [origem, setOrigem] = useState("propriedade");
  const [valorCompra, setValorCompra] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");

  // derivados
  const [idade, setIdade] = useState("");
  const [categoria, setCategoria] = useState("");
  const [mesesIdade, setMesesIdade] = useState(0);

  // feedback
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");
  const [abaLateral] = useState("ficha");

  // selects
  const sexoOptions = [
    { value: "femea", label: "Fêmea" },
    { value: "macho", label: "Macho" },
  ];
  const racaOptions = [
    { value: "Holandês", label: "Holandês" },
    { value: "Jersey", label: "Jersey" },
    { value: "Girolando", label: "Girolando" },
    ...racasAdicionais.map((r) => ({ value: r, label: r })),
  ];
  const origemOptions = [
    { value: "propriedade", label: "Nascido na propriedade" },
    { value: "comprado", label: "Comprado" },
    { value: "doacao", label: "Doação" },
  ];

  const ultimaIABR = getUltimaData(listaIAs);
  const ultimoPartoBR = getUltimaData(listaPartos);
  const ultimaSecagemBR = getUltimaData(listaSecagens);
  const { br: prevPartoBR } = previsaoPartoISO(ultimaIABR);

  // idade / categoria automáticas
  useEffect(() => {
    const { idade: id, categoria: cat, meses } = calcularIdadeECategoria(
      nascimento,
      sexo
    );
    setIdade(id);
    setCategoria(cat);
    setMesesIdade(meses);
  }, [nascimento, sexo]);

  useEffect(() => {
    // produtiva
    if (sexo === "macho") {
      setSitProd("não lactante");
    } else {
      const dtUltParto = parseDataBR(ultimoPartoBR);
      const dtUltSecagem = parseDataBR(ultimaSecagemBR);

      if (dtUltParto && (!dtUltSecagem || dtUltParto > dtUltSecagem)) {
        setSitProd("lactante");
      } else if (dtUltSecagem && (!dtUltParto || dtUltSecagem >= dtUltParto)) {
        setSitProd("seca");
      } else if (mesesIdade < 24) {
        setSitProd("novilha");
      } else {
        setSitProd("não lactante");
      }
    }

    // reprodutiva
    const dtUltIA = parseDataBR(ultimaIABR);
    const dtUltParto = parseDataBR(ultimoPartoBR);
    const dtUltSecagem = parseDataBR(ultimaSecagemBR);

    if (!dtUltIA) {
      setSitReprod("vazia");
    } else {
      const temEventoDepoisDaIA =
        (dtUltParto && dtUltParto > dtUltIA) ||
        (dtUltSecagem && dtUltSecagem > dtUltIA);

      if (!temEventoDepoisDaIA) {
        setSitReprod("inseminada");
      } else if (dtUltParto && dtUltParto > dtUltIA) {
        setSitReprod("PEV / pós-parto");
      } else {
        setSitReprod("vazia");
      }
    }
  }, [sexo, mesesIdade, ultimaIABR, ultimoPartoBR, ultimaSecagemBR]);

  /* ========= ações ========= */

  const adicionarNovaRaca = () => {
    const v = (novaRaca || "").trim();
    if (!v) return;
    if (!racasAdicionais.includes(v))
      setRacasAdicionais([...racasAdicionais, v]);
    setRaca(v);
    setNovaRaca("");
  };

  const limpar = () => {
    setBrinco("");
    setNascimento("");
    setSexo("");
    setRaca("");
    setNovaRaca("");
    setPai("");
    setMae("");
    setListaIAs([""]);
    setListaPartos([""]);
    setListaSecagens([""]);
    setSitProd("");
    setSitReprod("");
    setOrigem("propriedade");
    setValorCompra("");
    setDataEntrada("");
    setIdade("");
    setCategoria("");
    setMensagemErro("");
    setMensagemSucesso("");
    setNumero(String(parseInt(numero || "0", 10) + 1));
  };

  const salvar = () => {
    if (!brinco || !nascimento || !sexo || !raca) {
      setMensagemErro("Preencha Brinco, Nascimento, Sexo e Raça.");
      setTimeout(() => setMensagemErro(""), 2500);
      return;
    }

    const payload = {
      numero,
      brinco,
      nascimento,
      sexo,
      raca,
      origem,
      valor_compra: origem === "comprado" ? valorCompra || undefined : undefined,
      data_entrada: dataEntrada || undefined,
      idade: idade || undefined,
      categoria: categoria || undefined,
    };

    console.log("Payload pronto para enviar ao backend:", payload);

    setMensagemSucesso("Animal cadastrado (payload pronto).");
    setTimeout(() => setMensagemSucesso(""), 2500);

    limpar();
  };

  /* ========= layout ========= */

  return (
    <div
      style={{
        maxWidth: 1300,
        margin: "0 auto",
        padding: "16px 20px 32px",
        fontFamily: "Poppins, system-ui, sans-serif",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Feedback */}
      {mensagemSucesso && <div style={alertSucesso}>{mensagemSucesso}</div>}
      {mensagemErro && <div style={alertErro}>{mensagemErro}</div>}

      {/* 2 colunas: esquerda (form) / direita (ficha) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          columnGap: 56,
          alignItems: "flex-start",
        }}
      >
        {/* ------- COLUNA ESQUERDA ------- */}
        <div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "calc(100vh - 220px)",
              overflowY: "auto",
              paddingRight: 8,
              paddingBottom: 40,
            }}
          >
            {/* Título */}
            <div style={{ marginBottom: 12 }}>
              <h1 style={tituloPagina}>Entrada de Animal</h1>
            </div>

            {/* Identificação */}
            <div style={{ ...card, marginBottom: 28 }}>
              <div style={cardHeader}>
                <span style={cardTitle}>Identificação</span>
                <span style={pill}>campos obrigatórios</span>
              </div>

              <div style={grid2}>
                <div>
                  <label style={lbl}>Número</label>
                  <input
                    type="text"
                    value={numero}
                    readOnly
                    style={inputReadOnly}
                  />
                </div>
                <div>
                  <label style={lbl}>Brinco *</label>
                  <input
                    type="text"
                    value={brinco}
                    onChange={(e) => setBrinco(e.target.value)}
                    style={inputBase}
                    placeholder="Digite o brinco"
                  />
                </div>
              </div>

              <div style={grid2}>
                <div>
                  <label style={lbl}>Nascimento *</label>
                  <input
                    type="text"
                    value={nascimento}
                    onChange={(e) =>
                      setNascimento(formatarDataDigitada(e.target.value))
                    }
                    style={inputBase}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
                <div>
                  <label style={lbl}>Sexo *</label>
                  <Select
                    options={sexoOptions}
                    value={sexoOptions.find((opt) => opt.value === sexo) || null}
                    onChange={(opt) => setSexo(opt?.value || "")}
                    placeholder="Selecione"
                    styles={{
                      container: (base) => ({
                        ...base,
                        width: "100%",
                        flex: 1,
                      }),
                      control: (base) => ({
                        ...base,
                        borderRadius: 12,
                        borderColor: "#d1d5db",
                        minHeight: 46,
                        width: "100%",
                      }),
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <label style={lbl}>Raça *</label>
                <div style={{ display: "flex", gap: 18, alignItems: "stretch" }}>
                  <Select
                    options={racaOptions}
                    value={racaOptions.find((opt) => opt.value === raca) || null}
                    onChange={(opt) => setRaca(opt?.value || "")}
                    placeholder="Selecione"
                    styles={{
                      container: (base) => ({
                        ...base,
                        flex: 1,
                        width: "100%",
                        boxSizing: "border-box",
                      }),
                      control: (base) => ({
                        ...base,
                        borderRadius: 14,
                        borderColor: "#d1d5db",
                        minHeight: 52,
                      }),
                    }}
                  />
                  <input
                    type="text"
                    value={novaRaca}
                    onChange={(e) => setNovaRaca(e.target.value)}
                    placeholder="Nova raça"
                    style={{ ...inputBase, flex: 1 }}
                  />
                  <button
                    type="button"
                    style={btnVerde}
                    onClick={adicionarNovaRaca}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* Origem */}
            <div style={card}>
              <div style={cardHeader}>
                <span style={cardTitle}>Origem do animal</span>
              </div>

              <div style={grid2}>
                <div>
                  <label style={lbl}>Origem</label>
                  <div style={{ display: "flex", width: "100%" }}>
                    <Select
                      options={origemOptions}
                      value={
                        origemOptions.find((opt) => opt.value === origem) || null
                      }
                      onChange={(opt) => setOrigem(opt?.value || "propriedade")}
                      placeholder="Selecione"
                      styles={{
                        container: (base) => ({
                          ...base,
                          flex: 1,
                          width: "100%",
                          boxSizing: "border-box",
                        }),
                        control: (base) => ({
                          ...base,
                          borderRadius: 14,
                          borderColor: "#d1d5db",
                          minHeight: 52,
                        }),
                      }}
                    />
                  </div>
                </div>

                {origem === "comprado" && (
                  <div>
                    <label style={lbl}>Valor de compra (R$)</label>
                    <input
                      type="text"
                      value={valorCompra}
                      onChange={(e) =>
                        setValorCompra(maskMoedaBR(e.target.value))
                      }
                      style={inputBase}
                      placeholder="Opcional"
                    />
                  </div>
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <label style={lbl}>Data de entrada na fazenda</label>
                <input
                  type="text"
                  value={dataEntrada}
                  onChange={(e) =>
                    setDataEntrada(formatarDataDigitada(e.target.value))
                  }
                  style={inputBase}
                  placeholder="dd/mm/aaaa (opcional)"
                />
              </div>
            </div>

            <div style={{ ...card, marginTop: 20 }}>
              <div style={cardHeader}>
                <div style={cardTitle}>Ficha complementar do animal</div>
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() =>
                    setMostrarFichaComplementar((v) => !v)
                  }
                >
                  {mostrarFichaComplementar
                    ? "Fechar ficha complementar"
                    : "Abrir ficha complementar"}
                </button>
              </div>

              {mostrarFichaComplementar && (
                <FichaComplementarAnimal
                  pai={pai}
                  setPai={setPai}
                  mae={mae}
                  setMae={setMae}
                  listaIAs={listaIAs}
                  setListaIAs={setListaIAs}
                  listaPartos={listaPartos}
                  setListaPartos={setListaPartos}
                  listaSecagens={listaSecagens}
                  setListaSecagens={setListaSecagens}
                />
              )}
            </div>

            <div
              style={{
                ...card,
                marginTop: 16,
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
              }}
            >
              <button type="button" style={btnGhost} onClick={limpar}>
                Limpar formulário
              </button>
              <button type="button" style={btnPrimario} onClick={salvar}>
                💾 Salvar
              </button>
            </div>

            <div style={{ height: 40 }} />
          </div>
        </div>

        {/* ------- COLUNA DIREITA: FICHA RESUMIDA ------- */}
        <div>
          <div style={colunaDireitaSticky}>
            <div style={{ ...cardResumo, padding: "16px 16px 12px" }}>
              <div style={{ ...cardHeader, marginBottom: 6 }}>
                <div style={cardTitle}>Ficha do animal</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                <div style={rowKV}>
                  <span style={k}>Número</span>
                  <span style={v}>{numero || "—"}</span>
                </div>
                <div style={rowKV}>
                  <span style={k}>Brinco</span>
                  <span style={v}>{brinco || "—"}</span>
                </div>
                <div style={rowKV}>
                  <span style={k}>Nascimento</span>
                  <span style={v}>{nascimento || "—"}</span>
                </div>
                <div style={rowKV}>
                  <span style={k}>Sexo</span>
                  <span style={v}>{sexo || "—"}</span>
                </div>
                <div style={rowKV}>
                  <span style={k}>Raça</span>
                  <span style={v}>{raca || "—"}</span>
                </div>

                <div style={{ height: 1, background: "#e5e7eb", margin: "4px 0" }} />

                {mostrarFichaComplementar && (
                  <>
                    <div style={rowKV}>
                      <span style={k}>Pai</span>
                      <span style={v}>{pai || "—"}</span>
                    </div>
                    <div style={rowKV}>
                      <span style={k}>Mãe</span>
                      <span style={v}>{mae || "—"}</span>
                    </div>

                    <div
                      style={{ height: 1, background: "#e5e7eb", margin: "4px 0" }}
                    />

                    <div style={rowKV}>
                      <span style={k}>Último parto</span>
                      <span style={v}>{ultimoPartoBR || "—"}</span>
                    </div>
                    <div style={rowKV}>
                      <span style={k}>Última IA</span>
                      <span style={v}>{ultimaIABR || "—"}</span>
                    </div>
                    <div style={rowKV}>
                      <span style={k}>Previsão de parto</span>
                      <span style={v}>{prevPartoBR || "—"}</span>
                    </div>

                    <div
                      style={{ height: 1, background: "#e5e7eb", margin: "4px 0" }}
                    />

                    <div style={rowKV}>
                      <span style={k}>Situação produtiva</span>
                      <span style={v}>{sitProd || "—"}</span>
                    </div>
                    <div style={rowKV}>
                      <span style={k}>Situação reprodutiva</span>
                      <span style={v}>{sitReprod || "—"}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================
   Estilos
============================ */
const card = {
  background: "#ffffff",
  borderRadius: 18,
  border: "1px solid #e5e7eb",
  padding: 32,
  boxShadow: "0 1px 6px rgba(15, 23, 42, 0.04)",
  boxSizing: "border-box",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
};

const cardTitle = {
  fontSize: 16,
  fontWeight: 900,
};

const tituloPagina = { fontSize: 28, fontWeight: 900, marginBottom: 12, margin: 0 };

const colunaDireitaSticky = {
  position: "sticky",
  top: 12,
};

const pill = {
  background: "#eef2ff",
  color: "#3730a3",
  borderRadius: 999,
  padding: "4px 10px",
  border: "1px solid #c7d2fe",
  fontSize: 11,
  fontWeight: 700,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
  columnGap: 16,
  rowGap: 20,
  marginBottom: 16,
};

const lbl = {
  fontWeight: 700,
  fontSize: 13,
  color: "#334155",
  marginBottom: 6,
  display: "block",
};

const inputBase = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #d1d5db",
  padding: "12px 14px",
  fontSize: 15,
  background: "#ffffff",
  boxSizing: "border-box",
};

const inputReadOnly = {
  ...inputBase,
  background: "#f3f4f6",
};

const btnPrimario = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  padding: "11px 26px",
  borderRadius: 14,
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

const btnGhost = {
  background: "#f9fafb",
  color: "#111827",
  border: "1px solid #e5e7eb",
  padding: "11px 24px",
  borderRadius: 14,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const btnVerde = {
  background: "#10b981",
  color: "#ffffff",
  border: "none",
  padding: "11px 16px",
  borderRadius: 14,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const alertSucesso = {
  backgroundColor: "#ecfdf5",
  color: "#065f46",
  border: "1px solid #34d399",
  padding: "8px 12px",
  borderRadius: 12,
  marginBottom: 12,
  fontWeight: 700,
};

const alertErro = {
  backgroundColor: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
  padding: "8px 12px",
  borderRadius: 12,
  marginBottom: 12,
  fontWeight: 700,
};

const cardResumo = {
  ...card,
  paddingTop: 28,
  paddingBottom: 24,
};

const rowKV = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 14,
};

const k = {
  color: "#64748b",
  fontWeight: 700,
};

const v = {
  color: "#111827",
  fontWeight: 900,
};
