You are the Implementer. Follow role.impl.mdc first, then project rules.

# Note: @Docs mentions are optional if external docs aren't indexed
@Docs Node.js @Docs Zod

## Automatic Tool Selection

**FIRST**: Read `docs/TOOL_IMPLEMENTATION_CHECKLIST.md` and find the **first unchecked tool** (line starting with `- [ ]`).

Extract:
- **Tool name**: The text between backticks (e.g., `move_file` → `move_file`)
- **Description**: Everything after the dash (e.g., `- Move or rename a file from one path to another`)

If no unchecked tools are found, inform the user that all tools are complete.

## Implementation Steps

**IMPORTANT**: Log each step clearly so the user can see progress. Use format: `[STEP X/12] Description...`

Implement the selected tool end-to-end, then automatically review and test:

**Implementation:**
1. **[STEP 1/12]** Log: "Reading checklist to find next tool..."
   - Read `docs/TOOL_IMPLEMENTATION_CHECKLIST.md` once (verify you're in project root)
   - Cache checklist in memory for subsequent tools (if implementing multiple)
   - Find first unchecked tool (line starting with `- [ ]`)
   - Validate tool name matches pattern: `^[a-z_]+$` (lowercase, underscores only)
   - Validate description doesn't contain code blocks or special characters
   - Log: "Found tool: [tool_name] - [description]"
   - Log: "Checklist loaded: [N] tools total, [M] remaining"
   - If no unchecked tools found: Log "All tools complete" and exit

2. **[STEP 2/12]** Log: "Creating Zod schema..."
   - Create Zod schema in src/core/types.ts (reference @Docs Zod for schema patterns)
   - Log: "Schema created: [tool_name]Schema"

3. **[STEP 3/12]** Log: "Implementing handler function..."
   - Create handler function in src/tools/[tool_name]_tools.ts (reference @Docs Node.js for Node.js APIs)
   - Log: "Handler function created: handle[ToolName]"

4. **[STEP 4/12]** Log: "Registering tool in registry..."
   - Register in src/core/tool_registry.ts
   - Log: "Tool registered: [tool_name]"

5. **[STEP 5/12]** Log: "Adding tool to agents..."
   - Add to appropriate agent in src/agents/index.ts
   - Log: "Tool added to agents: [agent_names]"

6. **[STEP 6/12]** Log: "Creating test file..."
   - Create test file src/tools/[tool_name]_tools.test.ts
   - Log: "Test file created with [N] test cases"

7. **[STEP 7/12]** Log: "Updating checklist..."
   - Update the checklist by marking the tool as done (`- [x]`)
   - Log: "Checklist updated"

**Automatic Quality Checks (after implementation):**
8. **[STEP 8/12]** Log: "Running quality checks in parallel..."
   - Run automated review and tests in parallel:
     - Automated review: `npm run review src/tools/[tool_name]_tools.ts` (async)
     - Tests: `npm test src/tools/[tool_name]_tools.test.ts` (async)
   - Wait for both to complete
   - Log: "Automated review complete: [score]/100, [issues] issues found"
   - Log: "Tests complete: [passed/failed], [N] tests"
   - Show summary of issues if any
   - If score < 80: Log warning but continue (will fix in step 10)
   - If tests fail: Log error and continue to fix step

9. **[STEP 9/12]** Log: "Running manual code review (Reviewer role)..."
   - Switch to Reviewer role and systematically review the new tool files using code_review.mdc checklist
   - Review: handler function, test file, schema registration
   - Log: "Manual review complete: [approved/rejected] with [N] issues found"
   - List any issues found
   - If rejected with critical issues: Stop and report (do not commit)

10. **[STEP 10/12]** Log: "Fixing any issues..."
    - Fix any issues found during review or testing
    - Log: "Issues fixed: [list of fixes]"
    - If critical issues remain after 2 fix attempts: Stop and report

11. **[STEP 11/12]** Log: "Staging files and running preflight..."
    - Follow commit workflow in git.mdc (see `.cursor/rules/git.mdc` for details):
      - Stage files: `git add [files]`
      - Run: `npm run preflight`
      - Log: "Preflight complete: [passed/failed]"
      - If preflight fails: Log errors and stop (do not commit)
      - If passed, commit: `git commit -m "feat(tools): add [tool_name] tool"`
      - Log: "Committed: [commit_hash]"

12. **[STEP 12/12]** Log: "Running automatic code review..."
    - Automatically trigger review_pr command to review the committed changes
    - Log: "Review complete: [approved/rejected] with [N] issues found"

## Step Structure

- **Steps 1-7**: Implementation (7 steps)
- **Steps 8-9**: Quality checks (2 steps - parallel execution in step 8)
- **Step 10**: Fix issues (1 step)
- **Step 11**: Commit (1 step - follows git.mdc workflow, see `.cursor/rules/git.mdc`)
- **Step 12**: Post-commit review (1 step)

**Total**: 12 steps (optimized from 13 by parallelizing quality checks)

Follow patterns in tools.mdc, errors.mdc, and testing.mdc.

## Example

If checklist has:
```
- [x] `delete_file` - Delete a file. ✅ **DONE**
- [ ] `move_file` - Move or rename a file from one path to another.
```

Then implement: `move_file` with description "Move or rename a file from one path to another."

## Execution Logging

**Always log progress clearly** so the user can see what's happening:
- Use `[STEP X/Y]` prefix for each major step
- Log before starting each step: `[STEP X/Y] Starting: [description]...`
- Log results after each step completes: `[STEP X/Y] Complete: [result summary]`
- Show command output: When running commands (npm, git, etc.), show relevant output
- Show summaries: Display scores, issue counts, test results, commit hashes
- If errors occur: Log them clearly with context
- Progress tracking: Use todo_write to track progress through steps

## Review Process

After implementation, the command automatically runs:

1. **Automated Review** (`npm run review`): Static analysis that checks for:
   - Security issues (path traversal, shell injection, secrets)
   - Performance issues (sync I/O, sequential async)
   - Code quality (any types, missing docs)
   - Error handling (throw statements)
   - Testing (missing tests)
   - Documentation (missing JSDoc)

2. **Manual Review** (Reviewer role): Systematic review using code_review.mdc checklist:
   - Review handler function for security, error handling, and patterns
   - Review test file for coverage and edge cases
   - Review schema registration for correctness
   - Provide specific, actionable feedback

3. **Testing**: Run tests to verify implementation works

4. **Fix Issues**: Address any issues found during review or testing

5. **Commit**: Stage files, run preflight, and commit following git.mdc conventions

## Why Automatic Review?

- **Automated Review** catches obvious issues quickly (security, patterns)
- **Manual Review** catches subtle issues and ensures code quality
- **Testing** ensures the tool works correctly
- **Quality Gate** ensures all tools meet project standards before commit

## Error Handling

If any step fails:

1. **Non-critical errors** (e.g., missing JSDoc, minor style issues):
   - Log warning with context
   - Continue to next step
   - Fix in step 11 (Fixing issues)

2. **Critical errors** (e.g., test failures, preflight failures, security issues):
   - Log error clearly with context
   - Stop execution
   - Provide actionable error message with suggestions
   - Do NOT commit if critical errors exist

3. **File not found errors**:
   - Checklist file missing: Log error and exit
   - Source file missing: Log error and exit
   - Test file missing: Create it in step 6

4. **Validation errors**:
   - Tool name invalid: Log error with expected format and exit
   - Schema validation fails: Log error with details and exit

## Loop Termination

- **Success**: Tool implemented, all checks pass, committed successfully
- **Empty**: No unchecked tools found (log "All tools complete" and exit)
- **Error**: Critical error encountered (log error and exit)
- **Limit**: Maximum 5 tools per run (to avoid overwhelming output) - log "Reached limit" and exit

## Performance Optimizations

1. **Checklist Caching**: Checklist is read once and cached in memory for subsequent tools
2. **Parallel Quality Checks**: Automated review and tests run in parallel (step 8)
3. **Early Exit**: Stop immediately on critical errors to avoid wasted work

## Security Note

This command should only be used in trusted codebases. It will:
- Modify source code files
- Execute git commands
- Run npm scripts
- Potentially commit changes

Verify you're in the correct repository before proceeding.

