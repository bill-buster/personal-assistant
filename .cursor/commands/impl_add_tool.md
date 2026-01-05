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

Implement the selected tool end-to-end:
1. Create Zod schema in src/core/types.ts (reference @Docs Zod for schema patterns)
2. Create handler function in src/tools/[tool_name]_tools.ts (reference @Docs Node.js for Node.js APIs)
3. Register in src/core/tool_registry.ts
4. Add to appropriate agent in src/agents/index.ts
5. Create test file src/tools/[tool_name]_tools.test.ts
6. **After implementation**: Update the checklist by marking the tool as done (`- [x]`)

Follow patterns in tools.mdc, errors.mdc, and testing.mdc.

## Example

If checklist has:
```
- [x] `delete_file` - Delete a file. ✅ **DONE**
- [ ] `move_file` - Move or rename a file from one path to another.
```

Then implement: `move_file` with description "Move or rename a file from one path to another."

## Recommended Workflow

After implementation, follow this workflow to ensure quality:

1. **Code Review**: Use `/review_pr` to review the new tool files systematically:
   - Review handler function for security, error handling, and patterns
   - Review test file for coverage and edge cases
   - Review schema registration for correctness

2. **Run Tests**: Verify the implementation works:
   ```bash
   npm test src/tools/[tool_name]_tools.test.ts
   ```

3. **Fix Issues**: Address any issues found during review or testing

4. **Update Checklist**: Mark the tool as done in `docs/TOOL_IMPLEMENTATION_CHECKLIST.md`:
   - Change `- [ ]` to `- [x]`
   - Add ✅ **DONE** marker if desired

5. **Commit**: When ready, commit following git.mdc conventions:
   - Stage files automatically (including updated checklist)
   - Run preflight: `npm run preflight`
   - Commit with conventional format: `feat(tools): add [tool_name] tool`

## Why This Workflow?

- **Code Review** catches security issues, performance problems, and pattern violations before commit
- **Testing** ensures the tool works correctly
- **Explicit Review** gives you control over when to review vs. when to iterate quickly
- **Quality Gate** ensures all tools meet project standards before being committed

