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
    resolved?.fields?.engine?.semantic?.family ||
    resolved?.vehicle?.engineFamily ||
    resolved?.canonicalVehicle?.engineFamily ||
    null;

  const gearboxFamily =
    resolved?.gearboxResolution?.resolvedFamily ||
    resolved?.vehicle?.gearboxFamily ||
    null;

  const internalStatus = resolved?.internalStatus || null;

  if (
    bodyCode === "GR6" &&
    platformCode === "NW" &&
    modelYear === 2026 &&
    String(engineFamily || "").includes("EA211") &&
    gearboxFamily === "DQ200" &&
    internalStatus === "partial_inferred"
  ) {
    hits.push({
      vin,
      salesType:
        decoded?.enrichment?.exactVinMatch?.salesType ||
        decoded?.enrichment?.salesType ||
        decoded?.salesType ||
        null,
      engineCode:
        decoded?.enrichment?.exactVinMatch?.engineCode ||
        decoded?.engineCode ||
        decoded?.motorKod ||
        null,
      selectedGearbox: decoded?.enrichment?.selectedGearbox?.code || null,
      possibleGearboxCodes: decoded?.enrichment?.possibleGearboxCodes || [],
      gearboxTechCandidates: decoded?.enrichment?.gearboxTechCandidates || [],
      patternRuleConflict: decoded?.enrichment?.patternRuleConflict || null,
      gearboxResolution: resolved?.gearboxResolution || null,
    });
  }
}

console.log(JSON.stringify(hits, null, 2));
console.log(`TOTAL: ${hits.length}`);