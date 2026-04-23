import { getAcceptedContractById } from "../../src/repositories/AcceptedContractRepository.js";
import { buildActiveContractView } from "../../src/domain/contracts/buildActiveContractView.js";

export function getActiveContractDetail(contractId) {
  const contract = getAcceptedContractById(contractId);

  if (!contract) {
    return null;
  }

  return buildActiveContractView(contract);
}

export default getActiveContractDetail;
