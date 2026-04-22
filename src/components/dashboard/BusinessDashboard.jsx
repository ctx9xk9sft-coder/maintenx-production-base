import React from "react";

export default function BusinessDashboard({
  totalCost,
  maintenanceTotal,
  nonMaintenanceTotal,
  serviceCost,
  brakeCost,
  tireCost,
  leasingCost,
  insuranceCost,
  costPerKm,
  costPerMonth,
  eventCount
}) {
  const formatRsd = (v) =>
    new Intl.NumberFormat("sr-RS").format(Math.round(v || 0)) + " RSD";

  const formatNum = (v) =>
    new Intl.NumberFormat("sr-RS").format(Math.round(v || 0));

  const safeTotal = Number(totalCost || 0);
  const derivedMaintenance = Number(serviceCost || 0) + Number(brakeCost || 0) + Number(tireCost || 0);
  const resolvedMaintenance = Number(maintenanceTotal || 0) > 0 ? Number(maintenanceTotal || 0) : derivedMaintenance;
  const resolvedNonMaintenance = Number(nonMaintenanceTotal || 0) > 0
    ? Number(nonMaintenanceTotal || 0)
    : Math.max(0, safeTotal - resolvedMaintenance);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(10, 1fr)",
        gap: "12px",
        marginTop: "20px",
        marginBottom: "20px"
      }}
    >
      <Stat label="Ukupni TCO" value={formatRsd(safeTotal)} />
      <Stat label="Održavanje ukupno" value={formatRsd(resolvedMaintenance)} />
      <Stat label="Ne-održavanje" value={formatRsd(resolvedNonMaintenance)} />
      <Stat label="Servisi" value={formatRsd(serviceCost)} />
      <Stat label="Kočnice" value={formatRsd(brakeCost)} />
      <Stat label="Gume" value={formatRsd(tireCost)} />
      <Stat label="Leasing" value={formatRsd(leasingCost)} />
      <Stat label="Osiguranje" value={formatRsd(insuranceCost)} />
      <Stat label="Trošak po mesecu" value={formatRsd(costPerMonth)} />
      <Stat label="Ukupni događaji" value={formatNum(eventCount)} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        padding: "14px",
        borderRadius: "10px",
        border: "1px solid #e2e8f0"
      }}
    >
      <div style={{ fontSize: "12px", color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: "600" }}>{value}</div>
    </div>
  );
}
