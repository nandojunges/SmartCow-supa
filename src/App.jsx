// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { supabase } from "./lib/supabaseClient";
import { syncAnimaisSeed, syncPending } from "./offline/sync";
import { useFazenda } from "./context/FazendaContext";
import { useFarmSelection } from "./hooks/useFarmSelection";

// Telas
import Login from "./Auth/Login";
import Cadastro from "./Auth/Cadastro";
import VerificarEmail from "./Auth/VerificarEmail";
import EsqueciSenha from "./Auth/EsqueciSenha";
import SistemaBase from "./layout/SistemaBase";

// Páginas
import Inicio from "./Pages/Inicio/Inicio.jsx";
import Animais from "./Pages/Animais/Animais.jsx";
import Bezerras from "./Pages/Bezerras/Bezerras.jsx";
import Reproducao from "./Pages/Reproducao/Reproducao.jsx";
import Leite from "./Pages/Leite/Leite.jsx";
import Saude from "./Pages/Saude/Saude.jsx";
import ConsumoReposicao from "./Pages/ConsumoReposicao/ConsumoReposicao.jsx";
import Financeiro from "./Pages/Financeiro/Financeiro.jsx";
import Calendario from "./Pages/Calendario/Calendario.jsx";
import Ajustes from "./Pages/Ajustes/Ajustes.jsx";
import Admin from "./Pages/Admin/Admin.jsx";
import TecnicoHome from "./Pages/Tecnico/TecnicoHome.jsx";

export default function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const { hasFazendaAtual } = useFazenda();

  // Ouve sessão do Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      syncPending();
      syncAnimaisSeed();
    };

    if (navigator.onLine) {
      handleOnline();
    }

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let isMounted = true;
    setProfileLoading(true);

    supabase
      .from("profiles")
      .select("id, tipo_conta, role")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn("Erro ao carregar perfil:", error.message);
        }
        setProfile(data ?? null);
        setProfileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  const tipoContaRaw =
    profile?.tipo_conta ??
    session?.user?.user_metadata?.tipo_conta ??
    session?.user?.user_metadata?.tipoConta;
  const tipoConta = tipoContaRaw ? String(tipoContaRaw).trim().toUpperCase() : "PRODUTOR";
  const isAssistenteTecnico = tipoConta === "ASSISTENTE_TECNICO";
  const hasFazendaSelecionada = hasFazendaAtual;

  const { fazendas, mostrarSeletor, selecionarFazenda, loading: fazendasLoading } =
    useFarmSelection({
      userId: session?.user?.id,
      tipoConta,
      onSelect: () => {
        navigate("/inicio", { replace: true });
      },
      onError: () => {
        toast.error("Não foi possível localizar suas fazendas.");
      },
    });

  if (loading) {
    return null; // ou um spinner de "Carregando..."
  }

  return (
    <>
      <Routes>
        {/* 🔓 ROTAS PÚBLICAS (sem login) */}
        {!session && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/verificar-email" element={<VerificarEmail />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />

            {/* qualquer outra rota cai no /login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}

        {/* 🔐 ROTAS PROTEGIDAS (com login) */}
        {session && (
          <>
            {/* redireciona "/" para /inicio por padrão */}
            <Route path="/" element={<Navigate to="/inicio" replace />} />

            {/* 🟥 ADMIN FORA DO LAYOUT (sem menu azul) */}
            <Route path="/admin" element={<Admin />} />

            {/* 🟦 DEMAIS PÁGINAS DENTRO DO SISTEMABASE (com menu azul) */}
            <Route element={<SistemaBase tipoConta={tipoConta} />}>
              <Route
                element={
                <AssistenteGuard
                  isAssistenteTecnico={isAssistenteTecnico}
                  hasFazendaSelecionada={hasFazendaSelecionada}
                  loading={profileLoading}
                  isProdutor={tipoConta === "PRODUTOR"}
                  selecionandoFazenda={fazendasLoading || mostrarSeletor}
                />
              }
            >
                <Route path="/inicio" element={<Inicio />} />
                <Route path="/animais" element={<Animais />} />
                <Route path="/bezerras" element={<Bezerras />} />
                <Route path="/reproducao" element={<Reproducao />} />
                <Route path="/leite" element={<Leite />} />
                <Route path="/saude" element={<Saude />} />
                <Route path="/consumo" element={<ConsumoReposicao />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/ajustes" element={<Ajustes />} />
              </Route>
              <Route path="/tecnico" element={<TecnicoHome />} />

              {/* qualquer rota desconhecida volta para /inicio */}
              <Route path="*" element={<Navigate to="/inicio" replace />} />
            </Route>
          </>
        )}
      </Routes>
      {mostrarSeletor && (
        <SelecaoFazendaModal
          fazendas={fazendas}
          onSelecionar={(fazendaId) => {
            selecionarFazenda(fazendaId);
          }}
        />
      )}
      <ToastContainer position="top-right" autoClose={3500} pauseOnFocusLoss={false} />
    </>
  );
}

function AssistenteGuard({
  isAssistenteTecnico,
  hasFazendaSelecionada,
  loading,
  isProdutor,
  selecionandoFazenda,
}) {
  useEffect(() => {
    if (loading) {
      return;
    }
    if (isAssistenteTecnico && !hasFazendaSelecionada) {
      toast.info("Selecione uma fazenda para acessar.");
    }
  }, [hasFazendaSelecionada, isAssistenteTecnico, loading]);

  if (loading || (isProdutor && selecionandoFazenda)) {
    return null;
  }

  if (isAssistenteTecnico && !hasFazendaSelecionada) {
    return <Navigate to="/tecnico" replace />;
  }

  return <Outlet />;
}

function SelecaoFazendaModal({ fazendas, onSelecionar }) {
  const [selecionada, setSelecionada] = useState(fazendas?.[0]?.id ?? "");

  useEffect(() => {
    setSelecionada(fazendas?.[0]?.id ?? "");
  }, [fazendas]);

  if (!fazendas?.length) {
    return null;
  }

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.card}>
        <h2 style={modalStyles.title}>Selecione a fazenda</h2>
        <p style={modalStyles.subtitle}>
          Escolha qual fazenda deseja acessar agora.
        </p>
        <select
          style={modalStyles.select}
          value={selecionada}
          onChange={(event) => setSelecionada(event.target.value)}
        >
          {fazendas.map((fazenda) => (
            <option key={fazenda.id} value={fazenda.id}>
              {fazenda.nome || `Fazenda ${fazenda.id}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          style={modalStyles.button}
          onClick={() => onSelecionar(selecionada)}
          disabled={!selecionada}
        >
          Acessar
        </button>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 12px 40px rgba(15, 23, 42, 0.2)",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: "#64748b",
  },
  select: {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: "10px 12px",
    fontSize: 14,
  },
  button: {
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    padding: "10px 14px",
    cursor: "pointer",
  },
};
