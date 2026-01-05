# Plugin System

The Personal Assistant supports loading external tools via plugins. This allows you to extend functionality without modifying the core codebase.

## Plugin Structure

Plugins are located in `~/.assistant/plugins/`. Each plugin is a directory with:

```
~/.assistant/plugins/
├── my-plugin/
│   ├── package.json    # Plugin manifest
│   └── index.js        # Plugin implementation
```

## Plugin Manifest (package.json)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My custom tool plugin",
  "tools": [
    {
      "name": "my_tool",
      "handler": "handleMyTool",
      "schema": {
        "status": "ready",
        "description": "Does something useful",
        "required": ["arg1"],
        "parameters": {
          "arg1": {
            "type": "string",
            "description": "First argument"
          },
          "arg2": {
            "type": "integer",
            "description": "Optional second argument"
          }
        }
      }
    }
  ]
}
```

## Plugin Implementation (index.js)

```javascript
const { z } = require('zod');

/**
 * Tool handler function.
 * @param {object} args - Validated tool arguments
 * @param {object} context - Executor context with paths, start time, etc.
 * @returns {object} ToolResult with ok, result, error, _debug
 */
function handleMyTool(args, context) {
    const { arg1, arg2 } = args;
    const { paths, start } = context;

    // Your tool logic here
    const result = {
        message: `Processed ${arg1} with ${arg2 || 'default'}`,
        timestamp: new Date().toISOString(),
    };

    return {
        ok: true,
        result,
        error: null,
        _debug: {
            path: 'plugin_json',
            start,
            model: null,
            memory_read: false,
            memory_write: false,
        },
    };
}

module.exports = {
    handleMyTool,
};
```

## Tool Schema Format

The schema in `package.json` follows the `ToolSpec` format:

```typescript
{
  status?: 'ready' | 'stub' | 'experimental';
  description: string;
  required: string[];  // Array of required parameter names
  parameters: {
    [key: string]: {
      type: 'string' | 'integer' | 'number' | 'boolean';
      description: string;
      enum?: string[];  // Optional enum values
    };
  };
}
```

## Tool Handler Signature

```typescript
function handleTool(
    args: ToolArgs,
    context: ExecutorContext
): ToolResult | Promise<ToolResult>
```

### ExecutorContext

```typescript
interface ExecutorContext {
    paths: {
        resolveAllowed(path: string, operation: 'read' | 'write'): string;
        getDataDir(): string;
    };
    start: number;  // Timestamp in ms
    config: ResolvedConfig;
}
```

### ToolResult

```typescript
interface ToolResult {
    ok: boolean;
    result?: any;
    error?: ToolError | null;
    _debug?: DebugInfo | null;
}
```

## Example: Simple Calculator Plugin

### package.json

```json
{
  "name": "calculator",
  "version": "1.0.0",
  "description": "Advanced calculator operations",
  "tools": [
    {
      "name": "power",
      "handler": "handlePower",
      "schema": {
        "status": "ready",
        "description": "Calculate base raised to exponent",
        "required": ["base", "exponent"],
        "parameters": {
          "base": {
            "type": "number",
            "description": "Base number"
          },
          "exponent": {
            "type": "number",
            "description": "Exponent"
          }
        }
      }
    }
  ]
}
```

### index.js

```javascript
function handlePower(args, context) {
    const { base, exponent } = args;
    const { start } = context;

    const result = Math.pow(base, exponent);

    return {
        ok: true,
        result: { value: result },
        error: null,
        _debug: {
            path: 'plugin_json',
            start,
            model: null,
            memory_read: false,
            memory_write: false,
        },
    };
}

module.exports = { handlePower };
```

## Loading Plugins

Plugins are automatically loaded when the assistant starts. You can verify loaded plugins:

```bash
assistant plugins list
```

Output:
```json
{
  "plugins": [
    {
      "name": "calculator",
      "version": "1.0.0",
      "description": "Advanced calculator operations",
      "tools": ["power"]
    }
  ],
  "total": 1,
  "plugins_dir": "/Users/you/.assistant/plugins"
}
```

## Using Plugin Tools

Plugin tools are accessible via natural language in REPL mode:

```bash
assistant repl
> calculate 2 to the power of 8
```

Or via direct tool calls if the router matches them.

## Tool Naming

Plugin tools are prefixed with the plugin name to avoid conflicts:

- Plugin: `calculator`
- Tool: `power`
- Full name: `calculator_power`

## Built-in Tools Take Precedence

If a plugin tool conflicts with a built-in tool name, the built-in tool takes precedence. Use unique tool names in your plugins.

## Error Handling

If a plugin fails to load:
- The error is logged to console
- The assistant continues with built-in tools only
- Other plugins are still loaded

## Best Practices

1. **Use descriptive names** - Make tool names clear and unique
2. **Validate inputs** - Use Zod schemas for validation
3. **Handle errors gracefully** - Return proper ToolResult with error field
4. **Document your tools** - Include clear descriptions
5. **Test locally** - Test plugins before distributing
6. **Version your plugins** - Use semantic versioning

## Limitations

- Plugins must be CommonJS modules (`.js` files)
- TypeScript plugins need to be compiled first
- Plugins run in the same process (no isolation)
- Plugin tools cannot override built-in tools
- Streaming is not supported for plugin tools (use regular completion)

## Troubleshooting

### Plugin Not Loading

1. Check plugin directory exists: `~/.assistant/plugins/`
2. Verify `package.json` is valid JSON
3. Check `index.js` exports the handler function
4. Look for errors in console output

### Tool Not Found

1. Verify tool name matches schema name
2. Check handler function is exported correctly
3. Ensure tool name doesn't conflict with built-in tools
4. Use `assistant plugins list` to verify plugin loaded

### Validation Errors

1. Check schema matches ToolSpec format
2. Verify parameter types are correct
3. Ensure required fields are marked correctly

