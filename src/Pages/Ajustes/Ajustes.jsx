// src/pages/Ajustes.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import { supabase } from "../../lib/supabaseClient";
import { listAcessosDaFazenda } from "../../lib/fazendaHelpers";
import {
  criarConvite,
  ensureFazendaDoProdutor,
  listarConvitesPendentesProdutor,
} from "../../services/acessos";

const PROFISSIONAIS_OPTIONS = [
  { value: "Veterinário (Reprodução)", label: "Veterinário (Reprodução)" },
  { value: "Veterinário (Clínica)", label: "Veterinário (Clínica)" },
  { value: "Nutricionista", label: "Nutricionista" },
  { value: "Agrônomo", label: "Agrônomo" },
  { value: "Técnico de Campo", label: "Técnico de Campo" },
  { value: "Consultor", label: "Consultor" },
  { value: "Outro", label: "Outro" },
];

const selectStyles = {
  control: (base) => ({
    ...base,
    borderRadius: 12,
    borderColor: "#e2e8f0",
    minHeight: 42,
    boxShadow: "none",
    fontSize: 14,
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    overflow: "hidden",
    fontSize: 14,
  }),
};

export default function Ajustes() {
  const [email, setEmail] = useState("");
  const [profissionalTipo, setProfissionalTipo] = useState(null);
  const [profissionalNome, setProfissionalNome] = useState("");
  const [fazendas, setFazendas] = useState([]);
  const [fazendaAtiva, setFazendaAtiva] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoListas, setCarregandoListas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [processandoId, setProcessandoId] = useState(null);
  const [convites, setConvites] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [avisoSemFazenda, setAvisoSemFazenda] = useState("");

  const emailNormalizado = useMemo(() => email.trim().toLowerCase(), [email]);
  const fazendaId = fazendaAtiva?.id ?? null;
  const fazendaNome = fazendaAtiva?.nome ?? "";

  const carregarListas = useCallback(async (fazendaIdAtual) => {
    if (!fazendaIdAtual) return;
    setCarregandoListas(true);

    try {
      const [convitesData, acessosData] = await Promise.all([
        listarConvitesPendentesProdutor(fazendaIdAtual),
        listAcessosDaFazenda(fazendaIdAtual),
      ]);
      const userIds = acessosData.map((acesso) => acesso.user_id).filter(Boolean);
      let perfis = [];

      if (userIds.length > 0) {
        const { data: perfisData, error: perfisError } = await supabase
          .from("profiles")
          .select("id, email, tipo_conta")
          .in("id", userIds);

        if (perfisError) {
          throw perfisError;
        }

        perfis = perfisData ?? [];
      }

      const perfisMap = new Map(perfis.map((perfil) => [perfil.id, perfil]));

      const acessosComPerfil = acessosData.map((acesso) => {
        const perfil = perfisMap.get(acesso.user_id);
        return {
          ...acesso,
          email: perfil?.email ?? "",
          tipo_conta: perfil?.tipo_conta ?? "",
        };
      });

      setConvites(convitesData ?? []);
      setAcessos(acessosComPerfil);
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
    if (!fazendaAtiva && fazendas.length > 0) {
      setFazendaAtiva(fazendas[0]);
    }
  }, [fazendaAtiva, fazendas]);

  useEffect(() => {
    let isMounted = true;

    async function carregarPerfil() {
      setCarregando(true);
      setAvisoSemFazenda("");

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          throw authError;
        }

        const user = authData?.user;
        if (!user) {
          return;
        }

        const { fazenda, fazendas: fazendasOrdenadas } = await ensureFazendaDoProdutor(
          user.id
        );

        if (isMounted) {
          setFazendas(fazendasOrdenadas ?? []);
          setFazendaAtiva(fazenda);
          setAvisoSemFazenda(
            fazendasOrdenadas?.length
              ? ""
              : "Nenhuma fazenda encontrada para este usuário. Cadastre uma fazenda primeiro."
          );
          setUsuario(user);
        }

        await carregarListas(fazenda?.id ?? null);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("Erro ao carregar dados do produtor:", err.message);
        }
        toast.error(err.message || "Não foi possível carregar seus dados.");
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
  }, [carregarListas]);

  const convitesPendentes = useMemo(
    () =>
      convites.filter(
        (convite) => (convite.status ?? "pendente").toLowerCase() === "pendente"
      ),
    [convites]
  );

  const acessosAtivos = useMemo(() => acessos, [acessos]);

  const conviteBloqueado =
    enviando ||
    carregando ||
    !fazendaId ||
    !emailNormalizado ||
    !validarEmail(emailNormalizado);

  const avisoConvite =
    !carregando && !fazendaId
      ? "Defina uma fazenda antes de enviar convites."
      : "";

  async function handleConvidar(event) {
    event.preventDefault();

    if (!emailNormalizado || !validarEmail(emailNormalizado)) {
      toast.error("Informe um e-mail válido para o profissional.");
      return;
    }

    if (enviando) {
      return;
    }

    try {
      if (!usuario?.id) {
        toast.error("Não foi possível validar o usuário logado.");
        return;
      }

      setEnviando(true);
      let fazendaIdAtual = fazendaId;

      if (!fazendaIdAtual) {
        const { fazenda, fazendas: fazendasAtualizadas } =
          await ensureFazendaDoProdutor(usuario.id);
        fazendaIdAtual = fazenda?.id ?? null;

        if (!fazendaIdAtual) {
          toast.error("Não foi possível criar a fazenda para enviar o convite.");
          return;
        }

        setFazendas(fazendasAtualizadas ?? []);
        setFazendaAtiva(fazenda);
      }

      const { data: conviteExistente, error: conviteError } = await supabase
        .from("convites_acesso")
        .select("id")
        .eq("fazenda_id", fazendaIdAtual)
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

      await criarConvite(fazendaIdAtual, emailNormalizado);

      setEmail("");
      setProfissionalTipo(null);
      setProfissionalNome("");
      toast.success("Convite enviado! O profissional verá ao acessar.");
      await carregarListas(fazendaIdAtual);
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
    if (!fazendaId) return;

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
      await carregarListas(fazendaId);
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
    if (!fazendaId) return;

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
      await carregarListas(fazendaId);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Erro ao remover acesso:", err.message);
      }
      toast.error(err.message || "Não foi possível remover o acesso.");
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Ajustes do produtor</h1>
        <p style={styles.subtitle}>
          Gerencie quem pode acessar seus dados e acompanhar sua fazenda.
        </p>
        {fazendaNome && <p style={styles.helperText}>Fazenda atual: {fazendaNome}</p>}
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

          <label style={styles.label}>
            Tipo do profissional
            <Select
              styles={selectStyles}
              placeholder="Selecione..."
              options={PROFISSIONAIS_OPTIONS}
              value={profissionalTipo}
              onChange={setProfissionalTipo}
              isClearable
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

        {carregando && (
          <p style={styles.helperText}>Carregando informações da fazenda...</p>
        )}
        {!carregando && avisoSemFazenda && (
          <p style={styles.warningText}>{avisoSemFazenda}</p>
        )}
        {!carregando && !avisoSemFazenda && avisoConvite && (
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
        ) : convitesPendentes.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>Nenhum convite pendente.</p>
            <span style={styles.emptyDescription}>
              Convide um profissional para começar.
            </span>
          </div>
        ) : (
          <div style={styles.list}>
            {convitesPendentes.map((convite) => (
              <div key={convite.id} style={styles.listItem}>
                <div style={styles.listInfo}>
                  <span style={styles.listTitle}>
                    {convite.email_convidado || "E-mail não disponível"}
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
        ) : acessosAtivos.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>Nenhum acesso ativo no momento.</p>
            <span style={styles.emptyDescription}>
              Quando o profissional aceitar, ele aparecerá aqui.
            </span>
          </div>
        ) : (
          <div style={styles.list}>
            {acessosAtivos.map((acesso) => (
              <div key={acesso.id} style={styles.listItem}>
                <div style={styles.listInfo}>
                  <span style={styles.listTitle}>
                    {acesso.email || "E-mail não disponível"}
                  </span>
                  <span style={styles.listMeta}>
                    Acesso ativo desde {formatarData(acesso.created_at)}
                  </span>
                </div>
                <div style={styles.listActions}>
                  <span style={{ ...styles.status, ...styles.statussuccess }}>Ativo</span>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

function validarEmail(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
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
  statusdanger: {
    background: "#fef2f2",
    color: "#991b1b",
    borderColor: "#fecaca",
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
};
