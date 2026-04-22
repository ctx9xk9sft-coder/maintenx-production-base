import { createLocalStorageCollection } from "../services/storage/localStorageCollection.js";

const storage = createLocalStorageCollection({
  key: "accepted_contracts",
  version: 1,
});

export function listAcceptedContracts() {
  return storage.readAll();
}

export function saveAcceptedContract(contract) {
  if (!contract?.id) {
    throw new Error("accepted_contract_id_required");
  }

  return storage.prepend({
    ...contract,
    repositoryVersion: 1,
    persistedAt: new Date().toISOString(),
  });
}

export function clearAcceptedContracts() {
  storage.clear();
}

export default {
  listAcceptedContracts,
  saveAcceptedContract,
  clearAcceptedContracts,
};
