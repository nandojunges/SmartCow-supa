import { isMissingColumnError, selectByEmailWithFallback } from "../utils/supabaseFallback";
import { supabase } from "./supabaseClient";

const CONVITE_EMAIL_COL = "email_convidado";

export async function getFazendaDoProdutor(userId) {
  if (!userId) {
    throw new Error("Usuário inválido para recuperar fazenda.");
  }

  const { data, error } = await supabase
    .from("fazendas")
    .select("id, nome, created_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

export async function getEmailDoUsuario(userId) {
  if (!userId) {
    throw new Error("Usuário inválido para recuperar e-mail.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, tipo_conta")
    .eq("id", userId)
    .maybeSingle();

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
    .select(
      `id, ${CONVITE_EMAIL_COL}, tipo_profissional, nome_profissional, status, created_at`
    )
    .eq("fazenda_id", fazendaId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingColumnError(error, CONVITE_EMAIL_COL)) {
      throw new Error(
        "Não foi possível localizar a coluna de e-mail dos convites. Verifique a configuração."
      );
    }
    throw error;
  }

  return (data ?? []).map((convite) => ({
    ...convite,
    email_convidado: convite[CONVITE_EMAIL_COL] ?? "",
    email_convite: convite[CONVITE_EMAIL_COL] ?? "",
  }));
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
  const emailNormalizado = email?.trim().toLowerCase() ?? "";

  if (!emailNormalizado) {
    throw new Error("E-mail inválido para carregar convites.");
  }

  const { data, error, emailColumn } = await selectByEmailWithFallback({
    table: "convites_acesso",
    select: "id, fazenda_id, status, created_at, tipo_profissional, nome_profissional",
    email: emailNormalizado,
    extraFilters: (query) =>
      query.eq("status", "pendente").order("created_at", { ascending: false }),
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map((convite) => ({
    ...convite,
    email_convidado: emailColumn ? convite[emailColumn] ?? "" : "",
    email_convite: emailColumn ? convite[emailColumn] ?? "" : "",
  }));
}

export async function aceitarConvite(convite, userId) {
  if (!convite?.fazenda_id || !userId) {
    throw new Error("Convite inválido para aceite.");
  }

  const { data: acessosData, error: acessoError } = await supabase
    .from("fazenda_acessos")
    .select("id")
    .eq("fazenda_id", convite.fazenda_id)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (acessoError) {
    throw acessoError;
  }

  const acessoExistente = acessosData?.[0];

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
