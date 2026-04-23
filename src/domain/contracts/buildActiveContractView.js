function safe(value) {
  return Number(value || 0);
}

export function buildActiveContractView(contract) {
  if (!contract?.id) {
    return null;
  }

  const totals = contract?.planSnapshot?.totals || {};
  const breakdown = contract?.selectedScenario?.tcoBreakdown || {};

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
      totalCost: safe(totals.totalCost),
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
      totalPosted: 0,
      variance: 0,
      entries: [],
    },
  };
}

export default buildActiveContractView;
