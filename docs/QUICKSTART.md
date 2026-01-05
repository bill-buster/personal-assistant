# Quickstart Guide

Get the Personal Assistant running in 5 minutes.

## Prerequisites

- Node.js 18+ 
- npm

## Installation

```bash
# Clone/copy the repo
cd personal-assistant

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

### Option A: Environment Variables (Simplest)

```bash
export GROQ_API_KEY=your-groq-api-key
# or
export OPENROUTER_API_KEY=your-openrouter-api-key
```

### Option B: Config File

Create `~/.assistant/config.json`:

```json
{
  "defaultProvider": "groq",
  "apiKeys": {
    "groq": "your-groq-api-key"
  }
}
```

### Option C: Offline/Mock Mode

No API key needed for testing:

```bash
# Use --mock flag to avoid API calls
./dist/app/cli.js remember "test" --mock
# or
assistant remember "test" --mock
```

## Basic Usage

```bash
# Remember something
./dist/app/cli.js remember "Meeting with Alice at 3pm"

# Recall it
./dist/app/cli.js recall "meeting" --human

# Add a task
./dist/app/cli.js task add "Review PR #123"

# List tasks
./dist/app/cli.js task list --human

# Complete a task
./dist/app/cli.js task done 1

# Run a safe command
./dist/app/cli.js run ls

# Git status (read-only)
./dist/app/cli.js git status --human
```

## Interactive Mode (REPL)

```bash
./dist/app/cli.js repl
# Streaming enabled by default - see responses in real-time
# Disable with: ./dist/app/cli.js repl --no-stream
```

Commands in REPL:
- `/help` - Show all commands
- `/tools` - List available tools
- `/stats` - Show token usage statistics
- `/config set <provider> <key>` - Set API key (groq, openrouter)
- `/provider <name>` - Switch provider (groq, openrouter)
- `/save [name]` - Save current session
- `/load <name>` - Load a saved session
- `/sessions` - List saved sessions
- `/reset` - Reset agent to Supervisor
- `/exit` - Exit REPL

> 💡 **Natural Language Access**: In REPL mode, you can also use natural language to access tools like email, calendar, contacts, and more. For example: "send an email to alice@example.com" or "what's the weather in San Francisco?"

## Demo

```bash
npm run demo
```

Runs through common operations automatically.

## Web Dashboard

```bash
npm run web
# Opens http://localhost:3000
```

## Data Location

By default, data is stored in:
- `~/.assistant-data/memory.json` - Memories
- `~/.assistant-data/tasks.jsonl` - Tasks
- `~/.assistant-data/reminders.jsonl` - Reminders

Override with:
```bash
export ASSISTANT_DATA_DIR=/path/to/data
export ASSISTANT_CONFIG_DIR=/path/to/config  # Override config directory
export ASSISTANT_PERMISSIONS_PATH=/path/to/permissions.json  # Override permissions file
```

## Troubleshooting

### "No API key configured"
Set `GROQ_API_KEY` or `OPENROUTER_API_KEY` env var, or use `--mock` for testing.

### "Command not allowed"
Create `~/.assistant-data/permissions.json`:
```json
{
  "version": 1,
  "allow_paths": ["./", "~/"],
  "allow_commands": ["ls", "pwd", "cat", "du"],
  "require_confirmation_for": [],
  "deny_tools": []
}
```

### Build errors
```bash
npm run clean && npm install && npm run build
```

## VS Code Extension

Install the VS Code extension for inline commands:

```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VS Code to debug
```

See [vscode-extension/README.md](../vscode-extension/README.md) for details.

## Next Steps

- Read [README.md](../README.md) for system overview
- Check [docs/CONFIGURATION.md](./CONFIGURATION.md) for configuration options
- See [docs/COMMANDS.md](./COMMANDS.md) for complete command reference
- Explore [docs/PLUGINS.md](./PLUGINS.md) to create custom tools
- Check [docs/STACK_DECISION.md](./STACK_DECISION.md) for design rationale
- Run `npm test` to verify your setup

