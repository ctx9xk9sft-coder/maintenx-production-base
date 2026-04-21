export default function AcceptedContractsSection({
  contracts = [],
  selectedContractId = null,
  onSelectContract,
  actualCostDraft,
  onActualCostDraftChange,
  onAddActualCost,
  formatRsd,
}) {
  const selectedContract =
    contracts.find((item) => item.id === selectedContractId) || contracts[0] || null;

  const actualEntries = Array.isArray(selectedContract?.tracking?.actualCosts)
    ? selectedContract.tracking.actualCosts
    : [];

  const plannedTotal = Number(selectedContract?.planSnapshot?.totals?.totalCost || 0);
  const actualTotal = Number(selectedContract?.tracking?.totals?.actualTotal || 0);
  const variance = actualTotal - plannedTotal;

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Prihvaćeni ugovori</h2>
          <div style={styles.muted}>Pregled aktivnih vozila i početak lifecycle cost tracking-a.</div>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div style={styles.emptyBox}>Još nema prihvaćenih ugovora. Prihvati prvu ponudu iz kalkulacije.</div>
      ) : (
        <div style={styles.grid}>
          <div style={styles.listCol}>
            {contracts.map((contract) => {
              const isSelected = contract.id === selectedContract?.id;
              return (
                <button
                  key={contract.id}
                  type="button"
                  onClick={() => onSelectContract?.(contract.id)}
                  style={{
                    ...styles.contractCard,
                    ...(isSelected ? styles.contractCardActive : {}),
                  }}
                >
                  <div style={styles.contractTitleRow}>
                    <div style={styles.contractTitle}>
                      {contract?.vehicleSnapshot?.brand || "Škoda"} {contract?.vehicleSnapshot?.model || "-"}
                    </div>
                    <div style={styles.contractBadge}>{contract?.quoteSnapshot?.status || "-"}</div>
                  </div>
                  <div style={styles.contractMeta}>{contract?.vin || "Bez VIN-a"}</div>
                  <div style={styles.contractMeta}>
                    {contract?.contractParams?.contractMonths || "-"} mes / {contract?.contractParams?.plannedKm || "-"} km
                  </div>
                  <div style={styles.contractMeta}>
                    Planirano: {formatRsd(Number(contract?.planSnapshot?.totals?.totalCost || 0))}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={styles.detailCol}>
            {selectedContract ? (
              <>
                <div style={styles.detailCard}>
                  <div style={styles.sectionLabel}>Vehicle / contract snapshot</div>
                  <div style={styles.detailTitle}>
                    {selectedContract?.vehicleSnapshot?.brand || "Škoda"} {selectedContract?.vehicleSnapshot?.model || "-"}
                  </div>
                  <div style={styles.detailMetaWrap}>
                    <span style={styles.detailMetaPill}>{selectedContract?.vehicleSnapshot?.engineCode || "-"}</span>
                    <span style={styles.detailMetaPill}>{selectedContract?.vehicleSnapshot?.gearboxCode || "-"}</span>
                    <span style={styles.detailMetaPill}>{selectedContract?.vehicleSnapshot?.drivetrain || "-"}</span>
                    <span style={styles.detailMetaPill}>{selectedContract?.contractParams?.contractMonths || "-"} mes</span>
                    <span style={styles.detailMetaPill}>{selectedContract?.contractParams?.plannedKm || "-"} km</span>
                  </div>
                </div>

                <div style={styles.kpiGrid}>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>Planned total</div>
                    <div style={styles.kpiValue}>{formatRsd(plannedTotal)}</div>
                  </div>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>Actual total</div>
                    <div style={styles.kpiValue}>{formatRsd(actualTotal)}</div>
                  </div>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>Variance</div>
                    <div style={styles.kpiValue}>{formatRsd(variance)}</div>
                  </div>
                </div>

                <div style={styles.actualCostBox}>
                  <div style={styles.sectionLabel}>Unos realnog troška</div>
                  <div style={styles.formGrid}>
                    <input
                      value={actualCostDraft?.date || ""}
                      onChange={(e) => onActualCostDraftChange?.("date", e.target.value)}
                      type="date"
                      style={styles.input}
                    />
                    <select
                      value={actualCostDraft?.category || "service"}
                      onChange={(e) => onActualCostDraftChange?.("category", e.target.value)}
                      style={styles.input}
                    >
                      <option value="service">Servis</option>
                      <option value="tires">Gume</option>
                      <option value="registration">Registracija</option>
                      <option value="insurance">Osiguranje</option>
                      <option value="leasing">Rata / leasing</option>
                      <option value="extraordinary">Vanredni trošak</option>
                      <option value="other">Ostalo</option>
                    </select>
                    <input
                      value={actualCostDraft?.amount || ""}
                      onChange={(e) => onActualCostDraftChange?.("amount", e.target.value)}
                      type="number"
                      placeholder="Iznos"
                      style={styles.input}
                    />
                    <input
                      value={actualCostDraft?.note || ""}
                      onChange={(e) => onActualCostDraftChange?.("note", e.target.value)}
                      type="text"
                      placeholder="Napomena"
                      style={styles.input}
                    />
                  </div>
                  <button type="button" onClick={() => onAddActualCost?.(selectedContract.id)} style={styles.addBtn}>
                    Dodaj realni trošak
                  </button>
                </div>

                <div style={styles.entriesBox}>
                  <div style={styles.sectionLabel}>Realni troškovi</div>
                  {actualEntries.length === 0 ? (
                    <div style={styles.emptyInline}>Još nema unetih realnih troškova.</div>
                  ) : (
                    <div style={styles.entriesList}>
                      {actualEntries.map((entry) => (
                        <div key={entry.id} style={styles.entryRow}>
                          <div>
                            <div style={styles.entryTitle}>{entry.category}</div>
                            <div style={styles.entryMeta}>{entry.date || "-"} · {entry.note || "bez napomene"}</div>
                          </div>
                          <div style={styles.entryAmount}>{formatRsd(Number(entry.amount || 0))}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { background: "#fff", borderRadius: 28, padding: 28, boxShadow: "0 1px 10px rgba(0,0,0,0.08)", marginBottom: 20 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 18 },
  title: { fontSize: 22, margin: 0 },
  muted: { color: "#64748b", fontSize: 16, marginTop: 8 },
  emptyBox: { border: "1px dashed #cbd5e1", borderRadius: 18, padding: 18, color: "#64748b" },
  grid: { display: "grid", gridTemplateColumns: "320px 1fr", gap: 18 },
  listCol: { display: "grid", gap: 12, alignContent: "start" },
  detailCol: { display: "grid", gap: 14 },
  contractCard: { textAlign: "left", border: "1px solid #e2e8f0", borderRadius: 18, padding: 16, background: "#fff", cursor: "pointer" },
  contractCardActive: { border: "1px solid #0f172a", background: "#f8fafc" },
  contractTitleRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 },
  contractTitle: { fontSize: 16, fontWeight: 800, color: "#0f172a" },
  contractBadge: { fontSize: 12, fontWeight: 800, padding: "6px 10px", borderRadius: 999, background: "#e2e8f0", color: "#334155" },
  contractMeta: { fontSize: 13, color: "#475569", marginTop: 6 },
  detailCard: { border: "1px solid #e2e8f0", borderRadius: 18, padding: 18, background: "#fff" },
  sectionLabel: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  detailTitle: { fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 12 },
  detailMetaWrap: { display: "flex", gap: 8, flexWrap: "wrap" },
  detailMetaPill: { padding: "8px 10px", borderRadius: 999, background: "#f1f5f9", fontSize: 13, fontWeight: 700, color: "#0f172a" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(160px, 1fr))", gap: 12 },
  kpiCard: { border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, background: "#fff" },
  kpiLabel: { fontSize: 13, color: "#64748b", marginBottom: 10 },
  kpiValue: { fontSize: 20, fontWeight: 800, color: "#0f172a" },
  actualCostBox: { border: "1px solid #e2e8f0", borderRadius: 18, padding: 18, background: "#fff" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: 10, marginBottom: 12 },
  input: { border: "1px solid #cbd5e1", borderRadius: 12, padding: "10px 12px", fontSize: 14, background: "#fff" },
  addBtn: { border: "1px solid #0f172a", background: "#0f172a", color: "#fff", borderRadius: 12, padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  entriesBox: { border: "1px solid #e2e8f0", borderRadius: 18, padding: 18, background: "#fff" },
  emptyInline: { color: "#64748b", fontSize: 14 },
  entriesList: { display: "grid", gap: 10 },
  entryRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f1f5f9" },
  entryTitle: { fontSize: 14, fontWeight: 800, color: "#0f172a", textTransform: "capitalize" },
  entryMeta: { fontSize: 13, color: "#64748b", marginTop: 4 },
  entryAmount: { fontSize: 15, fontWeight: 800, color: "#0f172a" },
};
