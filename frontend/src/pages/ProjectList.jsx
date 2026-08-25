import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Navbar from "../components/Navbar";
import CreateProjectModal from "../components/CreateProjectModal";

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [searchVal, setSearchVal] = useState("");
  const [showModal, setShowModal] = useState(false);

  function loadProjects() {
    api.get("/projects/").then((res) => setProjects(res.data)).catch(() => {});
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchVal.toLowerCase()) ||
      p.key.toLowerCase().includes(searchVal.toLowerCase())
  );

  return (
    <div className="jira-app-shell">
      <Navbar searchVal={searchVal} onSearchChange={setSearchVal} onRefresh={loadProjects} />

      <main className="jira-workspace-main" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Projects Title Header */}
        <div className="jira-projects-page-header">
          <div>
            <h1 className="jira-projects-title">Projects</h1>
            <p className="jira-projects-desc">
              Manage your teams, view sprint boards, issues, and lists.
            </p>
          </div>
          <button className="jira-btn-primary" onClick={() => setShowModal(true)}>
            + Create project
          </button>
        </div>

        {/* Projects Cards Grid */}
        <div className="jira-projects-grid">
          {filteredProjects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}/board`} className="jira-project-card">
              <div className="jira-project-card-top">
                <div className="jira-project-icon-box">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="4" fill="#0052cc"/>
                    <circle cx="7" cy="7" r="3" fill="#ffab00"/>
                    <circle cx="17" cy="7" r="3" fill="#36b37e"/>
                    <circle cx="7" cy="17" r="3" fill="#ff5630"/>
                    <circle cx="17" cy="17" r="3" fill="#6554c0"/>
                  </svg>
                </div>
                <span className="jira-project-key-tag">{p.key}</span>
              </div>

              <h2 className="jira-project-card-name">{p.name}</h2>
              <p className="jira-project-card-sub">
                {p.description || "Software workspace • Kanban & List tracking"}
              </p>

              <div className="jira-project-card-bottom">
                <span className="jira-members-badge-num">
                  👥 {p.members?.length || 1} {p.members?.length === 1 ? "member" : "members"}
                </span>
                <span className="jira-project-open-link">
                  Open Project →
                </span>
              </div>
            </Link>
          ))}

          {filteredProjects.length === 0 && (
            <div className="jira-empty-projects-card">
              <div className="jira-project-icon-large">📂</div>
              <h3>No projects found</h3>
              <p>{searchVal ? "No project matching your search query." : "Get started by creating your first project workspace."}</p>
              {!searchVal && (
                <button className="jira-btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 16 }}>
                  + Create your first project
                </button>
              )}
            </div>
          )}
        </div>

        <CreateProjectModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onProjectCreated={loadProjects}
        />
      </main>
    </div>
  );
}
