# How to Create Custom Commands in Cursor

## Overview

Custom Commands in Cursor let you create reusable prompts that you can trigger with `/` in Chat. Commands are stored as **Markdown files** in a `.cursor/commands/` directory.

## Project vs User Commands

### Project-Level Commands (Recommended)

**Location**: `.cursor/commands/` in your project root

**Benefits**:

- ✅ Shared with team via git
- ✅ Project-specific workflows
- ✅ Version controlled
- ✅ Everyone gets the same commands

**Use for**: Commands that reference project rules, file paths, or team workflows

### User-Level Commands

**Location**: `~/.cursor/commands/` (global, on your machine)

**Benefits**:

- ✅ Available across all projects
- ✅ Personal preferences
- ✅ Not shared (private)

**Use for**: Personal shortcuts, general-purpose commands

## Step-by-Step Setup (Project Commands)

### 1. Create Commands Directory

```bash
# In your project root
mkdir -p .cursor/commands
```

### 2. Create Command Files

Each command is a **Markdown file** in `.cursor/commands/`:

- **Filename** = command name (e.g., `impl_add_tool.md`)
- **Content** = The prompt text (markdown)

**Example**: `.cursor/commands/impl_add_tool.md`

```markdown
You are the Implementer. Follow role.impl.mdc first, then project rules.

Add a new tool end-to-end:

1. Create Zod schema in src/core/types.ts
2. Create handler function in src/tools/[tool_name]\_tools.ts
3. Register in src/core/tool_registry.ts
4. Add to appropriate agent in src/agents/index.ts
5. Create test file src/tools/[tool_name]\_tools.test.ts

Follow patterns in tools.mdc, errors.mdc, and testing.mdc.
```

### 3. Command Format

- **Filename** (without `.md`) = command name
- Example: `impl_add_tool.md` → `/impl_add_tool`
- Type `/` in Chat to see all available commands
- Cursor auto-detects files in `.cursor/commands/`

## Recommended Commands

Create these files in `.cursor/commands/`:

### Command 1: `impl_add_tool.md`

**File**: `.cursor/commands/impl_add_tool.md`

**Description**: Add a new tool end-to-end (schema, handler, registry, tests)

**Content**:

```
You are the Implementer. Follow role.impl.mdc first, then project rules.

Add a new tool end-to-end:
1. Create Zod schema in src/core/types.ts
2. Create handler function in src/tools/[tool_name]_tools.ts
3. Register in src/core/tool_registry.ts
4. Add to appropriate agent in src/agents/index.ts
5. Create test file src/tools/[tool_name]_tools.test.ts

Follow patterns in tools.mdc, errors.mdc, and testing.mdc.
```

### Command 2: `review_pr.md`

**File**: `.cursor/commands/review_pr.md`

**Description**: Review code systematically using checklist

**Content**:

```
You are the Reviewer. Follow role.review.mdc first, then project rules.

Review this code systematically using the checklist in code_review.mdc:
- Functionality (edge cases, error handling, bugs)
- Security (validation, paths, commands, secrets)
- Performance (caching, efficiency)
- Quality (conventions, types, unused code)
- Testing (coverage, edge cases, mocks)
- Documentation (JSDoc, README updates)

Provide specific, actionable feedback. Approve only if all checks pass.
```

### Command 3: `jules_test.md`

**File**: `.cursor/commands/jules_test.md`

**Description**: Write comprehensive tests (stress tester role)

**Content**:

```
You are Jules (stress tester). Follow role.jules.mdc first, then project rules.

Write comprehensive tests covering:
- Success cases
- Error cases (validation, permissions, execution)
- Edge cases (empty/null/undefined, boundaries, max sizes)
- Invalid inputs (wrong types, malformed data)
- Race conditions (if applicable)

Use patterns from testing.mdc. Break things and ensure robustness.
```

### Command 4: `safe_refactor.md`

**File**: `.cursor/commands/safe_refactor.md`

**Description**: Create step-by-step plan for refactoring (use with Plan Mode)

**Content**:

```
You are the Planner. Follow role.planner.mdc first, then project rules.

Use Plan Mode to create a step-by-step plan for this refactor:
1. Analyze scope and dependencies
2. Break into clear, sequential steps
3. Identify affected files
4. Create reviewable plan

Execute in phases with tests after each phase. Each step should be independently reviewable.
```

### Command 5: `perf_fix_spawn.md`

**File**: `.cursor/commands/perf_fix_spawn.md`

**Description**: Convert spawn-based tests to direct imports where safe

**Content**:

```
Convert spawn-based tests to direct imports where safe.

Follow performance.mdc patterns:
- Use direct imports instead of spawnSync when possible
- Keep spawnSync only for actual command execution tests
- Verify tests still pass after conversion
- Update test documentation if needed
```

## Quick Setup Script

Create all 5 commands at once:

```bash
# Create directory
mkdir -p .cursor/commands

# Create command files (copy content from sections above)
# Or use the files we'll create below
```

## Creating the Files

Here's how to create each file:

## How to Use Commands

### In Chat (Cmd+L or Ctrl+L)

1. Open Chat
2. Type `/` to see available commands
3. Select a command (e.g., `/impl_add_tool`)
4. The prompt is inserted automatically
5. Add any additional context or specifics
6. Send the message

**Example**:

```
/impl_add_tool

Add a tool called "weather" that fetches weather data for a location.
```

### In Composer (Cmd+I or Ctrl+I)

1. Open Composer
2. Type `/` to see available commands
3. Select a command
4. The prompt is inserted
5. Add context
6. Enable Plan Mode if needed (for `/safe_refactor`)
7. Execute

## Tips

### 1. Command Names

- Use lowercase with underscores: `impl_add_tool` not `ImplAddTool`
- Keep names short but descriptive
- Use prefixes for grouping: `impl_`, `review_`, `test_`

### 2. Prompts

- Reference role packs explicitly: "Follow role.impl.mdc first"
- Reference project rules: "then project rules"
- Be specific about what you want
- Include file paths when relevant

### 3. Testing Commands

- Test each command after creating it
- Refine prompts based on results
- Share commands with team (they're stored in settings)

### 4. Organizing Commands

- Group related commands with prefixes
- Use descriptions to clarify purpose
- Keep prompts focused (one task per command)

## Troubleshooting

### Commands Not Appearing

1. **Check File Location**:
    - Commands must be in `.cursor/commands/` (project) or `~/.cursor/commands/` (user)
    - Filenames must end with `.md`
    - Filename (without `.md`) = command name

2. **Check File Format**:
    - Must be valid Markdown
    - Content is the prompt text (no special structure needed)

3. **Restart Cursor**:
    - Sometimes requires restart to detect new commands
    - Or reload window: `Cmd+Shift+P` → "Reload Window"

### Commands Not Working

1. **Check Command Name**:
    - Must start with `/`
    - Must match exactly (case-sensitive)

2. **Check Prompt Format**:
    - Ensure prompt text is correct
    - Check for special characters that might break

3. **Check Rule References**:
    - Ensure referenced rules exist (e.g., `role.impl.mdc`)
    - Rules must be in `.cursor/rules/` directory

## Sharing Commands

### With Team

1. **Export Settings**:
    - Copy the `cursor.customCommands` section from settings.json
    - Share in team docs or version control

2. **Document in Repo**:
    - Add commands to `docs/CURSOR_CUSTOM_COMMANDS_SETUP.md`
    - Include usage examples

3. **Version Control**:
    - Consider adding to `.vscode/settings.json` (workspace settings)
    - Team members can sync automatically

## Sharing Commands with Team

Since commands are in `.cursor/commands/` (project-level):

1. ✅ **Already shared** - Commands are in the repo
2. ✅ **Version controlled** - Changes tracked in git
3. ✅ **Auto-sync** - Team members get updates on `git pull`

**No extra setup needed!** Just commit the `.cursor/commands/` directory.

## User-Level Commands (Optional)

If you want personal commands (not shared):

1. Create `~/.cursor/commands/` directory
2. Add `.md` files there
3. These commands appear in ALL projects
4. Not version controlled (personal only)

**Use for**: Personal shortcuts, general-purpose commands

## Next Steps

1. ✅ Create the 5 recommended commands
2. ✅ Test each command
3. ✅ Refine prompts based on results
4. ✅ Share with team (if applicable)
5. ✅ Document any custom commands you create

## Related Documentation

- `docs/CURSOR_OPTIMIZATION_GUIDE.md` - Full optimization guide
- `docs/CURSOR_OPTIMIZATION_SUMMARY.md` - Quick reference
- `.cursor/rules/role.*.mdc` - Role pack definitions
