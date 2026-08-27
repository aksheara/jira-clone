import { useState } from "react";

export default function ExportViewModal({
  isOpen,
  onClose,
  project,
  issues = [],
  activeTab = "list",
  onSelectTab,
}) {
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen) return null;

  function handleExportCSV() {
    const headers = ["Key", "Title", "Type", "Status", "Priority", "Assignee", "Reporter", "Due Date", "Created At", "Updated At", "Resolution"];
    const rows = issues.map((i) => [
      `"${project?.key}-${i.id}"`,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.issue_type}"`,
      `"${i.status}"`,
      `"${i.priority}"`,
      `"${i.assignee?.username || 'Unassigned'}"`,
      `"${i.reporter?.username || 'Member'}"`,
      `"${i.due_date || 'None'}"`,
      `"${new Date(i.created_at).toLocaleDateString()}"`,
      `"${new Date(i.updated_at).toLocaleDateString()}"`,
      `"${i.resolution || (i.status === 'DONE' ? 'Resolved' : 'Unresolved')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${project?.key || 'JIRA'}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  }

  function handleExportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(issues, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `${project?.key || 'JIRA'}_issues.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  }

  function handleCopyJSON() {
    navigator.clipboard?.writeText(JSON.stringify(issues, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }

  return (
    <div className="jira-modal-backdrop" onClick={onClose}>
      <div className="jira-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="jira-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <div>
              <h2 className="jira-modal-title">Export & View Layouts</h2>
              <span className="jira-sub-key">Export {project?.name} data or switch project views</span>
            </div>
          </div>
          <button className="jira-btn-icon-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="jira-modal-body">
          {/* View Modes Section */}
          <div className="jira-section-title">Switch Project View</div>
          <div className="jira-views-grid">
            <button className={`jira-view-tile ${activeTab === "summary" ? "active" : ""}`} onClick={() => { onSelectTab && onSelectTab("summary"); onClose(); }}>
              <span className="jira-view-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
              <div><div className="jira-view-name">Summary</div><div className="jira-view-desc">Metrics & sprint completion overview</div></div>
            </button>
            <button className={`jira-view-tile ${activeTab === "list" ? "active" : ""}`} onClick={() => { onSelectTab && onSelectTab("list"); onClose(); }}>
              <span className="jira-view-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg></span>
              <div><div className="jira-view-name">List View</div><div className="jira-view-desc">Detailed spreadsheet table</div></div>
            </button>
            <button className={`jira-view-tile ${activeTab === "board" ? "active" : ""}`} onClick={() => { onSelectTab && onSelectTab("board"); onClose(); }}>
              <span className="jira-view-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="4" height="18" rx="1"/><rect x="10" y="3" width="4" height="18" rx="1"/><rect x="16" y="3" width="4" height="18" rx="1"/></svg></span>
              <div><div className="jira-view-name">Kanban Board</div><div className="jira-view-desc">Drag-and-drop workflow cards</div></div>
            </button>
            <button className={`jira-view-tile ${activeTab === "calendar" ? "active" : ""}`} onClick={() => { onSelectTab && onSelectTab("calendar"); onClose(); }}>
              <span className="jira-view-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
              <div><div className="jira-view-name">Calendar</div><div className="jira-view-desc">Timeline and sprint deadlines</div></div>
            </button>
            <button className={`jira-view-tile ${activeTab === "docs" ? "active" : ""}`} onClick={() => { onSelectTab && onSelectTab("docs"); onClose(); }}>
              <span className="jira-view-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
              <div><div className="jira-view-name">Project Docs</div><div className="jira-view-desc">PRDs, specs & retrospectives</div></div>
            </button>
          </div>

          <div className="jira-popover-divider" style={{ margin: "16px 0" }} />

          <div className="jira-section-title">Export Workspace Data</div>
          <div className="jira-export-buttons-grid">
            <button className="jira-export-card-btn" onClick={handleExportCSV}>
              <span className="jira-exp-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00875A" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/></svg></span>
              <div><div className="jira-exp-title">Export to CSV</div><div className="jira-exp-sub">For Excel, Google Sheets, or Numbers</div></div>
            </button>
            <button className="jira-export-card-btn" onClick={handleExportJSON}>
              <span className="jira-exp-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6554C0" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></span>
              <div><div className="jira-exp-title">Export to JSON</div><div className="jira-exp-sub">Structured payload for scripts & APIs</div></div>
            </button>
            <button className="jira-export-card-btn" onClick={() => { onClose(); window.print(); }}>
              <span className="jira-exp-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#42526E" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></span>
              <div><div className="jira-exp-title">Print / Save as PDF</div><div className="jira-exp-sub">Standard browser print layout</div></div>
            </button>
            <button className="jira-export-card-btn" onClick={handleCopyJSON}>
              <span className="jira-exp-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span>
              <div><div className="jira-exp-title">{copiedJson ? "Copied to clipboard!" : "Copy JSON Payload"}</div><div className="jira-exp-sub">Quick copy to paste in tools</div></div>
            </button>
          </div>
        </div>

        <div className="jira-modal-footer">
          <button type="button" className="jira-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
