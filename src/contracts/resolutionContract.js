function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildResolutionContract(resolvedVehicle = null) {
  const fields = resolvedVehicle?.fields || {};
  const gearboxSuitability = fields?.gearbox?.businessSuitability || "blocked";
  const gearboxClosure = fields?.gearbox?.closureLevel || "unresolved";
  const engineResolved = Boolean(fields?.engine?.resolved);
  const modelResolved = Boolean(fields?.model?.resolved) && Boolean(fields?.modelYear?.resolved);
  const drivetrainResolved = Boolean(fields?.drivetrain?.resolved);

  const identificationClosure =
    resolvedVehicle?.internalStatus === "ready_exact"
      ? "exact"
      : gearboxClosure === "family"
      ? "family"
      : gearboxClosure === "type"
      ? "type"
      : modelResolved && engineResolved
      ? "partial"
      : "unresolved";

  let maintenanceClosure = "blocked";
  if (modelResolved && engineResolved) {
    if (gearboxSuitability === "exact_safe" && drivetrainResolved) {
      maintenanceClosure = "safe";
    } else if (
      gearboxSuitability === "provisional_safe" ||
      (resolvedVehicle?.internalStatus === "partial_inferred" && Boolean(fields?.gearbox?.resolved))
    ) {
      maintenanceClosure = "safe";
    } else if (
      Boolean(fields?.gearbox?.resolved) ||
      drivetrainResolved ||
      gearboxClosure === "family" ||
      gearboxClosure === "type"
    ) {
      maintenanceClosure = "conditional";
    }
  }

  const blockers = [];
  if (!resolvedVehicle?.supported) blockers.push("unsupported_vehicle");
  if (!modelResolved) blockers.push("model_not_closed");
  if (!engineResolved) blockers.push("engine_not_closed");
  if (gearboxSuitability === "blocked") blockers.push("gearbox_not_maintenance_safe");
  if (fields?.gearbox?.businessSuitability === "review_required") blockers.push("gearbox_review_required");

  const warnings = unique([
    ...toArray(resolvedVehicle?.warnings),
    ...toArray(fields?.gearbox?.warnings),
    ...(maintenanceClosure === "conditional" ? ["maintenance_closure_conditional"] : []),
    ...(identificationClosure !== "exact" && maintenanceClosure === "safe"
      ? ["maintenance_safe_without_exact_identification"]
      : []),
  ]);

  return {
    identificationClosure,
    maintenanceClosure,
    gearboxClosure,
    blockers: unique(blockers),
    warnings,
  };
}

export default buildResolutionContract;
