**Status**: Reference-only  
**Canonical**: [docs/HOW_WE_WORK.md](HOW_WE_WORK.md) for current workflow, `.cursor/rules/workflow.mdc` for workflow patterns

---

# Command Chaining & Evaluation Patterns

*This document is kept for historical reference. Current workflow information is in [HOW_WE_WORK.md](HOW_WE_WORK.md) and `.cursor/rules/workflow.mdc`.*

## Overview

This guide explains how to create self-contained command loops and how to evaluate command quality, similar to how `impl_add_tool` works.

## Table of Contents

1. [Command Chaining Patterns](#command-chaining-patterns)
2. [Evaluation Mechanisms](#evaluation-mechanisms)
3. [Creating Self-Contained Loops](#creating-self-contained-loops)
4. [Quality Gates](#quality-gates)
5. [Examples](#examples)

---

## Command Chaining Patterns

### Pattern 1: Sequential Steps with Validation

**Used by**: `impl_add_tool`, `fix_todos`, `fix_errors`

```markdown
## Implementation Steps

1. **[STEP 1/N]** Do something...
   - Validate input
   - Log: "Step 1 complete: [result]"

2. **[STEP 2/N]** Do next thing...
   - Check prerequisites
   - Log: "Step 2 complete: [result]"

3. **[STEP N/N]** Final step...
   - Run quality checks
   - Log: "All steps complete"
```

**Key Features**:
- Numbered steps with clear progress tracking
- Each step logs completion
- Steps can validate prerequisites
- Steps can fail and stop the chain

### Pattern 2: REPL Loop Pattern

**Used by**: `src/app/repl.ts`

```typescript
const MAX_LOOPS = 8;
let loopCount = 0;

while (loopCount < MAX_LOOPS) {
    loopCount++;
    
    // Route input
    const result = await route(input, ...);
    
    // Execute tool if needed
    if (result.mode === 'tool_call') {
        const execResult = await executor.execute(...);
        
        // Add result to history for next iteration
        HISTORY.push({
            role: 'tool',
            content: JSON.stringify(execResult.result)
        });
        
        // Continue loop to process result
        continue;
    }
    
    // Exit conditions
    if (result.mode === 'reply') break;
    if (isRouteError(result)) break;
}
```

**Key Features**:
- Maximum loop count to prevent infinite loops
- Tool results feed back into next iteration
- History accumulates for context
- Clear exit conditions

### Pattern 3: Retry with Backoff

**Used by**: `src/providers/llm/retry.ts`

```typescript
async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { maxRetries: 3, ...options };
    
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt >= opts.maxRetries) break;
            if (!isRetryableError(error)) break;
            
            await sleep(calculateDelay(attempt));
        }
    }
    
    throw lastError;
}
```

**Key Features**:
- Exponential backoff
- Retry only on retryable errors
- Maximum retry limit
- Configurable retry conditions

### Pattern 4: Checklist-Driven Loop

**Used by**: `impl_add_tool` (reads checklist, implements, marks done)

```markdown
## Automatic Tool Selection

**FIRST**: Read checklist and find first unchecked item

1. Extract tool name and description
2. Implement tool
3. Mark as done in checklist
4. Move to next unchecked item
5. Repeat until all items checked
```

**Key Features**:
- Reads external state (checklist file)
- Processes items in order
- Updates state after each item
- Continues until completion

---

## Evaluation Mechanisms

### How `impl_add_tool` Evaluates Quality

The `impl_add_tool` command uses a **multi-stage evaluation** process:

#### Stage 1: Automated Static Analysis

```bash
npm run review src/tools/[tool_name]_tools.ts
```

**Checks**:
- Security issues (path traversal, shell injection, secrets)
- Performance issues (sync I/O, sequential async)
- Code quality (any types, missing docs)
- Error handling (throw statements)
- Testing (missing tests)
- Documentation (missing JSDoc)

**Output**: Score (0-100) + categorized issues

#### Stage 2: Manual Code Review

**Process**:
1. Switch to Reviewer role
2. Review using `code_review.mdc` checklist:
   - Functionality (edge cases, error handling, bugs)
   - Security (validation, paths, commands, secrets)
   - Performance (caching, efficiency)
   - Quality (conventions, types, unused code)
   - Testing (coverage, edge cases, mocks)
   - Documentation (JSDoc, README updates)
3. Provide specific, actionable feedback
4. Approve only if all checks pass

#### Stage 3: Functional Testing

```bash
npm test src/tools/[tool_name]_tools.test.ts
```

**Checks**:
- Success cases pass
- Error cases handled correctly
- Edge cases covered
- Tests are isolated (temp directories)

#### Stage 4: Preflight Checks

```bash
npm run preflight
```

**Checks**:
- Build succeeds
- Formatting correct
- Linting passes
- Type checking passes
- No memory leaks
- Smoke tests pass

#### Stage 5: Post-Commit Review

**Process**:
1. Automatically trigger `review_pr` command
2. Review committed changes
3. Verify nothing regressed

### Evaluation Criteria

#### ✅ **Command is Good If**:

1. **All automated checks pass**:
   - Review score > 80/100
   - No critical security issues
   - No blocking errors

2. **Manual review approves**:
   - All checklist items pass
   - No security vulnerabilities
   - Code follows conventions
   - Tests are adequate

3. **Tests pass**:
   - All test cases pass
   - Coverage is adequate
   - Edge cases handled

4. **Preflight passes**:
   - Build succeeds
   - No lint/type errors
   - Smoke tests pass

5. **Post-commit review approves**:
   - No regressions
   - Changes are correct

#### ❌ **Command Needs Fixes If**:

1. **Automated review finds issues**:
   - Review score < 80
   - Critical security issues
   - Blocking errors

2. **Manual review rejects**:
   - Security vulnerabilities
   - Code doesn't follow conventions
   - Tests missing or inadequate

3. **Tests fail**:
   - Test cases fail
   - Coverage insufficient

4. **Preflight fails**:
   - Build errors
   - Lint/type errors
   - Smoke test failures

---

## Creating Self-Contained Loops

### Template: Self-Contained Command Loop

```markdown
You are the [Role]. Follow role.[role].mdc first, then project rules.

## Command Loop

**IMPORTANT**: Log each step clearly. Use format: `[STEP X/Y] Description...`

**Loop Process**:

1. **[STEP 1/N]** Log: "Initializing..."
   - Read input/state
   - Validate prerequisites
   - Log: "Initialized: [status]"

2. **[STEP 2/N]** Log: "Processing items..."
   - Loop through items (max N iterations)
   - For each item:
     - Process item
     - Validate result
     - Log: "Item [N] processed: [result]"
     - If error: log and continue or break
   - Log: "All items processed"

3. **[STEP 3/N]** Log: "Running quality checks..."
   - Run automated review: `npm run review [files]`
   - Log: "Review score: [score]/100, [issues] issues"
   - If score < 80: log issues and continue to fix step

4. **[STEP 4/N]** Log: "Running manual review..."
   - Switch to Reviewer role
   - Review using code_review.mdc checklist
   - Log: "Review: [approved/rejected] with [N] issues"
   - If rejected: log issues and continue to fix step

5. **[STEP 5/N]** Log: "Running tests..."
   - Run: `npm test [test_files]`
   - Log: "Tests: [passed/failed], [N] tests"
   - If failed: log failures and continue to fix step

6. **[STEP 6/N]** Log: "Fixing issues..."
   - Fix issues found in review or tests
   - Log: "Fixed: [list of fixes]"
   - If issues remain: loop back to step 3

7. **[STEP 7/N]** Log: "Finalizing..."
   - Stage files: `git add [files]`
   - Run preflight: `npm run preflight`
   - If passed: commit
   - Log: "Committed: [commit_hash]"

8. **[STEP 8/N]** Log: "Post-commit review..."
   - Automatically trigger review_pr
   - Log: "Review complete: [approved/rejected]"

**Exit Conditions**:
- All items processed successfully
- Maximum iterations reached
- Critical error encountered
- User explicitly cancels

**Progress Tracking**:
- Use todo_write to track progress
- Log each step completion
- Show summaries (scores, counts, results)
```

### Example: Batch Fix Command

```markdown
You are the Implementer. Follow role.impl.mdc.

## Batch Fix Loop

1. **[STEP 1/6]** Find all issues...
   - Run: `npm run review src/`
   - Parse output for issues
   - Group by category
   - Log: "Found [N] issues across [M] files"

2. **[STEP 2/6]** Process each file...
   - For each file with issues:
     - Read file
     - Fix issues (one category at a time)
     - Validate fixes
     - Log: "Fixed [N] issues in [file]"
   - Log: "All files processed"

3. **[STEP 3/6]** Verify fixes...
   - Run: `npm run review src/`
   - Compare scores (should improve)
   - Log: "Review score: [before] → [after]"

4. **[STEP 4/6]** Run tests...
   - Run: `npm test`
   - Log: "Tests: [passed/failed]"

5. **[STEP 5/6]** Commit...
   - Stage, preflight, commit
   - Log: "Committed: [hash]"

6. **[STEP 6/6]** Review...
   - Trigger review_pr
   - Log: "Review: [approved/rejected]"
```

---

## Quality Gates

### Gate 1: Automated Review

**Threshold**: Score ≥ 80/100

**Action if fails**:
- Log issues
- Continue to fix step
- Re-run review after fixes

### Gate 2: Manual Review

**Threshold**: All checklist items pass

**Action if fails**:
- Log specific issues
- Continue to fix step
- Re-run review after fixes

### Gate 3: Tests

**Threshold**: All tests pass

**Action if fails**:
- Log failures
- Continue to fix step
- Re-run tests after fixes

### Gate 4: Preflight

**Threshold**: All checks pass

**Action if fails**:
- Log failures
- Fix issues
- Re-run preflight

### Gate 5: Post-Commit Review

**Threshold**: Review approves

**Action if fails**:
- Log issues
- Create fix commit
- Re-run review

---

## Examples

### Example 1: `impl_add_tool` Evaluation Flow

```
[STEP 8/13] Running automated code review...
  → npm run review src/tools/move_file_tools.ts
  → Score: 85/100, 3 issues found
  → Issues: 1 performance (sync I/O), 2 quality (missing JSDoc)

[STEP 9/13] Running manual code review...
  → Switching to Reviewer role
  → Reviewing handler function...
  → Reviewing test file...
  → Reviewing schema registration...
  → Approved with 2 minor issues (missing JSDoc)

[STEP 10/13] Running tests...
  → npm test src/tools/move_file_tools.test.ts
  → Tests: passed, 12 tests

[STEP 11/13] Fixing issues...
  → Fixed: Added JSDoc to handler function
  → Fixed: Converted sync I/O to async

[STEP 12/13] Staging and preflight...
  → git add src/tools/move_file_tools.ts ...
  → npm run preflight
  → Preflight: passed
  → Committed: abc123

[STEP 13/13] Post-commit review...
  → Triggering review_pr
  → Review: approved
```

### Example 2: REPL Loop Pattern

```typescript
// User: "read file test.txt and count words"
// Loop 1: Routes to read_file tool
// Loop 2: Executes read_file, gets content
// Loop 3: Routes to count_words tool with content
// Loop 4: Executes count_words, returns result
// Loop 5: Returns reply with word count
```

### Example 3: Checklist Loop

```markdown
## Tool Implementation Checklist Loop

1. Read checklist: docs/TOOL_IMPLEMENTATION_CHECKLIST.md
2. Find first unchecked: `- [ ] move_file - Move or rename...`
3. Implement move_file (steps 1-7)
4. Evaluate quality (steps 8-11)
5. Mark done: `- [x] move_file`
6. Find next unchecked: `- [ ] copy_file - Copy...`
7. Repeat until all checked
```

---

## Best Practices

### 1. Always Log Progress

```markdown
[STEP X/Y] Starting: [description]...
[STEP X/Y] Complete: [result summary]
```

### 2. Use Quality Gates

Don't proceed if quality gates fail. Fix issues first.

### 3. Set Maximum Iterations

Prevent infinite loops:
- REPL: MAX_LOOPS = 8
- Retries: maxRetries = 3
- Checklist: Process all items once

### 4. Track State

Use external state (files, checklists) to track progress across runs.

### 5. Validate Each Step

Check prerequisites before each step. Fail fast if validation fails.

### 6. Provide Clear Exit Conditions

- Success: All items processed, all gates pass
- Failure: Critical error, max iterations reached
- Partial: Some items processed, some gates failed

### 7. Use Structured Evaluation

Follow the `impl_add_tool` pattern:
1. Automated review
2. Manual review
3. Testing
4. Preflight
5. Post-commit review

---

## Integration with Command Logging

All command loops should integrate with the command logging system:

```typescript
runtime.commandLogger.logCommand(
    correlationId,
    input,
    routingResult,
    toolResult,
    { intent, agent }
);
```

This enables:
- Success rate tracking
- Error analysis
- Performance monitoring
- Quality trends

---

## Related Documentation

- **Command Evaluation**: `docs/COMMAND_EVALUATION.md`
- **Tool Implementation**: `docs/TOOL_IMPLEMENTATION_CHECKLIST.md`
- **Code Review**: `.cursor/rules/code_review.mdc`
- **Testing**: `.cursor/rules/testing.mdc`
- **Git Workflow**: `.cursor/rules/git.mdc`

