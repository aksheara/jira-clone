import { useState } from "react";
import api from "../api/client";

export default function ShareProjectModal({ isOpen, onClose, project, onMemberAdded }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const projectUrl = window.location.href;

  function handleCopyLink() {
    navigator.clipboard?.writeText(projectUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteInput.trim() || !project) return;
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await api.post(`/projects/${project.id}/add_member/`, {
        username: inviteInput.trim(),
        role: inviteRole,
      });
      setMessage(`Successfully added ${inviteInput.trim()} to ${project.name}!`);
      setInviteInput("");
      onMemberAdded && onMemberAdded();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not find user or user is already a member.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="jira-modal-backdrop" onClick={onClose}>
      <div className="jira-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="jira-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <div>
              <h2 className="jira-modal-title">Share {project?.name}</h2>
              <span className="jira-sub-key">Collaborate with your team members</span>
            </div>
          </div>
          <button className="jira-btn-icon-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="jira-modal-body">
          {message && <div className="jira-alert-success">{message}</div>}
          {error && <div className="jira-alert-error">{error}</div>}

          {/* Quick Copy Link Box */}
          <div className="jira-form-field">
            <label className="jira-field-label">Project URL</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                readOnly
                className="jira-input"
                value={projectUrl}
                style={{ background: "#FAFBFC", flex: 1 }}
              />
              <button
                type="button"
                className="jira-btn-primary"
                onClick={handleCopyLink}
              >
              {copiedLink ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>

          <div className="jira-popover-divider" style={{ margin: "14px 0" }} />

          {/* Invite User by Name / Email */}
          <form onSubmit={handleInvite} className="jira-form-field">
            <label className="jira-field-label">Invite by Username or Email</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                className="jira-input"
                placeholder="Enter username (e.g. alex, dev_user)..."
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <select
                className="jira-select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{ width: 110 }}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit"
                className="jira-btn-primary"
                disabled={loading}
              >
                {loading ? "Adding..." : "Invite"}
              </button>
            </div>
          </form>

          {/* Sharing Access Overview */}
          <div className="jira-share-roles-info">
            <div className="jira-share-role-item">
              <strong>Members:</strong> Can create, edit, assign, and transition work items.
            </div>
            <div className="jira-share-role-item">
              <strong>Admins:</strong> Full access including project settings and permissions.
            </div>
          </div>
        </div>

        <div className="jira-modal-footer">
          <button type="button" className="jira-btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
