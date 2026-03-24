import engineCodesMaster from "../data/engine_codes_master.json" with { type: "json" };
import gearboxCodesMaster from "../data/gearbox_codes_master.json" with { type: "json" };

function unique(items) {
  return [...new Set((items || []).filter((x) => x !== null && x !== undefined && x !== ""))];
}

function getBodyCodeFromVin(vin) {
  if (!vin || vin.length < 6) return null;
  return vin.slice(3, 6).toUpperCase();
}

function getPlatformCodeFromVin(vin) {
  if (!vin || vin.length < 8) return null;
  return vin.slice(6, 8).toUpperCase();
}

function makeRuleAccumulator(bodyCode, platformCode, modelYear = null) {
  return {
    bodyCode,
    platformCode,
    sampleCount: 0,
    models: [],
    modelYears: modelYear != null ? [modelYear] : [],
    engineCodes: [],
    gearboxCodes: [],
    drivetrains: [],
    fuelTypes: [],
    fuels: [],
    engineFamilies: [],
  };
}

function pushRow(rule, item) {
  if (!rule || !item) return;
  rule.sampleCount += 1;
  rule.models.push(item?.model || null);
  rule.modelYears.push(item?.modelYear || null);
  rule.engineCodes.push(item?.engineCode || null);
  rule.gearboxCodes.push(item?.transmissionCode || null);
  rule.drivetrains.push(item?.drivetrain || null);
  const fuel = item?.fuel || item?.fuelType || null;
  rule.fuelTypes.push(fuel);
  rule.fuels.push(fuel);
  const family = item?.engineFamily || engineCodesMaster?.[item?.engineCode || ""]?.family || null;
  if (family && family !== "missing_real_data") {
    rule.engineFamilies.push(family);
  }
}

function normalizeGearboxType(type) {
  const t = String(type || "").trim().toLowerCase();

  if (!t) return null;
  if (t === "dsg") return "dsg";
  if (t === "manual") return "manual";
  if (t === "automatic") return "automatic";
  if (t === "ev") return "ev";

  return t;
}

function getGearboxSemanticTypes(codes = []) {
  return unique(
    (codes || [])
      .map((code) => {
        const master = gearboxCodesMaster?.[String(code || "").toUpperCase()] || null;
        return normalizeGearboxType(master?.type);
      })
      .filter(Boolean)
  ).sort();
}

function finalizeRule(rule) {
  const gearboxOptions = unique(rule.gearboxCodes).sort();
  const gearboxSemanticTypes = getGearboxSemanticTypes(gearboxOptions);
  const hasGearboxConflict = gearboxSemanticTypes.length > 1;

  return {
    bodyCode: rule.bodyCode,
    platformCode: rule.platformCode,
    sampleCount: rule.sampleCount,
    models: unique(rule.models).sort(),
    modelYears: unique(rule.modelYears).sort((a, b) => Number(a || 0) - Number(b || 0)),
    engineCodes: unique(rule.engineCodes).sort(),
    gearboxCode: gearboxOptions.length === 1 ? gearboxOptions[0] : null,
    gearboxOptions,
    gearboxCodes: gearboxOptions,
    gearboxSemanticTypes,
    hasGearboxConflict,
    drivetrains: unique(rule.drivetrains).sort(),
    fuelTypes: unique(rule.fuelTypes).sort(),
    fuels: unique(rule.fuels).sort(),
    engineFamilies: unique(rule.engineFamilies).sort(),
  };
}

export function buildVinPatternRules(dataset) {
  const rules = {};

  for (const item of dataset) {
    const vin = item?.vin || "";
    const bodyCode = getBodyCodeFromVin(vin);
    const platformCode = (item?.modelCode || getPlatformCodeFromVin(vin) || "").toUpperCase();
    const modelYear = item?.modelYear != null ? Number(item.modelYear) : null;

    if (!bodyCode || !platformCode) continue;

    const key = `${bodyCode}|${platformCode}`;

    if (!rules[key]) {
      rules[key] = makeRuleAccumulator(bodyCode, platformCode);
      rules[key].byModelYear = {};
    }

    pushRow(rules[key], item);

    if (modelYear != null) {
      if (!rules[key].byModelYear[String(modelYear)]) {
        rules[key].byModelYear[String(modelYear)] = makeRuleAccumulator(bodyCode, platformCode, modelYear);
      }
      pushRow(rules[key].byModelYear[String(modelYear)], item);
    }
  }

  const finalized = {};
  for (const key of Object.keys(rules).sort()) {
    const rule = rules[key];
    finalized[key] = finalizeRule(rule);
    const byModelYear = {};
    for (const year of Object.keys(rule.byModelYear || {}).sort()) {
      byModelYear[year] = finalizeRule(rule.byModelYear[year]);
    }
    finalized[key].byModelYear = byModelYear;
  }

  return finalized;
}

export default buildVinPatternRules;