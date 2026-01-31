// useRelatorios.js
import { useMemo } from "react";

/**
 * Hook de relatórios (estatísticas + dataset de crescimento).
 * Corrige:
 * - crash quando bezerras é undefined/null
 * - divisão por zero
 * - GMD: ordena pesagens por idade e ignora dados inválidos
 * - valores numéricos (mantém number), e também devolve versões formatadas
 * - faixas etárias: usa faixa "mais próxima" de forma estável
 */
export const useRelatorios = (bezerrasInput = []) => {
  const bezerras = Array.isArray(bezerrasInput) ? bezerrasInput : [];

  const estatisticas = useMemo(() => {
    if (bezerras.length === 0) {
      return {
        total: 0,
        mortas: 0,
        emTratamento: 0,
        saudaveis: 0,
        mortalidadePct: 0,
        morbidadePct: 0,
        taxaSobrevivenciaPct: 0,
        gmdMedio: 0,
        custoMedio: 0,
        custoTotal: 0,
        porCategoria: {},
        // strings prontas (se você quiser exibir direto)
        mortalidade: "0.00",
        morbidade: "0.00",
        taxaSobrevivencia: "0.00",
        gmdMedioStr: "0.00",
        custoMedioStr: "0.00",
        custoTotalStr: "0.00",
      };
    }

    const total = bezerras.length;

    const mortas = bezerras.filter((b) => b?.status === "morta").length;

    // mantém seu critério original
    const emTratamento = bezerras.filter(
      (b) => b?.status === "tratamento" || b?.status === "critico"
    ).length;

    const saudaveis = bezerras.filter((b) => b?.status === "saudavel").length;

    // GMD por bezerra (usa pesagens ordenadas e válidas)
    const gmdList = [];
    for (const b of bezerras) {
      const pes = Array.isArray(b?.pesagens) ? b.pesagens : [];
      if (pes.length < 2) continue;

      const pesOrdenadas = [...pes]
        .filter(
          (p) =>
            p &&
            Number.isFinite(Number(p.idadeDias)) &&
            Number.isFinite(Number(p.peso))
        )
        .sort((a, b) => Number(a.idadeDias) - Number(b.idadeDias));

      if (pesOrdenadas.length < 2) continue;

      const first = pesOrdenadas[0];
      const last = pesOrdenadas[pesOrdenadas.length - 1];

      const dias = Number(last.idadeDias) - Number(first.idadeDias);
      const ganho = Number(last.peso) - Number(first.peso);

      if (dias > 0) gmdList.push(ganho / dias);
    }

    const gmdMedio =
      gmdList.length > 0
        ? gmdList.reduce((a, b) => a + b, 0) / gmdList.length
        : 0;

    // Custos
    const custoTotal = bezerras.reduce((acc, b) => {
      const occ = Array.isArray(b?.ocorrencias) ? b.ocorrencias : [];
      const soma = occ.reduce((sum, o) => sum + (Number(o?.custo) || 0), 0);
      return acc + soma;
    }, 0);

    const porCategoria = bezerras.reduce((acc, b) => {
      const cat = b?.categoria || "sem_categoria";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const mortalidadePct = total > 0 ? (mortas / total) * 100 : 0;
    const morbidadePct = total > 0 ? (emTratamento / total) * 100 : 0;
    const taxaSobrevivenciaPct = total > 0 ? ((total - mortas) / total) * 100 : 0;

    const custoMedio = total > 0 ? custoTotal / total : 0;

    return {
      total,
      mortas,
      emTratamento,
      saudaveis,
      mortalidadePct,
      morbidadePct,
      taxaSobrevivenciaPct,
      gmdMedio,
      custoMedio,
      custoTotal,
      porCategoria,

      // compat com seu retorno antigo (strings toFixed)
      mortalidade: mortalidadePct.toFixed(2),
      morbidade: morbidadePct.toFixed(2),
      taxaSobrevivencia: taxaSobrevivenciaPct.toFixed(2),
      gmdMedioStr: gmdMedio.toFixed(2),
      custoMedioStr: custoMedio.toFixed(2),
      custoTotalStr: custoTotal.toFixed(2),
    };
  }, [bezerras]);

  const dadosGraficoCrescimento = useMemo(() => {
    if (bezerras.length === 0) return [];

    const faixas = [0, 15, 30, 45, 60, 90];
    const buckets = Object.fromEntries(faixas.map((f) => [f, []]));

    const faixaMaisProxima = (idadeDias) => {
      let best = faixas[0];
      let bestDist = Infinity;
      for (const f of faixas) {
        const dist = Math.abs(idadeDias - f);
        if (dist < bestDist) {
          bestDist = dist;
          best = f;
        }
      }
      return best;
    };

    for (const b of bezerras) {
      const pes = Array.isArray(b?.pesagens) ? b.pesagens : [];
      for (const p of pes) {
        const idade = Number(p?.idadeDias);
        const peso = Number(p?.peso);
        if (!Number.isFinite(idade) || !Number.isFinite(peso)) continue;
        const faixa = faixaMaisProxima(idade);
        buckets[faixa].push(peso);
      }
    }

    return faixas.map((idade) => {
      const pesos = buckets[idade];
      if (!pesos.length) {
        return { idade, media: 0, min: 0, max: 0, n: 0 };
      }
      const soma = pesos.reduce((a, b) => a + b, 0);
      const media = soma / pesos.length;
      return {
        idade,
        media: Number(media.toFixed(1)),
        min: Math.min(...pesos),
        max: Math.max(...pesos),
        n: pesos.length,
      };
    });
  }, [bezerras]);

  return { estatisticas, dadosGraficoCrescimento };
};

export default useRelatorios;
