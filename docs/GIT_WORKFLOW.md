# Git Workflow Guide

## Quick Commands

### Before Every Commit

```bash
# 1. Clean up generated files
npm run cleanup

# 2. Auto-fix formatting and linting
npm run fix

# 3. Run preflight checks
npm run preflight
```

### One-Command Solution

```bash
# Clean, fix, and check everything
npm run cleanup && npm run fix && npm run preflight
```

## Formatting & Linting

### Auto-Fix Everything

```bash
npm run fix          # Fix lint + format
npm run fix:all      # Fix lint + format + typecheck
```

### Check Without Fixing

```bash
npm run check        # typecheck + lint + format check
npm run lint         # Check linting
npm run format:check # Check formatting
```

### Format All Files

```bash
npm run format       # Format TypeScript files
npm run format:all   # Format all files (ts, js, json, md)
```

## Git Status

### Check What's Changed

```bash
git status                    # See all changes
git status --short            # Compact view
git diff                      # See detailed changes
git diff --staged             # See staged changes
```

### Clean Up Generated Files

```bash
npm run cleanup               # Remove generated test files
```

## Commit Workflow

### 1. Review Changes

```bash
git status
```

### 2. Clean Up

```bash
npm run cleanup
```

### 3. Fix Formatting

```bash
npm run fix
```

### 4. Stage Files

```bash
# Stage specific files
git add src/tools/my_tool.ts

# Stage all (be careful!)
git add -A
```

### 5. Verify

```bash
npm run preflight
```

### 6. Commit

```bash
git commit -m "feat(tools): add new tool"
```

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

**Examples**:
```
feat(tools): add generate tests command
fix(router): handle empty query strings
docs: update git workflow guide
test(executor): add permission tests
chore: update dependencies
```

## What NOT to Commit

### Generated Files (Auto-Ignored)

- `src/tools/test_tool*.ts`
- `src/tools/e2e_test*.ts`
- `src/tools/TestTool*.ts`
- `src/tools/*_tools_tools.test.ts`

### Build Artifacts

- `dist/`
- `node_modules/`
- `coverage/`
- `.test-results/`

### Runtime Data

- `.assistant-data/`
- `*.jsonl`
- `memory.json`

## Troubleshooting

### Too Many Uncommitted Files

```bash
# 1. Clean up generated files
npm run cleanup

# 2. Check what's left
git status --short

# 3. Review and stage only what you need
git add <specific-files>
```

### Formatting Errors

```bash
# Auto-fix
npm run fix

# Check what's wrong
npm run format:check
```

### Linting Errors

```bash
# Auto-fix
npm run lint:fix

# Check what's wrong
npm run lint
```

### Type Errors

```bash
# Check types
npm run typecheck

# Fix if possible (may need manual fixes)
```

## Pre-Commit Checklist

- [ ] Run `npm run cleanup` (remove generated files)
- [ ] Run `npm run fix` (auto-fix formatting/linting)
- [ ] Run `npm run preflight` (full checks)
- [ ] Review `git status` (verify what you're committing)
- [ ] Write descriptive commit message
- [ ] Commit with `git commit -m "..."`

## Integration

- **Cursor Rules**: See `.cursor/rules/git.mdc` for git patterns
- **Preflight**: See `scripts/preflight.sh` for full checks
- **Formatting**: Uses Prettier + ESLint (see `package.json`)

