import test from "node:test";
import assert from "node:assert/strict";

import { computeQuoteDecision } from "../src/services/quoteDecisionEngine.js";

function buildResolvedVehicle({
  quoteReadiness = "ready",
  internalStatus = "ready_exact",
  supported = true,
  modelResolved = true,
  engineResolved = true,
  drivetrainResolved = true,
  gearboxSuitability = "exact_safe",
  gearboxClosure = "family",
  gearboxResolved = true,
  warnings = [],
} = {}) {
  return {
    supported,
    quoteReadiness,
    internalStatus,
    warnings,
    fields: {
      model: { field: "model", resolved: modelResolved },
      modelYear: { field: "modelYear", resolved: modelResolved },
      engine: { field: "engine", resolved: engineResolved },
      drivetrain: { field: "drivetrain", resolved: drivetrainResolved },
      gearbox: {
        field: "gearbox",
        resolved: gearboxResolved,
        businessSuitability: gearboxSuitability,
        closureLevel: gearboxClosure,
        warnings: [],
      },
    },
  };
}

test("ready transition follows canonical resolver readiness", () => {
  const resolvedVehicle = buildResolvedVehicle({
    quoteReadiness: "ready",
    internalStatus: "ready_exact",
  });

  const result = computeQuoteDecision({ resolvedVehicle });

  assert.equal(result.status, "ready");
  assert.equal(result.canBuildExactPlan, true);
  assert.equal(result.canBuildProvisionalPlan, true);
});

test("provisional transition follows canonical resolver readiness", () => {
  const resolvedVehicle = buildResolvedVehicle({
    quoteReadiness: "provisional",
    internalStatus: "partial_inferred",
  });

  const result = computeQuoteDecision({ resolvedVehicle });

  assert.equal(result.status, "provisional");
  assert.equal(result.canBuildExactPlan, false);
  assert.equal(result.canBuildProvisionalPlan, true);
});

test("blocked transition follows canonical resolver readiness", () => {
  const resolvedVehicle = buildResolvedVehicle({
    quoteReadiness: "blocked",
    internalStatus: "needs_manual_input",
    modelResolved: false,
    engineResolved: false,
    drivetrainResolved: false,
    gearboxSuitability: "blocked",
    gearboxResolved: false,
  });

  const result = computeQuoteDecision({ resolvedVehicle });

  assert.equal(result.status, "blocked");
  assert.equal(result.canBuildExactPlan, false);
  assert.equal(result.canBuildProvisionalPlan, false);
});

test("conflicting pricing signals do not override canonical readiness", () => {
  const resolvedVehicle = buildResolvedVehicle({
    quoteReadiness: "ready",
  });

  const result = computeQuoteDecision({
    resolvedVehicle,
    pricingConfidence: {
      level: "low",
      blockers: ["missing_price_events"],
      warnings: ["fallback_used"],
      metrics: {
        pricingCoveragePercent: 80,
      },
    },
  });

  assert.equal(result.status, "ready");
  assert.ok(result.blockers.includes("missing_price_events"));
  assert.ok(result.warnings.includes("pricing_confidence_low"));
});

test("fallback behavior with null inputs defaults to blocked", () => {
  const result = computeQuoteDecision({
    resolvedVehicle: null,
    vehicleConfidence: null,
    pricingConfidence: null,
  });

  assert.equal(result.status, "blocked");
});

test("undefined inputs are handled safely", () => {
  const result = computeQuoteDecision();

  assert.equal(result.status, "blocked");
});

test("internalStatus fallback works when quoteReadiness is missing", () => {
  const resolvedVehicle = buildResolvedVehicle({
    quoteReadiness: null,
    internalStatus: "partial_inferred",
  });

  const result = computeQuoteDecision({
    resolvedVehicle,
  });

  assert.equal(result.status, "provisional");
});

test("warning and blocker merging remains unique", () => {
  const resolvedVehicle = buildResolvedVehicle({
    quoteReadiness: "provisional",
  });

  const result = computeQuoteDecision({
    resolvedVehicle,
    vehicleConfidence: {
      warnings: ["vehicle_warn", "vehicle_warn"],
      blockers: ["vehicle_blocker", "vehicle_blocker"],
    },
    pricingConfidence: {
      level: "low",
      warnings: ["pricing_warn", "pricing_warn"],
      blockers: ["pricing_blocker", "pricing_blocker"],
      metrics: {
        pricingCoveragePercent: 90,
      },
    },
  });

  assert.equal(result.status, "provisional");
  assert.equal(
    result.blockers.filter((x) => x === "vehicle_blocker").length,
    1
  );
  assert.equal(
    result.blockers.filter((x) => x === "pricing_blocker").length,
    1
  );
});