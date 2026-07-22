import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

function OrgForm({ org, onSaved, lockedOrg }) {
  const [form, setForm] = useState(org);
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const isLockedHere = lockedOrg === org.org_type;
  const lockedElsewhere = lockedOrg && lockedOrg !== org.org_type;

  async function save() {
    await api(`/admin/salesforce/${org.org_type}`, { method: "PUT", body: form });
    setMsg("Saved"); onSaved(); setTimeout(() => setMsg(""), 1500);
  }
  async function activate() {
    try { await api(`/admin/salesforce/${org.org_type}/activate`, { method: "POST" }); onSaved(); }
    catch (err) { setMsg(err.message); }
  }
  async function test() {
    try { const d = await api(`/admin/salesforce/${org.org_type}/test`, { method: "POST" }); setMsg(`Connected as ${d.user}`); }
    catch (err) { setMsg(err.message); }
  }

  return (
    <div className="card" style={{ marginBottom: 14, opacity: lockedElsewhere ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, textTransform: "capitalize" }}>
          {org.org_type}
          {(isLockedHere || (!lockedOrg && org.is_active)) && <span style={{ fontSize: 11, color: "#1e7b34", marginLeft: 6 }}>● Active</span>}
          {isLockedHere && <span style={{ fontSize: 11, color: "#8a7d73", marginLeft: 6 }}>🔒 locked to this deployment</span>}
        </h3>
        {!lockedOrg && !org.is_active && <button className="btn-secondary" onClick={activate}>Set as Active</button>}
        {lockedElsewhere && <span style={{ fontSize: 12, color: "#a89b8f" }}>Not used by this deployment</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: "#8a7d73" }}>My Domain URL (e.g. https://yourorg.my.salesforce.com)</label>
          <input value={form.login_url || ""} onChange={set("login_url")} placeholder="https://yourorg-dev-ed.develop.my.salesforce.com" />
        </div>
        <div><label style={{ fontSize: 12, color: "#8a7d73" }}>Consumer Key</label><input value={form.consumer_key || ""} onChange={set("consumer_key")} /></div>
        <div><label style={{ fontSize: 12, color: "#8a7d73" }}>Consumer Secret</label><input value={form.consumer_secret || ""} onChange={set("consumer_secret")} placeholder="leave blank to keep current" /></div>
      </div>
      <p style={{ fontSize: 12, color: "#a89b8f", marginTop: 8 }}>
        Uses OAuth 2.0 Client Credentials Flow — no username/password needed. Requires "Client Credentials Flow" enabled
        on this Connected App, with a Run As user set in its policies.
      </p>
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <button className="btn-primary" onClick={save}>Save</button>
        <button className="btn-secondary" onClick={test}>Test Connection</button>
        {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
      </div>
    </div>
  );
}

export default function SalesforceConnection() {
  const [orgs, setOrgs] = useState([]);
  const [lockedOrg, setLockedOrg] = useState(null);
  function load() { api("/admin/salesforce").then(d => { setOrgs(d.orgs); setLockedOrg(d.lockedOrg); }); }
  useEffect(load, []);

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Salesforce Connection</h1>
      <p style={{ color: "#8a7d73", fontSize: 13, marginBottom: 16 }}>
        {lockedOrg
          ? `This deployment is locked to ${lockedOrg} via the SF_LOCKED_ORG environment variable — it never talks to the other org, even if its credentials are filled in below. This is the setup for running Production and Sandbox as two separate, parallel deployments.`
          : "Only the org marked Active is used by the portal (Users sync, events, wine sold, photos, Ask AI). Set SF_LOCKED_ORG as an environment variable instead if you're running Production and Sandbox as two separate deployments."}
        {" "}All client logins share a single cached session per org — a new login is only made when the cached session expires.
      </p>
      {orgs.map(o => <OrgForm key={o.org_type} org={o} onSaved={load} lockedOrg={lockedOrg} />)}
    </div>
  );
}
