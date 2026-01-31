// useBezerras.js
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { mockBezerras } from "../data/mockData";

/* =========================
   Helpers
========================= */

// id simples e bem seguro pra UI (evita colisão do Date.now sozinho)
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// garante array (evita crash quando algum mock vem sem pesagens/ocorrencias/manejos)
const arr = (v) => (Array.isArray(v) ? v : []);

// sort de pesagens: prioriza idadeDias; se não tiver, cai pra data
const sortPesagens = (pesagens) => {
  const list = [...arr(pesagens)];
  list.sort((a, b) => {
    const ai = Number(a?.idadeDias ?? NaN);
    const bi = Number(b?.idadeDias ?? NaN);

    const aHasIdade = !Number.isNaN(ai);
    const bHasIdade = !Number.isNaN(bi);

    if (aHasIdade && bHasIdade) return ai - bi;

    const ad = new Date(a?.data ?? 0).getTime();
    const bd = new Date(b?.data ?? 0).getTime();
    return ad - bd;
  });
  return list;
};

// pesoAtual sempre vem da última pesagem válida; se não houver, mantém o atual ou 0
const computePesoAtual = (bezerra) => {
  const pesagens = sortPesagens(bezerra?.pesagens);
  const last = pesagens[pesagens.length - 1];
  const lastPeso = Number(last?.peso ?? NaN);
  if (!Number.isNaN(lastPeso)) return lastPeso;
  const atual = Number(bezerra?.pesoAtual ?? NaN);
  return !Number.isNaN(atual) ? atual : 0;
};

export const useBezerras = () => {
  const [bezerras, setBezerras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // evita setState após unmount (bug clássico)
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchBezerras = async () => {
      try {
        setLoading(true);
        setError(null);

        // Simular delay de rede
        await new Promise((resolve) => setTimeout(resolve, 500));

        // normaliza o mock (evita crash em telas que assumem arrays)
        const normalized = arr(mockBezerras).map((b) => {
          const pesagens = sortPesagens(b?.pesagens);
          return {
            ...b,
            id: b?.id ?? uid(),
            pesagens,
            ocorrencias: arr(b?.ocorrencias),
            manejos: arr(b?.manejos),
            pesoAtual: computePesoAtual({ ...b, pesagens }),
          };
        });

        if (isMountedRef.current) setBezerras(normalized);
      } catch (err) {
        if (isMountedRef.current) setError(err?.message || "Erro ao carregar bezerras");
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    fetchBezerras();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getBezerraById = useCallback(
    (id) => bezerras.find((b) => b.id === id),
    [bezerras]
  );

  const addBezerra = useCallback((newBezerra) => {
    setBezerras((prev) => {
      const bezerra = {
        ...newBezerra,
        id: newBezerra?.id ?? uid(),
        pesagens: sortPesagens(newBezerra?.pesagens),
        ocorrencias: arr(newBezerra?.ocorrencias),
        manejos: arr(newBezerra?.manejos),
      };
      return [...prev, { ...bezerra, pesoAtual: computePesoAtual(bezerra) }];
    });
  }, []);

  const updateBezerra = useCallback((id, updates) => {
    setBezerras((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const merged = { ...b, ...updates };
        // se mexer em pesagens, reordena e recalcula pesoAtual
        const pesagens = updates?.pesagens ? sortPesagens(updates.pesagens) : sortPesagens(merged.pesagens);
        return { ...merged, pesagens, pesoAtual: computePesoAtual({ ...merged, pesagens }) };
      })
    );
  }, []);

  const addPesagem = useCallback((bezerraId, pesagem) => {
    setBezerras((prev) =>
      prev.map((b) => {
        if (b.id !== bezerraId) return b;

        const pesagens = sortPesagens([
          ...arr(b.pesagens),
          { ...pesagem, id: pesagem?.id ?? uid() },
        ]);

        return {
          ...b,
          pesagens,
          pesoAtual: computePesoAtual({ ...b, pesagens }),
        };
      })
    );
  }, []);

  const addOcorrencia = useCallback((bezerraId, ocorrencia) => {
    setBezerras((prev) =>
      prev.map((b) => {
        if (b.id !== bezerraId) return b;

        const grav = ocorrencia?.gravidade;
        const status =
          grav === "grave" ? "critico" : "tratamento"; // mantém tua regra original

        return {
          ...b,
          ocorrencias: [
            ...arr(b.ocorrencias),
            { ...ocorrencia, id: ocorrencia?.id ?? uid() },
          ],
          status,
        };
      })
    );
  }, []);

  // opcional: índices úteis (performance / futuras telas)
  const indexById = useMemo(() => {
    const map = new Map();
    for (const b of bezerras) map.set(b.id, b);
    return map;
  }, [bezerras]);

  return {
    bezerras,
    loading,
    error,
    indexById,

    getBezerraById,
    addBezerra,
    updateBezerra,
    addPesagem,
    addOcorrencia,
  };
};

export default useBezerras;
