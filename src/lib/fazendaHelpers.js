import { supabase } from "./supabaseClient";

export async function getOrCreateFazendaDoOwner(userId) {
  if (!userId) {
    throw new Error("Usuário inválido para recuperar fazenda.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("fazenda_id, fazenda")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (profile?.fazenda_id) {
    return profile.fazenda_id;
  }

  const { data: fazendas, error: fazendasError } = await supabase
    .from("fazendas")
    .select("id, nome")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (fazendasError) {
    throw fazendasError;
  }

  let fazendaId = fazendas?.[0]?.id ?? null;

  if (!fazendaId) {
    const nome = profile?.fazenda?.trim() || "Minha Fazenda";
    const { data: novaFazenda, error: insertError } = await supabase
      .from("fazendas")
      .insert({
        owner_id: userId,
        nome,
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    fazendaId = novaFazenda?.id ?? null;
  }

  if (!fazendaId) {
    throw new Error("Não foi possível criar a fazenda.");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ fazenda_id: fazendaId })
    .eq("id", userId);

  if (updateError) {
    throw updateError;
  }

  return fazendaId;
}
