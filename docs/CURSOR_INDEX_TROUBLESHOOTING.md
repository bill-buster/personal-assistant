# Troubleshooting Documentation Indexing in Cursor

## Issue: Zod and TypeScript Not Indexing

If Node.js worked but Zod and TypeScript didn't, here are solutions:

## Quick Fixes

### For Zod

**Problem**: `https://zod.dev/` may not index properly (JavaScript-rendered site)

**Solutions**:

1. **Try GitHub README**:
   - Name: `Zod`
   - Prefix: `https://github.com/colinhacks/zod`
   - Entrypoint: `https://github.com/colinhacks/zod/blob/main/README.md`

2. **Try Specific Zod Page**:
   - Name: `Zod`
   - Prefix: `https://zod.dev/`
   - Entrypoint: `https://zod.dev/getting-started`

3. **Use Local Documentation** (Best option):
   - Clone Zod repo: `git clone https://github.com/colinhacks/zod.git`
   - In Cursor Settings > Features > Docs, add local folder
   - Point to `zod/docs/` or `zod/README.md`

### For TypeScript

**Problem**: TypeScript docs site may be too large or complex

**Solutions**:

1. **Try TypeScript Handbook**:
   - Name: `TypeScript`
   - Prefix: `https://www.typescriptlang.org/docs/handbook/`
   - Entrypoint: `https://www.typescriptlang.org/docs/handbook/intro.html`

2. **Try Specific Section**:
   - Name: `TypeScript Types`
   - Prefix: `https://www.typescriptlang.org/docs/handbook/2/everyday-types.html`
   - Entrypoint: `https://www.typescriptlang.org/docs/handbook/2/everyday-types.html`

3. **Use Local Documentation**:
   - Download TypeScript docs
   - Point to local folder in Cursor

## Alternative: Use Project Rules Instead

If external docs won't index, you can add key information to your project rules:

### Add to `.cursor/rules/core.mdc`

Add a section with key Zod and TypeScript patterns:

```markdown
## Zod Patterns (from zod.dev)

### Basic Schema
```typescript
const schema = z.object({
  name: z.string(),
  age: z.number().optional(),
});
```

### Type Inference
```typescript
type SchemaType = z.infer<typeof schema>;
```

### Validation
```typescript
const result = schema.safeParse(data);
if (!result.success) {
  return { ok: false, error: makeError('VALIDATION_ERROR', result.error.message) };
}
```

## TypeScript Patterns

### Discriminated Unions
```typescript
type Result = 
  | { ok: true; result: T }
  | { ok: false; error: Error };
```

### Type Guards
```typescript
function isSuccess(result: Result): result is { ok: true; result: T } {
  return result.ok === true;
}
```
```

## Why Some Sites Don't Work

### JavaScript-Rendered Sites

Many modern documentation sites (like Zod.dev) use JavaScript to render content. Cursor's crawler may not execute JavaScript, so it can't index the content.

**Signs**:
- Site loads fine in browser
- But Cursor says "failed to index" or never completes
- No error message, just doesn't work

**Solutions**:
1. Use GitHub README/docs instead
2. Use local documentation
3. Add key patterns to project rules

### Large Documentation Sites

TypeScript's documentation is very large and may timeout or fail to index completely.

**Solutions**:
1. Index specific sections (Handbook, API Reference)
2. Use local documentation
3. Add key patterns to project rules

## Recommended Approach

### Option 1: Use What Works

Since Node.js worked, focus on that. For Zod and TypeScript:

1. **Add key patterns to `.cursor/rules/core.mdc`** (see above)
2. **Reference in commands**: Update commands to reference the patterns in rules
3. **Use GitHub**: Try GitHub README for Zod if needed

### Option 2: Local Documentation

1. **Download docs locally**:
   ```bash
   # Zod
   git clone https://github.com/colinhacks/zod.git
   
   # TypeScript (download from typescriptlang.org)
   ```

2. **Index local folder**:
   - Settings > Features > Docs
   - Add Local Folder
   - Point to downloaded docs

### Option 3: Skip for Now

You can work without indexing Zod/TypeScript:
- Node.js is the most important (you use it extensively)
- Add Zod/TypeScript patterns to project rules
- Reference patterns in commands

## Testing What Works

After trying alternatives:

1. **Check if indexed**:
   - Settings > Features > Docs
   - Should show status (indexing, complete, or error)

2. **Test in Chat**:
   - Type `@Docs Zod` (or whatever name you used)
   - If it appears, it's working
   - If not, try next alternative

3. **Check error messages**:
   - Some sites show why indexing failed
   - Use that info to try different approach

## Final Recommendation

**For Your Project**:

1. ✅ **Keep Node.js** - It's working and most important
2. **For Zod**: Add key patterns to `.cursor/rules/core.mdc` (see example above)
3. **For TypeScript**: Add key patterns to `.cursor/rules/core.mdc`
4. **Update commands**: Reference the patterns in your custom commands

This approach:
- ✅ Works immediately (no indexing issues)
- ✅ Always available (in your rules)
- ✅ Project-specific (tailored to your needs)
- ✅ Version controlled (in git)

## Example: Updated Command with Rules Reference

Instead of `@Docs Zod`, reference the rule:

```markdown
You are the Implementer. Follow role.impl.mdc first, then project rules.

For Zod schemas, follow the patterns in core.mdc (Zod Patterns section):
- Use z.object() for object schemas
- Derive types with z.infer<typeof Schema>
- Use safeParse() for validation
- Return structured errors on validation failure

Add a new tool end-to-end:
1. Create Zod schema in src/core/types.ts
2. Create handler function in src/tools/[tool_name]_tools.ts
...
```

This way, you get the benefits without relying on external indexing.

