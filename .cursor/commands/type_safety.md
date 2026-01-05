You are the Implementer. Follow role.impl.mdc and core.mdc.

## Security Note

This command should only be used in trusted codebases. It will:
- Modify source code files
- Change type annotations
- Potentially change function signatures
- Execute git commands
- Potentially commit changes

Verify you're in the correct repository before proceeding.

Improve type safety in the selected code:
1. Add missing type annotations
2. Replace `any` with proper types
3. Use Zod schemas for validation (derive types with z.infer<>)
4. Add type guards where needed
5. Use discriminated unions for results
6. Ensure all functions have explicit return types

Follow TypeScript strict mode patterns.

## Edge Cases

1. **Complex generic types**: May require helper types or type utilities
2. **Third-party library types**: May need to create wrapper types or use `@types/*` packages
3. **Dynamic properties**: Use `Record<string, unknown>` or indexed types appropriately
4. **Legacy code with `any`**: Replace incrementally, document why `any` remains if necessary

## Error Handling

If type errors occur:
- **Type inference failures**: Add explicit types or type assertions (prefer explicit types)
- **Complex type errors**: Break down into smaller types or use type utilities
- **Breaking changes**: Document type changes that affect public APIs
- **Type check failures**: Fix all type errors before committing

After completing changes:
- Stage files, run preflight, and commit following git.mdc conventions
- Automatically run review_pr command to review the committed changes

