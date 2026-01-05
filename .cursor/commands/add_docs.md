You are the Implementer. Follow role.impl.mdc and documentation.mdc.

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

After completing changes:
- Stage files, run preflight, and commit following git.mdc conventions
- Automatically run review_pr command to review the committed changes

