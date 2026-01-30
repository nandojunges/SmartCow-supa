import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useFazenda } from "../context/FazendaContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { hasFazendaAtual, setFazendaAtualId } = useFazenda();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [fazendasLoading, setFazendasLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!isMounted) {
        return;
      }
      setSession(currentSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
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
        if (!isMounted) {
          return;
        }
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

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    if (profileLoading) {
      return;
    }

    if (tipoConta !== "PRODUTOR") {
      return;
    }

    if (hasFazendaAtual) {
      return;
    }

    let isMounted = true;
    setFazendasLoading(true);

    supabase
      .from("fazendas")
      .select("id")
      .eq("owner_user_id", session.user.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          console.warn("Erro ao buscar fazendas do produtor:", error.message);
          return;
        }

        if (data?.length > 0) {
          setFazendaAtualId(data[0].id);
        }
      })
      .finally(() => {
        if (isMounted) {
          setFazendasLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [hasFazendaAtual, profileLoading, session?.user?.id, setFazendaAtualId, tipoConta]);

  const value = useMemo(
    () => ({
      session,
      loading,
      profile,
      profileLoading,
      fazendasLoading,
      tipoConta,
      isAssistenteTecnico,
      role: profile?.role ?? null,
      hasFazendaAtual,
    }),
    [
      session,
      loading,
      profile,
      profileLoading,
      fazendasLoading,
      tipoConta,
      isAssistenteTecnico,
      hasFazendaAtual,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
