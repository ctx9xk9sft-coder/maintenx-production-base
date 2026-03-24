import fs from "fs";
import path from "path";

const datasetPath = path.resolve("src/data/vin_training_dataset.json");
const raw = fs.readFileSync(datasetPath, "utf8");
const data = JSON.parse(raw);

const target = data.filter((item) => {
  return (
    item?.model === "Octavia" &&
    item?.bodyCode === "AR8" &&
    item?.modelCode === "NX" &&
    Number(item?.modelYear) === 2026 &&
    item?.engineUnitCode === "TSI" &&
    (
      item?.transmissionCode === "WQF" ||
      item?.transmissionCode === "WSC" ||
      item?.transmissionCode === "VCS" ||
      item?.installationDifferentiation === "DQ200" ||
      item?.transmissionType?.toLowerCase() === "dsg"
    )
  );
});

const simplified = target.map((item) => ({
  vin: item?.vin || null,
  sourceFile: item?.sourceFile || null,
  modelYear: item?.modelYear || null,
  model: item?.model || null,
  bodyCode: item?.bodyCode || null,
  modelCode: item?.modelCode || null,
  engineCode: item?.engineCode || null,
  engineUnitCode: item?.engineUnitCode || null,
  transmissionCode: item?.transmissionCode || null,
  transmissionType: item?.transmissionType || null,
  gearboxPrCode: item?.gearboxPrCode ?? null,
  installationDifferentiation: item?.installationDifferentiation ?? null,
  drivetrain: item?.drivetrain || null,
  productionDate: item?.productionDate || null,
}));

console.log("=== AR8 | NX | 2026 | DSG-ish candidates ===");
console.log(`Count: ${simplified.length}`);
console.log("");

for (const row of simplified) {
  console.log(JSON.stringify(row, null, 2));
}

const outPath = path.resolve("reports/ar8_nx_2026_dsg_candidates.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(simplified, null, 2), "utf8");

console.log("");
console.log(`Saved to: ${outPath}`);