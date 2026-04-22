function nowIso() {
  return new Date().toISOString();
}

function buildId(prefix = "vehicle") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createVehicleAsset(input = {}) {
  const {
    vehicleId,
    vin,
    plateNumber = null,
    customerId = null,
    contractId = null,
    vehicleConfiguration = null,
    status = "available",
    createdAt,
  } = input;

  return {
    vehicleId: vehicleId || buildId("va"),
    vin,
    plateNumber,
    customerId,
    contractId,
    vehicleConfiguration,
    status,
    createdAt: createdAt || nowIso(),
  };
}

export function assignVehicleToContract(vehicle, contractId) {
  return {
    ...vehicle,
    contractId,
    status: "assigned",
    updatedAt: nowIso(),
  };
}
