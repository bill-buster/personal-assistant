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

