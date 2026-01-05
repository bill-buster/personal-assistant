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
- **REPL mode**: Interactive sessions with history and streaming
- **Web dashboard**: Optional browser UI
- **Provider-agnostic**: Groq, OpenRouter, or mock (offline)
- **Plugin system**: Load external tools from `~/.assistant/plugins/`
- **VS Code extension**: Inline commands in editor (Cmd+Shift+A)
- **Docker support**: Containerized development environment
- **API documentation**: Auto-generated from TypeScript/JSDoc
- **Semantic versioning**: Automated releases with conventional commits

## Development Workflow

> 📖 **Complete Commands Reference**: See [docs/COMMANDS.md](docs/COMMANDS.md) for all available commands.  
> ⚡ **Performance Features**: See [docs/CACHING.md](docs/CACHING.md) for LLM and test caching.

### Quick Commands

```bash
# Development
npm run dev:watch        # REPL with hot reload
npm run build:watch      # Watch TypeScript compilation
npm run web:watch        # Web dashboard with hot reload

# Quality Checks
npm run check            # typecheck + lint + format check
npm run fix              # Auto-fix lint + format
npm run test             # Run all tests (parallel + caching)
npm run test:parallel   # Explicit parallel execution
npm run test:sequential # Sequential execution (disable parallel)
npm run test:coverage    # Run tests with coverage report
npm run test:watch       # Watch mode for tests

# Debugging (VS Code)
# Press F5 and select:
#   - "Debug CLI" - Debug any command
#   - "Debug REPL" - Debug REPL interactions
#   - "Debug Current Test" - Debug the test you're editing
#   - "Debug Web Server" - Debug web dashboard

# Performance
npm run profile          # CPU profiling
npm run profile:memory   # Memory profiling
./scripts/profile.sh demo
./scripts/memory-profile.sh demo

# Other
npm run doctor           # Check configuration
npm run preflight        # Full pre-commit checks
npm run smoke            # Quick smoke test
```

### Pre-commit & Pre-push Hooks

- **Pre-commit**: Automatically runs `lint-staged` (ESLint + Prettier) on staged files
- **Pre-push**: Runs `npm run check` and `npm test` before pushing

To skip hooks: `git commit --no-verify` or `git push --no-verify` (not recommended)

## Configuration

Create `~/.assistant/config.json`:

```json
{
  "defaultProvider": "groq",
  "apiKeys": {
    "groq": "your-groq-api-key"
  },
  "models": {
    "groq": "llama-3.1-70b-versatile",
    "openrouter": "anthropic/claude-3.5-sonnet"
  },
  "historyLimit": 20,
  "compactToolSchemas": true,
  "maxReadSize": 1048576,
  "maxWriteSize": 10485760,
  "maxRetries": 3
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq API key | - |
| `OPENROUTER_API_KEY` | OpenRouter API key | - |
| `DEFAULT_PROVIDER` | Default provider (groq, openrouter) | groq |
| `ASSISTANT_DATA_DIR` | Data storage directory | `~/.assistant-data` |
| `ASSISTANT_CONFIG_DIR` | Config directory | `~/.assistant` |
| `ASSISTANT_PERMISSIONS_PATH` | Permissions file path | `~/.assistant/permissions.json` |

### Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `defaultProvider` | string | LLM provider (groq, openrouter, mock) | groq |
| `apiKeys` | object | API keys per provider | {} |
| `models` | object | Model overrides per provider | {} |
| `historyLimit` | number | Max messages in history (1-50) | - |
| `compactToolSchemas` | boolean | Use compact tool schema format | false |
| `maxReadSize` | number | Max file read size (bytes) | 1048576 (1MB) |
| `maxWriteSize` | number | Max file write size (bytes) | 10485760 (10MB) |
| `maxRetries` | number | Max LLM retry attempts (1-10) | - |

> 📖 **Full Configuration Guide**: See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for detailed configuration options.

## Commands

> 📖 **Full CLI Reference**: See [docs/COMMANDS.md](docs/COMMANDS.md) for complete command list.

### Quick Examples

```bash
# Memory
assistant remember "Meeting at 3pm with Alice"
assistant recall "meeting"

# Tasks
assistant task add "Review PR #123"
assistant task list --human
assistant task done 1

# Git (read-only)
assistant git status
assistant git log --limit 5

# Plugins
assistant plugins list

# Files (sandboxed)
assistant run ls

# REPL with streaming (default)
assistant repl

# See all commands
assistant --help
```

## Testing

```bash
# Run all tests
npm test

# Run specific test
npm run test:single calendar.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
npm run test:coverage:open  # Opens HTML report
```

> 💡 **Test Caching**: Tests automatically skip if unchanged. See [docs/CACHING.md](docs/CACHING.md) for details.

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

## Scope & Boundaries

This repo contains the **personal assistant only**. It explicitly excludes:

- Workflow engine / multi-agent orchestration
- Agent handoff protocols (HANDOFF.md, AGENTS.md)
- Multi-agent chain coordination

If you're looking for orchestration tooling, see the parent monorepo's `packages/workflow-engine/`.

This separation is intentional (see [docs/DECISIONS.md](docs/DECISIONS.md) D015) to keep the assistant focused, testable, and independently deployable.

## License

MIT
