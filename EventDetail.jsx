import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client.js";

function WineSoldList({ eventId }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    api(`/events/${eventId}/wine-sold?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`)
      .then(d => { setRows(d.records); setTotal(Number(d.total)); });
  }, [eventId, search, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: 16 }}>Wine Sold</h2>
        <span style={{ fontSize: 12, color: "#8a7d73" }}>{total} item{total !== 1 ? "s" : ""}</span>
      </div>
      <input placeholder="Search wine…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 220, marginBottom: 8 }} />
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Wine</th><th>Qty Sold</th><th>Price / Unit</th><th>Revenue</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#a89b8f" }}>No wine sold records</td></tr>}
            {rows.map(r => (
              <tr key={r.Id}>
                <td>{r.Wine_Name__c || r.Item_Name__c}</td>
                <td>{r.Quantity_Sold__c}</td>
                <td>${Number(r.Price_per_Unit__c || 0).toFixed(2)}</td>
                <td>${Number(r.Sales_Revenue__c || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 6, fontSize: 13 }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
          <span style={{ padding: "6px 4px" }}>{page} / {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}
    </section>
  );
}

function PhotosList({ eventId }) {
  const [photos, setPhotos] = useState([]);
  useEffect(() => { api(`/events/${eventId}/photos`).then(setPhotos); }, [eventId]);

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: 16 }}>Event Photos</h2>
        <span style={{ fontSize: 12, color: "#8a7d73" }}>{photos.length} file{photos.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Photo Name</th><th>Uploaded</th><th>Link</th></tr></thead>
          <tbody>
            {photos.length === 0 && <tr><td colSpan={3} style={{ padding: 16, textAlign: "center", color: "#a89b8f" }}>No photos uploaded</td></tr>}
            {photos.map(p => (
              <tr key={p.Id}>
                <td>{p.Photo_Name__c}</td>
                <td>{new Date(p.CreatedDate).toLocaleDateString()}</td>
                <td><a href={p.Box_Photo_URL__c} target="_blank" rel="noreferrer">View</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [event, setEvent] = useState(null);

  useEffect(() => { api(`/events/${id}`).then(setEvent); }, [id]);

  if (!event) return <p style={{ color: "#8a7d73" }}>Loading…</p>;

  return (
    <div>
      <button className="btn-secondary" style={{ marginBottom: 16 }} onClick={() => nav(-1)}>← Back to events</button>

      {/* Detail section, laid out like a Salesforce record page: key fields at top,
          related lists (Wine Sold / Photos) underneath */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: 22 }}>{event.Name}</h1>
        <span style={{ background: "#F7EDEE", color: "var(--wine)", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, height: "fit-content" }}>{event.Status__c}</span>
      </div>
      <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 20 }}>{event.Type_of_Job__c}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
        <div className="card">
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "#8a7d73", marginBottom: 8, fontWeight: 600 }}>Event Details</div>
          {[["Venue", event.Location_Name__c], ["Address", event.Location_Address__c], ["State", event.Venue_State__c],
            ["Start", event.Start_Date_Time__c && new Date(event.Start_Date_Time__c).toLocaleString()],
            ["End", event.End_Date_Time__c && new Date(event.End_Date_Time__c).toLocaleString()]]
            .map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderTop: "1px solid #f3ede6" }}>
                <span style={{ color: "#8a7d73" }}>{label}</span><span style={{ fontWeight: 600 }}>{val || "—"}</span>
              </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "#8a7d73", marginBottom: 8, fontWeight: 600 }}>Performance</div>
          {[["Bottles Sold", event.Number_of_Bottles_Sold__c], ["Revenue", event.Event_Revenue_Total__c && `$${event.Event_Revenue_Total__c}`]]
            .map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderTop: "1px solid #f3ede6" }}>
                <span style={{ color: "#8a7d73" }}>{label}</span><span style={{ fontWeight: 600 }}>{val ?? "—"}</span>
              </div>
          ))}
        </div>
      </div>

      <WineSoldList eventId={id} />
      <PhotosList eventId={id} />
    </div>
  );
}
