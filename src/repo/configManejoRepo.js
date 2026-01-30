import { supabase } from "../lib/supabaseClient";
import { enqueue, kvGet, kvSet } from "../offline/localDB";

const KEY = "cfg_manejo_repro";

const DEFAULTS = {
  dias_antes_parto_para_secagem: 60,
  dias_antecedencia_preparar_secagem: 7,
  dias_antes_parto_para_preparto: 30,
};

export async function getConfigManejo({ userId }) {
  if (!userId) {
    return { ...DEFAULTS };
  }

  try {
    const { data, error } = await supabase
      .from("config_manejo_repro")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      await kvSet(KEY, data);
      return data;
    }

    const defaults = { ...DEFAULTS, user_id: userId };
    const { error: upsertError } = await supabase
      .from("config_manejo_repro")
      .upsert(defaults, { onConflict: "user_id" });

    await kvSet(KEY, defaults);

    if (upsertError) {
      console.error("Erro ao salvar defaults de manejo reprodutivo:", upsertError);
    }

    return defaults;
  } catch (error) {
    const cached = await kvGet(KEY);
    if (cached) {
      return cached;
    }
    return { ...DEFAULTS, user_id: userId };
  }
}

export async function saveConfigManejo({ userId, patch }) {
  if (!userId) return;

  const atual = (await kvGet(KEY)) || {};
  const merged = { ...atual, ...patch, user_id: userId };

  await kvSet(KEY, merged);

  try {
    const { error } = await supabase
      .from("config_manejo_repro")
      .upsert(merged, { onConflict: "user_id" });
    if (error) throw error;
  } catch (error) {
    await enqueue("config_manejo_repro.upsert", merged);
  }
}

export { KEY as CONFIG_MANEJO_KEY };
