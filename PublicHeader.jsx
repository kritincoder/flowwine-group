import { LOGO_DATA_URI } from "../assets/logo.js";
import { FacebookIcon, XIcon, InstagramIcon, LinkedInIcon, SOCIAL_LINKS, CONTACT_EMAIL, SITE_URL } from "./SocialIcons.jsx";

export default function PublicHeader() {
  return (
    <header>
      <div style={{
        display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16,
        padding: "8px 24px", color: "#5c5049",
      }}>
        <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: "inherit" }}><FacebookIcon /></a>
        <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" style={{ color: "inherit" }}><XIcon /></a>
        <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "inherit" }}><InstagramIcon /></a>
        <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ color: "inherit" }}><LinkedInIcon /></a>
        <a href={`mailto:${CONTACT_EMAIL}`} aria-label="Email" style={{ color: "inherit", fontSize: 18 }}>✉</a>
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 24px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 12,
      }}>
        <img src={LOGO_DATA_URI} alt="Flow Wine Group" style={{ height: 44 }} />
        <div style={{ display: "flex", gap: 24, fontSize: 14, color: "#5c5049" }}>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "inherit", display: "flex", alignItems: "center", gap: 6 }}>✉ Drop an Email</a>
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", display: "flex", alignItems: "center", gap: 6 }}>🌐 Get in Touch</a>
        </div>
      </div>
    </header>
  );
}
