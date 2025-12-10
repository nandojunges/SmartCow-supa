// src/Pages/Animais/FichaComplementarAnimal.jsx
import React from "react";

// Se quiser, pode importar estes estilos de um arquivo comum.
// Aqui deixo inline para ficar claro.
const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const inputBase = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: "1rem",
  backgroundColor: "#fff",
};

const lbl = {
  fontWeight: 700,
  fontSize: 13,
  color: "#334155",
  display: "block",
  marginBottom: 6,
};

const linhaLista = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
};

const botaoMais = {
  width: 40,
  height: 40,
  borderRadius: "999px",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.2rem",
  fontWeight: "800",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
};

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

export default function FichaComplementarAnimal({
  pai,
  setPai,
  mae,
  setMae,
  listaIAs,
  setListaIAs,
  listaPartos,
  setListaPartos,
  listaSecagens,
  setListaSecagens,
}) {
  const handleChangeArray = (lista, setLista, index, value) => {
    const nova = [...lista];
    nova[index] = formatarDataDigitada(value);
    setLista(nova);
  };

  const handleAddCampo = (lista, setLista) => {
    const existeVazio = lista.some((v) => !v || !v.trim());
    if (existeVazio) return; // evita mil linhas vazias
    setLista([...lista, ""]);
  };

  return (
    <div
      style={{
        marginTop: 16,
        borderTop: "1px solid #e5e7eb",
        paddingTop: 16,
      }}
    >
      <div style={grid2}>
        <div>
          <label style={lbl}>Pai (nome)</label>
          <input
            style={inputBase}
            value={pai}
            onChange={(e) => setPai(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div>
          <label style={lbl}>Mãe (nome)</label>
          <input
            style={inputBase}
            value={mae}
            onChange={(e) => setMae(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      {/* Inseminações anteriores */}
      <div style={{ marginTop: 20 }}>
        <label style={lbl}>Inseminações anteriores</label>
        {listaIAs.map((valor, index) => (
          <div key={index} style={linhaLista}>
            <input
              style={inputBase}
              placeholder="dd/mm/aaaa (opcional)"
              value={valor}
              onChange={(e) =>
                handleChangeArray(listaIAs, setListaIAs, index, e.target.value)
              }
            />
            {index === listaIAs.length - 1 && (
              <button
                type="button"
                style={botaoMais}
                onClick={() => handleAddCampo(listaIAs, setListaIAs)}
                title="Adicionar outra inseminação"
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Partos anteriores */}
      <div style={{ marginTop: 20 }}>
        <label style={lbl}>Partos anteriores</label>
        {listaPartos.map((valor, index) => (
          <div key={index} style={linhaLista}>
            <input
              style={inputBase}
              placeholder="dd/mm/aaaa (opcional)"
              value={valor}
              onChange={(e) =>
                handleChangeArray(
                  listaPartos,
                  setListaPartos,
                  index,
                  e.target.value
                )
              }
            />
            {index === listaPartos.length - 1 && (
              <button
                type="button"
                style={botaoMais}
                onClick={() => handleAddCampo(listaPartos, setListaPartos)}
                title="Adicionar outro parto"
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Secagens anteriores */}
      <div style={{ marginTop: 20 }}>
        <label style={lbl}>Secagens anteriores</label>
        {listaSecagens.map((valor, index) => (
          <div key={index} style={linhaLista}>
            <input
              style={inputBase}
              placeholder="dd/mm/aaaa (opcional)"
              value={valor}
              onChange={(e) =>
                handleChangeArray(
                  listaSecagens,
                  setListaSecagens,
                  index,
                  e.target.value
                )
              }
            />
            {index === listaSecagens.length - 1 && (
              <button
                type="button"
                style={botaoMais}
                onClick={() => handleAddCampo(listaSecagens, setListaSecagens)}
                title="Adicionar outra secagem"
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>

      <p
        style={{
          marginTop: 16,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        Em breve esta ficha vai puxar automaticamente o histórico completo
        (pai, mãe, partos, secagens e inseminações) do animal.
      </p>
    </div>
  );
}
