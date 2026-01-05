# Cursor IDE Command Tracking

## Overview

The Personal Assistant extension tracks VS Code/Cursor command execution to provide analytics on how well commands are performing. This helps identify which commands are used most frequently, which ones fail, and performance metrics.

## What Gets Tracked

### ✅ Tracked Commands

**Personal Assistant Commands** (with explicit success/failure tracking):
- `personal-assistant.remember` - Store selection in memory
- `personal-assistant.recall` - Search memory
- `personal-assistant.taskAdd` - Add task from selection
- `personal-assistant.command` - General assistant command

These commands are tracked with:
- Success/failure status
- Execution duration
- Context (active file, selection, workspace)
- Error messages (if failed)

### ❌ Not Tracked

**Other VS Code Commands**:
- VS Code API version 1.80.0 doesn't provide `onDidExecuteCommand` API
- We can only track commands we explicitly register and execute
- Built-in VS Code commands (save, format, etc.) are not tracked
- Other extension commands are not tracked

**Cursor-Specific AI Commands**:
- Cmd+K (Inline Edit) - Cursor's proprietary AI editing
- Cmd+L (Chat) - Cursor's chat interface
- Cmd+I (Composer) - Cursor's composer mode
- These are not exposed through VS Code's command API

**Terminal Commands**:
- Commands run directly in the terminal (not through VS Code command system)
- Shell commands executed outside VS Code

**System Commands**:
- Keyboard shortcuts that don't trigger VS Code commands
- System-level operations

## Limitations

### Why Some Commands Aren't Tracked

1. **VS Code API Limitations**: VS Code API version 1.80.0 doesn't provide `onDidExecuteCommand` event. We can only track commands we explicitly register and execute ourselves.

2. **Extension Isolation**: Extensions can only track commands they register themselves. We track Personal Assistant commands explicitly with try/catch blocks to capture success/failure.

3. **Cursor Proprietary Features**: Cursor's proprietary AI features (Cmd+K, Cmd+L, Cmd+I) are not exposed through VS Code's command API, so they cannot be tracked.

4. **Terminal Commands**: Commands executed directly in the terminal are not part of VS Code's command system, so they cannot be tracked.

## Usage

### View Cursor Command Stats

```bash
assistant cursor stats
```

Shows:
- Total commands executed
- Success/error counts
- Success rate percentage
- Average latency
- Breakdown by category
- Breakdown by command ID

### View Recent Commands

```bash
assistant cursor recent
assistant cursor recent --limit 20
```

### View Errors Only

```bash
assistant cursor errors
assistant cursor errors --limit 10
```

### Filter by Category

```bash
assistant cursor --category assistant
assistant cursor --category editor
assistant cursor --category git
```

### Filter by Command

```bash
assistant cursor --command personal-assistant.remember
```

## Log Storage

Cursor command logs are stored in:
```
~/.assistant-data/cursor_command_log.jsonl
```

Each entry contains:
- `ts`: Timestamp (ISO 8601)
- `command_id`: VS Code command ID
- `command_title`: Human-readable command title (if available)
- `category`: Command category (assistant, editor, git, etc.)
- `success`: Whether command succeeded
- `error`: Error message (if failed)
- `duration_ms`: Execution time in milliseconds
- `context`: Context information (active file, selection, workspace)

## Command Categories

Commands are automatically classified into categories:

- **assistant**: Personal Assistant extension commands
- **cursor_ai**: Commands related to Cursor AI features (if accessible)
- **git**: Git-related commands
- **editor**: File and editor operations
- **search**: Search and find commands
- **terminal**: Terminal-related commands
- **debug**: Debugging commands
- **general**: Other commands

## Example Output

### Stats

```json
{
  "ok": true,
  "result": {
    "summary": {
      "total": 150,
      "success": 145,
      "error": 5,
      "success_rate": "96.7%",
      "avg_latency_ms": 234
    },
    "by_category": {
      "assistant": {
        "total": 45,
        "success": 44,
        "error": 1
      },
      "editor": {
        "total": 80,
        "success": 78,
        "error": 2
      }
    },
    "by_command": {
      "personal-assistant.remember": {
        "total": 20,
        "success": 20,
        "error": 0
      }
    }
  }
}
```

## Integration with Main Logs

Cursor command logs are separate from the main assistant command logs (`assistant logs`). This separation allows:

1. **Different Use Cases**: CLI commands vs IDE commands
2. **Different Metrics**: CLI commands track routing and tool execution, while Cursor commands track IDE usage
3. **Privacy**: IDE usage patterns can be kept separate from CLI usage

## Future Improvements

Potential enhancements:

1. **Cursor API Integration**: If Cursor exposes an API for tracking AI commands, we can integrate it
2. **Terminal Tracking**: Track terminal commands by monitoring terminal output
3. **Performance Profiling**: More detailed performance metrics per command
4. **Usage Patterns**: Identify common command sequences
5. **Error Analysis**: Automatic error categorization and suggestions

## Troubleshooting

### No Commands Being Tracked

1. **Check Extension**: Ensure Personal Assistant extension is installed and active
2. **Check Log File**: Verify `~/.assistant-data/cursor_command_log.jsonl` exists
3. **Check Permissions**: Ensure the extension has write permissions to the data directory

### Missing Commands

If expected commands aren't appearing:
- They may not be exposed through VS Code's command API
- They may be Cursor-specific features not accessible to extensions
- Check the "Not Tracked" section above

### Performance Impact

Command tracking is lightweight:
- Logging happens asynchronously
- Minimal performance overhead
- Logs are written in JSONL format (append-only)

If you experience performance issues, you can disable tracking by setting `enabled: false` in the extension configuration (future feature).

