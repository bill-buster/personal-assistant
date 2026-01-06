# How We Work

**Complete guide to our development workflow, conventions, and practices.**

This document is the single source of truth for how we work. Everything else links back here.

## 📋 Table of Contents

1. [Commands](#commands)
2. [Rules](#rules)
3. [Testing Workflow](#testing-workflow)
4. [Git Workflow & Branch/PR Style](#git-workflow--branchpr-style)
5. [Quick Reference](#quick-reference)

---

## Commands

### CLI Commands

**Authoritative source**: [COMMANDS.md](COMMANDS.md)

All available CLI commands, npm scripts, and tool commands are documented in `COMMANDS.md`.

**Quick examples**:
```bash
# Memory
assistant remember "Meeting at 3pm"
assistant recall "meeting"

# Tasks
assistant task add "Review PR"
assistant task list

# Git (read-only)
assistant git status
assistant git log --limit 5
```

### Cursor Slash Commands

**Authoritative source**: `.cursor/commands/README.md`

Cursor slash commands are documented in `.cursor/commands/README.md`. Key commands:

- `/implement_and_review_tool` - Complete tool implementation workflow (auto-commits)
- `/fix_all_issues` - Batch-fix multiple issues (auto-commits)
- `/review_pr` - Systematic code review
- `/jules_test` - Comprehensive test writing
- `/fix_errors` - Convert throw to structured errors
- `/type_safety` - Improve TypeScript type safety

**Composite commands** (allowed to commit automatically):
- `/implement_and_review_tool` - Implements tool → tests → reviews → commits
- `/fix_all_issues` - Fixes todos + errors + docs → commits

**Atomic commands** (do NOT commit unless user asks):
- `/review_pr`, `/jules_test`, `/fix_errors`, `/type_safety`, etc.

See `.cursor/rules/workflow.mdc` for auto-commit policy.

---

## Rules

### Project Rules

**Authoritative source**: `.cursor/rules/`

All project rules are in `.cursor/rules/*.mdc`. Key rules:

- **`core-full.mdc`** - Complete conventions and patterns (detailed)
- **`core.mdc`** - Core conventions (lite version)
- **`git.mdc`** - Git workflow and commit best practices
- **`workflow.mdc`** - Composite command and workflow patterns
- **`testing.mdc`** - Testing patterns and conventions
- **`errors.mdc`** - Error handling patterns
- **`security.mdc`** - Security patterns
- **`tools.mdc`** - Tool implementation patterns

**Quick reference**:
- Import conventions: Node built-ins → External packages → Internal (relative paths)
- Type patterns: Zod schemas everywhere, discriminated unions for results
- Error handling: Never throw, always return structured errors with `makeError()`
- Logging: Debug logs to stderr, stdout only for actual output

See `.cursor/rules/core-full.mdc` for complete conventions.

---

## Testing Workflow

**Authoritative source**: [TESTING.md](TESTING.md)

### Quick Commands

```bash
# Run all tests (parallel + caching)
npm test

# Run specific test file
npm run test:single calendar.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
npm run test:coverage:open
```

### Test Structure

- **Colocated tests**: `*.test.ts` files next to source files
- **Custom test runner**: `src/run_tests.ts`
- **Parallel execution**: 4 workers by default
- **Test caching**: Skips unchanged tests automatically

### Test Patterns

- Use `createMockContext()` from test utils
- Test success, error, and edge cases
- Use temp directories for isolation
- Never rely on repo files for test data

See [TESTING.md](TESTING.md) for complete testing guide.

---

## Git Workflow & Branch/PR Style

**Authoritative source**: [GIT.md](GIT.md)

### Workflow: Direct Commits to Main

This project uses **Direct Commits to Main** - a streamlined workflow optimized for:
- ✅ Fast iteration
- ✅ Pre-commit/pre-push hooks for safety
- ✅ Automated quality gates

**Why Direct Commits?**
- ✅ **Safe**: Pre-commit hooks (format, lint, typecheck) + pre-push hooks (preflight)
- ✅ **Fast**: No PR overhead for small changes
- ✅ **Automated**: Hooks prevent bad commits

### Pre-Commit Hook (Automatic)

Runs automatically when you run `git commit`:

1. ✅ Cleanup generated files
2. ✅ Auto-fix formatting/linting
3. ✅ Check formatting
4. ✅ Check linting
5. ✅ Type check

**If any check fails**, the commit is blocked.

### Pre-Push Hook (Automatic)

Runs automatically when you run `git push`:

- ✅ Full preflight checks (`npm run preflight`)
  - Build
  - Leak check
  - Smoke test

**If checks fail**, the push is blocked.

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding/updating tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks

**Examples**:
```
feat(tools): add generate tests command
fix(router): handle empty query strings
docs: update testing strategy guide
test(executor): add permission tests
```

### Auto-Commit Policy (Composite Commands)

**For composite workflows** (e.g., `/implement_and_review_tool`):

The agent **SHOULD commit automatically** when:
- ✅ Code changes are complete and tested
- ✅ All preflight checks pass
- ✅ Changes follow project conventions
- ✅ Commit message follows conventional commit format

**The agent MUST NOT commit** when:
- ❌ User explicitly asks not to commit
- ❌ Changes are incomplete or experimental
- ❌ Preflight checks fail
- ❌ User needs to review changes first

See `.cursor/rules/workflow.mdc` for complete auto-commit policy.

### Branch Strategy

**Direct Commits**: ✅ **Allowed** (with automated safeguards)

**Feature Branches**: ✅ **Optional** (for larger changes)

**When to use branches**:
- Multi-day features
- Experimental work
- Collaborative features

**When to commit directly**:
- Small fixes
- Documentation updates
- Test additions
- Refactoring

See [GIT.md](GIT.md) for complete git workflow.

---

## Quick Reference

### Essential Reading

1. **[README.md](../README.md)** - Project overview
2. **[COMMANDS.md](COMMANDS.md)** - All CLI commands
3. **[HOW_WE_WORK.md](HOW_WE_WORK.md)** - This document (workflow guide)
4. **[TESTING.md](TESTING.md)** - Testing guide
5. **[GIT.md](GIT.md)** - Git workflow

### Development Workflow

1. **Make changes**
2. **Run tests**: `npm test`
3. **Check quality**: `npm run check`
4. **Commit**: `git commit -m "feat(scope): description"` (hooks run automatically)
5. **Push**: `git push` (preflight runs automatically)

### Composite Command Workflow

For composite commands like `/implement_and_review_tool`:

1. **Implement** → Tool implementation
2. **Test** → Comprehensive testing
3. **Review** → Code review
4. **Fix** → Fix issues (if any)
5. **Commit** → Auto-commit (if all pass)
6. **Summary** → Report what changed

### Common Tasks

| Task | Command/Doc |
|------|-------------|
| Add a tool | [ADDING_TOOLS_GUIDE.md](ADDING_TOOLS_GUIDE.md) |
| Write tests | [TESTING.md](TESTING.md) |
| Review code | [CODE_REVIEW.md](CODE_REVIEW.md) |
| Configure | [CONFIGURATION.md](CONFIGURATION.md) |
| Set up Cursor | [CURSOR_SETUP.md](CURSOR_SETUP.md) |
| Understand architecture | [ARCHITECTURE.md](ARCHITECTURE.md) → [DECISIONS.md](DECISIONS.md) |

---

## Related Documentation

- **[INDEX.md](INDEX.md)** - Complete documentation index
- **[WORKFLOW.md](WORKFLOW.md)** - Detailed development workflow
- **[COMMANDS.md](COMMANDS.md)** - All available commands
- **[TESTING.md](TESTING.md)** - Complete testing guide
- **[GIT.md](GIT.md)** - Complete git workflow
- **[CODE_REVIEW.md](CODE_REVIEW.md)** - Code review guide

---

**Last updated**: 2025-01-27

