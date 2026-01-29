import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureFazendaDoProdutor } from "../services/acessos";
import {
  atualizarLastFarmUsuario,
  getLastFarmId,
  listarFazendasAcessiveis,
  setLastFarmId,
} from "../lib/farmSelection";
import { useFazenda } from "../context/FazendaContext";

export function useFarmSelection({ userId, tipoConta, onSelect, onError }) {
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
      setMostrarSeletor(false);
      setLastFarmId(fazendaId);
      await atualizarLastFarmUsuario({ userId, farmId: fazendaId });

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
        setMostrarSeletor(false);
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

      setFazendas(fazendasDisponiveis);
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
    if (loading || fazendas.length === 0) {
      return;
    }

    const lastFarmId = getLastFarmId();
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
  }, [fazendaAtualId, fazendas, loading, selecionarFazenda]);

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
