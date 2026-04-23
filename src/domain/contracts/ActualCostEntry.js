export const ACTUAL_COST_CATEGORY = {
  SERVICE: "service",
  TIRES: "tires",
  REGISTRATION: "registration",
  INSURANCE: "insurance",
  LEASING: "leasing",
  EXTRAORDINARY: "extraordinary",
  OPERATING: "operating",
  ADMINISTRATIVE: "administrative",
  OTHER: "other",
};

function normalizeAmount(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function createActualCostEntry({
  id,
  contractId,
  category,
  amount,
  postedAt,
  supplier = null,
  note = null,
  source = "manual",
} = {}) {
  if (!contractId) {
    throw new Error("actual_cost_contract_id_required");
  }

  if (!category || !Object.values(ACTUAL_COST_CATEGORY).includes(category)) {
    throw new Error("actual_cost_category_invalid");
  }

  const normalizedAmount = normalizeAmount(amount);
  if (!(normalizedAmount > 0)) {
    throw new Error("actual_cost_amount_invalid");
  }

  return {
    id: id || `ace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    contractId,
    category,
    amount: normalizedAmount,
    postedAt: postedAt || new Date().toISOString(),
    supplier,
    note,
    source,
  };
}

export default createActualCostEntry;
