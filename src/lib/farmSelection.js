import { supabase } from "./supabaseClient";

export const LAST_FARM_ID_KEY = "smartcow:lastFarmId";
const USER_SETTINGS_MISSING_KEY = "smartcow:user_settings_missing";
let missingUserSettingsTableWarned = false;

function isMissingUserSettingsTableError(error) {
  const message = error?.message?.toLowerCase?.() ?? "";
  return (
    error?.code === "42P01" ||
    error?.status === 404 ||
    message.includes("42p01") ||
    message.includes("could not find the table")
  );
}

function isUserSettingsMissing() {
  if (typeof localStorage === "undefined") {
    return false;
  }
  return localStorage.getItem(USER_SETTINGS_MISSING_KEY) === "1";
}

function marcarUserSettingsMissing() {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(USER_SETTINGS_MISSING_KEY, "1");
}

export function getLastFarmId() {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return localStorage.getItem(LAST_FARM_ID_KEY);
}

export function setLastFarmId(farmId) {
  if (typeof localStorage === "undefined") {
    return;
  }

  if (farmId) {
    localStorage.setItem(LAST_FARM_ID_KEY, String(farmId));
  } else {
    localStorage.removeItem(LAST_FARM_ID_KEY);
  }
}

export async function atualizarLastFarmUsuario({ userId, farmId }) {
  if (!userId || !farmId) {
    return;
  }

  if (isUserSettingsMissing()) {
    return;
  }

  try {
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: userId, last_farm_id: farmId }, { onConflict: "user_id" });

    if (!error) {
      return;
    }

    if (isMissingUserSettingsTableError(error)) {
      marcarUserSettingsMissing();
      if (!missingUserSettingsTableWarned) {
        console.warn("Tabela user_settings não encontrada; ignorando last_farm_id.");
        missingUserSettingsTableWarned = true;
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.warn("Erro ao salvar last_farm_id:", error.message);
    }
  } catch (error) {
    if (isMissingUserSettingsTableError(error)) {
      marcarUserSettingsMissing();
      if (!missingUserSettingsTableWarned) {
        console.warn("Tabela user_settings não encontrada; ignorando last_farm_id.");
        missingUserSettingsTableWarned = true;
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.warn("Erro ao salvar last_farm_id:", error?.message);
    }
  }
}

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
