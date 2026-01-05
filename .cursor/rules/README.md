# Cursor Rules

This directory contains rule files (`.mdc` - Markdown Cursor) that guide AI behavior. Rules define patterns, conventions, and best practices for the codebase.

## Rule Categories

### Always Applied Rules (`alwaysApply: true`)

These rules are always active and apply to all code:

- **`core.mdc`** - Core conventions and architecture patterns
  - Project overview, technology stack, import conventions
  - Type patterns, function documentation, code style
  - Git workflow (CRITICAL - auto-commit policy)
  - Always applies to: `**/*.ts`

- **`git.mdc`** - Git workflow and commit best practices
  - Auto-commit policy (REQUIRED)
  - Commit workflow, pre-commit hooks
  - Branch strategy, commit message format
  - Always applies to: `**/*`

### Role-Specific Rules

These rules apply when a specific role is active:

- **`role.impl.mdc`** - Implementer role patterns
  - Writing new code, following project patterns
  - Tool implementation, error handling, types
  - Applies to: `src/**/*.ts`, `!**/*.test.ts`

- **`role.review.mdc`** - Reviewer role patterns
  - Systematic code review, security checks
  - Quality gates, approval criteria
  - Applies to: `**/*.ts`

- **`role.jules.mdc`** - Stress tester role patterns
  - Comprehensive testing, edge cases
  - Breaking things, ensuring robustness
  - Applies to: Test files

- **`role.planner.mdc`** - Planner role patterns
  - Creating step-by-step plans
  - Breaking down complex tasks
  - Applies to: Planning tasks

- **`role.cli.mdc`** - CLI runner role patterns
  - Executing safe commands
  - Validating permissions, handling sandboxing
  - Applies to: CLI operations

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

- **`errors.mdc`** - Error handling patterns
  - Error codes, structured errors
  - Never throw, always return errors
  - Applies to: `src/**/*.ts`, `!**/*.test.ts`

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
  - Applies to: `**/*.ts`, `**/*.md`

- **`code_review.mdc`** - Code review patterns and quality checks
  - Review checklist, common issues
  - Applies to: `**/*.ts`

- **`debugging.mdc`** - Debugging patterns and troubleshooting
  - Debug info, verbose output
  - Applies to: All code

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

## Rule Precedence

1. **Always Applied Rules** (`alwaysApply: true`) - Highest priority
   - `core.mdc` - Always applies
   - `git.mdc` - Always applies

2. **Role-Specific Rules** - Applied when role is active
   - `role.impl.mdc` - When Implementer role
   - `role.review.mdc` - When Reviewer role
   - etc.

3. **Feature-Specific Rules** - Applied based on file patterns
   - `tools.mdc` - For tool files
   - `testing.mdc` - For test files
   - etc.

4. **Glob Patterns** - Rules apply based on file matching
   - `**/*.ts` - All TypeScript files
   - `src/**/*.ts` - Source TypeScript files
   - `!**/*.test.ts` - Exclude test files

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

### Git Workflow (CRITICAL)
- **Auto-commit**: REQUIRED after code changes
- **Workflow**: Stage → Preflight → Commit → Review
- **Format**: Conventional commits (`type(scope): subject`)

### Security
- **Paths**: Always use `context.paths.resolveAllowed()`
- **Commands**: Always check allowlist
- **Secrets**: Never log secrets or credentials

### Testing
- **Isolation**: Use temp directories
- **Coverage**: Success, error, edge cases
- **Patterns**: Follow `testing.mdc` patterns

## Related Documentation

- **Commands**: See `.cursor/commands/` for command definitions
- **Roles**: See `role.*.mdc` files for role-specific patterns
- **Project Docs**: See `docs/` for detailed documentation

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

