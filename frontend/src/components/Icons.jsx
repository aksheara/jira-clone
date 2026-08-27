/**
 * Centralized SVG icon library — replaces all emojis with professional symbols.
 * All icons are pure SVG, sized consistently, no external deps.
 */

// Issue type icons
export const IssueTypeIcon = ({ type, size = 14 }) => {
  const icons = {
    BUG: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#DE350B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="4"/>
        <path d="M12 9v-2"/>
        <path d="M8.5 9.5L6 7"/>
        <path d="M15.5 9.5L18 7"/>
        <path d="M8 13H4"/>
        <path d="M20 13h-4"/>
        <path d="M8.5 16.5L6 19"/>
        <path d="M15.5 16.5L18 19"/>
      </svg>
    ),
    TASK: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
    STORY: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#00875A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
    EPIC: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6554C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    SUBTASK: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#42526E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    ),
  };
  return icons[type] || icons.TASK;
};

// Priority icons — filled circles with distinct colors
export const PriorityIcon = ({ priority, size = 12 }) => {
  const config = {
    CRITICAL: { color: "#DE350B", label: "Critical" },
    HIGH:     { color: "#FF5630", label: "High" },
    MEDIUM:   { color: "#FFAB00", label: "Medium" },
    LOW:      { color: "#36B37E", label: "Low" },
  };
  const c = config[priority] || config.MEDIUM;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" title={c.label}>
      <circle cx="8" cy="8" r="7" fill={c.color} opacity="0.18"/>
      <circle cx="8" cy="8" r="4" fill={c.color}/>
    </svg>
  );
};

// File type icons for attachments
export const FileIcon = ({ contentType = "", size = 18 }) => {
  if (contentType.startsWith("image/"))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    );
  if (contentType === "application/pdf")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#DE350B" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="13" x2="15" y2="13"/>
        <line x1="9" y1="17" x2="12" y2="17"/>
      </svg>
    );
  if (contentType.includes("zip") || contentType.includes("rar"))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6554C0" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="11" x2="12" y2="17"/>
        <line x1="10" y1="13" x2="14" y2="13"/>
      </svg>
    );
  if (contentType.includes("word") || contentType.includes("document"))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="16" y2="17"/>
      </svg>
    );
  if (contentType.includes("sheet") || contentType.includes("excel"))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#00875A" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <rect x="8" y="12" width="8" height="6" rx="1"/>
      </svg>
    );
  // Generic file
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#42526E" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
};

// Misc icons used across the app
export const GitBranchIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15"/>
    <circle cx="18" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M18 9a9 9 0 0 1-9 9"/>
  </svg>
);

export const PullRequestIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3"/>
    <circle cx="6" cy="6" r="3"/>
    <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
    <line x1="6" y1="9" x2="6" y2="21"/>
  </svg>
);

export const AttachmentIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

export const SprintGoalIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

export const MergeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3"/>
    <circle cx="6" cy="6" r="3"/>
    <path d="M6 21V9a9 9 0 0 0 9 9"/>
  </svg>
);

export const TrashIcon = ({ size = 13, color = "#DE350B" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

export const BellIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

export const CheckIcon = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export const SubtaskArrowIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export const FilterIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

export const ResetIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
  </svg>
);
