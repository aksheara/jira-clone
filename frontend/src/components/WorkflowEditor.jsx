import { useEffect, useState } from "react";
import api from "../api/client";

const CATEGORY_OPTIONS = [
  { value: "TODO",        label: "To Do",       color: "#42526E" },
  { value: "IN_PROGRESS", label: "In Progress",  color: "#0052CC" },
  { value: "DONE",        label: "Done",         color: "#00875A" },
];

const PRESET_COLORS = [
  "#42526E", "#0052CC", "#00875A", "#DE350B", "#FF8B00",
  "#6554C0", "#00B8D9", "#36B37E", "#FF5630", "#FFAB00",
];

export default function WorkflowEditor({ project }) {
  const [states, setStates]           = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [loading, setLoading]         = useState(true);

  // New state form
  const [newName,     setNewName]     = useState("");
  const [newColor,    setNewColor]    = useState("#42526E");
  const [newCategory, setNewCategory] = useState("TODO");
  const [adding,      setAdding]      = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Inline edit
  const [editingId,       setEditingId]       = useState(null);
  const [editName,        setEditName]        = useState("");
  const [editColor,       setEditColor]       = useState("");
  const [editCategory,    setEditCategory]    = useState("");
  const [editIsDefault,   setEditIsDefault]   = useState(false);

  // Transition add
  const [txFrom, setTxFrom] = useState("");
  const [txTo,   setTxTo]   = useState("");

  const [error, setError]   = useState("");

  const projectId = project?.id;

  function load() {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      api.get(`/workflow-states/?project=${projectId}`),
      api.get(`/workflow-transitions/?project=${projectId}`),
    ])
      .then(([sRes, tRes]) => {
        setStates(sRes.data);
        setTransitions(tRes.data);
      })
      .catch(() => setError("Could not load workflow data."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [projectId]);

  // ---- State CRUD ----
  async function handleAddState(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    try {
      await api.post("/workflow-states/", {
        project: projectId,
        name: newName.trim(),
        color: newColor,
        category: newCategory,
      });
      setNewName("");
      setNewColor("#42526E");
      setNewCategory("TODO");
      setShowAddForm(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.response?.data?.name?.[0] || "Could not add state.");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.patch(`/workflow-states/${editingId}/`, {
        name: editName.trim(),
        color: editColor,
        category: editCategory,
        is_default: editIsDefault,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.response?.data?.name?.[0] || "Could not save.");
    }
  }

  async function handleDeleteState(stateId, stateName) {
    if (!window.confirm(`Delete "${stateName}"? Issues in this status must be moved first.`)) return;
    setError("");
    try {
      await api.delete(`/workflow-states/${stateId}/`);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not delete state.");
    }
  }

  async function handleMovePosition(stateId, direction) {
    const idx = states.findIndex((s) => s.id === stateId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= states.length) return;

    const current = states[idx];
    const swap    = states[swapIdx];
    try {
      await Promise.all([
        api.patch(`/workflow-states/${current.id}/`, { position: swap.position }),
        api.patch(`/workflow-states/${swap.id}/`,    { position: current.position }),
      ]);
      load();
    } catch {
      setError("Could not reorder states.");
    }
  }

  async function handleResetToDefault() {
    if (!window.confirm("Reset workflow to the default 3-column layout (To Do, In Progress, Done)?\nThis will not delete existing issues.")) return;
    setError("");
    try {
      await api.post(`/workflow-states/seed/?project=${projectId}`);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not reset workflow.");
    }
  }

  // ---- Transition CRUD ----
  async function handleAddTransition(e) {
    e.preventDefault();
    if (!txFrom || !txTo || txFrom === txTo) {
      setError("Select two different states.");
      return;
    }
    setError("");
    try {
      await api.post("/workflow-transitions/", {
        project: projectId,
        from_state: parseInt(txFrom),
        to_state:   parseInt(txTo),
      });
      setTxFrom("");
      setTxTo("");
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Transition already exists or invalid.");
    }
  }

  async function handleDeleteTransition(txId) {
    try {
      await api.delete(`/workflow-transitions/${txId}/`);
      load();
    } catch {
      setError("Could not delete transition.");
    }
  }

  if (loading) return <div className="jira-wf-loading">Loading workflow…</div>;

  return (
    <div className="jira-wf-editor">

      {error && (
        <div className="jira-auth-alert-error" style={{ marginBottom: 12 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="jira-auth-alert-msg">{error}</div>
        </div>
      )}

      {/* ── STATES SECTION ── */}
      <div className="jira-wf-section">
        <div className="jira-wf-section-header">
          <h4 className="jira-wf-section-title">Workflow States</h4>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="jira-btn-link-sm" onClick={handleResetToDefault}>↺ Reset to default</button>
            <button className="jira-btn-primary-sm" onClick={() => setShowAddForm((v) => !v)}>
              + Add State
            </button>
          </div>
        </div>

        {/* Add state form */}
        {showAddForm && (
          <form onSubmit={handleAddState} className="jira-wf-add-form">
            <input
              type="text"
              className="jira-input-sm"
              placeholder="State name (e.g. Code Review)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              required
              style={{ flex: 2 }}
            />
            <select
              className="jira-select-sm"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <div className="jira-wf-color-row">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`jira-wf-color-dot ${newColor === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                  title={c}
                />
              ))}
            </div>
            <button type="submit" className="jira-btn-primary-sm" disabled={adding}>
              {adding ? "Adding…" : "Add"}
            </button>
            <button type="button" className="jira-btn-secondary-sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </form>
        )}

        {/* State list */}
        <div className="jira-wf-state-list">
          {states.map((state, idx) => (
            <div key={state.id} className="jira-wf-state-row">
              {editingId === state.id ? (
                <form onSubmit={handleSaveEdit} className="jira-wf-edit-form">
                  <input
                    type="text"
                    className="jira-input-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    autoFocus
                    style={{ flex: 2 }}
                  />
                  <select
                    className="jira-select-sm"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <div className="jira-wf-color-row">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`jira-wf-color-dot ${editColor === c ? "selected" : ""}`}
                        style={{ background: c }}
                        onClick={() => setEditColor(c)}
                        title={c}
                      />
                    ))}
                  </div>
                  <label className="jira-wf-default-label">
                    <input
                      type="checkbox"
                      checked={editIsDefault}
                      onChange={(e) => setEditIsDefault(e.target.checked)}
                    />
                    Default
                  </label>
                  <button type="submit" className="jira-btn-primary-sm">Save</button>
                  <button type="button" className="jira-btn-secondary-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </form>
              ) : (
                <>
                  {/* Position controls */}
                  <div className="jira-wf-pos-btns">
                    <button
                      className="jira-wf-pos-btn"
                      onClick={() => handleMovePosition(state.id, "up")}
                      disabled={idx === 0}
                      title="Move left"
                    >▲</button>
                    <button
                      className="jira-wf-pos-btn"
                      onClick={() => handleMovePosition(state.id, "down")}
                      disabled={idx === states.length - 1}
                      title="Move right"
                    >▼</button>
                  </div>

                  {/* Color swatch */}
                  <span className="jira-wf-color-swatch" style={{ background: state.color }} />

                  {/* Name + badges */}
                  <div className="jira-wf-state-info">
                    <span className="jira-wf-state-name">{state.name}</span>
                    <span className="jira-wf-category-badge" style={{ background: CATEGORY_OPTIONS.find(c => c.value === state.category)?.color || "#42526E" }}>
                      {CATEGORY_OPTIONS.find(c => c.value === state.category)?.label}
                    </span>
                    {state.is_default && <span className="jira-wf-default-badge">DEFAULT</span>}
                  </div>

                  {/* Actions */}
                  <div className="jira-wf-state-actions">
                    <button
                      className="jira-btn-icon-plain"
                      title="Edit"
                      onClick={() => {
                        setEditingId(state.id);
                        setEditName(state.name);
                        setEditColor(state.color);
                        setEditCategory(state.category);
                        setEditIsDefault(state.is_default);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      className="jira-btn-icon-plain"
                      title="Delete state"
                      onClick={() => handleDeleteState(state.id, state.name)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#de350b" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {states.length === 0 && (
            <div className="jira-wf-empty">No states yet. Add one above or reset to default.</div>
          )}
        </div>

        {/* Visual board preview */}
        {states.length > 0 && (
          <div className="jira-wf-preview">
            <span className="jira-wf-preview-label">Board preview:</span>
            <div className="jira-wf-preview-cols">
              {states.map((s, i) => (
                <div key={s.id} className="jira-wf-preview-col">
                  <div className="jira-wf-preview-col-header" style={{ background: s.color }}>
                    {s.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── TRANSITIONS SECTION ── */}
      <div className="jira-wf-section" style={{ marginTop: 20 }}>
        <div className="jira-wf-section-header">
          <h4 className="jira-wf-section-title">Allowed Transitions</h4>
          <span className="jira-wf-hint">If no transitions are set, all moves are allowed.</span>
        </div>

        {/* Add transition form */}
        <form onSubmit={handleAddTransition} className="jira-wf-add-form">
          <select
            className="jira-select-sm"
            value={txFrom}
            onChange={(e) => setTxFrom(e.target.value)}
            required
          >
            <option value="">From state…</option>
            {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B778C" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
          <select
            className="jira-select-sm"
            value={txTo}
            onChange={(e) => setTxTo(e.target.value)}
            required
          >
            <option value="">To state…</option>
            {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="submit" className="jira-btn-primary-sm">+ Add</button>
        </form>

        {/* Transition list */}
        <div className="jira-wf-transition-list">
          {transitions.length === 0 && (
            <div className="jira-wf-empty">No transitions defined — all moves are currently allowed.</div>
          )}
          {transitions.map((tx) => (
            <div key={tx.id} className="jira-wf-transition-row">
              <span className="jira-wf-tx-from">{tx.from_state_name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
              <span className="jira-wf-tx-to">{tx.to_state_name}</span>
              <button
                className="jira-btn-icon-plain"
                title="Remove transition"
                onClick={() => handleDeleteTransition(tx.id)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#de350b" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
