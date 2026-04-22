import { buildResolutionContract } from "../contracts/resolutionContract.js";
import { deriveQuoteReadiness } from "../contracts/vehicleStatusContract.js";

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function resolveCanonicalStatus(resolvedVehicle = null) {
  const direct = String(resolvedVehicle?.quoteReadiness || "").toLowerCase();
  if (["ready", "provisional", "blocked"].includes(direct)) return direct;

  if (resolvedVehicle?.internalStatus) {
    return deriveQuoteReadiness(resolvedVehicle.internalStatus);
  }

  return "blocked";
}

function labelForStatus(status) {
  if (status === "ready") return "Može odmah u ponudu";
  if (status === "provisional") return "Može u uslovnu ponudu";
  return "Ne može bez ručne intervencije";
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

  const canonicalStatus = resolveCanonicalStatus(resolvedVehicle);

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
    status: canonicalStatus,
    label: labelForStatus(canonicalStatus),
    warnings,
    blockers,
    resolutionContract,
    canBuildExactPlan: canonicalStatus === "ready",
    canBuildProvisionalPlan: canonicalStatus !== "blocked",
  };
}

export default computeQuoteDecision;