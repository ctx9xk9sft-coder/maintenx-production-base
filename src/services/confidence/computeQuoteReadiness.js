function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function computeQuoteReadiness({
  resolvedVehicle = null,
  vehicleConfidence = null,
  pricingConfidence = null,
} = {}) {
  const quoteReadiness = resolvedVehicle?.quoteReadiness || "blocked";
  const warnings = unique([...(vehicleConfidence?.warnings || []), ...(pricingConfidence?.warnings || [])]);
  const blockers = unique([...(vehicleConfidence?.blockers || []), ...(pricingConfidence?.blockers || [])]);

  const label =
    quoteReadiness === "ready"
      ? "Može odmah u ponudu"
      : quoteReadiness === "provisional"
      ? "Može u uslovnu ponudu"
      : "Ne može bez ručne intervencije";

  return {
    status: quoteReadiness,
    label,
    warnings,
    blockers,
    canBuildExactPlan: Boolean(resolvedVehicle?.canBuildExactPlan),
    canBuildProvisionalPlan: Boolean(resolvedVehicle?.canBuildProvisionalPlan),
    metrics: {
      pricingConfidence: pricingConfidence?.level || null,
      vehicleConfidence: vehicleConfidence?.level || null,
    },
  };
}

export default computeQuoteReadiness;
