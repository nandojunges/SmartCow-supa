export default function SelecioneFazenda() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#fff",
          borderRadius: 16,
          padding: "24px",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
          fontFamily: "'Inter', 'Poppins', sans-serif",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Selecione uma fazenda
        </h2>
        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 14,
            color: "#475569",
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          Para continuar, escolha uma fazenda ativa no menu ou finalize o cadastro
          de uma nova fazenda.
        </p>
      </div>
    </div>
  );
}
