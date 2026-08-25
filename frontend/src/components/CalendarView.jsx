import { useState } from "react";
import api from "../api/client";

export default function CalendarView({ issues = [], onSelectIssue, onRefresh }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = [];
  // Empty padding cells for start of month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, key: `pad-${i}` });
  }
  for (let day = 1; day <= totalDaysInMonth; day++) {
    calendarCells.push({ day, key: `day-${day}` });
  }

  function handlePrevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function handleNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  return (
    <div className="jira-calendar-container">
      <div className="jira-calendar-header">
        <div className="jira-cal-title-wrap">
          <h2 className="jira-cal-month">{monthName} {year}</h2>
          <span className="jira-cal-badge">Live Due Dates</span>
        </div>
        <div className="jira-cal-controls">
          <button className="jira-btn-secondary-sm" onClick={handlePrevMonth}>‹</button>
          <button className="jira-btn-secondary-sm" onClick={handleToday}>Today</button>
          <button className="jira-btn-secondary-sm" onClick={handleNextMonth}>›</button>
        </div>
      </div>

      <div className="jira-calendar-grid">
        <div className="jira-cal-weekdays">
          {days.map((d) => (
            <div key={d} className="jira-cal-weekday-cell">{d}</div>
          ))}
        </div>

        <div className="jira-cal-days-grid">
          {calendarCells.map((cell) => {
            if (!cell.day) {
              return <div key={cell.key} className="jira-cal-day-cell empty" />;
            }

            // Find real issues due on this specific date in database
            const dayIssues = issues.filter((i) => {
              if (!i.due_date) return false;
              const d = new Date(i.due_date);
              return d.getFullYear() === year && d.getMonth() === month && d.getDate() === cell.day;
            });

            const isToday =
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === cell.day;

            return (
              <div key={cell.key} className={`jira-cal-day-cell ${isToday ? "today" : ""}`}>
                <div className="jira-cal-day-number" style={isToday ? { background: "var(--jira-blue)", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center" } : {}}>
                  {cell.day}
                </div>
                <div className="jira-cal-day-events">
                  {dayIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`jira-cal-event-pill status-${issue.status.toLowerCase().replace("_", "")}`}
                      onClick={() => onSelectIssue && onSelectIssue(issue.id)}
                      title={`[${issue.status}] ${issue.title}`}
                    >
                      <span style={{ fontWeight: 700, marginRight: 4 }}>
                        {issue.issue_type === "BUG" ? "🐞" : "📋"}
                      </span>
                      {issue.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
