import { createActualCostEntry } from "../../domain/contracts/ActualCostEntry.js";
import { saveActualCostEntry } from "../../repositories/ActualCostEntryRepository.js";
import { getActiveContractDetail } from "./getActiveContractDetail.js";

export function postActualCostEntry(payload) {
  const entry = createActualCostEntry(payload);

  saveActualCostEntry(entry);

  return {
    entry,
    contract: getActiveContractDetail(entry.contractId),
  };
}

export default postActualCostEntry;
