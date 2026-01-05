# Personal Assistant

A local-first CLI assistant that routes natural language commands to tools with optional LLM fallback.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run CLI
./dist/app/cli.js --help

# Or use npm scripts
npm start -- --help
npm run demo
npm run repl
```

## Features

- **Multi-stage routing**: Regex → Heuristic → Parsers → LLM fallback
- **Tool execution**: File ops, tasks, memory, git, shell commands
- **REPL mode**: Interactive sessions with history
- **Web dashboard**: Optional browser UI
- **Provider-agnostic**: Groq, OpenRouter, or mock (offline)

## Configuration

Create `~/.assistant/config.json`:

```json
{
  "defaultProvider": "groq",
  "apiKeys": {
    "groq": "your-groq-api-key"
  }
}
```

Or use environment variables:
```bash
export GROQ_API_KEY=your-key
export DEFAULT_PROVIDER=groq
```

## Commands

```bash
# Memory
assistant remember "Meeting with Alice at 3pm"
assistant recall "meeting"

# Tasks
assistant task add "Review PR #123"
assistant task list --human
assistant task done 1

# Git (read-only)
assistant git status
assistant git log --limit 5

# Files (sandboxed)
assistant run ls
```

## Development

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## Architecture

See [docs/STACK_DECISION.md](docs/STACK_DECISION.md) for stack rationale.

```
src/
├── app/         # CLI, REPL, router, web server
├── core/        # Config, executor, types, validation
├── agents/      # Agent definitions (System, Coder, Organizer, etc.)
├── parsers/     # Heuristic, task, memory parsers
├── providers/   # LLM provider adapters
├── storage/     # JSONL, memory store
├── runtime/     # Composition root, bootstrap
└── tools/       # Tool implementations
```

## License

MIT

