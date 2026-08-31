import { useState, useEffect } from "react";
import api from "../api/client";

export default function AutomationModal({ isOpen, onClose, projectId, projectName = "Project" }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewRule, setShowNewRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newTrigger, setNewTrigger] = useState("When status moves to DONE");
  const [newAction, setNewAction] = useState("Set resolution to Resolved");

  useEffect(() => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    api.get(`/automation-rules/?project=${projectId}`)
      .then(async (res) => {
        let loaded = res.data || [];
        if (loaded.length === 0) {
          // Initialize default pre-configured rules
          try {
            const r1 = await api.post("/automation-rules/", {
              project: projectId,
              name: "Auto-close parent issue when all subtasks are Done",
              trigger: "When all subtasks status = DONE",
              action: "Transition parent issue to DONE",
              enabled: true,
              execution_count: 14,
            });
            const r2 = await api.post("/automation-rules/", {
              project: projectId,
              name: "Auto-assign issue to active user on In Progress",
              trigger: "When issue status moves to IN PROGRESS",
              action: "Assign to current user if unassigned",
              enabled: true,
              execution_count: 28,
            });
            const r3 = await api.post("/automation-rules/", {
              project: projectId,
              name: "Notify Team Lead on Critical priority bugs",
              trigger: "When Issue created with Priority = CRITICAL",
              action: "Send urgent notification & highlight blocker",
              enabled: true,
              execution_count: 6,
            });
            loaded = [r1.data, r2.data, r3.data];
          } catch (e) {}
        }
        setRules(loaded);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  async function toggleRule(id, currentStatus) {
    try {
      const res = await api.patch(`/automation-rules/${id}/`, {
        enabled: !currentStatus,
      });
      setRules((prev) => prev.map((r) => (r.id === id ? res.data : r)));
    } catch (e) {
      alert("Failed to toggle rule state.");
    }
  }

  async function handleCreateRule(e) {
    e.preventDefault();
    if (!newRuleName.trim() || !projectId) return;
    try {
      const res = await api.post("/automation-rules/", {
        project: projectId,
        name: newRuleName.trim(),
        trigger: newTrigger,
        action: newAction,
        enabled: true,
        execution_count: 0,
      });
      setRules((prev) => [...prev, res.data]);
      setNewRuleName("");
      setShowNewRule(false);
    } catch (e) {
      alert("Failed to save automation rule.");
    }
  }

  async function handleDeleteRule(id) {
    try {
      await api.delete(`/automation-rules/${id}/`);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert("Failed to delete rule.");
    }
  }

  return (
    <div className="jira-modal-backdrop" onClick={onClose}>
      <div className="jira-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="jira-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6554C0" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <div>
              <h2 className="jira-modal-title">Automation Rules for {projectName}</h2>
              <span className="jira-sub-key">Persisted in Django Database — Live Event Triggers</span>
            </div>
          </div>
          <button className="jira-btn-icon-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="jira-modal-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--jira-text-primary)" }}>
              Active Rules ({rules.filter((r) => r.enabled).length} of {rules.length} enabled)
            </span>
            <button className="jira-btn-primary-sm" onClick={() => setShowNewRule(true)}>
              + Create Rule
            </button>
          </div>

          {showNewRule && (
            <form onSubmit={handleCreateRule} className="jira-new-rule-card">
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>New Automation Rule</h4>
              <div className="jira-form-field">
                <label className="jira-field-label">Rule Name <span className="jira-req">*</span></label>
                <input
                  type="text"
                  className="jira-input"
                  placeholder="e.g. Auto-mark resolution when done"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="jira-form-row-2" style={{ marginTop: 10 }}>
                <div className="jira-form-field">
                  <label className="jira-field-label">WHEN (Trigger)</label>
                  <select
                    className="jira-select"
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value)}
                  >
                    <option value="When status moves to DONE">When status moves to DONE</option>
                    <option value="When issue created">When issue created</option>
                    <option value="When priority is Critical">When priority is Critical</option>
                    <option value="When assignee is changed">When assignee is changed</option>
                  </select>
                </div>

                <div className="jira-form-field">
                  <label className="jira-field-label">THEN (Action)</label>
                  <select
                    className="jira-select"
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                  >
                    <option value="Set resolution to Resolved">Set resolution to Resolved</option>
                    <option value="Assign to project lead">Assign to project lead</option>
                    <option value="Send notification to team">Send notification to team</option>
                    <option value="Set due date to +7 days">Set due date to +7 days</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button type="button" className="jira-btn-secondary-sm" onClick={() => setShowNewRule(false)}>
                  Cancel
                </button>
                <button type="submit" className="jira-btn-primary-sm">
                  Save to Database
                </button>
              </div>
            </form>
          )}

          {loading && <div style={{ padding: 16, textAlign: "center", color: "var(--jira-text-secondary)" }}>Loading rules from database...</div>}

          {!loading && (
            <div className="jira-automation-rules-list">
              {rules.map((r) => (
                <div key={r.id} className={`jira-automation-rule-row ${r.enabled ? "enabled" : "disabled"}`}>
                  <div className="jira-rule-left">
                    <div className="jira-rule-header-flex">
                      <span className="jira-rule-name">{r.name}</span>
                      <span className={`jira-rule-badge ${r.enabled ? "active" : "inactive"}`}>
                        {r.enabled ? "ACTIVE" : "PAUSED"}
                      </span>
                    </div>

                    <div className="jira-rule-logic-flow">
                      <span className="jira-logic-step"><strong>WHEN</strong> {r.trigger}</span>
                      <span className="jira-logic-arrow">→</span>
                      <span className="jira-logic-step"><strong>THEN</strong> {r.action}</span>
                    </div>

                    <div className="jira-rule-meta">
                      <span>Executed {r.execution_count || 0} times</span>
                    </div>
                  </div>

                  <div className="jira-rule-actions">
                    <label className="jira-switch-toggle" title="Toggle rule on/off">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={() => toggleRule(r.id, r.enabled)}
                      />
                      <span className="jira-switch-slider" />
                    </label>
                    <button
                      className="jira-btn-icon-danger"
                      onClick={() => handleDeleteRule(r.id)}
                      title="Delete rule"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
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
