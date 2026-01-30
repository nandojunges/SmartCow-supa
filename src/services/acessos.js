import { supabase } from "../lib/supabaseClient";
import { insertWithEmailFallback, isMissingColumnError } from "../utils/supabaseFallback";

const CONVITE_EMAIL_COL = "email_convidado";

export async function ensureFazendaDoProdutor(userId) {
  if (!userId) {
    throw new Error("Usuário inválido para garantir fazenda.");
  }

  const { data: fazendasData, error: fazendasError } = await supabase
    .from("fazendas")
    .select("id, nome, owner_user_id, created_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });

  if (fazendasError) {
    throw fazendasError;
  }

  if (fazendasData?.length) {
    return {
      fazenda: fazendasData[0],
      fazendas: fazendasData,
      created: false,
    };
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("fazenda")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const nomeFazenda =
    profileData?.fazenda && profileData.fazenda.trim()
      ? profileData.fazenda.trim()
      : "Minha Fazenda";

  const { data: fazendaInserida, error: insertError } = await supabase
    .from("fazendas")
    .insert({ nome: nomeFazenda, owner_user_id: userId })
    .select("id, nome, owner_user_id, created_at")
    .maybeSingle();

  if (insertError) {
    throw insertError;
  }

  const { data: fazendasAtualizadas, error: refreshError } = await supabase
    .from("fazendas")
    .select("id, nome, owner_user_id, created_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });

  if (refreshError) {
    throw refreshError;
  }

  return {
    fazenda: fazendasAtualizadas?.[0] ?? fazendaInserida ?? null,
    fazendas: fazendasAtualizadas ?? (fazendaInserida ? [fazendaInserida] : []),
    created: true,
  };
}

export async function listarConvitesPendentesProdutor(fazendaId) {
  if (!fazendaId) {
    throw new Error("Fazenda inválida para carregar convites.");
  }

  const { data, error } = await supabase
    .from("convites_acesso")
    .select(
      `id, ${CONVITE_EMAIL_COL}, status, created_at, tipo_profissional, nome_profissional`
    )
    .eq("fazenda_id", fazendaId)
    .eq("status", "PENDENTE")
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

export async function criarConvite(fazendaId, email, { tipoProfissional, nomeProfissional } = {}) {
  if (!fazendaId) {
    throw new Error("Fazenda inválida para criar convite.");
  }
  if (!email) {
    throw new Error("E-mail inválido para criar convite.");
  }

  const { data, error } = await insertWithEmailFallback({
    table: "convites_acesso",
    email,
    payloadBase: {
      fazenda_id: fazendaId,
      status: "PENDENTE",
      tipo_profissional: tipoProfissional ?? null,
      nome_profissional: nomeProfissional ?? null,
    },
  });

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function listarConvitesPendentesTecnico(email) {
  const emailNormalizado = email?.trim().toLowerCase() ?? "";

  if (!emailNormalizado) {
    throw new Error("E-mail inválido para carregar convites.");
  }

  const { data, error } = await supabase
    .from("convites_acesso")
    .select(`id, fazenda_id, status, created_at, ${CONVITE_EMAIL_COL}, tipo_profissional, nome_profissional`)
    .filter(`lower(${CONVITE_EMAIL_COL})`, "eq", emailNormalizado)
    .eq("status", "PENDENTE")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingColumnError(error, CONVITE_EMAIL_COL)) {
      console.error("Coluna de e-mail inexistente nos convites:", {
        emailColumn: CONVITE_EMAIL_COL,
        error,
      });
      throw new Error(
        "Não foi possível identificar a coluna de e-mail dos convites. Verifique a configuração."
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
