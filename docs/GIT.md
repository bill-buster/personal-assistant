# Git Workflow & Setup Guide

Complete guide to Git workflow, branching strategy, automated hooks, and best practices for this project.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Quick Commands](#quick-commands)
3. [Automated Git Hooks](#automated-git-hooks)
4. [Branching Strategy](#branching-strategy)
5. [Setting Up Remote Repository](#setting-up-remote-repository)
6. [Commit Workflow](#commit-workflow)
7. [Commit Message Format](#commit-message-format)
8. [What NOT to Commit](#what-not-to-commit)
9. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### Git Configuration

If you haven't set up git yet:

```bash
# Set up git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set up git aliases (optional but recommended)
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
```

### Cursor Rules

Git workflow rules are defined in `.cursor/rules/git.mdc`:
- Pre-commit checklist
- Commit message format (conventional commits)
- What to commit vs ignore
- Git workflow patterns

### .gitignore Configuration

Generated test files are automatically ignored:
- `src/tools/test_tool*.ts`
- `src/tools/e2e_test*.ts`
- `src/tools/TestTool*.ts`
- `src/tools/*_tools_tools.test.ts`

### Cleanup Script

Remove generated test files:
```bash
npm run cleanup
```

### Formatting Commands

```bash
npm run fix          # lint:fix + format
npm run fix:all      # lint:fix + format + typecheck
npm run format:all   # Format all files (ts, js, json, md)
```

---

## Quick Commands

### 🚀 Automatic (Recommended)

**Git hooks run automatically** when you commit:

```bash
git commit -m "feat: description"
```

The pre-commit hook automatically:
1. ✅ Cleans up generated files
2. ✅ Fixes formatting/linting
3. ✅ Checks everything
4. ✅ Commits if all pass

**No manual steps needed!** 🎉

### 🔧 Manual (If Needed)

**If hooks are disabled or you want to run manually**:

```bash
npm run cleanup && npm run fix && npm run preflight
```

This will:
1. ✅ Clean up generated test files
2. ✅ Auto-fix formatting and linting
3. ✅ Run all preflight checks

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

---

## Automated Git Hooks

### ✅ What's Set Up

#### Pre-Commit Hook (`.husky/pre-commit`)

**Runs automatically** when you run `git commit`:

1. **Cleanup** - Removes generated test files
2. **Auto-fix** - Fixes formatting and linting issues
3. **Format check** - Verifies formatting is correct
4. **Lint check** - Verifies no linting errors
5. **Type check** - Verifies TypeScript compiles

**If any check fails**, the commit is blocked and you'll see what needs to be fixed.

#### Pre-Push Hook (`.husky/pre-push`)

**Runs automatically** when you run `git push`:

- **Full preflight** - Runs all checks including build, leak check, and smoke test

**If checks fail**, the push is blocked.

### How It Works

#### Automatic Behavior

```bash
# When you commit
git commit -m "feat: new feature"

# Hook automatically runs:
# ✅ Cleanup generated files
# ✅ Fix formatting/linting
# ✅ Check everything
# ✅ Commit proceeds if all pass
```

#### If Checks Fail

```bash
git commit -m "feat: new feature"

# Hook runs and finds issues:
# ❌ Formatting issues found
#
# You'll see:
# - What failed
# - How to fix it
# - Commit is blocked until fixed
```

### Manual Override

If you need to skip hooks (not recommended):

```bash
# Skip pre-commit hook
git commit --no-verify -m "message"

# Skip pre-push hook
git push --no-verify
```

### What Gets Fixed Automatically

**Pre-Commit Hook Fixes**:
- ✅ Removes generated test files (`test_tool*.ts`, etc.)
- ✅ Fixes ESLint errors (where possible)
- ✅ Formats code with Prettier
- ✅ Checks TypeScript types

**What You Still Need to Fix Manually**:
- ❌ Type errors (need code changes)
- ❌ Logic errors (need code changes)
- ❌ Test failures (need test fixes)

### Configuration

**Hook Files**:
- `.husky/pre-commit` - Runs before commit
- `.husky/pre-push` - Runs before push

**Setup**:
Hooks are installed via `husky` (runs on `npm install`).

To reinstall:
```bash
npm run prepare
```

### Benefits

**✅ Automatic**:
- No need to remember to run cleanup
- No need to remember to fix formatting
- No need to remember to check types

**✅ Consistent**:
- Everyone gets the same checks
- Prevents bad commits from entering repo
- Ensures code quality

**✅ Fast**:
- Only runs on changed files (via lint-staged)
- Fails fast if issues found
- Doesn't slow down workflow

---

## Branching Strategy

### Overview

This project uses **GitHub Flow** - a simple, branch-based workflow optimized for:
- ✅ Solo developers and small teams
- ✅ Continuous integration/deployment
- ✅ Automated semantic versioning
- ✅ Fast iteration cycles

### Why GitHub Flow?

**Chosen because**:
- ✅ **Simple**: Single `main` branch (no `develop` branch complexity)
- ✅ **Fast**: Short-lived feature branches (hours to days, not weeks)
- ✅ **Automated**: Works perfectly with semantic-release (releases from `main`)
- ✅ **CI/CD Ready**: All checks run on PRs, main is always deployable
- ✅ **Solo-Friendly**: No complex merge strategies needed

**Not using GitFlow because**:
- ❌ Too complex for solo/small teams
- ❌ Requires `develop` branch (we don't have one)
- ❌ Release branches unnecessary with automated releases
- ❌ Overkill for this project size

### Branch Types

#### Protected Branch: `main`

**Purpose**: Production-ready code, always deployable

**Protection Rules**:
- ✅ Requires pull request reviews (1 approval minimum)
- ✅ Requires CI checks to pass
- ✅ Requires branches to be up to date before merging
- ✅ No direct commits (use PRs)
- ✅ No force pushes
- ✅ No deletions

**CI/CD**:
- Runs full test suite on every push
- Runs semantic-release on merge (auto-versioning)
- Generates changelog automatically

**Releases**:
- Automated via semantic-release
- Version bumps based on conventional commits:
  - `feat:` → Minor version bump (0.1.0 → 0.2.0)
  - `fix:` → Patch version bump (0.1.0 → 0.1.1)
  - `refactor:` → Patch version bump
  - `docs:`, `test:`, `chore:` → No version bump

#### Feature Branches: `feature/<name>`

**Purpose**: New features and enhancements

**Naming Convention**:
```
feature/<short-description>
```

**Examples**:
- ✅ `feature/add-test-generation`
- ✅ `feature/improve-routing`
- ✅ `feature/add-git-hooks`
- ❌ `feature/new` (too vague)
- ❌ `Feature/NewTool` (uppercase, no type prefix)

**Lifecycle**:
1. Create from `main`
2. Develop feature
3. Create PR to `main`
4. CI runs automatically
5. Review and merge
6. Delete branch

**Best Practices**:
- Keep branches small and focused (one feature per branch)
- Update frequently with `main` (rebase or merge)
- Delete after merge
- Use descriptive names

#### Fix Branches: `fix/<name>`

**Purpose**: Bug fixes

**Naming Convention**:
```
fix/<short-description>
```

**Examples**:
- ✅ `fix/router-empty-query`
- ✅ `fix/memory-leak`
- ✅ `fix/test-generation-schema`
- ❌ `fix/bug` (too vague)

**Lifecycle**: Same as feature branches

**Best Practices**:
- Reference issue number if applicable: `fix/123-router-bug`
- Keep fixes focused (one bug per branch)
- Include tests for the fix

#### Documentation Branches: `docs/<name>`

**Purpose**: Documentation updates

**Naming Convention**:
```
docs/<short-description>
```

**Examples**:
- ✅ `docs/update-git-workflow`
- ✅ `docs/add-api-docs`
- ✅ `docs/fix-typos`

**Lifecycle**: Same as feature branches

**CI**: Lighter checks (format, lint, no tests required)

#### Hotfix Branches: `hotfix/<name>`

**Purpose**: Critical production fixes (use sparingly)

**Naming Convention**:
```
hotfix/<short-description>
```

**Examples**:
- ✅ `hotfix/security-patch`
- ✅ `hotfix/critical-bug`
- ✅ `hotfix/data-leak`

**When to Use**:
- Critical security issues
- Production-breaking bugs
- Data loss/corruption issues

**Lifecycle**:
1. Create from `main`
2. Fix immediately
3. Create PR (mark as urgent)
4. Expedited review
5. Merge to `main`
6. Delete branch

**Note**: Use sparingly. Most fixes can go through normal `fix/` branches.

### Branch Workflow

#### Standard Feature Development

```bash
# 1. Start from latest main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/add-new-tool

# 3. Develop (commit frequently)
git add src/tools/new_tool.ts
git commit -m "feat(tools): add new tool"

# 4. Keep updated with main (if needed)
git fetch origin
git rebase origin/main
# OR
git merge origin/main

# 5. Push and create PR
git push origin feature/add-new-tool
# Create PR on GitHub

# 6. After merge, cleanup
git checkout main
git pull origin main
git branch -d feature/add-new-tool
```

#### Bug Fix Workflow

```bash
# 1. Create fix branch
git checkout main
git pull origin main
git checkout -b fix/router-bug

# 2. Fix bug
git add src/app/router.ts
git commit -m "fix(router): handle empty queries"

# 3. Add test
git add src/app/router.test.ts
git commit -m "test(router): add test for empty query"

# 4. Push and create PR
git push origin fix/router-bug
# Create PR on GitHub
```

### Branch Naming Rules

**Format**:
```
<type>/<short-description>
```

**Rules**:
- ✅ Use lowercase
- ✅ Use hyphens for multi-word names
- ✅ Be descriptive but concise (3-5 words max)
- ✅ No special characters except hyphens
- ✅ No spaces

**Type Prefixes**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `hotfix/` - Critical fixes

**Good Examples**:
```
feature/add-test-generation
fix/router-empty-query
docs/update-contributing
hotfix/security-patch
```

**Bad Examples**:
```
Feature/NewTool          # Uppercase
fix-bug                  # Missing type prefix
feature/new tool         # Spaces
feature/new_tool         # Underscores
feature/add-new-feature-for-testing-generation  # Too long
```

### Merge Strategies

#### Recommended: Squash and Merge

**Use for**: Feature branches, fix branches

**Benefits**:
- ✅ Clean linear history
- ✅ One commit per feature/fix
- ✅ Easy to revert entire feature
- ✅ Clear commit messages

**How**:
- Select "Squash and merge" in GitHub PR
- Review commit message (auto-generated from PR title)
- Merge

#### Alternative: Rebase and Merge

**Use for**: Small, focused changes

**Benefits**:
- ✅ Preserves individual commits
- ✅ Clean linear history
- ✅ Good for reviewing commit-by-commit

**When**: Want to preserve detailed commit history

#### Avoid: Merge Commit

**Don't use**: Creates merge commits

**Why avoid**:
- ❌ Clutters history
- ❌ Harder to follow
- ❌ Unnecessary complexity

### CI/CD Integration

**CI Runs On**:
- ✅ **All PRs**: Format check, lint, type check, build, tests
- ✅ **Main branch**: Full test suite + smoke tests
- ✅ **All branches**: Format and lint checks

**Release Process** (Automated via semantic-release):
1. PR merged to `main`
2. CI runs semantic-release
3. Analyzes commits since last release
4. Determines version bump (based on conventional commits)
5. Generates changelog
6. Creates git tag
7. Updates `package.json` version
8. Commits changelog and version

**No manual version bumps needed!**

### Best Practices

**✅ Do**:
- Always start from latest `main`
- Keep branches small and focused
- Commit frequently with clear messages
- Update branch with `main` regularly
- Delete branches after merge
- Use descriptive branch names
- Write tests for new features/fixes
- Keep PRs small (< 500 lines ideally)

**❌ Don't**:
- Don't commit directly to `main`
- Don't create branches from other feature branches
- Don't let branches get stale (update weekly)
- Don't use generic names (`feature/update`, `fix/bug`)
- Don't force push to shared branches
- Don't merge broken code
- Don't skip CI checks
- Don't leave branches open for weeks

---

## Setting Up Remote Repository

### Option 1: Create New Repository on GitHub (Recommended)

#### 1. Create Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name**: `personal-assistant` (or your preferred name)
   - **Description**: "Local-first CLI assistant with natural language routing"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

#### 2. Connect Local Repository to GitHub

After creating the repo, GitHub will show you commands. Use these:

```bash
# If you haven't set up remote yet, or want to update it:
git remote add origin git@github.com:YOUR_USERNAME/personal-assistant.git

# Or if using HTTPS:
git remote add origin https://github.com/YOUR_USERNAME/personal-assistant.git

# Push your code
git push -u origin main
```

#### 3. If Remote Already Exists (Update URL)

```bash
# Check current remote
git remote -v

# Update to your repository
git remote set-url origin git@github.com:YOUR_USERNAME/personal-assistant.git

# Or HTTPS:
git remote set-url origin https://github.com/YOUR_USERNAME/personal-assistant.git

# Push
git push -u origin main
```

### Option 2: Use GitHub CLI (Faster)

If you have GitHub CLI installed:

```bash
# Check if installed
gh --version

# If not installed, install it:
# macOS: brew install gh
# Then: gh auth login

# Create repo and push in one command
gh repo create personal-assistant --public --source=. --remote=origin --push
```

### Authentication Setup

#### For SSH (Recommended)

1. **Check if you have SSH keys**:
   ```bash
   ls -la ~/.ssh/id_*.pub
   ```

2. **If no keys, generate one**:
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   # Press Enter to accept default location
   # Optionally set a passphrase
   ```

3. **Copy your public key**:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copy the entire output
   ```

4. **Add to GitHub**:
   - Go to GitHub → Settings → SSH and GPG keys
   - Click "New SSH key"
   - Paste your public key
   - Save

5. **Test connection**:
   ```bash
   ssh -T git@github.com
   # Should say: "Hi YOUR_USERNAME! You've successfully authenticated..."
   ```

#### For HTTPS

1. **Use Personal Access Token** (not password):
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope
   - Copy token

2. **When pushing, use token as password**:
   ```bash
   git push -u origin main
   # Username: YOUR_USERNAME
   # Password: YOUR_TOKEN (not your GitHub password)
   ```

3. **Or use GitHub CLI**:
   ```bash
   gh auth login
   # Follow prompts
   ```

### Verify Setup

```bash
# Check remote
git remote -v

# Should show:
# origin  git@github.com:YOUR_USERNAME/personal-assistant.git (fetch)
# origin  git@github.com:YOUR_USERNAME/personal-assistant.git (push)

# Push and verify
git push -u origin main

# Check status
git status
```

---

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

---

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

---

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

---

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

### Hook Not Running

```bash
# Reinstall hooks
npm run prepare

# Check hook exists
ls -la .husky/pre-commit
```

### Merge Conflicts

```bash
# Update branch with main
git checkout feature/my-feature
git fetch origin
git rebase origin/main

# Resolve conflicts
# ... edit files ...

git add .
git rebase --continue

# Push (force push needed after rebase)
git push origin feature/my-feature --force-with-lease
```

### Stale Branch

```bash
# Update with latest main
git checkout feature/my-feature
git fetch origin
git rebase origin/main

# Or merge main into branch
git merge origin/main
```

---

## Pre-Commit Checklist

- [ ] Run `npm run cleanup` (remove generated files)
- [ ] Run `npm run fix` (auto-fix formatting/linting)
- [ ] Run `npm run preflight` (full checks)
- [ ] Review `git status` (verify what you're committing)
- [ ] Write descriptive commit message
- [ ] Commit with `git commit -m "..."`

---

## Integration

- **Cursor Rules**: See `.cursor/rules/git.mdc` for git patterns
- **Preflight**: See `scripts/preflight.sh` for full checks
- **Formatting**: Uses Prettier + ESLint (see `package.json`)
- **Hooks**: Managed by Husky (see `.husky/`)

---

## Summary

**Strategy**: GitHub Flow (simple, fast, automated)

**Branches**:
- `main` - Production (protected)
- `feature/*` - Features
- `fix/*` - Bug fixes
- `docs/*` - Documentation
- `hotfix/*` - Critical fixes (rare)

**Workflow**:
1. Create branch from `main`
2. Develop and commit
3. Create PR
4. CI runs automatically
5. Review and merge
6. Delete branch

**Releases**: Automated via semantic-release

**Hooks**: Automatic cleanup, formatting, and checks

**Simple, fast, and automated!** 🚀

