// src/context/FazendaAtivaContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_ID_KEY = "smartcow:fazendaAtivaId";
const STORAGE_NAME_KEY = "smartcow:fazendaAtivaNome";

function getInitialValue(key) {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return localStorage.getItem(key);
}

const FazendaAtivaContext = createContext(null);

export function FazendaAtivaProvider({ children }) {
  const [fazendaAtivaId, setFazendaAtivaId] = useState(() => getInitialValue(STORAGE_ID_KEY));
  const [fazendaAtivaNome, setFazendaAtivaNome] = useState(() =>
    getInitialValue(STORAGE_NAME_KEY)
  );

  const setFazendaAtiva = useCallback(({ id, nome } = {}) => {
    if (!id) {
      setFazendaAtivaId(null);
      setFazendaAtivaNome(null);
      return;
    }

    setFazendaAtivaId(String(id));
    setFazendaAtivaNome(nome ? String(nome) : null);
  }, []);

  const clearFazendaAtiva = useCallback(() => {
    setFazendaAtivaId(null);
    setFazendaAtivaNome(null);
  }, []);

  useEffect(() => {
    if (typeof localStorage === "undefined") {
      return;
    }

    if (fazendaAtivaId) {
      localStorage.setItem(STORAGE_ID_KEY, fazendaAtivaId);
    } else {
      localStorage.removeItem(STORAGE_ID_KEY);
    }

    if (fazendaAtivaNome) {
      localStorage.setItem(STORAGE_NAME_KEY, fazendaAtivaNome);
    } else {
      localStorage.removeItem(STORAGE_NAME_KEY);
    }
  }, [fazendaAtivaId, fazendaAtivaNome]);

  const value = useMemo(
    () => ({
      fazendaAtivaId,
      fazendaAtivaNome,
      hasFazendaAtiva: Boolean(fazendaAtivaId),
      setFazendaAtiva,
      clearFazendaAtiva,
    }),
    [fazendaAtivaId, fazendaAtivaNome, setFazendaAtiva, clearFazendaAtiva]
  );

  return <FazendaAtivaContext.Provider value={value}>{children}</FazendaAtivaContext.Provider>;
}

export function useFazendaAtiva() {
  const context = useContext(FazendaAtivaContext);
  if (!context) {
    throw new Error("useFazendaAtiva deve ser usado dentro de FazendaAtivaProvider.");
  }
  return context;
}
