import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useFazenda } from "../context/FazendaContext";

const AuthContext = createContext(null);
const STORAGE_ROLE_KEY = "smartcow:auth:role";
const STORAGE_FAZENDA_KEY = "smartcow:auth:fazendaId";

function readStorage(key) {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return localStorage.getItem(key);
}

function writeStorage(key, value) {
  if (typeof localStorage === "undefined") {
    return;
  }
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
}

function normalizeRole(rawRole) {
  if (!rawRole) {
    return null;
  }
  const value = String(rawRole).trim().toLowerCase();
  if (value.includes("tecnico")) {
    return "tecnico";
  }
  if (value.includes("produtor")) {
    return "produtor";
  }
  return null;
}

export function AuthProvider({ children }) {
  const { fazendaAtualId, setFazendaAtualId, clearFazendaAtualId } = useFazenda();
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(() => readStorage(STORAGE_ROLE_KEY));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function carregarAuth() {
      setReady(false);

      if (!session?.user?.id) {
        if (isMounted) {
          setRole(null);
          clearFazendaAtualId();
          setReady(true);
        }
        return;
      }

      const userId = session.user.id;

      const { data: perfil, error: perfilError } = await supabase
        .from("profiles")
        .select("id, role, tipo_conta")
        .eq("id", userId)
        .maybeSingle();

      if (perfilError) {
        console.warn("Erro ao carregar perfil:", perfilError.message);
      }

      const rawRole =
        perfil?.role ??
        perfil?.tipo_conta ??
        session.user.user_metadata?.tipo_conta ??
        session.user.user_metadata?.tipoConta;
      const resolvedRole = normalizeRole(rawRole);

      if (isMounted) {
        setRole((prev) => resolvedRole ?? prev ?? null);
      }

      let resolvedFazendaId = fazendaAtualId;

      if (!resolvedFazendaId && resolvedRole === "produtor") {
        const { data: fazendas, error: fazendaError } = await supabase
          .from("fazendas")
          .select("id, created_at")
          .eq("produtor_id", userId)
          .order("created_at", { ascending: true })
          .limit(1);

        if (fazendaError) {
          console.warn("Erro ao buscar fazendas do produtor:", fazendaError.message);
        }

        if (!fazendas?.length) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("fazendas")
            .select("id, created_at")
            .eq("owner_user_id", userId)
            .order("created_at", { ascending: true })
            .limit(1);

          if (fallbackError) {
            console.warn("Erro ao buscar fazendas (fallback):", fallbackError.message);
          }

          resolvedFazendaId = fallbackData?.[0]?.id ?? null;
        } else {
          resolvedFazendaId = fazendas[0]?.id ?? null;
        }
      }

      if (!resolvedFazendaId && resolvedRole === "tecnico") {
        const { data: acessos, error: acessoError } = await supabase
          .from("fazenda_acessos")
          .select("fazenda_id, created_at")
          .eq("user_id", userId)
          .in("status", ["ativo", "ATIVO"])
          .order("created_at", { ascending: true })
          .limit(1);

        if (acessoError) {
          console.warn("Erro ao buscar fazendas do técnico:", acessoError.message);
        }

        resolvedFazendaId = acessos?.[0]?.fazenda_id ?? null;
      }

      if (isMounted) {
        if (resolvedFazendaId) {
          setFazendaAtualId(resolvedFazendaId);
        }
        setReady(true);
      }
    }

    carregarAuth();

    return () => {
      isMounted = false;
    };
  }, [clearFazendaAtualId, fazendaAtualId, session?.user?.id, setFazendaAtualId]);

  useEffect(() => {
    writeStorage(STORAGE_ROLE_KEY, role ?? "");
  }, [role]);

  useEffect(() => {
    writeStorage(STORAGE_FAZENDA_KEY, fazendaAtualId ?? "");
  }, [fazendaAtualId]);

  const value = useMemo(
    () => ({
      session,
      role,
      fazendaId: fazendaAtualId ?? null,
      ready,
    }),
    [fazendaAtualId, ready, role, session]
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
