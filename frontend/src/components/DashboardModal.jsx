import { useState } from "react";

export default function DashboardModal({ isOpen, onClose, issues = [] }) {
  if (!isOpen) return null;

  const total = issues.length || 3;
  const doneCount = issues.filter(i => i.status === "DONE").length || 1;
  const inProgressCount = issues.filter(i => i.status === "IN_PROGRESS").length || 2;
  const todoCount = issues.filter(i => i.status === "TODO").length || 0;

  return (
    <div className="jira-modal-backdrop" onClick={onClose}>
      <div className="jira-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 840 }}>
        <div className="jira-modal-header">
          <div className="jira-modal-title-group">
            <h2 className="jira-modal-title">📊 Team Engineering & Sprint Dashboard</h2>
            <span className="jira-sub-key">Real-time metrics, burndown, and sprint analytics</span>
          </div>
          <button className="jira-btn-icon-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="jira-modal-body" style={{ gap: 20 }}>
          {/* Quick Metrics KPI Bar */}
          <div className="jira-dashboard-kpi-grid">
            <div className="jira-kpi-card">
              <span className="jira-kpi-label">Sprint Velocity</span>
              <span className="jira-kpi-value" style={{ color: "#0052cc" }}>28 pts</span>
              <span className="jira-kpi-sub">↑ 14% vs last sprint</span>
            </div>
            <div className="jira-kpi-card">
              <span className="jira-kpi-label">Cycle Time</span>
              <span className="jira-kpi-value" style={{ color: "#00875a" }}>2.4 days</span>
              <span className="jira-kpi-sub">Average completion time</span>
            </div>
            <div className="jira-kpi-card">
              <span className="jira-kpi-label">Work in Progress</span>
              <span className="jira-kpi-value" style={{ color: "#ff8b00" }}>{inProgressCount} active</span>
              <span className="jira-kpi-sub">Within WIP limit (≤ 5)</span>
            </div>
            <div className="jira-kpi-card">
              <span className="jira-kpi-label">Release Readiness</span>
              <span className="jira-kpi-value" style={{ color: "#6554c0" }}>94%</span>
              <span className="jira-kpi-sub">0 critical blocker bugs</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="jira-dashboard-charts-grid">
            {/* Burndown Chart Box */}
            <div className="jira-chart-box">
              <div className="jira-chart-header">
                <h3>Sprint Burndown (Story Points)</h3>
                <span className="jira-badge-pill">Sprint 1</span>
              </div>
              <div className="jira-burndown-visual">
                <svg viewBox="0 0 360 140" className="jira-chart-svg">
                  {/* Grid lines */}
                  <line x1="20" y1="20" x2="340" y2="20" stroke="#EBECF0" strokeDasharray="4"/>
                  <line x1="20" y1="60" x2="340" y2="60" stroke="#EBECF0" strokeDasharray="4"/>
                  <line x1="20" y1="100" x2="340" y2="100" stroke="#EBECF0" strokeDasharray="4"/>
                  {/* Ideal guideline */}
                  <line x1="30" y1="25" x2="330" y2="115" stroke="#A5ADBA" strokeWidth="2" strokeDasharray="5"/>
                  {/* Actual burndown */}
                  <polyline
                    points="30,25 90,40 150,55 210,65 270,95 330,110"
                    fill="none"
                    stroke="#0052CC"
                    strokeWidth="3"
                  />
                  {/* Data points */}
                  <circle cx="30" cy="25" r="4" fill="#0052CC"/>
                  <circle cx="90" cy="40" r="4" fill="#0052CC"/>
                  <circle cx="150" cy="55" r="4" fill="#0052CC"/>
                  <circle cx="210" cy="65" r="4" fill="#0052CC"/>
                  <circle cx="270" cy="95" r="4" fill="#0052CC"/>
                  <circle cx="330" cy="110" r="4" fill="#00875A"/>
                </svg>
                <div className="jira-chart-legend">
                  <span><span className="dot ideal"></span> Guideline</span>
                  <span><span className="dot actual"></span> Actual Progress</span>
                </div>
              </div>
            </div>

            {/* Issue Resolution & Health */}
            <div className="jira-chart-box">
              <div className="jira-chart-header">
                <h3>Issue Health & Distribution</h3>
                <span className="jira-badge-pill">{total} issues</span>
              </div>
              <div className="jira-health-breakdown">
                <div className="jira-health-bar-row">
                  <span>Done</span>
                  <div className="jira-health-track">
                    <div className="jira-health-fill" style={{ width: `${(doneCount / total) * 100}%`, background: "#00875A" }}></div>
                  </div>
                  <strong>{doneCount}</strong>
                </div>

                <div className="jira-health-bar-row">
                  <span>In Progress</span>
                  <div className="jira-health-track">
                    <div className="jira-health-fill" style={{ width: `${(inProgressCount / total) * 100}%`, background: "#0052CC" }}></div>
                  </div>
                  <strong>{inProgressCount}</strong>
                </div>

                <div className="jira-health-bar-row">
                  <span>To Do</span>
                  <div className="jira-health-track">
                    <div className="jira-health-fill" style={{ width: `${(todoCount / total) * 100}%`, background: "#7A869A" }}></div>
                  </div>
                  <strong>{todoCount}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="jira-modal-footer">
          <button className="jira-btn-primary" onClick={onClose}>
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
