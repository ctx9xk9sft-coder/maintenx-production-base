function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildPlanningGate(inputs = {}) {
  const missingFields = [];
  const reasons = [];

  const hasServiceRegime = Boolean(normalizeString(inputs.serviceRegime));
  const hasUsageProfile = Boolean(normalizeString(inputs.usageProfile));
  const validPlannedKm = isPositiveNumber(inputs.plannedKm);
  const validContractMonths = isPositiveNumber(inputs.contractMonths);

  if (!hasServiceRegime) {
    missingFields.push("serviceRegime");
    reasons.push("service_regime_missing");
  }

  if (!hasUsageProfile) {
    missingFields.push("usageProfile");
    reasons.push("usage_profile_missing");
  }

  if (!validPlannedKm) {
    missingFields.push("plannedKm");
    reasons.push("planned_km_invalid");
  }

  if (!validContractMonths) {
    missingFields.push("contractMonths");
    reasons.push("contract_months_invalid");
  }

  const hasInvalidNumericInput = !validPlannedKm || !validContractMonths;

  const status = hasInvalidNumericInput
    ? "invalid"
    : missingFields.length === 0
    ? "ready_for_planning"
    : "needs_manual_input";

  return {
    status,
    canonicalStatus: status,
    missingFields,
    reasons,
    normalized: {
      serviceRegime: hasServiceRegime ? normalizeString(inputs.serviceRegime) : null,
      usageProfile: hasUsageProfile ? normalizeString(inputs.usageProfile) : null,
      plannedKm: validPlannedKm ? inputs.plannedKm : null,
      contractMonths: validContractMonths ? inputs.contractMonths : null,
    },
  };
}

export function validatePlanningInputs(inputs = {}) {
  const planningGate = buildPlanningGate(inputs);

  return {
    status: planningGate.status,
    canonicalStatus: planningGate.canonicalStatus,
    missingFields: planningGate.missingFields,
    reasons: planningGate.reasons,
    normalized: planningGate.normalized,
  };
}