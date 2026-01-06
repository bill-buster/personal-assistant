You are the Implementer. Follow role.impl.mdc and errors.mdc.

## Security Note

This command should only be used in trusted codebases. It will:
- Modify source code files
- Change error handling patterns
- Run npm scripts

Verify you're in the correct repository before proceeding.

## Repo-Specific Mapping

Before converting, verify:
- **Error codes**: See `src/core/tool_contract.ts` for valid error codes (ErrorCode enum)
- **makeError helper**: Defined in `src/core/index.ts` (import: `import { makeError } from '../core'`)
- **Return shape**: `ToolResult = { ok: true, result: any } | { ok: false, error: ToolError }`
- **ToolError type**: `{ code: string, message: string, details?: any }`

## Inputs

- Code to convert: (selected file or specified path)

## Steps

### [STEP 1/5] Find throw statements
- Scan code for `throw` statements
- Categorize:
  - Tool handlers: Convert to structured errors
  - Test files: Evaluate carefully (may be intentional)
  - Utility functions: May need return type changes
  - Constructors: Consider factory functions

### [STEP 2/5] Convert throw to structured errors
For each throw statement:
1. Replace `throw new Error(message)` with `return { ok: false, error: makeError('EXEC_ERROR', message) }`
2. Add try/catch blocks where needed
3. Ensure all error codes follow the pattern in errors.mdc (see `docs/ERRORS.md` for examples)
4. Update function return types to ToolResult if needed

**Conversion patterns** (see `docs/ERRORS.md` for full examples):
- Tool handlers: Always return ToolResult
- Async functions: Ensure proper try/catch with await
- Constructors: Convert to factory functions or initialization methods
- Utility functions: Update return type to include error case

### [STEP 3/5] Update tests
- Update tests to check for structured errors instead of thrown errors
- Change `expect(() => fn()).toThrow()` to `expect(fn().ok).toBe(false)`
- Verify error codes match expected values

### [STEP 4/5] Run tests
- Run tests: `npm test [test_file]` or `npm run test:single [test_name]` (if available)
- Record: commands run, pass/fail status
- If tests fail: Log errors, identify root cause, fix and re-run

### [STEP 5/5] Generate summary
- Files modified
- Throw statements converted (N throws → structured errors)
- Error codes used
- Test results

## Edge Cases

1. **No throw statements found**: Log "No throw statements found" and exit successfully
2. **Throw in test files**: May be intentional (testing error handling) - evaluate carefully
3. **Throw in async functions**: Ensure proper try/catch with await
4. **Throw in constructors**: Convert to factory functions or initialization methods
5. **Throw in utility functions**: May need to change return type to include error case

## Error Handling

If conversion fails:
- **Complex error handling**: Break down into smaller functions
- **Error propagation**: Ensure errors bubble up correctly through call stack
- **Type errors**: Update return types to include error case
- **Test failures**: Update tests to check for structured errors instead of thrown errors

## Stop Conditions

- Conversion complete: Provide summary with test results
- Stop after summary - do not commit or stage files
- Let the user decide whether to commit based on conversion results

