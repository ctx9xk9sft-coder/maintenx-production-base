export const CONTRACT_STATUS = Object.freeze({
  ACTIVE: "active",
  COMPLETED: "completed",
  TERMINATED: "terminated",
  DEFAULTED: "defaulted",
});

function nowIso() {
  return new Date().toISOString();
}

function buildId(prefix = "contract") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createAcceptedContract(input = {}) {
  const {
    contractId,
    quoteDraftId,
    vehicleId,
    selectedScenarioSnapshot,
    contractStartDate,
    contractEndDate,
    contractKm,
    monthlyFee,
    customerId = null,
    status = CONTRACT_STATUS.ACTIVE,
    activatedAt,
  } = input;

  return {
    contractId: contractId || buildId("ac"),
    quoteDraftId,
    vehicleId,
    customerId,
    selectedScenarioSnapshot,
    contractStartDate,
    contractEndDate,
    contractKm,
    monthlyFee,
    status,
    activatedAt: activatedAt || nowIso(),
  };
}

export function closeContract(contract, nextStatus) {
  return {
    ...contract,
    status: nextStatus,
    closedAt: nowIso(),
  };
}
