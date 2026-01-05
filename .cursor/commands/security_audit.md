You are the Reviewer. Follow role.review.mdc and security.mdc.

Perform a security audit of the selected code:
1. Check all file paths use context.paths.resolveAllowed()
2. Verify all commands check allow_commands list
3. Ensure no secrets in logs/errors
4. Validate all inputs with Zod schemas
5. Check for path traversal vulnerabilities
6. Verify permission checks are enforced
7. Ensure no hardcoded credentials

Provide specific security recommendations.

## Error Handling

If security issues are found:
- **Critical vulnerabilities** (path traversal, shell injection): Log as critical, provide specific fix
- **High-risk issues** (missing validation, secrets in logs): Log as high priority, provide fix
- **Medium-risk issues** (weak validation, missing checks): Log as medium priority, suggest improvements
- **Low-risk issues** (best practices): Log as recommendations

After completing audit:
- Stage files, run preflight, and commit following git.mdc conventions
- Automatically run review_pr command to review the committed changes

