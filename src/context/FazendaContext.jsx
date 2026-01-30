// src/context/FazendaContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

  const value = useMemo(
    () => ({
      fazendaAtualId,
      hasFazendaAtual: Boolean(fazendaAtualId),
      setFazendaAtualId,
      clearFazendaAtualId,
    }),
    [fazendaAtualId, setFazendaAtualId, clearFazendaAtualId]
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
