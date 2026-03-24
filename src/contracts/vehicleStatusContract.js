export const INTERNAL_STATUS = {
  READY_EXACT: "ready_exact",
  PARTIAL_INFERRED: "partial_inferred",
  NEEDS_MANUAL_INPUT: "needs_manual_input",
  INVALID: "invalid",
};

export const QUOTE_READINESS = {
  READY: "ready",
  PROVISIONAL: "provisional",
  BLOCKED: "blocked",
};

export function deriveQuoteReadiness(internalStatus) {
  switch (internalStatus) {
    case INTERNAL_STATUS.READY_EXACT:
      return QUOTE_READINESS.READY;
    case INTERNAL_STATUS.PARTIAL_INFERRED:
      return QUOTE_READINESS.PROVISIONAL;
    case INTERNAL_STATUS.NEEDS_MANUAL_INPUT:
    case INTERNAL_STATUS.INVALID:
    default:
      return QUOTE_READINESS.BLOCKED;
  }
}

export function derivePlanCapabilities(internalStatus) {
  const quoteReadiness = deriveQuoteReadiness(internalStatus);

  return {
    quoteReadiness,
    canBuildExactPlan: quoteReadiness === QUOTE_READINESS.READY,
    canBuildProvisionalPlan:
      quoteReadiness === QUOTE_READINESS.READY ||
      quoteReadiness === QUOTE_READINESS.PROVISIONAL,
  };
}

export function buildVehicleStatusContract(internalStatus) {
  return {
    internalStatus,
    ...derivePlanCapabilities(internalStatus),
  };
}
