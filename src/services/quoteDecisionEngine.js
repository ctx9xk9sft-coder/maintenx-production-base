import { buildResolutionContract } from "../contracts/resolutionContract.js";

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function computeQuoteDecision({
  resolvedVehicle = null,
  vehicleConfidence = null,
  pricingConfidence = null,
} = {}) {
  const resolutionContract = buildResolutionContract(resolvedVehicle);
  const vehicleWarnings = toArray(vehicleConfidence?.warnings);
  const pricingWarnings = toArray(pricingConfidence?.warnings);
  const warnings = unique([...resolutionContract.warnings, ...vehicleWarnings, ...pricingWarnings]);

  const pricingLevel = String(pricingConfidence?.level || "low").toLowerCase();
  const pricingBlockers = toArray(pricingConfidence?.blockers);
  const pricingCoverage = Number(pricingConfidence?.metrics?.pricingCoveragePercent ?? 0);

  let status = "blocked";

  if (
    resolutionContract.maintenanceClosure === "safe" &&
    pricingBlockers.length === 0 &&
    pricingLevel === "high" &&
    resolutionContract.identificationClosure === "exact"
  ) {
    status = "ready";
  } else if (
    resolutionContract.maintenanceClosure === "safe" &&
    pricingBlockers.length === 0 &&
    (pricingLevel === "medium" || pricingLevel === "high" || pricingCoverage >= 95)
  ) {
    status = "provisional";
  } else if (
    resolutionContract.maintenanceClosure === "conditional" &&
    pricingBlockers.length === 0 &&
    pricingCoverage >= 95
  ) {
    status = "provisional";
  }

  const blockers = unique([
    ...resolutionContract.blockers,
    ...toArray(vehicleConfidence?.blockers),
    ...pricingBlockers,
  ]);

  return {
    status,
    label:
      status === "ready"
        ? "Može odmah u ponudu"
        : status === "provisional"
        ? "Može u uslovnu ponudu"
        : "Ne može bez ručne intervencije",
    warnings,
    blockers,
    resolutionContract,
    canBuildExactPlan: status === "ready",
    canBuildProvisionalPlan: status !== "blocked",
  };
}

export default computeQuoteDecision;
