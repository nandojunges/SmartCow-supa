import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "../../lib/supabaseClient";
import { useFazenda } from "../../context/FazendaContext";
import { listAcessosDaFazenda } from "../../lib/fazendaHelpers";
import { criarConvite, listarConvitesPendentesProdutor } from "../../services/acessos";

export default function AjustesAcessos() {
  const navigate = useNavigate();
  const { fazendaAtualId } = useFazenda();
  const [email, setEmail] = useState("");
  const [profissionalNome, setProfissionalNome] = useState("");
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [carregandoListas, setCarregandoListas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [processandoId, setProcessandoId] = useState(null);
  const [convites, setConvites] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [fazendaNome, setFazendaNome] = useState("");
  const [tipoConta, setTipoConta] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [editApelido, setEditApelido] = useState("");

  const emailNormalizado = useMemo(() => email.trim().toLowerCase(), [email]);
  const tipoContaNormalizada = useMemo(
    () => (tipoConta ? String(tipoConta).trim().toUpperCase() : null),
    [tipoConta]
  );
  const isAssistenteTecnico = tipoContaNormalizada === "ASSISTENTE_TECNICO";
  const modoConsultor = isAssistenteTecnico && Boolean(fazendaAtualId);

  const conviteBloqueado =
    enviando ||
    carregandoPerfil ||
    !fazendaAtualId ||
    !emailNormalizado ||
    !validarEmail(emailNormalizado);

  const avisoConvite =
    !carregandoPerfil && !fazendaAtualId
      ? "Selecione uma fazenda antes de enviar convites."
      : "";

  const carregarListas = useCallback(async (fazendaIdAtual) => {
    if (!fazendaIdAtual) {
      setConvites([]);
      setAcessos([]);
      return;
    }
    setCarregandoListas(true);

    try {
      const [convitesData, acessosData] = await Promise.all([
        listarConvitesPendentesProdutor(fazendaIdAtual),
        listAcessosDaFazenda(fazendaIdAtual),
      ]);

      setConvites(convitesData ?? []);
      setAcessos(acessosData ?? []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao carregar acessos:", error?.message);
      }
      toast.error(error?.message || "Não foi possível carregar os acessos.");
    } finally {
      setCarregandoListas(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function carregarPerfil() {
      setCarregandoPerfil(true);

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          throw authError;
        }

        const user = authData?.user;
        if (!user || !isMounted) {
          return;
        }

        const { data: perfilData, error: perfilError } = await supabase
          .from("profiles")
          .select("tipo_conta")
          .eq("id", user.id)
          .maybeSingle();

        if (perfilError && import.meta.env.DEV) {
          console.warn("Erro ao carregar tipo de conta:", perfilError.message);
        }

        const tipoContaRaw =
          perfilData?.tipo_conta ??
          user.user_metadata?.tipo_conta ??
          user.user_metadata?.tipoConta;

        if (isMounted) {
          setTipoConta(
            tipoContaRaw ? String(tipoContaRaw).trim().toUpperCase() : "PRODUTOR"
          );
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("Erro ao carregar dados do produtor:", err.message);
        }
      } finally {
        if (isMounted) {
          setCarregandoPerfil(false);
        }
      }
    }

    carregarPerfil();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function carregarFazenda() {
      if (!fazendaAtualId) {
        if (isMounted) {
          setFazendaNome("");
        }
        return;
      }

      const { data, error } = await supabase
        .from("fazendas")
        .select("id, nome")
        .eq("id", fazendaAtualId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        if (import.meta.env.DEV) {
          console.warn("Erro ao carregar fazenda:", error.message);
        }
        setFazendaNome("");
        return;
      }

      setFazendaNome(data?.nome ?? "");
    }

    carregarFazenda();

    return () => {
      isMounted = false;
    };
  }, [fazendaAtualId]);

  useEffect(() => {
    if (fazendaAtualId) {
      carregarListas(fazendaAtualId);
    }
  }, [carregarListas, fazendaAtualId]);

  useEffect(() => {
    if (modoConsultor) {
      navigate("/inicio", { replace: true });
    }
  }, [modoConsultor, navigate]);

  async function handleConvidar(event) {
    event.preventDefault();

    if (!emailNormalizado || !validarEmail(emailNormalizado)) {
      toast.error("Informe um e-mail válido para o profissional.");
      return;
    }

    if (enviando) {
      return;
    }

    if (!fazendaAtualId) {
      toast.error("Selecione uma fazenda antes de enviar o convite.");
      return;
    }

    try {
      setEnviando(true);

      const { data: conviteExistente, error: conviteError } = await supabase
        .from("convites_acesso")
        .select("id")
        .eq("fazenda_id", fazendaAtualId)
        .eq("email_convidado", emailNormalizado)
        .eq("status", "pendente")
        .limit(1)
        .maybeSingle();

      if (conviteError) {
        throw conviteError;
      }

      if (conviteExistente?.id) {
        toast.info("Convite pendente já enviado para este e-mail.");
        return;
      }

      await criarConvite(fazendaAtualId, emailNormalizado, {
        nomeProfissional: profissionalNome?.trim() || null,
      });

      setEmail("");
      setProfissionalNome("");
      toast.success("Convite enviado! O profissional verá ao acessar.");
      await carregarListas(fazendaAtualId);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Erro ao enviar convite:", err.message);
      }
      toast.error(err.message || "Não foi possível enviar o convite.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleCancelar(convite) {
    if (!fazendaAtualId) return;

    try {
      setProcessandoId(`cancelar-${convite.id}`);
      const { error } = await supabase
        .from("convites_acesso")
        .delete()
        .eq("id", convite.id);

      if (error) {
        throw error;
      }

      toast.success("Convite cancelado.");
      await carregarListas(fazendaAtualId);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Erro ao cancelar convite:", err.message);
      }
      toast.error(err.message || "Não foi possível cancelar o convite.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleRemover(acesso) {
    if (!fazendaAtualId) return;

    try {
      setProcessandoId(`remover-${acesso.id}`);
      const { error } = await supabase
        .from("fazenda_acessos")
        .delete()
        .eq("id", acesso.id);

      if (error) {
        throw error;
      }

      toast.success("Acesso revogado com sucesso.");
      await carregarListas(fazendaAtualId);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Erro ao remover acesso:", err.message);
      }
      toast.error(err.message || "Não foi possível remover o acesso.");
    } finally {
      setProcessandoId(null);
    }
  }

  function iniciarEdicao(acesso) {
    setEditandoId(acesso.id);
    setEditApelido(acesso.nome_profissional ?? "");
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditApelido("");
  }

  async function salvarEdicao(acesso) {
    if (!fazendaAtualId) return;

    try {
      setProcessandoId(`editar-${acesso.id}`);
      const { error } = await supabase
        .from("fazenda_acessos")
        .update({
          nome_profissional: editApelido?.trim() || null,
        })
        .eq("id", acesso.id);

      if (error) {
        throw error;
      }

      toast.success("Acesso atualizado.");
      cancelarEdicao();
      await carregarListas(fazendaAtualId);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Erro ao atualizar acesso:", err.message);
      }
      toast.error(err.message || "Não foi possível atualizar o acesso.");
    } finally {
      setProcessandoId(null);
    }
  }

  if (modoConsultor) {
    return (
      <div style={styles.page}>
        <section style={styles.card}>
          <h1 style={styles.title}>Acesso restrito ao proprietário</h1>
          <p style={styles.subtitle}>
            O modo consultor não possui permissão para acessar os Ajustes.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Acesso profissional</h1>
        <p style={styles.subtitle}>
          Convide profissionais e acompanhe os acessos ativos da fazenda.
        </p>
        {fazendaNome && <p style={styles.helperText}>Fazenda atual: {fazendaNome}</p>}
      </div>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Convite rápido</h2>
          <span style={styles.cardDescription}>
            Compartilhe o acesso à fazenda selecionada.
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

          <label style={styles.label}>
            Nome/Apelido (opcional)
            <input
              type="text"
              placeholder="Ex: Dra. Ana"
              value={profissionalNome}
              onChange={(event) => setProfissionalNome(event.target.value)}
              style={styles.input}
            />
          </label>

          <button type="submit" style={styles.primaryButton} disabled={conviteBloqueado}>
            {enviando ? "Enviando..." : "Convidar"}
          </button>
        </form>

        {carregandoPerfil && (
          <p style={styles.helperText}>Carregando informações da fazenda...</p>
        )}
        {!carregandoPerfil && avisoConvite && (
          <p style={styles.warningText}>{avisoConvite}</p>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Convites pendentes</h2>
          <span style={styles.sectionSubtitle}>Envios aguardando aceite.</span>
        </div>

        {carregandoListas ? (
          <p style={styles.helperText}>Carregando convites...</p>
        ) : convites.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>Nenhum convite pendente.</p>
            <span style={styles.emptyDescription}>
              Convide um profissional para começar.
            </span>
          </div>
        ) : (
          <div style={styles.list}>
            {convites.map((convite) => (
              <div key={convite.id} style={styles.listItem}>
                <div style={styles.listInfo}>
                  <span style={styles.listTitle}>
                    {convite.email_convidado || "E-mail não disponível"}
                  </span>
                  <span style={styles.listMeta}>
                    {convite.nome_profissional
                      ? `Apelido: ${convite.nome_profissional}`
                      : "Apelido não informado"}
                  </span>
                  <span style={styles.listMeta}>
                    Enviado em {formatarData(convite.created_at)}
                  </span>
                </div>
                <div style={styles.listActions}>
                  <span style={{ ...styles.status, ...styles.statuswarning }}>
                    Pendente
                  </span>
                  <button
                    type="button"
                    style={styles.ghostButton}
                    onClick={() => handleCancelar(convite)}
                    disabled={processandoId === `cancelar-${convite.id}`}
                  >
                    {processandoId === `cancelar-${convite.id}`
                      ? "Cancelando..."
                      : "Cancelar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Acessos ativos</h2>
          <span style={styles.sectionSubtitle}>Profissionais com acesso liberado.</span>
        </div>

        {carregandoListas ? (
          <p style={styles.helperText}>Carregando acessos...</p>
        ) : acessos.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>Nenhum acesso ativo no momento.</p>
            <span style={styles.emptyDescription}>
              Quando o profissional aceitar, ele aparecerá aqui.
            </span>
          </div>
        ) : (
          <div style={styles.list}>
            {acessos.map((acesso) => {
              const nomeCompleto =
                acesso.profiles?.full_name || acesso.profiles?.email || "Sem nome";
              const emailContato = acesso.profiles?.email || "Sem e-mail";
              const emEdicao = editandoId === acesso.id;

              return (
                <div key={acesso.id} style={styles.listItem}>
                  <div style={styles.listInfo}>
                    <span style={styles.listTitle}>
                      {nomeCompleto} • {emailContato}
                    </span>
                    {!emEdicao ? (
                      <>
                        <span style={styles.listMeta}>
                          {formatarTipoProfissional(acesso)}
                          {acesso.nome_profissional
                            ? ` • ${acesso.nome_profissional}`
                            : " • Apelido não informado"}
                        </span>
                        <span style={styles.listMeta}>
                          Acesso ativo desde {formatarData(acesso.created_at)}
                        </span>
                      </>
                    ) : (
                      <div style={styles.editFields}>
                        <div style={styles.editField}>
                          <span style={styles.editLabel}>Apelido</span>
                          <input
                            type="text"
                            placeholder="Apelido"
                            value={editApelido}
                            onChange={(event) => setEditApelido(event.target.value)}
                            style={styles.input}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={styles.listActions}>
                    <span style={{ ...styles.status, ...styles.statussuccess }}>Ativo</span>
                    {emEdicao ? (
                      <>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => salvarEdicao(acesso)}
                          disabled={processandoId === `editar-${acesso.id}`}
                        >
                          {processandoId === `editar-${acesso.id}`
                            ? "Salvando..."
                            : "Salvar"}
                        </button>
                        <button
                          type="button"
                          style={styles.ghostButton}
                          onClick={cancelarEdicao}
                          disabled={processandoId === `editar-${acesso.id}`}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => iniciarEdicao(acesso)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          style={styles.ghostButton}
                          onClick={() => handleRemover(acesso)}
                          disabled={processandoId === `remover-${acesso.id}`}
                        >
                          {processandoId === `remover-${acesso.id}`
                            ? "Revogando..."
                            : "Revogar"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function validarEmail(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function formatarTipoProfissional(acesso) {
  const tipoConta = acesso?.profiles?.tipo_conta;
  if (tipoConta) {
    return `Perfil: ${formatarTipoConta(tipoConta)}`;
  }

  const permissoes = acesso?.permissoes;
  if (Array.isArray(permissoes) && permissoes.length) {
    return `Permissões: ${permissoes.join(", ")}`;
  }

  if (typeof permissoes === "string" && permissoes.trim()) {
    return `Permissões: ${permissoes}`;
  }

  return "Perfil não informado";
}

function formatarTipoConta(valor) {
  return String(valor)
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
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
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    alignItems: "end",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#1f2937",
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
    height: 42,
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
  ghostButton: {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#475569",
    fontWeight: 600,
    padding: "8px 14px",
    cursor: "pointer",
  },
  helperText: {
    margin: 0,
    fontSize: 12,
    color: "#94a3b8",
  },
  warningText: {
    margin: 0,
    fontSize: 12,
    color: "#b45309",
    fontWeight: 600,
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
    gap: 6,
    flex: 1,
    minWidth: 240,
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
    gap: 10,
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
  editFields: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  },
  editField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  editLabel: {
    fontSize: 12,
    color: "#475569",
    fontWeight: 600,
  },
};
