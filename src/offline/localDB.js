let dbPromise = null;

function logError(message, error) {
  if (error) {
    console.error(`[localDB] ${message}`, error);
  } else {
    console.error(`[localDB] ${message}`);
  }
}

function generateFallbackUUID() {
  const randomPart = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${randomPart()}-${randomPart()}`;
}

function openDB() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open("smartcow_offline", 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("queue")) {
          const store = db.createObjectStore("queue", { keyPath: "id" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        db.onversionchange = () => {
          db.close();
        };
        resolve(db);
      };

      request.onerror = () => {
        logError("Failed to open IndexedDB", request.error);
        resolve(null);
      };
    } catch (error) {
      logError("IndexedDB is not available", error);
      resolve(null);
    }
  });

  return dbPromise;
}

async function tx(storeName, mode) {
  const db = await openDB();
  if (!db) {
    return null;
  }

  try {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return { transaction, store };
  } catch (error) {
    logError(`Failed to open transaction for ${storeName}`, error);
    return null;
  }
}

export async function initLocalDB() {
  await openDB();
}

export async function kvSet(key, value) {
  const context = await tx("kv", "readwrite");
  if (!context) {
    return;
  }

  const record = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  };

  await new Promise((resolve) => {
    const request = context.store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      logError(`Failed to set kv for key ${key}`, request.error);
      resolve();
    };
  });
}

export async function kvGet(key) {
  const context = await tx("kv", "readonly");
  if (!context) {
    return null;
  }

  return new Promise((resolve) => {
    const request = context.store.get(key);
    request.onsuccess = () => {
      resolve(request.result ? request.result.value : null);
    };
    request.onerror = () => {
      logError(`Failed to get kv for key ${key}`, request.error);
      resolve(null);
    };
  });
}

export async function kvDel(key) {
  const context = await tx("kv", "readwrite");
  if (!context) {
    return;
  }

  await new Promise((resolve) => {
    const request = context.store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      logError(`Failed to delete kv for key ${key}`, request.error);
      resolve();
    };
  });
}

export async function enqueue(action, payload) {
  const context = await tx("queue", "readwrite");
  if (!context) {
    return null;
  }

  let id = null;
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      id = crypto.randomUUID();
    } else {
      id = generateFallbackUUID();
    }
  } catch (error) {
    logError("Failed to generate UUID", error);
    id = generateFallbackUUID();
  }

  const item = {
    id,
    action: String(action),
    payload,
    status: "pending",
    createdAt: new Date().toISOString(),
    tryCount: 0,
    lastError: null,
  };

  await new Promise((resolve) => {
    const request = context.store.add(item);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      logError("Failed to enqueue item", request.error);
      resolve();
    };
  });

  return id;
}

export async function listPending(limit = 50) {
  const context = await tx("queue", "readonly");
  if (!context) {
    return [];
  }

  return new Promise((resolve) => {
    let request;
    try {
      const statusIndex = context.store.index("status");
      request = statusIndex.getAll("pending");
    } catch (error) {
      logError("Failed to read status index", error);
      request = context.store.getAll();
    }

    request.onsuccess = () => {
      const items = Array.isArray(request.result) ? request.result : [];
      const pending = items
        .filter((item) => item.status === "pending")
        .sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return aTime - bTime;
        })
        .slice(0, limit);
      resolve(pending);
    };
    request.onerror = () => {
      logError("Failed to list pending queue items", request.error);
      resolve([]);
    };
  });
}

export async function markDone(id) {
  const context = await tx("queue", "readwrite");
  if (!context) {
    return;
  }

  await new Promise((resolve) => {
    const request = context.store.get(id);
    request.onsuccess = () => {
      const item = request.result;
      if (!item) {
        resolve();
        return;
      }
      item.status = "done";
      const updateRequest = context.store.put(item);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => {
        logError(`Failed to mark done for ${id}`, updateRequest.error);
        resolve();
      };
    };
    request.onerror = () => {
      logError(`Failed to read queue item ${id}`, request.error);
      resolve();
    };
  });
}

export async function markFailed(id, errorMessage) {
  const context = await tx("queue", "readwrite");
  if (!context) {
    return;
  }

  await new Promise((resolve) => {
    const request = context.store.get(id);
    request.onsuccess = () => {
      const item = request.result;
      if (!item) {
        resolve();
        return;
      }
      item.status = "failed";
      item.tryCount = Number(item.tryCount || 0) + 1;
      item.lastError = errorMessage || null;
      const updateRequest = context.store.put(item);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => {
        logError(`Failed to mark failed for ${id}`, updateRequest.error);
        resolve();
      };
    };
    request.onerror = () => {
      logError(`Failed to read queue item ${id}`, request.error);
      resolve();
    };
  });
}
