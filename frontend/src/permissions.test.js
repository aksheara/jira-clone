/**
 * NEXA — Permission System Unit Tests
 * Run with: npx vitest --run  (or jest if configured)
 *
 * Coverage:
 *   - Every role × every action (all 20 actions × 3 roles = 60 base cases)
 *   - Conditional checks: delete_issue (reporter), edit/delete_own_comment, delete_attachment
 *   - Edge cases: unknown action, null role, missing context
 */

import { describe, it, expect } from "vitest";
import { can, canAny, getPermissions, ACTIONS } from "./permissions";

// ─── Helpers ───────────────────────────────────────────────
const ADMIN  = "ADMIN";
const MEMBER = "MEMBER";
const VIEWER = "VIEWER";

const isReporter      = { isReporter: true };
const notReporter     = { isReporter: false };
const isOwnComment    = { isOwnComment: true };
const notOwnComment   = { isOwnComment: false };
const isOwnAttachment = { isOwnAttachment: true };
const notOwnAttachment= { isOwnAttachment: false };

// ─────────────────────────────────────────────────────────────
describe("ADMIN — full access", () => {
  it("can create_issue", () => expect(can(ADMIN, ACTIONS.CREATE_ISSUE)).toBe(true));
  it("can edit_issue", () => expect(can(ADMIN, ACTIONS.EDIT_ISSUE)).toBe(true));
  it("can delete_issue", () => expect(can(ADMIN, ACTIONS.DELETE_ISSUE)).toBe(true));
  it("can delete_issue even if not reporter", () => expect(can(ADMIN, ACTIONS.DELETE_ISSUE, notReporter)).toBe(true));
  it("can assign_issue_self", () => expect(can(ADMIN, ACTIONS.ASSIGN_ISSUE_SELF)).toBe(true));
  it("can assign_issue_others", () => expect(can(ADMIN, ACTIONS.ASSIGN_ISSUE_OTHERS)).toBe(true));
  it("can change_issue_status", () => expect(can(ADMIN, ACTIONS.CHANGE_ISSUE_STATUS)).toBe(true));
  it("can add_comment", () => expect(can(ADMIN, ACTIONS.ADD_COMMENT)).toBe(true));
  it("can edit_own_comment", () => expect(can(ADMIN, ACTIONS.EDIT_OWN_COMMENT)).toBe(true));
  it("can edit any comment (Admin bypasses ownership check)", () => expect(can(ADMIN, ACTIONS.EDIT_OWN_COMMENT, notOwnComment)).toBe(true));
  it("can delete_own_comment", () => expect(can(ADMIN, ACTIONS.DELETE_OWN_COMMENT)).toBe(true));
  it("can upload_attachment", () => expect(can(ADMIN, ACTIONS.UPLOAD_ATTACHMENT)).toBe(true));
  it("can delete_attachment", () => expect(can(ADMIN, ACTIONS.DELETE_ATTACHMENT)).toBe(true));
  it("can move_issue", () => expect(can(ADMIN, ACTIONS.MOVE_ISSUE)).toBe(true));
  it("can create_sprint", () => expect(can(ADMIN, ACTIONS.CREATE_SPRINT)).toBe(true));
  it("can start_complete_sprint", () => expect(can(ADMIN, ACTIONS.START_COMPLETE_SPRINT)).toBe(true));
  it("can add_remove_members", () => expect(can(ADMIN, ACTIONS.ADD_REMOVE_MEMBERS)).toBe(true));
  it("can change_member_role", () => expect(can(ADMIN, ACTIONS.CHANGE_MEMBER_ROLE)).toBe(true));
  it("can edit_project_settings", () => expect(can(ADMIN, ACTIONS.EDIT_PROJECT_SETTINGS)).toBe(true));
  it("can delete_project", () => expect(can(ADMIN, ACTIONS.DELETE_PROJECT)).toBe(true));
  it("can create_project", () => expect(can(ADMIN, ACTIONS.CREATE_PROJECT)).toBe(true));
  it("can configure_workflow", () => expect(can(ADMIN, ACTIONS.CONFIGURE_WORKFLOW)).toBe(true));
});

// ─────────────────────────────────────────────────────────────
describe("MEMBER — edit access, no admin actions", () => {
  it("can create_issue", () => expect(can(MEMBER, ACTIONS.CREATE_ISSUE)).toBe(true));
  it("can edit_issue", () => expect(can(MEMBER, ACTIONS.EDIT_ISSUE)).toBe(true));
  it("can change_issue_status", () => expect(can(MEMBER, ACTIONS.CHANGE_ISSUE_STATUS)).toBe(true));
  it("can add_comment", () => expect(can(MEMBER, ACTIONS.ADD_COMMENT)).toBe(true));
  it("can upload_attachment", () => expect(can(MEMBER, ACTIONS.UPLOAD_ATTACHMENT)).toBe(true));
  it("can move_issue", () => expect(can(MEMBER, ACTIONS.MOVE_ISSUE)).toBe(true));

  // Conditional: delete_issue
  it("can delete_issue if reporter", () => expect(can(MEMBER, ACTIONS.DELETE_ISSUE, isReporter)).toBe(true));
  it("cannot delete_issue if NOT reporter", () => expect(can(MEMBER, ACTIONS.DELETE_ISSUE, notReporter)).toBe(false));
  it("cannot delete_issue with no context", () => expect(can(MEMBER, ACTIONS.DELETE_ISSUE)).toBe(false));

  // Conditional: edit/delete own comment
  it("can edit_own_comment if own", () => expect(can(MEMBER, ACTIONS.EDIT_OWN_COMMENT, isOwnComment)).toBe(true));
  it("cannot edit_own_comment if not own", () => expect(can(MEMBER, ACTIONS.EDIT_OWN_COMMENT, notOwnComment)).toBe(false));
  it("can delete_own_comment if own", () => expect(can(MEMBER, ACTIONS.DELETE_OWN_COMMENT, isOwnComment)).toBe(true));
  it("cannot delete_own_comment if not own", () => expect(can(MEMBER, ACTIONS.DELETE_OWN_COMMENT, notOwnComment)).toBe(false));

  // Conditional: delete own attachment
  it("can delete_attachment if own", () => expect(can(MEMBER, ACTIONS.DELETE_ATTACHMENT, isOwnAttachment)).toBe(true));
  it("cannot delete_attachment if not own", () => expect(can(MEMBER, ACTIONS.DELETE_ATTACHMENT, notOwnAttachment)).toBe(false));

  // Admin-only actions — all false for Member
  it("can assign_issue_self", () => expect(can(MEMBER, ACTIONS.ASSIGN_ISSUE_SELF)).toBe(true));
  it("can create_subtask", () => expect(can(MEMBER, ACTIONS.CREATE_SUBTASK)).toBe(true));
  it("cannot assign_issue_others", () => expect(can(MEMBER, ACTIONS.ASSIGN_ISSUE_OTHERS)).toBe(false));
  it("cannot create_sprint", () => expect(can(MEMBER, ACTIONS.CREATE_SPRINT)).toBe(false));
  it("cannot start_complete_sprint", () => expect(can(MEMBER, ACTIONS.START_COMPLETE_SPRINT)).toBe(false));
  it("cannot add_remove_members", () => expect(can(MEMBER, ACTIONS.ADD_REMOVE_MEMBERS)).toBe(false));
  it("cannot change_member_role", () => expect(can(MEMBER, ACTIONS.CHANGE_MEMBER_ROLE)).toBe(false));
  it("cannot edit_project_settings", () => expect(can(MEMBER, ACTIONS.EDIT_PROJECT_SETTINGS)).toBe(false));
  it("cannot delete_project", () => expect(can(MEMBER, ACTIONS.DELETE_PROJECT)).toBe(false));
  it("cannot create_project", () => expect(can(MEMBER, ACTIONS.CREATE_PROJECT)).toBe(false));
  it("cannot configure_workflow", () => expect(can(MEMBER, ACTIONS.CONFIGURE_WORKFLOW)).toBe(false));
});

// ─────────────────────────────────────────────────────────────
describe("VIEWER — read-only, no write actions", () => {
  Object.values(ACTIONS).forEach((action) => {
    it(`cannot ${action}`, () => {
      // Try with every possible context — should always be false
      expect(can(VIEWER, action)).toBe(false);
      expect(can(VIEWER, action, isReporter)).toBe(false);
      expect(can(VIEWER, action, isOwnComment)).toBe(false);
      expect(can(VIEWER, action, isOwnAttachment)).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────
describe("Edge cases", () => {
  it("returns false for unknown action", () => {
    expect(can(ADMIN, "unknown_action")).toBe(false);
  });

  it("returns false for null role", () => {
    expect(can(null, ACTIONS.CREATE_ISSUE)).toBe(false);
  });

  it("returns false for undefined role", () => {
    expect(can(undefined, ACTIONS.CREATE_ISSUE)).toBe(false);
  });

  it("returns false for null action", () => {
    expect(can(ADMIN, null)).toBe(false);
  });

  it("conditional without context defaults to false for MEMBER", () => {
    expect(can(MEMBER, ACTIONS.DELETE_ISSUE)).toBe(false);
    expect(can(MEMBER, ACTIONS.EDIT_OWN_COMMENT)).toBe(false);
    expect(can(MEMBER, ACTIONS.DELETE_ATTACHMENT)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe("canAny()", () => {
  it("returns true if MEMBER can do at least one of given actions", () => {
    expect(canAny(MEMBER, [ACTIONS.CREATE_SPRINT, ACTIONS.CREATE_ISSUE])).toBe(true);
  });

  it("returns false if MEMBER can do none of the given actions", () => {
    expect(canAny(MEMBER, [ACTIONS.CREATE_SPRINT, ACTIONS.DELETE_PROJECT])).toBe(false);
  });

  it("VIEWER cannot do any action", () => {
    expect(canAny(VIEWER, Object.values(ACTIONS))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe("getPermissions()", () => {
  it("returns a full permission map for ADMIN — all true", () => {
    const perms = getPermissions(ADMIN);
    Object.values(perms).forEach((v) => expect(v).toBe(true));
  });

  it("returns a full permission map for VIEWER — all false", () => {
    const perms = getPermissions(VIEWER);
    Object.values(perms).forEach((v) => expect(v).toBe(false));
  });

  it("returns conditional for MEMBER delete_issue", () => {
    const perms = getPermissions(MEMBER);
    expect(perms[ACTIONS.DELETE_ISSUE]).toBe("conditional");
  });
});
