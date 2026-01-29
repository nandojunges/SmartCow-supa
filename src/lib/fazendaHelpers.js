import { isMissingColumnError, selectByEmailWithFallback } from "../utils/supabaseFallback";
import { supabase } from "./supabaseClient";

const CONVITE_EMAIL_COL = "email_convidado";
const STORAGE_KEY = "smartcow:fazenda_id";
const LEGACY_KEYS = ["smartcow:fazendaAtualId", "fazendaAtualId", "fazendaSelecionadaId", "fazendaSelecionada"];

export async function listFazendasForUser(session) {
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const tipoContaRaw =
    session?.user?.user_metadata?.tipo_conta ??
    session?.user?.user_metadata?.tipoConta ??
    session?.user?.user_metadata?.tipo;
  const tipoConta = tipoContaRaw ? String(tipoContaRaw).trim().toUpperCase() : "PRODUTOR";
  const isConsultor = tipoConta === "ASSISTENTE_TECNICO";

  if (isConsultor) {
    const { data, error } = await supabase
      .from("fazenda_acessos")
      .select("fazenda_id, status, fazendas (id, nome, owner_user_id, created_at)")
      .eq("user_id", userId)
      .eq("status", "ATIVO")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? [])
      .map((row) => row?.fazendas ?? null)
      .filter(Boolean);
  }

  const { data, error } = await supabase
    .from("fazendas")
    .select("id, nome, owner_user_id, created_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function getActiveFazendaId() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return stored;
  }

  for (const key of LEGACY_KEYS) {
    const legacyValue = localStorage.getItem(key);
    if (legacyValue) {
      return legacyValue;
    }
  }

  return null;
}

export function setActiveFazendaId(id) {
  if (typeof localStorage === "undefined") {
    return;
  }

  if (!id) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, String(id));
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function ensureActiveFazenda(fazendas) {
  const lista = fazendas ?? [];
  if (!lista.length) {
    setActiveFazendaId(null);
    return null;
  }

  const currentId = getActiveFazendaId();
  const found = currentId
    ? lista.find((fazenda) => String(fazenda.id) === String(currentId))
    : null;
  if (found) {
    return found.id;
  }

  const next = lista.length === 1 ? lista[0] : lista[0];
  if (next?.id) {
    setActiveFazendaId(next.id);
    return next.id;
  }

  return null;
}

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
      `id, ${CONVITE_EMAIL_COL}, status, created_at, tipo_profissional, nome_profissional`
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
    .select("id, user_id, created_at, status, permissoes, profiles (id, email, full_name, tipo_conta)")
    .eq("fazenda_id", fazendaId)
    .eq("status", "ATIVO")
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
    select: "id, fazenda_id, status, created_at",
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
