function resolveField(value, field) {
  if (!value) {
    return {
      field,
      resolved: false,
      value: null,
      source: 'missing',
      confidence: 'low'
    };
  }

  return {
    field,
    resolved: true,
    value,
    source: 'decoded',
    confidence: 'high'
  };
}

export function resolveVehicleConfiguration({ decoded, manualOverrides = {} }) {
  if (!decoded?.supported) {
    return {
      supported: false,
      internalStatus: 'invalid',
      reason: decoded?.reason || 'vin_not_supported',
      fields: {},
      missingFields: ['model','modelYear','engine','gearbox','drivetrain'],
      missingConfirmations: ['model','modelYear','engine','gearbox','drivetrain'],
      warnings: []
    };
  }

  const engineValue = manualOverrides.engine || decoded.motorKod || decoded.motor;
  const gearboxValue = manualOverrides.gearbox || decoded.menjac;
  const drivetrainValue = manualOverrides.drivetrain || decoded.drivetrain || 'FWD';

  const fields = {
    model: resolveField(decoded.model, 'model'),
    modelYear: resolveField(decoded.modelYear, 'modelYear'),
    engine: resolveField(engineValue, 'engine'),
    gearbox: resolveField(gearboxValue, 'gearbox'),
    drivetrain: resolveField(drivetrainValue, 'drivetrain')
  };

  const missingFields = Object.values(fields)
    .filter((f) => !f.resolved)
    .map((f) => f.field);

  return {
    supported: true,
    internalStatus: missingFields.length === 0 ? 'ready_exact' : 'needs_manual_input',
    reason: null,
    fields,
    missingFields,
    missingConfirmations: missingFields,
    warnings: [],
    canonicalVehicle: {
      brand: decoded.marka || 'Skoda',
      model: decoded.model,
      modelYear: decoded.modelYear,
      engineCode: engineValue,
      gearboxCode: gearboxValue,
      drivetrain: drivetrainValue
    }
  };
}

export function resolveVehicleForMaintenance(input) {
  return resolveVehicleConfiguration(input);
}

export default resolveVehicleForMaintenance;
