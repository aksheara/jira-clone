import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

// ── Pie chart — pure SVG, no dependencies ──
function PieChart({ data }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (!total) return <div className="db-pie-empty">No issues yet</div>;

  const COLORS = {
    TASK:  "#0052CC",
    BUG:   "#DE350B",
    STORY: "#00875A",
    EPIC:  "#6554C0",
  };

  let cumAngle = -90; // start from top
  const slices = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([type, count]) => {
      const pct = count / total;
      const startAngle = cumAngle;
      cumAngle += pct * 360;
      return { type, count, pct, startAngle, endAngle: cumAngle };
    });

  function polarToXY(angleDeg, r = 80) {
    const rad = (angleDeg * Math.PI) / 180;
    return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)];
  }

  function describeArc(startAngle, endAngle) {
    const fullCircle = endAngle - startAngle >= 359.99;
    if (fullCircle) {
      return `M ${100 + 80} 100 A 80 80 0 1 1 ${100 + 80 - 0.01} 100 Z`;
    }
    const [sx, sy] = polarToXY(startAngle);
    const [ex, ey] = polarToXY(endAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M 100 100 L ${sx} ${sy} A 80 80 0 ${large} 1 ${ex} ${ey} Z`;
  }

  return (
    <div className="db-pie-wrap">
      <svg viewBox="0 0 200 200" className="db-pie-svg">
        {slices.map((s) => (
          <path
            key={s.type}
            d={describeArc(s.startAngle, s.endAngle)}
            fill={COLORS[s.type]}
            opacity="0.9"
          />
        ))}
        {/* Centre hole for donut effect */}
        <circle cx="100" cy="100" r="48" fill="#FFFFFF" />
        <text x="100" y="96" textAnchor="middle" fontSize="22" fontWeight="800" fill="#172B4D">{total}</text>
        <text x="100" y="113" textAnchor="middle" fontSize="11" fill="#6B778C">issues</text>
      </svg>
      <div className="db-pie-legend">
        {slices.map((s) => (
          <div key={s.type} className="db-pie-legend-row">
            <span className="db-pie-dot" style={{ background: COLORS[s.type] }} />
            <span className="db-pie-legend-label">{s.type}</span>
            <span className="db-pie-legend-count">{s.count}</span>
            <span className="db-pie-legend-pct">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Priority badge ──
const PRIORITY_COLOR = { CRITICAL: "#DE350B", HIGH: "#FF5630", MEDIUM: "#FFAB00", LOW: "#36B37E" };
function PriBadge({ p }) {
  return (
    <span style={{
      display: "inline-block",
      width: 8, height: 8, borderRadius: "50%",
      background: PRIORITY_COLOR[p] || "#97A0AF",
      flexShrink: 0,
    }} title={p} />
  );
}

// ── Status pill ──
function StatusPill({ s }) {
  const cls = s === "DONE" ? "jira-status-done" : s === "IN_PROGRESS" ? "jira-status-inprogress" : "jira-status-todo";
  const label = s === "IN_PROGRESS" ? "In Progress" : s === "DONE" ? "Done" : "To Do";
  return <span className={`jira-status-pill ${cls}`} style={{ fontSize: 10, padding: "2px 7px" }}>{label}</span>;
}

// ── Section card wrapper ──
function Card({ title, icon, count, children, style }) {
  return (
    <div className="db-card" style={style}>
      <div className="db-card-header">
        <span className="db-card-icon">{icon}</span>
        <h3 className="db-card-title">{title}</h3>
        {count !== undefined && <span className="db-card-badge">{count}</span>}
      </div>
      <div className="db-card-body">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/auth/dashboard/")
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  const totalAssigned = data
    ? Object.values(data.assigned_by_status).reduce((s, arr) => s + arr.length, 0)
    : 0;

  return (
    <div className="jira-app-shell">
      <Navbar />
      <main className="jira-workspace-main" style={{ background: "#F0F2F5", minHeight: "100vh" }}>

        {/* ── Page Header ── */}
        <div className="db-page-header">
          <div>
            <h1 className="db-page-title">
              My Dashboard
            </h1>
            <p className="db-page-subtitle">
              Welcome back, <strong>{user?.username}</strong> — here's your workspace at a glance.
            </p>
          </div>
          <Link to="/projects" className="jira-btn-primary-sm" style={{ textDecoration: "none", padding: "8px 18px" }}>
            View all projects
          </Link>
        </div>

        {loading && (
          <div className="db-loading">
            <div className="db-spinner" />
            Loading dashboard…
          </div>
        )}

        {error && (
          <div className="jira-auth-alert-error" style={{ margin: "24px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div className="jira-auth-alert-msg">{error}</div>
          </div>
        )}

        {data && (
          <div className="db-grid">

            {/* ── 1. Assigned Issues by Status ── */}
            <Card
              title="My Assigned Issues"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
              count={totalAssigned}
              style={{ gridColumn: "span 2" }}
            >
              {totalAssigned === 0 ? (
                <p className="db-empty">No issues assigned to you.</p>
              ) : (
                <div className="db-status-cols">
                  {[
                    { key: "TODO", label: "To Do", color: "#42526E" },
                    { key: "IN_PROGRESS", label: "In Progress", color: "#0052CC" },
                    { key: "DONE", label: "Done", color: "#00875A" },
                  ].map(({ key, label, color }) => (
                    <div key={key} className="db-status-col">
                      <div className="db-status-col-header" style={{ borderTopColor: color }}>
                        <span style={{ color }}>{label}</span>
                        <span className="db-card-badge">{data.assigned_by_status[key]?.length || 0}</span>
                      </div>
                      <div className="db-status-col-issues">
                        {(data.assigned_by_status[key] || []).length === 0 && (
                          <p className="db-empty" style={{ fontSize: 12 }}>None</p>
                        )}
                        {(data.assigned_by_status[key] || []).map((issue) => (
                          <div
                            key={issue.id}
                            className="db-issue-row"
                            onClick={() => navigate(`/projects/${issue.project_id}/board?issue=${issue.id}`)}
                            title="Click to open issue"
                          >
                            <PriBadge p={issue.priority} />
                            <span className="db-issue-key">{issue.project_key}-{issue.id}</span>
                            <span className="db-issue-title">{issue.title}</span>
                            {issue.due_date && (
                              <span className={`db-due ${new Date(issue.due_date) < new Date() ? "overdue" : ""}`}>
                                {new Date(issue.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ── 2. My Projects ── */}
            <Card
              title="My Projects"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
              count={data.my_projects.length}
            >
              {data.my_projects.length === 0 ? (
                <p className="db-empty">No projects yet.</p>
              ) : (
                <div className="db-project-list">
                  {data.my_projects.map((p) => {
                    const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                    return (
                      <div
                        key={p.id}
                        className="db-project-row"
                        onClick={() => navigate(`/projects/${p.id}/board`)}
                      >
                        <div className="db-project-avatar">{p.key.substring(0, 2)}</div>
                        <div className="db-project-info">
                          <span className="db-project-name">{p.name}</span>
                          <div className="db-project-bar-wrap">
                            <div className="db-project-bar">
                              <div className="db-project-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="db-project-bar-label">{pct}%</span>
                          </div>
                        </div>
                        <div className="db-project-counts">
                          <span className="db-count-open">{p.open} open</span>
                          <span className="db-count-done">{p.done} done</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* ── 3. Active Sprint Progress ── */}
            <Card
              title="Active Sprints"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
              count={data.active_sprints.length}
            >
              {data.active_sprints.length === 0 ? (
                <p className="db-empty">No active sprints.</p>
              ) : (
                <div className="db-sprint-list">
                  {data.active_sprints.map((s) => (
                    <div key={s.id} className="db-sprint-row" onClick={() => navigate(`/projects/${s.project_id}/board`)}>
                      <div className="db-sprint-header-row">
                        <span className="db-sprint-name">{s.name}</span>
                        <span className="db-sprint-project">{s.project_name}</span>
                        <span className="db-sprint-pct">{s.percent}%</span>
                      </div>
                      {s.goal && <p className="db-sprint-goal">{s.goal}</p>}
                      <div className="db-sprint-bar">
                        <div
                          className="db-sprint-bar-fill"
                          style={{ width: `${s.percent}%` }}
                        />
                      </div>
                      <div className="db-sprint-counts">
                        <span className="db-sc todo">{s.todo} to do</span>
                        <span className="db-sc inprogress">{s.in_progress} in progress</span>
                        <span className="db-sc done">{s.done} done</span>
                        <span className="db-sc total">{s.total} total</span>
                      </div>
                      {s.end_date && (
                        <span className="db-sprint-end">
                          Ends {new Date(s.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ── 4. Issues by Type (Pie Chart) ── */}
            <Card
              title="Issues by Type"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>}
            >
              <PieChart data={data.issue_type_counts} />
            </Card>

            {/* ── 5. Recent Activity ── */}
            <Card
              title="Recent Activity"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
              count={data.recent_activity.length}
              style={{ gridColumn: "span 2" }}
            >
              {data.recent_activity.length === 0 ? (
                <p className="db-empty">No activity yet.</p>
              ) : (
                <div className="db-activity-list">
                  {data.recent_activity.map((a) => (
                    <div
                      key={a.id}
                      className="db-activity-row"
                      onClick={() => navigate(`/projects/${a.project_id}/board?issue=${a.issue_id}`)}
                    >
                      <div className="db-activity-avatar">{a.actor.substring(0, 2).toUpperCase()}</div>
                      <div className="db-activity-content">
                        <span className="db-activity-text">
                          <strong>{a.actor}</strong> changed <em>{a.field_changed}</em> from{" "}
                          <code className="db-code">{a.old_value || "—"}</code> to{" "}
                          <code className="db-code">{a.new_value || "—"}</code>{" "}
                          on <span className="db-activity-issue">{a.project_key}-{a.issue_id}</span>
                        </span>
                        <span className="db-activity-title">{a.issue_title}</span>
                      </div>
                      <span className="db-activity-time">
                        {new Date(a.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ── 6. Unread Notifications ── */}
            <Card
              title="Notifications"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
              count={data.unread_notifications.count}
            >
              {data.unread_notifications.count === 0 ? (
                <div className="db-notif-empty">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#36B37E" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>All caught up!</span>
                </div>
              ) : (
                <div className="db-notif-list">
                  {data.unread_notifications.items.map((n) => (
                    <div key={n.id} className="db-notif-row">
                      <div className="db-notif-avatar">{n.actor.substring(0, 2).toUpperCase()}</div>
                      <div className="db-notif-content">
                        <span className="db-notif-text">
                          <strong>{n.actor}</strong> {n.action}
                        </span>
                        {n.target && <span className="db-notif-target">{n.target}</span>}
                        <span className="db-notif-time">
                          {new Date(n.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <span className="db-notif-dot" />
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>
        )}
      </main>
    </div>
  );
}
