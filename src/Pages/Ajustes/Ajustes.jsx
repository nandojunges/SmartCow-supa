import { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import { supabase } from "../../lib/supabaseClient";
import { useFazenda } from "../../context/FazendaContext";
import { listAcessosDaFazenda } from "../../lib/fazendaHelpers";
import { criarConvite, listarConvitesPendentesProdutor } from "../../services/acessos";
import "./Ajustes.css";

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
  const { fazendaAtualId } = useFazenda();
  const [tipoConta, setTipoConta] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [perfilNome, setPerfilNome] = useState("");
  const [perfilNomeEdit, setPerfilNomeEdit] = useState("");
  const [fazendaNome, setFazendaNome] = useState("");
  const [fazendaNomeEdit, setFazendaNomeEdit] = useState("");
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [salvandoGerais, setSalvandoGerais] = useState(false);

  const [acessos, setAcessos] = useState([]);
  const [convites, setConvites] = useState([]);
  const [carregandoAcessos, setCarregandoAcessos] = useState(false);
  const [processandoId, setProcessandoId] = useState(null);

  const [modalConviteAberto, setModalConviteAberto] = useState(false);
  const [emailConvite, setEmailConvite] = useState("");
  const [profissionalTipo, setProfissionalTipo] = useState(null);
  const [profissionalNome, setProfissionalNome] = useState("");
  const [enviandoConvite, setEnviandoConvite] = useState(false);

  const tipoContaNormalizada = useMemo(
    () => (tipoConta ? String(tipoConta).trim().toUpperCase() : null),
    [tipoConta]
  );
  const isAssistenteTecnico = tipoContaNormalizada === "ASSISTENTE_TECNICO";
  const fazendaAtiva = Boolean(fazendaNome);

  const emailConviteNormalizado = useMemo(
    () => emailConvite.trim().toLowerCase(),
    [emailConvite]
  );

  const ajustesAlterados = useMemo(() => {
    return (
      perfilNomeEdit.trim() !== perfilNome ||
      fazendaNomeEdit.trim() !== fazendaNome
    );
  }, [fazendaNome, fazendaNomeEdit, perfilNome, perfilNomeEdit]);

  const carregarAcessos = useCallback(async (fazendaIdAtual) => {
    if (!fazendaIdAtual) {
      setAcessos([]);
      setConvites([]);
      return;
    }

    setCarregandoAcessos(true);
    try {
      const [acessosData, convitesData] = await Promise.all([
        listAcessosDaFazenda(fazendaIdAtual),
        listarConvitesPendentesProdutor(fazendaIdAtual),
      ]);

      setAcessos(acessosData ?? []);
      setConvites(convitesData ?? []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao carregar acessos:", error?.message);
      }
      toast.error(error?.message || "Não foi possível carregar os acessos.");
    } finally {
      setCarregandoAcessos(false);
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
        if (!user) {
          return;
        }

        const { data: perfilData, error: perfilError } = await supabase
          .from("profiles")
          .select("tipo_conta, full_name")
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
          setUserId(user.id);
          setUserEmail(user.email ?? "");
          setPerfilNome(perfilData?.full_name ?? "");
          setPerfilNomeEdit(perfilData?.full_name ?? "");
          setTipoConta(
            tipoContaRaw ? String(tipoContaRaw).trim().toUpperCase() : "PRODUTOR"
          );
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Erro ao carregar perfil:", error?.message);
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
          setFazendaNomeEdit("");
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
        setFazendaNomeEdit("");
        return;
      }

      setFazendaNome(data?.nome ?? "");
      setFazendaNomeEdit(data?.nome ?? "");
    }

    carregarFazenda();

    return () => {
      isMounted = false;
    };
  }, [fazendaAtualId]);

  useEffect(() => {
    if (fazendaAtualId) {
      carregarAcessos(fazendaAtualId);
    } else {
      setAcessos([]);
      setConvites([]);
    }
  }, [carregarAcessos, fazendaAtualId]);

  async function handleSalvarGerais() {
    if (!userId || salvandoGerais) {
      return;
    }

    const nomeProdutor = perfilNomeEdit.trim();
    const nomeFazenda = fazendaNomeEdit.trim();

    if (!nomeProdutor) {
      toast.error("Informe o nome do produtor para salvar.");
      return;
    }

    if (fazendaAtualId && !nomeFazenda) {
      toast.error("Informe o nome da fazenda para salvar.");
      return;
    }

    try {
      setSalvandoGerais(true);
      const updates = [];

      if (nomeProdutor !== perfilNome) {
        updates.push(
          supabase
            .from("profiles")
            .update({ full_name: nomeProdutor })
            .eq("id", userId)
        );
      }

      if (fazendaAtualId && nomeFazenda !== fazendaNome) {
        updates.push(
          supabase
            .from("fazendas")
            .update({ nome: nomeFazenda })
            .eq("id", fazendaAtualId)
        );
      }

      const results = await Promise.all(updates);
      const erro = results.find((result) => result.error)?.error;

      if (erro) {
        throw erro;
      }

      setPerfilNome(nomeProdutor);
      setPerfilNomeEdit(nomeProdutor);
      setFazendaNome(nomeFazenda);
      setFazendaNomeEdit(nomeFazenda);
      toast.success("Ajustes gerais atualizados.");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao salvar ajustes gerais:", error?.message);
      }
      toast.error(error?.message || "Não foi possível salvar os ajustes gerais.");
    } finally {
      setSalvandoGerais(false);
    }
  }

  async function handleConvidarProfissional(event) {
    event.preventDefault();

    if (!fazendaAtualId) {
      toast.error("Selecione uma fazenda antes de enviar o convite.");
      return;
    }

    if (!emailConviteNormalizado || !validarEmail(emailConviteNormalizado)) {
      toast.error("Informe um e-mail válido para o profissional.");
      return;
    }

    if (enviandoConvite) {
      return;
    }

    try {
      setEnviandoConvite(true);

      const { data: conviteExistente, error: conviteError } = await supabase
        .from("convites_acesso")
        .select("id")
        .eq("fazenda_id", fazendaAtualId)
        .eq("email_convidado", emailConviteNormalizado)
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

      await criarConvite(fazendaAtualId, emailConviteNormalizado, {
        tipoProfissional: profissionalTipo?.value ?? null,
        nomeProfissional: profissionalNome?.trim() || null,
      });

      setEmailConvite("");
      setProfissionalTipo(null);
      setProfissionalNome("");
      toast.success("Convite enviado! O profissional verá ao acessar.");
      await carregarAcessos(fazendaAtualId);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao enviar convite:", error?.message);
      }
      toast.error(error?.message || "Não foi possível enviar o convite.");
    } finally {
      setEnviandoConvite(false);
    }
  }

  async function handleCancelarConvite(convite) {
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
      await carregarAcessos(fazendaAtualId);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao cancelar convite:", error?.message);
      }
      toast.error(error?.message || "Não foi possível cancelar o convite.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleRemoverAcesso(acesso) {
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
      await carregarAcessos(fazendaAtualId);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao remover acesso:", error?.message);
      }
      toast.error(error?.message || "Não foi possível remover o acesso.");
    } finally {
      setProcessandoId(null);
    }
  }

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

      <section className="ajustes-grid">
        <article className="ajustes-card ajustes-card--large">
          <div className="ajustes-card__header">
            <div>
              <h2>Ajustes gerais</h2>
              <p>
                Atualize rapidamente as informações básicas sem sair da página.
              </p>
            </div>
            <span className="ajustes-badge">Inline</span>
          </div>

          <div className="ajustes-fields">
            <label className="ajustes-field">
              <span>Nome do produtor</span>
              <input
                type="text"
                placeholder="Seu nome"
                value={perfilNomeEdit}
                onChange={(event) => setPerfilNomeEdit(event.target.value)}
                disabled={carregandoPerfil}
              />
            </label>
            <label className="ajustes-field">
              <span>E-mail de acesso</span>
              <input
                type="email"
                value={userEmail}
                disabled
                placeholder="E-mail principal"
              />
            </label>
            <label className="ajustes-field">
              <span>Fazenda ativa</span>
              <input
                type="text"
                placeholder="Nome da fazenda"
                value={fazendaNomeEdit}
                onChange={(event) => setFazendaNomeEdit(event.target.value)}
                disabled={!fazendaAtualId}
              />
            </label>
          </div>

          <div className="ajustes-actions">
            <button
              type="button"
              className="ajustes-button ajustes-button--primary"
              onClick={handleSalvarGerais}
              disabled={!ajustesAlterados || salvandoGerais}
            >
              {salvandoGerais ? "Salvando..." : "Salvar ajustes"}
            </button>
            {carregandoPerfil && (
              <span className="ajustes-helper">Carregando dados do produtor...</span>
            )}
            {!carregandoPerfil && !fazendaAtualId && (
              <span className="ajustes-helper">
                Selecione uma fazenda para editar o nome.
              </span>
            )}
          </div>
        </article>

        <article className="ajustes-card ajustes-card--medium">
          <div className="ajustes-card__header">
            <div>
              <h2>Acessos e permissões</h2>
              <p>Veja quem está conectado e convide novos profissionais.</p>
            </div>
            <button
              type="button"
              className="ajustes-button ajustes-button--ghost"
              onClick={() => setModalConviteAberto(true)}
              disabled={!fazendaAtualId}
            >
              Convidar profissional
            </button>
          </div>

          {!fazendaAtualId && (
            <div className="ajustes-empty">
              Selecione uma fazenda ativa para visualizar os acessos.
            </div>
          )}

          {fazendaAtualId && (
            <div className="ajustes-list">
              {carregandoAcessos ? (
                <span className="ajustes-helper">Carregando acessos...</span>
              ) : acessos.length === 0 ? (
                <div className="ajustes-empty">
                  Nenhum acesso ativo no momento. Convide um profissional para
                  começar.
                </div>
              ) : (
                acessos.map((acesso) => {
                  const nomeCompleto =
                    acesso.profiles?.full_name ||
                    acesso.profiles?.email ||
                    acesso.user_id ||
                    "Sem nome";

                  return (
                    <div key={acesso.id} className="ajustes-list__item">
                      <div>
                        <strong>{nomeCompleto}</strong>
                        <span>Acesso ativo desde {formatarData(acesso.created_at)}</span>
                      </div>
                      <button
                        type="button"
                        className="ajustes-button ajustes-button--link"
                        onClick={() => handleRemoverAcesso(acesso)}
                        disabled={processandoId === `remover-${acesso.id}`}
                      >
                        {processandoId === `remover-${acesso.id}`
                          ? "Revogando..."
                          : "Revogar"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </article>

        <article className="ajustes-card ajustes-card--small ajustes-card--disabled">
          <div className="ajustes-card__icon" aria-hidden="true">
            🎨
          </div>
          <div>
            <h2>Aparência</h2>
            <p>Personalize o visual do SmartCow em breve.</p>
          </div>
          <span className="ajustes-badge">Em breve</span>
        </article>

        <article className="ajustes-card ajustes-card--small ajustes-card--disabled">
          <div className="ajustes-card__icon" aria-hidden="true">
            🌎
          </div>
          <div>
            <h2>Idioma</h2>
            <p>Escolha o idioma ideal para a rotina da fazenda.</p>
          </div>
          <span className="ajustes-badge">Em breve</span>
        </article>

        <article className="ajustes-card ajustes-card--small ajustes-card--disabled">
          <div className="ajustes-card__icon" aria-hidden="true">
            🔔
          </div>
          <div>
            <h2>Notificações</h2>
            <p>Defina alertas rápidos para o dia a dia.</p>
          </div>
          <span className="ajustes-badge">Em breve</span>
        </article>
      </section>

      {modalConviteAberto && (
        <div
          className="ajustes-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setModalConviteAberto(false)}
        >
          <div className="ajustes-modal" onClick={(event) => event.stopPropagation()}>
            <header className="ajustes-modal__header">
              <div>
                <h3>Convidar profissional</h3>
                <p>Compartilhe o acesso da fazenda selecionada.</p>
              </div>
              <button
                type="button"
                className="ajustes-button ajustes-button--ghost"
                onClick={() => setModalConviteAberto(false)}
              >
                Fechar
              </button>
            </header>

            <form className="ajustes-modal__form" onSubmit={handleConvidarProfissional}>
              <label className="ajustes-field">
                <span>E-mail do profissional</span>
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={emailConvite}
                  onChange={(event) => setEmailConvite(event.target.value)}
                />
              </label>
              <label className="ajustes-field">
                <span>Tipo do profissional</span>
                <Select
                  styles={selectStyles}
                  placeholder="Selecione..."
                  options={PROFISSIONAIS_OPTIONS}
                  value={profissionalTipo}
                  onChange={setProfissionalTipo}
                  isClearable
                />
              </label>
              <label className="ajustes-field">
                <span>Nome/Apelido (opcional)</span>
                <input
                  type="text"
                  placeholder="Ex: Dra. Ana"
                  value={profissionalNome}
                  onChange={(event) => setProfissionalNome(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="ajustes-button ajustes-button--primary"
                disabled={
                  enviandoConvite ||
                  !fazendaAtualId ||
                  !emailConviteNormalizado ||
                  !validarEmail(emailConviteNormalizado)
                }
              >
                {enviandoConvite ? "Enviando..." : "Enviar convite"}
              </button>
            </form>

            <div className="ajustes-modal__section">
              <h4>Convites pendentes</h4>
              {carregandoAcessos ? (
                <span className="ajustes-helper">Carregando convites...</span>
              ) : convites.length === 0 ? (
                <span className="ajustes-helper">Nenhum convite pendente.</span>
              ) : (
                <div className="ajustes-list">
                  {convites.map((convite) => (
                    <div key={convite.id} className="ajustes-list__item">
                      <div>
                        <strong>
                          {convite.email_convidado || "E-mail não disponível"}
                        </strong>
                        <span>
                          {convite.tipo_profissional || "Tipo não informado"}
                          {convite.nome_profissional
                            ? ` • ${convite.nome_profissional}`
                            : " • Apelido não informado"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ajustes-button ajustes-button--link"
                        onClick={() => handleCancelarConvite(convite)}
                        disabled={processandoId === `cancelar-${convite.id}`}
                      >
                        {processandoId === `cancelar-${convite.id}`
                          ? "Cancelando..."
                          : "Cancelar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
