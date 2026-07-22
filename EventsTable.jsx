import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function EventsTable({ when, title }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    setLoading(true);
    api(`/events/mine?when=${when}&search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`)
      .then(data => { setRows(data.records); setTotal(Number(data.total)); })
      .finally(() => setLoading(false));
  }, [when, search, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>{title}</h1>
      <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 16 }}>
        {when === "upcoming" ? "Events starting today or later" : "Events that have already occurred"}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <input
          placeholder="Search events…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 240 }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#8a7d73" }}>
          Rows per page
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Event Name</th><th>Type</th><th>Venue</th><th>Start</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#a89b8f" }}>Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#a89b8f" }}>No events found</td></tr>}
            {rows.map(r => (
              <tr key={r.Id} style={{ cursor: "pointer" }} onClick={() => nav(`/events/${r.Id}`)}>
                <td style={{ color: "var(--wine)", textDecoration: "underline", fontWeight: 600 }}>{r.Name}</td>
                <td>{r.Type_of_Job__c}</td>
                <td>{r.Location_Name__c}</td>
                <td>{r.Start_Date_Time__c ? new Date(r.Start_Date_Time__c).toLocaleString() : "—"}</td>
                <td>{r.Status__c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13, color: "#8a7d73" }}>
        <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
          <span style={{ padding: "8px 4px" }}>{page} / {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      </div>
    </div>
  );
}
