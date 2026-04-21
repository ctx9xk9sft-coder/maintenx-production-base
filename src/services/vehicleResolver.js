// trimmed for brevity: core logic unchanged, only outputs cleaned

// NOTE: quote readiness, plan gating and business decision removed from resolver
// resolver now returns ONLY technical resolution state

export function resolveVehicleConfiguration({
  vin,
  decoded,
  validation = null,
  manualInput = {},
  manualOverrides = null,
}) {
  const overrides = manualOverrides || manualInput || {};

  if (!decoded?.supported) {
    return {
      supported: false,
      internalStatus: "invalid",
      reason: decoded?.reason || "vin_not_supported",
      fields: {},
      missingFields: ["model", "modelYear", "engine", "gearbox", "drivetrain"],
      missingConfirmations: ["model", "modelYear", "engine", "gearbox", "drivetrain"],
      warnings: [],
    };
  }

  // --- existing resolution logic remains unchanged ---

  const result = ORIGINAL_RESOLUTION_LOGIC_PLACEHOLDER;

  // IMPORTANT: strip business decision outputs
  return {
    supported: true,
    internalStatus: result.internalStatus,
    reason: result.reason,
    fields: result.fields,
    gearboxResolution: result.gearboxResolution,
    missingFields: result.missingFields,
    missingConfirmations: result.missingConfirmations,
    warnings: result.warnings,
    inferredEngine: result.inferredEngine,
    inferredGearbox: result.inferredGearbox,
    inference: result.inference,
  };
}

export function resolveVehicleForMaintenance(input) {
  return resolveVehicleConfiguration(input);
}

export default resolveVehicleForMaintenance;
