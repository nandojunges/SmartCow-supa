// useComparativo.js
import { useState, useCallback, useMemo } from "react";

/**
 * Hook para seleção (máx 4) e geração de dados pro gráfico comparativo.
 * IMPORTANTe: o estado aqui guarda a bezerra inteira (como teu código já fazia),
 * por isso o nome correto é selectedBezerras (não selectedIds).
 */
export const useComparativo = (maxSelect = 4) => {
  const [selectedBezerras, setSelectedBezerras] = useState([]);

  const toggleSelection = useCallback(
    (bezerra) => {
      if (!bezerra?.id) return;

      setSelectedBezerras((prev) => {
        const exists = prev.some((b) => b.id === bezerra.id);
        if (exists) return prev.filter((b) => b.id !== bezerra.id);
        if (prev.length >= maxSelect) return prev;
        return [...prev, bezerra];
      });
    },
    [maxSelect]
  );

  const clearSelection = useCallback(() => {
    setSelectedBezerras([]);
  }, []);

  const isSelected = useCallback(
    (id) => selectedBezerras.some((b) => b.id === id),
    [selectedBezerras]
  );

  /**
   * Gera uma série com idade (dias) no eixo X e uma coluna por animal:
   * { idade: 0, animal_0: 38, animal_1: 40, ... }
   *
   * Observação: em vez de exigir pesagem EXATA na idade,
   * usamos "última pesagem <= idade" (fica bem mais útil no gráfico).
   */
  const dadosComparativo = useCallback((bezerras) => {
    const list = Array.isArray(bezerras) ? bezerras : [];
    if (list.length === 0) return [];

    const allIdades = [];
    for (const b of list) {
      const pes = Array.isArray(b?.pesagens) ? b.pesagens : [];
      for (const p of pes) {
        const idade = Number(p?.idadeDias);
        if (!Number.isNaN(idade)) allIdades.push(idade);
      }
    }

    const idades = Array.from(new Set(allIdades)).sort((a, b) => a - b);

    // helper: acha a última pesagem com idadeDias <= idade alvo
    const getPesoAte = (pesagens, idadeAlvo) => {
      const pes = Array.isArray(pesagens) ? pesagens : [];
      let best = null;
      for (const p of pes) {
        const idade = Number(p?.idadeDias);
        if (Number.isNaN(idade)) continue;
        if (idade <= idadeAlvo) {
          if (!best || idade > Number(best?.idadeDias ?? -Infinity)) best = p;
        }
      }
      const peso = Number(best?.peso);
      return Number.isNaN(peso) ? null : peso;
    };

    return idades.map((idade) => {
      const point = { idade };
      list.forEach((b, idx) => {
        point[`animal_${idx}`] = getPesoAte(b?.pesagens, idade);
      });
      return point;
    });
  }, []);

  const canCompare = useMemo(
    () => selectedBezerras.length >= 2 && selectedBezerras.length <= maxSelect,
    [selectedBezerras.length, maxSelect]
  );

  return {
    selectedBezerras,
    toggleSelection,
    clearSelection,
    isSelected,
    dadosComparativo,
    canCompare,
    maxSelect,
  };
};

export default useComparativo;
