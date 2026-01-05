# Branching Strategy

## Overview

This project uses **GitHub Flow** - a simple, branch-based workflow optimized for:

- ✅ Solo developers and small teams
- ✅ Continuous integration/deployment
- ✅ Automated semantic versioning
- ✅ Fast iteration cycles

## Why GitHub Flow?

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

## Branch Types

### Protected Branch: `main`

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

### Feature Branches: `feature/<name>`

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

### Fix Branches: `fix/<name>`

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

### Documentation Branches: `docs/<name>`

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

### Hotfix Branches: `hotfix/<name>`

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

## Branch Workflow

### Standard Feature Development

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

### Bug Fix Workflow

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

### Documentation Update

```bash
# 1. Create docs branch
git checkout main
git pull origin main
git checkout -b docs/update-git-workflow

# 2. Update docs
git add docs/GIT_WORKFLOW.md
git commit -m "docs: update git workflow guide"

# 3. Push and create PR
git push origin docs/update-git-workflow
# Create PR on GitHub
```

## Branch Naming Rules

### Format

```
<type>/<short-description>
```

### Rules

- ✅ Use lowercase
- ✅ Use hyphens for multi-word names
- ✅ Be descriptive but concise (3-5 words max)
- ✅ No special characters except hyphens
- ✅ No spaces

### Type Prefixes

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `hotfix/` - Critical fixes

### Good Examples

```
feature/add-test-generation
fix/router-empty-query
docs/update-contributing
hotfix/security-patch
```

### Bad Examples

```
Feature/NewTool          # Uppercase
fix-bug                  # Missing type prefix
feature/new tool         # Spaces
feature/new_tool         # Underscores
feature/add-new-feature-for-testing-generation  # Too long
```

## Merge Strategies

### Recommended: Squash and Merge

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

### Alternative: Rebase and Merge

**Use for**: Small, focused changes

**Benefits**:

- ✅ Preserves individual commits
- ✅ Clean linear history
- ✅ Good for reviewing commit-by-commit

**When**: Want to preserve detailed commit history

### Avoid: Merge Commit

**Don't use**: Creates merge commits

**Why avoid**:

- ❌ Clutters history
- ❌ Harder to follow
- ❌ Unnecessary complexity

## CI/CD Integration

### CI Runs On

- ✅ **All PRs**: Format check, lint, type check, build, tests
- ✅ **Main branch**: Full test suite + smoke tests
- ✅ **All branches**: Format and lint checks

### Release Process

**Automated via semantic-release**:

1. PR merged to `main`
2. CI runs semantic-release
3. Analyzes commits since last release
4. Determines version bump (based on conventional commits)
5. Generates changelog
6. Creates git tag
7. Updates `package.json` version
8. Commits changelog and version

**No manual version bumps needed!**

## Branch Protection

### Main Branch Protection

**Required**:

- ✅ Pull request reviews (1 approval)
- ✅ CI status checks must pass
- ✅ Branches must be up to date
- ✅ No force pushes
- ✅ No deletions

**Configure in GitHub**:

- Settings → Branches → Branch protection rules → `main`

### Other Branches

- ✅ No protection (can push freely)
- ✅ CI runs on PR creation
- ✅ Can be deleted after merge

## Best Practices

### ✅ Do

- Always start from latest `main`
- Keep branches small and focused
- Commit frequently with clear messages
- Update branch with `main` regularly
- Delete branches after merge
- Use descriptive branch names
- Write tests for new features/fixes
- Keep PRs small (< 500 lines ideally)

### ❌ Don't

- Don't commit directly to `main`
- Don't create branches from other feature branches
- Don't let branches get stale (update weekly)
- Don't use generic names (`feature/update`, `fix/bug`)
- Don't force push to shared branches
- Don't merge broken code
- Don't skip CI checks
- Don't leave branches open for weeks

## Branch Lifecycle

### Typical Timeline

```
Day 1: Create branch → Start development
Day 1-3: Develop → Commit frequently
Day 3: Create PR → CI runs → Review
Day 4: Address feedback → Update PR
Day 4: Merge → Delete branch
```

**Total**: 1-5 days typically

### Long-Running Branches

**If branch lives > 1 week**:

- ✅ Update with `main` at least weekly
- ✅ Consider breaking into smaller PRs
- ✅ Document why it's taking longer

## Troubleshooting

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

### Wrong Base Branch

```bash
# If you created branch from wrong branch
git checkout feature/my-feature
git rebase origin/main

# Or recreate branch
git checkout main
git pull origin main
git checkout -b feature/my-feature
git cherry-pick <commit-hash>
```

## Integration with Semantic Release

### How It Works

1. **Commit to branch**: Use conventional commits

    ```
    feat(tools): add new tool
    fix(router): handle empty queries
    ```

2. **Merge to main**: PR merged with squash/rebase

3. **CI runs semantic-release**:
    - Analyzes commits since last tag
    - Determines version bump
    - Generates changelog
    - Creates git tag
    - Updates version

### Commit Types That Trigger Releases

- `feat:` → Minor version (0.1.0 → 0.2.0)
- `fix:` → Patch version (0.1.0 → 0.1.1)
- `refactor:` → Patch version
- `perf:` → Patch version
- `docs:`, `test:`, `chore:` → No release

### No Release Needed?

Use these commit types:

- `docs:` - Documentation only
- `test:` - Tests only
- `chore:` - Maintenance
- `style:` - Formatting only

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

**Simple, fast, and automated!** 🚀
