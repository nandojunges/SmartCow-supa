import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureFazendaDoProdutor } from "../services/acessos";
import {
  atualizarLastFarmUsuario,
  getLastFarmId,
  listarFazendasAcessiveis,
  setLastFarmId,
} from "../lib/farmSelection";
import { useFazenda } from "../context/FazendaContext";

export function useFarmSelection({ userId, tipoConta, onSelect, onError }) {
  const { setFazendaAtualId } = useFazenda();
  const [fazendas, setFazendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarSeletor, setMostrarSeletor] = useState(false);

  const selecionarFazenda = useCallback(
    async (fazendaId) => {
      if (!fazendaId) {
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
    [onSelect, setFazendaAtualId, userId]
  );

  useEffect(() => {
    let isMounted = true;

    async function carregarFazendas() {
      if (!userId) {
        setFazendas([]);
        setMostrarSeletor(false);
        return;
      }

      setLoading(true);

      try {
        let fazendasDisponiveis = await listarFazendasAcessiveis(userId);

        if (tipoConta === "PRODUTOR" && !fazendasDisponiveis.length) {
          const { fazendas: fazendasCriadas } = await ensureFazendaDoProdutor(userId);
          fazendasDisponiveis = fazendasCriadas ?? [];
        }

        if (!isMounted) {
          return;
        }

        setFazendas(fazendasDisponiveis);

        const lastFarmId = getLastFarmId();
        const lastFarm = lastFarmId
          ? fazendasDisponiveis.find(
              (fazenda) => String(fazenda.id) === String(lastFarmId)
            )
          : null;

        if (lastFarm) {
          await selecionarFazenda(lastFarm.id);
          return;
        }

        if (fazendasDisponiveis.length === 1) {
          await selecionarFazenda(fazendasDisponiveis[0].id);
          return;
        }

        if (fazendasDisponiveis.length > 1) {
          setMostrarSeletor(true);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Erro ao carregar fazendas:", error?.message);
        }
        if (onError) {
          onError(error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    carregarFazendas();

    return () => {
      isMounted = false;
    };
  }, [selecionarFazenda, tipoConta, userId]);

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
