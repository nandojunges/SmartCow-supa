// src/Pages/Tecnico/TecnicoHome.jsx

export default function TecnicoHome() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Propriedades autorizadas</h1>
        <p style={styles.subtitle}>Aqui aparecem as fazendas que convidaram seu e-mail.</p>
      </div>

      <div style={styles.card}>
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>Nenhuma propriedade disponível no momento.</p>
          <button type="button" style={styles.button} disabled>
            Aguardar convite
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
  },
  card: {
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid #e5e7eb",
    padding: 24,
    boxShadow: "0 1px 6px rgba(15, 23, 42, 0.04)",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
  },
  emptyTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: "#334155",
  },
  button: {
    borderRadius: 12,
    border: "1px solid #cbd5f5",
    background: "#e2e8f0",
    color: "#64748b",
    fontWeight: 600,
    padding: "10px 16px",
    cursor: "not-allowed",
  },
};
