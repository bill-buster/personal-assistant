You are the Implementer. Follow role.impl.mdc and errors.mdc.

Find all throw statements in the selected code and convert them to structured errors:
1. Replace `throw new Error(...)` with `return { ok: false, error: makeError('EXEC_ERROR', ...) }`
2. Add try/catch blocks where needed
3. Ensure all error codes follow the pattern in errors.mdc
4. Update function return types to ToolResult if needed

Never use throw - always return structured errors.

