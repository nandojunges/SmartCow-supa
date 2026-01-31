const STORAGE_KEY = "smartcow:relatorios:v1";

const readStorage = () => {
  if (typeof window === "undefined") {
    return { models: [] };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { models: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.models)) {
      return { models: [] };
    }
    return parsed;
  } catch (error) {
    return { models: [] };
  }
};

const writeStorage = (data) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const reportStorage = {
  listModels() {
    const { models } = readStorage();
    return models
      .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  },
  saveModel(model) {
    const storage = readStorage();
    const models = storage.models ?? [];
    const existingIndex = models.findIndex((item) => item.id === model.id);
    const nextModels = [...models];

    if (existingIndex >= 0) {
      nextModels[existingIndex] = model;
    } else {
      nextModels.push(model);
    }

    writeStorage({ models: nextModels });
  },
  loadModel(id) {
    const { models } = readStorage();
    return models.find((item) => item.id === id) ?? null;
  },
  deleteModel(id) {
    const { models } = readStorage();
    const nextModels = models.filter((item) => item.id !== id);
    writeStorage({ models: nextModels });
  },
};

export default reportStorage;
