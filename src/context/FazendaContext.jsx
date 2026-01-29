// src/context/FazendaContext.jsx
import { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";

const STORAGE_KEY = "fazendaAtivaId";
const LEGACY_KEYS = ["fazendaSelecionadaId", "fazendaSelecionada"];

function getInitialFazendaAtivaId() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return stored;
  }

  for (const key of LEGACY_KEYS) {
    const legacyValue = localStorage.getItem(key);
    if (legacyValue) {
      return legacyValue;
    }
  }

  return null;
}

const FazendaContext = createContext(null);

export function FazendaProvider({ children }) {
  const [fazendaAtivaId, setFazendaAtivaId] = useState(getInitialFazendaAtivaId);

  const definirFazendaAtiva = useCallback((id) => {
    if (id === null || id === undefined || id === "") {
      setFazendaAtivaId(null);
      return;
    }
    setFazendaAtivaId(String(id));
  }, []);

  const limparFazendaAtiva = useCallback(() => {
    setFazendaAtivaId(null);
  }, []);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }

    if (fazendaAtivaId) {
      localStorage.setItem(STORAGE_KEY, fazendaAtivaId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  }, [fazendaAtivaId]);

  const value = useMemo(
    () => ({
      fazendaAtivaId,
      hasFazendaAtiva: Boolean(fazendaAtivaId),
      definirFazendaAtiva,
      limparFazendaAtiva,
    }),
    [fazendaAtivaId, definirFazendaAtiva, limparFazendaAtiva]
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
