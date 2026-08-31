/**
 * Lightweight markdown renderer — no external dependencies.
 * Supports:
 *   **bold**  *italic*  `inline code`  [link](url)
 *   - bullet lists   > blockquote   @mention chips
 */
export default function MarkdownRenderer({ children = "" }) {
  if (!children) return null;

  const lines = children.split("\n");

  return (
    <div className="jira-md-body">
      {lines.map((line, i) => renderLine(line, i))}
    </div>
  );
}

function renderLine(line, key) {
  // Bullet list
  if (/^[-*]\s/.test(line)) {
    return (
      <div key={key} className="jira-md-li">
        <span className="jira-md-bullet">•</span>
        <span>{renderInline(line.slice(2))}</span>
      </div>
    );
  }
  // Blockquote
  if (/^>\s/.test(line)) {
    return (
      <blockquote key={key} className="jira-md-blockquote">
        {renderInline(line.slice(2))}
      </blockquote>
    );
  }
  // Heading ##
  if (/^##\s/.test(line)) {
    return <h4 key={key} className="jira-md-h4">{renderInline(line.slice(3))}</h4>;
  }
  // Heading #
  if (/^#\s/.test(line)) {
    return <h3 key={key} className="jira-md-h3">{renderInline(line.slice(2))}</h3>;
  }
  // Horizontal rule
  if (/^---+$/.test(line.trim())) {
    return <hr key={key} className="jira-md-hr" />;
  }
  // Empty line → spacing
  if (line.trim() === "") {
    return <div key={key} className="jira-md-spacer" />;
  }
  // Normal paragraph
  return <p key={key} className="jira-md-p">{renderInline(line)}</p>;
}

function renderInline(text) {
  // Split on markdown tokens: **bold**, *italic*, `code`, [text](url), @mention
  const tokens = tokenize(text);
  return tokens.map((tok, i) => {
    if (tok.type === "bold")    return <strong key={i}>{tok.content}</strong>;
    if (tok.type === "italic")  return <em key={i}>{tok.content}</em>;
    if (tok.type === "code")    return <code key={i} className="jira-md-code">{tok.content}</code>;
    if (tok.type === "link")    return <a key={i} href={tok.href} target="_blank" rel="noreferrer" className="jira-md-link">{tok.content}</a>;
    if (tok.type === "mention") return <span key={i} className="jira-mention-chip">@{tok.content}</span>;
    return <span key={i}>{tok.content}</span>;
  });
}

function tokenize(text) {
  const tokens = [];
  // Regex order matters — longer patterns first
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[(.+?)\]\((https?:\/\/[^\s)]+)\)|@([\w]+)/g;
  let last = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Push any plain text before this match
    if (match.index > last) {
      tokens.push({ type: "text", content: text.slice(last, match.index) });
    }

    if (match[1] !== undefined) tokens.push({ type: "bold",    content: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: "italic",  content: match[2] });
    else if (match[3] !== undefined) tokens.push({ type: "code",    content: match[3] });
    else if (match[4] !== undefined) tokens.push({ type: "link",    content: match[4], href: match[5] });
    else if (match[6] !== undefined) tokens.push({ type: "mention", content: match[6] });

    last = match.index + match[0].length;
  }

  // Remaining plain text
  if (last < text.length) {
    tokens.push({ type: "text", content: text.slice(last) });
  }

  return tokens;
}
