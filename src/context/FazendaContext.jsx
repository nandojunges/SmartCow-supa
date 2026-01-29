// src/context/FazendaContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "smartcow:fazenda_id";
const LEGACY_KEYS = [
  "smartcow:fazendaAtualId",
  "fazendaAtualId",
  "fazendaSelecionadaId",
  "fazendaSelecionada",
];

export function getFazendaAtualId() {
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
  const [fazendaAtualId, setFazendaAtualIdState] = useState(getFazendaAtualId);

  const setFazendaAtualId = useCallback((id) => {
    if (id === null || id === undefined || id === "") {
      setFazendaAtualIdState(null);
      return;
    }
    setFazendaAtualIdState(String(id));
  }, []);

  const clearFazendaAtualId = useCallback(() => {
    setFazendaAtualIdState(null);
  }, []);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }

    if (fazendaAtualId) {
      localStorage.setItem(STORAGE_KEY, fazendaAtualId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  }, [fazendaAtualId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleFazendaChange = () => {
      const nextId = getFazendaAtualId();
      setFazendaAtualIdState(nextId ? String(nextId) : null);
    };

    window.addEventListener("fazenda:changed", handleFazendaChange);
    return () => {
      window.removeEventListener("fazenda:changed", handleFazendaChange);
    };
  }, []);

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
