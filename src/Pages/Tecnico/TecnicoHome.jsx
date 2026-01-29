// src/Pages/Tecnico/TecnicoHome.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useFazenda } from "../../context/FazendaContext";

const STATUS_LABELS = {
  PENDENTE: { label: "Pendente", tone: "warning" },
  ACEITO: { label: "Aceito", tone: "success" },
  RECUSADO: { label: "Recusado", tone: "neutral" },
};

export default function TecnicoHome() {
  const navigate = useNavigate();
  const { setFazendaAtiva } = useFazenda();
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [acessos, setAcessos] = useState([]);
  const [convites, setConvites] = useState([]);
  const [processandoId, setProcessandoId] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function carregarDados() {
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

        const [acessosResp, convitesResp] = await Promise.all([
          supabase
            .from("fazenda_acessos")
            .select("id, fazenda_id, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("convites_acesso")
            .select("id, fazenda_id, status, created_at, email_convidado")
            .eq("email_convidado", user.email)
            .order("created_at", { ascending: false }),
        ]);

        if (acessosResp.error) {
          console.error("Erro ao carregar acessos:", acessosResp.error.message);
        }

        if (convitesResp.error) {
          console.error("Erro ao carregar convites:", convitesResp.error.message);
        }

        if (isMounted) {
          setUsuario(user);
          setAcessos(acessosResp.data ?? []);
          setConvites(convitesResp.data ?? []);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do técnico:", err.message);
        if (isMounted) {
          setMensagem({
            tipo: "erro",
            texto: "Não foi possível carregar suas fazendas no momento.",
          });
        }
      } finally {
        if (isMounted) {
          setCarregando(false);
        }
      }
    }

    carregarDados();

    return () => {
      isMounted = false;
    };
  }, []);

  const convitesPendentes = useMemo(
    () =>
      convites.filter(
        (convite) => (convite.status ?? "PENDENTE").toUpperCase() !== "ACEITO"
      ),
    [convites]
  );

  async function handleAceitarConvite(convite) {
    if (!usuario) return;

    setMensagem(null);
    setProcessandoId(convite.id);

    try {
      const { error: insertError } = await supabase
        .from("fazenda_acessos")
        .insert({
          fazenda_id: convite.fazenda_id,
          user_id: usuario.id,
        });

      if (insertError) {
        console.error("Erro ao inserir acesso:", insertError.message);
      }

      const { error: updateError } = await supabase
        .from("convites_acesso")
        .update({ status: "ACEITO" })
        .eq("id", convite.id);

      if (updateError) {
        throw updateError;
      }

      setConvites((prev) =>
        prev.map((item) =>
          item.id === convite.id ? { ...item, status: "ACEITO" } : item
        )
      );

      setAcessos((prev) => {
        const jaExiste = prev.some((item) => item.fazenda_id === convite.fazenda_id);
        if (jaExiste) {
          return prev;
        }
        return [
          {
            id: `novo-${convite.id}`,
            fazenda_id: convite.fazenda_id,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ];
      });

      setMensagem({
        tipo: "sucesso",
        texto: "Convite aceito! A fazenda já está disponível para você.",
      });
    } catch (err) {
      console.error("Erro ao aceitar convite:", err.message);
      setMensagem({
        tipo: "erro",
        texto: "Não foi possível aceitar o convite. Tente novamente.",
      });
    } finally {
      setProcessandoId(null);
    }
  }

  function handleAcessarFazenda(fazendaId) {
    setFazendaAtiva(fazendaId);
    navigate("/inicio", { replace: true });
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Propriedades autorizadas</h1>
        <p style={styles.subtitle}>
          Aqui aparecem as fazendas que convidaram seu e-mail{usuario?.email ? ` (${usuario.email})` : ""}.
        </p>
      </div>

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

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Convites pendentes</h2>
          <span style={styles.sectionSubtitle}>
            Aceite os convites para habilitar o acesso às fazendas.
          </span>
        </div>

        {carregando ? (
          <p style={styles.helperText}>Carregando convites...</p>
        ) : convitesPendentes.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>Nenhum convite pendente no momento.</p>
            <span style={styles.emptyDescription}>
              Assim que um produtor convidar seu e-mail, o convite aparecerá aqui.
            </span>
          </div>
        ) : (
          <div style={styles.list}>
            {convitesPendentes.map((convite) => {
              const statusKey = (convite.status ?? "PENDENTE").toUpperCase();
              const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS.PENDENTE;

              return (
                <div key={convite.id} style={styles.listItem}>
                  <div style={styles.listInfo}>
                    <span style={styles.listTitle}>
                      Fazenda #{convite.fazenda_id}
                    </span>
                    <span style={styles.listMeta}>
                      Convite enviado em {formatarData(convite.created_at)}
                    </span>
                  </div>
                  <div style={styles.listActions}>
                    <span style={{ ...styles.status, ...styles[`status${statusInfo.tone}`] }}>
                      {statusInfo.label}
                    </span>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={() => handleAceitarConvite(convite)}
                      disabled={processandoId === convite.id}
                    >
                      {processandoId === convite.id ? "Aceitando..." : "Aceitar convite"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Fazendas com acesso ativo</h2>
          <span style={styles.sectionSubtitle}>
            Propriedades liberadas para consulta no app.
          </span>
        </div>

        {carregando ? (
          <p style={styles.helperText}>Carregando acessos...</p>
        ) : acessos.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>Nenhuma fazenda liberada ainda.</p>
            <span style={styles.emptyDescription}>
              Você verá aqui as fazendas após aceitar um convite.
            </span>
          </div>
        ) : (
          <div style={styles.list}>
            {acessos.map((acesso) => (
              <div key={acesso.id} style={styles.listItem}>
                <div style={styles.listInfo}>
                  <span style={styles.listTitle}>Fazenda #{acesso.fazenda_id}</span>
                  <span style={styles.listMeta}>
                    Acesso ativo desde {formatarData(acesso.created_at)}
                  </span>
                </div>
                <div style={styles.listActions}>
                  <span style={{ ...styles.status, ...styles.statussuccess }}>Ativo</span>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => handleAcessarFazenda(acesso.fazenda_id)}
                  >
                    Acessar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatarData(valor) {
  if (!valor) return "data indisponível";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return "data indisponível";
  }
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  sectionHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },
  sectionSubtitle: {
    color: "#64748b",
    fontSize: 13,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  listItem: {
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    padding: "14px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  listInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  listTitle: {
    fontWeight: 600,
    color: "#0f172a",
    fontSize: 15,
  },
  listMeta: {
    fontSize: 12,
    color: "#64748b",
  },
  listActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  status: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid transparent",
  },
  statussuccess: {
    background: "#ecfdf3",
    color: "#166534",
    borderColor: "#bbf7d0",
  },
  statuswarning: {
    background: "#fffbeb",
    color: "#92400e",
    borderColor: "#fde68a",
  },
  statusneutral: {
    background: "#f1f5f9",
    color: "#475569",
    borderColor: "#e2e8f0",
  },
  primaryButton: {
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    padding: "8px 14px",
    cursor: "pointer",
  },
  secondaryButton: {
    borderRadius: 12,
    border: "1px solid #cbd5f5",
    background: "#eef2ff",
    color: "#1e3a8a",
    fontWeight: 600,
    padding: "8px 14px",
    cursor: "pointer",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
  },
  emptyTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: "#334155",
  },
  emptyDescription: {
    fontSize: 12,
    color: "#94a3b8",
  },
  helperText: {
    margin: 0,
    fontSize: 12,
    color: "#94a3b8",
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
};
