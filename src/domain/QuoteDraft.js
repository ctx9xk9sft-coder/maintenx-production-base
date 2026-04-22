export const QUOTE_DRAFT_STATUS = Object.freeze({
  DRAFT: "draft",
  SENT: "sent",
  EXPIRED: "expired",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
});

function nowIso() {
  return new Date().toISOString();
}

function buildId(prefix = "quote") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createQuoteDraft(input = {}) {
  const {
    quoteDraftId,
    customerId = null,
    vehicleConfiguration = null,
    pricingInputs = {},
    generatedScenarios = [],
    selectedScenarioId = null,
    status = QUOTE_DRAFT_STATUS.DRAFT,
    createdAt,
    updatedAt,
    sentAt = null,
    acceptedAt = null,
    rejectedAt = null,
    expiredAt = null,
    metadata = {},
  } = input;

  const timestamp = nowIso();

  return {
    quoteDraftId: quoteDraftId || buildId("qd"),
    customerId,
    vehicleConfiguration,
    pricingInputs: {
      ...pricingInputs,
    },
    generatedScenarios: Array.isArray(generatedScenarios) ? generatedScenarios : [],
    selectedScenarioId,
    status,
    createdAt: createdAt || timestamp,
    updatedAt: updatedAt || timestamp,
    sentAt,
    acceptedAt,
    rejectedAt,
    expiredAt,
    metadata: {
      ...metadata,
    },
  };
}

export function updateQuoteDraft(quoteDraft, patch = {}) {
  return {
    ...quoteDraft,
    ...patch,
    updatedAt: nowIso(),
  };
}

export function setQuoteDraftStatus(quoteDraft, nextStatus) {
  const timestamp = nowIso();
  const patch = { status: nextStatus, updatedAt: timestamp };

  if (nextStatus === QUOTE_DRAFT_STATUS.SENT) patch.sentAt = timestamp;
  if (nextStatus === QUOTE_DRAFT_STATUS.ACCEPTED) patch.acceptedAt = timestamp;
  if (nextStatus === QUOTE_DRAFT_STATUS.REJECTED) patch.rejectedAt = timestamp;
  if (nextStatus === QUOTE_DRAFT_STATUS.EXPIRED) patch.expiredAt = timestamp;

  return {
    ...quoteDraft,
    ...patch,
  };
}

export function isQuoteDraftStatus(value) {
  return Object.values(QUOTE_DRAFT_STATUS).includes(value);
}

export default {
  QUOTE_DRAFT_STATUS,
  createQuoteDraft,
  updateQuoteDraft,
  setQuoteDraftStatus,
  isQuoteDraftStatus,
};
