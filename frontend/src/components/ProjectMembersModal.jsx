import { useState, useEffect } from "react";
import api from "../api/client";

export default function ProjectMembersModal({
  isOpen,
  onClose,
  project,
  onMembersUpdated,
}) {
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("MEMBER");
  const [customUsername, setCustomUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (project?.id && isOpen) {
      setMembers(project.members || []);
      // Fetch all system users to make adding members easy
      api.get("/auth/users/")
        .then((res) => setAllUsers(res.data))
        .catch(() => {});
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const currentMemberUserIds = new Set(members.map((m) => m.user?.id));
  const availableUsersToAdd = allUsers.filter((u) => !currentMemberUserIds.has(u.id));

  async function handleAddMember(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      let payload = { role: selectedRole };
      if (selectedUserId) {
        payload.user_id = Number(selectedUserId);
      } else if (customUsername.trim()) {
        payload.username = customUsername.trim();
      } else {
        setError("Please choose or type a user to add.");
        setLoading(false);
        return;
      }

      const res = await api.post(`/projects/${project.id}/add_member/`, payload);
      setMembers(res.data.members || []);
      setSelectedUserId("");
      setCustomUsername("");
      setSuccessMsg("Member added successfully!");
      onMembersUpdated && onMembersUpdated(res.data);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add member.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(userId) {
    if (!confirm("Are you sure you want to remove this member from the project?")) return;
    setError("");
    try {
      const res = await api.post(`/projects/${project.id}/remove_member/`, { user_id: userId });
      setMembers(res.data.members || []);
      onMembersUpdated && onMembersUpdated(res.data);
    } catch (err) {
      setError("Failed to remove member.");
    }
  }

  async function handleChangeRole(userId, newRole) {
    try {
      const res = await api.post(`/projects/${project.id}/add_member/`, {
        user_id: userId,
        role: newRole,
      });
      setMembers(res.data.members || []);
      onMembersUpdated && onMembersUpdated(res.data);
    } catch (err) {
      setError("Failed to update role.");
    }
  }

  const filteredMembers = members.filter((m) =>
    (m.user?.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.user?.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="jira-modal-backdrop" onClick={onClose}>
      <div className="jira-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="jira-modal-header">
          <div className="jira-modal-title-group">
            <h2 className="jira-modal-title">Project Members</h2>
            <span className="jira-sub-key">{project.name} ({project.key})</span>
          </div>
          <button className="jira-btn-icon-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="jira-modal-body">
          {error && <div className="jira-alert-error">{error}</div>}
          {successMsg && <div className="jira-alert-success">{successMsg}</div>}

          {/* Add Member Section */}
          <div className="jira-member-add-box">
            <h3 className="jira-section-title">Add team member</h3>
            <form onSubmit={handleAddMember} className="jira-member-add-form">
              <div className="jira-form-row-flexible">
                {availableUsersToAdd.length > 0 ? (
                  <select
                    className="jira-select"
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setCustomUsername("");
                    }}
                    style={{ flex: 2 }}
                  >
                    <option value="">Select registered user...</option>
                    {availableUsersToAdd.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email || "no email"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="jira-input"
                    placeholder="Enter username..."
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    style={{ flex: 2 }}
                  />
                )}

                <select
                  className="jira-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VIEWER">Viewer</option>
                </select>

                <button type="submit" className="jira-btn-primary" disabled={loading}>
                  {loading ? "Adding..." : "+ Add"}
                </button>
              </div>
            </form>
          </div>

          {/* Current Members List */}
          <div className="jira-members-list-wrapper">
            <div className="jira-members-list-header">
              <span className="jira-members-count">Members ({members.length})</span>
              <input
                type="text"
                className="jira-input-sm"
                placeholder="Filter members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="jira-members-list">
              {filteredMembers.map((m) => {
                const username = m.user?.username || "Unknown";
                const initials = username.substring(0, 2).toUpperCase();
                return (
                  <div key={m.id} className="jira-member-item-row">
                    <div className="jira-member-left">
                      <div className="jira-avatar-circle" title={username}>
                        {initials}
                      </div>
                      <div className="jira-member-info">
                        <span className="jira-member-name">{username}</span>
                        <span className="jira-member-email">{m.user?.email || "Team member"}</span>
                      </div>
                    </div>

                    <div className="jira-member-right">
                      <select
                        className="jira-select-sm"
                        value={m.role}
                        onChange={(e) => handleChangeRole(m.user?.id, e.target.value)}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>

                      <button
                        className="jira-btn-icon-danger"
                        onClick={() => handleRemoveMember(m.user?.id)}
                        title="Remove member"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <p className="jira-empty-muted">No matching members found.</p>
              )}
            </div>
          </div>
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
