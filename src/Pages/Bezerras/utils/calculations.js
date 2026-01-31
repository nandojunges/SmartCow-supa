// calculations.js

export const calculateGMD = (pesoInicial, pesoFinal, dias) => {
  const d = Number(dias);
  if (!d || d <= 0) return 0;
  return (Number(pesoFinal) - Number(pesoInicial)) / d;
};

export const calculateExpectedWeight = (pesoNascimento, idadeDias, fase = "padrao") => {
  const idade = Math.max(0, Number(idadeDias) || 0);

  // Curvas padrão de crescimento (kg/dia)
  const fases = {
    neonatal: { gmd: 0.4, max: 7 },
    aleitamento: { gmd: 0.7, max: 60 },
    transicao: { gmd: 0.9, max: 90 },
  };

  let pesoEsperado = Number(pesoNascimento) || 0;
  let diasAcumulados = 0;

  Object.entries(fases).forEach(([, dados]) => {
    const diasNaFase = Math.min(idade - diasAcumulados, dados.max);
    if (diasNaFase > 0) {
      pesoEsperado += diasNaFase * dados.gmd;
      diasAcumulados += diasNaFase;
    }
  });

  return pesoEsperado;
};

export const calculateEfficiency = (ganhoPeso, custo) => {
  const c = Number(custo);
  if (!c) return 0;
  return (Number(ganhoPeso) || 0) / c; // kg ganho por real gasto
};

export const projectDesmama = (
  pesoAtual,
  idadeAtual,
  idadeDesmama = 90,
  gmdEsperado = 0.8
) => {
  const idade = Number(idadeAtual) || 0;
  const alvo = Number(idadeDesmama) || 90;
  const diasRestantes = Math.max(0, alvo - idade);

  const peso = Number(pesoAtual) || 0;
  const gmd = Number(gmdEsperado) || 0;

  const pesoProjetado = peso + diasRestantes * gmd;

  return {
    pesoEstimado: pesoProjetado,
    ganhoEstimado: pesoProjetado - peso,
    status: pesoProjetado >= peso * 2 ? "adequado" : "abaixo",
  };
};

/* =========================
   Helpers que estavam faltando
   (Dashboard.jsx importava formatDate)
========================= */

export const formatDate = (dateInput) => {
  if (!dateInput) return "—";

  // Se vier "YYYY-MM-DD", evita timezone bug do Date()
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("pt-BR");
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString("pt-BR");
};

export const toISODate = (dateInput) => {
  if (!dateInput) return "";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
