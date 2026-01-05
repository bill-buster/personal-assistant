# Security Audit Report

**Date**: 2024-12-19  
**Auditor**: Reviewer (following role.review.mdc and security.mdc)  
**Scope**: Complete codebase security review

## Executive Summary

Overall security posture: **GOOD** with **3 CRITICAL** and **2 MEDIUM** issues identified.

The codebase demonstrates strong security practices:
- ✅ Comprehensive path validation using `context.paths.resolveAllowed()`
- ✅ Command allowlist enforcement for most commands
- ✅ Zod schema validation for all tool inputs
- ✅ Fail-closed security model
- ✅ Proper error sanitization in audit logs

**Critical Issues**:
1. Git tools bypass command allowlist (CRITICAL)
2. Fetch tools bypass command allowlist (CRITICAL)
3. Comms tools bypass command allowlist (CRITICAL)

**Medium Issues**:
1. Missing Zod validation for some tool handlers
2. Potential secret exposure in error messages

---

## 1. File Path Validation ✅

### Status: **PASS**

All file operations correctly use `context.paths.resolveAllowed()`:

**Verified Files**:
- ✅ `src/tools/file_tools.ts` - All file operations use `paths.resolveAllowed()`
  - `handleWriteFile`: Line 56
  - `handleReadFile`: Line 159
  - `handleListFiles`: Line 312
  - `handleDeleteFile`: Line 459
  - `handleMoveFile`: Lines 575, 599
  - `handleCopyFile`: Lines 762, 786
  - `handleFileInfo`: Line 933
  - `handleCreateDirectory`: Line 1034

- ✅ `src/tools/git_tools.ts` - Path validation for git_diff
  - `handleGitDiff`: Line 96 uses `paths.resolveAllowed()`

**Path Security Features**:
- ✅ Blocks absolute paths (`path.isAbsolute()` check)
- ✅ Blocks path traversal (`..` detection)
- ✅ Canonicalization prevents symlink attacks (`fs.realpathSync()`)
- ✅ Hardcoded blocks for sensitive paths (`.git`, `.env`, `node_modules`)
- ✅ Case-insensitive path matching on macOS/Windows

**Recommendation**: ✅ No changes needed

---

## 2. Command Validation ⚠️

### Status: **CRITICAL ISSUES FOUND**

### ✅ Pass: `run_cmd` Tool
- Uses `context.commands.runAllowed()` which enforces allowlist
- Executor's `runAllowedCommand()` checks `permissions.allow_commands`
- Proper flag validation for `ls`, `cat`, `du` commands

### ❌ CRITICAL: Git Tools Bypass Allowlist

**File**: `src/tools/git_tools.ts`

**Issue**: Git commands (`git status`, `git diff`, `git log`) execute directly via `spawnSync('git', ...)` without checking `allow_commands` list.

```typescript:18:34:src/tools/git_tools.ts
function runGitCommand(
    args: string[],
    cwd: string
): { ok: boolean; output?: string; error?: string } {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 10000 });
    // ... no allow_commands check
}
```

**Risk**: High - Git commands can execute even if not in `allow_commands`, bypassing security controls.

**Recommendation**:
```typescript
// Use context.commands.runAllowed() instead
const cmdResult = context.commands.runAllowed('git', args);
```

### ❌ CRITICAL: Fetch Tools Bypass Allowlist

**File**: `src/tools/fetch_tools.ts`

**Issue**: `curl` command executes directly without checking `allow_commands`.

```typescript:34:37:src/tools/fetch_tools.ts
const result = spawnSync('curl', ['-s', '-L', url], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
});
```

**Risk**: High - Network requests can be made even if `curl` is not in `allow_commands`.

**Recommendation**:
- Add `curl` to `allow_commands` requirement, OR
- Use `context.commands.runAllowed('curl', ['-s', '-L', url])`

### ❌ CRITICAL: Comms Tools Bypass Allowlist

**File**: `src/tools/comms_tools.ts`

**Issue**: `osascript` command executes directly without checking `allow_commands`.

```typescript:120:120:src/tools/comms_tools.ts
const result = spawnSync('osascript', ['-e', script, '--', to, body], { encoding: 'utf8' });
```

**Risk**: High - AppleScript execution can bypass security controls.

**Recommendation**:
- Add `osascript` to `allow_commands` requirement, OR
- Use `context.commands.runAllowed('osascript', ['-e', script, '--', to, body])`

**Note**: These tools may be intentionally excluded from allowlist (e.g., git is read-only, curl is for fetching). However, they should still respect the permission model for consistency.

---

## 3. Secret Exposure in Logs/Errors ✅

### Status: **PASS** (with minor recommendations)

### ✅ Good Practices Found:

1. **Audit Log Sanitization** (`src/core/executor.ts:762-775`):
   ```typescript
   private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
       // Truncates large content
       if (sanitized.content?.length > 100) {
           sanitized.content = sanitized.content.substring(0, 100) + '...[truncated]';
       }
       return sanitized;
   }
   ```

2. **Command Log Sanitization** (`src/core/command_log.ts:185`):
   ```typescript
   const sensitiveFields = ['password', 'api_key', 'token', 'secret'];
   ```

3. **No API Keys in Error Messages**: Verified - API keys are never logged in error messages.

### ⚠️ Minor Recommendation:

**File**: `src/core/executor.ts:762-775`

**Issue**: `sanitizeArgs()` only truncates `content` field. Should also redact common secret field names.

**Recommendation**:
```typescript
private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    if (!args || typeof args !== 'object') return args;
    
    const sanitized = { ...args };
    
    // Redact sensitive fields
    const sensitiveFields = ['password', 'apiKey', 'api_key', 'token', 'secret', 'credential'];
    for (const field of sensitiveFields) {
        if (field in sanitized) {
            sanitized[field] = '[REDACTED]';
        }
    }
    
    // Truncate large content
    if (sanitized.content && typeof sanitized.content === 'string' && sanitized.content.length > 100) {
        sanitized.content = sanitized.content.substring(0, 100) + '...[truncated]';
    }
    
    return sanitized;
}
```

---

## 4. Zod Schema Validation ✅

### Status: **PASS**

All tool arguments are validated with Zod schemas:

**Verified**:
- ✅ All schemas defined in `src/core/types.ts` (lines 335-590)
- ✅ Executor validates args before execution (`src/core/executor.ts:637-662`)
- ✅ All tool handlers receive validated args

**Schema Coverage**:
- ✅ `WriteFileSchema`, `ReadFileSchema`, `ListFilesSchema`
- ✅ `DeleteFileSchema`, `MoveFileSchema`, `CopyFileSchema`
- ✅ `RunCmdSchema`, `RememberSchema`, `RecallSchema`
- ✅ All other tool schemas defined

**Validation Flow**:
```typescript:637:662:src/core/executor.ts
// 4. Validate args with Zod Schema if available
const schema = this.registry.getSchema(toolName);
let validatedArgs: Record<string, unknown> = args;

if (schema) {
    const parseResult = schema.safeParse(args || {});
    if (!parseResult.success) {
        return {
            ok: false,
            result: null,
            error: makeError(
                ErrorCode.VALIDATION_ERROR,
                `Invalid arguments for ${toolName}: ${parseResult.error.message}`
            ),
            // ...
        };
    }
    validatedArgs = parseResult.data as Record<string, unknown>;
}
```

**Recommendation**: ✅ No changes needed

---

## 5. Path Traversal Vulnerabilities ✅

### Status: **PASS**

Path traversal attacks are comprehensively prevented:

**Protection Mechanisms**:

1. **Blocks `..` patterns** (`src/core/executor.ts:134`):
   ```typescript
   if (relPath.includes('..')) return null;
   ```

2. **Blocks absolute paths** (`src/core/executor.ts:133`):
   ```typescript
   if (path.isAbsolute(relPath)) return null;
   ```

3. **Canonicalization** (`src/core/executor.ts:139-144`):
   ```typescript
   const canonical = fs.realpathSync(resolved);
   if (canonical !== this.baseDir && !canonical.startsWith(this.baseDir + path.sep))
       return null;
   ```

4. **Hardcoded security blocks** (`src/core/executor.ts:163-174`):
   ```typescript
   // Block sensitive directories and files (case-insensitive)
   if (parts.some(p => {
       const lower = p.toLowerCase();
       return lower === '.git' || lower === '.env' || lower === 'node_modules';
   })) return false;
   ```

5. **Parent directory validation** (`src/core/executor.ts:148-155`):
   ```typescript
   // For new files, verify parent is under baseDir
   const parentDir = path.dirname(resolved);
   const canonicalParent = fs.realpathSync(parentDir);
   if (!canonicalParent.startsWith(this.baseDir + path.sep)) return null;
   ```

**Recommendation**: ✅ No changes needed

---

## 6. Permission Checks ✅

### Status: **PASS**

Permission enforcement is comprehensive:

**Permission Layers**:

1. **Agent Tool Restrictions** (`src/core/executor.ts:565-592`):
   - System agents (`kind='system'`) get full access
   - Other agents restricted to `agent.tools` allowlist
   - No agent: Only `SAFE_TOOLS` allowed

2. **Global Deny List** (`src/core/executor.ts:594-611`):
   ```typescript
   if (this.permissions.deny_tools.includes(toolName)) {
       return { ok: false, error: makeError(DENIED_TOOL_BLOCKLIST, ...) };
   }
   ```

3. **Fail-Closed Default** (`src/core/executor.ts:613-635`):
   ```typescript
   if (!this.agent) {
       if (!(SAFE_TOOLS as readonly string[]).includes(toolName)) {
           return { ok: false, error: makeError(DENIED_AGENT_TOOLSET, ...) };
       }
   }
   ```

4. **Confirmation Requirements** (`src/core/executor.ts:274-278`):
   ```typescript
   private requiresConfirmation(toolName: string): boolean {
       return this.permissions.require_confirmation_for.includes(toolName);
   }
   ```

5. **Path Allowlist** (`src/core/executor.ts:163-202`):
   - All paths checked against `allow_paths`
   - Hardcoded blocks for sensitive paths

**Recommendation**: ✅ No changes needed

---

## 7. Hardcoded Credentials ✅

### Status: **PASS**

No hardcoded credentials found:

**Verified**:
- ✅ API keys loaded from environment variables or config files
- ✅ No secrets in source code
- ✅ Config loading from `~/.assistant/config.json` or env vars
- ✅ Secrets never logged or exposed

**Config Loading** (`src/core/config.ts:447-448`):
```typescript
if (process.env.GROQ_API_KEY) config.apiKeys.groq = process.env.GROQ_API_KEY;
if (process.env.OPENROUTER_API_KEY) config.apiKeys.openrouter = process.env.OPENROUTER_API_KEY;
```

**Recommendation**: ✅ No changes needed

---

## Summary of Recommendations

### Critical (Must Fix)

1. **Git Tools**: Use `context.commands.runAllowed()` or require `git` in `allow_commands`
   - File: `src/tools/git_tools.ts`
   - Impact: High - Bypasses command allowlist

2. **Fetch Tools**: Use `context.commands.runAllowed()` or require `curl` in `allow_commands`
   - File: `src/tools/fetch_tools.ts`
   - Impact: High - Bypasses command allowlist

3. **Comms Tools**: Use `context.commands.runAllowed()` or require `osascript` in `allow_commands`
   - File: `src/tools/comms_tools.ts`
   - Impact: High - Bypasses command allowlist

### Medium (Should Fix)

4. **Audit Log Sanitization**: Enhance `sanitizeArgs()` to redact common secret field names
   - File: `src/core/executor.ts:762-775`
   - Impact: Medium - Potential secret exposure in audit logs

### Low (Nice to Have)

5. **Documentation**: Document that git/curl/osascript tools bypass allowlist (if intentional)
   - Impact: Low - Improves security transparency

---

## Security Checklist

- [x] All file paths use `context.paths.resolveAllowed()`
- [x] All commands check `allow_commands` list (except git/curl/osascript - **ISSUE**)
- [x] No secrets in logs/errors (with minor enhancement needed)
- [x] All inputs validated with Zod schemas
- [x] Path traversal vulnerabilities prevented
- [x] Permission checks enforced
- [x] No hardcoded credentials

---

## Next Steps

1. **Immediate**: Fix command allowlist bypass in git/fetch/comms tools
2. **Short-term**: Enhance audit log sanitization
3. **Long-term**: Consider adding automated security tests

---

**Report Generated**: 2024-12-19  
**Reviewer**: Following `.cursor/rules/role.review.mdc` and `.cursor/rules/security.mdc`

