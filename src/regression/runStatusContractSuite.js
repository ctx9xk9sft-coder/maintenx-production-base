import runtimeTestVins from "../data/runtime_test_vins.json" with { type: "json" };
import { decodeSkodaVin } from "../services/vinDecoder.js";
import { calculateMaintenanceValidation } from "../services/tcoCalculator.js";
import { resolveVehicleForMaintenance } from "../services/vehicleResolver.js";
import { EXPLOITATION_PROFILES } from "../data/exploitationProfiles.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runStatusContractSuite() {
  const vins = Array.isArray(runtimeTestVins) ? runtimeTestVins.slice(0, 100) : [];
  const exploitation = EXPLOITATION_PROFILES.fleet_standard;
  let pass = 0;
  let fail = 0;

  for (const item of vins) {
    const vin = typeof item === "string" ? item : item?.vin;
    if (!vin) continue;
    try {
      const decoded = decodeSkodaVin(vin);
      const validation = calculateMaintenanceValidation({
        decoded,
        exploitation,
        plannedKm: 150000,
        contractMonths: 48,
        serviceRegime: "flex",
      });
      const resolved = resolveVehicleForMaintenance({ vin, decoded, validation });
      const readiness = resolved?.quoteReadiness;
      const exact = Boolean(resolved?.canBuildExactPlan);
      const provisional = Boolean(resolved?.canBuildProvisionalPlan);
      const uiCanPlan =
        Boolean(decoded?.supported) &&
        validation?.status !== "invalid" &&
        provisional;

      if (readiness === "ready") {
        assert(exact === true, `${vin}: ready must allow exact plan`);
        assert(provisional === true, `${vin}: ready must allow provisional plan`);
      } else if (readiness === "provisional") {
        assert(exact === false, `${vin}: provisional must block exact plan`);
        assert(provisional === true, `${vin}: provisional must allow provisional plan`);
      } else {
        assert(readiness === "blocked", `${vin}: unknown quoteReadiness ${readiness}`);
        assert(exact === false, `${vin}: blocked must block exact plan`);
        assert(provisional === false, `${vin}: blocked must block provisional plan`);
      }

      assert(
        uiCanPlan === (Boolean(decoded?.supported) && validation?.status !== "invalid" && provisional),
        `${vin}: UI contract mismatch`
      );
      pass += 1;
    } catch (error) {
      fail += 1;
      console.error(`❌ CONTRACT FAIL: ${vin} -> ${error.message}`);
    }
  }

  console.log(`Contract suite: ${pass} passed, ${fail} failed.`);
  return { pass, fail };
}

export default runStatusContractSuite;
