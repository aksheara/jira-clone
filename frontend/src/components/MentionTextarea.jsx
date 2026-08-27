import { useEffect, useRef, useState } from "react";

/**
 * Textarea that shows an @mention autocomplete dropdown.
 * Props:
 *   value        — controlled string value
 *   onChange     — (newValue) => void
 *   members      — [{ user: { id, username } }]  (ProjectMembership array)
 *   placeholder  — string
 *   rows         — number (default 3)
 *   disabled     — bool
 */
export default function MentionTextarea({
  value,
  onChange,
  members = [],
  placeholder = "Write a comment… Use @username to mention someone",
  rows = 3,
  disabled = false,
}) {
  const [mentionQuery, setMentionQuery] = useState(""); // text after @
  const [mentionStart, setMentionStart] = useState(-1); // caret position where @ was typed
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const textareaRef = useRef(null);

  // All unique usernames from members
  const allUsernames = members
    .map((m) => m.user?.username)
    .filter(Boolean);

  // Filter by what's been typed after @
  const suggestions = allUsernames.filter((u) =>
    u.toLowerCase().startsWith(mentionQuery.toLowerCase())
  );

  function handleChange(e) {
    const val = e.target.value;
    const caret = e.target.selectionStart;
    onChange(val);

    // Detect if user is typing after an @
    const textUpToCaret = val.slice(0, caret);
    const match = textUpToCaret.match(/@([\w]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(caret - match[0].length);
      setShowDropdown(true);
      setDropdownIndex(0);
    } else {
      setShowDropdown(false);
      setMentionQuery("");
      setMentionStart(-1);
    }
  }

  function insertMention(username) {
    const before = value.slice(0, mentionStart);
    const after = value.slice(
      textareaRef.current?.selectionStart || mentionStart + mentionQuery.length + 1
    );
    const newVal = `${before}@${username} ${after}`;
    onChange(newVal);
    setShowDropdown(false);
    setMentionQuery("");
    setMentionStart(-1);

    // Restore focus and move caret after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + username.length + 2; // @username + space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDropdownIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(suggestions[dropdownIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="jira-mention-wrap">
      <textarea
        ref={textareaRef}
        className="jira-comment-textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />

      {/* Markdown hint bar */}
      <div className="jira-comment-hint-bar">
        <span title="Bold">**bold**</span>
        <span title="Italic">*italic*</span>
        <span title="Inline code">`code`</span>
        <span title="Bullet list">- list</span>
        <span title="Mention">@mention</span>
      </div>

      {/* @mention dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="jira-mention-dropdown">
          {suggestions.map((username, idx) => (
            <button
              key={username}
              type="button"
              className={`jira-mention-item ${idx === dropdownIndex ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(username);
              }}
            >
              <div className="jira-mention-avatar">
                {username.substring(0, 2).toUpperCase()}
              </div>
              <span>@{username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
