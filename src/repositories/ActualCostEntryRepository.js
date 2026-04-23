import { createLocalStorageCollection } from "../services/storage/localStorageCollection.js";

const storage = createLocalStorageCollection({
  key: "actual_cost_entries",
  version: 1,
});

export function listActualCostEntries(contractId = null) {
  const items = storage.readAll();
  if (!contractId) return items;
  return items.filter((item) => item?.contractId === contractId);
}

export function saveActualCostEntry(entry) {
  return storage.prepend({
    ...entry,
    persistedAt: new Date().toISOString(),
  });
}

export function clearActualCostEntries() {
  storage.clear();
}
