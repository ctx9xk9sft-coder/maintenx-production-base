import fs from "fs";
import path from "path";

import { decodeSkodaVin } from "../src/services/vinDecoder.js";
import { resolveVehicleForMaintenance } from "../src/services/vehicleResolver.js";

const datasetPath = path.resolve("src/data/vin_training_dataset.json");
const reportPath = path.resolve("reports/ar8_nx_2026_runtime_inspection.json");

const raw = fs.readFileSync(datasetPath, "utf8");
const dataset = JSON.parse(raw);

const targetVins = dataset
  .filter((item) => {
    return (
      item?.model === "Octavia" &&
      item?.bodyCode === "AR8" &&
      item?.modelCode === "NX" &&
      Number(item?.modelYear) === 2026
    );
  })
  .map((item) => item.vin)
  .filter(Boolean);

const uniqueVins = [...new Set(targetVins)];

const rows = [];

for (const vin of uniqueVins) {
  try {
    const decoded = decodeSkodaVin(vin);
    const resolved = resolveVehicleForMaintenance({
      vin,
      decoded,
      validation: null,
      manualInput: {},
    });

    rows.push({
      vin,
      decoded: {
        supported: decoded?.supported ?? null,
        model: decoded?.model ?? null,
        modelYear: decoded?.modelYear ?? null,
        motorKod: decoded?.motorKod ?? null,
        engineCode: decoded?.engineCode ?? null,
        menjac: decoded?.menjac ?? null,
        enrichment: {
          selectedEngine: decoded?.enrichment?.selectedEngine?.code ?? null,
          selectedGearbox: decoded?.enrichment?.selectedGearbox?.code ?? null,
          possibleEngineCodes: decoded?.enrichment?.possibleEngineCodes ?? [],
          possibleGearboxCodes: decoded?.enrichment?.possibleGearboxCodes ?? [],
          gearboxTechCandidates: decoded?.enrichment?.gearboxTechCandidates ?? [],
          exactVinEngine: decoded?.enrichment?.exactVinMatch?.engineCode ?? null,
          exactVinTransmission: decoded?.enrichment?.exactVinMatch?.transmissionCode ?? null,
          installationDifferentiation:
            decoded?.enrichment?.exactVinMatch?.installationDifferentiation ??
            decoded?.installationDifferentiation ??
            null,
          gearboxPrCode:
            decoded?.enrichment?.exactVinMatch?.gearboxPrCode ??
            decoded?.gearboxPrCode ??
            null,
        },
      },
      resolver: {
        internalStatus: resolved?.internalStatus ?? null,
        canonicalStatus: resolved?.canonicalStatus ?? null,
        quoteReadiness: resolved?.quoteReadiness ?? null,
        reason: resolved?.reason ?? null,
        inferredEngine: resolved?.inferredEngine ?? null,
        inferredGearbox: resolved?.inferredGearbox ?? null,
        vehicle: {
          engineCode: resolved?.vehicle?.engineCode ?? null,
          gearboxCode: resolved?.vehicle?.gearboxCode ?? null,
          gearboxType: resolved?.vehicle?.gearboxType ?? null,
          drivetrain: resolved?.vehicle?.drivetrain ?? null,
        },
        fields: {
          engine: {
            resolved: resolved?.fields?.engine?.resolved ?? null,
            value: resolved?.fields?.engine?.value ?? null,
            source: resolved?.fields?.engine?.source ?? null,
            confidence: resolved?.fields?.engine?.confidence ?? null,
            reason: resolved?.fields?.engine?.reason ?? null,
            candidates: resolved?.fields?.engine?.candidates ?? [],
            inferenceMeta: resolved?.fields?.engine?.inferenceMeta ?? null,
          },
          gearbox: {
            resolved: resolved?.fields?.gearbox?.resolved ?? null,
            value: resolved?.fields?.gearbox?.value ?? null,
            displayValue: resolved?.fields?.gearbox?.displayValue ?? null,
            source: resolved?.fields?.gearbox?.source ?? null,
            confidence: resolved?.fields?.gearbox?.confidence ?? null,
            reason: resolved?.fields?.gearbox?.reason ?? null,
            candidates: resolved?.fields?.gearbox?.candidates ?? [],
            semantic: resolved?.fields?.gearbox?.semantic ?? null,
            installationDifferentiation:
              resolved?.fields?.gearbox?.installationDifferentiation ?? null,
            gearboxPrCode: resolved?.fields?.gearbox?.gearboxPrCode ?? null,
            inferenceMeta: resolved?.fields?.gearbox?.inferenceMeta ?? null,
          },
          drivetrain: {
            resolved: resolved?.fields?.drivetrain?.resolved ?? null,
            value: resolved?.fields?.drivetrain?.value ?? null,
            source: resolved?.fields?.drivetrain?.source ?? null,
            confidence: resolved?.fields?.drivetrain?.confidence ?? null,
            reason: resolved?.fields?.drivetrain?.reason ?? null,
          },
        },
      },
    });
  } catch (error) {
    rows.push({
      vin,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(rows, null, 2), "utf8");

console.log("=== AR8 | NX | 2026 runtime inspection ===");
console.log(`VIN count: ${rows.length}`);
console.log("");

for (const row of rows) {
  console.log("VIN:", row.vin);

  if (row.error) {
    console.log("  ERROR:", row.error);
    console.log("");
    continue;
  }

  console.log("  internalStatus:", row.resolver.internalStatus);
  console.log("  reason:", row.resolver.reason);
  console.log("  decoded.selectedGearbox:", row.decoded.enrichment.selectedGearbox);
  console.log("  decoded.exactVinTransmission:", row.decoded.enrichment.exactVinTransmission);
  console.log("  decoded.installationDifferentiation:", row.decoded.enrichment.installationDifferentiation);
  console.log("  vehicle.gearboxCode:", row.resolver.vehicle.gearboxCode);
  console.log("  vehicle.gearboxType:", row.resolver.vehicle.gearboxType);
  console.log("  fields.gearbox.value:", row.resolver.fields.gearbox.value);
  console.log("  fields.gearbox.displayValue:", row.resolver.fields.gearbox.displayValue);
  console.log("  fields.gearbox.source:", row.resolver.fields.gearbox.source);
  console.log("  fields.gearbox.confidence:", row.resolver.fields.gearbox.confidence);
  console.log("  fields.gearbox.reason:", row.resolver.fields.gearbox.reason);
  console.log("  fields.gearbox.candidates:", row.resolver.fields.gearbox.candidates);
  console.log("  fields.gearbox.semantic:", row.resolver.fields.gearbox.semantic);
  console.log("");
}

console.log(`Saved to: ${reportPath}`);