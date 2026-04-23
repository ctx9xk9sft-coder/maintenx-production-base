import { formatRsd } from "../../utils/formatters.js";
import ActualCostEntryForm from "./ActualCostEntryForm.jsx";

export default function ActiveContractDetailPanel({ contract, onPostCost }) {
  if (!contract) {
    return null;
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Active contract detail</h2>

      <div style={styles.grid}>
        <Metric label="Vozilo" value={contract.vehicle.modelLabel} />
        <Metric label="VIN" value={contract.vehicle.vin || "-"} />
        <Metric label="Planirani trošak" value={formatRsd(contract.plannedBaseline.totalCost)} />
        <Metric label="Realni trošak" value={formatRsd(contract.actuals.totalPosted)} />
        <Metric label="Variance" value={formatRsd(contract.actuals.variance)} />
        <Metric label="Planirana KM" value={`${contract.contract.plannedKm} km`} />
      </div>

      <div style={styles.entriesWrap}>
        <h3 style={styles.subtitle}>Uneti troškovi</h3>
        {contract.actuals.entries.length === 0 ? (
          <div style={styles.empty}>Još nema unetih troškova.</div>
        ) : (
          contract.actuals.entries.map((entry) => (
            <div key={entry.id} style={styles.entryRow}>
              <div>{entry.category}</div>
              <div>{formatRsd(entry.amount)}</div>
            </div>
          ))
        )}
      </div>

      <ActualCostEntryForm contractId={contract.id} onSubmit={onPostCost} />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

const styles = {
  card: { background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 1px 10px rgba(0,0,0,0.08)', marginTop: 20 },
  title: { margin: '0 0 18px', fontSize: 22 },
  subtitle: { margin: '0 0 12px', fontSize: 18 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px,1fr))', gap: 12, marginBottom: 20 },
  metric: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 },
  metricLabel: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  metricValue: { fontSize: 16, fontWeight: 800 },
  entriesWrap: { marginBottom: 20 },
  entryRow: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', padding: '10px 0' },
  empty: { color: '#64748b' },
};
