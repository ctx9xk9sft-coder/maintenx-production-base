import { getAcceptedContractById } from "../../repositories/AcceptedContractRepository.js";
import { listActualCostEntries } from "../../repositories/ActualCostEntryRepository.js";
import { buildActiveContractView } from "../../domain/contracts/buildActiveContractView.js";

export function getActiveContractDetail(contractId) {
  const contract = getAcceptedContractById(contractId);

  if (!contract) {
    return null;
  }

  const actualEntries = listActualCostEntries(contractId);

  return buildActiveContractView(contract, actualEntries);
}

export default getActiveContractDetail;
