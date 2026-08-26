import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ListView from "../components/ListView";
import SummaryView from "../components/SummaryView";
import CalendarView from "../components/CalendarView";
import DocsView from "../components/DocsView";
import BacklogView from "../components/BacklogView";
import IssueModal from "../components/IssueModal";
import ProjectMembersModal from "../components/ProjectMembersModal";
import CreateIssueModal from "../components/CreateIssueModal";
import ShareProjectModal from "../components/ShareProjectModal";
import AutomationModal from "../components/AutomationModal";
import ExportViewModal from "../components/ExportViewModal";

const KANBAN_COLUMNS = [
  { key: "TODO", label: "TO DO", color: "#42526E" },
  { key: "IN_PROGRESS", label: "IN PROGRESS", color: "#0052CC" },
  { key: "DONE", label: "DONE", color: "#00875A" },
];

export default function Board() {
  const { projectId } = useParams();
  const { user } = useAuth();

  const [projectDetails, setProjectDetails] = useState(null);
  const [issues, setIssues] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState("list"); // 'list', 'summary', 'board', 'calendar', 'docs'
  const [searchVal, setSearchVal] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [quickAddCol, setQuickAddCol] = useState(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [allProjects, setAllProjects] = useState([]);

  function loadProjectData() {
    api.get(`/projects/${projectId}/`)
      .then((res) => {
        setProjectDetails(res.data);
        setMembers(res.data.members || []);
      })
      .catch(() => {});

    api.get("/projects/")
      .then((res) => setAllProjects(res.data))
      .catch(() => {});
  }

  function loadIssues() {
    api.get(`/issues/?project=${projectId}`)
      .then((res) => setIssues(res.data))
      .catch(() => {});
  }

  useEffect(() => {
    loadProjectData();
    loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    setIssues((prev) =>
      prev.map((i) => (i.id === Number(draggableId) ? { ...i, status: destination.droppableId } : i))
    );
    await api.patch(`/issues/${draggableId}/`, { status: destination.droppableId });
  }

  async function handleQuickAdd(columnKey, e) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    await api.post("/issues/", {
      project: projectId,
      title: quickTitle.trim(),
      status: columnKey,
      issue_type: "TASK",
      priority: "MEDIUM",
    });
    setQuickTitle("");
    setQuickAddCol(null);
    loadIssues();
  }

  const projectName = projectDetails?.name || "My Data Science Team";
  const projectKey = projectDetails?.key || "KAN";

  return (
    <div className="jira-app-shell">
      {/* Global Atlassian Jira Topbar */}
      <Navbar
        searchVal={searchVal}
        onSearchChange={setSearchVal}
        currentProjectId={projectId}
        onRefresh={loadIssues}
      />

      <main className="jira-workspace-main">
        {/* Project Header Area */}
        <div className="jira-project-header-container">
          {/* Breadcrumb */}
          <div className="jira-breadcrumb-row">
            <Link to="/projects" className="jira-breadcrumb-link">Spaces</Link>
            <span className="jira-breadcrumb-separator">/</span>
            <span className="jira-breadcrumb-current">{projectName}</span>
          </div>

          {/* Project Title and Header Controls */}
          <div className="jira-project-title-row">
            <div className="jira-project-title-left">
              {/* Project Icon (Multicolor Jira Space Badge) */}
              <div className="jira-project-space-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="4" fill="#0052cc"/>
                  <circle cx="7" cy="7" r="3" fill="#ffab00"/>
                  <circle cx="17" cy="7" r="3" fill="#36b37e"/>
                  <circle cx="7" cy="17" r="3" fill="#ff5630"/>
                  <circle cx="17" cy="17" r="3" fill="#6554c0"/>
                </svg>
              </div>

              {/* Project Title Text */}
              <h1 className="jira-project-heading">{projectName}</h1>

              {/* Members Button with Group Icon */}
              <button
                className="jira-btn-members-group"
                onClick={() => setShowMembersModal(true)}
                title="Manage team members & roles"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {members.length > 0 && <span className="jira-members-badge-num">{members.length}</span>}
              </button>

              {/* More options button */}
              <button className="jira-btn-icon-plain" title="Project settings & options">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="19" cy="12" r="2"/>
                </svg>
              </button>
            </div>

            {/* Right Action Icons: Share, Automation, Export, Fullscreen */}
            <div className="jira-project-actions-right">
              {/* Share button */}
              <button
                className="jira-btn-action-icon"
                title="Share project"
                onClick={() => setShowShareModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>

              {/* Automation (Lightning) */}
              <button
                className="jira-btn-action-icon"
                title="Automation rules"
                onClick={() => setShowAutomationModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </button>

              {/* Export / Views icon */}
              <button
                className="jira-btn-action-icon"
                title="Export / View"
                onClick={() => setShowExportModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              </button>

              {/* Fullscreen icon */}
              <button
                className="jira-btn-action-icon"
                title="Fullscreen / Expand"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9"/>
                  <polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/>
                  <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Project View Tabs Bar */}
          <div className="jira-tabs-bar">
            {/* Summary tab */}
            <button
              className={`jira-tab-btn ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>Summary</span>
            </button>

            {/* List tab (active tab matching user image) */}
            <button
              className={`jira-tab-btn ${activeTab === "list" ? "active" : ""}`}
              onClick={() => setActiveTab("list")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="9" x2="9" y2="21"/>
              </svg>
              <span>List</span>
            </button>

            {/* Board tab */}
            <button
              className={`jira-tab-btn ${activeTab === "board" ? "active" : ""}`}
              onClick={() => setActiveTab("board")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="3" width="4" height="18" rx="1"/>
                <rect x="10" y="3" width="4" height="18" rx="1"/>
                <rect x="16" y="3" width="4" height="18" rx="1"/>
              </svg>
              <span>Board</span>
            </button>

            {/* Calendar tab */}
            <button
              className={`jira-tab-btn ${activeTab === "calendar" ? "active" : ""}`}
              onClick={() => setActiveTab("calendar")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Calendar</span>
            </button>

            {/* Docs tab */}
            <button
              className={`jira-tab-btn ${activeTab === "docs" ? "active" : ""}`}
              onClick={() => setActiveTab("docs")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>Docs</span>
            </button>

            {/* Backlog tab */}
            <button
              className={`jira-tab-btn ${activeTab === "backlog" ? "active" : ""}`}
              onClick={() => setActiveTab("backlog")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <span>Backlog</span>
            </button>

            {/* + Add view */}
            <button className="jira-tab-btn-add" title="Add view">
              <span>+</span>
            </button>
          </div>
        </div>

        {/* Tab Content Display Area */}
        <div className="jira-tab-content-wrapper">
          {/* 1. LIST VIEW (Default / Pixel match) */}
          {activeTab === "list" && (
            <ListView
              project={projectDetails}
              issues={issues}
              members={members}
              currentUser={user}
              onSelectIssue={(id) => setSelectedIssueId(id)}
              onRefresh={loadIssues}
            />
          )}

          {/* 2. SUMMARY VIEW */}
          {activeTab === "summary" && (
            <SummaryView
              project={projectDetails}
              issues={issues}
              members={members}
              onSelectIssue={(id) => setSelectedIssueId(id)}
              onCreateIssueTrigger={() => setShowCreateModal(true)}
            />
          )}

          {/* 3. KANBAN BOARD VIEW */}
          {activeTab === "board" && (
            <div className="jira-board-view-container">
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="jira-kanban-board">
                  {KANBAN_COLUMNS.map((col) => {
                    const colIssues = issues.filter((i) => i.status === col.key);
                    return (
                      <Droppable droppableId={col.key} key={col.key}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`jira-kanban-column ${snapshot.isDraggingOver ? "dragging-over" : ""}`}
                          >
                            <div className="jira-column-header">
                              <div className="jira-column-title-group">
                                <span className="jira-column-title">{col.label}</span>
                                <span className="jira-column-count">{colIssues.length}</span>
                              </div>
                            </div>

                            <div className="jira-column-cards-list">
                              {colIssues.map((issue, index) => {
                                const issueKey = `${projectKey}-${issue.id}`;
                                const isSubtask = issue.issue_type === "SUBTASK" || !!issue.parent;
                                return (
                                  <Draggable draggableId={String(issue.id)} index={index} key={issue.id}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        onClick={() => setSelectedIssueId(issue.id)}
                                        className={`jira-card-box ${snapshot.isDragging ? "dragging" : ""}`}
                                        style={provided.draggableProps.style}
                                      >
                                        <div className="jira-card-title">{issue.title}</div>
                                        <div className="jira-card-bottom">
                                          <div className="jira-card-bottom-left">
                                            {isSubtask ? (
                                              <span className="jira-type-icon icon-subtask" style={{ fontSize: 13 }}>↳</span>
                                            ) : (
                                              <span className="jira-type-icon icon-task">☑️</span>
                                            )}
                                            <span className="jira-card-key">{issueKey}</span>
                                            <span className={`jira-card-priority priority-${(issue.priority || "medium").toLowerCase()}`}>
                                              {issue.priority}
                                            </span>
                                          </div>
                                          {issue.assignee ? (
                                            <div className="jira-avatar-circle small" title={issue.assignee.username}>
                                              {issue.assignee.username.substring(0, 2).toUpperCase()}
                                            </div>
                                          ) : (
                                            <div className="jira-unassigned-icon-mini" title="Unassigned">
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8993a4" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                              </svg>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>

                            {/* Quick Add Button / Inline Form */}
                            {quickAddCol === col.key ? (
                              <form onSubmit={(e) => handleQuickAdd(col.key, e)} className="jira-quick-add-form">
                                <input
                                  type="text"
                                  className="jira-input-sm"
                                  placeholder="What needs to be done?"
                                  value={quickTitle}
                                  onChange={(e) => setQuickTitle(e.target.value)}
                                  autoFocus
                                />
                                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                  <button type="submit" className="jira-btn-primary-sm">Add</button>
                                  <button
                                    type="button"
                                    className="jira-btn-secondary-sm"
                                    onClick={() => setQuickAddCol(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                className="jira-btn-column-add"
                                onClick={() => {
                                  setQuickAddCol(col.key);
                                  setQuickTitle("");
                                }}
                              >
                                + Create issue
                              </button>
                            )}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              </DragDropContext>
            </div>
          )}

          {/* 4. CALENDAR VIEW */}
          {activeTab === "calendar" && (
            <CalendarView issues={issues} onSelectIssue={(id) => setSelectedIssueId(id)} />
          )}

          {/* 5. DOCS VIEW */}
          {activeTab === "docs" && (
            <DocsView project={projectDetails} currentUser={user} />
          )}

          {activeTab === "backlog" && (
            <BacklogView
              project={projectDetails}
              issues={issues}
              members={members}
              currentUser={user}
              onRefresh={loadIssues}
            />
          )}
        </div>
      </main>

      {/* Project Members Modal */}
      <ProjectMembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        project={projectDetails}
        onMembersUpdated={(updatedProj) => {
          setProjectDetails(updatedProj);
          setMembers(updatedProj.members || []);
        }}
      />

      {/* Global / Project Create Issue Modal */}
      <CreateIssueModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onIssueCreated={loadIssues}
        currentProjectId={projectId}
        projects={allProjects}
        members={members}
      />

      {/* Issue Detail Drawer / Modal */}
      {selectedIssueId && (
        <IssueModal
          issueId={selectedIssueId}
          projectKey={projectKey}
          members={members}
          onClose={() => setSelectedIssueId(null)}
          onUpdate={loadIssues}
        />
      )}

      {/* Share Project Modal */}
      {showShareModal && (
        <ShareProjectModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          project={projectDetails}
          onMemberAdded={loadProjectData}
        />
      )}

      {/* Automation Rules Modal */}
      {showAutomationModal && (
        <AutomationModal
          isOpen={showAutomationModal}
          onClose={() => setShowAutomationModal(false)}
          projectId={projectId}
          projectName={projectDetails?.name}
        />
      )}

      {/* Export / View Layouts Modal */}
      {showExportModal && (
        <ExportViewModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          project={projectDetails}
          issues={issues}
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
        />
      )}
    </div>
  );
}

