import runtimeTestVins from "../src/data/runtime_test_vins.json" with { type: "json" };
import { decodeSkodaVin } from "../src/services/vinDecoder.js";

const rows = [];
const summary = {
  total: 0,
  supported: 0,
  unsupported: 0,
  missingBodyCode: 0,
  missingPlatformCode: 0,
  missingEither: 0,
  missingBoth: 0,
};

for (const vin of runtimeTestVins) {
  const decoded = decodeSkodaVin(vin);

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

  const supported = Boolean(decoded?.supported);

  summary.total += 1;
  if (supported) summary.supported += 1;
  else summary.unsupported += 1;

  if (!bodyCode) summary.missingBodyCode += 1;
  if (!platformCode) summary.missingPlatformCode += 1;
  if (!bodyCode || !platformCode) summary.missingEither += 1;
  if (!bodyCode && !platformCode) summary.missingBoth += 1;

  rows.push({
    vin,
    supported,
    model: decoded?.model || null,
    modelYear: decoded?.modelYear || null,
    bodyCode,
    platformCode,
    motorKod: decoded?.motorKod || decoded?.engineCode || null,
    menjac: decoded?.menjac || null,
    fuelType: decoded?.fuelType || decoded?.gorivo || null,
  });
}

const missingRows = rows.filter((row) => !row.bodyCode || !row.platformCode);

console.log("=== Decode Coverage Summary ===");
console.log(JSON.stringify(summary, null, 2));
console.log("");
console.log("=== VINs with missing bodyCode/platformCode ===");
console.log(JSON.stringify(missingRows, null, 2));
console.log("");
console.log(`TOTAL_MISSING_ROWS: ${missingRows.length}`);