import { useState } from "react";
import { ACTUAL_COST_CATEGORY } from "../../domain/contracts/ActualCostEntry.js";

const CATEGORY_OPTIONS = [
  [ACTUAL_COST_CATEGORY.SERVICE, "Servis"],
  [ACTUAL_COST_CATEGORY.TIRES, "Gume"],
  [ACTUAL_COST_CATEGORY.REGISTRATION, "Registracija"],
  [ACTUAL_COST_CATEGORY.INSURANCE, "Osiguranje"],
  [ACTUAL_COST_CATEGORY.LEASING, "Leasing"],
  [ACTUAL_COST_CATEGORY.ADMINISTRATIVE, "Administrativni"],
  [ACTUAL_COST_CATEGORY.EXTRAORDINARY, "Vanredni"],
  [ACTUAL_COST_CATEGORY.OPERATING, "Operativni"],
  [ACTUAL_COST_CATEGORY.OTHER, "Ostalo"],
];

export default function ActualCostEntryForm({ contractId, onSubmit }) {
  const [category, setCategory] = useState(ACTUAL_COST_CATEGORY.SERVICE);
  const [amount, setAmount] = useState("");
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      onSubmit({
        contractId,
        category,
        amount: Number(amount),
        supplier: supplier || null,
        note: note || null,
      });
      setAmount("");
      setSupplier("");
      setNote("");
    } catch (submitError) {
      setError(submitError?.message || "actual_cost_submit_failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.grid}>
        <label style={styles.field}>
          <span style={styles.label}>Kategorija</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} style={styles.input}>
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Iznos</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            style={styles.input}
            placeholder="0"
            required
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Dobavljač</span>
          <input value={supplier} onChange={(event) => setSupplier(event.target.value)} style={styles.input} />
        </label>
      </div>

      <label style={styles.field}>
        <span style={styles.label}>Napomena</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} style={styles.textarea} rows={3} />
      </label>

      {error ? <div style={styles.error}>{error}</div> : null}

      <button type="submit" style={styles.button}>
        Dodaj realni trošak
      </button>
    </form>
  );
}

const styles = {
  form: { display: "grid", gap: 14 },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(140px, 1fr))", gap: 12 },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 13, color: "#475569", fontWeight: 700 },
  input: { border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px", fontSize: 14 },
  textarea: { border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px", fontSize: 14, resize: "vertical" },
  button: { border: "1px solid #166534", background: "#16a34a", color: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer", width: "fit-content" },
  error: { color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 10 },
};
