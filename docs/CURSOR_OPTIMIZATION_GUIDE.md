# Cursor Optimization Guide

## Overview

This document identifies Cursor features we're **not currently using** and optimization opportunities for rules, commands, indexing, and workflow automation.

## Current State

### ✅ What We're Using

- **MDC Rules** (`.cursor/rules/*.mdc`) - 18 rules covering core patterns
- **File-based rule activation** - Rules activate based on globs
- **Always-apply rules** - Core rules always in context
- **Cross-references** - Rules link to each other

### ❌ What We're Missing

## 1. Missing Cursor Features

### 1.1 `.cursorrules` File (Legacy - Deprecating)

**What**: Single-file rule format (legacy, being deprecated)

**Status**: ⚠️ **Still supported but deprecating** - Cursor recommends migrating to Project Rules (`.cursor/rules/*.mdc`)

**Why Use It** (if at all):

- Keep it **tiny** - quick index + pointers only
- Not the primary rule system (use `.cursor/rules/` for that)
- Works alongside `.cursor/rules/` (both are loaded)

**Current Status**: ✅ Created (tiny quick reference only)

**Recommendation**: Keep minimal - just an index pointing to `.cursor/rules/`

**Impact**: Low - Convenience only, not primary rule system

### 1.2 Custom Commands (Chat Commands with `/`)

**What**: Reusable workflows triggered with `/` in Chat

**Why Use It**:

- Standardize common workflows
- Share workflows across team
- Reduce repetitive prompts
- More reliable than "recipes" (which may not be visible in UI)

**Current Status**: ❌ Not using

**How to Create**:

1. Settings > Custom Commands
2. Add command with `/` prefix (e.g., `/impl_add_tool`)
3. Write prompt that references rules
4. Save and use in Chat

**Example Commands to Create**:

1. **`/impl_add_tool`** - "You are the Implementer. Follow role.impl.mdc. Add a tool end-to-end: schema in types.ts, handler in tools/, register in tool_registry.ts, add to agent, create tests."

2. **`/review_pr`** - "You are the Reviewer. Follow role.review.mdc. Review this code systematically using code_review.mdc checklist. Provide verdict and specific feedback."

3. **`/jules_test`** - "You are Jules (stress tester). Follow role.jules.mdc. Write comprehensive tests covering edge cases, error paths, and boundary conditions."

4. **`/safe_refactor`** - "You are the Planner. Follow role.planner.mdc. Use Plan Mode to create step-by-step plan for this refactor. Execute in phases with tests after each."

5. **`/perf_fix_spawn`** - "Convert spawn-based tests to direct imports where safe. Follow performance.mdc patterns. Verify tests still pass."

**Impact**: Very High - Standardizes workflows, saves hours

### 1.3 Agent Modes (Official)

**What**: Cursor Agent has different modes optimized for different tasks (capabilities/tools differ by mode)

**Why Use It**:

- Mode-specific optimizations
- Better task matching
- Improved results for specialized tasks

**Current Status**: ❌ Not using

**How to Use**:

1. Open Chat (Cmd+L) or Composer (Cmd+I)
2. Select appropriate mode for task
3. Agent uses mode-specific capabilities

**Use Cases for Our Project**:

- Code generation mode for new tools
- Test mode for test generation
- Review mode for code review
- Refactor mode for large changes

**Impact**: High - Better results for specialized tasks

### 1.4 Plan Mode (Official)

**What**: Official Cursor feature - AI drafts step-by-step plan before executing code changes. Plans are editable.

**Why Use It**:

- Transparency in AI behavior
- Review and edit plans before execution
- Better control over large refactors
- Reduces unexpected changes
- First-class flow for longer agent work

**Current Status**: ❌ Not using

**How to Use**:

1. Open Composer (Cmd+I)
2. Enable "Plan Mode" toggle
3. Describe desired changes
4. Review editable plan
5. Edit plan if needed
6. Execute when satisfied

**Use Cases for Our Project**:

- Large refactoring (e.g., error handling migration)
- Architecture changes
- Multi-file updates
- Breaking changes
- Use with `role.planner.mdc` for best results

**Impact**: Very High - Prevents unexpected changes, improves predictability

### 1.5 Background Agents (Official)

**What**: Official Cursor feature - Agents run asynchronously in a remote environment. You can follow up or take over.

**Why Use It**:

- Parallel task execution
- Divide large tasks across agents
- Run tasks in background
- Continue working while agents run

**Current Status**: ❌ Not using

**How to Use**:

1. Open Composer (Cmd+I)
2. Enable "Background Agents"
3. Assign tasks to agents
4. Agents run asynchronously
5. Follow up or take over when ready

**Use Cases for Our Project**:

- Generate tool + tests in parallel
- Refactor multiple files simultaneously
- Write docs while implementing features
- Run tests while implementing

**Impact**: High - Faster for large tasks, better workflow

### 1.6 Bugbot (Official - AI Code Reviewer)

**What**: Official Cursor feature - Automatic PR review that identifies bugs and suggests fixes. Has dedicated documentation.

**Why Use It**:

- Automated code review
- Catches bugs before merge
- Suggests fixes automatically
- GitHub integration
- Reduces manual review time

**Current Status**: ❌ Not using (requires GitHub integration)

**How to Use**:

1. Enable in Cursor settings
2. Connect GitHub account
3. Bugbot reviews PRs automatically
4. Applies fixes with one click

**Impact**: Very High - Automated quality checks, saves review time

### 1.7 Visual Context in Chat

**What**: Upload images (Figma mockups, screenshots) to Chat for context

**Why Use It**:

- Design-to-code workflows
- Debug UI issues
- Extract text from images
- Visual reference for implementation

**Current Status**: ❌ Not using

**Use Cases for Our Project**:

- Web dashboard UI improvements
- Documentation screenshots
- Error message screenshots for debugging

**Impact**: Low (we're CLI-focused, but useful for web dashboard)

### 1.8 Voice Control

**What**: Control AI agent via speech commands

**Why Use It**:

- Hands-free coding
- Accessibility
- Faster for some tasks

**Current Status**: ❌ Not using

**Impact**: Low - Nice to have, not essential

## 2. Rule Optimizations

### 2.1 Rule Indexing

**Current Issue**: All rules may be loaded into context, even when not needed

**Optimization**: Better use of `globs` and `alwaysApply`

**Current Rules Analysis**:

| Rule                | alwaysApply | globs                                           | Optimization                          |
| ------------------- | ----------- | ----------------------------------------------- | ------------------------------------- |
| `core.mdc`          | ✅ true     | `["**/*.ts"]`                                   | ✅ Good - always needed               |
| `project.mdc`       | ✅ true     | `[]`                                            | ✅ Good - always needed               |
| `documentation.mdc` | ✅ true     | `[]`                                            | ⚠️ Could be file-based                |
| `agents.mdc`        | ❌ false    | `["src/agents/**/*.ts"]`                        | ✅ Good                               |
| `tools.mdc`         | ❌ false    | `["src/tools/**/*.ts"]`                         | ✅ Good                               |
| `testing.mdc`       | ❌ false    | `["**/*.test.ts"]`                              | ✅ Good                               |
| `errors.mdc`        | ❌ false    | `["**/*.ts"]`                                   | ⚠️ Very broad, could be more specific |
| `security.mdc`      | ❌ false    | `["src/core/executor.ts", "src/tools/**/*.ts"]` | ✅ Good                               |
| `performance.mdc`   | ❌ false    | `["**/*.ts"]`                                   | ⚠️ Very broad                         |

**Recommendations**:

1. **Make `documentation.mdc` file-based**:

    ```yaml
    alwaysApply: false
    globs: ['**/*.ts', 'docs/**/*.md']
    ```

2. **Narrow `errors.mdc` globs**:

    ```yaml
    globs: ['src/**/*.ts', '!**/*.test.ts'] # Exclude tests
    ```

3. **Narrow `performance.mdc` globs**:
    ```yaml
    globs: ['src/core/**/*.ts', 'src/tools/**/*.ts']
    ```

**Impact**: Medium - Reduces context window usage

### 2.2 Rule Organization

**Current**: 18 rules, some overlap

**Optimization**: Consolidate related rules

**Potential Consolidations**:

1. **Merge `testing.mdc` + `testing_improvements.mdc`**:
    - Both cover testing patterns
    - Could be one comprehensive rule

2. **Split `core.mdc`**:
    - Very large (227 lines)
    - Could split into:
        - `core.mdc` - Architecture only
        - `code_style.mdc` - Style conventions
        - `imports.mdc` - Import patterns

**Impact**: Low - Current organization works, but could be cleaner

### 2.3 Rule Examples

**Current**: Most rules have examples

**Optimization**: Add more real-world examples from our codebase

**Missing Examples**:

- `tools.mdc` - Could add example from actual tool handler
- `routing.mdc` - Could add example from actual router
- `storage.mdc` - Could add example from actual storage implementation

**Impact**: Low - Examples help, but current ones are sufficient

## 3. Command Palette Optimizations

### 3.1 Custom Commands

**What**: Define custom commands in Cursor settings

**Current Status**: ❌ Not using

**Potential Commands**:

```json
{
    "commands": [
        {
            "command": "assistant.test",
            "title": "Run Tests",
            "command": "npm test"
        },
        {
            "command": "assistant.build",
            "title": "Build Project",
            "command": "npm run build"
        },
        {
            "command": "assistant.review",
            "title": "Code Review",
            "command": "npm run review"
        }
    ]
}
```

**Impact**: Low - Nice convenience, but npm scripts work fine

### 3.2 Keyboard Shortcuts

**What**: Custom keyboard shortcuts for common tasks

**Current Status**: ❌ Not using

**Potential Shortcuts**:

- `Cmd+Shift+T` - Run tests
- `Cmd+Shift+R` - Run code review
- `Cmd+Shift+B` - Build project

**Impact**: Low - Convenience only

## 4. Indexing Optimizations

### 4.1 Codebase Indexing

**What**: Cursor indexes codebase for semantic search. Cursor has **two ignore files**:

- **`.cursorignore`**: Best-effort exclude from AI access AND indexing (security/perf)
- **`.cursorindexingignore`**: Exclude from indexing only (perf only)

**Current Status**: ✅ Automatic (default), ⚠️ Not optimized

**Optimization Opportunities**:

1. **Use `.cursorindexingignore` for Performance**:
    - Exclude build outputs: `dist/`, `coverage/`, `.test-results/`
    - Exclude cache: `.cache/`, `.tmp/`
    - Exclude profiler outputs: `*.prof`, `*.profraw`
    - ✅ **Created**: `.cursorindexingignore` file

2. **Use `.cursorignore` for Security**:
    - Secrets, API keys, credentials
    - Sensitive config files
    - Files you don't want sent to AI at all

3. **Index External Docs** (Settings > Indexing & Docs):
    - Node.js documentation
    - Zod documentation
    - Framework docs you rely on
    - Internal design docs (hosted URLs)
    - Reference via `@mentions` in Chat

**Impact**: High - Faster indexing, better context, reduced hallucinations

### 4.2 Context Window Management

**What**: Cursor manages context window automatically

**Optimization**: Ensure rules don't exceed limits

**Current Rule Sizes**:

- `core.mdc`: 227 lines
- `tools.mdc`: ~200 lines
- `testing.mdc`: ~150 lines
- Others: <100 lines each

**Total**: ~2000 lines of rules (if all loaded)

**Recommendation**:

- Keep `alwaysApply: true` only for essential rules
- Use `globs` to load rules selectively
- Monitor context usage in Chat

**Impact**: Medium - Prevents context overflow

## 5. Workflow Automation

### 5.1 Composer Recipes (Revisited)

**Priority Recipes to Create**:

1. **"Add New Tool"** (Highest Priority)
    - Most common task
    - Saves ~30 minutes per tool
    - Multi-file operation

2. **"Add Error Handling"**
    - Convert throws to structured errors
    - Add try/catch
    - Update error types

3. **"Generate Tests"**
    - Create test file
    - Add test cases
    - Add mocks

4. **"Add Documentation"**
    - Add JSDoc
    - Update README
    - Update COMMANDS.md

**Impact**: Very High - Major time savings

### 5.2 Agent Mode Workflows

**Automated Workflows**:

1. **Test Generation Workflow**:

    ```
    "For each tool in src/tools/, generate comprehensive tests
    covering success, error, and edge cases. Run tests and fix failures."
    ```

2. **Documentation Workflow**:

    ```
    "Review all exported functions and add missing JSDoc comments
    following the patterns in documentation.mdc."
    ```

3. **Error Handling Workflow**:
    ```
    "Find all throw statements and convert them to structured errors
    using makeError() following errors.mdc patterns."
    ```

**Impact**: Very High - Automated improvements

### 5.3 Plan Mode Workflows

**Large Refactoring Plans**:

1. **Error Handling Migration**:
    - Plan: Convert all throws to structured errors
    - Review plan before execution
    - Execute in phases

2. **Type Safety Improvements**:
    - Plan: Add missing type annotations
    - Review plan
    - Execute

**Impact**: High - Safe large refactors

## 6. Integration Opportunities

### 6.1 GitHub Integration

**Features**:

- Bugbot for PR reviews
- Sync Composer recipes
- Share rules across team

**Current Status**: ❌ Not configured

**Impact**: Medium - Team collaboration

### 6.2 VS Code Extension Integration

**What**: Our VS Code extension could leverage Cursor features

**Opportunities**:

- Use Cursor rules in extension
- Share context between Cursor and extension
- Unified AI experience

**Impact**: Low - Extension is separate

## 7. Role Packs (High-Leverage Change)

### The Missing Optimization

**Problem**: Current rules are "project truth" but don't define **roles** for AI to play.

**Solution**: Add role packs that define specific AI roles with contracts.

### Role Packs Created ✅

1. **`role.impl.mdc`** - Implementer role
    - Writes new code following patterns
    - Focuses on implementation, then tests
    - Use: "You are the Implementer. Follow role.impl.mdc."

2. **`role.review.mdc`** - Reviewer role
    - Reviews code systematically
    - Uses code_review.mdc checklist
    - Use: "You are the Reviewer. Follow role.review.mdc."

3. **`role.jules.mdc`** - Stress tester role
    - Finds edge cases, breaks things
    - Tests robustness
    - Use: "You are Jules. Follow role.jules.mdc."

4. **`role.cli.mdc`** - CLI runner role
    - Executes safe commands
    - Validates permissions
    - Use: "You are the CLI Runner. Follow role.cli.mdc."

5. **`role.planner.mdc`** - Planner role
    - Creates step-by-step plans
    - Use with Plan Mode
    - Use: "You are the Planner. Follow role.planner.mdc."

### How to Use Role Packs

In Chat or Composer, start with role selection:

```
You are the Implementer. Follow role.impl.mdc first, then project rules.
Add a new tool for [description].
```

```
You are the Reviewer. Follow role.review.mdc first, then project rules.
Review this code systematically.
```

**Impact**: Very High - Improves consistency more than micro-tuning globs

## 8. Recommended Actions

### High Priority (Do First)

1. **Add Role Packs** ⚡⚡⚡ ✅ DONE
    - Use role packs in prompts
    - Select role explicitly: "You are the Implementer..."
    - **Impact**: Much better consistency

2. **Create Custom Commands (`/commands`)** ⚡⚡⚡
    - `/impl_add_tool` - Add tool end-to-end
    - `/review_pr` - Review checklist
    - `/jules_test` - Comprehensive tests
    - **Impact**: Standardizes workflows, saves hours

3. **Use Plan Mode for Refactors** ⚡⚡
    - Large refactors spanning many files
    - Use with `role.planner.mdc`
    - **Impact**: Safer, more predictable

4. **Optimize Indexing** ⚡⚡ ✅ DONE
    - Use `.cursorindexingignore` for perf
    - Index external docs (Node, Zod)
    - **Impact**: Faster, better context, fewer hallucinations

### Medium Priority

5. **Use Background Agents** ⚡
    - Parallel "tests + docs + refactor" streams
    - **Impact**: Faster for large tasks

6. **Set Up Bugbot** ⚡
    - Once PR flow is stable
    - GitHub integration
    - **Impact**: Automated quality checks

### Low Priority (Nice to Have)

7. **Custom Commands** - Convenience only
8. **Keyboard Shortcuts** - Convenience only
9. **Voice Control** - Not essential
10. **Visual Context** - Limited use case

## 9. Implementation Checklist

### Immediate (This Week) ✅

- [x] Create role packs (role.impl/review/jules/cli/planner) ✅
- [x] Create `.cursorrules` quick reference (tiny, legacy) ✅
- [x] Optimize `errors.mdc` and `performance.mdc` globs ✅
- [x] Make `documentation.mdc` file-based (not always-apply) ✅
- [x] Create `.cursorindexingignore` for perf ✅
- [x] Create 5 initial custom commands ✅
- [x] Optimize alwaysApply set (reduce from 5 to 2) ✅
- [x] Create additional commands (fix_errors, add_docs, fix_todos, type_safety, security_audit) ✅

### Short Term (This Month)

- [ ] Use Plan Mode for one large refactor (with role.planner.mdc)
- [ ] Use Background Agents for parallel tasks
- [ ] Index external docs (Node, Zod) in Settings > Indexing & Docs
- [ ] Create `/safe_refactor` custom command
- [ ] Create `/perf_fix_spawn` custom command

### Long Term (Future)

- [ ] Set up Bugbot (once PR flow is stable)
- [ ] Optimize alwaysApply set (currently 5 rules, should be 2-3 max)
- [ ] Consolidate overlapping rules (testing.mdc + testing_improvements.mdc)
- [ ] Add more real-world examples to rules

## 10. Optimized AlwaysApply Set

### Current State

**5 rules with `alwaysApply: true`**:

- `core.mdc` ✅ (essential)
- `project.mdc` ✅ (essential)
- `task_tracking.mdc` ⚠️ (could be file-based)
- `research_policy.mdc` ⚠️ (could be file-based)
- `test_policy.mdc` ⚠️ (could be file-based)

### Recommended AlwaysApply Set (2-3 max)

**Keep**:

- `core.mdc` - Core conventions (essential)
- `project.mdc` - Project context (essential)

**Make File-Based**:

- `task_tracking.mdc` - Only when working on tasks/docs
- `research_policy.mdc` - Only when researching
- `test_policy.mdc` - Only when running tests

**Impact**: Medium - Reduces context window usage, better performance

## 11. Measuring Impact

### Metrics to Track

1. **Time Saved**:
    - Before: Time to add new tool manually
    - After: Time with Composer recipe
    - Target: 80% reduction

2. **Test Coverage**:
    - Before: Current coverage
    - After: Coverage after Agent Mode test generation
    - Target: 90%+ coverage

3. **Context Usage**:
    - Monitor context window usage
    - Track rule loading efficiency
    - Optimize as needed

### Success Criteria

- ✅ Composer recipes save 2+ hours per week
- ✅ Test coverage increases by 20%+
- ✅ Context window usage optimized
- ✅ Rules load only when needed

## 12. Custom Commands Examples

### `/impl_add_tool`

```
You are the Implementer. Follow role.impl.mdc first, then project rules.

Add a new tool end-to-end:
1. Create Zod schema in src/core/types.ts
2. Create handler function in src/tools/[tool_name]_tools.ts
3. Register in src/core/tool_registry.ts
4. Add to appropriate agent in src/agents/index.ts
5. Create test file src/tools/[tool_name]_tools.test.ts

Follow patterns in tools.mdc, errors.mdc, and testing.mdc.
```

### `/review_pr`

```
You are the Reviewer. Follow role.review.mdc first, then project rules.

Review this code systematically using the checklist in code_review.mdc:
- Functionality (edge cases, error handling, bugs)
- Security (validation, paths, commands, secrets)
- Performance (caching, efficiency)
- Quality (conventions, types, unused code)
- Testing (coverage, edge cases, mocks)
- Documentation (JSDoc, README updates)

Provide specific, actionable feedback. Approve only if all checks pass.
```

### `/jules_test`

```
You are Jules (stress tester). Follow role.jules.mdc first, then project rules.

Write comprehensive tests covering:
- Success cases
- Error cases (validation, permissions, execution)
- Edge cases (empty/null/undefined, boundaries, max sizes)
- Invalid inputs (wrong types, malformed data)
- Race conditions (if applicable)

Use patterns from testing.mdc. Break things and ensure robustness.
```

### `/safe_refactor`

```
You are the Planner. Follow role.planner.mdc first, then project rules.

Use Plan Mode to create a step-by-step plan for this refactor:
1. Analyze scope and dependencies
2. Break into clear, sequential steps
3. Identify affected files
4. Create reviewable plan

Execute in phases with tests after each phase. Each step should be independently reviewable.
```

### `/perf_fix_spawn`

```
Convert spawn-based tests to direct imports where safe.

Follow performance.mdc patterns:
- Use direct imports instead of spawnSync when possible
- Keep spawnSync only for actual command execution tests
- Verify tests still pass after conversion
- Update test documentation if needed
```

## 13. Resources

### Cursor Documentation

- [Cursor Rules](https://cursor.sh/docs)
- [Composer Guide](https://cursor.sh/docs/composer)
- [Agent Mode](https://cursor.sh/docs/agent-mode)
- [Plan Mode](https://cursor.sh/docs/plan-mode)

### Our Documentation

- `.cursor/rules/` - All MDC rules
- `docs/CURSOR_CUSTOM_COMMANDS_SETUP.md` - How to create custom commands
- `docs/CURSOR_INDEX_EXTERNAL_DOCS.md` - How to index external documentation
- `docs/MDC_RULES_PORTABILITY.md` - Rule portability guide

## Conclusion

**Key Takeaways**:

1. **Role packs are the high-leverage change** - Define AI roles explicitly
2. **Custom Commands (`/`) standardize workflows** - More reliable than "recipes"
3. **Plan Mode is official and powerful** - Use for large refactors
4. **Two ignore files** - `.cursorindexingignore` for perf, `.cursorignore` for security
5. **Index external docs** - Reduces hallucinations via `@mentions`

**Recommended Focus** (Updated Order):

1. ✅ **Role packs** - Use in prompts: "You are the Implementer..."
2. **Custom Commands** - Create `/impl_add_tool`, `/review_pr`, `/jules_test`
3. **Plan Mode** - Use with `role.planner.mdc` for large refactors
4. **Indexing optimization** - `.cursorindexingignore` + external docs
5. **Background Agents** - Parallel task execution
6. **Bugbot** - Once PR flow is stable

**Expected Impact**: 10-50x improvement in development speed for common tasks, better consistency through role-based prompts.
