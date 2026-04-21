function getFieldConfidenceScore(field = {}, weight = 1) {
  const confidence = String(field?.confidence || "").toLowerCase();
  const resolved = Boolean(field?.resolved);
  if (!resolved) return 0;
  if (["exact", "confirmed", "high"].includes(confidence)) return 1 * weight;
  if (confidence === "medium") return 0.7 * weight;
  if (confidence === "low") return 0.4 * weight;
  return 0.2 * weight;
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function hasManualOverrides(resolvedVehicle = null) {
  return Boolean(resolvedVehicle?.vehicle?.source?.manualOverrideUsed);
}

export function computeVehicleConfidence({ resolvedVehicle = null, decoded = null } = {}) {
  if (!resolvedVehicle?.supported) {
    return {
      level: "low",
      warnings: ["VIN nije podržan; vozilo nije spremno za pouzdanu kalkulaciju."],
      blockers: ["unsupported_vehicle"],
      metrics: {
        weightedScore: 0,
        requiredFieldCount: 3,
        manualOverrideUsed: false,
        internalStatus: "invalid",
      },
    };
  }

  const fields = resolvedVehicle?.fields || {};
  const internalStatus = resolvedVehicle?.internalStatus || "needs_manual_input";

  const weights = { engine: 0.5, gearbox: 0.3, drivetrain: 0.2 };
  const weightedScore =
    getFieldConfidenceScore(fields.engine, weights.engine) +
    getFieldConfidenceScore(fields.gearbox, weights.gearbox) +
    getFieldConfidenceScore(fields.drivetrain, weights.drivetrain);

  const resolvedRequiredFields = [fields.engine, fields.gearbox, fields.drivetrain].filter((field) => field?.resolved).length;
  const manualOverrideUsed = hasManualOverrides(resolvedVehicle);
  const warnings = [];
  const blockers = [];

  if (internalStatus === "invalid") {
    blockers.push("vehicle_blocked");
  }

  if (resolvedRequiredFields < 3) {
    blockers.push("missing_required_vehicle_fields");
  }

  if (manualOverrideUsed) warnings.push("Rezultat koristi ručnu dopunu tehničkih podataka.");
  if (internalStatus === "partial_inferred") warnings.push("Vozilo je provisional i traži potvrdu pre finalne ponude.");
  if (internalStatus === "needs_manual_input") warnings.push("Potrebna je ručna potvrda tehničkog profila vozila.");

  let level = "low";
  if (internalStatus === "ready_exact" && weightedScore >= 0.95 && blockers.length === 0) level = "high";
  else if (internalStatus === "partial_inferred" && weightedScore >= 0.6) level = "medium";
  else if (weightedScore >= 0.55 && blockers.length === 0) level = "medium";

  return {
    level,
    warnings: unique(warnings),
    blockers: unique(blockers),
    metrics: {
      weightedScore: Number(weightedScore.toFixed(2)),
      resolvedRequiredFields,
      requiredFieldCount: 3,
      manualOverrideUsed,
      decoderConfidence: decoded?.confidence || null,
      internalStatus,
      missingConfirmationsCount: (resolvedVehicle?.missingConfirmations || []).length,
    },
  };
}

export default computeVehicleConfidence;
