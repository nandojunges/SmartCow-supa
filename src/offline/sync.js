import { supabase } from "../lib/supabaseClient";
import { kvSet, listPending, markDone, markFailed } from "./localDB";

function dispatchSyncStatus(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sync:status", { detail }));
}

export async function syncPending() {
  const pending = await listPending();
  const total = pending.length;

  if (total > 0) {
    dispatchSyncStatus({
      syncing: true,
      pending: total,
      processed: 0,
      total,
    });
  }

  console.log(`[sync] Pending items: ${total}`);

  let processed = 0;

  for (const item of pending) {
    try {
      if (item.action === "animais.upsert" || item.action === "animals.upsert") {
        const payload = item.payload || {};
        if (payload.id) {
          const { error } = await supabase
            .from("animais")
            .upsert(payload, { onConflict: "id" });
          if (error) throw error;
        } else {
          const { error } = await supabase.from("animais").insert(payload);
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "saidas_animais.insert") {
        const payload = item.payload || {};
        const { error } = await supabase.from("saidas_animais").insert(payload);
        if (error) throw error;
        await markDone(item.id);
        continue;
      }

      if (item.action === "animais.setAtivoFalse") {
        const { animal_id: animalId } = item.payload || {};
        const { error } = await supabase
          .from("animais")
          .update({ ativo: false })
          .eq("id", animalId);
        if (error) throw error;
        await markDone(item.id);
        continue;
      }

      if (item.action === "eventos_reprodutivos.insert") {
        const payload = item.payload || {};
        const { error } = await supabase
          .from("eventos_reprodutivos")
          .insert(payload);
        if (error) throw error;
        await markDone(item.id);
        continue;
      }

      await markFailed(item.id, `Ação não suportada: ${item.action}`);
    } catch (error) {
      console.error("[sync] Falha ao processar item:", item, error);
      await markFailed(item.id, error?.message || "Erro ao sincronizar");
    } finally {
      processed += 1;
      dispatchSyncStatus({
        syncing: processed < total,
        pending: Math.max(total - processed, 0),
        processed,
        total,
      });
    }
  }
}

export async function syncAnimaisSeed() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  try {
    const { data, error } = await supabase.from("animais").select("*");
    if (error) throw error;
    await kvSet("cache:animais:list", Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("[sync] Falha ao seedar animais:", error);
  }
}
