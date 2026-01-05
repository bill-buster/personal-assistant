# Complete Commands Reference

This document lists all available commands for the Personal Assistant project.

## 📦 NPM Scripts

### Build & Compile

| Command               | Description                           |
| --------------------- | ------------------------------------- |
| `npm run build`       | Compile TypeScript to JavaScript      |
| `npm run build:watch` | Watch mode for TypeScript compilation |
| `npm run clean`       | Remove build artifacts and temp files |
| `npm run typecheck`   | Type check without emitting files     |

### Testing

| Command                        | Description                                  |
| ------------------------------ | -------------------------------------------- |
| `npm test`                     | Run all tests (parallel + caching)           |
| `npm run test:parallel`        | Explicit parallel execution                  |
| `npm run test:sequential`      | Sequential execution (disable parallel)      |
| `npm run test:single <file>`   | Run a specific test file                     |
| `npm run test:watch`           | Watch mode for tests (auto-rerun on changes) |
| `npm run test:coverage`        | Run tests with coverage report               |
| `npm run test:coverage:open`   | Generate coverage and open HTML report       |
| `npm run test:coverage:report` | Analyze coverage gaps and recommendations    |
| `npm run test:e2e`             | Run end-to-end CLI tests                     |

### Git & Formatting

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm run fix`          | Auto-fix linting and formatting           |
| `npm run fix:all`      | Fix lint + format + typecheck             |
| `npm run format`       | Format TypeScript files                   |
| `npm run format:all`   | Format all files (ts, js, json, md)       |
| `npm run format:check` | Check formatting without fixing           |
| `npm run cleanup`      | Remove generated test files               |
| `npm run preflight`    | Full pre-commit checks (includes cleanup) |
| `npm run review`           | Systematic code review (entire codebase)  |
| `npm run review:fix`       | Auto-fix simple code review issues        |
| `npm run review:incremental` | Incremental review (processes files piece by piece) |
| `npm run review:status`   | Show incremental review progress         |
| `npm run review:reset`    | Reset incremental review progress        |

### Code Quality

| Command                | Description                                |
| ---------------------- | ------------------------------------------ |
| `npm run lint`         | Run ESLint                                 |
| `npm run lint:fix`     | Auto-fix ESLint issues                     |
| `npm run format`       | Format code with Prettier                  |
| `npm run format:check` | Check formatting without fixing            |
| `npm run check`        | Run all checks (typecheck + lint + format) |
| `npm run fix`          | Auto-fix lint and format issues            |

### Development

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm start`         | Run CLI (alias for `node dist/app/cli.js`)   |
| `npm run dev`       | Build and start REPL                         |
| `npm run dev:watch` | REPL with hot reload (watch build + nodemon) |
| `npm run repl`      | Start REPL (requires build first)            |
| `npm run demo`      | Run demonstration flow                       |
| `npm run web`       | Start web dashboard                          |
| `npm run web:watch` | Web dashboard with hot reload                |

### Performance & Profiling

| Command                     | Description                           |
| --------------------------- | ------------------------------------- |
| `npm run profile <command>` | CPU profiling (generates profile.txt) |
| `npm run profile:analyze`   | Analyze CPU profile                   |
| `npm run profile:memory`    | Memory profiling (heap snapshots)     |

### Diagnostics & Utilities

| Command              | Description                            |
| -------------------- | -------------------------------------- |
| `npm run doctor`     | Diagnose configuration and environment |
| `npm run preflight`  | Full pre-commit checks                 |
| `npm run leak:check` | Check for memory leaks                 |
| `npm run smoke`      | Quick smoke test                       |
| `npm run eval`       | Run evaluations                        |
| `npm run bench`      | Run benchmarks                         |

## 🖥️ CLI Commands (assistant)

### Memory

| Command                     | Description                 |
| --------------------------- | --------------------------- |
| `assistant remember <text>` | Store information in memory |
| `assistant recall <query>`  | Search memory               |

### Tasks

| Command                                          | Description       |
| ------------------------------------------------ | ----------------- |
| `assistant task add <text>`                      | Add a new task    |
| `assistant task list [--status open\|done\|all]` | List tasks        |
| `assistant task done <id>`                       | Mark task as done |

### Reminders

| Command                                      | Description    |
| -------------------------------------------- | -------------- |
| `assistant remind add <text> --in <seconds>` | Add a reminder |

### Git (Read-only)

| Command                         | Description                  |
| ------------------------------- | ---------------------------- |
| `assistant git status`          | Show git working tree status |
| `assistant git diff [--staged]` | Show changes                 |
| `assistant git log [--limit N]` | Show recent commits          |

### Shell Commands (Sandboxed)

| Command                   | Description                              |
| ------------------------- | ---------------------------------------- |
| `assistant run <command>` | Execute shell command (ls\|pwd\|cat\|du) |

### Cache Management

> 📖 **Full Caching Guide**: See [docs/CACHING.md](./CACHING.md) for detailed explanation of how caching works.

| Command                      | Description              |
| ---------------------------- | ------------------------ |
| `assistant cache clear`      | Clear LLM response cache |
| `assistant cache stats`      | Show cache statistics    |
| `assistant cache test-clear` | Clear test result cache  |

### Plugin Management

> 📖 **Plugin Guide**: See [docs/PLUGINS.md](./PLUGINS.md) for creating custom plugins.

| Command                  | Description         |
| ------------------------ | ------------------- |
| `assistant plugins list` | List loaded plugins |

### Code Generation

> ⚡ **100x Improvement**: Generate boilerplate code automatically.

| Command                                   | Description                                   |
| ----------------------------------------- | --------------------------------------------- |
| `assistant generate tool <name> [--args]` | Generate new tool with schema, handler, tests |
| `assistant generate tests <name>`         | Generate test cases for existing tool         |

**Examples**:

```bash
# Generate a new tool
assistant generate tool my_tool --args text:string,limit:number:optional

# Generate tests for an existing tool
assistant generate tests my_tool
```

### Performance Profiling

> ⚡ **10x Improvement**: Built-in performance profiling.

| Command                     | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `assistant profile "<cmd>"` | Profile command execution (timing, memory, cache) |

**Example**:

```bash
assistant profile "remember: test"
# Output: total_time_ms, execution_time_ms, cache_hit, memory_delta_mb, etc.
```

### Audit & Debugging

| Command                       | Description      |
| ----------------------------- | ---------------- |
| `assistant audit [--limit N]` | View audit trail |

### Modes

| Command                      | Description                                |
| ---------------------------- | ------------------------------------------ |
| `assistant web [--port N]`   | Start web dashboard                        |
| `assistant repl`             | Start interactive mode (streaming enabled) |
| `assistant repl --no-stream` | Start REPL without streaming               |
| `assistant demo`             | Run demonstration flow                     |

### REPL Commands

When in REPL mode (`assistant repl`), you can use slash commands:

| Command                        | Description                         |
| ------------------------------ | ----------------------------------- |
| `/help`                        | Show all REPL commands              |
| `/tools`                       | List available tools                |
| `/stats`                       | Show session token usage statistics |
| `/config set <provider> <key>` | Set API key (groq, openrouter)      |
| `/provider <name>`             | Switch provider (groq, openrouter)  |
| `/save [name]`                 | Save current session                |
| `/load <name>`                 | Load a saved session                |
| `/sessions`                    | List saved sessions                 |
| `/reset`                       | Reset agent to Supervisor           |
| `/exit`                        | Exit REPL                           |

### Tools Available via REPL/Router

The following tools are accessible through natural language in REPL mode or via the router, but not as direct CLI commands:

#### Email Tools

- `email_list` - List recent emails (local simulation)
- `email_send` - Send an email (local simulation)
- `email_get_details` - Get email details

#### Messaging Tools

- `message_list` - List recent messages
- `message_send` - Send an iMessage (macOS only)

#### Contact Management

- `contact_search` - Search contacts
- `contact_add` - Add a new contact
- `contact_update` - Update an existing contact

#### Calendar Tools

- `calendar_list` - List calendar events
- `calendar_event_add` - Add calendar event
- `calendar_event_update` - Update calendar event

#### Utility Tools

- `calculate` - Evaluate mathematical expressions
- `get_time` - Get current date and time
- `get_weather` - Get weather information for a location

#### File Tools (via Router)

- `write_file` - Write file content
- `read_file` - Read file content
- `list_files` - List files in directory

#### Web Tools

- `read_url` - Fetch and extract text content from a URL

#### Delegation Tools (Experimental)

- `delegate_to_coder` - Handoff technical task to Coder agent
- `delegate_to_organizer` - Handoff task to Organizer agent
- `delegate_to_assistant` - Delegate to Personal Assistant agent

> 💡 **Note**: These tools can be accessed by typing natural language commands in REPL mode. For example: "send an email to alice@example.com" or "what's the weather in San Francisco?"

### Global Options

| Option      | Description                           |
| ----------- | ------------------------------------- |
| `--human`   | Human-readable output (default: JSON) |
| `--verbose` | Verbose output                        |
| `--mock`    | Use mock provider (no API calls)      |
| `--help`    | Show help                             |
| `--version` | Show version                          |

## 🔧 Shell Scripts

### Performance Profiling

| Script                                  | Description                    |
| --------------------------------------- | ------------------------------ |
| `./scripts/profile.sh <command>`        | CPU profiling helper script    |
| `./scripts/memory-profile.sh <command>` | Memory profiling helper script |

### Quality Checks

| Script                    | Description            |
| ------------------------- | ---------------------- |
| `./scripts/preflight.sh`  | Full pre-commit checks |
| `./scripts/leak-check.sh` | Check for memory leaks |
| `./scripts/smoke-test.sh` | Quick smoke test       |

## 🎯 Common Workflows

### Daily Development

```bash
# Start development with hot reload
npm run dev:watch

# Or web dashboard
npm run web:watch
```

### Before Committing

```bash
# Run all checks
npm run check

# Run tests
npm test

# Auto-fix issues
npm run fix
```

### Debugging

```bash
# VS Code: Press F5 and select debug configuration

# Command line debugging
node --inspect dist/app/cli.js demo
```

### Performance Analysis

```bash
# Built-in performance profiling (recommended)
assistant profile "remember: test"

# CPU profiling (advanced)
npm run profile demo
# or
./scripts/profile.sh demo

# Memory profiling (advanced)
npm run profile:memory demo
# or
./scripts/memory-profile.sh demo
```

### Code Generation

```bash
# Generate a new tool
assistant generate tool my_tool --args text:string,limit:number:optional

# Generate tests for existing tool
assistant generate tests my_tool

# Analyze code for refactoring opportunities
node dist/scripts/refactor.js src/tools/my_tools.ts

# Auto-fix refactoring issues
node dist/scripts/refactor_fix.js src/tools/my_tools.ts --fix

# Batch refactor entire directory
node dist/scripts/batch_refactor.js --path src/tools
```

### Testing

```bash
# Run all tests
npm test

# Run specific test
npm run test:single calendar.test.ts

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
npm run test:coverage:open
```

## 📝 Examples

### CLI Examples

```bash
# Memory
assistant remember "Meeting at 3pm with Alice"
assistant recall "meeting Alice"

# Tasks
assistant task add "Review PR #123"
assistant task list --human
assistant task done 1

# Git
assistant git status --human
assistant git log --limit 5

# Shell
assistant run ls
```

### NPM Script Examples

```bash
# Development
npm run dev:watch        # REPL with hot reload
npm run web:watch        # Web dashboard with hot reload

# Quality
npm run check            # All checks
npm run fix              # Auto-fix
npm run test:coverage    # Coverage report

# Profiling
npm run profile demo     # CPU profiling
```

## 🔗 Related Documentation

- [README.md](../README.md) - Quick start and overview
- [docs/CONFIGURATION.md](./CONFIGURATION.md) - Complete configuration reference
- [docs/CACHING.md](./CACHING.md) - LLM and test caching system
- [docs/PARALLEL_TESTS.md](./PARALLEL_TESTS.md) - Parallel test execution guide
- [docs/WORKFLOW.md](./WORKFLOW.md) - Detailed workflow guide
- [docs/STACK_DECISION.md](./STACK_DECISION.md) - Architecture decisions
