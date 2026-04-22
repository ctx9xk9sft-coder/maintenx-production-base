import React from "react";

export default function CostStructureSection({
  totalCost,
  serviceCost,
  brakeCost,
  tireCost,
  breakdown = null,
}) {
  const safeTotal = Number(totalCost || 0);

  const normalizedBreakdown = breakdown && Object.keys(breakdown).length > 0
    ? breakdown
    : {
        maintenance: Number(serviceCost || 0) + Number(brakeCost || 0) + Number(tireCost || 0),
        registration: 0,
        insurance: 0,
        leasing: 0,
        administrative: 0,
        extraordinary: 0,
        operating: Math.max(
          0,
          safeTotal - Number(serviceCost || 0) - Number(brakeCost || 0) - Number(tireCost || 0)
        ),
      };

  const rows = [
    { key: "maintenance", label: "Održavanje", value: Number(normalizedBreakdown.maintenance || 0) },
    { key: "registration", label: "Registracija", value: Number(normalizedBreakdown.registration || 0) },
    { key: "insurance", label: "Osiguranje", value: Number(normalizedBreakdown.insurance || 0) },
    { key: "leasing", label: "Leasing", value: Number(normalizedBreakdown.leasing || 0) },
    { key: "administrative", label: "Administracija", value: Number(normalizedBreakdown.administrative || 0) },
    { key: "extraordinary", label: "Vanredni", value: Number(normalizedBreakdown.extraordinary || 0) },
    { key: "operating", label: "Operativni", value: Number(normalizedBreakdown.operating || 0) },
  ];

  const formatRsd = (v) =>
    new Intl.NumberFormat("sr-RS").format(Math.round(v || 0)) + " RSD";

  const formatPct = (v) => `${Math.round(v || 0)}%`;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        padding: "18px",
        marginBottom: "20px"
      }}
    >
      <div
        style={{
          fontSize: "20px",
          fontWeight: 700,
          marginBottom: "14px",
          color: "#0f172a"
        }}
      >
        Full TCO structure
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px"
        }}
      >
        {rows.map((row) => {
          const percent = safeTotal > 0 ? (row.value / safeTotal) * 100 : 0;

          return (
            <CostCard
              key={row.key}
              label={row.label}
              value={formatRsd(row.value)}
              percent={formatPct(percent)}
            />
          );
        })}
      </div>
    </div>
  );
}

function CostCard({ label, value, percent }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "14px"
      }}
    >
      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
        {value}
      </div>
      <div style={{ fontSize: "13px", color: "#334155", marginTop: "4px" }}>
        {percent}
      </div>
    </div>
  );
}
