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

      if (item.action === "medicoes_leite.upsert") {
        const payload = item.payload || {};
        const rows = Array.isArray(payload) ? payload : [payload];
        if (rows.length > 0) {
          const { error } = await supabase
            .from("medicoes_leite")
            .upsert(rows, { onConflict: "id" });
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "leite_cmt_testes.upsert") {
        const { teste, quartos } = item.payload || {};
        if (teste) {
          const { error } = await supabase
            .from("leite_cmt_testes")
            .upsert(teste, { onConflict: "id" });
          if (error) throw error;
        }
        if (Array.isArray(quartos) && quartos.length > 0) {
          const { error } = await supabase
            .from("leite_cmt_quartos")
            .upsert(quartos, { onConflict: "teste_id,quarto" });
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "leite_ccs_registros.upsert") {
        const payload = item.payload || {};
        const { error } = await supabase
          .from("leite_ccs_registros")
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
        await markDone(item.id);
        continue;
      }

      if (item.action === "estoque.produto.insert") {
        const { produto } = item.payload || {};
        if (produto) {
          const { error } = await supabase.from("estoque_produtos").insert(produto);
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "estoque.produto.update") {
        const { id, payload } = item.payload || {};
        if (id && payload) {
          const { error } = await supabase.from("estoque_produtos").update(payload).eq("id", id);
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "estoque.produto.delete") {
        const { id } = item.payload || {};
        if (id) {
          const { error } = await supabase.from("estoque_produtos").delete().eq("id", id);
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "estoque.lote.insert") {
        const { lote, movimento } = item.payload || {};
        if (lote) {
          const { data: loteRow, error } = await supabase
            .from("estoque_lotes")
            .insert(lote)
            .select("id")
            .single();
          if (error) throw error;

          if (movimento) {
            const movimentoPayload = {
              ...movimento,
              lote_id: movimento?.lote_id || loteRow?.id || null,
            };
            const { error: movError } = await supabase
              .from("estoque_movimentos")
              .insert(movimentoPayload);
            if (movError) throw movError;
          }
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "lotes.insert") {
        const { payload } = item.payload || {};
        if (payload) {
          const { error } = await supabase.from("lotes").insert(payload);
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "lotes.update") {
        const { id, payload } = item.payload || {};
        if (id && payload) {
          const { error } = await supabase.from("lotes").update(payload).eq("id", id);
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "lotes.delete") {
        const { id } = item.payload || {};
        if (id) {
          const { error } = await supabase.from("lotes").delete().eq("id", id);
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "dieta.insert") {
        const { dieta, itens } = item.payload || {};
        if (dieta) {
          const { error } = await supabase.from("dietas").insert(dieta);
          if (error) throw error;
        }
        if (Array.isArray(itens) && itens.length > 0) {
          const { error } = await supabase.from("dietas_itens").insert(itens);
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "dieta.update") {
        const { dieta, itens } = item.payload || {};
        if (dieta?.id) {
          const { error } = await supabase.from("dietas").update(dieta).eq("id", dieta.id);
          if (error) throw error;
        }
        if (dieta?.id) {
          const { error: eDel } = await supabase
            .from("dietas_itens")
            .delete()
            .eq("dieta_id", dieta.id);
          if (eDel) throw eDel;
        }
        if (Array.isArray(itens) && itens.length > 0) {
          const { error } = await supabase.from("dietas_itens").insert(itens);
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "dieta.delete") {
        const { id } = item.payload || {};
        if (id) {
          const { error: eItens } = await supabase.from("dietas_itens").delete().eq("dieta_id", id);
          if (eItens) throw eItens;
          const { error } = await supabase.from("dietas").delete().eq("id", id);
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "financeiro.insert") {
        const payload = item.payload || {};
        const rows = Array.isArray(payload) ? payload : [payload];
        if (rows.length > 0) {
          const { error } = await supabase
            .from("financeiro_lancamentos")
            .upsert(rows, { onConflict: "id" });
          if (error) throw error;
        }
        await markDone(item.id);
        continue;
      }

      if (item.action === "cfg_manejo_upsert") {
        const payload = item.payload || {};
        const { error } = await supabase
          .from("config_manejo_repro")
          .upsert(payload, { onConflict: "user_id,fazenda_id" });
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
