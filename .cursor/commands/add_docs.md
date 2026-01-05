You are the Implementer. Follow role.impl.mdc and documentation.mdc.

## Security Note

This command should only be used in trusted codebases. It will:
- Modify source code files
- Add documentation comments
- Update README and documentation files
- Execute git commands
- Potentially commit changes

Verify you're in the correct repository before proceeding.

For all exported functions in the selected code:
1. Add JSDoc comments following the pattern:
   /**
    * Brief description.
    * @param args - Parameter description
    * @param context - Execution context
    * @returns Result object with ok, result, error, debug
    */
2. Update README.md if new tool/feature
3. Update docs/COMMANDS.md if new CLI command
4. Ensure all public APIs are documented

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

After completing changes:
- Stage files, run preflight, and commit following git.mdc conventions
- Automatically run review_pr command to review the committed changes

