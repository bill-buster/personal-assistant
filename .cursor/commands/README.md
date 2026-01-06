# Cursor Commands

This directory contains command definitions that guide AI behavior for specific tasks. Each command file defines a reusable workflow that can be triggered with `/command_name`.

## Available Commands

### `/impl_add_tool`
- **Purpose**: Implement a tool from the implementation checklist
- **Role**: Implementer (`role.impl.mdc`)
- **When to use**: Adding new tools to the system
- **Dependencies**: Requires `docs/TOOL_IMPLEMENTATION_CHECKLIST.md`
- **Process**: 13-step workflow from checklist reading to post-commit review
- **File**: `impl_add_tool.md`

### `/fix_todos`
- **Purpose**: Fix or remove TODO/FIXME/HACK comments
- **Role**: Implementer (`role.impl.mdc`)
- **When to use**: Cleaning up technical debt
- **Dependencies**: None
- **Process**: Find all TODO comments, implement or remove them
- **File**: `fix_todos.md`

### `/fix_errors`
- **Purpose**: Convert throw statements to structured errors
- **Role**: Implementer (`role.impl.mdc`)
- **When to use**: Improving error handling patterns
- **Dependencies**: None
- **Process**: Find all throw statements, convert to `makeError()` pattern
- **File**: `fix_errors.md`

### `/add_docs`
- **Purpose**: Add JSDoc comments to exported functions
- **Role**: Implementer (`role.impl.mdc`)
- **When to use**: Improving code documentation
- **Dependencies**: None
- **Process**: Add JSDoc to all exported functions, update README/docs
- **File**: `add_docs.md`

### `/jules_test`
- **Purpose**: Write comprehensive tests (stress testing)
- **Role**: Jules/Stress Tester (`role.jules.mdc`)
- **When to use**: Adding comprehensive test coverage
- **Dependencies**: None
- **Process**: Write tests covering success, error, edge cases, invalid inputs
- **File**: `jules_test.md`

### `/review_pr`
- **Purpose**: Systematic code review using checklist
- **Role**: Reviewer (`role.review.mdc`)
- **When to use**: Reviewing code before merge/commit
- **Dependencies**: None
- **Process**: Review functionality, security, performance, quality, testing, docs
- **File**: `review_pr.md`

### `/security_audit`
- **Purpose**: Security-focused code review
- **Role**: Reviewer (`role.review.mdc`)
- **When to use**: Security review of code
- **Dependencies**: None
- **Process**: Check paths, commands, secrets, validation, permissions
- **File**: `security_audit.md`

### `/type_safety`
- **Purpose**: Improve TypeScript type safety
- **Role**: Implementer (`role.impl.mdc`)
- **When to use**: Removing `any` types, adding type annotations
- **Dependencies**: None
- **Process**: Replace `any`, add types, use Zod schemas, add type guards
- **File**: `type_safety.md`

### `/safe_refactor`
- **Purpose**: Create a step-by-step refactoring plan
- **Role**: Planner (`role.planner.mdc`)
- **When to use**: Planning large refactors
- **Dependencies**: None
- **Process**: Analyze scope, break into steps, create reviewable plan
- **File**: `safe_refactor.md`

### `/perf_fix_spawn`
- **Purpose**: Convert spawn-based tests to direct imports
- **Role**: Implementer (`role.impl.mdc`)
- **When to use**: Optimizing test performance
- **Dependencies**: None
- **Process**: Replace spawnSync with direct imports where safe
- **File**: `perf_fix_spawn.md`

### `/implement_and_review_tool` ⭐ **Recommended**
- **Purpose**: Complete tool implementation workflow (composite command)
- **Role**: Implementer (`role.impl.mdc`)
- **When to use**: Implementing tools end-to-end with full quality checks
- **Dependencies**: Requires `docs/TOOL_IMPLEMENTATION_CHECKLIST.md`
- **Process**: 16-step workflow that chains: generate → implement → test → review → fix loop → commit → summary
- **File**: `implement_and_review_tool.md`
- **Features**:
  - Idempotent: safe to re-run after partial completion
  - Explicit quality gates: tests + review must be green before commit
  - Clear Jules role integration for "try to break it" testing
  - Comprehensive fix loop with re-test and re-review
  - Summary step for better UX
  - Auto-commit if all checks pass

### `/workflow_implement_tool` ⚠️ **Deprecated**
- **Status**: Deprecated - Use `/implement_and_review_tool` instead
- **File**: `workflow_implement_tool.md`
- **Reason**: Replaced by improved version with better idempotency, explicit quality gates, and summary step

### `/help`
- **Purpose**: Discover available commands and workflows
- **Role**: Any
- **When to use**: Finding the right command for your task
- **Dependencies**: None
- **Process**: Reads `.cursor/commands/` directory and lists all commands with descriptions
- **File**: `help.md`
- **Features**:
  - Categorized command list
  - Usage suggestions based on context
  - Common workflow mappings
  - Auto-updates when commands change

### `/fix_all_issues`
- **Purpose**: Batch-fix common repo issues in a safe order
- **Role**: Implementer (`role.impl.mdc`)
- **When to use**: Cleaning up multiple issues at once (TODOs, lint, types, docs)
- **Dependencies**: None
- **Process**: 7-step workflow: preflight → fix TODOs → fix lint → fix types → fix docs → test → summary
- **File**: `fix_all_issues.md`
- **Features**:
  - Safe order: fixes issues in dependency order
  - Tests between stages
  - Summary of what was fixed
  - Remaining issues tracking

## Command Structure

All commands follow a consistent structure:

1. **Role Assignment**: Specifies which role to use (e.g., `role.impl.mdc`)
2. **Purpose**: Clear description of what the command does
3. **Process**: Step-by-step instructions
4. **Edge Cases**: Handling of special situations
5. **Error Handling**: What to do when errors occur
6. **Completion**: Summary (commit behavior depends on command type)

## Command Hierarchy

**Composite commands** (allowed to commit):
- `/implement_and_review_tool` - Complete tool implementation workflow
- `/fix_all_issues` - Batch-fix multiple issues

**Atomic commands** (do NOT commit unless user asks):
- `/type_safety` - Improve TypeScript type safety
- `/security_audit` - Security-focused code review
- `/review_pr` - Systematic code review
- `/jules_test` - Comprehensive test writing
- `/fix_todos` - Fix or remove TODO comments
- `/fix_errors` - Convert throw to structured errors
- `/add_docs` - Add JSDoc comments
- `/safe_refactor` - Create refactoring plan
- `/perf_fix_spawn` - Convert spawn-based tests

**Important**: Atomic commands stop after providing summary. They do not auto-commit. If you want commit behavior, use a composite command like `/fix_all_issues` or `/implement_and_review_tool`.

## Usage

Commands are triggered in Cursor with:

```
/command_name
```

For example:
- `/impl_add_tool` - Start tool implementation
- `/fix_todos` - Fix all TODO comments
- `/review_pr` - Review code

## Command Dependencies

Some commands depend on external files:

- `impl_add_tool` → `docs/TOOL_IMPLEMENTATION_CHECKLIST.md`
- `implement_and_review_tool` → `docs/TOOL_IMPLEMENTATION_CHECKLIST.md`
- `workflow_implement_tool` → `docs/TOOL_IMPLEMENTATION_CHECKLIST.md` (deprecated)
- `add_docs` → `README.md`, `docs/COMMANDS.md`

Ensure these files exist before running dependent commands.

## Composite Commands

**Composite commands** chain multiple workflows together for complete automation:

### `/implement_and_review_tool` ⭐

This command combines:
- Tool generation (optional)
- Tool implementation (`impl_add_tool` steps 1-7)
- Comprehensive testing with Jules role (`jules_test` patterns)
- Code review (`review_pr`)
- Explicit fix loop (fix → re-test → re-review)
- Commit and post-commit review
- Summary step

**Use when**: You want to implement a tool with full quality checks in one command.

**Benefits**:
- Single command for complete workflow
- Idempotent: safe to re-run after partial completion
- Explicit quality gates: tests + review must be green before commit
- Clear ownership: Jules role for "try to break it" testing
- Summary step for better UX

### `/fix_all_issues`

This command combines:
- Fix TODOs (`fix_todos` logic)
- Fix lint and formatting
- Fix type errors (`type_safety` logic)
- Fix documentation (`add_docs` logic)
- Run tests between stages
- Summary of fixes

**Use when**: You want to batch-fix multiple issues in a safe order.

**Benefits**:
- Fixes issues in dependency order
- Tests between stages prevent regressions
- Summary tracks what was fixed

## Best Practices

1. **Run commands in order**: Some commands build on others (e.g., implement → test → review)
2. **Review output**: Commands log progress - review logs for issues
3. **Fix errors promptly**: If a command fails, fix issues before continuing
4. **Use appropriate commands**: Choose the right command for the task
5. **Follow conventions**: Commands follow project conventions defined in `.cursor/rules/`

## Related Documentation

- **Rules**: See `.cursor/rules/` for patterns and conventions
- **Roles**: See `.cursor/rules/role.*.mdc` for role definitions
- **Git Workflow**: See `.cursor/rules/git.mdc` for commit workflow
- **Code Review**: See `.cursor/rules/code_review.mdc` for review checklist

