# Quick Reference: Adding Tools with `/impl_add_tool`

## 5-Step Checklist

### ✅ Step 1: Zod Schema (`src/core/types.ts`)
```typescript
// Define schema
export const MyToolSchema = z.object({
    field: z.string().min(1),
    optional: z.number().optional(),
});
export type MyToolArgs = z.infer<typeof MyToolSchema>;

// Add to registry
export const ToolSchemas: Record<string, z.ZodTypeAny> = {
    // ... existing
    my_tool: MyToolSchema,
};
```

### ✅ Step 2: Handler Function (`src/tools/[category]_tools.ts`)
```typescript
export function handleMyTool(args: MyToolArgs, context: ExecutorContext): ToolResult {
    const { paths, start } = context;
    
    // Validate path (if file operation)
    let targetPath: string;
    try {
        targetPath = paths.resolveAllowed(args.path, 'read');
    } catch {
        return {
            ok: false,
            error: makePermissionError(/* ... */),
            _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
        };
    }
    
    // Implementation...
    
    return {
        ok: true,
        result: { /* ... */ },
        error: null,
        _debug: makeDebug({ path: 'tool_json', start, model: null, memory_read: false, memory_write: false }),
    };
}
```

### ✅ Step 3: Register Handler (`src/core/tool_registry.ts`)
```typescript
// Import
import { handleMyTool } from '../tools/[category]_tools';

// Add to map
const TOOL_HANDLERS: Record<string, ToolHandler> = {
    // ... existing
    my_tool: handleMyTool,
};
```

### ✅ Step 4: Add to Agent (`src/agents/index.ts`)
```typescript
const READY_TOOLS = [
    // ... existing
    'my_tool',
];
```

### ✅ Step 5: Add ToolSpec (`src/tools/schemas.ts`)
```typescript
export const TOOL_SCHEMAS: Record<string, ToolSpec> = {
    // ... existing
    my_tool: {
        status: 'ready',
        description: 'What this tool does.',
        required: ['field'],
        parameters: {
            field: { type: 'string', description: 'Field description.' },
        },
    },
};
```

## File Locations by Tool Type

| Tool Type | Handler File | Examples |
|-----------|--------------|----------|
| File ops | `src/tools/file_tools.ts` | `read_file`, `write_file`, `delete_file` |
| Git ops | `src/tools/git_tools.ts` | `git_status`, `git_diff`, `git_commit` |
| Memory | `src/tools/memory_tools.ts` | `remember`, `recall`, `memory_add` |
| Tasks | `src/tools/task_tools.ts` | `task_add`, `task_list`, `task_done` |
| Utility | `src/tools/utility_tools.ts` | `calculate`, `get_time`, `get_weather` |
| Comm | `src/tools/comms_tools.ts` | `email_send`, `message_send` |
| Productivity | `src/tools/productivity_tools.ts` | `contact_add`, `calendar_event_add` |

## Critical Patterns

### ❌ Never Do This
```typescript
throw new Error('...');  // Never throw
const path = path.join(baseDir, userInput);  // Never construct paths directly
fs.readFileSync(userPath);  // Never use raw fs without validation
```

### ✅ Always Do This
```typescript
return { ok: false, error: makeError(ErrorCode.EXEC_ERROR, '...') };  // Return errors
const safePath = paths.resolveAllowed(args.path, 'read');  // Use capability API
// Use context.paths, context.commands, context.readJsonl, etc.
```

## Common Zod Patterns

```typescript
// Required string
z.string().min(1)

// Optional with default
z.string().optional().default('')

// Number with bounds
z.number().int().min(0).max(100)

// Enum
z.enum(['low', 'medium', 'high'])

// Boolean
z.boolean().optional()
```

## Confirmation Pattern

```typescript
// Check BEFORE path validation
if (requiresConfirmation('tool_name') && args.confirm !== true) {
    return {
        ok: false,
        error: makeConfirmationError('tool_name', permissionsPath),
    };
}
```

## Test Template

```typescript
import { describe, it, expect } from '../test_runner';
import { handleMyTool } from './[category]_tools';
import { createMockContext } from '../test_utils';

describe('handleMyTool', () => {
    it('should succeed with valid args', () => {
        const context = createMockContext();
        const result = handleMyTool({ field: 'value' }, context);
        expect(result.ok).toBe(true);
    });

    it('should fail with invalid path', () => {
        const context = createMockContext();
        const result = handleMyTool({ path: '../../etc/passwd' }, context);
        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('DENIED_PATH_ALLOWLIST');
    });
});
```

## Quick Commands

```bash
# Test your tool
npm test src/tools/[tool_name]_tools.test.ts

# Test in REPL
npm run dev:watch

# Run preflight
npm run preflight
```

## See Also

- Full guide: `docs/ADDING_TOOLS_GUIDE.md`
- Patterns: `.cursor/rules/tools.mdc`
- Errors: `.cursor/rules/errors.mdc`
- Security: `.cursor/rules/security.mdc`

