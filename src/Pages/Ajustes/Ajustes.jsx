import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useFazenda } from "../../context/FazendaContext";

const HUB_ITEMS = [
  {
    id: "perfil",
    title: "Perfil do produtor",
    description: "Atualize seus dados pessoais e preferências de conta.",
    route: "/ajustes/perfil",
  },
  {
    id: "fazendas",
    title: "Fazendas",
    description: "Gerencie as informações e cadastros das fazendas.",
    route: "/ajustes/fazendas",
  },
  {
    id: "acessos",
    title: "Acesso profissional",
    description: "Convide técnicos e acompanhe quem possui acesso.",
    route: "/ajustes/acessos",
  },
  {
    id: "aparencia",
    title: "Aparência",
    description: "Personalize a experiência visual do sistema.",
    route: "/ajustes/aparencia",
    badge: "Em breve",
  },
  {
    id: "idioma",
    title: "Idioma",
    description: "Escolha o idioma principal para navegar.",
    route: "/ajustes/idioma",
    badge: "Em breve",
  },
  {
    id: "notificacoes",
    title: "Notificações",
    description: "Defina alertas e lembretes do dia a dia.",
    route: "/ajustes/notificacoes",
    badge: "Em breve",
  },
];

export default function Ajustes() {
  const navigate = useNavigate();
  const { fazendaAtualId } = useFazenda();
  const [tipoConta, setTipoConta] = useState(null);
  const [fazendaNome, setFazendaNome] = useState("");

  const tipoContaNormalizada = useMemo(
    () => (tipoConta ? String(tipoConta).trim().toUpperCase() : null),
    [tipoConta]
  );
  const isAssistenteTecnico = tipoContaNormalizada === "ASSISTENTE_TECNICO";

  useEffect(() => {
    let isMounted = true;

    async function carregarPerfil() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          throw authError;
        }

        const user = authData?.user;
        if (!user) {
          return;
        }

        const { data: perfilData } = await supabase
          .from("profiles")
          .select("tipo_conta")
          .eq("id", user.id)
          .maybeSingle();

        const tipoContaRaw =
          perfilData?.tipo_conta ??
          user.user_metadata?.tipo_conta ??
          user.user_metadata?.tipoConta;

        if (isMounted) {
          setTipoConta(
            tipoContaRaw ? String(tipoContaRaw).trim().toUpperCase() : "PRODUTOR"
          );
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Erro ao carregar perfil:", error?.message);
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

  if (isAssistenteTecnico) {
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
        <h1 style={styles.title}>Ajustes</h1>
        <p style={styles.subtitle}>
          Centralize as configurações da sua propriedade e da sua conta.
        </p>
        {fazendaNome && <p style={styles.helperText}>Fazenda atual: {fazendaNome}</p>}
        {!fazendaNome && (
          <p style={styles.warningText}>
            Nenhuma fazenda selecionada. Escolha uma fazenda para configurar acessos.
          </p>
        )}
      </div>

      <section style={styles.hubGrid}>
        {HUB_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            style={styles.hubCard}
            onClick={() => navigate(item.route)}
          >
            <div style={styles.hubCardHeader}>
              <h2 style={styles.hubTitle}>{item.title}</h2>
              {item.badge && <span style={styles.badge}>{item.badge}</span>}
            </div>
            <p style={styles.hubDescription}>{item.description}</p>
            <span style={styles.hubAction}>Abrir configurações</span>
          </button>
        ))}
      </section>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
  },
  helperText: {
    margin: 0,
    fontSize: 12,
    color: "#64748b",
  },
  warningText: {
    margin: 0,
    fontSize: 12,
    color: "#b45309",
    fontWeight: 600,
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
  hubGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  hubCard: {
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    padding: 18,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    boxShadow: "0 1px 6px rgba(15, 23, 42, 0.05)",
  },
  hubCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
  },
  hubTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
  },
  hubDescription: {
    margin: 0,
    fontSize: 13,
    color: "#64748b",
  },
  hubAction: {
    marginTop: "auto",
    fontSize: 12,
    fontWeight: 600,
    color: "#2563eb",
  },
  badge: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid #fde68a",
  },
};
