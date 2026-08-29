import { useState } from "react";

export default function MarketplaceModal({ isOpen, onClose }) {
  const [apps, setApps] = useState([
    { id: "github", name: "GitHub for NEXA", category: "Developer Tools", desc: "Connect branches, commits, pull requests, and deployment statuses directly to NEXA tickets.", icon: "GH", connected: true, downloads: "1.2M" },
    { id: "slack", name: "Slack Integration", category: "Chat & Notifications", desc: "Receive instant updates when issues are created, assigned, or updated in dedicated team channels.", icon: "SL", connected: true, downloads: "2.4M" },
    { id: "figma", name: "Figma for NEXA", category: "Design", desc: "Embed live Figma files, design specs, and prototypes directly inside NEXA issue cards.", icon: "FG", connected: false, downloads: "850K" },
    { id: "ai_copilot", name: "NEXA Intelligence AI", category: "AI & Productivity", desc: "Generate issue summaries, write acceptance criteria, and translate customer requests into user stories.", icon: "AI", connected: true, downloads: "500K" },
    { id: "sentry", name: "Sentry Error Tracking", category: "Monitoring", desc: "Automatically create NEXA bugs from unhandled frontend and backend exceptions.", icon: "SN", connected: false, downloads: "420K" },
  ]);

  if (!isOpen) return null;

  function toggleConnect(appId) {
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, connected: !a.connected } : a))
    );
  }

  return (
    <div className="jira-modal-backdrop" onClick={onClose}>
      <div className="jira-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div className="jira-modal-header">
          <div className="jira-modal-title-group">
            <h2 className="jira-modal-title">NEXA Marketplace & Integrations</h2>
            <span className="jira-sub-key">Extend your project workspace with external tools and bots</span>
          </div>
          <button className="jira-btn-icon-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="jira-modal-body">
          <div className="jira-marketplace-grid">
            {apps.map((app) => (
              <div key={app.id} className="jira-marketplace-card">
                <div className="jira-app-card-top">
                <div className="jira-app-icon" style={{ background: "#F4F5F7", borderRadius: 8, padding: "6px 8px", fontWeight: 800, fontSize: 11, color: "#0052CC", letterSpacing: 0.5 }}>{app.icon}</div>
                  <div>
                    <h3 className="jira-app-name">{app.name}</h3>
                    <span className="jira-app-category">{app.category} • {app.downloads} installs</span>
                  </div>
                </div>

                <p className="jira-app-desc">{app.desc}</p>

                <div className="jira-app-card-footer">
                  <span className={`jira-app-status-badge ${app.connected ? "connected" : ""}`}>
                    {app.connected ? "● Connected" : "Not connected"}
                  </span>
                  <button
                    className={`jira-btn-sm ${app.connected ? "jira-btn-secondary" : "jira-btn-primary"}`}
                    onClick={() => toggleConnect(app.id)}
                  >
                    {app.connected ? "Configure" : "Connect"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="jira-modal-footer">
          <button className="jira-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
