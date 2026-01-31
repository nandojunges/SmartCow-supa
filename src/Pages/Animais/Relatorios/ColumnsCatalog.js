const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR");
};

const getAgeLabel = (value) => {
  if (!value) {
    return "—";
  }

  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) {
    return "—";
  }

  const now = new Date();
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());

  if (totalMonths < 0) {
    return "—";
  }

  if (totalMonths < 12) {
    return `${totalMonths} meses`;
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return months
    ? `${years}a ${months}m`
    : `${years} anos`;
};

const getDelLabel = (value) => {
  if (!value) {
    return "—";
  }

  const partoDate = new Date(value);
  if (Number.isNaN(partoDate.getTime())) {
    return "—";
  }

  const now = new Date();
  const diff = now.getTime() - partoDate.getTime();
  if (diff < 0) {
    return "—";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days}`;
};

export const PLANTEL_COLUMNS = [
  {
    key: "numero",
    label: "Número",
    width: 90,
    type: "text",
    group: "Identificação",
  },
  {
    key: "brinco",
    label: "Brinco",
    width: 140,
    type: "text",
    group: "Identificação",
  },
  {
    key: "categoria",
    label: "Categoria",
    width: 140,
    type: "text",
    group: "Classificação",
  },
  {
    key: "grupo",
    label: "Grupo",
    width: 140,
    type: "text",
    group: "Classificação",
  },
  {
    key: "status",
    label: "Status",
    width: 160,
    type: "text",
    group: "Classificação",
    valueGetter: (row) => {
      const categoria = row.categoria ?? "Sem categoria";
      const grupo = row.grupo ?? "Sem grupo";
      return `${categoria} / ${grupo}`;
    },
  },
  {
    key: "del",
    label: "DEL",
    width: 120,
    type: "date",
    group: "Reprodução",
    valueGetter: (row) => getDelLabel(row.data_parto),
  },
  {
    key: "idade",
    label: "Idade",
    width: 110,
    type: "text",
    group: "Perfil",
    valueGetter: (row) => getAgeLabel(row.nascimento),
  },
  {
    key: "ultimaIA",
    label: "Última IA",
    width: 140,
    type: "text",
    group: "Reprodução",
  },
];

export function getColumnsForDataset(datasetKey) {
  if (datasetKey === "plantel") {
    return PLANTEL_COLUMNS;
  }

  return PLANTEL_COLUMNS;
}
