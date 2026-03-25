import runtimeTestVins from "../src/data/runtime_test_vins.json" with { type: "json" };
import { decodeSkodaVin } from "../src/services/vinDecoder.js";
import { resolveVehicleForMaintenance } from "../src/services/vehicleResolver.js";

const hits = [];

for (const vin of runtimeTestVins) {
  const decoded = decodeSkodaVin(vin);
  const resolved = resolveVehicleForMaintenance({ vin, decoded });

  const model = resolved?.vehicle?.model || resolved?.canonicalVehicle?.model || null;
  const modelYear = resolved?.vehicle?.modelYear || resolved?.canonicalVehicle?.modelYear || null;

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

  const engineFamily =
    resolved?.fields?.engine?.semantic?.family ||
    resolved?.vehicle?.engineFamily ||
    resolved?.canonicalVehicle?.engineFamily ||
    null;

  const gearboxFamily =
    resolved?.gearboxResolution?.resolvedFamily ||
    null;

  if (
    model === "Kamiq" &&
    bodyCode === "GR6" &&
    platformCode === "NW" &&
    Number(modelYear) === 2026 &&
    String(engineFamily || "") === "EA211" &&
    String(gearboxFamily || "") === "DQ200" &&
    resolved?.internalStatus === "partial_inferred"
  ) {
    hits.push({
      vin,
      model,
      bodyCode,
      platformCode,
      modelYear,
      salesType:
        decoded?.enrichment?.exactVinMatch?.salesType ||
        decoded?.enrichment?.salesType ||
        decoded?.salesType ||
        null,
      engineCode:
        resolved?.fields?.engine?.value ||
        decoded?.enrichment?.exactVinMatch?.engineCode ||
        decoded?.engineCode ||
        decoded?.motorKod ||
        null,
      gearboxValue: resolved?.fields?.gearbox?.value || null,
      gearboxResolvedCode: resolved?.fields?.gearbox?.resolvedCode || null,
      gearboxSource: resolved?.fields?.gearbox?.source || null,
      gearboxConfidence: resolved?.fields?.gearbox?.confidence || null,
      gearboxClosureLevel: resolved?.fields?.gearbox?.closureLevel || null,
      gearboxBusinessSuitability: resolved?.fields?.gearbox?.businessSuitability || null,
      gearboxReason: resolved?.fields?.gearbox?.reason || null,
      gearboxWarnings: resolved?.fields?.gearbox?.warnings || [],
      drivetrainValue: resolved?.fields?.drivetrain?.value || null,
      inferredEngine: resolved?.inferredEngine || false,
      inferredGearbox: resolved?.inferredGearbox || false,
      missingConfirmations: resolved?.missingConfirmations || [],
      canonicalStatus: resolved?.canonicalStatus || null,
      internalStatus: resolved?.internalStatus || null
    });
  }
}

console.log(JSON.stringify(hits, null, 2));
console.log(`TOTAL: ${hits.length}`);