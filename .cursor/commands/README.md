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

## Command Structure

All commands follow a consistent structure:

1. **Role Assignment**: Specifies which role to use (e.g., `role.impl.mdc`)
2. **Purpose**: Clear description of what the command does
3. **Process**: Step-by-step instructions
4. **Edge Cases**: Handling of special situations
5. **Error Handling**: What to do when errors occur
6. **Completion**: Standard workflow (stage, preflight, commit, review)

## Standard Workflow

All commands that modify code follow this workflow:

```markdown
After completing changes:
- Stage files, run preflight, and commit following git.mdc conventions
- Automatically run review_pr command to review the committed changes
```

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
- `add_docs` → `README.md`, `docs/COMMANDS.md`

Ensure these files exist before running dependent commands.

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

