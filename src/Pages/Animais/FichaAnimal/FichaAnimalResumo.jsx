// src/pages/Animais/FichaAnimal/FichaAnimalResumo.jsx
import React from "react";

/* ==== helpers de datas / idade / DEL ==== */

// aceita ISO ("2023-01-01") ou BR ("01/01/2023")
function parseDateFlexible(s) {
  if (!s) return null;
  if (typeof s !== "string") s = String(s).trim();

  // ISO yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = +m[1],
      mo = +m[2],
      d = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

  // BR dd/mm/aaaa
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const d = +m[1],
      mo = +m[2],
      y = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

  return null;
}

function fmtDataBR(s) {
  const dt = parseDateFlexible(s);
  return dt ? dt.toLocaleDateString("pt-BR") : "—";
}

function calcIdade(nascimento) {
  const dt = parseDateFlexible(nascimento);
  if (!dt) return "—";

  const hoje = new Date();
  let meses =
    (hoje.getFullYear() - dt.getFullYear()) * 12 +
    (hoje.getMonth() - dt.getMonth());

  if (hoje.getDate() < dt.getDate()) meses -= 1;
  if (meses < 0) meses = 0;

  const anos = Math.floor(meses / 12);
  const rem = meses % 12;
  return `${anos}a ${rem}m`;
}

function calcDEL(dataParto) {
  const parto = parseDateFlexible(dataParto);
  if (!parto) return "—";

  const hoje = new Date();
  const dias = Math.floor((hoje.getTime() - parto.getTime()) / 86400000);
  return dias >= 0 ? `${dias} d` : "—";
}

/* ==== estilos base ==== */

const wrapper = {
  maxWidth: "1180px",
  margin: "0 auto",
  padding: "1.2rem 0 2.4rem 0",
  fontFamily: "Poppins, system-ui, sans-serif",
};

const title = {
  fontSize: "1.55rem",
  fontWeight: 800,
  color: "#020617",
};

const subtitle = {
  fontSize: "0.85rem",
  color: "#64748b",
};

const gridTopo = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 3fr) minmax(260px, 1.6fr)",
  gap: "14px",
  marginTop: "1.5rem",
};

const gridMeio = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 3fr) minmax(260px, 1.6fr)",
  gap: "14px",
  marginTop: "14px",
};

const cardBase = {
  backgroundColor: "#fff",
  borderRadius: "18px",
  padding: "18px 22px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 6px 18px rgba(15,23,42,0.05)",
};

const cardTituloLinha = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 10,
};

const cardTituloIcone = { fontSize: "1.15rem" };
const cardTituloTexto = {
  fontSize: "0.9rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#0f172a",
};

const labelTiny = {
  fontSize: "0.7rem",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
};

const valorMenor = {
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "#020617",
};

function safe(v) {
  // Só troca por "—" se for null/undefined; string vazia ainda aparece vazia
  return v === null || v === undefined ? "—" : v;
}

function InfoLinha({ label, valor }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={labelTiny}>{label}</span>
      <span style={valorMenor}>{safe(valor)}</span>
    </div>
  );
}

/* ======================================================
      COMPONENTE PRINCIPAL AJUSTADO PARA NOVO BANCO
   ====================================================== */

export default function FichaAnimalResumo({ animal }) {
  if (!animal) return null;

  // DEBUG: veja no console exatamente o que está chegando aqui
  // (pode remover depois que conferir)
  console.log("FichaAnimalResumo - animal recebido:", animal);

  // idade dinâmica (não usa a coluna idade do banco)
  const idadeTexto = calcIdade(animal.nascimento);
  const del = calcDEL(animal.ultimo_parto);

  // raça – aceita vários formatos (join, objeto aninhado, texto simples)
  const racaNome =
    animal.raca_nome ??
    animal.raca ??
    (animal.racas && animal.racas.nome) ??
    (animal.raca && animal.raca.nome) ??
    null;

  // genealogia – aceita pai_nome/mae_nome ou pai/mae
  const paiNome = animal.pai_nome ?? animal.pai ?? null;
  const maeNome = animal.mae_nome ?? animal.mae ?? null;

  // categoria – tenta várias chaves
  const categoriaAtual =
    animal.categoria_atual ??
    animal.categoria ??
    animal.categoriaAtual ??
    null;

  // situações salvas no banco (considera nomes antigos e novos)
  const situacaoProd =
    animal.situacao_produtiva ??
    animal.situacao_pro ??
    animal.situacaoPro ??
    null;

  const situacaoRep =
    animal.situacao_reprodutiva ??
    animal.situacao_rep ??
    animal.situacaoRep ??
    null;

  return (
    <div style={wrapper}>
      <div>
        <h2 style={title}>Resumo do animal</h2>
        <p style={subtitle}>
          Visão geral com identificação, idade, genealogia e status produtivo /
          reprodutivo.
        </p>
      </div>

      {/* ========== LINHA 1 ========== */}
      <div style={gridTopo}>
        {/* Identificação */}
        <div style={cardBase}>
          <div style={cardTituloLinha}>
            <span style={cardTituloIcone}>🐄</span>
            <span style={cardTituloTexto}>Identificação</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={labelTiny}>Nº</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>
                  {safe(animal.numero)}
                </div>

                {animal.brinco && (
                  <div style={{ color: "#6b7280", marginTop: 2 }}>
                    Brinco {animal.brinco}
                  </div>
                )}
              </div>

              <InfoLinha label="Sexo" valor={animal.sexo} />
              <InfoLinha
                label="Nascimento"
                valor={fmtDataBR(animal.nascimento)}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <InfoLinha label="Raça" valor={racaNome} />
              <InfoLinha label="Origem" valor={animal.origem} />
              <InfoLinha label="Idade" valor={idadeTexto} />
            </div>
          </div>
        </div>

        {/* DEL / status */}
        <div
          style={{
            ...cardBase,
            background:
              "linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #22c55e 100%)",
            color: "#fff",
            border: "none",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>
              DEL (dias em lactação)
            </div>
            <div style={{ fontSize: "2.4rem", fontWeight: 900 }}>{del}</div>
          </div>

          <div
            style={{ marginTop: 16, fontSize: "0.85rem", lineHeight: 1.4 }}
          >
            <div>
              <strong>Último parto: </strong>
              {fmtDataBR(animal.ultimo_parto)}
            </div>
          </div>
        </div>
      </div>

      {/* ========== LINHA 2 ========== */}
      <div style={gridMeio}>
        {/* Identificação detalhada */}
        <div style={cardBase}>
          <div style={cardTituloLinha}>
            <span style={cardTituloIcone}>📋</span>
            <span style={cardTituloTexto}>Identificação detalhada</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <InfoLinha label="Número" valor={animal.numero} />
            <InfoLinha label="Brinco" valor={animal.brinco} />
            <InfoLinha
              label="Nascimento"
              valor={fmtDataBR(animal.nascimento)}
            />
            <InfoLinha label="Categoria atual" valor={categoriaAtual} />
            <InfoLinha label="Situação produtiva" valor={situacaoProd} />
            <InfoLinha label="Situação reprodutiva" valor={situacaoRep} />
          </div>
        </div>

        {/* Genealogia */}
        <div style={cardBase}>
          <div style={cardTituloLinha}>
            <span style={cardTituloIcone}>🌳</span>
            <span style={cardTituloTexto}>Genealogia</span>
          </div>

          <InfoLinha label="Pai" valor={paiNome} />
          <InfoLinha label="Mãe" valor={maeNome} />
        </div>
      </div>

      {/* ========== LINHA 3 ========== */}
      <div style={{ ...cardBase, marginTop: 14 }}>
        <div style={cardTituloLinha}>
          <span style={cardTituloIcone}>📈</span>
          <span style={cardTituloTexto}>Status produtivo / reprodutivo</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 18,
          }}
        >
          <InfoLinha label="Situação produtiva" valor={situacaoProd} />
          <InfoLinha label="Situação reprodutiva" valor={situacaoRep} />
          <InfoLinha label="DEL atual" valor={del} />
        </div>
      </div>
    </div>
  );
}
