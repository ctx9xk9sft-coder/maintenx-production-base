import runtimeTestVins from "../src/data/runtime_test_vins.json" with { type: "json" };
import { decodeSkodaVin } from "../src/services/vinDecoder.js";
import { resolveVehicleForMaintenance } from "../src/services/vehicleResolver.js";

const rows = [];

for (const vin of runtimeTestVins) {
  const decoded = decodeSkodaVin(vin);
  const resolved = resolveVehicleForMaintenance({ vin, decoded });

  if (resolved?.internalStatus !== "partial_inferred") continue;

  rows.push({
    vin,
    model:
      resolved?.vehicle?.model ||
      resolved?.canonicalVehicle?.model ||
      decoded?.model ||
      null,
    modelYear:
      resolved?.vehicle?.modelYear ||
      resolved?.canonicalVehicle?.modelYear ||
      decoded?.modelYear ||
      null,
    bodyCode:
      decoded?.bodyCode ||
      decoded?.karoserija ||
      decoded?.enrichment?.exactVinMatch?.bodyCode ||
      null,
    platformCode:
      decoded?.platformCode ||
      decoded?.modelCode ||
      decoded?.enrichment?.exactVinMatch?.platformCode ||
      null,
    engineFieldValue: resolved?.fields?.engine?.value || null,
    engineFamily:
      resolved?.fields?.engine?.semantic?.family ||
      resolved?.vehicle?.engineFamily ||
      resolved?.canonicalVehicle?.engineFamily ||
      null,
    gearboxValue: resolved?.fields?.gearbox?.value || null,
    gearboxResolvedCode: resolved?.fields?.gearbox?.resolvedCode || null,
    gearboxFamily: resolved?.gearboxResolution?.resolvedFamily || null,
    gearboxSource: resolved?.fields?.gearbox?.source || null,
    gearboxClosureLevel: resolved?.fields?.gearbox?.closureLevel || null,
    gearboxBusinessSuitability: resolved?.fields?.gearbox?.businessSuitability || null,
    gearboxReason: resolved?.fields?.gearbox?.reason || null,
    salesType:
      decoded?.enrichment?.exactVinMatch?.salesType ||
      decoded?.enrichment?.salesType ||
      decoded?.salesType ||
      null,
    canonicalStatus: resolved?.canonicalStatus || null,
    internalStatus: resolved?.internalStatus || null
  });
}

console.log(JSON.stringify(rows, null, 2));
console.log(`TOTAL_PARTIAL: ${rows.length}`);