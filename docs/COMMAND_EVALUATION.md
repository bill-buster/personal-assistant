# Command Evaluation & Logging System

## Overview

The command evaluation and logging system tracks all user queries, routing decisions, and execution outcomes to enable comprehensive evaluation of what commands are working vs not working.

## Features

### 1. **Command Logging**

Every command executed through the CLI or REPL is logged with:
- **User input**: The original query/command
- **Routing information**: Which path was taken (regex, heuristic, LLM fallback)
- **Tool execution**: Which tool was called and whether it succeeded
- **Outcome classification**: Success, error, or partial
- **Performance metrics**: Latency, token usage (if LLM was used)
- **Correlation IDs**: For tracing requests across the system

### 2. **Log Storage**

Command logs are stored in JSONL format at:
```
~/.assistant-data/command_log.jsonl
```

Each entry is a JSON object with structured fields for easy analysis.

### 3. **Analytics & Metrics**

The system provides comprehensive statistics:
- **Overall success rate**: Percentage of successful commands
- **By category**: File operations, memory, tasks, queries, etc.
- **By routing path**: Regex fast path, heuristic parser, LLM fallback
- **By tool**: Success/failure rates per tool
- **LLM usage**: Token consumption and call frequency
- **Average latency**: Performance metrics

## Usage

### View Recent Commands

```bash
assistant logs recent
assistant logs recent --limit 20
```

### View Statistics

```bash
assistant logs stats
```

Shows:
- Total commands, success/error counts
- Success rate percentage
- Average latency
- Breakdown by category, routing path, and tool
- LLM usage statistics

### View Errors Only

```bash
assistant logs errors
assistant logs errors --limit 10
```

### Filter by Category

```bash
assistant logs --category file_operation
assistant logs --category memory
assistant logs --category task
```

### Filter by Tool

```bash
assistant logs --tool read_file
assistant logs --tool task_add
```

### Filter by Outcome

```bash
assistant logs --outcome error
assistant logs --outcome success
assistant logs --outcome partial
```

## Log Entry Structure

Each log entry contains:

```typescript
{
    ts: string;                    // ISO timestamp
    correlation_id: string;        // Unique request ID
    input: string;                 // User's original query
    intent?: string;               // Intent (e.g., 'spike')
    agent?: string;                // Agent name
    
    // Routing
    routing_path?: string;          // 'regex_fast_path', 'heuristic_parse', 'llm_fallback'
    routing_duration_ms?: number;
    routing_success: boolean;
    routing_error?: string;
    
    // Tool execution
    tool_name?: string;
    tool_args?: Record<string, unknown>;
    tool_success?: boolean;
    tool_error?: string;
    tool_duration_ms?: number;
    
    // LLM usage
    llm_model?: string;
    llm_tokens_prompt?: number;
    llm_tokens_completion?: number;
    llm_tokens_total?: number;
    
    // Reply mode
    reply_mode?: boolean;
    
    // Outcome
    outcome: 'success' | 'error' | 'partial';
    outcome_category?: string;      // 'file_operation', 'memory', 'task', etc.
}
```

## Integration Points

### CLI Integration

Command logging is automatically integrated into:
- `routeAndExecute()` function in `src/app/cli.ts`
- All CLI commands that route through the router

### REPL Integration

Command logging is automatically integrated into:
- REPL command processing in `src/app/repl.ts`
- All commands executed in interactive mode

### Runtime Integration

The `CommandLogger` is part of the runtime and is automatically initialized:
- Created in `buildRuntime()` in `src/runtime/runtime.ts`
- Available as `runtime.commandLogger` to all entry points

## Evaluation Workflow

### 1. **Collect Data**

Commands are automatically logged as they execute. No manual intervention needed.

### 2. **Review Statistics**

```bash
assistant logs stats
```

This shows:
- What percentage of commands succeed
- Which categories have the most errors
- Which routing paths are most effective
- Which tools have the highest failure rates

### 3. **Investigate Errors**

```bash
assistant logs errors --limit 20
```

Review recent errors to identify patterns:
- Common failure modes
- Tools that frequently fail
- Routing issues

### 4. **Analyze Performance**

```bash
assistant logs stats
```

Check:
- Average latency per category
- LLM token usage (cost tracking)
- Routing path efficiency

### 5. **Filter and Drill Down**

```bash
# See all file operation commands
assistant logs --category file_operation

# See all errors for a specific tool
assistant logs --tool write_file --outcome error

# See recent successful commands
assistant logs recent --outcome success --limit 10
```

## Best Practices

### Regular Review

Review logs regularly to:
- Identify failing commands early
- Track performance trends
- Optimize routing paths
- Improve tool reliability

### Error Analysis

When investigating errors:
1. Use `assistant logs errors` to see recent failures
2. Filter by category or tool to find patterns
3. Check routing paths - are LLM fallbacks too frequent?
4. Review tool-specific errors to improve handlers

### Performance Monitoring

Track:
- Average latency trends
- LLM token usage (costs)
- Routing path distribution (are fast paths working?)

### Category Classification

Commands are automatically classified into categories:
- `file_operation`: File read/write operations
- `memory`: Memory/recall operations
- `task`: Task management
- `git`: Git operations
- `command`: Shell command execution
- `calculation`: Math operations
- `query`: General queries (LLM replies)
- `web`: Web/URL operations
- `general`: Other operations

## Comparison with Audit Log

The **command log** (`command_log.jsonl`) is different from the **audit log** (`audit.jsonl`):

| Feature | Command Log | Audit Log |
|---------|------------|-----------|
| **Scope** | User queries + routing + execution | Tool execution only |
| **Includes** | Input, routing path, tool result, LLM usage | Tool name, args, result |
| **Purpose** | Evaluation, analytics, debugging | Security audit trail |
| **View** | `assistant logs` | `assistant audit` |

Both logs are useful:
- **Command log**: For understanding what users are trying to do and how well it works
- **Audit log**: For security auditing and compliance

## Future Enhancements

Potential improvements:
- Export logs to CSV/JSON for external analysis
- Time-based filtering (last 24 hours, last week, etc.)
- Success rate trends over time
- Alerting on error rate spikes
- Integration with monitoring dashboards

## Technical Details

### Implementation

- **Module**: `src/core/command_log.ts`
- **Class**: `CommandLogger`
- **Storage**: JSONL file (append-only)
- **Format**: One JSON object per line

### Performance

- Logging is non-blocking (async file writes)
- Failures are silently ignored to not break execution
- Log file grows over time (consider rotation for production)

### Privacy

- Sensitive data is sanitized (passwords, API keys redacted)
- Long content is truncated (200 chars max)
- Only metadata is logged, not full file contents

