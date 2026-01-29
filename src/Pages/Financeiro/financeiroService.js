import { getFazendaAtualId } from "../../context/FazendaContext";
import { withFazendaId } from "../../lib/fazendaScope";
import { supabase } from "../../lib/supabaseClient";

/* ===================== CREATE ===================== */
export async function criarLancamentoFinanceiro(payload) {
  const fazendaId = payload?.fazenda_id ?? getFazendaAtualId();
  if (!fazendaId) {
    throw new Error("Selecione uma fazenda para lançar no financeiro.");
  }

  const { error, data } = await supabase
    .from("financeiro_lancamentos")
    .insert([{ ...payload, fazenda_id: fazendaId }])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar lançamento:", error);
    throw error;
  }

  return data;
}

/* ===================== UPDATE ===================== */
export async function atualizarLancamentoFinanceiro(id, payload) {
  const fazendaId = payload?.fazenda_id ?? getFazendaAtualId();
  if (!fazendaId) {
    throw new Error("Selecione uma fazenda para atualizar lançamentos.");
  }

  const { error, data } = await withFazendaId(
    supabase.from("financeiro_lancamentos").update(payload),
    fazendaId
  )
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar lançamento:", error);
    throw error;
  }

  return data;
}

/* ===================== LIST ===================== */
export async function listarLancamentos({ dataInicio, dataFim, fazendaId } = {}) {
  const resolvedFazendaId = fazendaId ?? getFazendaAtualId();
  if (!resolvedFazendaId) {
    throw new Error("Selecione uma fazenda para listar lançamentos.");
  }

  let query = withFazendaId(
    supabase.from("financeiro_lancamentos").select("*"),
    resolvedFazendaId
  ).order("data", { ascending: true });

  if (dataInicio) query = query.gte("data", dataInicio);
  if (dataFim) query = query.lte("data", dataFim);

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao listar lançamentos:", error);
    throw error;
  }

  return data || [];
}
