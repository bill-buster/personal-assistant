# Command Overlap Analysis: User vs Project Level

## Summary

There are **5 overlapping command pairs** between user-level (`~/.cursor/commands/`) and project-level (`.cursor/commands/`) commands:

1. ✅ **Exact filename match**: `add_docs.md` - **RESOLVED** (user-level removed)
2. 🔄 **Functional overlap**: `review_pr.md` ↔ `code_review.md`
3. 🔄 **Functional overlap**: `jules_test.md` ↔ `write_tests.md`
4. 🔄 **Functional overlap**: `safe_refactor.md` ↔ `refactor_code.md`
5. 🔄 **Functional overlap**: `security_audit.md` ↔ `security_review.md`

## How Cursor Handles Overlaps

**Project-level commands take precedence** over user-level commands when there's a filename match.

- If both `.cursor/commands/add_docs.md` and `~/.cursor/commands/add_docs.md` exist, Cursor uses the **project-level** one.
- For different filenames with similar purposes, both appear in the command list.

## Detailed Comparison

### 1. `add_docs.md` - EXACT OVERLAP ⚠️

**Project-level** (`.cursor/commands/add_docs.md`):
- References `role.impl.mdc` and `documentation.mdc`
- Project-specific JSDoc patterns
- Mentions project-specific files (`docs/COMMANDS.md`)
- More detailed, project-aware

**User-level** (`~/.cursor/commands/add_docs.md`):
- ~~Generic documentation prompt~~ **REMOVED**
- ~~No project-specific references~~ **REMOVED**
- ~~Works across all projects~~ **REMOVED**

**Status**: ✅ **RESOLVED** - User-level version removed. Project-level version is now the only one.

---

### 2. Code Review Commands

**Project-level**: `review_pr.md`
- References `role.review.mdc` and `code_review.mdc`
- Project-specific checklist
- Mentions "Approve only if all checks pass" (PR workflow)
- More structured, project-aware

**User-level**: `code_review.md`
- Generic review prompt
- No project-specific references
- Works across all projects

**Recommendation**: Keep both - they serve different contexts (PR review vs general review).

---

### 3. Test Writing Commands

**Project-level**: `jules_test.md`
- References `role.jules.mdc` (stress tester role)
- References `testing.mdc` patterns
- Project-specific test patterns
- Mentions "Break things and ensure robustness"

**User-level**: `write_tests.md`
- Generic test writing prompt
- References "project testing patterns" (generic)
- Works across all projects

**Recommendation**: Keep both - project one is more aggressive/stress-test focused.

---

### 4. Refactoring Commands

**Project-level**: `safe_refactor.md`
- References `role.planner.mdc`
- Mentions "Plan Mode" (Cursor feature)
- Project-specific refactoring approach
- Step-by-step, phased approach

**User-level**: `refactor_code.md`
- Generic refactoring prompt
- No project-specific references
- Works across all projects

**Recommendation**: Keep both - project one is for large refactors with planning, user one is for quick refactors.

---

### 5. Security Commands

**Project-level**: `security_audit.md`
- References `role.review.mdc` and `security.mdc`
- Project-specific security patterns
- Mentions `context.paths.resolveAllowed()` (project-specific)
- Mentions `allow_commands` list (project-specific)
- Very specific to this project's security model

**User-level**: `security_review.md`
- Generic security review prompt
- No project-specific references
- Works across all projects

**Recommendation**: Keep both - project one is very specific to this codebase's security patterns.

---

## Recommendations

### Option 1: Remove Overlapping User Commands (Recommended)

Since project-level commands are more specific and useful for this project, remove the overlapping user-level commands:

```bash
# Remove exact duplicate
rm ~/.cursor/commands/add_docs.md

# Optional: Keep functional overlaps since they serve different purposes
# Or remove if you prefer project-specific ones
```

**Keep these user-level commands** (no project equivalents):
- `explain_code.md` - No project equivalent
- `debug_issue.md` - No project equivalent
- `optimize_performance.md` - No project equivalent

### Option 2: Rename User Commands to Avoid Conflicts

Rename user-level commands to be more generic:

```bash
cd ~/.cursor/commands
mv add_docs.md add_docs_generic.md
# Or remove it since project one is better
```

### Option 3: Keep Both (Current State)

Keep both sets - Cursor will show project-level ones first, and you can use user-level ones in other projects.

**Current behavior**: When you type `/` in Cursor:
- Project commands appear (with project context)
- User commands appear (generic, work everywhere)
- If same filename, project version is used

---

## Project-Specific Commands (No Overlaps)

These project commands have no user-level equivalents:

- `impl_add_tool.md` - Add tool end-to-end (very project-specific)
- `fix_errors.md` - Fix errors (project-specific)
- `fix_todos.md` - Fix todos (project-specific)
- `perf_fix_spawn.md` - Performance fix (project-specific)
- `type_safety.md` - Type safety (project-specific)

---

## User-Specific Commands (No Overlaps)

These user commands have no project equivalents:

- `explain_code.md` - Explain code in detail
- `debug_issue.md` - Debug problems
- `optimize_performance.md` - Performance optimization

---

## Action Items

1. ✅ **Removed `add_docs.md`**: User-level version removed (project one is better)
2. ✅ **Kept functional overlaps**: They serve different purposes (project-specific vs generic)
3. **Use project commands** in this repo for best results
4. **Use user commands** in other projects where project-specific ones don't exist

## Implementation Status

- ✅ Removed conflicting user-level `add_docs.md`
- ✅ Kept all functional overlaps (different purposes)
- ✅ User-level commands now: 7 commands (no conflicts)
- ✅ Project-level commands: 10 commands

---

## Quick Reference

| Command Type | Best For | Example |
|-------------|----------|---------|
| **Project-level** | This project, team workflows | `/impl_add_tool`, `/review_pr` |
| **User-level** | All projects, personal workflows | `/explain_code`, `/debug_issue` |
| **Overlaps** | Use project version in this repo | `/add_docs` (use project one) |

