// src/pages/Animais/CadastroAnimal.jsx
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
    return { idade: "", categoria: "" };

  const [dia, mes, ano] = nascimento.split("/").map(Number);
  const nascDate = new Date(ano, mes - 1, dia);
  if (Number.isNaN(+nascDate)) return { idade: "", categoria: "" };

  const diffMs = Date.now() - nascDate.getTime();
  const meses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const idade = `${Math.floor(meses / 12)}a ${meses % 12}m`;

  let categoria = "";
  if (meses < 2) categoria = "Bezerro(a)";
  else if (meses < 12) categoria = "Novilho(a)";
  else if (meses < 24)
    categoria = sexo === "macho" ? "Touro jovem" : "Novilha";
  else categoria = sexo === "macho" ? "Touro" : "Vaca adulta";

  return { idade, categoria };
}

function maskMoedaBR(v) {
  let n = String(v || "").replace(/\D/g, "");
  if (!n) return "";
  n = (parseInt(n, 10) / 100).toFixed(2);
  const [int, dec] = n.split(".");
  const intComPontos = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intComPontos},${dec}`;
}

/* ============================
   Componente principal
============================ */
export default function CadastroAnimal() {
  // básicos
  const [numero, setNumero] = useState("1");
  const [brinco, setBrinco] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [sexo, setSexo] = useState("");
  const [raca, setRaca] = useState("");
  const [novaRaca, setNovaRaca] = useState("");
  const [racasAdicionais, setRacasAdicionais] = useState([]);

  // origem
  const [origem, setOrigem] = useState("propriedade");
  const [valorCompra, setValorCompra] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");

  // derivados
  const [idade, setIdade] = useState("");
  const [categoria, setCategoria] = useState("");

  // feedback
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

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

  // idade / categoria
  useEffect(() => {
    const { idade: id, categoria: cat } = calcularIdadeECategoria(
      nascimento,
      sexo
    );
    setIdade(id);
    setCategoria(cat);
  }, [nascimento, sexo]);

  /* ========= ações ========= */

  const adicionarNovaRaca = () => {
    const v = (novaRaca || "").trim();
    if (!v) return;
    if (!racasAdicionais.includes(v)) {
      setRacasAdicionais([...racasAdicionais, v]);
    }
    setRaca(v);
    setNovaRaca("");
  };

  const limpar = () => {
    setBrinco("");
    setNascimento("");
    setSexo("");
    setRaca("");
    setNovaRaca("");
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
    <div style={pageContainer}>
      {/* Título (sem texto embaixo) */}
      <div style={{ marginBottom: 8 }}>
        <h1 style={tituloPagina}>Entrada de Animal</h1>
      </div>

      {/* Feedback */}
      {mensagemSucesso && (
        <div style={alertSucesso}>{mensagemSucesso}</div>
      )}
      {mensagemErro && <div style={alertErro}>{mensagemErro}</div>}

      {/* 2 colunas: esquerda (form com scroll) / direita (ficha fixa) */}
      <div style={gridPrincipal}>
        {/* ------- COLUNA ESQUERDA — SCROLL SOMENTE AQUI ------- */}
        <div style={colEsquerda}>
          <div style={colEsquerdaInner}>
            {/* Identificação */}
            <div style={{ ...card, marginBottom: 24 }}>
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
                    value={
                      sexoOptions.find((opt) => opt.value === sexo) || null
                    }
                    onChange={(opt) => setSexo(opt?.value || "")}
                    placeholder="Selecione"
                    styles={{
                      container: (base) => ({ ...base, width: "100%" }),
                      control: (base) => ({
                        ...base,
                        borderRadius: 12,
                        borderColor: "#d1d5db",
                        minHeight: 48,
                      }),
                      valueContainer: (base) => ({
                        ...base,
                        paddingLeft: 10,
                        paddingRight: 8,
                      }),
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 6 }}>
                <label style={lbl}>Raça *</label>
                <div
                  style={{ display: "flex", gap: 12, alignItems: "stretch" }}
                >
                  <Select
                    options={racaOptions}
                    value={
                      racaOptions.find((opt) => opt.value === raca) || null
                    }
                    onChange={(opt) => setRaca(opt?.value || "")}
                    placeholder="Selecione"
                    styles={{
                      container: (base) => ({ ...base, flex: 1 }),
                      control: (base) => ({
                        ...base,
                        borderRadius: 12,
                        borderColor: "#d1d5db",
                        minHeight: 48,
                      }),
                      valueContainer: (base) => ({
                        ...base,
                        paddingLeft: 10,
                        paddingRight: 8,
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
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={cardHeader}>
                <span style={cardTitle}>Origem do animal</span>
              </div>

              <div style={grid2}>
                <div>
                  <label style={lbl}>Origem</label>
                  <Select
                    options={origemOptions}
                    value={
                      origemOptions.find((opt) => opt.value === origem) || null
                    }
                    onChange={(opt) =>
                      setOrigem(opt?.value || "propriedade")
                    }
                    placeholder="Selecione"
                    styles={{
                      container: (base) => ({ ...base, width: "100%" }),
                      control: (base) => ({
                        ...base,
                        borderRadius: 12,
                        borderColor: "#d1d5db",
                        minHeight: 48,
                      }),
                      valueContainer: (base) => ({
                        ...base,
                        paddingLeft: 10,
                        paddingRight: 8,
                      }),
                    }}
                  />
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

              <div style={{ marginTop: 10 }}>
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

            {/* Botões no fim do formulário (aparecem ao descer o scroll da lista) */}
            <div style={botoesRodape}>
              <button type="button" style={btnGhost} onClick={limpar}>
                Limpar formulário
              </button>
              <button type="button" style={btnPrimario} onClick={salvar}>
                💾 Salvar
              </button>
            </div>
          </div>
        </div>

        {/* ------- COLUNA DIREITA — FICHA FIXA ------- */}
        <div style={colDireita}>
          <div style={cardFicha}>
            <h2 style={tituloFicha}>Ficha complementar</h2>
            <FichaComplementarAnimal
              numero={numero}
              brinco={brinco}
              nascimento={nascimento}
              sexo={sexo}
              raca={raca}
              idade={idade}
              categoria={categoria}
              origem={origem}
              valorCompra={valorCompra}
              dataEntrada={dataEntrada}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================
   Estilos
============================ */
const pageContainer = {
  maxWidth: 1350,
  margin: "0 auto",
  padding: "16px 24px 24px",
  fontFamily: "Poppins, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  // Segura o conteúdo dentro da altura da tela
  height: "calc(100vh - 130px)", // ~descontando cabeçalho azul + margens
  boxSizing: "border-box",
  overflow: "hidden", // tira o scroll da PÁGINA
};

const tituloPagina = {
  margin: 0,
  fontSize: 28,
  fontWeight: 900,
};

const gridPrincipal = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
  columnGap: 48,
  alignItems: "stretch",
  width: "100%",
  height: "100%",
};

const colEsquerda = {
  height: "100%",
  overflowY: "auto", // scroll SÓ AQUI
  paddingRight: 12,
};

const colEsquerdaInner = {
  paddingRight: 4,
};

const colDireita = {
  alignSelf: "flex-start",
};

const card = {
  background: "#ffffff",
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  padding: 22,
  boxShadow: "0 1px 6px rgba(15, 23, 42, 0.05)",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const cardTitle = {
  fontSize: 16,
  fontWeight: 900,
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
  columnGap: 20,
  rowGap: 18,
  marginBottom: 12,
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
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "11px 12px",
  fontSize: 15,
  background: "#ffffff",
};

const inputReadOnly = {
  ...inputBase,
  background: "#f3f4f6",
};

const btnPrimario = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  padding: "11px 20px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

const btnGhost = {
  background: "#f9fafb",
  color: "#111827",
  border: "1px solid #e5e7eb",
  padding: "11px 18px",
  borderRadius: 999,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const btnVerde = {
  background: "#10b981",
  color: "#ffffff",
  border: "none",
  padding: "11px 18px",
  borderRadius: 12,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const alertSucesso = {
  backgroundColor: "#ecfdf5",
  color: "#065f46",
  border: "1px solid #34d399",
  padding: "8px 12px",
  borderRadius: 12,
  marginBottom: 12,
  fontWeight: 700,
  fontSize: 13,
};

const alertErro = {
  backgroundColor: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
  padding: "8px 12px",
  borderRadius: 12,
  marginBottom: 12,
  fontWeight: 700,
  fontSize: 13,
};

const botoesRodape = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 4,
  paddingBottom: 4,
};

const cardFicha = {
  ...card,
  paddingTop: 24,
  paddingBottom: 20,
};

const tituloFicha = {
  margin: 0,
  marginBottom: 12,
  fontSize: 16,
  fontWeight: 900,
};
