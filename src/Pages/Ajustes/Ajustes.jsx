import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useFazenda } from "../../context/FazendaContext";
import "./Ajustes.css";

const HUB_ITEMS = [
  {
    id: "perfil",
    title: "Perfil do produtor",
    description: "Atualize seus dados pessoais e preferências de conta.",
    route: "/ajustes/perfil",
    icon: "👤",
    size: "medium",
  },
  {
    id: "fazendas",
    title: "Fazendas",
    description: "Gerencie as informações e cadastros das fazendas.",
    route: "/ajustes/fazendas",
    icon: "🏡",
    size: "large",
  },
  {
    id: "acessos",
    title: "Acesso profissional",
    description: "Convide técnicos e acompanhe quem possui acesso.",
    route: "/ajustes/acessos",
    icon: "🧑‍🤝‍🧑",
    size: "large",
  },
  {
    id: "aparencia",
    title: "Aparência",
    description: "Personalize a experiência visual do sistema.",
    route: "/ajustes/aparencia",
    icon: "🎨",
    size: "small",
    comingSoon: true,
  },
  {
    id: "idioma",
    title: "Idioma",
    description: "Escolha o idioma principal para navegar.",
    route: "/ajustes/idioma",
    icon: "🌎",
    size: "small",
    comingSoon: true,
  },
  {
    id: "notificacoes",
    title: "Notificações",
    description: "Defina alertas e lembretes do dia a dia.",
    route: "/ajustes/notificacoes",
    icon: "🔔",
    size: "small",
    comingSoon: true,
  },
];

export default function Ajustes() {
  const navigate = useNavigate();
  const { fazendaAtualId } = useFazenda();
  const [tipoConta, setTipoConta] = useState(null);
  const [fazendaNome, setFazendaNome] = useState("");
  const [busca, setBusca] = useState("");

  const tipoContaNormalizada = useMemo(
    () => (tipoConta ? String(tipoConta).trim().toUpperCase() : null),
    [tipoConta]
  );
  const isAssistenteTecnico = tipoContaNormalizada === "ASSISTENTE_TECNICO";
  const fazendaAtiva = Boolean(fazendaNome);

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) {
      return HUB_ITEMS;
    }

    return HUB_ITEMS.filter((item) => {
      const conteudo = `${item.title} ${item.description}`.toLowerCase();
      return conteudo.includes(termo);
    });
  }, [busca]);

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
      <div className="ajustes-page">
        <section className="ajustes-restrito">
          <h1 className="ajustes-title">Acesso restrito ao proprietário</h1>
          <p className="ajustes-subtitle">
            O modo consultor não possui permissão para acessar os Ajustes.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="ajustes-page">
      <div className="ajustes-header">
        <div>
          <h1 className="ajustes-title">Ajustes</h1>
          <p className="ajustes-subtitle">
            Centralize as configurações da sua propriedade e da sua conta.
          </p>
        </div>
        <div className="ajustes-status">
          {fazendaAtiva ? (
            <span>
              Fazenda atual: <strong>{fazendaNome}</strong>
            </span>
          ) : (
            <span className="ajustes-status--warning">
              Nenhuma fazenda ativa. Alguns módulos dependem dessa seleção.
            </span>
          )}
        </div>
      </div>

      <div className="ajustes-search">
        <label className="ajustes-search__label" htmlFor="ajustes-busca">
          Localizar configuração
        </label>
        <div className="ajustes-search__field">
          <span aria-hidden="true" className="ajustes-search__icon">
            🔍
          </span>
          <input
            id="ajustes-busca"
            type="search"
            placeholder="Ex.: acesso, idioma, fazendas"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>
      </div>

      <section className="ajustes-grid">
        {itensFiltrados.map((item) => {
          const cardClassName = `ajustes-card ajustes-card--${item.size}`;
          return (
            <article
              key={item.id}
              className={`${cardClassName} ${
                item.comingSoon ? "ajustes-card--disabled" : ""
              }`}
            >
              <div className="ajustes-card__icon" aria-hidden="true">
                {item.icon}
              </div>
              <div className="ajustes-card__body">
                <div className="ajustes-card__header">
                  <h2>{item.title}</h2>
                  {item.comingSoon && <span className="ajustes-badge">Em breve</span>}
                </div>
                <p>{item.description}</p>
              </div>
              <button
                type="button"
                className="ajustes-card__action"
                disabled={item.comingSoon}
                onClick={() => navigate(item.route)}
              >
                {item.comingSoon ? "Em breve" : "Abrir"}
              </button>
            </article>
          );
        })}
      </section>

      {!itensFiltrados.length && (
        <div className="ajustes-empty">
          Nenhuma configuração encontrada. Tente outro termo.
        </div>
      )}
    </div>
  );
}
