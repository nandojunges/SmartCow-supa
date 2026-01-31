// exportUtils.js

const asText = (v) => {
  if (v == null) return ""; // null/undefined -> vazio
  if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const escapeCSV = (value, delimiter = ";") => {
  const s = asText(value);
  // se tiver delimitador, aspas, ou quebra de linha -> envolve em aspas e escapa aspas
  if (s.includes(delimiter) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const exportToCSV = (data, filename = "export", opts = {}) => {
  const { delimiter = ";", includeBOM = true } = opts;

  if (!Array.isArray(data) || data.length === 0) return;

  const headers = Object.keys(data[0]);

  const lines = [
    headers.map((h) => escapeCSV(h, delimiter)).join(delimiter),
    ...data.map((row) =>
      headers.map((h) => escapeCSV(row?.[h], delimiter)).join(delimiter)
    ),
  ];

  const csvContent = (includeBOM ? "\uFEFF" : "") + lines.join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

export const generatePDFContent = (bezerra) => {
  if (!bezerra) return null;

  return {
    title: `Ficha Individual - ${bezerra.brinco ?? "—"}`,
    sections: [
      { title: "Dados Gerais", data: bezerra },
      { title: "Pesagens", data: bezerra.pesagens ?? [] },
      { title: "Ocorrências", data: bezerra.ocorrencias ?? [] },
    ],
  };
};
