import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const WINE_PALETTE = ["#7A1F2B", "#B02A3E", "#B98B3E", "#8a7d73", "#D9A5AC", "#4E3B31"];

function DrilldownList({ title, items, labelKey, countKey }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(null);

  return (
    <div className="card">
      <h3 style={{ fontSize: 14, marginBottom: 10 }}>{title}</h3>
      <table>
        <tbody>
          {items.map((item, i) => (
            <Fragment key={i}>
              <tr style={{ cursor: "pointer" }} onClick={() => setOpen(open === i ? null : i)}>
                <td style={{ color: "var(--wine)", textDecoration: "underline", fontWeight: 600 }}>{item[labelKey]}</td>
                <td style={{ textAlign: "right" }}>{item[countKey]} event{item[countKey] !== 1 ? "s" : ""}</td>
              </tr>
              {open === i && (
                <tr>
                  <td colSpan={2} style={{ background: "#faf6f1" }}>
                    {item.events.map(ev => (
                      <div key={ev.id} style={{ padding: "4px 0" }}>
                        <a href="#" onClick={(e) => { e.preventDefault(); nav(`/events/${ev.id}`); }}>{ev.name}</a>
                      </div>
                    ))}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const nav = useNavigate();

  useEffect(() => { api(`/dashboards/reports?year=${year}`).then(setData); }, [year]);

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 2020; y--) years.push(y);

  const quarterData = data ? Object.entries(data.quarterWiseRevenue).map(([q, bottles]) => ({ quarter: q, bottles })) : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22 }}>Reports</h1>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 120 }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {!data ? <p style={{ color: "#8a7d73" }}>Loading…</p> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <DrilldownList title="Month-wise Events" items={data.monthWiseEvents} labelKey="month" countKey="count" />
            <DrilldownList title="State-wise Events" items={data.stateWiseEvents} labelKey="state" countKey="count" />
          </div>

          {/* Vertical bar — month-wise bottles sold, clickable + hover tooltip */}
          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>Month-wise Revenue (bottles sold)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.monthWiseEvents}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v) => [`${v} bottles`, "Sold"]} />
                <Bar
                  dataKey="bottles" fill="#7A1F2B" radius={[4, 4, 0, 0]} cursor="pointer"
                  onClick={(d) => d?.events?.[0] && nav(`/events/${d.events[0].id}`)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Horizontal bar — quarter-wise revenue */}
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 10 }}>Quarter-wise Revenue (bottles sold)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={quarterData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="quarter" fontSize={12} width={40} />
                  <Tooltip formatter={(v) => [`${v} bottles`, "Sold"]} />
                  <Bar dataKey="bottles" fill="#B98B3E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie — brand-wise revenue */}
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 10 }}>Brand-wise Revenue (bottles sold)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.brandWiseRevenue} dataKey="bottles" nameKey="brand"
                    cx="50%" cy="50%" outerRadius={80} label={(d) => d.brand}
                  >
                    {data.brandWiseRevenue.map((_, i) => (
                      <Cell key={i} fill={WINE_PALETTE[i % WINE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} bottles`, n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              {data.brandWiseRevenue.length === 0 && <p style={{ color: "#a89b8f", fontSize: 13 }}>No brand data for {year}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
