export const TCO_COST_CATEGORY = Object.freeze({
  MAINTENANCE: "maintenance",
  REGISTRATION: "registration",
  INSURANCE: "insurance",
  LEASING: "leasing",
  ADMINISTRATIVE: "administrative",
  EXTRAORDINARY: "extraordinary",
  OPERATING: "operating",
});

export const TCO_COST_FREQUENCY = Object.freeze({
  ONE_TIME: "one_time",
  MONTHLY: "monthly",
  ANNUAL: "annual",
  CONTRACT_TOTAL: "contract_total",
});

function nowIso() {
  return new Date().toISOString();
}

function buildId(prefix = "tco") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isTcoCostCategory(value) {
  return Object.values(TCO_COST_CATEGORY).includes(value);
}

export function isTcoCostFrequency(value) {
  return Object.values(TCO_COST_FREQUENCY).includes(value);
}

export function createTcoCostInput(input = {}) {
  const {
    costInputId,
    category = TCO_COST_CATEGORY.OPERATING,
    label,
    amount = 0,
    frequency = TCO_COST_FREQUENCY.CONTRACT_TOTAL,
    currency = "RSD",
    enabled = true,
    source = "manual",
    metadata = {},
    createdAt,
  } = input;

  if (!isTcoCostCategory(category)) {
    throw new Error(`Invalid TCO cost category: ${category}`);
  }

  if (!isTcoCostFrequency(frequency)) {
    throw new Error(`Invalid TCO cost frequency: ${frequency}`);
  }

  return {
    costInputId: costInputId || buildId("tcoi"),
    category,
    label: label || category,
    amount: Number(amount) || 0,
    frequency,
    currency,
    enabled: Boolean(enabled),
    source,
    metadata: {
      ...metadata,
    },
    createdAt: createdAt || nowIso(),
  };
}

export function normalizeTcoCostInputs(inputs = []) {
  return (Array.isArray(inputs) ? inputs : []).map((item) => createTcoCostInput(item));
}

export default {
  TCO_COST_CATEGORY,
  TCO_COST_FREQUENCY,
  createTcoCostInput,
  normalizeTcoCostInputs,
  isTcoCostCategory,
  isTcoCostFrequency,
};
