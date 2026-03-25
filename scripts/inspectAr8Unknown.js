import runtimeTestVins from "../src/data/runtime_test_vins.json" with { type: "json" };
import { decodeSkodaVin } from "../src/services/vinDecoder.js";
import { resolveVehicleForMaintenance } from "../src/services/vehicleResolver.js";

const hits = [];

for (const vin of runtimeTestVins) {
  const decoded = decodeSkodaVin(vin);
  const resolved = resolveVehicleForMaintenance({ vin, decoded });

  const bodyCode =
    decoded?.bodyCode ||
    decoded?.karoserija ||
    decoded?.enrichment?.exactVinMatch?.bodyCode ||
    null;

  const platformCode =
    decoded?.platformCode ||
    decoded?.modelCode ||
    decoded?.enrichment?.exactVinMatch?.platformCode ||
    null;

  const modelYear = Number(decoded?.modelYear || 0);

  const engineFamily =
    resolved?.vehicle?.engineFamily ||
    resolved?.canonicalVehicle?.engineFamily ||
    resolved?.fields?.engine?.semantic?.family ||
    null;

  const gearboxResolution = resolved?.gearboxResolution || null;

  const isUnresolved =
    gearboxResolution?.closureLevel === "unresolved" ||
    resolved?.fields?.gearbox?.semantic?.hasConflict === true ||
    !gearboxResolution?.resolvedCode;

  if (
    bodyCode === "AR8" &&
    platformCode === "NX" &&
    modelYear === 2026 &&
    String(engineFamily || "").includes("EA211 evo") &&
    isUnresolved
  ) {
    hits.push({
      vin,
      bodyCode,
      platformCode,
      modelYear,
      salesType:
        decoded?.enrichment?.exactVinMatch?.salesType ||
        decoded?.enrichment?.salesType ||
        decoded?.salesType ||
        null,
      possibleGearboxCodes: decoded?.enrichment?.possibleGearboxCodes || [],
      gearboxTechCandidates: decoded?.enrichment?.gearboxTechCandidates || [],
      selectedGearbox: decoded?.enrichment?.selectedGearbox?.code || null,
      patternRuleConflict: decoded?.enrichment?.patternRuleConflict || null,
      gearboxResolution: {
        closureLevel: gearboxResolution?.closureLevel || null,
        resolvedCode: gearboxResolution?.resolvedCode || null,
        resolvedFamily: gearboxResolution?.resolvedFamily || null,
        transmissionType: gearboxResolution?.transmissionType || null,
        businessSuitability: gearboxResolution?.businessSuitability || null,
        source: gearboxResolution?.source || null,
        confidence: gearboxResolution?.confidence || null,
      },
      semantic: resolved?.fields?.gearbox?.semantic || null,
    });
  }
}

console.log(JSON.stringify(hits, null, 2));
console.log(`TOTAL: ${hits.length}`);