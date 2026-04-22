import {
  listAcceptedContracts,
  saveAcceptedContract,
  clearAcceptedContracts,
} from "../repositories/AcceptedContractRepository.js";

// compatibility layer for existing UI imports
export function getContracts() {
  return listAcceptedContracts();
}

export function saveContract(contract) {
  return saveAcceptedContract(contract);
}

export function clearContracts() {
  return clearAcceptedContracts();
}

export default {
  getContracts,
  saveContract,
  clearContracts,
};
