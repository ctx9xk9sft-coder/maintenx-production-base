import { buildResolutionContract } from "../contracts/resolutionContract.js";

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function labelForStatus(status) {
  if (status === "ready") return "Može odmah u ponudu";
  if (status === "provisional") return "Može u uslovnu ponudu";
  return "Ne može bez ručne intervencije";
}

function resolveDecisionStatus({
  resolutionContract,
  vehicleConfidence,
  pricingConfidence,
}) {
  const maintenanceClosure = String(resolutionContract?.maintenanceClosure || "blocked").toLowerCase();
  const pricingLevel = String(pricingConfidence?.level || "low").toLowerCase();
  const hardBlockers = unique([
    ...toArray(resolutionContract?.blockers),
    ...toArray(vehicleConfidence?.blockers),
  ]);
  const pricingBlockers = toArray(pricingConfidence?.blockers);

  if (hardBlockers.length > 0 || maintenanceClosure === "blocked") {
    return "blocked";
  }

  if (maintenanceClosure !== "safe") {
    return "provisional";
  }

  if (pricingBlockers.length > 0) {
    return "provisional";
  }

  if (pricingLevel === "high" && String(vehicleConfidence?.level || "low").toLowerCase() !== "low") {
    return "ready";
  }

  return "provisional";
}

export function computeQuoteDecision({
  resolvedVehicle = null,
  vehicleConfidence = null,
  pricingConfidence = null,
} = {}) {
  const resolutionContract = buildResolutionContract(resolvedVehicle);
  const vehicleWarnings = toArray(vehicleConfidence?.warnings);
  const pricingWarnings = toArray(pricingConfidence?.warnings);
  const pricingLevel = String(pricingConfidence?.level || "low").toLowerCase();
  const pricingBlockers = toArray(pricingConfidence?.blockers);
  const pricingCoverage = Number(pricingConfidence?.metrics?.pricingCoveragePercent ?? 0);

  const status = resolveDecisionStatus({
    resolutionContract,
    vehicleConfidence,
    pricingConfidence,
  });

  const blockers = unique([
    ...resolutionContract.blockers,
    ...toArray(vehicleConfidence?.blockers),
    ...pricingBlockers,
  ]);

  const warnings = unique([
    ...resolutionContract.warnings,
    ...vehicleWarnings,
    ...pricingWarnings,
    ...(pricingLevel === "medium" ? ["pricing_confidence_medium"] : []),
    ...(pricingLevel === "low" ? ["pricing_confidence_low"] : []),
    ...(pricingCoverage > 0 && pricingCoverage < 95 ? ["pricing_coverage_below_95"] : []),
  ]);

  return {
    status,
    label: labelForStatus(status),
    warnings,
    blockers,
    resolutionContract,
    canBuildExactPlan: status === "ready",
    canBuildProvisionalPlan: status !== "blocked",
  };
}

export default computeQuoteDecision;
