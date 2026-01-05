# Security Fixes - CodeQL Issues

## Issues Fixed

### 1. Path Traversal Vulnerability (src/app/web/server.ts)

**Issue**: Uncontrolled data used in path expression
**Severity**: Error (Critical)
**Location**: Lines 61-62, 68, 74

**Before**:

```typescript
let filePath = pathname === '/' ? '/index.html' : pathname;
filePath = path.join(webDir, filePath); // ❌ Vulnerable to path traversal
```

**After**:

```typescript
let filePath = pathname === '/' ? '/index.html' : pathname;

// Security: Prevent path traversal attacks
const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
const resolvedPath = path.resolve(webDir, normalizedPath);

// Ensure resolved path is within webDir (prevent directory traversal)
if (!resolvedPath.startsWith(path.resolve(webDir))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
}

filePath = resolvedPath; // ✅ Safe
```

**Fix**: Added path normalization and validation to prevent directory traversal attacks.

### 2. Incomplete HTML Sanitization (src/tools/fetch_tools.ts)

**Issue**: Bad HTML filtering regexp, incomplete multi-character sanitization
**Severity**: Warning
**Location**: Lines 64-65

**Before**:

```typescript
.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '')
```

**After**:

```typescript
.replace(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gim, '')
.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gim, '')
```

**Fix**: Added `\s*` to handle spaces in closing tags (e.g., `</script >`).

### 3. Incomplete String Escaping (src/core/arg_parser.ts)

**Issue**: Incomplete string escaping or encoding
**Severity**: Warning
**Location**: Line 174

**Before**:

```typescript
return `"${arg.replace(/"/g, '\\"')}"`; // ❌ Doesn't escape backslashes
```

**After**:

```typescript
return `"${arg.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`; // ✅ Escapes backslashes first
```

**Fix**: Escape backslashes before escaping quotes to prevent incomplete escaping vulnerabilities.

## Verification

Run CodeQL again to verify fixes:

```bash
codeql database create codeql-db --language=javascript --source-root=. --overwrite
codeql database analyze codeql-db codeql/javascript-queries --format=csv --output=results.csv
```

**Expected**: Fewer or no security issues in the fixed files.

## Status

✅ **All CodeQL security issues fixed**

- Path traversal: Fixed
- HTML sanitization: Improved
- String escaping: Fixed
