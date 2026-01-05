# How to Index External Documentation in Cursor

## Overview

Cursor allows you to index external documentation (Node.js, Zod, TypeScript, etc.) so the AI can reference them via `@mentions` in Chat. This reduces hallucinations and improves accuracy.

## Step-by-Step Setup

### 1. Open Cursor Settings

**Method 1: Keyboard Shortcut**

- Press `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)

**Method 2: Menu**

- Go to **Cursor** > **Settings** (Mac) or **File** > **Preferences** > **Settings** (Windows/Linux)

**Method 3: Command Palette**

- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type "Settings" and select "Preferences: Open Settings"

### 2. Find Documentation Settings

Navigate to:

- **Cursor Settings** > **Features** > **Docs**

You should see a section for managing documentation sources.

### 3. Add External Documentation

1. Click **"Add New Documentation"** button
2. Fill in the documentation details:
    - **Name**: Descriptive name (e.g., "Node.js", "Zod", "TypeScript")
    - **Prefix**: Base URL of the documentation (e.g., `https://nodejs.org/api/`)
    - **Entrypoint**: Main page URL (e.g., `https://nodejs.org/api/`)
3. Click **"Save"** or **"Add"**
4. Cursor will automatically crawl and index the documentation

**Recommended Documentation for This Project**:

1. **Node.js**
    - Name: `Node.js`
    - Prefix: `https://nodejs.org/api/`
    - Entrypoint: `https://nodejs.org/api/`

2. **Zod** (Try these alternatives if first doesn't work)
    - Option A:
        - Name: `Zod`
        - Prefix: `https://zod.dev/`
        - Entrypoint: `https://zod.dev/`
    - Option B (GitHub):
        - Name: `Zod`
        - Prefix: `https://github.com/colinhacks/zod`
        - Entrypoint: `https://github.com/colinhacks/zod/blob/main/README.md`
    - Option C (Alternative docs site):
        - Name: `Zod`
        - Prefix: `https://zod.dev/`
        - Entrypoint: `https://zod.dev/getting-started`

3. **TypeScript** (Try these alternatives if first doesn't work)
    - Option A:
        - Name: `TypeScript`
        - Prefix: `https://www.typescriptlang.org/docs/`
        - Entrypoint: `https://www.typescriptlang.org/docs/`
    - Option B (Handbook):
        - Name: `TypeScript`
        - Prefix: `https://www.typescriptlang.org/docs/handbook/`
        - Entrypoint: `https://www.typescriptlang.org/docs/handbook/intro.html`
    - Option C (API Reference):
        - Name: `TypeScript`
        - Prefix: `https://www.typescriptlang.org/docs/handbook/`
        - Entrypoint: `https://www.typescriptlang.org/docs/handbook/2/everyday-types.html`

#### Option B: Add Local Documentation

1. Click **"Add Documentation"**
2. Select **"Local File"** or **"Folder"**
3. Browse to documentation files/folders
4. Cursor will index them

**Example Local Paths**:

- Downloaded Node.js docs: `~/docs/nodejs/`
- Project-specific docs: `docs/` (already indexed if in project)

### 4. Wait for Indexing

- Cursor will start indexing automatically
- Progress may be shown in status bar
- Large docs may take a few minutes
- You can continue working while indexing

## Recommended Documentation to Index

### For This Project

#### High Priority

1. **Node.js Documentation**
    - URL: `https://nodejs.org/api/`
    - Why: We use Node.js built-ins extensively (`node:fs`, `node:path`, etc.)
    - Use: Reference Node.js APIs correctly

2. **Zod Documentation**
    - URL: `https://zod.dev/` or `https://github.com/colinhacks/zod`
    - Why: We use Zod v4 for all validation
    - Use: Correct schema patterns, validation methods

3. **TypeScript Documentation**
    - URL: `https://www.typescriptlang.org/docs/`
    - Why: TypeScript strict mode, type patterns
    - Use: Type definitions, advanced types

#### Medium Priority

4. **ESLint Documentation**
    - URL: `https://eslint.org/docs/latest/`
    - Why: We use ESLint for linting
    - Use: Linting rules, configuration

5. **Prettier Documentation**
    - URL: `https://prettier.io/docs/en/`
    - Why: We use Prettier for formatting
    - Use: Formatting rules

#### Optional

6. **Git Documentation**
    - URL: `https://git-scm.com/doc`
    - Why: Git operations in tools
    - Use: Git command patterns

## How to Use Indexed Documentation

### In Chat (Cmd+L or Ctrl+L)

1. Open Chat
2. Type `@Docs` to see available documentation
3. Type the documentation name (e.g., `@Docs Node.js`)
4. Ask your question

**Example**:

```
@Docs Node.js How do I use fs.promises.readFile with error handling?
```

```
@Docs Zod How do I create a schema with optional fields?
```

### In Composer (Cmd+I or Ctrl+I)

1. Open Composer
2. Type `@Docs` to see available documentation
3. Type the documentation name (e.g., `@Docs TypeScript`)
4. Reference documentation in your prompt

**Example**:

```
@Docs TypeScript @Docs Zod Create a Zod schema for user input with proper TypeScript types.
```

## Verification

### Test Indexing

1. Open Chat
2. Type `@Docs` - you should see your indexed docs
3. Select a doc (e.g., `@Docs Node.js`)
4. Ask a question referencing the docs
5. Verify the AI references the correct documentation

**Test Questions**:

- `@Docs Node.js What's the difference between fs.readFileSync and fs.promises.readFile?`
- `@Docs Zod How do I validate an array of strings?`
- `@Docs TypeScript How do I create a discriminated union type?`

## Troubleshooting

### Documentation Not Appearing

1. **Check Indexing Status**:
    - Look for indexing progress in status bar
    - Large docs may take time to index
    - Check Settings > Indexing for status

2. **Verify URL**:
    - Ensure URL is accessible
    - Try opening URL in browser
    - Some sites may block indexing

3. **Restart Cursor**:
    - Sometimes requires restart to load indexed docs
    - Close and reopen Cursor

### Documentation Not Being Referenced

**This is expected behavior!** Cursor requires explicit `@Docs` mentions.

1. **Always Use @Docs Mention**:
    - Must explicitly mention with `@Docs [Name]` in every chat message
    - AI won't automatically use docs without mention
    - Format: `@Docs Node.js` not just `@Node.js`
    - **This is by design** - you control when to use external docs

2. **Be Specific**:
    - Ask specific questions
    - Reference specific APIs/methods
    - Example: `@Docs Node.js What's the difference between fs.readFileSync and fs.promises.readFile?`

3. **Check Documentation Quality**:
    - Some docs may not index well
    - Try different documentation sources
    - If docs don't work, add patterns to project rules instead (see troubleshooting guide)

## Best Practices

### 1. Index Only What You Need

- Don't index everything
- Focus on docs you actually use
- Too many docs can slow down indexing
- Manage docs in Settings > Features > Docs (edit/delete)

### 2. Use Official Documentation

- Prefer official sources
- More reliable and up-to-date
- Better structured for indexing

### 3. Update Regularly

- Documentation changes over time
- Re-index periodically (if Cursor supports it)
- Check for new versions

### 4. Combine with Project Rules

- Use `@mentions` with project rules
- Example: `@Zod Follow tools.mdc patterns for schema creation`

### 5. Test After Indexing

- Verify docs are accessible
- Test with sample questions
- Ensure AI references correctly

## Alternative: Local Documentation

If you prefer local documentation:

### Download Documentation

1. **Node.js**:

    ```bash
    # Clone or download Node.js docs
    git clone https://github.com/nodejs/node.git
    # Or download from nodejs.org
    ```

2. **Zod**:

    ```bash
    # Clone Zod repo (includes docs)
    git clone https://github.com/colinhacks/zod.git
    ```

3. **TypeScript**:
    ```bash
    # Clone TypeScript repo
    git clone https://github.com/microsoft/TypeScript.git
    ```

### Index Local Files

1. Settings > Indexing & Docs
2. Add Local Folder
3. Select downloaded documentation folder
4. Cursor will index locally

**Benefits**:

- Works offline
- Faster access
- Version control

**Drawbacks**:

- Takes disk space
- Must update manually

## Quick Setup Checklist

- [ ] Open Cursor Settings (`Cmd+,` or `Ctrl+,`)
- [ ] Navigate to **Features** > **Docs**
- [ ] Click **"Add New Documentation"**
- [ ] Add Node.js:
    - Name: `Node.js`
    - Prefix: `https://nodejs.org/api/`
    - Entrypoint: `https://nodejs.org/api/`
- [ ] Add Zod:
    - Name: `Zod`
    - Prefix: `https://zod.dev/`
    - Entrypoint: `https://zod.dev/`
- [ ] Add TypeScript:
    - Name: `TypeScript`
    - Prefix: `https://www.typescriptlang.org/docs/`
    - Entrypoint: `https://www.typescriptlang.org/docs/`
- [ ] Wait for indexing to complete (check status)
- [ ] Test with `@Docs Node.js` in Chat
- [ ] Test with `@Docs Zod` in Chat
- [ ] Test with `@Docs TypeScript` in Chat

## Example Usage in Commands

You can reference indexed docs in custom commands:

**Example**: Update `/impl_add_tool` to include docs:

```markdown
You are the Implementer. Follow role.impl.mdc first, then project rules.

@Docs Zod Create a Zod schema for the tool arguments.
@Docs Node.js Use Node.js built-ins with 'node:' prefix.
@Docs TypeScript Derive types with z.infer<typeof Schema>.

Add a new tool end-to-end:

1. Create Zod schema in src/core/types.ts
2. Create handler function in src/tools/[tool_name]\_tools.ts
3. Register in src/core/tool_registry.ts
4. Add to appropriate agent in src/agents/index.ts
5. Create test file src/tools/[tool_name]\_tools.test.ts

Follow patterns in tools.mdc, errors.mdc, and testing.mdc.
```

## Related Documentation

- `docs/CURSOR_OPTIMIZATION_GUIDE.md` - Full optimization guide
- `docs/CURSOR_OPTIMIZATION_COMPLETE.md` - Complete checklist
- `.cursor/rules/core.mdc` - Core conventions (references Node.js, Zod)

## Next Steps

1. ✅ Index Node.js, Zod, and TypeScript docs
2. ✅ Test with sample questions
3. ✅ Update custom commands to use `@mentions` (optional)
4. ✅ Use in daily workflow

**Expected Impact**: Reduced hallucinations, more accurate API usage, better type safety.
