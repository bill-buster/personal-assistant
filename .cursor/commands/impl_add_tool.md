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

**IMPORTANT**: Log each step clearly so the user can see progress. Use format: `[STEP X/Y] Description...`

Implement the selected tool end-to-end, then automatically review and test:

**Implementation:**
1. **[STEP 1/12]** Log: "Reading checklist to find next tool..."
   - Read `docs/TOOL_IMPLEMENTATION_CHECKLIST.md` and find first unchecked tool
   - Log: "Found tool: [tool_name] - [description]"

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
8. **[STEP 8/12]** Log: "Running automated code review..."
   - Run: `npm run review src/tools/[tool_name]_tools.ts`
   - Log: "Automated review complete: [score]/100, [issues] issues found"
   - Show summary of issues if any

9. **[STEP 9/12]** Log: "Running manual code review (Reviewer role)..."
   - Switch to Reviewer role and systematically review the new tool files using code_review.mdc checklist
   - Review: handler function, test file, schema registration
   - Log: "Manual review complete: [approved/rejected] with [N] issues found"
   - List any issues found

10. **[STEP 10/12]** Log: "Running tests..."
    - Run: `npm test src/tools/[tool_name]_tools.test.ts`
    - Log: "Tests complete: [passed/failed], [N] tests"

11. **[STEP 11/12]** Log: "Fixing any issues..."
    - Fix any issues found during review or testing
    - Log: "Issues fixed: [list of fixes]"

12. **[STEP 12/12]** Log: "Staging files and running preflight..."
    - Stage files: `git add [files]`
    - Run: `npm run preflight`
    - Log: "Preflight complete: [passed/failed]"
    - If passed, commit: `git commit -m "feat(tools): add [tool_name] tool"`
    - Log: "Committed: [commit_hash]"

13. **[STEP 13/13]** Log: "Running automatic code review..."
    - Automatically trigger review_pr command to review the committed changes
    - Log: "Review complete: [approved/rejected] with [N] issues found"

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

