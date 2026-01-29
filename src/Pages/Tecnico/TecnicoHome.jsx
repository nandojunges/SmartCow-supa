// src/Pages/Tecnico/TecnicoHome.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "../../lib/supabaseClient";
import { useFazenda } from "../../context/FazendaContext";

const STATUS_LABELS = {
  pendente: { label: "Pendente", tone: "warning" },
  aceito: { label: "Aceito", tone: "success" },
  recusado: { label: "Recusado", tone: "neutral" },
  revogado: { label: "Revogado", tone: "neutral" },
};

export default function TecnicoHome() {
  const navigate = useNavigate();
  const { setFazendaAtiva } = useFazenda();
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [acessos, setAcessos] = useState([]);
  const [convites, setConvites] = useState([]);
  const [processandoId, setProcessandoId] = useState(null);

  async function carregarDados(user) {
    setCarregando(true);

    try {
      const [acessosResp, convitesResp] = await Promise.all([
        supabase.rpc("listar_fazendas_com_acesso"),
        supabase.rpc("listar_convites_pendentes"),
      ]);

      if (acessosResp.error) {
        throw acessosResp.error;
      }

      if (convitesResp.error) {
        throw convitesResp.error;
      }

      setUsuario(user);
      setAcessos(acessosResp.data ?? []);
      setConvites(convitesResp.data ?? []);
    } catch (err) {
      console.error("Erro ao carregar dados do técnico:", err.message);
      toast.error(err.message || "Não foi possível carregar suas fazendas no momento.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function carregarUsuario() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          throw authError;
        }

        const user = authData?.user;
        if (!user || !isMounted) {
          return;
        }

        await carregarDados(user);
      } catch (err) {
        console.error("Erro ao carregar dados do técnico:", err.message);
        toast.error(err.message || "Não foi possível carregar seus dados.");
        setCarregando(false);
      }
    }

    carregarUsuario();

    return () => {
      isMounted = false;
    };
  }, []);

  const convitesPendentes = useMemo(
    () =>
      convites.filter(
        (convite) => (convite.status ?? "pendente").toLowerCase() === "pendente"
      ),
    [convites]
  );

  const acessosAtivos = useMemo(
    () => acessos.filter((acesso) => (acesso.status ?? "ativo") === "ativo"),
    [acessos]
  );

  async function handleAceitarConvite(convite) {
    if (!usuario) return;

    setProcessandoId(convite.id);

    try {
      const { error: acessoError } = await supabase.from("fazenda_acessos").upsert(
        {
          fazenda_id: convite.fazenda_id,
          user_id: usuario.id,
          status: "ativo",
          profissional_tipo: convite.profissional_tipo ?? null,
          profissional_nome: convite.profissional_nome ?? null,
        },
        { onConflict: "fazenda_id,user_id" }
      );

      if (acessoError) {
        throw acessoError;
      }

      const { error: conviteError } = await supabase
        .from("convites_acesso")
        .update({ status: "aceito", accepted_at: new Date().toISOString() })
        .eq("id", convite.id);

      if (conviteError) {
        throw conviteError;
      }

      toast.success("Convite aceito! A fazenda já está disponível para você.");

      await carregarDados(usuario);
    } catch (err) {
      console.error("Erro ao aceitar convite:", err.message);
      toast.error(err.message || "Não foi possível aceitar o convite.");
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
          Aqui aparecem as fazendas que convidaram seu e-mail
          {usuario?.email ? ` (${usuario.email})` : ""}.
        </p>
      </div>

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
              const statusKey = (convite.status ?? "pendente").toLowerCase();
              const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS.pendente;

              return (
                <div key={convite.id} style={styles.listItem}>
                  <div style={styles.listInfo}>
                    <span style={styles.listTitle}>
                      {convite.fazenda_nome || `Fazenda #${convite.fazenda_id}`}
                    </span>
                    <span style={styles.listMeta}>
                      {convite.profissional_tipo || "Convite profissional"}
                      {convite.profissional_nome ? ` · ${convite.profissional_nome}` : ""}
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
        ) : acessosAtivos.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>Nenhuma fazenda liberada ainda.</p>
            <span style={styles.emptyDescription}>
              Você verá aqui as fazendas após aceitar um convite.
            </span>
          </div>
        ) : (
          <div style={styles.list}>
            {acessosAtivos.map((acesso) => (
              <div key={acesso.acesso_id} style={styles.listItem}>
                <div style={styles.listInfo}>
                  <span style={styles.listTitle}>
                    {acesso.fazenda_nome || `Fazenda #${acesso.fazenda_id}`}
                  </span>
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
};
