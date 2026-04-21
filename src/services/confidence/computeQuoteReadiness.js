import { computeQuoteDecision } from "../quoteDecisionEngine.js";

export function computeQuoteReadiness({
  resolvedVehicle = null,
  vehicleConfidence = null,
  pricingConfidence = null,
} = {}) {
  return computeQuoteDecision({
    resolvedVehicle,
    vehicleConfidence,
    pricingConfidence,
  });
}

export default computeQuoteReadiness;
