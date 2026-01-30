import { supabase } from "./supabaseClient";

export async function listarFazendasAcessiveis(userId) {
  if (!userId) {
    return [];
  }

  const [fazendasOwner, acessos] = await Promise.all([
    supabase
      .from("fazendas")
      .select("id, nome, created_at")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("fazenda_acessos")
      .select("fazenda_id, fazendas (id, nome, created_at)")
      .eq("user_id", userId)
      .eq("ativo", true),
  ]);

  if (fazendasOwner.error) {
    throw fazendasOwner.error;
  }

  if (acessos.error) {
    throw acessos.error;
  }

  const fazendas = new Map();

  (fazendasOwner.data ?? []).forEach((fazenda) => {
    fazendas.set(String(fazenda.id), fazenda);
  });

  (acessos.data ?? []).forEach((acesso) => {
    if (acesso?.fazendas?.id) {
      fazendas.set(String(acesso.fazendas.id), acesso.fazendas);
    }
  });

  return Array.from(fazendas.values()).sort((a, b) => {
    const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });
}
