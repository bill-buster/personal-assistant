# Cursor Rules

This directory contains rule files (`.mdc` - Markdown Cursor) that guide AI behavior. Rules define patterns, conventions, and best practices for the codebase.

## Rule Categories

### Always Applied Rules (`alwaysApply: true`)

These rules are always active and apply to all code:

- **`core.mdc`** - Core conventions and architecture patterns
  - Project overview, technology stack, import conventions
  - Type patterns, function documentation, code style
  - Logging conventions (stderr vs stdout)
  - Always applies to: `**/*.ts`

- **`project.mdc`** - Project context and quick reference
  - Project overview, key files, common tasks
  - Architecture decisions, limitations
  - Always applies to: All code

### Role-Specific Rules

**Important**: Role rules are manual-only (`globs: []`). They must be explicitly invoked and are not auto-applied.

- **`role.impl.mdc`** - Implementer role patterns
  - Writing new code, following project patterns
  - Tool implementation, error handling, types
  - Manual-only: Invoke explicitly when implementing features

- **`role.review.mdc`** - Reviewer role patterns
  - Systematic code review, security checks
  - Quality gates, approval criteria
  - Output: Approve/block decision + list of issues
  - Manual-only: Invoke explicitly for code reviews

- **`role.jules.mdc`** - Stress tester role patterns
  - Comprehensive testing, edge cases
  - Breaking things, ensuring robustness
  - Output: 3-10 tests + list of risks found
  - Manual-only: Invoke explicitly for adversarial testing

- **`role.planner.mdc`** - Planner role patterns
  - Creating step-by-step plans
  - Breaking down complex tasks
  - Output: Plan only (no code changes until plan accepted)
  - Manual-only: Invoke explicitly for planning

- **`role.cli.mdc`** - CLI runner role patterns
  - Executing safe commands
  - Validating permissions, handling sandboxing
  - Manual-only: Invoke explicitly for CLI/executor work

### Feature-Specific Rules

These rules apply to specific features or areas:

- **`tools.mdc`** - Tool implementation patterns
  - Tool handler structure, validation, error handling
  - Security patterns, debug info
  - Applies to: Tool implementations

- **`testing.mdc`** - Testing patterns and conventions
  - Test structure, isolation, mocks
  - Test utilities, assertions
  - Applies to: Test files

- **`errors.mdc`** - Error handling patterns (reference-only)
  - Error codes, structured errors
  - Never throw, always return errors
  - See `docs/ERRORS.md` for detailed examples
  - Manual-only: `globs: []`

- **`security.mdc`** - Security patterns
  - Path validation, command allowlist
  - Secret handling, permission checks
  - Applies to: Security-critical files

- **`performance.mdc`** - Performance optimization patterns
  - Caching, async patterns, efficiency
  - Applies to: Performance-critical code

- **`routing.mdc`** - Intent routing and parser patterns
  - Router structure, parser patterns
  - Applies to: Router implementations

- **`storage.mdc`** - Data persistence and JSONL storage patterns
  - Storage patterns, atomic writes
  - Applies to: Storage implementations

- **`providers.mdc`** - LLM provider and ChatModel implementation patterns
  - Provider interface, retry logic
  - Applies to: Provider implementations

- **`agents.mdc`** - Agent definitions and role-based tool access patterns
  - Agent structure, tool access
  - Applies to: Agent definitions

- **`documentation.mdc`** - Documentation requirements and patterns
  - JSDoc patterns, README updates
  - Applies to: `docs/**/*.md`, `README.md`, `CONTRIBUTING.md`

- **`code_review.mdc`** - Code review patterns and quality checks (reference-only)
  - Review checklist, common issues
  - Manual-only: `globs: []`

- **`debugging.mdc`** - Debugging patterns and troubleshooting (reference-only)
  - Debug info, verbose output
  - See `docs/DEBUGGING.md` for full guide
  - Manual-only: `globs: []`

- **`workflow.mdc`** - Workflow and command-chaining rules
  - Composite command structure, quality gates
  - Auto-commit policy for composite workflows only
  - Manual-only: `globs: []`

- **`error_recovery.mdc`** - Error recovery and resume patterns
  - Recovery ladder, partial progress handling
  - Manual-only: `globs: []`

- **`git.mdc`** - Git workflow and commit best practices (reference-only)
  - Commit workflow, pre-commit hooks
  - Branch strategy, commit message format
  - Manual-only: `globs: []`

- **`test_policy.mdc`** - Test execution policy
  - When to run tests, caching
  - Applies to: Test execution

- **`testing_improvements.mdc`** - Testing improvements and Cursor-specific patterns
  - Test improvements, Cursor integration
  - Applies to: Test files

- **`task_tracking.mdc`** - Task tracking and instruction logging patterns
  - Todo tracking, instruction logs
  - Applies to: Documentation files

- **`research_policy.mdc`** - When to use web research vs codebase knowledge
  - Research decision tree
  - Applies to: All tasks

- **`project.mdc`** - Project context and quick reference
  - Project overview, key files
  - Applies to: All code

## Commands

The system uses composite commands for multi-step workflows:

- **`/help`** - Show available commands and roles
- **`/implement_and_review_tool`** - Implement a tool end-to-end with quality gates
- **`/fix_all_issues`** - Fix all linting/type errors in a file

Commands follow the workflow pattern in `workflow.mdc`:
- Preflight → Implement → Test → Review → Fix loop → Commit

Auto-commit behavior is part of composite command workflows, not a global always-on policy.

## Rule Precedence

1. **Always Applied Rules** (`alwaysApply: true`) - Highest priority
   - `core.mdc` - Always applies
   - `project.mdc` - Always applies

2. **Role-Specific Rules** - Manual-only, must be explicitly invoked
   - `role.impl.mdc` - When Implementer role is selected
   - `role.review.mdc` - When Reviewer role is selected
   - `role.jules.mdc` - When Stress Tester role is selected
   - `role.planner.mdc` - When Planner role is selected
   - `role.cli.mdc` - When CLI Runner role is selected

3. **Feature-Specific Rules** - Applied based on file patterns
   - `tools.mdc` - For tool files
   - `testing.mdc` - For test files
   - etc.

4. **Reference-Only Rules** - Manual-only, no auto-application
   - `git.mdc` - Reference for git workflow
   - `code_review.mdc` - Reference for review patterns
   - `errors.mdc` - Reference for error patterns
   - `debugging.mdc` - Reference for debugging (see `docs/DEBUGGING.md`)
   - `workflow.mdc` - Reference for workflow patterns
   - `error_recovery.mdc` - Reference for recovery patterns

5. **Glob Patterns** - Rules apply based on file matching
   - `**/*.ts` - All TypeScript files
   - `src/**/*.ts` - Source TypeScript files
   - `!**/*.test.ts` - Exclude test files
   - `[]` - Manual-only (no auto-application)

## Rule File Format

Each rule file follows this format:

```markdown
---
description: Brief description of the rule
globs: ["**/*.ts"]  # File patterns this rule applies to
alwaysApply: false  # Whether rule always applies
---

# Rule Title

Rule content...
```

## Key Rules Reference

### Core Conventions
- **Import order**: Node built-ins → External packages → Internal imports
- **Types**: Always derive from Zod schemas
- **Errors**: Never throw, always return structured errors
- **Validation**: Zod schemas at all boundaries

### Git Workflow
- **Commit format**: Conventional commits (`type(scope): subject`)
- **Workflow**: Stage → Preflight → Commit → Review
- **Auto-commit**: Only in composite command workflows (see `workflow.mdc`)
- **Normal sessions**: Commits are user-initiated

### Security
- **Paths**: Always use `context.paths.resolveAllowed()`
- **Commands**: Always check allowlist
- **Secrets**: Never log secrets or credentials

### Testing
- **Isolation**: Use temp directories
- **Coverage**: Success, error, edge cases
- **Patterns**: Follow `testing.mdc` patterns

## When to Use Roles

**Roles are manual-only** - they must be explicitly selected/invoked:

- **Jules (Stress Tester)**: Use for adversarial testing, finding edge cases
- **Reviewer**: Use for code review, approve/block decisions
- **Planner**: Use for creating step-by-step plans (outputs plan only, no code)
- **CLI Runner**: Use when working on executor/tool security code
- **Implementer**: Use when implementing new features following patterns

**Do not auto-apply roles** - they are designed for specific tasks and should be invoked intentionally.

## Related Documentation

- **Commands**: See `.cursor/commands/` for command definitions
- **Roles**: See `role.*.mdc` files for role-specific patterns
- **Project Docs**: See `docs/` for detailed documentation
  - `docs/DEBUGGING.md` - Full debugging guide
  - `docs/ERRORS.md` - Error handling examples

## Rule Maintenance

When adding or modifying rules:

1. **Follow format**: Use the standard frontmatter format
2. **Set globs correctly**: Specify which files the rule applies to
3. **Set alwaysApply**: Only set to `true` for critical rules
4. **Cross-reference**: Reference related rules where appropriate
5. **Update this README**: Add new rules to the appropriate category

## Rule Conflicts

If rules conflict:

1. **Always Applied** rules take precedence
2. **Role-Specific** rules override feature-specific for that role
3. **More specific globs** take precedence over general ones
4. **Later rules** (alphabetically) override earlier ones for same pattern

In practice, conflicts are rare because:
- Always applied rules are general (conventions)
- Role rules are role-specific
- Feature rules are feature-specific
- Glob patterns are usually non-overlapping

