import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import CreateIssueModal from "./CreateIssueModal";
import CreateProjectModal from "./CreateProjectModal";
import NotificationsModal from "./NotificationsModal";
import DashboardModal from "./DashboardModal";
import MarketplaceModal from "./MarketplaceModal";
import TeamsModal from "./TeamsModal";
import SettingsModal from "./SettingsModal";

export default function Navbar({
  searchVal = "",
  onSearchChange = null,
  currentProjectId = null,
  onRefresh = null,
  onApplyFilter = null,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null); // 'projects', 'filters', 'dashboards', 'teams', 'apps', 'user', 'notifications'
  
  // Modals state
  const [showCreateIssueModal, setShowCreateIssueModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [projectSearch, setProjectSearch] = useState("");

  const menuRef = useRef(null);

  function loadProjects() {
    api.get("/projects/").then((res) => setProjects(res.data)).catch(() => {});
  }

  useEffect(() => {
    loadProjects();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleMenu(name) {
    setActiveMenu((prev) => (prev === name ? null : name));
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleSelectFilter(filterType) {
    setActiveMenu(null);
    if (onApplyFilter) {
      onApplyFilter(filterType);
    }
  }

  const userInitials = user?.username ? user.username.substring(0, 2).toUpperCase() : "U";
  const userFullName = user?.username || "Workspace User";

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.key.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <>
      <header className="jira-global-topbar" ref={menuRef}>
        <div className="jira-topbar-left">
          {/* Jira Agent Brand Logo */}
          <Link to="/projects" className="jira-topbar-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M11.53 2.3A1.85 1.85 0 0 0 8.92 2.3L2.3 8.92A1.85 1.85 0 0 0 2.3 11.53L8.92 18.15C9.64 18.87 10.81 18.87 11.53 18.15L18.15 11.53A1.85 1.85 0 0 0 18.15 8.92L11.53 2.3Z" fill="#0052CC"/>
              <path opacity="0.75" d="M17.53 8.3A1.85 1.85 0 0 0 14.92 8.3L8.3 14.92A1.85 1.85 0 0 0 8.3 17.53L14.92 24.15C15.64 24.87 16.81 24.87 17.53 24.15L24.15 17.53A1.85 1.85 0 0 0 24.15 14.92L17.53 8.3Z" fill="#2684FF"/>
            </svg>
            <div className="jira-brand-title-wrap">
              <span className="jira-brand-title">Jira</span>
              <span className="jira-brand-agent-badge">Agent</span>
            </div>
          </Link>

          {/* Navigation Dropdown Menus */}
          <nav className="jira-topbar-nav">
            {/* 1. PROJECTS DROPDOWN */}
            <div className="jira-nav-dropdown-wrap">
              <button
                className={`jira-nav-link ${activeMenu === "projects" ? "active" : ""}`}
                onClick={() => toggleMenu("projects")}
              >
                <span>Projects</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {activeMenu === "projects" && (
                <div className="jira-nav-popover">
                  <div className="jira-popover-search-wrap">
                    <input
                      type="text"
                      className="jira-input-sm"
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="jira-popover-header">RECENT PROJECTS</div>
                  <div className="jira-popover-list">
                    {filteredProjects.map((p) => (
                      <Link
                        key={p.id}
                        to={`/projects/${p.id}/board`}
                        className="jira-popover-item"
                        onClick={() => setActiveMenu(null)}
                      >
                        <span className="jira-project-dot"></span>
                        <div>
                          <div className="jira-popover-item-title">{p.name}</div>
                          <div className="jira-popover-item-sub">{p.key} • Software project</div>
                        </div>
                      </Link>
                    ))}
                    {filteredProjects.length === 0 && (
                      <div className="jira-empty-muted">No projects found.</div>
                    )}
                  </div>
                  <div className="jira-popover-footer">
                    <button
                      className="jira-popover-btn-action"
                      onClick={() => {
                        setActiveMenu(null);
                        setShowCreateProjectModal(true);
                      }}
                    >
                      + Create project
                    </button>
                    <Link
                      to="/projects"
                      className="jira-popover-btn-link"
                      onClick={() => setActiveMenu(null)}
                    >
                      View all projects
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 2. FILTERS DROPDOWN */}
            <div className="jira-nav-dropdown-wrap">
              <button
                className={`jira-nav-link ${activeMenu === "filters" ? "active" : ""}`}
                onClick={() => toggleMenu("filters")}
              >
                <span>Filters</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {activeMenu === "filters" && (
                <div className="jira-nav-popover" style={{ width: 280 }}>
                  <div className="jira-popover-header">DEFAULT FILTERS</div>
                  <div className="jira-popover-list">
                    <button
                      className="jira-popover-item-btn"
                      onClick={() => handleSelectFilter("MY_OPEN_ISSUES")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <div>
                        <div className="jira-popover-item-title">My open issues</div>
                        <div className="jira-popover-item-sub">Issues assigned to you</div>
                      </div>
                    </button>

                    <button
                      className="jira-popover-item-btn"
                      onClick={() => handleSelectFilter("REPORTED_BY_ME")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      <div>
                        <div className="jira-popover-item-title">Reported by me</div>
                        <div className="jira-popover-item-sub">Issues created by you</div>
                      </div>
                    </button>

                    <button
                      className="jira-popover-item-btn"
                      onClick={() => handleSelectFilter("DONE_ISSUES")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      <div>
                        <div className="jira-popover-item-title">All completed issues</div>
                        <div className="jira-popover-item-sub">Status is Done</div>
                      </div>
                    </button>

                    <button
                      className="jira-popover-item-btn"
                      onClick={() => handleSelectFilter("CRITICAL_ISSUES")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DE350B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <div>
                        <div className="jira-popover-item-title">High & Critical blockers</div>
                        <div className="jira-popover-item-sub">Urgent priority items</div>
                      </div>
                    </button>
                  </div>
                  <div className="jira-popover-footer">
                    <button
                      className="jira-popover-btn-action"
                      onClick={() => handleSelectFilter("CLEAR")}
                    >
                      Reset / Clear active filter
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. DASHBOARD — dropdown listing all projects */}
            <div className="jira-nav-dropdown-wrap">
              <button
                className={`jira-nav-link ${activeMenu === "dashboards" ? "active" : ""}`}
                onClick={() => toggleMenu("dashboards")}
              >
                <span>Dashboards</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {activeMenu === "dashboards" && (
                <div className="jira-nav-popover" style={{ width: 280 }}>
                  <div className="jira-popover-header">PROJECT DASHBOARDS</div>
                  <div className="jira-popover-list">
                    {filteredProjects.map((p) => (
                      <Link
                        key={p.id}
                        to={`/dashboard?project=${p.id}`}
                        className="jira-popover-item"
                        onClick={() => setActiveMenu(null)}
                      >
                        <div className="jira-project-dot" style={{ background: "#0052CC" }}></div>
                        <div>
                          <div className="jira-popover-item-title">{p.name}</div>
                          <div className="jira-popover-item-sub">{p.key} · Dashboard</div>
                        </div>
                      </Link>
                    ))}
                    {filteredProjects.length === 0 && (
                      <div className="jira-empty-muted">No projects found.</div>
                    )}
                  </div>
                  <div className="jira-popover-footer">
                    <Link
                      to="/dashboard"
                      className="jira-popover-btn-link"
                      onClick={() => setActiveMenu(null)}
                    >
                      View all dashboards
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 4. TEAMS DROPDOWN */}
            <div className="jira-nav-dropdown-wrap">
              <button
                className={`jira-nav-link ${activeMenu === "teams" ? "active" : ""}`}
                onClick={() => toggleMenu("teams")}
              >
                <span>Teams</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {activeMenu === "teams" && (
                <div className="jira-nav-popover" style={{ width: 280 }}>
                  <div className="jira-popover-header">YOUR TEAMS</div>
                  <div className="jira-popover-list">
                    <button
                      className="jira-popover-item-btn"
                      onClick={() => {
                        setActiveMenu(null);
                        setShowTeamsModal(true);
                      }}
                    >
                      <span className="jira-project-dot" style={{ background: "#6554c0" }} />
                      <div>
                        <div className="jira-popover-item-title">My Data Science Team</div>
                        <div className="jira-popover-item-sub">Lead: {userFullName}</div>
                      </div>
                    </button>

                    <button
                      className="jira-popover-item-btn"
                      onClick={() => {
                        setActiveMenu(null);
                        setShowTeamsModal(true);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      <div>
                        <div className="jira-popover-item-title">Frontend Core Engineers</div>
                        <div className="jira-popover-item-sub">UI & Design System</div>
                      </div>
                    </button>
                  </div>
                  <div className="jira-popover-footer">
                    <button
                      className="jira-popover-btn-action"
                      onClick={() => {
                        setActiveMenu(null);
                        setShowTeamsModal(true);
                      }}
                    >
                      + Create a team / View all
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. APPS DROPDOWN */}
            <div className="jira-nav-dropdown-wrap">
              <button
                className={`jira-nav-link ${activeMenu === "apps" ? "active" : ""}`}
                onClick={() => toggleMenu("apps")}
              >
                <span>Apps</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {activeMenu === "apps" && (
                <div className="jira-nav-popover" style={{ width: 280 }}>
                  <div className="jira-popover-header">CONNECTED INTEGRATIONS</div>
                  <div className="jira-popover-list">
                    <button
                      className="jira-popover-item-btn"
                      onClick={() => { setActiveMenu(null); setShowMarketplaceModal(true); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>
                      <div>
                        <div className="jira-popover-item-title">GitHub for Jira</div>
                        <div className="jira-popover-item-sub">Connected</div>
                      </div>
                    </button>

                    <button
                      className="jira-popover-item-btn"
                      onClick={() => { setActiveMenu(null); setShowMarketplaceModal(true); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <div>
                        <div className="jira-popover-item-title">Slack Integration</div>
                        <div className="jira-popover-item-sub">Connected</div>
                      </div>
                    </button>

                    <button
                      className="jira-popover-item-btn"
                      onClick={() => { setActiveMenu(null); setShowMarketplaceModal(true); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg>
                      <div>
                        <div className="jira-popover-item-title">Figma for Jira</div>
                        <div className="jira-popover-item-sub">Available</div>
                      </div>
                    </button>
                  </div>
                  <div className="jira-popover-footer">
                    <button
                      className="jira-popover-btn-action"
                      onClick={() => {
                        setActiveMenu(null);
                        setShowMarketplaceModal(true);
                      }}
                    >
                      Explore Atlassian Marketplace →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Blue solid + Create button */}
            <button
              className="jira-btn-topbar-create"
              onClick={() => setShowCreateIssueModal(true)}
            >
              <span style={{ fontSize: 16, marginRight: 4, lineHeight: 1 }}>+</span>
              <span>Create</span>
            </button>
          </nav>
        </div>

        {/* Topbar Right Icons & Profile */}
        <div className="jira-topbar-right">
          {/* Search Box */}
          <div className="jira-topbar-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={searchVal}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="jira-topbar-search-input"
            />
          </div>

          {/* Notifications Bell */}
          <div className="jira-nav-dropdown-wrap">
            <button
              className={`jira-btn-top-icon ${activeMenu === "notifications" ? "active" : ""}`}
              title="Notifications"
              onClick={() => toggleMenu("notifications")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="jira-notif-indicator-dot"></span>
            </button>

            <NotificationsModal
              isOpen={activeMenu === "notifications"}
              onClose={() => setActiveMenu(null)}
            />
          </div>

          {/* Help icon */}
          <button
            className="jira-btn-top-icon"
            title="Help & Shortcuts"
            onClick={() => setShowHelpModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>

          {/* Settings Gear */}
          <button
            className="jira-btn-top-icon"
            title="Settings"
            onClick={() => setShowSettingsModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* User Profile Avatar with dropdown */}
          <div className="jira-user-menu-wrap">
            <button
              className="jira-avatar-badge-ar topbar"
              onClick={() => toggleMenu("user")}
              title={userFullName}
            >
              {userInitials}
            </button>

            {activeMenu === "user" && (
              <div className="jira-user-dropdown-popover">
                <div className="jira-user-popover-info">
                  <div className="jira-avatar-badge-ar large">{userInitials}</div>
                  <div>
                    <div className="jira-user-popover-name">{userFullName}</div>
                    <div className="jira-user-popover-email">{user?.email || "Workspace User"}</div>
                  </div>
                </div>
                <div className="jira-popover-divider"></div>
                <button
                  className="jira-user-popover-action"
                  onClick={() => { setActiveMenu(null); setShowCreateProjectModal(true); }}
                >
                  + Create new project
                </button>
                <Link to="/projects" className="jira-user-popover-action" onClick={() => setActiveMenu(null)}>
                  All projects
                </Link>
                <button
                  className="jira-user-popover-action"
                  onClick={() => { setActiveMenu(null); setShowSettingsModal(true); }}
                >
                  Preferences & Settings
                </button>
                <div className="jira-popover-divider"></div>
                <button className="jira-user-popover-action danger" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Interactive Modals */}
      <CreateIssueModal
        isOpen={showCreateIssueModal}
        onClose={() => setShowCreateIssueModal(false)}
        onIssueCreated={() => {
          onRefresh && onRefresh();
          loadProjects();
        }}
        currentProjectId={currentProjectId}
        projects={projects}
      />

      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onProjectCreated={(newProj) => {
          loadProjects();
          navigate(`/projects/${newProj.id}/board`);
        }}
      />

      <DashboardModal
        isOpen={showDashboardModal}
        onClose={() => setShowDashboardModal(false)}
      />

      <MarketplaceModal
        isOpen={showMarketplaceModal}
        onClose={() => setShowMarketplaceModal(false)}
      />

      <TeamsModal
        isOpen={showTeamsModal}
        onClose={() => setShowTeamsModal(false)}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Help Modal */}
      {showHelpModal && (
        <div className="jira-modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="jira-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="jira-modal-header">
              <h2 className="jira-modal-title">Keyboard Shortcuts & Help</h2>
              <button className="jira-btn-icon-close" onClick={() => setShowHelpModal(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="jira-modal-body">
              <div className="jira-shortcuts-grid">
                <div className="jira-shortcut-row"><kbd>C</kbd><span>Create new issue</span></div>
                <div className="jira-shortcut-row"><kbd>/</kbd><span>Quick search work</span></div>
                <div className="jira-shortcut-row"><kbd>Esc</kbd><span>Close modals and drawers</span></div>
                <div className="jira-shortcut-row"><kbd>Enter</kbd><span>Submit inline task creation</span></div>
              </div>
            </div>
            <div className="jira-modal-footer">
              <button className="jira-btn-primary" onClick={() => setShowHelpModal(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
