import { listPending } from "./localDB";

export async function syncPending() {
  const pending = await listPending();
  console.log(`[sync] Pending items: ${pending.length}`);
}
