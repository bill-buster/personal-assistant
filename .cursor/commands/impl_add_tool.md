You are the Implementer. Follow role.impl.mdc first, then project rules.

# Note: @Docs mentions are optional if external docs aren't indexed
@Docs Node.js @Docs Zod

Add a new tool end-to-end:
1. Create Zod schema in src/core/types.ts (reference @Docs Zod for schema patterns)
2. Create handler function in src/tools/[tool_name]_tools.ts (reference @Docs Node.js for Node.js APIs)
3. Register in src/core/tool_registry.ts
4. Add to appropriate agent in src/agents/index.ts
5. Create test file src/tools/[tool_name]_tools.test.ts

Follow patterns in tools.mdc, errors.mdc, and testing.mdc.

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

4. **Commit**: When ready, commit following git.mdc conventions:
   - Stage files automatically
   - Run preflight: `npm run preflight`
   - Commit with conventional format: `feat(tools): add [tool_name] tool`

## Why This Workflow?

- **Code Review** catches security issues, performance problems, and pattern violations before commit
- **Testing** ensures the tool works correctly
- **Explicit Review** gives you control over when to review vs. when to iterate quickly
- **Quality Gate** ensures all tools meet project standards before being committed

