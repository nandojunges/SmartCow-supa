// src/context/FazendaContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const FazendaContext = createContext(null);
let fazendaAtualIdCache = null;

export function FazendaProvider({ children }) {
  const [fazendaAtualId, setFazendaAtualIdState] = useState(null);

  const setFazendaAtualId = useCallback((fazendaId) => {
    if (!fazendaId) {
      setFazendaAtualIdState(null);
      return;
    }

    setFazendaAtualIdState(String(fazendaId));
  }, []);

  const clearFazendaAtualId = useCallback(() => {
    setFazendaAtualIdState(null);
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
