import fs from 'fs';
import path from 'path';

import runtimeTestVins from '../src/data/runtime_test_vins.json' with { type: 'json' };
import { decodeSkodaVin } from '../src/services/vinDecoder.js';
import { calculateMaintenanceValidation } from '../src/services/tcoCalculator.js';
import { resolveVehicleForMaintenance } from '../src/services/vehicleResolver.js';
import { buildSingleScenarioSimulation } from '../src/services/scenarioSimulationEngine.js';
import { computePricingConfidence } from '../src/services/confidence/computePricingConfidence.js';
import { EXPLOITATION_PROFILES } from '../src/data/exploitationProfiles.js';

const DEFAULT_PLANNED_KM = 150000;
const DEFAULT_CONTRACT_MONTHS = 48;
const DEFAULT_EXPLOITATION_TYPE = 'fleet_standard';
const DEFAULT_LABOR_RATE = 5500;
const DEFAULT_OIL_PRICE_PER_LITER = 1800;
const DEFAULT_TIRE_CATEGORY = 'standard';
const OUTPUT_PATH = path.resolve('reports/runtime_coverage_audit.json');

function clean(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function increment(map, key, amount = 1) {
  const resolved = clean(key) || 'unknown';
  map.set(resolved, (map.get(resolved) || 0) + amount);
}

function nestedIncrement(root, bucket, key) {
  const resolvedBucket = clean(bucket) || 'unknown';
  if (!root.has(resolvedBucket)) root.set(resolvedBucket, new Map());
  increment(root.get(resolvedBucket), key);
}

function mapToObject(map) {
  return Object.fromEntries(
    [...map.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return String(a[0]).localeCompare(String(b[0]));
    })
  );
}

function nestedToObject(root) {
  return Object.fromEntries(
    [...root.entries()].map(([bucket, nested]) => [bucket, mapToObject(nested)])
  );
}

function topEntries(map, limit = 10) {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (b.count - a.count) || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function deriveBodyCode(vin) {
  return clean(vin) && String(vin).length >= 6 ? String(vin).slice(3, 6).toUpperCase() : null;
}

function derivePlatformCode(vin) {
  return clean(vin) && String(vin).length >= 8 ? String(vin).slice(6, 8).toUpperCase() : null;
}

function deriveModel(decoded, resolvedVehicle) {
  return clean(decoded?.vin_summary?.model) || clean(decoded?.model_info?.name) || clean(resolvedVehicle?.fields?.model?.value) || clean(decoded?.model);
}

function deriveGeneration(decoded) {
  return clean(decoded?.vin_summary?.generation) || clean(decoded?.model_info?.generation);
}

function deriveEngineFamily(decoded) {
  return clean(decoded?.enrichment?.selectedEngine?.family) || clean(decoded?.enrichment?.masterEngine?.family) || clean(decoded?.engine?.family) || clean(decoded?.enrichment?.exactVinMatch?.engineUnitCode);
}

function deriveGearboxFamily(decoded, resolvedVehicle) {
  return clean(resolvedVehicle?.fields?.gearbox?.semantic?.family) || clean(decoded?.enrichment?.selectedGearbox?.family) || clean(decoded?.enrichment?.masterGearbox?.family);
}

function buildClusterKey(record) {
  return [
    record.model,
    record.generation,
    record.bodyCode,
    record.platformCode,
    record.modelYear,
    record.engineFamily,
    record.gearboxFamily,
  ].map((v) => clean(v) || 'unknown').join(' | ');
}

function gatherRecords(datasetRows) {
  const records = [];
  const exploitation = EXPLOITATION_PROFILES[DEFAULT_EXPLOITATION_TYPE] || EXPLOITATION_PROFILES.fleet_standard;

  for (const item of datasetRows) {
    const vin = clean(typeof item === 'string' ? item : item?.vin);
    const modelYearHint = numberOrNull(typeof item === 'string' ? null : item?.modelYear);
    if (!vin) continue;

    const decoded = decodeSkodaVin(vin);
    const validation = calculateMaintenanceValidation({
      decoded,
      exploitation,
      plannedKm: DEFAULT_PLANNED_KM,
      contractMonths: DEFAULT_CONTRACT_MONTHS,
      serviceRegime: 'flex',
    });
    const resolvedVehicle = resolveVehicleForMaintenance({ vin, decoded, validation });

    const canRunPricingFlow = Boolean(decoded?.supported) && Boolean(resolvedVehicle?.canBuildProvisionalPlan);
    const scenario = canRunPricingFlow
      ? buildSingleScenarioSimulation({
          km: DEFAULT_PLANNED_KM,
          contractMonths: DEFAULT_CONTRACT_MONTHS,
          decoded,
          resolvedVehicle,
          exploitation,
          exploitationType: DEFAULT_EXPLOITATION_TYPE,
          usageProfileKey: DEFAULT_EXPLOITATION_TYPE,
          hourlyRate: DEFAULT_LABOR_RATE,
          oilPricePerLiter: DEFAULT_OIL_PRICE_PER_LITER,
          tireCategory: DEFAULT_TIRE_CATEGORY,
          serviceRegime: 'flex',
        })
      : null;

    const pricingMeta = scenario?.pricedPlan?.pricingMeta || null;
    const pricingConfidence = pricingMeta ? computePricingConfidence({ pricingMeta }) : null;
    const gearboxSemantic = resolvedVehicle?.fields?.gearbox?.semantic || null;

    const record = {
      vin,
      model: deriveModel(decoded, resolvedVehicle),
      generation: deriveGeneration(decoded),
      bodyCode: deriveBodyCode(vin),
      platformCode: derivePlatformCode(vin),
      modelYear: numberOrNull(decoded?.modelYear) ?? numberOrNull(decoded?.vin_summary?.model_year) ?? modelYearHint,
      engineFamily: deriveEngineFamily(decoded),
      gearboxFamily: deriveGearboxFamily(decoded, resolvedVehicle),
      canonicalStatus: clean(resolvedVehicle?.status) || 'invalid',
      internalStatus: clean(resolvedVehicle?.internalStatus) || 'invalid',
      quoteReadiness: clean(resolvedVehicle?.quoteReadiness) || 'blocked',
      resolutionStatus: clean(resolvedVehicle?.resolutionStatus) || 'unresolved',
      validationStatus: clean(validation?.status) || 'unknown',
      missingConfirmations: resolvedVehicle?.missingConfirmations || [],
      warnings: resolvedVehicle?.warnings || [],
      inferredEngine: Boolean(resolvedVehicle?.inferredEngine),
      inferredGearbox: Boolean(resolvedVehicle?.inferredGearbox),
      gearboxResolved: Boolean(resolvedVehicle?.fields?.gearbox?.resolved),
      gearboxClosureMissing: !Boolean(
        gearboxSemantic &&
          (gearboxSemantic.familyClosed || gearboxSemantic.transmissionTypeClosed) &&
          !gearboxSemantic.hasConflict
      ),
      gearboxClosure: gearboxSemantic
        ? {
            family: gearboxSemantic.family || null,
            transmissionType: gearboxSemantic.transmissionType || null,
            maintenanceGroup: gearboxSemantic.maintenanceGroup || null,
            familyClosed: Boolean(gearboxSemantic.familyClosed),
            transmissionTypeClosed: Boolean(gearboxSemantic.transmissionTypeClosed),
            hasConflict: Boolean(gearboxSemantic.hasConflict),
          }
        : null,
      pricingObserved: Boolean(pricingMeta),
      pricingStatus: clean(scenario?.pricedPlan?.meta?.pricingStatus) || null,
      pricingMeta,
      pricingConfidenceLevel: clean(pricingConfidence?.level) || null,
      pricingConfidenceMetrics: pricingConfidence?.metrics || null,
      totalPlannedEvents: numberOrNull(scenario?.pricedPlan?.totals?.totalEvents),
      totalPlannedCost: numberOrNull(scenario?.pricedPlan?.totals?.totalCost),
      priceRange: pricingMeta?.pricingRange || null,
    };

    record.clusterKey = buildClusterKey(record);
    records.push(record);
  }

  return records;
}

function collectStatusByDimension(records, field) {
  const root = new Map();
  for (const record of records) {
    nestedIncrement(root, record[field], record.internalStatus);
  }
  return nestedToObject(root);
}

function buildReport(records) {
  const internalStatus = new Map();
  const canonicalStatus = new Map();
  const quoteReadiness = new Map();
  const resolutionStatus = new Map();
  const statusClusters = new Map();
  const readinessClusters = new Map();
  const gearboxUnresolved = new Map();
  const pricedByConfidence = new Map();
  const weakPricingClusters = new Map();

  const pricing = {
    auditedPricedVinCount: 0,
    missingPriceEventCount: 0,
    genericEventCount: 0,
    familyEventCount: 0,
    fallbackLineCount: 0,
    missingLineCount: 0,
  };

  for (const record of records) {
    increment(internalStatus, record.internalStatus);
    increment(canonicalStatus, record.canonicalStatus);
    increment(quoteReadiness, record.quoteReadiness);
    increment(resolutionStatus, record.resolutionStatus);
    nestedIncrement(statusClusters, record.internalStatus, record.clusterKey);
    nestedIncrement(readinessClusters, record.quoteReadiness, record.clusterKey);
    if (record.gearboxClosureMissing) increment(gearboxUnresolved, record.clusterKey);

    if (record.pricingObserved) {
      pricing.auditedPricedVinCount += 1;
      pricing.missingPriceEventCount += Number(record.pricingMeta?.missingPriceEventCount || 0);
      pricing.genericEventCount += Number(record.pricingMeta?.genericEventCount || 0);
      pricing.familyEventCount += Number(record.pricingMeta?.familyEventCount || 0);
      pricing.fallbackLineCount += Number(record.pricingMeta?.fallbackLineCount || 0);
      pricing.missingLineCount += Number(record.pricingMeta?.missingLineCount || 0);
      increment(pricedByConfidence, record.pricingConfidenceLevel);
      if (['low', 'medium'].includes(record.pricingConfidenceLevel)) increment(weakPricingClusters, record.clusterKey);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    runtimeModulesUsed: [
      'src/services/vinDecoder.js#decodeSkodaVin',
      'src/services/tcoCalculator.js#calculateMaintenanceValidation',
      'src/services/vehicleResolver.js#resolveVehicleForMaintenance',
      'src/services/scenarioSimulationEngine.js#buildSingleScenarioSimulation',
      'src/services/confidence/computePricingConfidence.js#computePricingConfidence',
    ],
    auditInput: {
      source: 'src/data/runtime_test_vins.json',
      semantics: 'VIN list only; all statuses below come from runtime decode/resolution/planning execution.',
      defaultScenario: {
        exploitationType: DEFAULT_EXPLOITATION_TYPE,
        plannedKm: DEFAULT_PLANNED_KM,
        contractMonths: DEFAULT_CONTRACT_MONTHS,
        laborRate: DEFAULT_LABOR_RATE,
        oilPricePerLiter: DEFAULT_OIL_PRICE_PER_LITER,
        tireCategory: DEFAULT_TIRE_CATEGORY,
      },
    },
    totals: {
      totalVinsAudited: records.length,
      internalStatus: mapToObject(internalStatus),
      canonicalStatus: mapToObject(canonicalStatus),
      quoteReadiness: mapToObject(quoteReadiness),
      resolutionStatus: mapToObject(resolutionStatus),
    },
    breakdowns: {
      byModel: collectStatusByDimension(records, 'model'),
      byGeneration: collectStatusByDimension(records, 'generation'),
      byBodyCode: collectStatusByDimension(records, 'bodyCode'),
      byPlatformCode: collectStatusByDimension(records, 'platformCode'),
      byModelYear: collectStatusByDimension(records, 'modelYear'),
      byEngineFamily: collectStatusByDimension(records, 'engineFamily'),
      byGearboxFamily: collectStatusByDimension(records, 'gearboxFamily'),
    },
    topClusters: {
      partialInferred: topEntries(statusClusters.get('partial_inferred') || new Map()),
      needsManualInput: topEntries(statusClusters.get('needs_manual_input') || new Map()),
      blocked: topEntries(readinessClusters.get('blocked') || new Map()),
      gearboxUnresolved: topEntries(gearboxUnresolved),
      weakPricingConfidence: topEntries(weakPricingClusters),
    },
    pricingObservability: pricing.auditedPricedVinCount > 0
      ? {
          included: true,
          ...pricing,
          pricingConfidenceBuckets: mapToObject(pricedByConfidence),
        }
      : {
          included: false,
          reason: 'No VIN reached the runtime planning + pricing path.',
        },
    sampleRecords: records.slice(0, 10),
  };
}

function printCountMap(title, counts) {
  console.log(`\n${title}`);
  const entries = Object.entries(counts || {});
  if (entries.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const [key, value] of entries) console.log(`  ${key}: ${value}`);
}

function printDimensionSection(title, breakdown) {
  console.log(`\n${title}`);
  const entries = Object.entries(breakdown || {});
  if (entries.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const [bucket, statuses] of entries) {
    const compact = Object.entries(statuses).map(([status, count]) => `${status}=${count}`).join(', ');
    console.log(`  ${bucket}: ${compact}`);
  }
}

function printTopClusterSection(title, clusters) {
  console.log(`\n${title}`);
  if (!clusters || clusters.length === 0) {
    console.log('  (none)');
    return;
  }
  clusters.forEach((cluster, index) => console.log(`  ${index + 1}. ${cluster.key} -> ${cluster.count}`));
}

function printConsoleReport(report) {
  console.log('=== Runtime Coverage Audit ===');
  console.log(`Generated at: ${report.generatedAt}`);
  console.log(`Audit input source: ${report.auditInput.source}`);
  console.log(`Runtime scenario: ${report.auditInput.defaultScenario.exploitationType}, ${report.auditInput.defaultScenario.plannedKm} km, ${report.auditInput.defaultScenario.contractMonths} months`);
  console.log(`Runtime modules used: ${report.runtimeModulesUsed.join(', ')}`);
  console.log(`Audit semantics: ${report.auditInput.semantics}`);
  console.log('\nOverall outcome summary');
  console.log(`  total VINs audited: ${report.totals.totalVinsAudited}`);
  printCountMap('Status breakdown (internal status)', report.totals.internalStatus);
  printCountMap('Status breakdown (canonical status)', report.totals.canonicalStatus);
  printCountMap('Operational readiness breakdown', report.totals.quoteReadiness);
  printCountMap('Resolution status breakdown', report.totals.resolutionStatus);
  printDimensionSection('Breakdown by model', report.breakdowns.byModel);
  printDimensionSection('Breakdown by generation', report.breakdowns.byGeneration);
  printDimensionSection('Breakdown by body code', report.breakdowns.byBodyCode);
  printDimensionSection('Breakdown by platform', report.breakdowns.byPlatformCode);
  printDimensionSection('Breakdown by model year', report.breakdowns.byModelYear);
  printDimensionSection('Breakdown by engine family', report.breakdowns.byEngineFamily);
  printDimensionSection('Breakdown by gearbox family', report.breakdowns.byGearboxFamily);
  printTopClusterSection('Top partial_inferred clusters', report.topClusters.partialInferred);
  printTopClusterSection('Top needs_manual_input clusters', report.topClusters.needsManualInput);
  printTopClusterSection('Top blocked clusters', report.topClusters.blocked);
  printTopClusterSection('Top gearbox-unresolved clusters', report.topClusters.gearboxUnresolved);
  printTopClusterSection('Top weak pricing-confidence clusters', report.topClusters.weakPricingConfidence);
  console.log('\nPricing observability summary');
  if (!report.pricingObservability.included) {
    console.log(`  not included: ${report.pricingObservability.reason}`);
    return;
  }
  console.log(`  priced VINs: ${report.pricingObservability.auditedPricedVinCount}`);
  console.log(`  missingPriceEventCount: ${report.pricingObservability.missingPriceEventCount}`);
  console.log(`  genericEventCount: ${report.pricingObservability.genericEventCount}`);
  console.log(`  familyEventCount: ${report.pricingObservability.familyEventCount}`);
  console.log(`  fallbackLineCount: ${report.pricingObservability.fallbackLineCount}`);
  console.log(`  missingLineCount: ${report.pricingObservability.missingLineCount}`);
  console.log(`  pricingConfidenceBuckets: ${Object.entries(report.pricingObservability.pricingConfidenceBuckets).map(([key, value]) => `${key}=${value}`).join(', ') || '(none)'}`);
}

function main() {
  const vins = Array.isArray(runtimeTestVins) ? runtimeTestVins : [];
  const records = gatherRecords(vins);
  const report = buildReport(records);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  printConsoleReport(report);
  console.log(`\nJSON artifact written to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main();
