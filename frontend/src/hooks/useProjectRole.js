/**
 * useProjectRole
 * Derives the current user's role for a specific project
 * and exposes a bound can() function.
 *
 * Returns:
 *   role       — "ADMIN" | "MEMBER" | "VIEWER" | null
 *   isAdmin    — true if role === "ADMIN"
 *   isMember   — true if role === "ADMIN" || "MEMBER"
 *   isViewer   — true if role === "VIEWER"
 *   canEdit    — alias for isMember
 *   can(action, context?) — bound to the current role; delegates to permissions.js
 */
import { can as _can } from "../permissions";

export function useProjectRole(projectDetails, currentUser) {
  const role = projectDetails?.my_role || null;

  const isAdmin  = role === "ADMIN";
  const isViewer = role === "VIEWER";
  const isMember = role === "ADMIN" || role === "MEMBER";
  const canEdit  = isMember;

  /**
   * Bound permission check for the current user's role.
   * @param {string} action   — one of ACTIONS.*
   * @param {object} [context] — { isReporter, isOwnComment, isOwnAttachment }
   */
  function can(action, context = {}) {
    return _can(role, action, context);
  }

  return { role, isAdmin, isMember, isViewer, canEdit, can };
}
