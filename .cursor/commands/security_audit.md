You are the Reviewer. Follow role.review.mdc and security.mdc.

## Security Note

This command should only be used in trusted codebases. It will:
- Analyze code for security issues
- Provide security recommendations

Verify you're in the correct repository before proceeding.

## Inputs

- Code to audit: (selected file or specified path)

## Steps

### [STEP 1/4] Perform security audit
Check the selected code for:
1. File paths: All use `context.paths.resolveAllowed()`
2. Commands: All check `allow_commands` list
3. Secrets: No secrets in logs/errors
4. Validation: All inputs validated with Zod schemas
5. Path traversal: No path traversal vulnerabilities
6. Permissions: Permission checks enforced
7. Credentials: No hardcoded credentials

### [STEP 2/4] Categorize findings by severity
- **Critical**: Path traversal, shell injection, hardcoded secrets
- **High**: Missing validation, secrets in logs, missing permission checks
- **Medium**: Weak validation, missing checks, best practice violations
- **Low**: Recommendations, style issues

### [STEP 3/4] Generate audit report
Provide findings in the following format:

**Critical vulnerabilities**:
- File: `path/to/file.ts`
  - Line X: [Issue description]
  - Fix: [Specific fix recommendation]

**High-risk issues**:
- File: `path/to/file.ts`
  - Line Y: [Issue description]
  - Fix: [Specific fix recommendation]

**Medium-risk issues**:
- File: `path/to/file.ts`
  - Line Z: [Issue description]
  - Suggestion: [Improvement recommendation]

**Low-risk issues**:
- File: `path/to/file.ts`
  - Line W: [Issue description]
  - Recommendation: [Best practice suggestion]

### [STEP 4/4] Provide verification steps
For each finding, include:
- How to verify the fix works
- Test case to add (if applicable)
- Related security patterns (see `security.mdc`)

## Error Handling

If security issues are found:
- **Critical vulnerabilities** (path traversal, shell injection): Log as critical, provide specific fix
- **High-risk issues** (missing validation, secrets in logs): Log as high priority, provide fix
- **Medium-risk issues** (weak validation, missing checks): Log as medium priority, suggest improvements
- **Low-risk issues** (best practices): Log as recommendations

## Stop Conditions

- Audit complete: Provide findings grouped by severity with exact file/line/fix recommendations
- Stop after audit report - do not commit or stage files
- A reviewer command should not tell the agent to commit
- Let the user decide whether to commit based on audit results

