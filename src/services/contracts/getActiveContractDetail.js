import { getAcceptedContractById } from "../../repositories/AcceptedContractRepository.js";
import { buildActiveContractView } from "../../domain/contracts/buildActiveContractView.js";

export function getActiveContractDetail(contractId) {
  const contract = getAcceptedContractById(contractId);

  if (!contract) {
    return null;
  }

  return buildActiveContractView(contract);
}

export default getActiveContractDetail;
