// formatters.js

/* =========================
   Datas
========================= */

/**
 * Formata datas para pt-BR (dd/mm/aaaa)
 * Aceita Date | string (ISO ou dd/mm/aaaa)
 * Evita bug de timezone em YYYY-MM-DD
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return "—";

  // Caso venha ISO puro (YYYY-MM-DD)
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return String(dateInput);

  return date.toLocaleDateString("pt-BR");
};

/**
 * Calcula idade em dias
 * (usado para bezerras, comparativos e gráficos)
 */
export const calculateAgeInDays = (birthDate, compareDate = new Date()) => {
  if (!birthDate) return 0;

  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const compare = compareDate instanceof Date ? compareDate : new Date(compareDate);

  if (Number.isNaN(birth.getTime()) || Number.isNaN(compare.getTime())) return 0;

  const diffTime = compare - birth;
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

/* =========================
   Números / Moeda / Peso
========================= */

export const formatCurrency = (value) => {
  if (value == null || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatWeight = (value, decimals = 1) => {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(decimals)} kg`;
};

/* =========================
   Helpers extras (úteis no sistema)
========================= */

/**
 * Percentual formatado
 */
export const formatPercent = (value, decimals = 1) => {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Texto seguro (fallback padrão)
 */
export const safeText = (value, fallback = "—") => {
  if (value == null || value === "") return fallback;
  return String(value);
};
