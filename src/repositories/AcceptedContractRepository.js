import { createLocalStorageCollection } from "../services/storage/localStorageCollection.js";

const storage = createLocalStorageCollection({
  key: "accepted_contracts",
  version: 1,
});

export function listAcceptedContracts() {
  return storage.readAll();
}

export function getAcceptedContractById(contractId) {
  if (!contractId) return null;
  return listAcceptedContracts().find((contract) => contract?.id === contractId) || null;
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

export function replaceAcceptedContract(contractId, nextContract) {
  if (!contractId) {
    throw new Error("accepted_contract_id_required");
  }

  const items = listAcceptedContracts();
  const nextItems = items.map((item) =>
    item?.id === contractId
      ? {
          ...nextContract,
          id: contractId,
          repositoryVersion: 1,
          persistedAt: new Date().toISOString(),
        }
      : item
  );

  storage.replace(nextItems);
  return getAcceptedContractById(contractId);
}

export function clearAcceptedContracts() {
  storage.clear();
}

export default {
  listAcceptedContracts,
  getAcceptedContractById,
  saveAcceptedContract,
  replaceAcceptedContract,
  clearAcceptedContracts,
};
