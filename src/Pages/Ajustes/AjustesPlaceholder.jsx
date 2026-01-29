export default function AjustesPlaceholder({ title, description }) {
  return (
    <div style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.subtitle}>{description}</p>
        <span style={styles.badge}>Em breve</span>
      </section>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid #e5e7eb",
    padding: 24,
    boxShadow: "0 1px 6px rgba(15, 23, 42, 0.04)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
  },
  badge: {
    alignSelf: "flex-start",
    background: "#fef3c7",
    color: "#92400e",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid #fde68a",
  },
};
