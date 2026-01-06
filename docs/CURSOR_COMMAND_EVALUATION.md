**Status**: Reference-only  
**Canonical**: [docs/HOW_WE_WORK.md](HOW_WE_WORK.md) for current commands, `.cursor/commands/README.md` for command reference

---

# Cursor Custom Command Evaluation

*This document is kept for historical reference. Current command information is in [HOW_WE_WORK.md](HOW_WE_WORK.md) and `.cursor/commands/README.md`.*

## Overview

Since Cursor custom commands (`.cursor/commands/*.md`) are executed by Cursor's AI system and not exposed through VS Code APIs, we can't directly track their execution. However, we can **indirectly evaluate** them by:

1. **Analyzing command files** - Review command structure, documentation, examples
2. **Indirect usage tracking** - Search assistant logs for patterns that suggest command usage
3. **Metadata extraction** - Extract tool mentions, complexity, and structure

## Usage

### Evaluate All Commands

```bash
assistant cursor eval
```

Evaluates all Cursor custom commands (both project and user-level).

### Evaluate Project Commands Only

```bash
assistant cursor eval --project-only
```

Only evaluates commands in `.cursor/commands/` (excludes `~/.cursor/commands/`).

### Evaluate Specific Command

```bash
assistant cursor eval --command impl_add_tool
```

Evaluates a specific command by name.

## What Gets Evaluated

### 1. Command Structure

- **Documentation quality**: Length, examples, step-by-step instructions
- **Complexity**: Simple, medium, or complex based on length
- **Metadata**: Tool mentions, role references, patterns

### 2. Indirect Usage

- **Pattern matching**: Searches assistant logs for key terms from commands
- **Related tools**: Tracks which tools were used after command patterns appear
- **Usage frequency**: Counts how often command patterns appear in logs

### 3. Recommendations

- Commands with no detected usage
- Commands missing examples
- Complex commands without step-by-step instructions
- Unused complex commands that might need simplification

## Example Output

```json
{
  "ok": true,
  "result": {
    "commands": [
      {
        "name": "impl_add_tool",
        "type": "project",
        "path": "/path/to/.cursor/commands/impl_add_tool.md",
        "metadata": {
          "mentions": ["tool_name", "handleTool", "add_tool"],
          "complexity": "complex",
          "has_steps": true,
          "has_examples": true
        },
        "usage": {
          "command_name": "impl_add_tool",
          "indirect_usage_count": 5,
          "last_used": "2024-01-15T10:30:00Z",
          "related_tools": ["read_file", "write_file", "task_add"]
        },
        "evaluation": {
          "has_documentation": true,
          "has_examples": true,
          "has_steps": true,
          "complexity": "complex",
          "indirect_usage_count": 5,
          "last_used": "2024-01-15T10:30:00Z",
          "related_tools": ["read_file", "write_file", "task_add"]
        }
      }
    ],
    "summary": {
      "total": 10,
      "project": 8,
      "user": 2,
      "evaluated": 10,
      "with_usage": 7,
      "with_examples": 8,
      "with_steps": 5
    },
    "recommendations": [
      "3 command(s) have no detected usage: old_command, unused_command, deprecated_command. Consider reviewing if they're still needed.",
      "2 command(s) lack examples: fix_errors, type_safety. Adding examples improves usability.",
      "1 complex command(s) lack step-by-step instructions: perf_fix_spawn. Consider adding structured steps."
    ]
  }
}
```

## How Indirect Usage Works

The tool searches assistant command logs (`~/.assistant-data/command_log.jsonl`) for:

1. **Key terms** extracted from command content:
   - Command name
   - Role mentions (e.g., `role.impl.mdc`)
   - Tool names mentioned (e.g., `` `tool_name` ``)
   - Action verbs (add, create, implement, review, test, fix, refactor)

2. **Pattern matching**: If a log entry's input contains these key terms, it's considered indirect usage

3. **Related tools**: Tracks which tools were executed in logs that match command patterns

## Limitations

### Indirect Tracking

- **Not 100% accurate**: Pattern matching can have false positives/negatives
- **Requires assistant usage**: Only tracks if commands trigger assistant tools
- **No direct execution data**: Can't see if commands were actually executed in Cursor

### What We Can't Track

- Direct Cursor AI command execution (Cmd+K, Cmd+L, Cmd+I)
- Commands that don't trigger assistant tools
- Success/failure of command execution
- Exact execution count

## Best Practices

### 1. Regular Evaluation

Run evaluation periodically to identify:
- Unused commands that can be removed
- Commands needing documentation improvements
- Commands that might need simplification

```bash
# Weekly review
assistant cursor eval --project-only
```

### 2. Command Maintenance

Based on recommendations:
- **Remove unused commands** - If a command has no usage and isn't needed, remove it
- **Add examples** - Commands without examples are harder to use
- **Add steps** - Complex commands benefit from step-by-step instructions
- **Simplify** - If a complex command is unused, consider simplifying or removing

### 3. Documentation Quality

Ensure commands have:
- Clear purpose in the first paragraph
- Step-by-step instructions for complex commands
- Examples showing usage
- Tool/role references when relevant

## Integration with Manual Review

This tool complements manual review:

1. **Automated evaluation** (`assistant cursor eval`) - Quick overview, patterns, recommendations
2. **Manual review** - Read command files directly, check for clarity, test commands
3. **Combined approach** - Use automated evaluation to identify candidates for manual review

## Example Workflow

```bash
# 1. Evaluate all commands
assistant cursor eval --project-only

# 2. Review recommendations
# Focus on commands with no usage or missing documentation

# 3. Manually review specific commands
cat .cursor/commands/impl_add_tool.md

# 4. Update commands based on findings
# Add examples, steps, or remove unused commands

# 5. Re-evaluate to verify improvements
assistant cursor eval --command impl_add_tool
```

## Related Commands

- `assistant cursor stats` - View VS Code extension command stats
- `assistant logs stats` - View assistant command logs
- `assistant logs recent` - View recent assistant commands

