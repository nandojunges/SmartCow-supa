import { listPending } from "./localDB";

export async function syncPending() {
  const pending = await listPending();
  const total = pending.length;

  if (typeof window !== "undefined" && total > 0) {
    window.dispatchEvent(
      new CustomEvent("sync:status", {
        detail: { syncing: true, pending: total, processed: 0, total },
      }),
    );
  }

  console.log(`[sync] Pending items: ${total}`);

  if (typeof window !== "undefined" && total > 0) {
    window.dispatchEvent(
      new CustomEvent("sync:status", {
        detail: { syncing: false, pending: 0, processed: total, total },
      }),
    );
  }
}
