# Personal Assistant

A local-first CLI assistant that routes natural language commands to tools with optional LLM fallback.

## 📚 Documentation

**[START HERE: Documentation Map](docs/START_HERE.md)**

The documentation has been organized to help you find what you need quickly:

- **[QUICKSTART](docs/02-guides/QUICKSTART.md)**: Setup and first run.
- **[COMMANDS](docs/04-reference/COMMANDS.md)**: CLI reference.
- **[ARCHITECTURE](docs/01-concepts/ARCHITECTURE.md)**: How it works.
- **[CONTRIBUTING](docs/03-workflow/BUILD_AND_RUN.md)**: Build and test guide.

---

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run CLI (requires build first)
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

## Scope & Boundaries

This repo contains the **personal assistant only**. It explicitly excludes:

- Workflow engine / multi-agent orchestration
- Agent handoff protocols (HANDOFF.md, AGENTS.md)
- Multi-agent chain coordination

If you're looking for orchestration tooling, see the parent monorepo's `packages/workflow-engine/`.

This separation is intentional (see [docs/meta/DECISIONS.md](docs/meta/DECISIONS.md) D015) to keep the assistant focused, testable, and independently deployable.

## License

MIT
