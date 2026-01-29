import { supabase } from "./supabaseClient";

export async function getFazendaDoProdutor(userId) {
  if (!userId) {
    throw new Error("Usuário inválido para recuperar fazenda.");
  }

  const { data, error } = await supabase
    .from("fazendas")
    .select("id, nome")
    .eq("owner_user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error("Nenhuma fazenda encontrada para este produtor.");
  }

  return data;
}

export async function getEmailDoUsuario(userId) {
  if (!userId) {
    throw new Error("Usuário inválido para recuperar e-mail.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, tipo_conta")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listConvitesDaFazenda(fazendaId) {
  if (!fazendaId) {
    throw new Error("Fazenda inválida para carregar convites.");
  }

  const { data, error } = await supabase
    .from("convites_acesso")
    .select("id, convidado_email, tipo_profissional, nome_profissional, status, created_at")
    .eq("fazenda_id", fazendaId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listAcessosDaFazenda(fazendaId) {
  if (!fazendaId) {
    throw new Error("Fazenda inválida para carregar acessos.");
  }

  const { data, error } = await supabase
    .from("fazenda_acessos")
    .select("id, user_id, ativo, created_at")
    .eq("fazenda_id", fazendaId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listConvitesDoTecnico(email) {
  if (!email) {
    throw new Error("E-mail inválido para carregar convites.");
  }

  const { data, error } = await supabase
    .from("convites_acesso")
    .select(
      "id, fazenda_id, convidado_email, status, created_at, tipo_profissional, nome_profissional"
    )
    .eq("convidado_email", email)
    .eq("status", "pendente")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function aceitarConvite(convite, userId) {
  if (!convite?.fazenda_id || !userId) {
    throw new Error("Convite inválido para aceite.");
  }

  const { data: acessoExistente, error: acessoError } = await supabase
    .from("fazenda_acessos")
    .select("id")
    .eq("fazenda_id", convite.fazenda_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (acessoError) {
    throw acessoError;
  }

  if (acessoExistente?.id) {
    const { error: updateError } = await supabase
      .from("fazenda_acessos")
      .update({ ativo: true })
      .eq("id", acessoExistente.id);

    if (updateError) {
      throw updateError;
    }
  } else {
    const { error: insertError } = await supabase.from("fazenda_acessos").insert({
      fazenda_id: convite.fazenda_id,
      user_id: userId,
      ativo: true,
    });

    if (insertError) {
      throw insertError;
    }
  }

  const { error: conviteError } = await supabase
    .from("convites_acesso")
    .update({ status: "aceito" })
    .eq("id", convite.id);

  if (conviteError) {
    throw conviteError;
  }
}
