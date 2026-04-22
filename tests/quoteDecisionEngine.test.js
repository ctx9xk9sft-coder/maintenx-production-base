import test from "node:test";
import assert from "node:assert/strict";

import { computeQuoteDecision } from "../src/services/quoteDecisionEngine.js";

function buildResolvedVehicle({
  supported = true,
  modelResolved = true,
  engineResolved = true,
  drivetrainResolved = true,
  gearboxResolved = true,
  gearboxSuitability = "exact_safe",
  closureLevel = "exact",
} = {}) {
  return {
    supported,
    fields: {
      model: { resolved: modelResolved },
      modelYear: { resolved: modelResolved },
      engine: { resolved: engineResolved },
      drivetrain: { resolved: drivetrainResolved },
      gearbox: {
        resolved: gearboxResolved,
        businessSuitability: gearboxSuitability,
        closureLevel,
        warnings: [],
      },
    },
  };
}

test("safe closure + high pricing => ready", () => {
  const result = computeQuoteDecision({
    resolvedVehicle: buildResolvedVehicle(),
    vehicleConfidence: { level: "high", blockers: [], warnings: [] },
    pricingConfidence: {
      level: "high",
      blockers: [],
      warnings: [],
      metrics: { pricingCoveragePercent: 100 },
    },
  });

  assert.equal(result.status, "ready");
  assert.equal(result.canBuildExactPlan, true);
});

test("safe closure + pricing blockers => provisional", () => {
  const result = computeQuoteDecision({
    resolvedVehicle: buildResolvedVehicle(),
    vehicleConfidence: { level: "high", blockers: [], warnings: [] },
    pricingConfidence: {
      level: "low",
      blockers: ["missing_price_events"],
      warnings: [],
      metrics: { pricingCoveragePercent: 70 },
    },
  });

  assert.equal(result.status, "provisional");
});

test("conditional closure => provisional", () => {
  const result = computeQuoteDecision({
    resolvedVehicle: buildResolvedVehicle({
      gearboxSuitability: "family_safe",
      closureLevel: "family",
    }),
    vehicleConfidence: { level: "medium", blockers: [], warnings: [] },
    pricingConfidence: {
      level: "high",
      blockers: [],
      warnings: [],
      metrics: { pricingCoveragePercent: 100 },
    },
  });

  assert.equal(result.status, "provisional");
});

test("resolution blockers => blocked", () => {
  const result = computeQuoteDecision({
    resolvedVehicle: buildResolvedVehicle({
      modelResolved: false,
      engineResolved: false,
    }),
    vehicleConfidence: {
      level: "low",
      blockers: ["missing_engine"],
      warnings: [],
    },
    pricingConfidence: {
      level: "high",
      blockers: [],
      warnings: [],
      metrics: { pricingCoveragePercent: 100 },
    },
  });

  assert.equal(result.status, "blocked");
});

test("null inputs => blocked", () => {
  const result = computeQuoteDecision({
    resolvedVehicle: null,
    vehicleConfidence: null,
    pricingConfidence: null,
  });

  assert.equal(result.status, "blocked");
});

test("warning/blocker merge remains unique", () => {
  const result = computeQuoteDecision({
    resolvedVehicle: buildResolvedVehicle(),
    vehicleConfidence: {
      level: "medium",
      blockers: ["vehicle_blocker", "vehicle_blocker"],
      warnings: ["vehicle_warning", "vehicle_warning"],
    },
    pricingConfidence: {
      level: "low",
      blockers: ["pricing_blocker", "pricing_blocker"],
      warnings: ["pricing_warning", "pricing_warning"],
      metrics: { pricingCoveragePercent: 85 },
    },
  });

  assert.equal(result.blockers.filter((x) => x === "vehicle_blocker").length, 1);
  assert.equal(result.blockers.filter((x) => x === "pricing_blocker").length, 1);
});
