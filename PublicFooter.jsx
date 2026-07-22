import { LOGO_DATA_URI } from "../assets/logo.js";
import { FacebookIcon, XIcon, InstagramIcon, LinkedInIcon, SOCIAL_LINKS } from "./SocialIcons.jsx";

export default function PublicFooter() {
  return (
    <footer>
      <div style={{
        background: "#F4F0EA", padding: "32px 24px", display: "flex",
        flexWrap: "wrap", gap: 40, justifyContent: "space-between",
      }}>
        <div style={{ maxWidth: 280 }}>
          <img src={LOGO_DATA_URI} alt="Flow Wine Group" style={{ height: 40, marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: "#8a7d73", lineHeight: 1.6 }}>
            Flow Wine Group is a national marketing company specializing in wine and spirits
            promotion to build brand awareness and increase sales.
          </p>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".04em", marginBottom: 10 }}>OUR SOLUTIONS</div>
          <div style={{ fontSize: 13, color: "#5c5049", display: "flex", flexDirection: "column", gap: 8 }}>
            <span>Wine &amp; Spirits Tastings</span>
            <span>Special Events</span>
            <span>Group Tastings</span>
            <span>Seminars &amp; Training</span>
            <span>Integrated Promotions</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", color: "#5c5049" }}>
          <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: "inherit" }}><FacebookIcon /></a>
          <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" style={{ color: "inherit" }}><XIcon /></a>
          <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "inherit" }}><InstagramIcon /></a>
          <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ color: "inherit" }}><LinkedInIcon /></a>
        </div>
      </div>
      <div style={{
        background: "#201A17", color: "#d9cfc4", fontSize: 12,
        padding: "14px 24px", display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap",
      }}>
        <span>© {new Date().getFullYear()} All Rights Reserved by Flow Wine Group Inc.</span>
        <a href="#" style={{ color: "inherit" }}>Terms of Use</a>
        <a href="#" style={{ color: "inherit" }}>Privacy Policy</a>
      </div>
    </footer>
  );
}
