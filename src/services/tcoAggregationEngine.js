import {
  TCO_COST_FREQUENCY,
  normalizeTcoCostInputs,
} from "../domain/TcoCostInput.js";

function calculateContractValue(input, contractMonths = 0) {
  if (!input?.enabled) return 0;

  const amount = Number(input.amount || 0);

  switch (input.frequency) {
    case TCO_COST_FREQUENCY.ONE_TIME:
      return amount;

    case TCO_COST_FREQUENCY.MONTHLY:
      return amount * contractMonths;

    case TCO_COST_FREQUENCY.ANNUAL:
      return amount * (contractMonths / 12);

    case TCO_COST_FREQUENCY.CONTRACT_TOTAL:
    default:
      return amount;
  }
}

export function aggregateTcoCosts({
  maintenanceTotal = 0,
  contractMonths = 0,
  additionalCosts = [],
} = {}) {
  const normalizedInputs = normalizeTcoCostInputs(additionalCosts);

  const grouped = {};

  for (const input of normalizedInputs) {
    const total = calculateContractValue(input, contractMonths);

    if (!grouped[input.category]) {
      grouped[input.category] = {
        category: input.category,
        total: 0,
        items: [],
      };
    }

    grouped[input.category].total += total;
    grouped[input.category].items.push({
      ...input,
      contractTotal: total,
    });
  }

  const maintenance = Number(maintenanceTotal || 0);
  const nonMaintenanceTotal = Object.values(grouped).reduce(
    (sum, category) => sum + category.total,
    0
  );

  const grandTotal = maintenance + nonMaintenanceTotal;

  return {
    maintenanceTotal: maintenance,
    nonMaintenanceTotal,
    grandTotal,
    monthlyTco: contractMonths > 0 ? grandTotal / contractMonths : 0,
    categories: grouped,
  };
}

export default {
  aggregateTcoCosts,
};
