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
      } else if (item.action === "medicoes_leite.upsert") {
        const payload = item.payload || {};
        if (payload.id) {
          const { error } = await supabase
            .from("medicoes_leite")
            .upsert(payload, { onConflict: "id" });
          if (error) throw error;
          await markDone(item.id);
        } else {
          await markFailed(item.id, "Payload inválido para medicoes_leite.upsert");
        }
      } else if (item.action === "leite_cmt_testes.upsert") {
        const payload = item.payload || {};
        const teste = payload?.teste || {};
        const quartos = payload?.quartos || [];
        if (teste?.id) {
          const { error: testeError } = await supabase
            .from("leite_cmt_testes")
            .upsert(teste, { onConflict: "id" });
          if (testeError) throw testeError;

          if (Array.isArray(quartos) && quartos.length > 0) {
            const { error: quartosError } = await supabase
              .from("leite_cmt_quartos")
              .upsert(quartos, { onConflict: "teste_id,quarto" });
            if (quartosError) throw quartosError;
          }

          await markDone(item.id);
        } else {
          await markFailed(item.id, "Payload inválido para leite_cmt_testes.upsert");
        }
      } else if (item.action === "leite_ccs_registros.upsert") {
        const payload = item.payload || {};
        if (payload.id) {
          const { error } = await supabase
            .from("leite_ccs_registros")
            .upsert(payload, { onConflict: "id" });
          if (error) throw error;
          await markDone(item.id);
        } else {
          await markFailed(item.id, "Payload inválido para leite_ccs_registros.upsert");
        }
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
