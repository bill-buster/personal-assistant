# ⚠️ DEPRECATED: Use `/implement_and_review_tool` instead

This command has been replaced by `/implement_and_review_tool` which includes:
- Better idempotency (safe to re-run)
- Explicit quality gates
- Clear Jules role integration
- Summary step for better UX

**Please use `/implement_and_review_tool` for all new tool implementations.**

---

You are the Implementer. Follow role.impl.mdc first, then project rules.

## Security Note

This command should only be used in trusted codebases. It will:
- Modify source code files
- Execute git commands
- Run npm scripts
- Potentially commit changes

Verify you're in the correct repository before proceeding.

## Composite Workflow: Implement and Review Tool

This command chains multiple workflows to implement a tool end-to-end:
1. Generate tool boilerplate (if needed)
2. Implement tool logic (`impl_add_tool` steps 1-7)
3. Write comprehensive tests (`jules_test` patterns)
4. Run code review (`review_pr`)
5. Fix issues if any
6. Commit changes (if all pass)

**IMPORTANT**: Log each step clearly so the user can see progress. Use format: `[STEP X/Y] Description...`

## Workflow Steps

### Phase 1: Tool Generation (Optional)

1. **[STEP 1/15]** Log: "Checking if tool needs generation..."
   - If tool doesn't exist: Use `assistant generate tool <name> [--args]`
   - If tool exists: Skip to Phase 2
   - Log: "Tool generation: [generated/skipped]"

### Phase 2: Tool Implementation

2. **[STEP 2/15]** Log: "Reading checklist to find next tool..."
   - Read `docs/TOOL_IMPLEMENTATION_CHECKLIST.md` once (verify you're in project root)
   - Cache checklist in memory for subsequent tools (if implementing multiple)
   - Find first unchecked tool (line starting with `- [ ]`)
   - Validate tool name matches pattern: `^[a-z_]+$` (lowercase, underscores only)
   - Log: "Found tool: [tool_name] - [description]"
   - If no unchecked tools found: Log "All tools complete" and exit

3. **[STEP 3/15]** Log: "Creating Zod schema..."
   - Create Zod schema in src/core/types.ts (reference @Docs Zod for schema patterns)
   - Log: "Schema created: [tool_name]Schema"

4. **[STEP 4/15]** Log: "Implementing handler function..."
   - Create handler function in src/tools/[tool_name]_tools.ts (reference @Docs Node.js for Node.js APIs)
   - Log: "Handler function created: handle[ToolName]"

5. **[STEP 5/15]** Log: "Registering tool in registry..."
   - Register in src/core/tool_registry.ts
   - Log: "Tool registered: [tool_name]"

6. **[STEP 6/15]** Log: "Adding tool to agents..."
   - Add to appropriate agent in src/agents/index.ts
   - Log: "Tool added to agents: [agent_names]"

7. **[STEP 7/15]** Log: "Updating checklist..."
   - Update the checklist by marking the tool as done (`- [x]`)
   - Log: "Checklist updated"

### Phase 3: Comprehensive Testing

8. **[STEP 8/15]** Log: "Writing comprehensive tests..."
   - Follow `/jules_test` patterns to write comprehensive tests
   - Cover success cases, error cases, edge cases, invalid inputs
   - Create test file src/tools/[tool_name]_tools.test.ts
   - Log: "Test file created with [N] test cases"

9. **[STEP 9/15]** Log: "Running tests..."
   - Run: `npm test src/tools/[tool_name]_tools.test.ts`
   - Log: "Tests: [passed/failed], [N] tests"
   - If tests fail: Log failures and continue to fix step
   - If tests pass: Continue to review step

### Phase 4: Code Review

10. **[STEP 10/15]** Log: "Running automated code review..."
    - Run: `npm run review src/tools/[tool_name]_tools.ts` (async)
    - Wait for completion
    - Log: "Automated review complete: [score]/100, [issues] issues found"
    - Show summary of issues if any
    - If score < 80: Log warning but continue (will fix in step 12)

11. **[STEP 11/15]** Log: "Running manual code review (Reviewer role)..."
    - Switch to Reviewer role and systematically review the new tool files using code_review.mdc checklist
    - Review: handler function, test file, schema registration
    - Log: "Manual review complete: [approved/rejected] with [N] issues found"
    - List any issues found
    - If rejected with critical issues: Stop and report (do not commit)

### Phase 5: Fix Issues

12. **[STEP 12/15]** Log: "Fixing any issues..."
    - Fix any issues found during review or testing
    - Log: "Issues fixed: [list of fixes]"
    - If critical issues remain after 2 fix attempts: Stop and report

13. **[STEP 13/15]** Log: "Re-running tests after fixes..."
    - Run: `npm test src/tools/[tool_name]_tools.test.ts`
    - Log: "Tests after fixes: [passed/failed]"
    - If tests still fail: Log error and stop (do not commit)

14. **[STEP 14/15]** Log: "Re-running review after fixes..."
    - Run: `npm run review src/tools/[tool_name]_tools.ts`
    - Log: "Review after fixes: [score]/100"
    - If score still < 80: Log warning but continue (user can fix later)

### Phase 6: Commit and Review

15. **[STEP 15/15]** Log: "Staging files and running preflight..."
    - Follow commit workflow in git.mdc (see `.cursor/rules/git.mdc` for details):
      - Stage files: `git add [files]`
      - Run: `npm run preflight`
      - Log: "Preflight complete: [passed/failed]"
      - If preflight fails: Log errors and stop (do not commit)
      - If passed, commit: `git commit -m "feat(tools): add [tool_name] tool"`
      - Log: "Committed: [commit_hash]"
    - Automatically trigger review_pr command to review the committed changes
    - Log: "Post-commit review complete: [approved/rejected]"

## Step Structure

- **Steps 1**: Tool generation (optional, 1 step)
- **Steps 2-7**: Implementation (6 steps)
- **Steps 8-9**: Testing (2 steps)
- **Steps 10-11**: Review (2 steps - parallel execution in step 10)
- **Steps 12-14**: Fix issues (3 steps)
- **Step 15**: Commit and post-commit review (1 step)

**Total**: 15 steps (comprehensive workflow)

## Quality Gates

### Gate 1: Tests Must Pass
- **Threshold**: All tests pass
- **Action if fails**: Fix issues, re-run tests
- **Block commit**: Yes

### Gate 2: Automated Review
- **Threshold**: Score ≥ 80/100
- **Action if fails**: Log warning, continue (fix in step 12)
- **Block commit**: No (warning only)

### Gate 3: Manual Review
- **Threshold**: All checklist items pass
- **Action if fails**: Fix issues, re-run review
- **Block commit**: Yes (if critical issues)

### Gate 4: Preflight Checks
- **Threshold**: All checks pass
- **Action if fails**: Fix issues, re-run preflight
- **Block commit**: Yes

## Error Handling

If any step fails:

1. **Non-critical errors** (e.g., missing JSDoc, minor style issues):
   - Log warning with context
   - Continue to next step
   - Fix in step 12 (Fixing issues)

2. **Critical errors** (e.g., test failures, preflight failures, security issues):
   - Log error clearly with context
   - Stop execution
   - Provide actionable error message with suggestions
   - Do NOT commit if critical errors exist

3. **File not found errors**:
   - Checklist file missing: Log error and exit
   - Source file missing: Log error and exit
   - Test file missing: Create it in step 8

4. **Validation errors**:
   - Tool name invalid: Log error with expected format and exit
   - Schema validation fails: Log error with details and exit

## Exit Conditions

- **Success**: Tool implemented, all checks pass, committed successfully
- **Empty**: No unchecked tools found (log "All tools complete" and exit)
- **Error**: Critical error encountered (log error and exit)
- **Limit**: Maximum 5 tools per run (to avoid overwhelming output) - log "Reached limit" and exit

## Performance Optimizations

1. **Checklist Caching**: Checklist is read once and cached in memory for subsequent tools
2. **Parallel Quality Checks**: Automated review runs in parallel with test execution (step 10)
3. **Early Exit**: Stop immediately on critical errors to avoid wasted work

## Progress Tracking

**Always log progress clearly** so the user can see what's happening:
- Use `[STEP X/Y]` prefix for each major step
- Log before starting each step: `[STEP X/Y] Starting: [description]...`
- Log results after each step completes: `[STEP X/Y] Complete: [result summary]`
- Show command output: When running commands (npm, git, etc.), show relevant output
- Show summaries: Display scores, issue counts, test results, commit hashes
- If errors occur: Log them clearly with context
- Progress tracking: Use todo_write to track progress through steps

## Example Output

```
[STEP 1/15] Starting: Checking if tool needs generation...
[STEP 1/15] Complete: Tool generation skipped (tool exists)

[STEP 2/15] Starting: Reading checklist to find next tool...
[STEP 2/15] Complete: Found tool: move_file - Move or rename a file

[STEP 3/15] Starting: Creating Zod schema...
[STEP 3/15] Complete: Schema created: MoveFileSchema

...

[STEP 15/15] Starting: Staging files and running preflight...
[STEP 15/15] Complete: Committed: abc123, Post-commit review: approved
```

## Related Commands

- `/impl_add_tool` - Tool implementation only (steps 1-7)
- `/jules_test` - Comprehensive test writing
- `/review_pr` - Code review
- `assistant generate tool` - Tool boilerplate generation

## Related Rules

- `role.impl.mdc` - Implementer role patterns
- `tools.mdc` - Tool implementation patterns
- `testing.mdc` - Testing patterns
- `code_review.mdc` - Review checklist
- `git.mdc` - Commit workflow

