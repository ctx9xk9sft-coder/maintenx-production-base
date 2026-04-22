import { useMemo, useState } from "react";
import { decodeSkodaVin } from "../services/vinDecoder.js";
import { VEHICLE_PROFILES } from "../data/vehicleProfiles.js";
import { SAMPLE_VINS } from "../data/sampleVins.js";
import { EXPLOITATION_PROFILES } from "../data/exploitationProfiles.js";
import { calculateMaintenanceValidation } from "../services/tcoCalculator.js";
import { resolveVehicleForMaintenance } from "../services/vehicleResolver.js";
import { buildMaintenancePlan } from "../services/buildMaintenancePlan.js";
import { priceMaintenancePlan } from "../services/pricingEngine.js";
import { computeVehicleConfidence } from "../services/confidence/computeVehicleConfidence.js";
import { computePricingConfidence } from "../services/confidence/computePricingConfidence.js";
import { computeQuoteReadiness } from "../services/confidence/computeQuoteReadiness.js";
import { buildResolutionContract } from "../contracts/resolutionContract.js";

export function useFleetCalculatorController() {
  const [vin, setVin] = useState(SAMPLE_VINS.octavia_diesel_dsg);
  const [plannedKm, setPlannedKm] = useState(200000);
  const [contractMonths, setContractMonths] = useState(48);
  const [exploitationType, setExploitationType] = useState("fleet_standard");

  const decoded = useMemo(() => decodeSkodaVin(vin), [vin]);
  const exploitation = EXPLOITATION_PROFILES[exploitationType];

  const validation = useMemo(() => calculateMaintenanceValidation({
    decoded,
    exploitation,
    plannedKm,
    contractMonths,
    serviceRegime: "flex"
  }), [decoded, exploitation, plannedKm, contractMonths]);

  const resolvedVehicle = useMemo(() => resolveVehicleForMaintenance({
    decoded,
    validation,
    manualOverrides: {}
  }), [decoded, validation]);

  const resolutionContract = useMemo(
    () => buildResolutionContract(resolvedVehicle),
    [resolvedVehicle]
  );

  const canGenerateMaintenancePlan =
    decoded?.supported &&
    plannedKm > 0 &&
    contractMonths > 0 &&
    resolutionContract.maintenanceClosure !== "blocked";

  const maintenancePlan = useMemo(() => {
    if (!canGenerateMaintenancePlan) return null;

    return buildMaintenancePlan({
      decoded,
      resolvedVehicle,
      validation,
      planning: {
        plannedKm,
        contractMonths,
        usageProfile: exploitationType
      }
    });
  }, [canGenerateMaintenancePlan, decoded, resolvedVehicle, validation, plannedKm, contractMonths, exploitationType]);

  const pricedPlan = useMemo(() => {
    if (!maintenancePlan) return null;
    return priceMaintenancePlan({ maintenancePlan });
  }, [maintenancePlan]);

  const vehicleConfidence = useMemo(() => computeVehicleConfidence({ resolvedVehicle, decoded }), [resolvedVehicle, decoded]);
  const pricingConfidence = useMemo(() => computePricingConfidence({ pricingMeta: pricedPlan?.pricingMeta || null }), [pricedPlan]);
  const quoteReadiness = useMemo(() => computeQuoteReadiness({ resolvedVehicle, vehicleConfidence, pricingConfidence }), [resolvedVehicle, vehicleConfidence, pricingConfidence]);

  return {
    vin,
    setVin,
    plannedKm,
    setPlannedKm,
    contractMonths,
    setContractMonths,
    exploitationType,
    setExploitationType,
    decoded,
    validation,
    resolvedVehicle,
    resolutionContract,
    canGenerateMaintenancePlan,
    maintenancePlan: pricedPlan,
    quoteReadiness
  };
}
