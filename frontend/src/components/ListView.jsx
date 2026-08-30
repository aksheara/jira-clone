import { useState, useRef, useEffect } from "react";
import api from "../api/client";
import IssueModal from "./IssueModal";
import AskAIModal from "./AskAIModal";
import { IssueTypeIcon, PriorityIcon, MergeIcon, TrashIcon } from "./Icons";

export default function ListView({ project, issues = [], members = [], onRefresh, currentUser, isViewer = false }) {
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activeResolutionDropdownId, setActiveResolutionDropdownId] = useState(null);
  const [inlineCreating, setInlineCreating] = useState(false);
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineType, setInlineType] = useState("TASK");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showAskAI, setShowAskAI] = useState(false);

  // Search & Filter state
  const [searchVal, setSearchVal] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState(null); // null, user_id, 'UNASSIGNED'
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [groupBy, setGroupBy] = useState("NONE"); // 'NONE' | 'STATUS'

  // Popover menus
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  // Saved filters state
  const [savedFilters, setSavedFilters] = useState([]);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const savedFiltersRef = useRef(null);

  // Date edit inline state
  const [editingDueDateId, setEditingDueDateId] = useState(null);

  // Columns visibility state (persisted in localStorage)
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("jira_list_columns_v2");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      work: true,
      assignee: true,
      reporter: true,
      priority: true,
      status: true,
      dueDate: true,
      createdAt: true,
      updatedAt: false,
      resolution: true,
    };
  });

  useEffect(() => {
    localStorage.setItem("jira_list_columns_v2", JSON.stringify(columns));
  }, [columns]);

  const moreMenuRef = useRef(null);
  const columnMenuRef = useRef(null);

  // Load saved filters for this project
  useEffect(() => {
    if (!project?.id) return;
    api.get(`/saved-filters/?project=${project.id}`)
      .then((res) => setSavedFilters(res.data))
      .catch(() => {});
  }, [project?.id]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) {
        setShowColumnConfig(false);
      }
      if (savedFiltersRef.current && !savedFiltersRef.current.contains(e.target)) {
        setShowSavedFilters(false);
        setShowSaveInput(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter issues based on criteria
  const filteredIssues = issues.filter((issue) => {
    if (searchVal.trim()) {
      const q = searchVal.toLowerCase();
      const matchKey = `${project?.key}-${issue.id}`.toLowerCase().includes(q);
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchAssignee = (issue.assignee?.username || "").toLowerCase().includes(q);
      const matchReporter = (issue.reporter?.username || "").toLowerCase().includes(q);
      if (!matchKey && !matchTitle && !matchAssignee && !matchReporter) return false;
    }
    if (assigneeFilter !== null) {
      if (assigneeFilter === "UNASSIGNED" && issue.assignee) return false;
      if (typeof assigneeFilter === "number" && issue.assignee?.id !== assigneeFilter) return false;
    }
    if (priorityFilter && issue.priority !== priorityFilter) {
      return false;
    }
    if (typeFilter && issue.issue_type !== typeFilter) {
      return false;
    }
    return true;
  });

  const allSelected = filteredIssues.length > 0 && selectedIds.size === filteredIssues.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIssues.map((i) => i.id)));
    }
  }

  function toggleSelectOne(id, e) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleStatusChange(issueId, newStatus, e) {
    e?.stopPropagation();
    setActiveDropdownId(null);
    try {
      const payload = { status: newStatus };
      if (newStatus === "DONE") {
        payload.resolution = "Resolved";
      } else if (newStatus === "TODO") {
        payload.resolution = "Unresolved";
      }
      await api.patch(`/issues/${issueId}/`, payload);
      onRefresh && onRefresh();
    } catch (err) {
      alert("Failed to update status.");
    }
  }

  async function handleResolutionChange(issueId, newResolution, e) {
    e?.stopPropagation();
    setActiveResolutionDropdownId(null);
    try {
      const payload = { resolution: newResolution };
      if (newResolution === "Resolved" || newResolution === "Solved" || newResolution === "Done") {
        payload.status = "DONE";
      } else if (newResolution === "Unresolved") {
        payload.status = "TODO";
      }
      await api.patch(`/issues/${issueId}/`, payload);
      onRefresh && onRefresh();
    } catch (err) {
      alert("Failed to update resolution.");
    }
  }

  async function handleDueDateChange(issueId, newDueDate) {
    setEditingDueDateId(null);
    try {
      await api.patch(`/issues/${issueId}/`, { due_date: newDueDate || null });
      onRefresh && onRefresh();
    } catch (err) {
      alert("Failed to update due date.");
    }
  }

  // --- BULK OPERATIONS ---
  async function handleBulkMoveToTop() {
    if (selectedIds.size === 0) { alert("Select at least one issue first."); return; }
    if (!window.confirm(`Set ${selectedIds.size} issue(s) to Critical priority?`)) return;
    try {
      for (const id of selectedIds) {
        await api.patch(`/issues/${id}/`, { priority: "CRITICAL" });
      }
      setSelectedIds(new Set());
      onRefresh && onRefresh();
      alert(`${selectedIds.size === 0 ? "Issues" : selectedIds.size + " issue(s)"} moved to Critical priority.`);
    } catch (e) {
      alert("Failed to move issues to top. " + (e?.response?.data?.detail || ""));
    }
  }

  async function handleBulkArchive() {
    if (selectedIds.size === 0) { alert("Select at least one issue first."); return; }
    if (!window.confirm(`Archive ${selectedIds.size} selected issue(s)? They will be marked as Done.`)) return;
    try {
      for (const id of selectedIds) {
        await api.patch(`/issues/${id}/`, { status: "DONE", resolution: "Archived" });
      }
      setSelectedIds(new Set());
      onRefresh && onRefresh();
    } catch (e) {
      alert("Failed to archive issues. " + (e?.response?.data?.detail || ""));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) { alert("Select at least one issue first."); return; }
    if (!window.confirm(`Permanently delete ${selectedIds.size} selected issue(s)? This cannot be undone.`)) return;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await api.delete(`/issues/${id}/`);
      } catch (e) {
        failed++;
      }
    }
    setSelectedIds(new Set());
    onRefresh && onRefresh();
    if (failed > 0) {
      alert(`${failed} issue(s) could not be deleted — you can only delete issues you reported, or you need Admin role.`);
    }
  }

  async function handleBulkStatus(newStatus) {
    try {
      for (const id of selectedIds) {
        const payload = { status: newStatus };
        if (newStatus === "DONE") payload.resolution = "Resolved";
        if (newStatus === "TODO") payload.resolution = "Unresolved";
        await api.patch(`/issues/${id}/`, payload);
      }
      setSelectedIds(new Set());
      onRefresh && onRefresh();
    } catch (e) {
      alert("Failed to update status for selected issues.");
    }
  }

  async function handleBulkMerge() {
    if (selectedIds.size < 2) {
      alert("Please select at least 2 issues to merge.");
      return;
    }
    const selectedArr = Array.from(selectedIds);
    const primaryId = selectedArr[0];
    const secondaryIds = selectedArr.slice(1);

    const primaryIssue = issues.find((i) => i.id === primaryId);
    const secondaryIssues = issues.filter((i) => secondaryIds.includes(i.id));

    if (!window.confirm(`Merge ${secondaryIssues.length} issues into #${primaryId} (${primaryIssue?.title})?`)) return;

    try {
      const mergedDescription = `${primaryIssue?.description || ""}\n\n### Merged from Tickets:\n` +
        secondaryIssues.map((s) => `- **[${project?.key}-${s.id}]** ${s.title}\n  ${s.description || "No description."}`).join("\n");

      await api.patch(`/issues/${primaryId}/`, { description: mergedDescription });

      // Mark secondary as Duplicate / Done
      for (const s of secondaryIssues) {
        await api.patch(`/issues/${s.id}/`, { status: "DONE", resolution: "Duplicate" });
      }

      setSelectedIds(new Set());
      onRefresh && onRefresh();
      alert(`Successfully merged issues into ${project?.key}-${primaryId}!`);
    } catch (e) {
      alert("Failed to merge selected issues.");
    }
  }

  async function handleInlineCreate(e) {
    e.preventDefault();
    if (!inlineTitle.trim()) return;
    try {
      await api.post("/issues/", {
        project: project.id,
        title: inlineTitle.trim(),
        issue_type: inlineType,
        priority: "MEDIUM",
        status: "TODO",
      });
      setInlineTitle("");
      setInlineCreating(false);
      onRefresh && onRefresh();
    } catch (err) {
      alert("Failed to create issue.");
    }
  }

  async function triggerRefresh() {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 400);
  }

  function handleCopyKey(key, e) {
    e.stopPropagation();
    navigator.clipboard?.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function toggleColumn(colKey) {
    setColumns((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  }

  // Export filtered issues to CSV
  function handleExportCSV() {
    const headers = ["Key", "Title", "Type", "Status", "Priority", "Assignee", "Reporter", "Due Date", "Created At", "Updated At"];
    const rows = filteredIssues.map((i) => [
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
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${project?.key || 'JIRA'}_work_items.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMoreMenu(false);
  }

  // Quick set due dates for all open tickets
  async function handleQuickSetDueDates() {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const dateStr = targetDate.toISOString().split("T")[0];

    try {
      const openIssues = filteredIssues.filter((i) => i.status !== "DONE" && !i.due_date);
      for (const issue of openIssues) {
        await api.patch(`/issues/${issue.id}/`, { due_date: dateStr });
      }
      onRefresh && onRefresh();
      alert(`Set due date (${dateStr}) for ${openIssues.length} open issues!`);
    } catch (e) {
      alert("Failed to batch update due dates.");
    }
    setShowMoreMenu(false);
  }

  const userInitials = currentUser?.username
    ? currentUser.username.substring(0, 2).toUpperCase()
    : "U";
  const userFullName = currentUser?.username || "User";

  // ── Saved filter handlers ──
  async function handleSaveFilter() {
    const name = saveFilterName.trim();
    if (!name) return;
    try {
      const res = await api.post("/saved-filters/", {
        project: project.id,
        name,
        status: null,       // ListView doesn't have a single status filter currently
        priority: priorityFilter || null,
        assignee: typeof assigneeFilter === "number" ? assigneeFilter : null,
      });
      setSavedFilters((prev) => [...prev, res.data]);
      setSaveFilterName("");
      setShowSaveInput(false);
    } catch (err) {
      alert(err?.response?.data?.non_field_errors?.[0] || "Could not save filter.");
    }
  }

  async function handleDeleteSavedFilter(id) {
    try {
      await api.delete(`/saved-filters/${id}/`);
      setSavedFilters((prev) => prev.filter((f) => f.id !== id));
    } catch {
      alert("Could not delete filter.");
    }
  }

  function handleApplySavedFilter(f) {
    setPriorityFilter(f.priority || null);
    setAssigneeFilter(f.assignee || null);
    setShowSavedFilters(false);
  }

  // Grouping logic if enabled
  const groupedSections = [];
  if (groupBy === "STATUS") {
    groupedSections.push({ title: "To Do", items: filteredIssues.filter((i) => i.status === "TODO") });
    groupedSections.push({ title: "In Progress", items: filteredIssues.filter((i) => i.status === "IN_PROGRESS") });
    groupedSections.push({ title: "Done", items: filteredIssues.filter((i) => i.status === "DONE") });
  } else {
    groupedSections.push({ title: "All Work Items", items: filteredIssues });
  }

  return (
    <div className="jira-list-container">
      {/* Sub-toolbar matching Jira screenshot */}
      <div className="jira-list-toolbar">
        <div className="jira-toolbar-left">
          {/* Ask AI button */}
          <button
            className="jira-btn-ask-ai"
            title="Ask NEXA AI assistant"
            onClick={() => setShowAskAI(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z"/>
              <path d="M19 15L20.2 17.8L23 19L20.2 20.2L19 23L17.8 20.2L15 19L17.8 17.8L19 15Z"/>
            </svg>
            <span>Ask AI</span>
          </button>

          {/* Search work input */}
          <div className="jira-search-work-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search work"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="jira-search-work-input"
            />
          </div>

          {/* Quick Assignee Avatar Filter */}
          <div className="jira-quick-filter-avatars">
            <button
              className={`jira-filter-avatar-btn ${assigneeFilter === currentUser?.id ? "active" : ""}`}
              onClick={() =>
                setAssigneeFilter((prev) => (prev === currentUser?.id ? null : currentUser?.id))
              }
              title={`Filter by ${userFullName}`}
            >
              <div className="jira-avatar-icon-small">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <span className="jira-avatar-badge-ar">{userInitials}</span>
            </button>
          </div>

          {/* Filter Dropdown Button */}
          <div className="jira-nav-dropdown-wrap">
            <button
              className={`jira-toolbar-action-btn ${(priorityFilter || typeFilter) ? "active" : ""}`}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="21" x2="4" y2="14"/>
                <line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/>
                <line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/>
                <line x1="9" y1="8" x2="15" y2="8"/>
                <line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
              <span>Filter {(priorityFilter || typeFilter) ? `(Active)` : ""}</span>
            </button>

            {showFilterMenu && (
              <div className="jira-nav-popover" style={{ width: 220, padding: 12 }}>
                <span className="jira-field-label" style={{ marginBottom: 4 }}>Priority</span>
                <select
                  className="jira-select-sm"
                  value={priorityFilter || ""}
                  onChange={(e) => setPriorityFilter(e.target.value || null)}
                  style={{ width: "100%", marginBottom: 10 }}
                >
                  <option value="">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <span className="jira-field-label" style={{ marginBottom: 4 }}>Type</span>
                <select
                  className="jira-select-sm"
                  value={typeFilter || ""}
                  onChange={(e) => setTypeFilter(e.target.value || null)}
                  style={{ width: "100%", marginBottom: 12 }}
                >
                  <option value="">All Types</option>
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="STORY">Story</option>
                  <option value="EPIC">Epic</option>
                </select>

                <button
                  className="jira-btn-secondary-sm"
                  onClick={() => {
                    setPriorityFilter(null);
                    setTypeFilter(null);
                    setShowFilterMenu(false);
                  }}
                  style={{ width: "100%" }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>

          {/* Group Button */}
          <div className="jira-nav-dropdown-wrap">
            <button
              className={`jira-toolbar-action-btn ${groupBy !== "NONE" ? "active" : ""}`}
              onClick={() => setShowGroupMenu(!showGroupMenu)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>Group {groupBy !== "NONE" ? `(${groupBy})` : ""}</span>
            </button>

            {showGroupMenu && (
              <div className="jira-nav-popover" style={{ width: 180 }}>
                <button
                  className={`jira-popover-item-btn ${groupBy === "NONE" ? "active" : ""}`}
                  onClick={() => {
                    setGroupBy("NONE");
                    setShowGroupMenu(false);
                  }}
                >
                  None (Flat list)
                </button>
                <button
                  className={`jira-popover-item-btn ${groupBy === "STATUS" ? "active" : ""}`}
                  onClick={() => {
                    setGroupBy("STATUS");
                    setShowGroupMenu(false);
                  }}
                >
                  Group by Status
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar Right: Three Dots Action Menu */}
        <div className="jira-toolbar-right" ref={moreMenuRef}>
          <div className="jira-nav-dropdown-wrap">
            <button
              className={`jira-btn-icon-plain ${showMoreMenu ? "active" : ""}`}
              title="More list actions"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="19" cy="12" r="2"/>
              </svg>
            </button>

            {showMoreMenu && (
              <div className="jira-nav-popover" style={{ right: 0, left: "auto", width: 220 }}>
                <div className="jira-popover-header">LIST ACTIONS</div>
                <button className="jira-popover-item-btn" onClick={handleExportCSV}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <div>
                    <div className="jira-popover-item-title">Export to CSV</div>
                    <div className="jira-popover-item-sub">Download spreadsheet</div>
                  </div>
                </button>

                <button
                  className="jira-popover-item-btn"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowColumnConfig(true);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <div>
                    <div className="jira-popover-item-title">Configure Columns</div>
                    <div className="jira-popover-item-sub">Toggle visible fields</div>
                  </div>
                </button>

                <button className="jira-popover-item-btn" onClick={handleQuickSetDueDates}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <div>
                    <div className="jira-popover-item-title">Set Sprint Due Dates</div>
                    <div className="jira-popover-item-sub">+7 days for open tasks</div>
                  </div>
                </button>

                <button
                  className="jira-popover-item-btn"
                  onClick={() => {
                    setShowMoreMenu(false);
                    window.print();
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  <div>
                    <div className="jira-popover-item-title">Print List</div>
                  </div>
                </button>

                <div className="jira-popover-divider" />
                <button
                  className="jira-popover-item-btn"
                  onClick={() => {
                    setSearchVal("");
                    setAssigneeFilter(null);
                    setPriorityFilter(null);
                    setTypeFilter(null);
                    setGroupBy("NONE");
                    setShowMoreMenu(false);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                  <div>
                    <div className="jira-popover-item-title">Reset All Filters</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main List Table Frame */}
      <div className="jira-table-frame">
        <div className="jira-table-scrollable">
          <table className="jira-list-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    className="jira-checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                {columns.work && <th className="th-work" style={{ minWidth: 320 }}>Work</th>}
                {columns.assignee && <th style={{ width: 160 }}>Assignee</th>}
                {columns.reporter && <th style={{ width: 180 }}>Reporter</th>}
                {columns.priority && <th style={{ width: 120 }}>Priority</th>}
                {columns.status && <th style={{ width: 150 }}>Status</th>}
                {columns.dueDate && <th style={{ width: 140 }}>Due Date</th>}
                {columns.createdAt && <th style={{ width: 130 }}>Created</th>}
                {columns.updatedAt && <th style={{ width: 130 }}>Updated</th>}
                {columns.resolution && <th style={{ width: 130 }}>Resolution</th>}

                {/* Columns Config Header Icon */}
                <th style={{ width: 44, textAlign: "center" }} ref={columnMenuRef}>
                  <div className="jira-nav-dropdown-wrap">
                    <button
                      className="jira-btn-columns"
                      title="Configure columns"
                      onClick={() => setShowColumnConfig(!showColumnConfig)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>

                    {showColumnConfig && (
                      <div className="jira-nav-popover" style={{ right: 0, left: "auto", width: 200, padding: "10px 14px" }}>
                        <span className="jira-field-label" style={{ marginBottom: 8, display: "block" }}>VISIBLE COLUMNS</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox" checked={columns.dueDate} onChange={() => toggleColumn("dueDate")} />
                            Due Date
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox" checked={columns.createdAt} onChange={() => toggleColumn("createdAt")} />
                            Created Date
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox" checked={columns.updatedAt} onChange={() => toggleColumn("updatedAt")} />
                            Updated Date
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox" checked={columns.reporter} onChange={() => toggleColumn("reporter")} />
                            Reporter
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox" checked={columns.priority} onChange={() => toggleColumn("priority")} />
                            Priority
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox" checked={columns.resolution} onChange={() => toggleColumn("resolution")} />
                            Resolution
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {groupedSections.map((sec, secIdx) => (
                <div key={sec.title} style={{ display: "contents" }}>
                  {groupBy !== "NONE" && (
                    <tr className="jira-group-header-row">
                      <td colSpan={10}>
                        <div className="jira-group-header-content">
                          <span className="jira-group-title">{sec.title}</span>
                          <span className="jira-group-badge">{sec.items.length}</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {sec.items.map((issue) => {
                    const isDone = issue.status === "DONE";
                    const isSelected = selectedIds.has(issue.id);
                    const keyStr = `${project?.key || "KAN"}-${issue.id}`;
                    const repInitials = issue.reporter?.username
                      ? issue.reporter.username.substring(0, 2).toUpperCase()
                      : "U";

                    // Type icon using SVG component
                    const typeIconEl = <IssueTypeIcon type={issue.parent ? "SUBTASK" : issue.issue_type} size={14} />;

                    return (
                      <tr
                        key={issue.id}
                        className={`jira-row ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedIssueId(issue.id)}
                      >
                        {/* Checkbox column */}
                        <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="jira-checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectOne(issue.id, e)}
                          />
                        </td>

                        {/* Work column */}
                        {columns.work && (
                          <td className="td-work">
                            <div className="jira-work-cell">
                              <span className="jira-type-icon">{typeIconEl}</span>

                              <span
                                className={`jira-issue-key ${isDone ? "strikethrough" : ""}`}
                                onClick={(e) => handleCopyKey(keyStr, e)}
                                title="Click to copy issue key"
                              >
                                {keyStr}
                                {copiedKey === keyStr && (
                                  <span className="jira-copied-tip">Copied!</span>
                                )}
                              </span>

                              <span className="jira-issue-title">{issue.title}</span>
                            </div>
                          </td>
                        )}

                        {/* Assignee column */}
                        {columns.assignee && (
                          <td>
                            {issue.assignee ? (
                              <div className="jira-user-cell">
                                <div className="jira-avatar-circle small">
                                  {issue.assignee.username.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="jira-user-name">{issue.assignee.username}</span>
                              </div>
                            ) : (
                              <div className="jira-unassigned-cell">
                                <div className="jira-unassigned-icon">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                  </svg>
                                </div>
                                <span className="jira-unassigned-text">Unassigned</span>
                              </div>
                            )}
                          </td>
                        )}

                        {/* Reporter column */}
                        {columns.reporter && (
                          <td>
                            <div className="jira-reporter-cell">
                              <div className="jira-reporter-avatar-badge">{repInitials}</div>
                              <span className="jira-reporter-name">
                                {issue.reporter?.username || "Project Member"}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Priority column */}
                        {columns.priority && (
                          <td>
                            <span className="jira-priority-text" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <PriorityIcon priority={issue.priority} size={11} />
                              {issue.priority === "CRITICAL" && "Critical"}
                              {issue.priority === "HIGH" && "High"}
                              {issue.priority === "MEDIUM" && "Medium"}
                              {issue.priority === "LOW" && "Low"}
                            </span>
                          </td>
                        )}

                        {/* Status column with direct dropdown transition */}
                        {columns.status && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="jira-status-dropdown-wrapper">
                              <button
                                className={`jira-status-pill ${
                                  issue.status === "DONE"
                                    ? "jira-status-done"
                                    : issue.status === "IN_PROGRESS"
                                    ? "jira-status-inprogress"
                                    : "jira-status-todo"
                                }`}
                                onClick={() =>
                                  setActiveDropdownId(activeDropdownId === issue.id ? null : issue.id)
                                }
                              >
                                <span>
                                  {issue.status === "IN_PROGRESS"
                                    ? "IN PROGRESS"
                                    : issue.status === "DONE"
                                    ? "DONE"
                                    : "TO DO"}
                                </span>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                              </button>

                              {activeDropdownId === issue.id && (
                                <div className="jira-status-popover">
                                  <button
                                    className={`jira-status-option ${issue.status === "TODO" ? "active" : ""}`}
                                    onClick={(e) => handleStatusChange(issue.id, "TODO", e)}
                                  >
                                    <span className="jira-status-dot jira-status-todo" />
                                    TO DO
                                  </button>
                                  <button
                                    className={`jira-status-option ${issue.status === "IN_PROGRESS" ? "active" : ""}`}
                                    onClick={(e) => handleStatusChange(issue.id, "IN_PROGRESS", e)}
                                  >
                                    <span className="jira-status-dot jira-status-inprogress" />
                                    IN PROGRESS
                                  </button>
                                  <button
                                    className={`jira-status-option ${issue.status === "DONE" ? "active" : ""}`}
                                    onClick={(e) => handleStatusChange(issue.id, "DONE", e)}
                                  >
                                    <span className="jira-status-dot jira-status-done" />
                                    DONE
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Due Date column (interactive) */}
                        {columns.dueDate && (
                          <td onClick={(e) => e.stopPropagation()}>
                            {editingDueDateId === issue.id ? (
                              <input
                                type="date"
                                className="jira-input-sm"
                                defaultValue={issue.due_date || ""}
                                onBlur={(e) => handleDueDateChange(issue.id, e.target.value)}
                                onChange={(e) => handleDueDateChange(issue.id, e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <span
                                className="jira-due-date-text clickable"
                                onClick={() => setEditingDueDateId(issue.id)}
                                title="Click to edit due date"
                              >
                                {issue.due_date ? new Date(issue.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "— Set date"}
                              </span>
                            )}
                          </td>
                        )}

                        {/* Created Date column */}
                        {columns.createdAt && (
                          <td>
                            <span className="jira-meta-date-text">
                              {new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </td>
                        )}

                        {/* Updated Date column */}
                        {columns.updatedAt && (
                          <td>
                            <span className="jira-meta-date-text">
                              {new Date(issue.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </td>
                        )}

                        {/* Resolution column (interactive dropdown) */}
                        {columns.resolution && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="jira-status-dropdown-wrapper">
                              <button
                                className={`jira-resolution-pill ${
                                  (issue.resolution === "Resolved" || issue.resolution === "Solved" || isDone)
                                    ? "jira-res-resolved"
                                    : "jira-res-unresolved"
                                }`}
                                onClick={() =>
                                  setActiveResolutionDropdownId(
                                    activeResolutionDropdownId === issue.id ? null : issue.id
                                  )
                                }
                              >
                                <span>{issue.resolution || (isDone ? "Resolved" : "Unresolved")}</span>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                              </button>

                              {activeResolutionDropdownId === issue.id && (
                                <div className="jira-status-popover">
                                  <button
                                    className={`jira-status-option ${issue.resolution === "Resolved" ? "active" : ""}`}
                                    onClick={(e) => handleResolutionChange(issue.id, "Resolved", e)}
                                  >
                                    <span className="jira-status-dot jira-status-done" />
                                    Resolved
                                  </button>
                                  <button
                                    className={`jira-status-option ${issue.resolution === "Solved" ? "active" : ""}`}
                                    onClick={(e) => handleResolutionChange(issue.id, "Solved", e)}
                                  >
                                    <span className="jira-status-dot jira-status-done" />
                                    Solved
                                  </button>
                                  <button
                                    className={`jira-status-option ${issue.resolution === "Unresolved" ? "active" : ""}`}
                                    onClick={(e) => handleResolutionChange(issue.id, "Unresolved", e)}
                                  >
                                    <span className="jira-status-dot jira-status-todo" />
                                    Unresolved
                                  </button>
                                  <button
                                    className={`jira-status-option ${issue.resolution === "Won't Fix" ? "active" : ""}`}
                                    onClick={(e) => handleResolutionChange(issue.id, "Won't Fix", e)}
                                  >
                                    <span className="jira-status-dot" style={{ background: "#ff5630" }} />
                                    Won't Fix
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        )}

                        <td />
                      </tr>
                    );
                  })}
                </div>
              ))}

              {/* Inline Create Row inside table */}
              {inlineCreating && (
                <tr className="jira-row-inline-create">
                  <td style={{ textAlign: "center" }}>
                    <IssueTypeIcon type="SUBTASK" size={13} />
                  </td>
                  <td colSpan={9}>
                    <form onSubmit={handleInlineCreate} className="jira-inline-create-form">
                      <select
                        className="jira-select-inline"
                        value={inlineType}
                        onChange={(e) => setInlineType(e.target.value)}
                      >
                        <option value="TASK">Task</option>
                        <option value="BUG">Bug</option>
                        <option value="STORY">Story</option>
                      </select>
                      <input
                        type="text"
                        placeholder="What needs to be done?"
                        className="jira-inline-input"
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="jira-btn-primary-sm">Create</button>
                      <button
                        type="button"
                        className="jira-btn-secondary-sm"
                        onClick={() => setInlineCreating(false)}
                      >
                        Cancel
                      </button>
                    </form>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Create bar matching screenshot */}
        <div className="jira-table-footer-bar">
          {!isViewer && !inlineCreating ? (
            <button
              className="jira-btn-inline-add-trigger"
              onClick={() => setInlineCreating(true)}
            >
              + Create
            </button>
          ) : (
            <div />
          )}

          <div className="jira-footer-count-wrap">
            <span className="jira-footer-count-text">
              {filteredIssues.length} of {issues.length}
            </span>
            <button
              className={`jira-btn-refresh-icon ${isRefreshing ? "spin" : ""}`}
              onClick={triggerRefresh}
              title="Refresh issues list"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="jira-floating-bulk-bar">
          <div className="jira-bulk-counter-pill">
            <span className="jira-bulk-count-badge">{selectedIds.size}</span>
            <span>selected</span>
            <button className="jira-btn-clear-selection" onClick={() => setSelectedIds(new Set())} title="Deselect all">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="jira-bulk-actions-group">
            <button
              className="jira-btn-bulk-action"
              onClick={handleBulkMoveToTop}
              title="Prioritize issues to Critical"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              <span>Move to top</span>
            </button>

            <button
              className="jira-btn-bulk-action"
              onClick={handleBulkMerge}
              title="Merge selected issues into one"
            >
              <MergeIcon size={13} />
              <span>Merge</span>
            </button>

            <button
              className="jira-btn-bulk-action"
              onClick={handleBulkArchive}
              title="Archive selected issues"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              <span>Archive</span>
            </button>

            <div className="jira-bulk-select-wrap">
              <select
                className="jira-select-sm"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handleBulkStatus(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>Change Status...</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <button
              className="jira-btn-bulk-action danger"
              onClick={handleBulkDelete}
              title="Delete selected issues"
            >
              <TrashIcon size={13} color="currentColor" />
              <span>Delete ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Issue Drawer / Modal */}
      {selectedIssueId && (
        <IssueModal
          issueId={selectedIssueId}
          projectKey={project?.key}
          members={project?.members || members || []}
          currentUser={currentUser}
          isViewer={isViewer}
          onClose={() => setSelectedIssueId(null)}
          onUpdate={onRefresh}
        />
      )}

      {/* Ask AI Copilot Modal */}
      {showAskAI && (
        <AskAIModal
          isOpen={showAskAI}
          onClose={() => setShowAskAI(false)}
          issues={issues}
          projectName={project?.name}
        />
      )}
    </div>
  );
}

