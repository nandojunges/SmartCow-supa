import { supabase } from "../../lib/supabaseClient";

/* ===================== CREATE ===================== */
export async function criarLancamentoFinanceiro(payload) {
  const { error, data } = await supabase
    .from("financeiro_lancamentos")
    .insert([payload])
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
  const { error, data } = await supabase
    .from("financeiro_lancamentos")
    .update(payload)
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
export async function listarLancamentos({ dataInicio, dataFim }) {
  let query = supabase
    .from("financeiro_lancamentos")
    .select("*")
    .order("data", { ascending: true });

  if (dataInicio) query = query.gte("data", dataInicio);
  if (dataFim) query = query.lte("data", dataFim);

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao listar lançamentos:", error);
    throw error;
  }

  return data || [];
}
