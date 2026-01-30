// src/context/FazendaContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const FazendaContext = createContext(null);
const STORAGE_KEY = "smartcow:currentFarmId";
let fazendaAtualIdCache = null;

function getStoredFazendaId() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem(STORAGE_KEY);
}

export function FazendaProvider({ children }) {
  const [fazendaAtualId, setFazendaAtualIdState] = useState(() => getStoredFazendaId());
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [fazendasLoading, setFazendasLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const setFazendaAtualId = useCallback((fazendaId) => {
    if (!fazendaId) {
      setFazendaAtualIdState(null);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    const nextId = String(fazendaId);
    setFazendaAtualIdState(nextId);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, nextId);
    }
  }, []);

  const clearFazendaAtualId = useCallback(() => {
    setFazendaAtualIdState(null);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    fazendaAtualIdCache = fazendaAtualId ?? null;
  }, [fazendaAtualId]);

  const bootstrap = useCallback(
    async (nextSession) => {
      setReady(false);

      if (!nextSession?.user?.id) {
        setProfile(null);
        setProfileLoading(false);
        setFazendasLoading(false);
        setReady(true);
        return;
      }

      setProfileLoading(true);
      let nextProfile = null;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, tipo_conta, role")
          .eq("id", nextSession.user.id)
          .maybeSingle();

        if (error) {
          console.warn("Erro ao carregar perfil:", error.message);
        } else {
          nextProfile = data ?? null;
        }
      } finally {
        setProfile(nextProfile);
        setProfileLoading(false);
      }

      const tipoContaRaw =
        nextProfile?.tipo_conta ??
        nextSession.user.user_metadata?.tipo_conta ??
        nextSession.user.user_metadata?.tipoConta;
      const tipoConta = tipoContaRaw ? String(tipoContaRaw).trim().toUpperCase() : null;

      const hasFazendaSelecionada = Boolean(fazendaAtualIdCache);
      if (tipoConta === "PRODUTOR" && !hasFazendaSelecionada) {
        setFazendasLoading(true);
        try {
          const { data, error } = await supabase
            .from("fazendas")
            .select("id")
            .eq("owner_user_id", nextSession.user.id)
            .order("created_at", { ascending: true });

          if (error) {
            console.warn("Erro ao buscar fazendas do produtor:", error.message);
          } else if (data?.length > 0) {
            setFazendaAtualId(data[0].id);
          }
        } finally {
          setFazendasLoading(false);
        }
      }

      setReady(true);
    },
    [setFazendaAtualId]
  );

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      if (!isMounted) {
        return;
      }
      setSession(nextSession ?? null);
      bootstrap(nextSession ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      bootstrap(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [bootstrap]);

  const tipoContaRaw =
    profile?.tipo_conta ??
    session?.user?.user_metadata?.tipo_conta ??
    session?.user?.user_metadata?.tipoConta;
  const tipoConta = tipoContaRaw ? String(tipoContaRaw).trim().toUpperCase() : null;
  const role = profile?.role ?? null;

  const value = useMemo(
    () => ({
      fazendaAtualId,
      hasFazendaAtual: Boolean(fazendaAtualId),
      setFazendaAtualId,
      clearFazendaAtualId,
      session,
      profile,
      tipoConta,
      role,
      profileLoading,
      fazendasLoading,
      ready,
    }),
    [
      fazendaAtualId,
      setFazendaAtualId,
      clearFazendaAtualId,
      session,
      profile,
      tipoConta,
      role,
      profileLoading,
      fazendasLoading,
      ready,
    ]
  );

  return <FazendaContext.Provider value={value}>{children}</FazendaContext.Provider>;
}

export function useFazenda() {
  const context = useContext(FazendaContext);
  if (!context) {
    throw new Error("useFazenda deve ser usado dentro de FazendaProvider.");
  }
  return context;
}

export function getFazendaAtualId() {
  return fazendaAtualIdCache;
}
