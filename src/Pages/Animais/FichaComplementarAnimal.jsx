// src/Pages/Animais/FichaComplementarAnimal.jsx
import React from "react";

const grid2 = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
  columnGap: 16,
  rowGap: 18,
};

const lblPadrao = {
  fontWeight: 700,
  fontSize: 13,
  color: "#334155",
  display: "block",
  marginBottom: 6,
};

const inputBasePadrao = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #d1d5db",
  padding: "12px 14px",
  fontSize: 15,
  background: "#ffffff",
  boxSizing: "border-box",
};

const linhaLista = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginTop: 10,
};

const botaoAzulMais = {
  minWidth: 44,
  height: 44,
  borderRadius: "999px",
  border: "none",
  backgroundColor: "#1c3586",
  color: "#fff",
  fontSize: 24,
  fontWeight: 800,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
};

export default function FichaComplementarAnimal({
  pai,
  setPai,
  mae,
  setMae,
  inseminacoesAnteriores,
  setInseminacoesAnteriores,
  partosAnteriores,
  setPartosAnteriores,
  secagensAnteriores,
  setSecagensAnteriores,
  atualizarDataLista,
  limparCamposVazios,
  adicionarCampoSeUltimoPreenchido,
  inputBase,
  lbl,
}) {
  const estiloInput = inputBase || inputBasePadrao;
  const estiloLbl = lbl || lblPadrao;

  const renderListaDatas = (lista, setLista, label) => (
    <div style={{ marginTop: 24 }}>
      <label style={estiloLbl}>{label}</label>
      {lista.map((data, index) => (
        <div
          key={`${label}-${index}`}
          style={{ ...linhaLista, marginTop: index === 0 ? 8 : 10 }}
        >
          <input
            style={{ ...estiloInput, flex: 1 }}
            placeholder="dd/mm/aaaa (opcional)"
            value={data}
            onChange={(e) =>
              atualizarDataLista(lista, setLista, index, e.target.value)
            }
            onBlur={() => limparCamposVazios(lista, setLista)}
          />
          {index === lista.length - 1 && (
            <button
              type="button"
              style={botaoAzulMais}
              onClick={() => adicionarCampoSeUltimoPreenchido(lista, setLista)}
              title="Adicionar nova data"
            >
              +
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      style={{
        marginTop: 8,
        borderTop: "1px solid #e5e7eb",
        paddingTop: 16,
      }}
    >
      <div style={grid2}>
        <div>
          <label style={estiloLbl}>Pai (nome)</label>
          <input
            style={estiloInput}
            value={pai}
            onChange={(e) => setPai(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div>
          <label style={estiloLbl}>Mãe (nome)</label>
          <input
            style={estiloInput}
            value={mae}
            onChange={(e) => setMae(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      {renderListaDatas(
        inseminacoesAnteriores,
        setInseminacoesAnteriores,
        "Inseminações anteriores"
      )}
      {renderListaDatas(partosAnteriores, setPartosAnteriores, "Partos anteriores")}
      {renderListaDatas(
        secagensAnteriores,
        setSecagensAnteriores,
        "Secagens anteriores"
      )}

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
