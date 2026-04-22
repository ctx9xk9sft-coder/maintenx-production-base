import { createLocalStorageCollection } from "../services/storage/localStorageCollection.js";

const storage = createLocalStorageCollection({
  key: "quote_drafts",
  version: 1,
});

export function listQuoteDrafts() {
  return storage.readAll();
}

export function saveQuoteDraft(draft) {
  if (!draft?.id) {
    throw new Error("quote_draft_id_required");
  }

  return storage.prepend({
    ...draft,
    status: draft.status || "draft",
    repositoryVersion: 1,
    persistedAt: new Date().toISOString(),
  });
}

export function clearQuoteDrafts() {
  storage.clear();
}

export default {
  listQuoteDrafts,
  saveQuoteDraft,
  clearQuoteDrafts,
};
