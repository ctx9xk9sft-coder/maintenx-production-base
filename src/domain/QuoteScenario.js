function nowIso() {
  return new Date().toISOString();
}

function buildId(prefix = "scenario") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createQuoteScenario(input = {}) {
  const {
    scenarioId,
    quoteDraftId,
    label,
    assumptions = {},
    pricingSnapshot = {},
    maintenanceSnapshot = {},
    monthlyCost = 0,
    totalTco = 0,
    selected = false,
    createdAt,
  } = input;

  return {
    scenarioId: scenarioId || buildId("qs"),
    quoteDraftId,
    label: label || "Default scenario",
    assumptions: {
      ...assumptions,
    },
    pricingSnapshot: {
      ...pricingSnapshot,
    },
    maintenanceSnapshot: {
      ...maintenanceSnapshot,
    },
    monthlyCost,
    totalTco,
    selected,
    createdAt: createdAt || nowIso(),
  };
}

export function selectScenario(scenarios = [], selectedScenarioId) {
  return scenarios.map((scenario) => ({
    ...scenario,
    selected: scenario.scenarioId === selectedScenarioId,
  }));
}
