**Status**: Reference-only  
**Canonical**: [docs/ARCHITECTURE.md](ARCHITECTURE.md) for current architecture, [docs/DECISIONS.md](DECISIONS.md) for design decisions

---

# Complete Codebase Explanation

*This document is kept for historical reference. Current architecture information is in [ARCHITECTURE.md](ARCHITECTURE.md) and [DECISIONS.md](DECISIONS.md).*

## Overview: What This System Does

This is a **local-first CLI assistant** that routes natural language commands to executable tools with optional LLM fallback. It's designed as a secure, extensible system that can work offline (with regex/heuristic routing) or with LLM assistance when API keys are configured.

### Core Functionality

1. **Natural Language Routing**: Takes user input like "remember: meeting at 3pm" or "read file.txt" and routes it to the appropriate tool
2. **Multi-Stage Routing**: Uses a cascading strategy: Regex → Heuristic Parsers → LLM Fallback
3. **Secure Tool Execution**: Executes tools in a sandboxed environment with path and command allowlists
4. **Local-First Storage**: Uses JSONL files for persistence (memory, tasks, reminders, etc.)
5. **Agent System**: Supports role-based tool access (system agents, user agents, worker agents)

---

## Architecture: How It Works

### High-Level Flow

```
User Input → CLI/REPL → Router → Executor → Tool Handler → Result
                ↓
         (Multi-stage routing)
         Regex → Heuristic → LLM
```

### 1. Entry Points

#### CLI (`src/app/cli.ts`)
- **Purpose**: Command-line interface for the assistant
- **Key Functions**:
  - Parses command-line arguments
  - Routes commands through `routeAndExecute()`
  - Handles special commands (logs, cache, generate, etc.)
  - Formats output (JSON or human-readable)

**Key Pattern**: Most commands are routed through the router, but some (like `audit`, `logs stats`) are handled directly for performance.

```12:14:src/app/cli.ts
import {
    Executor,
    printResult,
    setHumanMode,
```

#### REPL (`src/app/repl.ts`)
- **Purpose**: Interactive mode for conversational use
- **Features**: History, streaming responses, agent loops

#### Web Dashboard (`src/app/web/`)
- **Purpose**: Browser-based interface
- **Tech**: Simple HTTP server with static HTML/CSS/JS

### 2. Routing System (`src/app/router.ts`)

The router is the **brain** of the system. It implements a multi-stage routing strategy:

#### Stage 1: Regex Fast Path
- **Purpose**: Ultra-fast matching for common patterns
- **Examples**: `remember:`, `recall:`, `read file.txt`, `git status`
- **Performance**: O(1) regex matching, no LLM calls
- **Code Location**: Lines 115-320 in `router.ts`

```115:125:src/app/router.ts
// Pre-compiled regex patterns for fast-path matching (V8 optimization)
const RE_REMEMBER = /^remember:\s+([\s\S]+)$/i;
const RE_RECALL = /^recall:\s+([\s\S]+)$/i;
const RE_WRITE = /^write\s+(\S+)\s+([\s\S]+)$/i;
const RE_READ_URL = /^(?:read\s+url\s+(\S+)|read\s+(https?:\/\/\S+))$/i;
const RE_READ = /^read\s+((?!https?:\/\/)\S+)\s*$/i; // Exclude http/https
const RE_LIST = /^list(\s+files)?$/i;
const RE_RUN_CMD = /^(?:run\s+)?(ls|pwd|cat|du)\s*([\s\S]*)$/i;
const RE_TIME = /^(?:what time is it|current time|time now|what's the time|time|date)$/i;
const RE_CALC = /^(?:calculate|calc|compute|eval|math)[:\s]+(.+)$/i;
const RE_GIT = /^git\s+(status|diff|log)(?:\s+(.*))?$/i;
```

#### Stage 2: Heuristic Parsers
- **Purpose**: Pattern-based parsing for structured commands
- **Parsers**:
  - `heuristic_parser.ts`: General command patterns
  - `task_parser.ts`: Task management commands
  - `memory_parser.ts`: Memory/recall commands
- **Performance**: Fast, no LLM needed
- **Code Location**: Lines 322-408 in `router.ts`

#### Stage 3: LLM Fallback
- **Purpose**: Handle complex, ambiguous, or novel commands
- **When Used**: When regex and heuristics don't match
- **Provider**: Groq, OpenRouter, or Mock (for testing)
- **Features**:
  - Tool calling (LLM selects tool + args)
  - Conversational replies (when no tool matches)
  - Token usage tracking
  - Response caching
- **Code Location**: Lines 410-523 in `router.ts`

#### Agent Permission Checks
- **Critical**: Router checks agent permissions BEFORE proposing tools
- **Why**: Prevents router from suggesting tools executor will deny
- **Code Location**: Lines 221-229 in `router.ts`

```221:229:src/app/router.ts
    const isToolAllowed = (toolName: string): boolean => {
        if (!agent) {
            // No agent: only allow safe tools (informational only, no filesystem/shell/network)
            // This prevents router from proposing tools that executor will deny
            return (SAFE_TOOLS as readonly string[]).includes(toolName);
        }
        // Agent provided: check agent's tool permissions
        return agent.tools.includes(toolName);
    };
```

### 3. Execution System (`src/core/executor.ts`)

The executor is the **security enforcer** and **tool dispatcher**.

#### Security Layers

1. **Agent Permissions** (Lines 565-635)
   - System agents: Full access (trusted)
   - User/Worker agents: Explicit tool allowlist
   - No agent: Only `SAFE_TOOLS` allowed

2. **Global Deny List** (Lines 594-611)
   - `permissions.deny_tools`: Explicitly blocked tools
   - Overrides agent permissions

3. **Path Validation** (Lines 131-202)
   - `safeResolve()`: Prevents path traversal (`..`), absolute paths
   - `isAllowedPath()`: Checks against `allow_paths` allowlist
   - Blocks sensitive directories (`.git`, `.env`, `node_modules`)

4. **Command Validation** (Lines 338-562)
   - Only allows commands in `allow_commands` list
   - Validates flags for `ls`, `cat`, `du`
   - Path validation for command arguments

5. **Argument Validation** (Lines 637-662)
   - Zod schema validation for all tool arguments
   - Type-safe argument parsing

#### Tool Execution Flow

```564:730:src/core/executor.ts
    public async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
        // 1. Enforce agent permissions BEFORE any execution
        if (this.agent) {
            // System agents (kind='system') get access to all tools (for CLI usage)
            // Check by kind to prevent spoofing via name string
            if (this.agent.kind === 'system') {
                // Allow any tool that exists in TOOL_HANDLERS
                // deny_tools still applies (checked below)
            } else {
                // Other agents: check allowlist
                if (!this.agent.tools.includes(toolName)) {
                    return {
                        ok: false,
                        result: null,
                        error: makeError(
                            DENIED_AGENT_TOOLSET,
                            `Permission denied: agent '${this.agent.name}' cannot use tool '${toolName}'`
                        ),
                        _debug: makeDebug({
                            path: 'tool_json',
                            start: nowMs(),
                            model: null,
                            memory_read: false,
                            memory_write: false,
                        }),
                    };
                }
            }
        }

        // 2. Enforce global Deny List
        if (this.permissions.deny_tools.includes(toolName)) {
            return {
                ok: false,
                result: null,
                error: makeError(
                    DENIED_TOOL_BLOCKLIST,
                    `Tool '${toolName}' is explicitly denied in permissions configuration.`
                ),
                _debug: makeDebug({
                    path: 'tool_json',
                    start: nowMs(),
                    model: null,
                    memory_read: false,
                    memory_write: false,
                }),
            };
        }

        // 3. No agent: enforce minimal safe default (fail-closed security)
        if (!this.agent) {
            // Sensitive tools: filesystem, shell, network, data modification
            // All other tools are denied when no agent is provided
            // Type assertion needed because SAFE_TOOLS is a const array with literal types
            if (!(SAFE_TOOLS as readonly string[]).includes(toolName)) {
                return {
                    ok: false,
                    result: null,
                    error: makeError(
                        ErrorCode.DENIED_AGENT_TOOLSET,
                        `Permission denied: tool '${toolName}' requires agent context`
                    ),
                    _debug: makeDebug({
                        path: 'tool_json',
                        start: nowMs(),
                        model: null,
                        memory_read: false,
                        memory_write: false,
                    }),
                };
            }
        }

        // 4. Validate args with Zod Schema if available
        const schema = this.registry.getSchema(toolName);
        let validatedArgs: Record<string, unknown> = args;

        if (schema) {
            const parseResult = schema.safeParse(args || {});
            if (!parseResult.success) {
                return {
                    ok: false,
                    result: null,
                    error: makeError(
                        ErrorCode.VALIDATION_ERROR,
                        `Invalid arguments for ${toolName}: ${parseResult.error.message}`
                    ),
                    _debug: makeDebug({
                        path: 'tool_json',
                        start: nowMs(),
                        model: null,
                        memory_read: false,
                        memory_write: false,
                    }),
                };
            }
            // After safeParse success, data is validated and can be safely cast
            validatedArgs = parseResult.data as Record<string, unknown>;
        }

        // 5. Build context
        const context: ExecutorContext = {
            start: nowMs(),
            baseDir: this.baseDir,
            memoryPath: this.memoryPath,
            memoryLimit: this.memoryLimit,
            tasksPath: this.tasksPath,
            memoryLogPath: this.memoryLogPath,
            remindersPath: this.remindersPath,
            emailsPath: this.emailsPath,
            messagesPath: this.messagesPath,
            contactsPath: this.contactsPath,
            calendarPath: this.calendarPath,
            permissionsPath: this.permissionsPath,
            auditPath: this.auditPath,
            auditEnabled: this.auditEnabled,
            permissions: this.permissions,
            limits: this.limits,
            requiresConfirmation: this.requiresConfirmation.bind(this),
            // Capability-based API
            paths: this.createPathCapabilities(),
            commands: this.createCommandCapabilities(),
            readMemory,
            writeMemory,
            readJsonl: this.readJsonl.bind(this),
            writeJsonl: this.writeJsonl.bind(this),
            appendJsonl: this.appendJsonl.bind(this),
            scoreEntry: this.scoreEntry.bind(this),
            sortByScoreAndRecency: this.sortByScoreAndRecency.bind(this),
        };

        const handler = this.registry.getHandler(toolName);
        if (handler) {
            const result = await Promise.resolve(handler(validatedArgs, context));
            // Fail-closed: ensure handler always returns a ToolResult
            if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean') {
                return {
                    ok: false,
                    result: null,
                    error: makeError(
                        ErrorCode.EXEC_ERROR,
                        `Internal error: tool '${toolName}' returned no result`
                    ),
                    _debug: makeDebug({
                        path: 'tool_json',
                        start: nowMs(),
                        model: null,
                        memory_read: false,
                        memory_write: false,
                    }),
                };
            }
            this.logAudit(toolName, validatedArgs, result);
            return result;
        }
        // Build dynamic list of common tools (first 6) for suggestion
        const availableTools = this.registry.listTools().slice(0, 6).join(', ');
        return {
            ok: false,
            result: null,
            error: makeError(
                ErrorCode.UNKNOWN_TOOL,
                `Unknown tool '${toolName}'. Try: ${availableTools}. Use /tools in REPL for full list.`
            ),
            _debug: null,
        };
    }
```

### 4. Tool Registry (`src/core/tool_registry.ts`)

**Purpose**: Central registry for all tool handlers and schemas.

**Key Features**:
- **Dependency Injection**: Tools don't import each other
- **Plugin Support**: Loads external tools from `~/.assistant/plugins/`
- **Schema Validation**: Maps tool names to Zod schemas

**Pattern**: Registry pattern - single source of truth for tool availability.

```65:85:src/core/tool_registry.ts
class NodeToolRegistry implements ToolRegistry {
    private handlers: Record<string, ToolHandler>;
    private schemas: Record<string, z.ZodTypeAny>;

    constructor(handlers: Record<string, ToolHandler>, schemas: Record<string, z.ZodTypeAny>) {
        this.handlers = handlers;
        this.schemas = schemas;
    }

    getHandler(toolName: string): ToolHandler | undefined {
        return this.handlers[toolName];
    }

    getSchema(toolName: string): z.ZodTypeAny | undefined {
        return this.schemas[toolName];
    }

    listTools(): string[] {
        return Object.keys(this.handlers);
    }
}
```

### 5. Runtime Composition (`src/runtime/runtime.ts`)

**Purpose**: Dependency injection container - wires all components together.

**Key Principle**: Single composition root - all dependencies created in one place.

```99:161:src/runtime/runtime.ts
export function buildRuntime(config: ResolvedConfig, options: BuildRuntimeOptions = {}): Runtime {
    // 1. Build tool registry (handlers + schemas)
    const registry = createNodeToolRegistry();

    // 2. Build executor config
    // If specific storage paths aren't provided in options, use the ones from resolved config.
    // ResolvedConfig.storage already contains absolute paths.
    const executorConfig: ExecutorConfig = {
        baseDir: config.fileBaseDir,
        limits: config.limits,
        registry,
        agent: options.agent ?? SYSTEM,
        memoryPath:
            options.storagePaths?.memory ??
            path.resolve(config.storage.baseDir, config.storage.memory),
        tasksPath:
            options.storagePaths?.tasks ??
            path.resolve(config.storage.baseDir, config.storage.tasks),
        remindersPath:
            options.storagePaths?.reminders ??
            path.resolve(config.storage.baseDir, config.storage.reminders),
        memoryLogPath:
            options.storagePaths?.memoryLog ??
            path.resolve(config.storage.baseDir, config.storage.memoryLog),
        permissionsPath: options.permissionsPath,
        memoryLimit: options.memoryLimit,
        auditEnabled: options.auditEnabled,
    };

    // 3. Create executor
    const executor = new Executor(executorConfig);

    // 4. Create LLM provider if requested and API keys are configured
    let provider: LLMProvider | undefined;
    const includeProvider = options.includeProvider ?? true;
    if (includeProvider) {
        const hasApiKeys = Object.values(config.apiKeys).some(key => !!key);
        if (hasApiKeys) {
            try {
                provider = createProvider(config);
            } catch {
                // Provider creation failed (e.g., missing key for selected provider)
                // This is OK - we just won't have LLM fallback
                provider = undefined;
            }
        }
    }

    // 5. Create command logger
    const commandLogPath = path.resolve(config.storage.baseDir, 'command_log.jsonl');
    const commandLogger = new CommandLogger(commandLogPath, true);

    // 6. Return runtime with all dependencies
    return {
        config,
        registry,
        executor,
        provider,
        toolSchemas: TOOL_SCHEMAS,
        defaultAgent: SYSTEM,
        commandLogger,
    };
}
```

### 6. Storage System

#### JSONL Files (`src/storage/jsonl.ts`)
- **Format**: One JSON object per line (append-only)
- **Files**: `memory.jsonl`, `tasks.jsonl`, `reminders.jsonl`, `audit.jsonl`, `command_log.jsonl`
- **Operations**: Atomic writes, safe reads, recovery on corruption

#### Memory Store (`src/storage/memory_store.ts`)
- **Purpose**: Semantic search over memory entries
- **Algorithm**: Term frequency scoring + recency sorting
- **Storage**: JSON file (not JSONL) for full-text search

### 7. Type System (`src/core/types.ts`)

**Key Types**:

- **`ToolResult`**: Discriminated union for tool execution results
  ```typescript
  export type ToolResult =
      | { ok: true; result: any; _debug?: DebugInfo | null }
      | { ok: false; error: ToolError; _debug?: DebugInfo | null };
  ```

- **`RouteResult`**: Discriminated union for routing outcomes
  ```typescript
  export type RouteResult = RouteError | RouteToolCall | RouteReply;
  ```

- **`ExecutorContext`**: Capability-based API for tools
  - `paths`: Path resolution and validation
  - `commands`: Command execution
  - Storage helpers: `readJsonl`, `writeJsonl`, `appendJsonl`

- **Zod Schemas**: Runtime validation for all tool arguments
  - Defined in `types.ts` (lines 335-589)
  - Exported as `ToolSchemas` registry

---

## Design Decisions: Why It's Structured This Way

### 1. Multi-Stage Routing

**Why**: Performance + Flexibility
- **Regex**: Fastest path for common commands (no LLM cost)
- **Heuristics**: Pattern matching for structured commands
- **LLM**: Handles ambiguity and novel commands

**Trade-off**: More complex code, but better UX (fast when possible, smart when needed)

### 2. Fail-Closed Security

**Why**: Security by default
- **No agent = minimal access**: Only `SAFE_TOOLS` allowed
- **Explicit allowlists**: Paths, commands, tools must be explicitly allowed
- **Deny list overrides**: Can block specific tools even if agent allows

**Trade-off**: More configuration required, but safer by default

### 3. Capability-Based API

**Why**: Encapsulation + Testability
- Tools don't call `safeResolve()` directly
- Tools use `context.paths.resolveAllowed()` instead
- Makes testing easier (mock capabilities)

**Pattern**: Dependency injection via context object

### 4. Throw-Based Path API

**Why**: Historical reasons (legacy code)
- Path capabilities throw errors (not return `{ ok: false }`)
- Tools catch and convert to `ToolResult`
- **Future**: Should convert to return-based API (see comment in executor.ts:204-217)

### 5. Local-First Storage

**Why**: Privacy + Offline Support
- No cloud dependencies
- JSONL files are human-readable
- Easy to backup/restore

**Trade-off**: No sync across devices, but better privacy

### 6. Composition Root Pattern

**Why**: Dependency Injection
- Single place (`runtime.ts`) wires all dependencies
- Easy to test (inject mocks)
- Clear dependency graph

### 7. Zod Everywhere

**Why**: Runtime Validation
- TypeScript types are compile-time only
- Zod validates at runtime (catches bad data)
- Single source of truth: Schema → Type (via `z.infer`)

### 8. Discriminated Unions

**Why**: Type Safety
- `RouteResult` = `RouteError | RouteToolCall | RouteReply`
- Type guards (`isRouteError`, `isRouteToolCall`) for runtime checks
- Prevents invalid state (can't have both `error` and `tool_call`)

---

## Potential Issues & Improvements

### 1. Path API Inconsistency

**Issue**: Path capabilities use throw-based API, but tools return `ToolResult`
- **Location**: `executor.ts:204-217`
- **Impact**: Inconsistent error handling patterns
- **Fix**: Convert to return-based API (non-trivial refactor)

### 2. Tool Filter Cache Growth

**Issue**: `toolFilterCache` in router can grow unbounded
- **Location**: `router.ts:129-175`
- **Current**: FIFO eviction when size > 50
- **Improvement**: LRU cache or TTL-based eviction

### 3. JSONL File Growth

**Issue**: Log files (`command_log.jsonl`, `audit.jsonl`) grow indefinitely
- **Current**: No rotation
- **Improvement**: Add log rotation (daily/weekly) or size-based pruning

### 4. Memory Search Performance

**Issue**: Linear scan through all memory entries
- **Location**: `executor.ts:294-336`
- **Impact**: Slow for large memory stores (>1000 entries)
- **Improvement**: Use embeddings + vector search (infrastructure exists in `embeddings/`)

### 5. LLM Token Usage

**Issue**: No automatic cost tracking or limits
- **Current**: Token usage logged, but no alerts
- **Improvement**: Add budget limits, cost alerts

### 6. Plugin System Limitations

**Issue**: Plugin schemas converted to Zod (simplified)
- **Location**: `tool_registry.ts:173-218`
- **Impact**: Some ToolSpec features may not convert correctly
- **Improvement**: Full ToolSpec → Zod converter

### 7. Test Coverage

**Issue**: Some files have 0% coverage (scripts, test tools)
- **Current**: 50.8% average coverage
- **Improvement**: Add tests for critical paths (executor, router)

### 8. Error Messages

**Issue**: Some error messages reference internal paths
- **Example**: "See permissions.json" (user may not know where this is)
- **Improvement**: Include full path in error messages

---

## Related Patterns in the Codebase

### 1. Result Pattern

**Used Everywhere**: `{ ok: boolean, result?, error? }`
- **Files**: All tool handlers, router, executor
- **Why**: Consistent error handling, no exceptions for control flow

### 2. Type Guards

**Pattern**: `isRouteError()`, `isRouteToolCall()`, `isRouteReply()`
- **Purpose**: Narrow discriminated union types
- **Location**: `types.ts:315-331`

### 3. Schema-First Types

**Pattern**: Define Zod schema, derive TypeScript type
```typescript
export const WriteFileSchema = z.object({ ... });
export type WriteFileArgs = z.infer<typeof WriteFileSchema>;
```
- **Why**: Single source of truth, runtime validation

### 4. Factory Functions

**Pattern**: `createNodeToolRegistry()`, `createProvider()`, `buildRuntime()`
- **Purpose**: Encapsulate construction logic
- **Benefit**: Easy to test, clear dependencies

### 5. Capability Injection

**Pattern**: `ExecutorContext` provides capabilities, not direct access
- **Example**: `context.paths.resolveAllowed()` instead of `executor.safeResolve()`
- **Why**: Testability, encapsulation

### 6. Plugin Architecture

**Pattern**: Load plugins from `~/.assistant/plugins/`
- **Location**: `core/plugin_loader.ts`
- **Features**: Tool registration, schema merging
- **Extension Point**: Users can add custom tools

### 7. Caching Strategy

**Patterns**:
- **LLM Cache**: `FileCache` for response caching (`core/cache.ts`)
- **Test Cache**: `TestCache` for test results (`core/test_cache.ts`)
- **Stat Cache**: File stat caching (`core/stat_cache.ts`)
- **Tool Filter Cache**: Router tool filtering (`router.ts:129`)

### 8. Logging Strategy

**Patterns**:
- **Command Log**: User queries + routing + execution (`core/command_log.ts`)
- **Audit Log**: Tool execution only (`executor.ts:735-757`)
- **Debug Info**: Attached to results (`core/debug.ts`)

### 9. Configuration Priority

**Pattern**: Environment > Config File > Defaults
- **Location**: `core/config.ts`
- **Example**: `GROQ_API_KEY` env var overrides `config.json`

### 10. Validation at Boundaries

**Pattern**: Validate at entry points (CLI, REPL, router)
- **Location**: `parsers/validator.ts`
- **Why**: Fail fast, clear error messages

---

## Key Files Reference

| File | Purpose | Key Concepts |
|------|---------|--------------|
| `src/app/cli.ts` | CLI entry point | Command parsing, routing, output formatting |
| `src/app/router.ts` | Intent routing | Multi-stage routing, agent permissions |
| `src/core/executor.ts` | Tool execution | Security, validation, capability injection |
| `src/core/types.ts` | Type definitions | Discriminated unions, Zod schemas |
| `src/runtime/runtime.ts` | Composition root | Dependency injection, wiring |
| `src/core/tool_registry.ts` | Tool registry | Handler dispatch, plugin loading |
| `src/core/config.ts` | Configuration | Config loading, path resolution |
| `src/storage/jsonl.ts` | JSONL storage | Atomic writes, safe reads |
| `src/tools/file_tools.ts` | File operations | Example tool implementation |

---

## Summary

This codebase implements a **secure, extensible, local-first CLI assistant** with:

1. **Multi-stage routing** for performance (regex → heuristic → LLM)
2. **Fail-closed security** with explicit allowlists
3. **Capability-based API** for testability
4. **Type-safe validation** with Zod schemas
5. **Plugin architecture** for extensibility
6. **Local-first storage** for privacy

The architecture prioritizes **security**, **performance**, and **extensibility** while maintaining a clean separation of concerns through dependency injection and capability-based APIs.

