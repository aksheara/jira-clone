import { useState } from "react";
import api from "../api/client";

export default function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleNameChange(e) {
    const val = e.target.value;
    setName(val);
    if (!key || key.length <= 4) {
      // Auto-generate key acronym
      const words = val.trim().split(/\s+/).filter(Boolean);
      let autoKey = "";
      if (words.length === 1 && words[0].length >= 3) {
        autoKey = words[0].substring(0, 3).toUpperCase();
      } else if (words.length > 1) {
        autoKey = words.map(w => w[0]).join("").substring(0, 4).toUpperCase();
      }
      if (autoKey) {
        setKey(autoKey);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/projects/", {
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
      });
      setName("");
      setKey("");
      setDescription("");
      onProjectCreated && onProjectCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.key?.[0] || err.response?.data?.detail || "Error creating project. Ensure key is unique.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="jira-modal-backdrop" onClick={onClose}>
      <div className="jira-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="jira-modal-header">
          <h2 className="jira-modal-title">Create project</h2>
          <button className="jira-btn-icon-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="jira-modal-body">
          {error && <div className="jira-alert-error">{error}</div>}

          <div className="jira-form-field">
            <label className="jira-field-label">Name <span className="jira-req">*</span></label>
            <input
              type="text"
              className="jira-input"
              placeholder="e.g. My Data Science Team"
              value={name}
              onChange={handleNameChange}
              required
              autoFocus
            />
          </div>

          <div className="jira-form-field">
            <label className="jira-field-label">Key <span className="jira-req">*</span></label>
            <input
              type="text"
              className="jira-input"
              placeholder="e.g. KAN"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              maxLength={10}
              required
            />
            <span className="jira-field-help">
              A prefix for your project's issues (e.g. KAN-1, KAN-2)
            </span>
          </div>

          <div className="jira-form-field">
            <label className="jira-field-label">Description</label>
            <textarea
              className="jira-textarea"
              placeholder="Brief description of the project workspace..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="jira-modal-footer">
            <button type="button" className="jira-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="jira-btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
