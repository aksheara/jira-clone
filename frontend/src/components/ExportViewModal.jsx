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
            <span style={{ fontSize: 20 }}>📊</span>
            <div>
              <h2 className="jira-modal-title">Export & View Layouts</h2>
              <span className="jira-sub-key">Export {project?.name} data or switch project views</span>
            </div>
          </div>
          <button className="jira-btn-icon-close" onClick={onClose}>✕</button>
        </div>

        <div className="jira-modal-body">
          {/* View Modes Section */}
          <div className="jira-section-title">🗂️ Switch Project View</div>
          <div className="jira-views-grid">
            <button
              className={`jira-view-tile ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => {
                onSelectTab && onSelectTab("summary");
                onClose();
              }}
            >
              <span className="jira-view-icon">🌐</span>
              <div>
                <div className="jira-view-name">Summary</div>
                <div className="jira-view-desc">Metrics & sprint completion overview</div>
              </div>
            </button>

            <button
              className={`jira-view-tile ${activeTab === "list" ? "active" : ""}`}
              onClick={() => {
                onSelectTab && onSelectTab("list");
                onClose();
              }}
            >
              <span className="jira-view-icon">⊞</span>
              <div>
                <div className="jira-view-name">List View</div>
                <div className="jira-view-desc">Detailed spreadsheet table</div>
              </div>
            </button>

            <button
              className={`jira-view-tile ${activeTab === "board" ? "active" : ""}`}
              onClick={() => {
                onSelectTab && onSelectTab("board");
                onClose();
              }}
            >
              <span className="jira-view-icon">▥</span>
              <div>
                <div className="jira-view-name">Kanban Board</div>
                <div className="jira-view-desc">Drag-and-drop workflow cards</div>
              </div>
            </button>

            <button
              className={`jira-view-tile ${activeTab === "calendar" ? "active" : ""}`}
              onClick={() => {
                onSelectTab && onSelectTab("calendar");
                onClose();
              }}
            >
              <span className="jira-view-icon">📅</span>
              <div>
                <div className="jira-view-name">Calendar</div>
                <div className="jira-view-desc">Timeline and sprint deadlines</div>
              </div>
            </button>

            <button
              className={`jira-view-tile ${activeTab === "docs" ? "active" : ""}`}
              onClick={() => {
                onSelectTab && onSelectTab("docs");
                onClose();
              }}
            >
              <span className="jira-view-icon">📄</span>
              <div>
                <div className="jira-view-name">Project Docs</div>
                <div className="jira-view-desc">PRDs, specs & retrospectives</div>
              </div>
            </button>
          </div>

          <div className="jira-popover-divider" style={{ margin: "16px 0" }} />

          {/* Export Formats Section */}
          <div className="jira-section-title">📥 Export Workspace Data</div>
          <div className="jira-export-buttons-grid">
            <button className="jira-export-card-btn" onClick={handleExportCSV}>
              <span className="jira-exp-icon">📗</span>
              <div>
                <div className="jira-exp-title">Export to CSV</div>
                <div className="jira-exp-sub">For Excel, Google Sheets, or Numbers</div>
              </div>
            </button>

            <button className="jira-export-card-btn" onClick={handleExportJSON}>
              <span className="jira-exp-icon">📦</span>
              <div>
                <div className="jira-exp-title">Export to JSON</div>
                <div className="jira-exp-sub">Structured payload for scripts & APIs</div>
              </div>
            </button>

            <button
              className="jira-export-card-btn"
              onClick={() => {
                onClose();
                window.print();
              }}
            >
              <span className="jira-exp-icon">🖨️</span>
              <div>
                <div className="jira-exp-title">Print / Save as PDF</div>
                <div className="jira-exp-sub">Standard browser print layout</div>
              </div>
            </button>

            <button className="jira-export-card-btn" onClick={handleCopyJSON}>
              <span className="jira-exp-icon">📋</span>
              <div>
                <div className="jira-exp-title">{copiedJson ? "✓ Copied to clipboard!" : "Copy JSON Payload"}</div>
                <div className="jira-exp-sub">Quick copy to paste in tools</div>
              </div>
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
