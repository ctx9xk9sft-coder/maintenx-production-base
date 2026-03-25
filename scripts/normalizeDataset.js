import fs from "fs";

const path = "src/data/vin_training_dataset.json";

const raw = fs.readFileSync(path, "utf-8");
const data = JSON.parse(raw);

const normalizeTransmissionType = (val) => {
  if (!val) return val;

  const v = val.toString().toLowerCase();

  if (v.includes("dsg") || v.includes("auto")) return "dsg";
  if (v.includes("man")) return "manual";

  return v;
};

const normalizeDrivetrain = (val) => {
  if (!val) return val;

  const v = val.toString().toUpperCase();

  if (v.includes("FWD")) return "FWD";
  if (v.includes("AWD")) return "AWD";
  if (v.includes("4X4")) return "AWD";

  return v;
};

const normalized = data.map((row) => ({
  ...row,
  transmissionType: normalizeTransmissionType(row.transmissionType),
  drivetrain: normalizeDrivetrain(row.drivetrain),
}));

fs.writeFileSync(path, JSON.stringify(normalized, null, 2));

console.log("Dataset normalized.");