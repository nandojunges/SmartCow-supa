import { supabase } from "../lib/supabaseClient";
import {
  EMAIL_COLS,
  insertWithEmailFallback,
  isMissingColumnError,
} from "../utils/supabaseFallback";

const EMAIL_COLS_FALLBACK = [
  "convidado_email",
  "email_convidado",
  "convidadoEmail",
  "email",
  "email_profissional",
];

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

  let lastError;

  for (const col of EMAIL_COLS) {
    const { data, error } = await supabase
      .from("convites_acesso")
      .select(`id, ${col}, tipo_profissional, nome_profissional, status, created_at`)
      .eq("fazenda_id", fazendaId)
      .eq("status", "pendente")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingColumnError(error, col)) {
        lastError = error;
        continue;
      }
      throw error;
    }

    return (data ?? []).map((convite) => ({
      ...convite,
      email_convite: convite[col] ?? "",
    }));
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

export async function criarConvite(fazendaId, email, tipo, nome) {
  if (!fazendaId) {
    throw new Error("Fazenda inválida para criar convite.");
  }
  if (!email) {
    throw new Error("E-mail inválido para criar convite.");
  }
  if (!tipo) {
    throw new Error("Tipo de profissional inválido para criar convite.");
  }

  const { data, error } = await insertWithEmailFallback({
    table: "convites_acesso",
    email,
    payloadBase: {
      fazenda_id: fazendaId,
      tipo_profissional: tipo,
      nome_profissional: nome || null,
      status: "pendente",
    },
  });

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getConviteEmailColumn() {
  const { data, error } = await supabase
    .from("convites_acesso")
    .select("*")
    .limit(1);

  if (error) {
    throw error;
  }

  const keys = data?.[0] ? Object.keys(data[0]) : EMAIL_COLS_FALLBACK;
  const match = keys.find((key) => {
    const lower = key.toLowerCase();
    return lower.includes("email") && lower.includes("convid");
  });

  return match || "convidado_email";
}

export async function listarConvitesPendentesTecnico(email) {
  if (!email) {
    throw new Error("E-mail inválido para carregar convites.");
  }

  let emailColumn = "convidado_email";

  try {
    emailColumn = await getConviteEmailColumn();
  } catch (error) {
    console.error("Erro ao detectar coluna de e-mail dos convites:", error);
  }

  const { data, error } = await supabase
    .from("convites_acesso")
    .select("id, fazenda_id, status, created_at, tipo_profissional, nome_profissional")
    .eq(emailColumn, email)
    .eq("status", "pendente")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingColumnError(error, emailColumn)) {
      console.error("Coluna de e-mail inexistente nos convites:", {
        emailColumn,
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
    email_convite: emailColumn ? convite[emailColumn] ?? "" : "",
  }));
}
