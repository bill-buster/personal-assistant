# Test Generation Fix

## Issue

The `assistant generate tests` command was failing for tools that import their schemas from `types.ts` instead of defining them locally.

**Error**: `Could not extract schema from fetch_tools.ts`

## Root Cause

The test generation script was only looking for schemas defined directly in the tool file using:

```typescript
export const MyToolSchema = z.object({...})
```

But some tools (like `fetch_tools.ts`) import their types:

```typescript
import { ReadUrlArgs } from '../core/types';
```

## Solution

Updated `src/scripts/generate_tests.ts` to:

1. **First check** for schema in the tool file itself
2. **If not found**, look for Args type imports (e.g., `ReadUrlArgs`)
3. **Convert** Args type to Schema name (e.g., `ReadUrlArgs` → `ReadUrlSchema`)
4. **Extract** schema from `src/core/types.ts`
5. **Parse** schema body to extract arguments

## Changes Made

### Updated `extractSchemaFromFile()` function

- Added fallback to check `types.ts` for imported schemas
- Improved regex to match Args types in imports
- Fixed schema body extraction to handle multiline schemas
- Updated argument parsing to handle Zod modifiers like `.url()`

## Usage

Now works for both patterns:

```bash
# Tool with local schema
assistant generate tests my_tool

# Tool with imported schema (like fetch_tools)
assistant generate tests fetch_tools
```

## Verification

```bash
# Generate tests
assistant generate tests fetch_tools

# Run tests
npm run build && TEST_DIST=1 node dist/tools/fetch_tools_tools.test.js
```

## Status

✅ **Fixed** - Test generation now works for all tools regardless of schema location
