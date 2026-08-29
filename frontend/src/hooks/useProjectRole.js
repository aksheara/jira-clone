/**
 * useProjectRole
 * Derives the current user's role for a specific project.
 *
 * Returns:
 *   role       — "ADMIN" | "MEMBER" | "VIEWER" | null
 *   isAdmin    — true if role === "ADMIN"
 *   isMember   — true if role === "ADMIN" || "MEMBER" (can edit)
 *   isViewer   — true if role === "VIEWER" (read-only)
 *   canEdit    — alias for isMember (Admin + Member can edit)
 */
export function useProjectRole(projectDetails, currentUser) {
  // projectDetails.my_role is injected by ProjectSerializer.get_my_role()
  const role = projectDetails?.my_role || null;

  const isAdmin  = role === "ADMIN";
  const isViewer = role === "VIEWER";
  const isMember = role === "ADMIN" || role === "MEMBER";
  const canEdit  = isMember;

  return { role, isAdmin, isMember, isViewer, canEdit };
}
