import fs from "fs";
import path from "path";

import { buildVinPatternRules } from "../src/utils/buildVinPatternRules.js";

const DATASET_PATH = path.resolve("src/data/vin_training_dataset.json");
const OUTPUT_PATH = path.resolve("src/data/vin_pattern_rules.json");

function loadJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function countGearboxConflicts(patterns) {
  return Object.values(patterns || {}).reduce((sum, rule) => {
    const ownConflict = rule?.hasGearboxConflict ? 1 : 0;
    const yearConflicts = Object.values(rule?.byModelYear || {}).filter((item) => item?.hasGearboxConflict).length;
    return sum + ownConflict + yearConflicts;
  }, 0);
}

function run() {
  const dataset = loadJson(DATASET_PATH, []);
  if (!Array.isArray(dataset)) {
    throw new Error(`Dataset not found or invalid: ${DATASET_PATH}`);
  }

  const patterns = buildVinPatternRules(dataset);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(patterns, null, 2)}
`, "utf8");

  const totalRules = Object.keys(patterns).length;
  const totalYearScopedRules = Object.values(patterns).reduce(
    (sum, rule) => sum + Object.keys(rule?.byModelYear || {}).length,
    0
  );
  const totalGearboxConflicts = countGearboxConflicts(patterns);

  console.log(`Generated ${totalRules} pattern buckets.`);
  console.log(`Generated ${totalYearScopedRules} year-scoped pattern sub-buckets.`);
  console.log(`Detected ${totalGearboxConflicts} gearbox-conflict buckets (base + year-scoped).`);
  console.log(`Pattern rules written to ${OUTPUT_PATH}`);
}

run();