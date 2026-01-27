import { kvSet, kvGet, kvDel } from "./localDB";

const OFFLINE_SESSION_KEY = "offlineSession";

export async function saveOfflineSession(sessionData) {
  if (!sessionData || !sessionData.userId || !sessionData.email) {
    return;
  }
  const payload = {
    userId: sessionData.userId,
    email: sessionData.email,
    savedAtISO: sessionData.savedAtISO,
  };
  await kvSet(OFFLINE_SESSION_KEY, payload);
}

export async function getOfflineSession() {
  return kvGet(OFFLINE_SESSION_KEY);
}

export async function clearOfflineSession() {
  await kvDel(OFFLINE_SESSION_KEY);
}

export async function canUseOffline() {
  const session = await getOfflineSession();
  return Boolean(session && session.userId && session.email);
}
