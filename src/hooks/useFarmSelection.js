import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureFazendaDoProdutor } from "../services/acessos";
import {
  atualizarLastFarmUsuario,
  getLastFarmId,
  listarFazendasAutorizadasConsultor,
  listarFazendasAcessiveis,
  setLastFarmId,
} from "../lib/farmSelection";
import { useFazenda } from "../context/FazendaContext";

export function useFarmSelection({
  userId,
  tipoConta,
  onSelect,
  onError,
  autoSelect = true,
  persistSelection = true,
}) {
  const { fazendaAtualId, setFazendaAtualId } = useFazenda();
  const [fazendas, setFazendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarSeletor, setMostrarSeletor] = useState(false);
  const isMountedRef = useRef(false);
  const tipoContaRef = useRef(tipoConta);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    tipoContaRef.current = tipoConta;
  }, [tipoConta]);

  useEffect(() => {
    if (!autoSelect) {
      setMostrarSeletor(false);
    }
  }, [autoSelect]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const selecionarFazenda = useCallback(
    async (fazendaId) => {
      if (!fazendaId) {
        return;
      }

      if (fazendaAtualId && String(fazendaAtualId) === String(fazendaId)) {
        setMostrarSeletor(false);
        return;
      }

      setFazendaAtualId(fazendaId);
      if (import.meta.env.DEV) {
        console.info("[farm-selection] currentFarmId:", String(fazendaId));
      }
      setMostrarSeletor(false);
      if (persistSelection) {
        setLastFarmId(fazendaId);
        await atualizarLastFarmUsuario({ userId, farmId: fazendaId });
      }

      if (onSelect) {
        onSelect(fazendaId);
      }
    },
    [fazendaAtualId, onSelect, persistSelection, setFazendaAtualId, userId]
  );

  const carregarFazendas = useCallback(async () => {
    if (!userId) {
      if (isMountedRef.current) {
        setFazendas([]);
        setMostrarSeletor(false);
        setLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      let fazendasDisponiveis = [];
      if (tipoContaRef.current === "ASSISTENTE_TECNICO") {
        fazendasDisponiveis = await listarFazendasAutorizadasConsultor(userId);
      } else {
        fazendasDisponiveis = await listarFazendasAcessiveis(userId);
      }

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

  useEffect(() => {
    if (!userId || !isMountedRef.current) {
      return;
    }

    carregarFazendas();
  }, [carregarFazendas, tipoConta, userId]);

  useEffect(() => {
    if (!autoSelect || loading || fazendas.length === 0) {
      return;
    }

    const lastFarmId = persistSelection ? getLastFarmId() : null;
    const lastFarm = lastFarmId
      ? fazendas.find((fazenda) => String(fazenda.id) === String(lastFarmId))
      : null;
    const fazendaAutoSelecionada = lastFarm?.id ?? (fazendas.length === 1 ? fazendas[0].id : null);

    if (fazendaAutoSelecionada) {
      if (fazendaAtualId && String(fazendaAtualId) === String(fazendaAutoSelecionada)) {
        setMostrarSeletor(false);
        return;
      }

      selecionarFazenda(fazendaAutoSelecionada);
      return;
    }

    if (fazendas.length > 1) {
      setMostrarSeletor(true);
    }
  }, [autoSelect, fazendaAtualId, fazendas, loading, persistSelection, selecionarFazenda]);

  const value = useMemo(
    () => ({
      fazendas,
      loading,
      mostrarSeletor,
      selecionarFazenda,
    }),
    [fazendas, loading, mostrarSeletor, selecionarFazenda]
  );

  return value;
}
