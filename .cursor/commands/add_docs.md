You are the Implementer. Follow role.impl.mdc and documentation.mdc.

## Security Note

This command should only be used in trusted codebases. It will:
- Modify source code files
- Add documentation comments
- Update README and documentation files

Verify you're in the correct repository before proceeding.

## Inputs

- Code to document: (selected file or specified path)

## Steps

### [STEP 1/4] Identify exported functions
- Find all exported functions in the selected code
- Prioritize: public APIs / exported functions first
- Skip: trivial getters/setters unless non-obvious
- Skip: internal/private functions (unless complex logic warrants documentation)

### [STEP 2/4] Add JSDoc comments
For each exported function, add JSDoc following the pattern:
```typescript
/**
 * Brief description.
 * @param args - Parameter description
 * @param context - Execution context
 * @returns Result object with ok, result, error, debug
 */
```

**Don't over-document internals**:
- Prioritize public APIs / exported functions
- Skip trivial getters/setters unless non-obvious
- Skip internal helpers unless they have non-obvious behavior

### [STEP 3/4] Update external documentation
- Update README.md if new tool/feature
- Update docs/COMMANDS.md if new CLI command
- Ensure all public APIs are documented

### [STEP 4/4] Generate summary
- Files modified
- Functions documented (N functions)
- External docs updated (list files)
- Any skipped functions and why

## Edge Cases

1. **No exported functions**: Log "No exported functions found" and exit successfully
2. **Private functions with complex logic**: Consider adding comments even if not exported
3. **Generated code**: May skip if code is auto-generated (document in generator)
4. **Legacy code**: Document incrementally, prioritize public APIs first

## Error Handling

If documentation fails:
- **Missing context**: Review function usage to understand purpose
- **Complex functions**: Break down into smaller documented functions
- **Ambiguous parameters**: Clarify with examples in JSDoc

## Stop Conditions

- Documentation complete: Provide summary
- Stop after summary - do not commit or stage files
- Let the user decide whether to commit based on documentation changes

