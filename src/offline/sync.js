import { supabase } from "../lib/supabaseClient";
import { listPending, markDone, markFailed } from "./localDB";

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
      if (item.action === "animals.upsert") {
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
      } else {
        await markFailed(item.id, `Ação não suportada: ${item.action}`);
      }
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
