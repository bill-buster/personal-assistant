You are the Implementer. Follow role.impl.mdc and core.mdc.

## Security Note

This command should only be used in trusted codebases. It will:
- Modify source code files
- Change type annotations
- Potentially change function signatures

Verify you're in the correct repository before proceeding.

## Inputs

- Code to improve: (selected file or specified path)

## Steps

### [STEP 1/5] Identify type safety issues
- Scan code for:
  - Missing type annotations
  - `any` types
  - Missing return types
  - Type inference failures
  - Missing type guards

### [STEP 2/5] Add missing type annotations
- Add explicit return types to all functions
- Add parameter types where missing
- Add variable types where type inference is unclear

### [STEP 3/5] Replace `any` with proper types
- Replace `any` with specific types
- Use Zod schemas for validation (derive types with `z.infer<>`)
- Use `Record<string, unknown>` for dynamic properties
- Create wrapper types for third-party libraries if needed

### [STEP 4/5] Add type guards and discriminated unions
- Add type guards where needed (see `src/core/type_guards.ts` for patterns)
- Use discriminated unions for result types (see `src/core/types.ts` for examples)
- Ensure all functions have explicit return types

### [STEP 5/5] Run type check and generate summary
- Run type check: `npm run typecheck`
- Record: commands run, pass/fail status, type errors found
- Generate summary:
  - Files modified
  - Type annotations added (N functions)
  - `any` types replaced (N replacements)
  - Type guards added (N guards)
  - Type check results

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
- **Type check failures**: Fix all type errors before completing

## Stop Conditions

- Type safety improvements complete: Provide summary with type check results
- Stop after summary - do not commit or stage files
- Let the user decide whether to commit based on type safety improvements
- If you want commit behavior, route users to `/fix_all_issues` (composite command), not here

