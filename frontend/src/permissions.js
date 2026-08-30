/**
 * NEXA — Role-Based Permission System
 * Single source of truth for all access control decisions.
 *
 * Roles:   ADMIN | MEMBER | VIEWER
 * Usage:   can(role, action, context?)
 *
 * To add a new action:  add it to PERMISSIONS below.
 * To add a new role:    add a key to each action's config.
 */

// ─────────────────────────────────────────────────────────────
// ACTION CONSTANTS  (import these instead of typing strings)
// ─────────────────────────────────────────────────────────────
export const ACTIONS = {
  CREATE_ISSUE:               "create_issue",
  EDIT_ISSUE:                 "edit_issue",
  DELETE_ISSUE:               "delete_issue",           // context.isReporter matters
  ASSIGN_ISSUE_SELF:          "assign_issue_self",
  ASSIGN_ISSUE_OTHERS:        "assign_issue_others",
  CREATE_SUBTASK:             "create_subtask",
  CHANGE_ISSUE_STATUS:        "change_issue_status",
  ADD_COMMENT:                "add_comment",
  EDIT_OWN_COMMENT:           "edit_own_comment",
  DELETE_OWN_COMMENT:         "delete_own_comment",
  UPLOAD_ATTACHMENT:          "upload_attachment",
  DELETE_ATTACHMENT:          "delete_attachment",
  MOVE_ISSUE:                 "move_issue_in_backlog_or_sprint",
  CREATE_SPRINT:              "create_sprint",
  START_COMPLETE_SPRINT:      "start_complete_sprint",
  ADD_REMOVE_MEMBERS:         "add_remove_members",
  CHANGE_MEMBER_ROLE:         "change_member_role",
  EDIT_PROJECT_SETTINGS:      "edit_project_settings",
  DELETE_PROJECT:             "delete_project",
  CREATE_PROJECT:             "create_project",
  CONFIGURE_WORKFLOW:         "configure_workflow",
};

// ─────────────────────────────────────────────────────────────
// PERMISSION CONFIG
//
// Each action maps to a config object with:
//   ADMIN   — always true (shorthand: omit, defaults to true)
//   MEMBER  — true | false | "conditional"
//   VIEWER  — always false (shorthand: omit, defaults to false)
//   check   — function(context) → bool, only called when role is "conditional"
//
// context shape:
//   { isReporter: bool, isSelf: bool, isOwnComment: bool, isOwnAttachment: bool }
// ─────────────────────────────────────────────────────────────
const PERMISSIONS = {
  [ACTIONS.CREATE_ISSUE]: {
    ADMIN: true, MEMBER: true, VIEWER: false,
  },
  [ACTIONS.EDIT_ISSUE]: {
    ADMIN: true, MEMBER: true, VIEWER: false,
  },
  [ACTIONS.DELETE_ISSUE]: {
    ADMIN: true,
    MEMBER: "conditional",
    VIEWER: false,
    // Member can only delete if they are the reporter
    check: (ctx) => ctx?.isReporter === true,
  },
  [ACTIONS.ASSIGN_ISSUE_SELF]: {
    // Members can self-assign — claim unassigned issues to work on them
    ADMIN: true, MEMBER: true, VIEWER: false,
  },
  [ACTIONS.ASSIGN_ISSUE_OTHERS]: {
    ADMIN: true, MEMBER: false, VIEWER: false,
  },
  [ACTIONS.CREATE_SUBTASK]: {
    // Same tier as create_issue — breaking down work is core daily activity
    ADMIN: true, MEMBER: true, VIEWER: false,
  },
  [ACTIONS.CHANGE_ISSUE_STATUS]: {
    ADMIN: true,
    MEMBER: "conditional",
    VIEWER: false,
    // Member can only change status if they are the assignee
    check: (ctx) => ctx?.isAssignee === true,
  },
  [ACTIONS.ADD_COMMENT]: {
    ADMIN: true, MEMBER: true, VIEWER: false,
  },
  [ACTIONS.EDIT_OWN_COMMENT]: {
    ADMIN: true,
    MEMBER: "conditional",
    VIEWER: false,
    check: (ctx) => ctx?.isOwnComment === true,
  },
  [ACTIONS.DELETE_OWN_COMMENT]: {
    ADMIN: true,
    MEMBER: "conditional",
    VIEWER: false,
    check: (ctx) => ctx?.isOwnComment === true,
  },
  [ACTIONS.UPLOAD_ATTACHMENT]: {
    ADMIN: true, MEMBER: true, VIEWER: false,
  },
  [ACTIONS.DELETE_ATTACHMENT]: {
    ADMIN: true,
    MEMBER: "conditional",
    VIEWER: false,
    // Member can only delete their own attachment
    check: (ctx) => ctx?.isOwnAttachment === true,
  },
  [ACTIONS.MOVE_ISSUE]: {
    ADMIN: true, MEMBER: true, VIEWER: false,
  },
  [ACTIONS.CREATE_SPRINT]: {
    ADMIN: true, MEMBER: false, VIEWER: false,
  },
  [ACTIONS.START_COMPLETE_SPRINT]: {
    ADMIN: true, MEMBER: false, VIEWER: false,
  },
  [ACTIONS.ADD_REMOVE_MEMBERS]: {
    ADMIN: true, MEMBER: false, VIEWER: false,
  },
  [ACTIONS.CHANGE_MEMBER_ROLE]: {
    ADMIN: true, MEMBER: false, VIEWER: false,
  },
  [ACTIONS.EDIT_PROJECT_SETTINGS]: {
    ADMIN: true, MEMBER: false, VIEWER: false,
  },
  [ACTIONS.DELETE_PROJECT]: {
    ADMIN: true, MEMBER: false, VIEWER: false,
  },
  [ACTIONS.CREATE_PROJECT]: {
    ADMIN: true, MEMBER: false, VIEWER: false,
  },
  [ACTIONS.CONFIGURE_WORKFLOW]: {
    ADMIN: true, MEMBER: false, VIEWER: false,
  },
};

// ─────────────────────────────────────────────────────────────
// can(role, action, context?) → boolean
//
// @param role     "ADMIN" | "MEMBER" | "VIEWER"
// @param action   one of ACTIONS.*
// @param context  optional — { isReporter, isOwnComment, isOwnAttachment, isSelf }
// @returns        true if allowed, false otherwise
// ─────────────────────────────────────────────────────────────
export function can(role, action, context = {}) {
  if (!role || !action) return false;

  const perm = PERMISSIONS[action];
  if (!perm) {
    console.warn(`[NEXA Permissions] Unknown action: "${action}"`);
    return false;
  }

  const rolePermission = perm[role];

  if (rolePermission === true)  return true;
  if (rolePermission === false) return false;

  // "conditional" — run the check function
  if (rolePermission === "conditional") {
    if (typeof perm.check === "function") {
      return perm.check(context);
    }
    return false;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────
// Convenience: canAny(role, actions[], context?) → boolean
// Returns true if the role can perform ANY of the given actions.
// ─────────────────────────────────────────────────────────────
export function canAny(role, actions, context = {}) {
  return actions.some((action) => can(role, action, context));
}

// ─────────────────────────────────────────────────────────────
// Convenience: getPermissions(role) → { action: bool }
// Returns a flat map of all actions for a role (no context checks).
// Useful for debugging or rendering a permissions table.
// ─────────────────────────────────────────────────────────────
export function getPermissions(role) {
  return Object.fromEntries(
    Object.entries(PERMISSIONS).map(([action, perm]) => [
      action,
      perm[role] === true ? true : perm[role] === "conditional" ? "conditional" : false,
    ])
  );
}
