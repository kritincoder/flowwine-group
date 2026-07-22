import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

export default function Dashboards() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [summary, setSummary] = useState(null);

  useEffect(() => { api(`/dashboards/summary?year=${year}`).then(setSummary); }, [year]);

  const years = [];
  for (let y = currentYear; y >= 2020; y--) years.push(y);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22 }}>Dashboards</h1>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 120 }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div className="card"><div style={{ fontSize: 12, color: "#8a7d73" }}>Events ({year})</div><div style={{ fontSize: 26, fontWeight: 700 }}>{summary?.eventsYtd ?? "—"}</div></div>
        <div className="card"><div style={{ fontSize: 12, color: "#8a7d73" }}>Bottles Sold ({year})</div><div style={{ fontSize: 26, fontWeight: 700 }}>{summary?.bottlesYtd ?? "—"}</div></div>
        <div className="card"><div style={{ fontSize: 12, color: "#8a7d73" }}>Revenue ({year})</div><div style={{ fontSize: 26, fontWeight: 700 }}>{summary ? `$${Number(summary.revenueYtd).toLocaleString()}` : "—"}</div></div>
      </div>
      <p style={{ marginTop: 20, fontSize: 13, color: "#8a7d73" }}>See the Reports tab for month/state/quarter/brand breakdowns with charts.</p>
    </div>
  );
}
