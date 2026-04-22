import { createQuoteDraft, setQuoteDraftStatus, updateQuoteDraft } from "../domain/QuoteDraft.js";
import { createQuoteScenario, selectScenario } from "../domain/QuoteScenario.js";
import { createAcceptedContract } from "../domain/AcceptedContract.js";
import { createVehicleAsset, assignVehicleToContract } from "../domain/VehicleAsset.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildVehicleConfigurationSnapshot(input = {}) {
  const {
    decoded = null,
    resolvedVehicle = null,
    exploitationType = null,
    exploitationLabel = null,
    plannedKm = null,
    contractMonths = null,
    tireCategory = null,
    pricingInputs = {},
  } = input;

  return {
    vin: decoded?.vin || resolvedVehicle?.canonicalVehicle?.vin || null,
    brand: decoded?.marka || resolvedVehicle?.canonicalVehicle?.brand || "Skoda",
    model: decoded?.model || resolvedVehicle?.canonicalVehicle?.model || null,
    modelYear: decoded?.modelYear || resolvedVehicle?.canonicalVehicle?.modelYear || null,
    engineCode:
      resolvedVehicle?.fields?.engine?.value ||
      resolvedVehicle?.canonicalVehicle?.engineCode ||
      decoded?.motorKod ||
      null,
    gearboxCode:
      resolvedVehicle?.fields?.gearbox?.resolvedCode ||
      resolvedVehicle?.fields?.gearbox?.value ||
      resolvedVehicle?.canonicalVehicle?.gearboxCode ||
      null,
    drivetrain:
      resolvedVehicle?.fields?.drivetrain?.value ||
      resolvedVehicle?.canonicalVehicle?.drivetrain ||
      decoded?.drivetrain ||
      null,
    exploitationType,
    exploitationLabel,
    plannedKm,
    contractMonths,
    tireCategory,
    pricingInputs: {
      ...pricingInputs,
    },
  };
}

function buildScenarioAssumptions(input = {}) {
  const {
    plannedKm = null,
    contractMonths = null,
    exploitationType = null,
    exploitationLabel = null,
    tireCategory = null,
    laborRate = null,
    oilPricePerLiter = null,
    laborDiscount = 0,
    partsDiscount = 0,
    oilDiscount = 0,
    flexInterval = null,
  } = input;

  return {
    plannedKm,
    contractMonths,
    exploitationType,
    exploitationLabel,
    tireCategory,
    laborRate,
    oilPricePerLiter,
    laborDiscount,
    partsDiscount,
    oilDiscount,
    flexInterval,
  };
}

function buildMaintenanceSnapshot(maintenancePlan = null) {
  return {
    planning: maintenancePlan?.planning || null,
    totals: maintenancePlan?.totals || null,
    meta: maintenancePlan?.meta || null,
    pricingMeta: maintenancePlan?.pricingMeta || null,
    events: toArray(maintenancePlan?.events),
  };
}

function buildScenarioLabel(input = {}) {
  const km = input?.plannedKm ? `${input.plannedKm} km` : "Scenario";
  const months = input?.contractMonths ? `${input.contractMonths} mes` : null;
  return [km, months].filter(Boolean).join(" / ");
}

export function createDraftFromCalculation(input = {}) {
  const vehicleConfiguration = buildVehicleConfigurationSnapshot(input);
  const assumptions = buildScenarioAssumptions({
    plannedKm: input?.plannedKm,
    contractMonths: input?.contractMonths,
    exploitationType: input?.exploitationType,
    exploitationLabel: input?.exploitationLabel,
    tireCategory: input?.tireCategory,
    laborRate: input?.hourlyRate,
    oilPricePerLiter: input?.oilPricePerLiter,
    laborDiscount: input?.laborDiscount,
    partsDiscount: input?.partsDiscount,
    oilDiscount: input?.oilDiscount,
    flexInterval: input?.flexInterval,
  });

  const baseScenario = createQuoteScenario({
    quoteDraftId: null,
    label: buildScenarioLabel(input),
    assumptions,
    pricingSnapshot: {
      totals: input?.maintenancePlan?.totals || null,
      pricingMeta: input?.maintenancePlan?.pricingMeta || null,
    },
    maintenanceSnapshot: buildMaintenanceSnapshot(input?.maintenancePlan),
    monthlyCost: Number(input?.maintenancePlan?.totals?.totalCost || 0) / Math.max(Number(input?.contractMonths || 1), 1),
    totalTco: Number(input?.maintenancePlan?.totals?.totalCost || 0),
    selected: true,
  });

  const scenarios = [baseScenario];

  const draft = createQuoteDraft({
    customerId: input?.customerId || null,
    vehicleConfiguration,
    pricingInputs: {
      hourlyRate: input?.hourlyRate ?? null,
      oilPricePerLiter: input?.oilPricePerLiter ?? null,
      tireCategory: input?.tireCategory ?? null,
      laborDiscount: input?.laborDiscount ?? 0,
      partsDiscount: input?.partsDiscount ?? 0,
      oilDiscount: input?.oilDiscount ?? 0,
      flexInterval: input?.flexInterval ?? null,
    },
    generatedScenarios: scenarios,
    selectedScenarioId: baseScenario.scenarioId,
    metadata: {
      source: "calculation",
      quoteReadiness: input?.quoteReadiness?.status || null,
      quoteReadinessLabel: input?.quoteReadiness?.label || null,
    },
  });

  const hydratedScenarios = scenarios.map((scenario) => ({
    ...scenario,
    quoteDraftId: draft.quoteDraftId,
  }));

  return updateQuoteDraft(draft, {
    generatedScenarios: hydratedScenarios,
    selectedScenarioId: hydratedScenarios[0]?.scenarioId || null,
  });
}

export function replaceDraftScenarios(quoteDraft, scenarios = []) {
  const normalized = toArray(scenarios).map((scenario) =>
    createQuoteScenario({
      ...scenario,
      quoteDraftId: quoteDraft?.quoteDraftId,
    })
  );

  const selectedScenario = normalized.find((scenario) => scenario.selected) || normalized[0] || null;

  return updateQuoteDraft(quoteDraft, {
    generatedScenarios: normalized,
    selectedScenarioId: selectedScenario?.scenarioId || null,
  });
}

export function selectDraftScenario(quoteDraft, selectedScenarioId) {
  const currentScenarios = toArray(quoteDraft?.generatedScenarios);
  const nextScenarios = selectScenario(currentScenarios, selectedScenarioId);

  return updateQuoteDraft(quoteDraft, {
    generatedScenarios: nextScenarios,
    selectedScenarioId,
  });
}

export function markQuoteDraftSent(quoteDraft) {
  return setQuoteDraftStatus(quoteDraft, "sent");
}

export function markQuoteDraftRejected(quoteDraft) {
  return setQuoteDraftStatus(quoteDraft, "rejected");
}

export function markQuoteDraftExpired(quoteDraft) {
  return setQuoteDraftStatus(quoteDraft, "expired");
}

export function acceptQuoteDraft(quoteDraft, input = {}) {
  const selectedScenario =
    toArray(quoteDraft?.generatedScenarios).find(
      (scenario) => scenario.scenarioId === quoteDraft?.selectedScenarioId
    ) || null;

  const vehicleAsset = createVehicleAsset({
    vin: quoteDraft?.vehicleConfiguration?.vin || null,
    customerId: quoteDraft?.customerId || null,
    vehicleConfiguration: quoteDraft?.vehicleConfiguration || null,
    status: "available",
  });

  const contract = createAcceptedContract({
    quoteDraftId: quoteDraft?.quoteDraftId,
    vehicleId: vehicleAsset.vehicleId,
    customerId: quoteDraft?.customerId || null,
    selectedScenarioSnapshot: selectedScenario,
    contractStartDate: input?.contractStartDate || null,
    contractEndDate: input?.contractEndDate || null,
    contractKm:
      input?.contractKm ??
      quoteDraft?.vehicleConfiguration?.plannedKm ??
      selectedScenario?.assumptions?.plannedKm ??
      null,
    monthlyFee:
      input?.monthlyFee ??
      selectedScenario?.monthlyCost ??
      null,
  });

  const assignedVehicle = assignVehicleToContract(vehicleAsset, contract.contractId);
  const acceptedDraft = setQuoteDraftStatus(quoteDraft, "accepted");

  return {
    quoteDraft: acceptedDraft,
    acceptedContract: contract,
    vehicleAsset: assignedVehicle,
  };
}

export default {
  createDraftFromCalculation,
  replaceDraftScenarios,
  selectDraftScenario,
  markQuoteDraftSent,
  markQuoteDraftRejected,
  markQuoteDraftExpired,
  acceptQuoteDraft,
};
