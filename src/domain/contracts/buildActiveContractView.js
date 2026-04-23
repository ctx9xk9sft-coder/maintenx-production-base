function safe(value) {
  return Number(value || 0);
}

function sum(entries = []) {
  return entries.reduce((acc, item) => acc + safe(item?.amount), 0);
}

export function buildActiveContractView(contract, actualEntries = []) {
  if (!contract?.id) {
    return null;
  }

  const totals = contract?.planSnapshot?.totals || {};
  const breakdown = contract?.selectedScenario?.tcoBreakdown || {};

  const plannedTotal = safe(totals.totalCost);
  const actualTotal = sum(actualEntries);

  return {
    id: contract.id,
    contractStatus: "active",
    vehicle: {
      vin: contract.vin,
      modelLabel: contract.modelLabel,
    },
    contract: {
      months: contract?.contractParams?.contractMonths || 0,
      plannedKm: contract?.contractParams?.plannedKm || 0,
      exploitationType: contract?.contractParams?.exploitationLabel || null,
      tireCategory: contract?.contractParams?.tireCategory || null,
    },
    plannedBaseline: {
      totalCost: plannedTotal,
      maintenanceCost: safe(totals.maintenanceTotal),
      nonMaintenanceCost: safe(totals.nonMaintenanceTotal),
      costPerKm: safe(totals.costPerKm),
      costPerMonth: safe(totals.costPerMonth),
    },
    plannedBreakdown: {
      registration: safe(breakdown.registration),
      insurance: safe(breakdown.insurance),
      leasing: safe(breakdown.leasing),
      administrative: safe(breakdown.administrative),
      extraordinary: safe(breakdown.extraordinary),
      operating: safe(breakdown.operating),
    },
    actuals: {
      totalPosted: actualTotal,
      variance: actualTotal - plannedTotal,
      entries: actualEntries,
    },
  };
}

export default buildActiveContractView;
