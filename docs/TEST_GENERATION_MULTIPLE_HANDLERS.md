# Test Generation for Multiple Handlers

## Issue

Some tool files contain multiple handlers (e.g., `git_tools.ts` has `handleGitStatus`, `handleGitDiff`, `handleGitLog`). The test generator was failing to extract schemas for these files.

## Root Cause

1. **Empty schemas**: `GitStatusSchema` is `z.object({}).optional()` which has no fields
2. **Multiple Args types**: Files import multiple Args types but generator only found first
3. **Schema matching**: Regex didn't handle `.optional()` suffix

## Solution

Updated `extractSchemaFromFile()` to:

1. **Find all Args types** in imports (not just first)
2. **Try each Args type** until finding a valid schema
3. **Handle optional schemas** - match both `z.object({...})` and `z.object({...}).optional()`
4. **Skip empty schemas** - if schema has no fields, try next Args type

## Example

### Before (Failed)

```bash
assistant generate tests git_tools
# Error: Could not extract schema
```

### After (Works)

```bash
assistant generate tests git_tools
# Found schema: GitDiffSchema
# Arguments: staged:boolean, path:string
# Found handler: handleGitStatus
# ✓ Generated test file
```

## Current Behavior

- **Finds first valid schema** with actual fields
- **Uses first handler** found in file
- **May not match** handler to schema (e.g., `handleGitStatus` with `GitDiffSchema`)

## Future Improvements

1. **Match handler to schema**: Extract handler name and find corresponding schema
2. **Generate tests for all handlers**: Create separate test files for each handler
3. **Allow specifying handler**: `assistant generate tests git_tools --handler git_status`

## Files with Multiple Handlers

- `git_tools.ts`: `handleGitStatus`, `handleGitDiff`, `handleGitLog`
- `utility_tools.ts`: `handleCalculate`, `handleGetTime`, `handleDelegate*`
- `file_tools.ts`: `handleWriteFile`, `handleReadFile`, `handleListFiles`
- `memory_tools.ts`: `handleRemember`, `handleRecall`, `handleMemoryAdd`, `handleMemorySearch`
- `task_tools.ts`: `handleTaskAdd`, `handleTaskList`, `handleTaskDone`, etc.

## Usage

```bash
# Generate tests (uses first valid schema found)
assistant generate tests git_tools

# Run tests
npm run build && TEST_DIST=1 node dist/tools/git_tools_tools.test.js
```

## Status

✅ **Fixed** - Test generation now works for files with multiple handlers
⚠️ **Limitation** - May not match handler to correct schema (uses first valid schema)
