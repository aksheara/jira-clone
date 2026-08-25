import { useState, useEffect } from "react";
import api from "../api/client";

export default function TeamsModal({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("members"); // 'members', 'projects'
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      api.get("/auth/users/").catch(() => ({ data: [] })),
      api.get("/projects/").catch(() => ({ data: [] })),
    ])
      .then(([usersRes, projectsRes]) => {
        setUsers(usersRes.data || []);
        setProjects(projectsRes.data || []);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="jira-modal-backdrop" onClick={onClose}>
      <div className="jira-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="jira-modal-header">
          <div className="jira-modal-title-group">
            <h2 className="jira-modal-title">👥 Organization & Teams Directory</h2>
            <span className="jira-sub-key">Real-time team members and active workspace projects</span>
          </div>
          <button className="jira-btn-icon-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab Switcher & Search */}
        <div style={{ padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--jira-border)" }}>
          <div style={{ display: "flex", gap: 16 }}>
            <button
              className={`jira-tab-btn ${activeTab === "members" ? "active" : ""}`}
              onClick={() => setActiveTab("members")}
              style={{ padding: "10px 4px" }}
            >
              <span>👤 All Members ({users.length})</span>
            </button>
            <button
              className={`jira-tab-btn ${activeTab === "projects" ? "active" : ""}`}
              onClick={() => setActiveTab("projects")}
              style={{ padding: "10px 4px" }}
            >
              <span>📁 Active Workspaces ({projects.length})</span>
            </button>
          </div>

          <input
            type="text"
            className="jira-input-sm"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 180 }}
          />
        </div>

        <div className="jira-modal-body" style={{ maxHeight: 420, overflowY: "auto" }}>
          {loading && <div style={{ padding: 20, textAlign: "center", color: "var(--jira-text-secondary)" }}>Loading team directory...</div>}

          {!loading && activeTab === "members" && (
            <div className="jira-teams-list">
              {filteredUsers.map((u) => (
                <div key={u.id} className="jira-team-card-row">
                  <div className="jira-team-card-left">
                    <div className="jira-avatar-circle" style={{ width: 36, height: 36, fontSize: 14 }}>
                      {u.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="jira-team-name">{u.username}</h4>
                      <p className="jira-team-desc" style={{ margin: 0, fontSize: 12 }}>
                        {u.email || "Registered Workspace Member"}
                      </p>
                    </div>
                  </div>

                  <div className="jira-team-card-right">
                    <span className="jira-status-pill jira-status-done" style={{ fontSize: 11 }}>
                      {u.projects_count || 1} Projects
                    </span>
                    <span className="jira-team-meta-pill" style={{ marginLeft: 6 }}>
                      Joined {new Date(u.date_joined || Date.now()).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: "var(--jira-text-muted)" }}>
                  No members found matching "{searchTerm}".
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === "projects" && (
            <div className="jira-teams-list">
              {projects.map((p) => (
                <div key={p.id} className="jira-team-card-row">
                  <div className="jira-team-card-left">
                    <div className="jira-avatar-circle" style={{ background: "var(--jira-blue)", color: "#fff", width: 36, height: 36 }}>
                      {p.key || "PJ"}
                    </div>
                    <div>
                      <h4 className="jira-team-name">{p.name}</h4>
                      <p className="jira-team-desc" style={{ margin: 0 }}>
                        Lead: {p.created_by?.username || "Admin"} • {p.members?.length || 1} Members
                      </p>
                    </div>
                  </div>

                  <div className="jira-team-card-right">
                    <span className="jira-team-meta-pill">
                      Role: {p.my_role || "Member"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="jira-modal-footer">
          <button type="button" className="jira-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
