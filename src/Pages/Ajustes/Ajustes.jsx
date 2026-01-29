// src/pages/Ajustes.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Ajustes() {
  const [email, setEmail] = useState("");
  const [fazendaId, setFazendaId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function carregarPerfil() {
      setCarregando(true);
      setMensagem(null);

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          throw authError;
        }

        const user = authData?.user;
        if (!user) {
          return;
        }

        const { data: perfil, error: perfilError } = await supabase
          .from("profiles")
          .select("fazenda_id")
          .eq("id", user.id)
          .maybeSingle();

        if (perfilError) {
          console.error("Erro ao buscar fazenda do produtor:", perfilError.message);
        }

        if (isMounted) {
          setFazendaId(perfil?.fazenda_id ?? null);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do produtor:", err.message);
        if (isMounted) {
          setMensagem({ tipo: "erro", texto: "Não foi possível carregar seus dados." });
        }
      } finally {
        if (isMounted) {
          setCarregando(false);
        }
      }
    }

    carregarPerfil();

    return () => {
      isMounted = false;
    };
  }, []);

  const emailNormalizado = useMemo(() => email.trim().toLowerCase(), [email]);
  const conviteBloqueado =
    enviando || carregando || !emailNormalizado || !fazendaId;

  async function handleConvidar(event) {
    event.preventDefault();
    setMensagem(null);

    if (!fazendaId) {
      setMensagem({
        tipo: "erro",
        texto: "Não encontramos a fazenda vinculada ao seu perfil.",
      });
      return;
    }

    if (!emailNormalizado) {
      setMensagem({ tipo: "erro", texto: "Informe o e-mail do profissional." });
      return;
    }

    try {
      setEnviando(true);
      const { error } = await supabase.from("convites_acesso").insert({
        fazenda_id: fazendaId,
        email_convidado: emailNormalizado,
      });

      if (error) {
        throw error;
      }

      setEmail("");
      setMensagem({
        tipo: "sucesso",
        texto: "Convite enviado! O profissional verá o convite ao acessar.",
      });
    } catch (err) {
      console.error("Erro ao enviar convite:", err.message);
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível enviar o convite. Tente novamente.",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Ajustes do produtor</h1>
        <p style={styles.subtitle}>
          Gerencie quem pode acessar seus dados e acompanhar sua fazenda.
        </p>
      </div>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Acesso profissional</h2>
          <span style={styles.cardDescription}>
            Convide técnicos e parceiros para consultar sua fazenda.
          </span>
        </div>

        <form style={styles.form} onSubmit={handleConvidar}>
          <label style={styles.label}>
            E-mail do profissional
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={styles.input}
            />
          </label>

          <button type="submit" style={styles.primaryButton} disabled={conviteBloqueado}>
            {enviando ? "Enviando..." : "Convidar"}
          </button>
        </form>

        {mensagem && (
          <div
            style={{
              ...styles.feedback,
              ...(mensagem.tipo === "erro" ? styles.feedbackErro : styles.feedbackSucesso),
            }}
          >
            {mensagem.texto}
          </div>
        )}

        {carregando && (
          <p style={styles.helperText}>Carregando informações da fazenda...</p>
        )}
        {!carregando && !fazendaId && (
          <p style={styles.helperText}>
            Complete seu cadastro para liberar convites de acesso.
          </p>
        )}
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
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  cardHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },
  cardDescription: {
    color: "#64748b",
    fontSize: 13,
  },
  form: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-end",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#1f2937",
    flex: 1,
    minWidth: 220,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
  },
  primaryButton: {
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    padding: "10px 16px",
    cursor: "pointer",
    minWidth: 120,
  },
  feedback: {
    padding: "10px 12px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
  },
  feedbackSucesso: {
    background: "#ecfdf3",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },
  feedbackErro: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },
  helperText: {
    margin: 0,
    fontSize: 12,
    color: "#94a3b8",
  },
};
