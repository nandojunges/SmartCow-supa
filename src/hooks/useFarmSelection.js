import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureFazendaDoProdutor } from "../services/acessos";
import { listarFazendasAcessiveis } from "../lib/farmSelection";
import { useFazenda } from "../context/FazendaContext";

export function useFarmSelection({ userId, tipoConta, onSelect, onError }) {
  const { fazendaAtualId, setFazendaAtualId } = useFazenda();
  const [fazendas, setFazendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(false);
  const tipoContaRef = useRef(tipoConta);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    tipoContaRef.current = tipoConta;
  }, [tipoConta]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const selecionarFazenda = useCallback(
    async (fazendaId) => {
      if (!fazendaId) {
        return;
      }

      if (fazendaAtualId && String(fazendaAtualId) === String(fazendaId)) {
        return;
      }

      setFazendaAtualId(fazendaId);
      if (import.meta.env.DEV) {
        console.info("[farm-selection] currentFarmId:", String(fazendaId));
      }

      if (onSelect) {
        onSelect(fazendaId);
      }
    },
    [fazendaAtualId, onSelect, setFazendaAtualId, userId]
  );

  const carregarFazendas = useCallback(async () => {
    if (!userId) {
      if (isMountedRef.current) {
        setFazendas([]);
        setLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      let fazendasDisponiveis = await listarFazendasAcessiveis(userId);

      if (tipoContaRef.current === "PRODUTOR" && !fazendasDisponiveis.length) {
        const { fazendas: fazendasCriadas } = await ensureFazendaDoProdutor(userId);
        fazendasDisponiveis = fazendasCriadas ?? [];
      }

      if (!isMountedRef.current) {
        return;
      }

      const fazendasNormalizadas = (fazendasDisponiveis ?? [])
        .map((fazenda) => {
          const id =
            fazenda?.id ??
            fazenda?.farm_id ??
            fazenda?.fazenda_id ??
            fazenda?.fazendas?.id ??
            fazenda?.farms?.id;
          const nome =
            fazenda?.nome ??
            fazenda?.name ??
            fazenda?.fazendas?.nome ??
            fazenda?.farms?.nome;

          if (!id || !nome) {
            return null;
          }

          return {
            ...fazenda,
            id,
            nome,
            name: nome,
          };
        })
        .filter(Boolean);

      const fazendasDeduplicadas = new Map();
      fazendasNormalizadas.forEach((fazenda) => {
        const key = String(fazenda.id);
        if (!fazendasDeduplicadas.has(key)) {
          fazendasDeduplicadas.set(key, fazenda);
        }
      });

      const fazendasFinal = Array.from(fazendasDeduplicadas.values());

      if (import.meta.env.DEV) {
        console.info(
          "[farm-selection] fazendas recebidas:",
          fazendasFinal.map((fazenda) => ({
            id: fazenda.id,
            nome: fazenda.nome ?? fazenda.name,
          }))
        );
      }

      setFazendas(fazendasFinal);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro ao carregar fazendas:", error?.message);
      }
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    isMountedRef.current = true;
    carregarFazendas();

    return () => {
      isMountedRef.current = false;
    };
  }, [carregarFazendas, userId]);

  const value = useMemo(
    () => ({
      fazendas,
      loading,
      selecionarFazenda,
    }),
    [fazendas, loading, selecionarFazenda]
  );

  return value;
}
