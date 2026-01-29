// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { supabase } from "./lib/supabaseClient";
import { syncAnimaisSeed, syncPending } from "./offline/sync";
import { useFazenda } from "./context/FazendaContext";

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
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const { hasFazendaAtiva } = useFazenda();

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
  const hasFazendaSelecionada = hasFazendaAtiva;

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
      <ToastContainer position="top-right" autoClose={3500} pauseOnFocusLoss={false} />
    </>
  );
}

function AssistenteGuard({ isAssistenteTecnico, hasFazendaSelecionada, loading }) {
  if (loading) {
    return null;
  }

  if (isAssistenteTecnico && !hasFazendaSelecionada) {
    return <Navigate to="/tecnico" replace />;
  }

  return <Outlet />;
}
