// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import { syncAnimaisSeed, syncPending } from "./offline/sync";

// Telas
import Login from "./Auth/Login";
import Cadastro from "./Auth/Cadastro";
import VerificarEmail from "./Auth/VerificarEmail";
import EsqueciSenha from "./Auth/EsqueciSenha";
import SistemaBase from "./layout/SistemaBase";

// Páginas
import Inicio from "./pages/Inicio/Inicio.jsx";
import Animais from "./pages/Animais/Animais.jsx";
import Bezerras from "./pages/Bezerras/Bezerras.jsx";
import Reproducao from "./pages/Reproducao/Reproducao.jsx";
import Leite from "./pages/Leite/Leite.jsx";
import Saude from "./pages/Saude/Saude.jsx";
import ConsumoReposicao from "./pages/ConsumoReposicao/ConsumoReposicao.jsx";
import Financeiro from "./pages/Financeiro/Financeiro.jsx";
import Calendario from "./pages/Calendario/Calendario.jsx";
import Ajustes from "./pages/Ajustes/Ajustes.jsx";
import Admin from "./pages/Admin/Admin.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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
            <Route element={<SistemaBase />}>
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

              {/* qualquer rota desconhecida volta para /inicio */}
              <Route path="*" element={<Navigate to="/inicio" replace />} />
            </Route>
          </>
        )}
      </Routes>
    </>
  );
}
