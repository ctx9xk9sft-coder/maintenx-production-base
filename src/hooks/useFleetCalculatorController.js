import { useMemo, useState } from "react";
import { decodeSkodaVin } from "../services/vinDecoder.js";
import { VEHICLE_PROFILES } from "../data/vehicleProfiles.js";
import { SAMPLE_VINS } from "../data/sampleVins.js";
import { EXPLOITATION_PROFILES } from "../data/exploitationProfiles.js";
import { calculateMaintenanceValidation } from "../services/tcoCalculator.js";
import { resolveVehicleForMaintenance } from "../services/vehicleResolver.js";
import { buildMaintenancePlan } from "../services/buildMaintenancePlan.js";
import { priceMaintenancePlan } from "../services/pricingEngine.js";
import { getVehiclePresentation } from "../data/vehiclePresentation.js";
import { formatRsd } from "../utils/formatters.js";
import engineBusinessGroups from "../data/engine_business_groups.json" with { type: "json" };
import gearboxBusinessGroups from "../data/gearbox_business_groups.json" with { type: "json" };
import {
  buildScenarioComparisonData,
  buildScenarioVariantRows,
} from "../services/scenarioComparisonEngine.js";
import { computeVehicleConfidence } from "../services/confidence/computeVehicleConfidence.js";
import { computePricingConfidence } from "../services/confidence/computePricingConfidence.js";
import { computeQuoteReadiness } from "../services/confidence/computeQuoteReadiness.js";
import { buildResolutionContract } from "../contracts/resolutionContract.js";
import { createTcoCostInput, TCO_COST_CATEGORY, TCO_COST_FREQUENCY } from "../domain/TcoCostInput.js";
import { aggregateTcoCosts } from "../services/tcoAggregationEngine.js";

function getStatusLabel(status) {
  if (status === "ready") return "READY";
  if (status === "provisional") return "PROVISIONAL";
  if (status === "blocked") return "BLOCKED";
  if (status === "needs_manual_input") return "NEEDS MANUAL INPUT";
  if (status === "partial_inferred") return "PARTIAL INFERRED";
  if (status === "invalid") return "INVALID";
  return status || "-";
}

function getFieldLabel(field) {
  const map = {
    engine: "Motor",
    gearbox: "Menjač",
    drivetrain: "Pogon",
    model: "Model",
    modelYear: "Godište",
    serviceRegime: "Servisni režim",
    usageProfile: "Tip eksploatacije",
    plannedKm: "Planirana kilometraža",
    contractMonths: "Trajanje ugovora",
  };

  return map[field] || field;
}

function getResolverSourceLabel(source) {
  const map = {
    manual: "Ručna potvrda",
    decoded: "Dekoder",
    decoded_label: "Dekoder label",
    exactVin: "Exact VIN",
    candidate: "Kandidat",
    ambiguous: "Nejasno",
    missing: "Nedostaje",
    vin_pattern_rule: "VIN pattern rule",
    inferred_type_only: "Inferred type only",
    inference: "VIN inference",
  };

  return map[source] || source || "-";
}

function getStatusBadgeStyle(status) {
  if (status === "ready") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac",
    };
  }

  if (status === "provisional" || status === "needs_manual_input" || status === "partial_inferred") {
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fcd34d",
    };
  }

  if (status === "invalid") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fca5a5",
    };
  }

  return {
    background: "#e2e8f0",
    color: "#334155",
    border: "1px solid #cbd5e1",
  };
}

function getPlanStatusUi(canBuildProvisionalPlan, quoteReadiness) {
  if (canBuildProvisionalPlan) {
    return {
      label: "DOZVOLJEN",
      style: getStatusBadgeStyle(quoteReadiness),
    };
  }

  return {
    label: "BLOKIRAN",
    style: getStatusBadgeStyle("invalid"),
  };
}

function resolveBusinessEngineLabel(engineCode) {
  if (!engineCode) return "-";

  for (const group of Object.values(engineBusinessGroups)) {
    if (group.engineCodes?.includes(engineCode)) {
      return group.label;
    }
  }

  return engineCode;
}

function resolveBusinessGearboxLabel(gearboxCode) {
  if (!gearboxCode) return "-";

  for (const group of Object.values(gearboxBusinessGroups)) {
    if (group.codes?.includes(gearboxCode)) {
      return group.label;
    }
  }

  const normalized = String(gearboxCode).toUpperCase();
  if (normalized === "DSG") return "Automatik";
  if (normalized === "MANUAL" || normalized === "MANUAL6" || normalized === "MANUAL 6") {
    return "Manual";
  }

  return gearboxCode;
}

function buildAdditionalTcoCosts({
  registrationAnnual,
  insuranceAnnual,
  leasingMonthly,
  adminMonthly,
  extraordinaryReserve,
  operatingMonthly,
}) {
  return [
    createTcoCostInput({
      category: TCO_COST_CATEGORY.REGISTRATION,
      label: "Registracija",
      amount: registrationAnnual,
      frequency: TCO_COST_FREQUENCY.ANNUAL,
      source: "manual",
    }),
    createTcoCostInput({
      category: TCO_COST_CATEGORY.INSURANCE,
      label: "Osiguranje",
      amount: insuranceAnnual,
      frequency: TCO_COST_FREQUENCY.ANNUAL,
      source: "manual",
    }),
    createTcoCostInput({
      category: TCO_COST_CATEGORY.LEASING,
      label: "Leasing / rata",
      amount: leasingMonthly,
      frequency: TCO_COST_FREQUENCY.MONTHLY,
      source: "manual",
    }),
    createTcoCostInput({
      category: TCO_COST_CATEGORY.ADMINISTRATIVE,
      label: "Administrativni trošak",
      amount: adminMonthly,
      frequency: TCO_COST_FREQUENCY.MONTHLY,
      source: "manual",
    }),
    createTcoCostInput({
      category: TCO_COST_CATEGORY.EXTRAORDINARY,
      label: "Vanredni troškovi / rezerva",
      amount: extraordinaryReserve,
      frequency: TCO_COST_FREQUENCY.CONTRACT_TOTAL,
      source: "manual",
    }),
    createTcoCostInput({
      category: TCO_COST_CATEGORY.OPERATING,
      label: "Ostali operativni troškovi",
      amount: operatingMonthly,
      frequency: TCO_COST_FREQUENCY.MONTHLY,
      source: "manual",
    }),
  ];
}

function getCategoryTotal(summary, category) {
  return Number(summary?.categories?.[category]?.total || 0);
}

export function useFleetCalculatorController() {
  const [sessionUser] = useState({
    displayName: "Admin demo",
    company: "Ćirinac",
  });

  const [viewMode, setViewMode] = useState("business");
  const [selectedProfileId, setSelectedProfileId] = useState("octavia_diesel_dsg");
  const [vin, setVin] = useState(SAMPLE_VINS.octavia_diesel_dsg);
  const [plannedKm, setPlannedKm] = useState(200000);
  const [contractMonths, setContractMonths] = useState(48);
  const [exploitationType, setExploitationType] = useState("fleet_standard");
  const [hourlyRate, setHourlyRate] = useState(5500);
  const [oilPricePerLiter, setOilPricePerLiter] = useState(1800);
  const [tireCategory, setTireCategory] = useState("standard");
  const [flexInterval, setFlexInterval] = useState(25000);
  const [laborDiscount, setLaborDiscount] = useState(0);
  const [partsDiscount, setPartsDiscount] = useState(0);
  const [oilDiscount, setOilDiscount] = useState(0);
  const [engineOverride, setEngineOverride] = useState("");
  const [gearboxOverride, setGearboxOverride] = useState("");
  const [drivetrainOverride, setDrivetrainOverride] = useState("");
  const [registrationAnnual, setRegistrationAnnual] = useState(0);
  const [insuranceAnnual, setInsuranceAnnual] = useState(0);
  const [leasingMonthly, setLeasingMonthly] = useState(0);
  const [adminMonthly, setAdminMonthly] = useState(0);
  const [extraordinaryReserve, setExtraordinaryReserve] = useState(0);
  const [operatingMonthly, setOperatingMonthly] = useState(0);

  const decoded = useMemo(() => decodeSkodaVin(vin), [vin]);
  const exploitation = EXPLOITATION_PROFILES[exploitationType];
  const annualKm = contractMonths ? (plannedKm / contractMonths) * 12 : 0;

  const validation = useMemo(
    () =>
      calculateMaintenanceValidation({
        decoded,
        exploitation,
        plannedKm,
        contractMonths,
        serviceRegime: "flex",
      }),
    [decoded, exploitation, plannedKm, contractMonths]
  );

  const resolvedVehicle = useMemo(
    () =>
      resolveVehicleForMaintenance({
        decoded,
        validation,
        manualOverrides: {
          engine: engineOverride,
          gearbox: gearboxOverride,
          drivetrain: drivetrainOverride,
        },
      }),
    [decoded, validation, engineOverride, gearboxOverride, drivetrainOverride]
  );

  const resolutionContract = useMemo(
    () => buildResolutionContract(resolvedVehicle),
    [resolvedVehicle]
  );

  const additionalTcoCosts = useMemo(
    () =>
      buildAdditionalTcoCosts({
        registrationAnnual,
        insuranceAnnual,
        leasingMonthly,
        adminMonthly,
        extraordinaryReserve,
        operatingMonthly,
      }),
    [
      registrationAnnual,
      insuranceAnnual,
      leasingMonthly,
      adminMonthly,
      extraordinaryReserve,
      operatingMonthly,
    ]
  );

  const resolverMissingConfirmations = resolvedVehicle?.missingConfirmations || [];

  const hasPlanningInputs =
    Boolean(decoded?.supported) &&
    Number(plannedKm) > 0 &&
    Number(contractMonths) > 0 &&
    Boolean(exploitation);

  const canGenerateMaintenancePlan =
    hasPlanningInputs && resolutionContract?.maintenanceClosure !== "blocked";

  const maintenancePlanBase = useMemo(() => {
    if (!canGenerateMaintenancePlan) return null;

    return buildMaintenancePlan({
      decoded,
      resolvedVehicle,
      validation,
      planning: {
        plannedKm,
        contractMonths,
        annualKm,
        serviceRegime: "flex",
        usageProfile: exploitationType,
        hourlyRate,
        flexibleServiceIntervalKm: flexInterval,
      },
    });
  }, [
    canGenerateMaintenancePlan,
    decoded,
    resolvedVehicle,
    validation,
    plannedKm,
    contractMonths,
    annualKm,
    exploitationType,
    hourlyRate,
    flexInterval,
  ]);

  const pricedMaintenancePlan = useMemo(() => {
    if (!canGenerateMaintenancePlan || !maintenancePlanBase) return null;

    return priceMaintenancePlan({
      maintenancePlan: maintenancePlanBase,
      decoded,
      userPricing: {
        laborRate: hourlyRate,
        oilPricePerLiter,
        tireCategory,
        laborDiscount,
        partsDiscount,
        oilDiscount,
      },
    });
  }, [
    canGenerateMaintenancePlan,
    maintenancePlanBase,
    decoded,
    hourlyRate,
    oilPricePerLiter,
    tireCategory,
    laborDiscount,
    partsDiscount,
    oilDiscount,
  ]);

  const tcoSummary = useMemo(
    () =>
      aggregateTcoCosts({
        maintenanceTotal: pricedMaintenancePlan?.totals?.totalCost || 0,
        contractMonths,
        additionalCosts: additionalTcoCosts,
      }),
    [pricedMaintenancePlan, contractMonths, additionalTcoCosts]
  );

  const scenarioRows = useMemo(() => {
    if (!canGenerateMaintenancePlan) return [];

    return buildScenarioVariantRows({
      plannedKm,
      contractMonths,
      decoded,
      resolvedVehicle,
      exploitation,
      exploitationType,
      flexInterval,
      hourlyRate,
      oilPricePerLiter,
      tireCategory,
      laborDiscount,
      partsDiscount,
      oilDiscount,
    });
  }, [
    canGenerateMaintenancePlan,
    plannedKm,
    contractMonths,
    decoded,
    resolvedVehicle,
    exploitation,
    exploitationType,
    flexInterval,
    hourlyRate,
    oilPricePerLiter,
    tireCategory,
    laborDiscount,
    partsDiscount,
    oilDiscount,
  ]);

  const scenarioComparisonData = useMemo(() => {
    if (!canGenerateMaintenancePlan) return [];

    return buildScenarioComparisonData({
      scenarioKmList: [120000, 150000, 200000],
      contractMonths,
      decoded,
      resolvedVehicle,
      exploitation,
      exploitationType,
      flexInterval,
      hourlyRate,
      oilPricePerLiter,
      tireCategory,
      laborDiscount,
      partsDiscount,
      oilDiscount,
    });
  }, [
    canGenerateMaintenancePlan,
    contractMonths,
    decoded,
    resolvedVehicle,
    exploitation,
    exploitationType,
    flexInterval,
    hourlyRate,
    oilPricePerLiter,
    tireCategory,
    laborDiscount,
    partsDiscount,
    oilDiscount,
  ]);

  const planTotalMaintenance = Number(tcoSummary?.maintenanceTotal || 0);
  const planTotalNonMaintenance = Number(tcoSummary?.nonMaintenanceTotal || 0);
  const planTotalCost = Number(tcoSummary?.grandTotal || 0);
  const planTotalService = pricedMaintenancePlan?.totals?.totalServiceCost || 0;
  const planTotalBrakes = pricedMaintenancePlan?.totals?.totalBrakeCost || 0;
  const planTotalTires = pricedMaintenancePlan?.totals?.totalTireCost || 0;
  const planTotalLeasing = getCategoryTotal(tcoSummary, TCO_COST_CATEGORY.LEASING);
  const planTotalInsurance = getCategoryTotal(tcoSummary, TCO_COST_CATEGORY.INSURANCE);
  const planTotalRegistration = getCategoryTotal(tcoSummary, TCO_COST_CATEGORY.REGISTRATION);
  const planTotalAdministrative = getCategoryTotal(tcoSummary, TCO_COST_CATEGORY.ADMINISTRATIVE);
  const planTotalExtraordinary = getCategoryTotal(tcoSummary, TCO_COST_CATEGORY.EXTRAORDINARY);
  const planTotalOperating = getCategoryTotal(tcoSummary, TCO_COST_CATEGORY.OPERATING);
  const planTotalEvents = pricedMaintenancePlan?.totals?.totalEvents || 0;
  const planCostPerKm = plannedKm ? planTotalCost / plannedKm : 0;
  const planCostPerMonth = contractMonths ? planTotalCost / contractMonths : 0;

  const tcoBreakdown = {
    maintenance: planTotalMaintenance,
    registration: planTotalRegistration,
    insurance: planTotalInsurance,
    leasing: planTotalLeasing,
    administrative: planTotalAdministrative,
    extraordinary: planTotalExtraordinary,
    operating: planTotalOperating,
  };

  const maintenancePlan = useMemo(() => {
    if (!pricedMaintenancePlan) return null;

    const maintenanceOnlyTotal = Number(pricedMaintenancePlan?.totals?.totalCost || 0);

    return {
      ...pricedMaintenancePlan,
      totals: {
        ...pricedMaintenancePlan.totals,
        maintenanceTotal: maintenanceOnlyTotal,
        nonMaintenanceTotal: planTotalNonMaintenance,
        totalCost: planTotalCost,
        totalCostMaintenanceOnly: maintenanceOnlyTotal,
        costPerKm: planCostPerKm,
        costPerMonth: planCostPerMonth,
      },
      pricingMeta: {
        ...pricedMaintenancePlan.pricingMeta,
        tcoSummary,
        tcoBreakdown,
        maintenanceTotal: maintenanceOnlyTotal,
        nonMaintenanceTotal: planTotalNonMaintenance,
        grandTotal: planTotalCost,
        plannedKm,
        contractMonths,
      },
    };
  }, [
    pricedMaintenancePlan,
    tcoSummary,
    tcoBreakdown,
    planTotalNonMaintenance,
    planTotalCost,
    planCostPerKm,
    planCostPerMonth,
    plannedKm,
    contractMonths,
  ]);

  const serviceEvents =
    pricedMaintenancePlan?.events?.filter(
      (event) => event.category !== "brakes" && event.category !== "tires"
    ) || [];
  const brakeEvents =
    pricedMaintenancePlan?.events?.filter((event) => event.category === "brakes") || [];
  const tireEvents =
    pricedMaintenancePlan?.events?.filter((event) => event.category === "tires") || [];

  const planningGate = validation || null;
  const missingFields = planningGate?.missingFields || [];
  const warnings = planningGate?.warnings || [];

  const finalEngine =
    resolvedVehicle?.fields?.engine?.value || decoded.motorKod || decoded.motor || "-";
  const finalGearbox =
    resolvedVehicle?.fields?.gearbox?.displayValue ||
    resolvedVehicle?.fields?.gearbox?.value ||
    decoded.menjac ||
    "-";
  const finalDrivetrain =
    resolvedVehicle?.fields?.drivetrain?.value || decoded.drivetrain || "-";

  const vehicleLabel = `${decoded.marka || "Škoda"} ${decoded.model || "-"}`;
  const exploitationLabel = exploitation?.label || "-";
  const vehiclePresentation = getVehiclePresentation(decoded);
  const showExpertSections = viewMode === "expert";

  const engineLabel =
    viewMode === "business"
      ? resolveBusinessEngineLabel(finalEngine)
      : finalEngine || "-";

  const gearboxLabel =
    viewMode === "business"
      ? resolveBusinessGearboxLabel(finalGearbox)
      : finalGearbox || "-";

  const drivetrainLabel = finalDrivetrain || "-";

  const totalsDisplay = {
    totalCost: formatRsd(planTotalCost),
    totalService: formatRsd(planTotalService),
    totalBrakes: formatRsd(planTotalBrakes),
    totalTires: formatRsd(planTotalTires),
    costPerKm: formatRsd(planCostPerKm),
    costPerMonth: formatRsd(planCostPerMonth),
    eventCount: String(planTotalEvents),
  };

  const resolverSourceLabels = {
    engine: getResolverSourceLabel(resolvedVehicle?.fields?.engine?.source),
    gearbox: getResolverSourceLabel(resolvedVehicle?.fields?.gearbox?.source),
    drivetrain: getResolverSourceLabel(resolvedVehicle?.fields?.drivetrain?.source),
  };

  const resolverStatusUi = {
    label: getStatusLabel(resolvedVehicle?.internalStatus),
    style: getStatusBadgeStyle(resolvedVehicle?.internalStatus),
  };

  const planningGateUi = {
    label: getStatusLabel(planningGate?.status),
    style: getStatusBadgeStyle(planningGate?.status),
  };

  const vehicleConfidence = useMemo(
    () => computeVehicleConfidence({ resolvedVehicle, decoded }),
    [resolvedVehicle, decoded]
  );

  const pricingConfidence = useMemo(
    () =>
      computePricingConfidence({
        pricingMeta: maintenancePlan?.pricingMeta || null,
      }),
    [maintenancePlan]
  );

  const quoteReadiness = useMemo(
    () =>
      computeQuoteReadiness({
        resolvedVehicle,
        vehicleConfidence,
        pricingConfidence,
      }),
    [resolvedVehicle, vehicleConfidence, pricingConfidence]
  );

  const overallStatus = !decoded?.supported
    ? "blocked"
    : validation?.status === "invalid"
    ? "blocked"
    : quoteReadiness?.status || "blocked";

  const canBuildExactPlan = Boolean(quoteReadiness?.canBuildExactPlan);
  const canBuildProvisionalPlan = Boolean(quoteReadiness?.canBuildProvisionalPlan);

  const overallStatusUi = {
    label: getStatusLabel(overallStatus),
    style: getStatusBadgeStyle(overallStatus),
  };

  const planStatusUi = getPlanStatusUi(canBuildProvisionalPlan, overallStatus);

  const quoteReadinessUi = {
    label: quoteReadiness.label,
    style: getStatusBadgeStyle(quoteReadiness.status),
  };

  const maintenanceGateMessage = !decoded?.supported
    ? decoded?.reason || "VIN nije podržan."
    : !hasPlanningInputs
    ? "Plan održavanja i cena su blokirani dok ne uneseš validnu kilometražu, trajanje ugovora i tip eksploatacije."
    : !canGenerateMaintenancePlan
    ? "Plan održavanja i cena su blokirani dok nije zatvoren maintenance-safe vehicle profil."
    : overallStatus === "provisional"
    ? "Plan je provisional i mora biti jasno označen kao uslovna ponuda."
    : null;

  const businessStatusLabel =
    overallStatus === "ready"
      ? "Može odmah u ponudu"
      : overallStatus === "provisional"
      ? "Može u uslovnu ponudu"
      : "Ne može bez ručne intervencije";

  const explainabilityNotes = [
    ...(maintenancePlan?.meta?.assumptions || []),
    ...(maintenancePlan?.meta?.ruleValidationWarnings || []),
    ...(quoteReadiness?.warnings || []),
  ].filter(Boolean);

  const loadProfile = (profileId) => {
    setSelectedProfileId(profileId);
    setVin(SAMPLE_VINS[profileId]);
    setHourlyRate(VEHICLE_PROFILES[profileId]?.hourlyRate || 5500);
    setEngineOverride("");
    setGearboxOverride("");
    setDrivetrainOverride("");
  };

  return {
    sessionUser,
    viewMode,
    setViewMode,
    selectedProfileId,
    loadProfile,
    vin,
    setVin,
    plannedKm,
    setPlannedKm,
    contractMonths,
    setContractMonths,
    exploitationType,
    setExploitationType,
    hourlyRate,
    setHourlyRate,
    oilPricePerLiter,
    setOilPricePerLiter,
    tireCategory,
    setTireCategory,
    flexInterval,
    setFlexInterval,
    laborDiscount,
    setLaborDiscount,
    partsDiscount,
    setPartsDiscount,
    oilDiscount,
    setOilDiscount,
    engineOverride,
    setEngineOverride,
    gearboxOverride,
    setGearboxOverride,
    drivetrainOverride,
    setDrivetrainOverride,
    registrationAnnual,
    setRegistrationAnnual,
    insuranceAnnual,
    setInsuranceAnnual,
    leasingMonthly,
    setLeasingMonthly,
    adminMonthly,
    setAdminMonthly,
    extraordinaryReserve,
    setExtraordinaryReserve,
    operatingMonthly,
    setOperatingMonthly,
    additionalTcoCosts,
    decoded,
    exploitation,
    annualKm,
    validation,
    resolvedVehicle,
    resolutionContract,
    resolverMissingConfirmations,
    canGenerateMaintenancePlan,
    maintenancePlan,
    scenarioRows,
    scenarioComparisonData,
    tcoSummary,
    tcoBreakdown,

    planningGate,
    missingFields,
    warnings,

    gate: planningGate,
    vehicleGate: null,
    vehicleGateUi: {
      label: "-",
      style: {
        background: "#e2e8f0",
        color: "#334155",
        border: "1px solid #cbd5e1",
      },
    },

    overallStatus,
    canBuildExactPlan,
    canBuildProvisionalPlan,
    finalEngine,
    finalGearbox,
    finalDrivetrain,
    maintenanceGateMessage,
    vehicleLabel,
    exploitationLabel,
    vehiclePresentation,
    showExpertSections,
    engineLabel,
    gearboxLabel,
    drivetrainLabel,
    businessStatusLabel,
    totalsDisplay,
    resolverSourceLabels,
    resolverStatusUi,
    planningGateUi,
    overallStatusUi,
    planStatusUi,
    vehicleConfidence,
    pricingConfidence,
    quoteReadiness,
    quoteReadinessUi,
    explainabilityNotes,
    getFieldLabel,
    planTotalCost,
    planTotalMaintenance,
    planTotalNonMaintenance,
    planTotalService,
    planTotalBrakes,
    planTotalTires,
    planTotalLeasing,
    planTotalInsurance,
    planTotalRegistration,
    planTotalAdministrative,
    planTotalExtraordinary,
    planTotalOperating,
    planTotalEvents,
    planCostPerKm,
    planCostPerMonth,
    serviceEvents,
    brakeEvents,
    tireEvents,
    EXPLOITATION_PROFILES,
  };
}
