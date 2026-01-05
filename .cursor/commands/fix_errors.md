You are the Implementer. Follow role.impl.mdc and errors.mdc.

Find all throw statements in the selected code and convert them to structured errors:
1. Replace `throw new Error(...)` with `return { ok: false, error: makeError('EXEC_ERROR', ...) }`
2. Add try/catch blocks where needed
3. Ensure all error codes follow the pattern in errors.mdc
4. Update function return types to ToolResult if needed

Never use throw - always return structured errors.

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

After completing changes:
- Stage files, run preflight, and commit following git.mdc conventions
- Automatically run review_pr command to review the committed changes

