# Cursor IDE Setup & Optimization Guide

Complete guide to setting up and optimizing Cursor IDE for this project, including custom commands, rules, indexing, and workflow automation.

## Table of Contents

1. [Overview](#overview)
2. [Custom Commands](#custom-commands)
3. [How Commands Access Context](#how-commands-access-context)
4. [External Documentation Indexing](#external-documentation-indexing)
5. [Optimization Opportunities](#optimization-opportunities)
6. [General User Commands](#general-user-commands)
7. [Command Overlaps](#command-overlaps)

---

## Overview

### Current State

**✅ What We're Using**:
- **MDC Rules** (`.cursor/rules/*.mdc`) - 18 rules covering core patterns
- **File-based rule activation** - Rules activate based on globs
- **Always-apply rules** - Core rules always in context
- **Cross-references** - Rules link to each other
- **Project-level commands** (`.cursor/commands/`) - 10 project-specific commands
- **User-level commands** (`~/.cursor/commands/`) - 7 general-purpose commands

**❌ What We're Missing**:
- Custom Commands (`/`) - Standardize workflows
- Plan Mode - For large refactors
- Background Agents - Parallel task execution
- Bugbot - Automated PR reviews
- Visual Context - Image uploads
- Voice Control - Speech commands

---

## Custom Commands

### Project vs User Commands

**Project-Level Commands** (Recommended):
- **Location**: `.cursor/commands/` in your project root
- **Benefits**: Shared with team via git, project-specific workflows, version controlled
- **Use for**: Commands that reference project rules, file paths, or team workflows

**User-Level Commands**:
- **Location**: `~/.cursor/commands/` (global, on your machine)
- **Benefits**: Available across all projects, personal preferences, not shared
- **Use for**: Personal shortcuts, general-purpose commands

### Step-by-Step Setup (Project Commands)

1. **Create Commands Directory**:
   ```bash
   mkdir -p .cursor/commands
   ```

2. **Create Command Files**:
   Each command is a **Markdown file** in `.cursor/commands/`:
   - **Filename** = command name (e.g., `impl_add_tool.md`)
   - **Content** = The prompt text (markdown)

3. **Command Format**:
   - **Filename** (without `.md`) = command name
   - Example: `impl_add_tool.md` → `/impl_add_tool`
   - Type `/` in Chat to see all available commands
   - Cursor auto-detects files in `.cursor/commands/`

### Recommended Project Commands

#### `/impl_add_tool`

**File**: `.cursor/commands/impl_add_tool.md`

```markdown
You are the Implementer. Follow role.impl.mdc first, then project rules.

Add a new tool end-to-end:
1. Create Zod schema in src/core/types.ts
2. Create handler function in src/tools/[tool_name]_tools.ts
3. Register in src/core/tool_registry.ts
4. Add to appropriate agent in src/agents/index.ts
5. Create test file src/tools/[tool_name]_tools.test.ts

Follow patterns in tools.mdc, errors.mdc, and testing.mdc.
```

#### `/review_pr`

**File**: `.cursor/commands/review_pr.md`

```markdown
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

#### `/jules_test`

**File**: `.cursor/commands/jules_test.md`

```markdown
You are Jules (stress tester). Follow role.jules.mdc first, then project rules.

Write comprehensive tests covering:
- Success cases
- Error cases (validation, permissions, execution)
- Edge cases (empty/null/undefined, boundaries, max sizes)
- Invalid inputs (wrong types, malformed data)
- Race conditions (if applicable)

Use patterns from testing.mdc. Break things and ensure robustness.
```

#### `/safe_refactor`

**File**: `.cursor/commands/safe_refactor.md`

```markdown
You are the Planner. Follow role.planner.mdc first, then project rules.

Use Plan Mode to create a step-by-step plan for this refactor:
1. Analyze scope and dependencies
2. Break into clear, sequential steps
3. Identify affected files
4. Create reviewable plan

Execute in phases with tests after each phase. Each step should be independently reviewable.
```

#### `/perf_fix_spawn`

**File**: `.cursor/commands/perf_fix_spawn.md`

```markdown
Convert spawn-based tests to direct imports where safe.

Follow performance.mdc patterns:
- Use direct imports instead of spawnSync when possible
- Keep spawnSync only for actual command execution tests
- Verify tests still pass after conversion
- Update test documentation if needed
```

### How to Use Commands

**In Chat (Cmd+L or Ctrl+L)**:
1. Open Chat
2. Type `/` to see available commands
3. Select a command (e.g., `/impl_add_tool`)
4. The prompt is inserted automatically
5. Add any additional context or specifics
6. Send the message

**In Composer (Cmd+I or Ctrl+I)**:
1. Open Composer
2. Type `/` to see available commands
3. Select a command
4. The prompt is inserted
5. Add context
6. Enable Plan Mode if needed (for `/safe_refactor`)
7. Execute

### Tips

1. **Command Names**: Use lowercase with underscores: `impl_add_tool` not `ImplAddTool`
2. **Prompts**: Reference role packs explicitly: "Follow role.impl.mdc first"
3. **Testing**: Test each command after creating it
4. **Organizing**: Group related commands with prefixes (`impl_`, `review_`, `test_`)

---

## How Commands Access Context

### Short Answer

**Cursor automatically injects context** when you use a command. The command file itself is just a prompt template - Cursor handles all the context injection behind the scenes.

### How It Works

1. **Command Files Are Just Prompts**: Your command files (like `refactor_code.md`) are **plain markdown prompts**. They don't contain special syntax to access code - they're just instructions.

2. **Cursor Automatically Injects Context**: When you use a command (e.g., `/refactor_code`), Cursor **automatically includes**:
   - **Selected code** (if any text is selected)
   - **Current file** (the file you're viewing)
   - **Open files** (other tabs you have open)
   - **Cursor position** (where your cursor is in the file)
   - **Project context** (relevant files, rules, etc.)

### Scenarios

#### Scenario 1: Code Selected
1. **Select some code** in your editor
2. Open Chat (Cmd+L)
3. Type `/refactor_code`
4. Cursor automatically includes:
   - The selected code
   - The file it's from
   - Project context
5. The AI receives: `[Your prompt] + [Selected code] + [Context]`

#### Scenario 2: No Selection (Cursor Position)
1. **Place cursor** in a function or code block
2. Open Chat (Cmd+L)
3. Type `/refactor_code`
4. Cursor automatically includes:
   - Code around cursor (smart context detection)
   - The current file
   - Project context
5. The AI receives: `[Your prompt] + [Code at cursor] + [Context]`

#### Scenario 3: Multiple Files Open
1. Have **multiple files open** in tabs
2. Open Chat (Cmd+L)
3. Type `/code_review`
4. Cursor automatically includes:
   - All open files (or relevant ones)
   - Selected code (if any)
   - Project context
5. The AI receives: `[Your prompt] + [All open files] + [Context]`

### What Gets Included Automatically

**Always Included**:
- ✅ Selected text (if any)
- ✅ Current file (file you're viewing)
- ✅ Cursor position
- ✅ Project rules (`.cursor/rules/*.mdc`)
- ✅ Project commands (`.cursor/commands/*.md`)

**Conditionally Included**:
- ✅ Open files (if relevant to the command)
- ✅ Related files (if Cursor detects relationships)
- ✅ Recent changes (if relevant)
- ✅ Error messages (if any in the file)

### Writing Effective Commands

**✅ Good: Assume Context is Available**
```markdown
Review this code for:
- Functionality and edge cases
- Security issues
- Performance optimizations

Provide specific, actionable feedback.
```

**❌ Bad: Don't Try to Access Code Manually**
```markdown
Review the code in the selected text:
- [Don't try to reference selected code explicitly]
- [Cursor handles this automatically]
```

**✅ Good: Use "This Code" Language**
- ✅ "Refactor **this code**"
- ✅ "Review **this code**"
- ✅ "Explain **this code**"
- ✅ "Add tests for **this code**"

Cursor knows "this code" = whatever is selected or at cursor.

### Edge Cases

**What If No Code is Selected and No Code File is Open?**

If you use a command when:
- ❌ No code is selected
- ❌ No code file is open (or only markdown/docs open)

**Cursor will still work**, but with limited context:
1. **Project context is still included**: Project rules, structure, recent files, Git context
2. **The command prompt is still sent**: Your command text is included, AI can respond based on the prompt alone
3. **Best practice**: Select code or open a file before using code-focused commands

**What If You're in a Non-Code File?**

If you're viewing markdown, documentation, config files, or text files:
- ✅ The file you're viewing (even if it's not code) is included
- ✅ Project context is included
- ✅ Related code files (if Cursor detects relationships) are included

---

## External Documentation Indexing

### Overview

Cursor allows you to index external documentation (Node.js, Zod, TypeScript, etc.) so the AI can reference them via `@mentions` in Chat. This reduces hallucinations and improves accuracy.

### Step-by-Step Setup

1. **Open Cursor Settings**:
   - Press `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
   - Or: Cursor > Settings (Mac) or File > Preferences > Settings (Windows/Linux)

2. **Find Documentation Settings**:
   - Navigate to: **Cursor Settings** > **Features** > **Docs**

3. **Add External Documentation**:
   - Click **"Add New Documentation"** button
   - Fill in:
     - **Name**: Descriptive name (e.g., "Node.js", "Zod", "TypeScript")
     - **Prefix**: Base URL of the documentation (e.g., `https://nodejs.org/api/`)
     - **Entrypoint**: Main page URL (e.g., `https://nodejs.org/api/`)
   - Click **"Save"** or **"Add"**
   - Cursor will automatically crawl and index the documentation

### Recommended Documentation

**High Priority**:
1. **Node.js**: `https://nodejs.org/api/`
2. **Zod**: `https://zod.dev/` or `https://github.com/colinhacks/zod`
3. **TypeScript**: `https://www.typescriptlang.org/docs/`

**Medium Priority**:
4. **ESLint**: `https://eslint.org/docs/latest/`
5. **Prettier**: `https://prettier.io/docs/en/`

### How to Use Indexed Documentation

**In Chat (Cmd+L or Ctrl+L)**:
```
@Docs Node.js How do I use fs.promises.readFile with error handling?
```

```
@Docs Zod How do I create a schema with optional fields?
```

**Important**: Cursor requires explicit `@Docs` mentions. The AI won't automatically use docs without mention.

### Troubleshooting

**If Zod and TypeScript Don't Index**:

1. **Try GitHub README** (for Zod):
   - Name: `Zod`
   - Prefix: `https://github.com/colinhacks/zod`
   - Entrypoint: `https://github.com/colinhacks/zod/blob/main/README.md`

2. **Try Specific Sections** (for TypeScript):
   - Name: `TypeScript`
   - Prefix: `https://www.typescriptlang.org/docs/handbook/`
   - Entrypoint: `https://www.typescriptlang.org/docs/handbook/intro.html`

3. **Use Local Documentation**:
   - Clone repos locally
   - Add local folder in Cursor Settings > Features > Docs

4. **Alternative: Add Patterns to Project Rules**:
   If external docs won't index, add key patterns to `.cursor/rules/core.mdc`:
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
   ```

**Why Some Sites Don't Work**:
- **JavaScript-rendered sites**: Many modern docs sites use JavaScript to render content. Cursor's crawler may not execute JavaScript.
- **Large documentation sites**: TypeScript's documentation is very large and may timeout.

**Recommended Approach**:
1. ✅ **Keep Node.js** - It's working and most important
2. **For Zod/TypeScript**: Add key patterns to `.cursor/rules/core.mdc`
3. **Update commands**: Reference the patterns in your custom commands

---

## Optimization Opportunities

### Missing Cursor Features

#### 1. Plan Mode (Official)

**What**: Official Cursor feature - AI drafts step-by-step plan before executing code changes. Plans are editable.

**Why Use It**:
- Transparency in AI behavior
- Review and edit plans before execution
- Better control over large refactors
- Reduces unexpected changes

**How to Use**:
1. Open Composer (Cmd+I)
2. Enable "Plan Mode" toggle
3. Describe desired changes
4. Review editable plan
5. Edit plan if needed
6. Execute when satisfied

**Use Cases**:
- Large refactoring (e.g., error handling migration)
- Architecture changes
- Multi-file updates
- Breaking changes
- Use with `role.planner.mdc` for best results

**Impact**: Very High - Prevents unexpected changes, improves predictability

#### 2. Background Agents (Official)

**What**: Official Cursor feature - Agents run asynchronously in a remote environment. You can follow up or take over.

**Why Use It**:
- Parallel task execution
- Divide large tasks across agents
- Run tasks in background
- Continue working while agents run

**How to Use**:
1. Open Composer (Cmd+I)
2. Enable "Background Agents"
3. Assign tasks to agents
4. Agents run asynchronously
5. Follow up or take over when ready

**Use Cases**:
- Generate tool + tests in parallel
- Refactor multiple files simultaneously
- Write docs while implementing features
- Run tests while implementing

**Impact**: High - Faster for large tasks, better workflow

#### 3. Bugbot (Official - AI Code Reviewer)

**What**: Official Cursor feature - Automatic PR review that identifies bugs and suggests fixes.

**Why Use It**:
- Automated code review
- Catches bugs before merge
- Suggests fixes automatically
- GitHub integration
- Reduces manual review time

**How to Use**:
1. Enable in Cursor settings
2. Connect GitHub account
3. Bugbot reviews PRs automatically
4. Applies fixes with one click

**Impact**: Very High - Automated quality checks, saves review time

### Rule Optimizations

#### Current Rules Analysis

| Rule                | alwaysApply | globs                                           | Optimization                          |
| ------------------- | ----------- | ----------------------------------------------- | ------------------------------------- |
| `core.mdc`          | ✅ true     | `["**/*.ts"]`                                   | ✅ Good - always needed               |
| `project.mdc`       | ✅ true     | `[]`                                            | ✅ Good - always needed               |
| `documentation.mdc` | ✅ true     | `[]`                                            | ⚠️ Could be file-based                |
| `agents.mdc`        | ❌ false    | `["src/agents/**/*.ts"]`                        | ✅ Good                               |
| `tools.mdc`         | ❌ false    | `["src/tools/**/*.ts"]`                         | ✅ Good                               |
| `testing.mdc`       | ❌ false    | `["**/*.test.ts"]`                              | ✅ Good                               |
| `errors.mdc`        | ❌ false    | `["**/*.ts"]`                                   | ⚠️ Very broad, could be more specific |
| `security.mdc`      | ❌ false    | `["src/core/executor.ts", "src/tools/**/*.ts"]` | ✅ Good                               |
| `performance.mdc`   | ❌ false    | `["**/*.ts"]`                                   | ⚠️ Very broad                         |

**Recommendations**:
1. **Make `documentation.mdc` file-based**: `globs: ['**/*.ts', 'docs/**/*.md']`
2. **Narrow `errors.mdc` globs**: `globs: ['src/**/*.ts', '!**/*.test.ts']`
3. **Narrow `performance.mdc` globs**: `globs: ['src/core/**/*.ts', 'src/tools/**/*.ts']`

### Indexing Optimizations

#### Codebase Indexing

Cursor has **two ignore files**:
- **`.cursorignore`**: Best-effort exclude from AI access AND indexing (security/perf)
- **`.cursorindexingignore`**: Exclude from indexing only (perf only)

**Optimization Opportunities**:
1. **Use `.cursorindexingignore` for Performance**:
   - Exclude build outputs: `dist/`, `coverage/`, `.test-results/`
   - Exclude cache: `.cache/`, `.tmp/`
   - Exclude profiler outputs: `*.prof`, `*.profraw`

2. **Use `.cursorignore` for Security**:
   - Secrets, API keys, credentials
   - Sensitive config files
   - Files you don't want sent to AI at all

3. **Index External Docs** (Settings > Indexing & Docs):
   - Node.js documentation
   - Zod documentation
   - Framework docs you rely on
   - Internal design docs (hosted URLs)
   - Reference via `@mentions` in Chat

### Recommended Actions

**High Priority**:
1. ✅ **Role Packs** - Use role packs in prompts
2. **Create Custom Commands (`/commands`)** - Standardize workflows
3. **Use Plan Mode for Refactors** - Safer, more predictable
4. ✅ **Optimize Indexing** - Use `.cursorindexingignore` for perf

**Medium Priority**:
5. **Use Background Agents** - Parallel task execution
6. **Set Up Bugbot** - Once PR flow is stable

**Low Priority**:
7. **Custom Commands** - Convenience only
8. **Keyboard Shortcuts** - Convenience only
9. **Voice Control** - Not essential
10. **Visual Context** - Limited use case

---

## General User Commands

Essential commands, aliases, and shortcuts for daily development work across all projects.

### Git Aliases

Add these to your `~/.gitconfig`:

```ini
[alias]
    # Shortcuts
    st = status
    co = checkout
    br = branch
    ci = commit
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = !gitk
    
    # Status & Info
    status-short = status -sb
    who = shortlog -sn
    graph = log --graph --oneline --all --decorate
    
    # Logging
    lg = log --color --graph --pretty=format:'%C(yellow)%h%Creset -%C(red)%d%Creset %s %C(green)(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit
    ll = log --pretty=format:'%C(yellow)%h%Creset %C(cyan)%ad%Creset %C(green)%an%Creset %C(red)%d%Creset %s' --date=short --decorate
    log1 = log --oneline -1
    log10 = log --oneline -10
    log20 = log --oneline -20
    
    # Branching
    new = checkout -b
    delete = branch -d
    delete-force = branch -D
    
    # Staging
    addp = add -p
    unstage = reset HEAD --
    discard = checkout --
    
    # Commits
    amend = commit --amend
    amend-no-edit = commit --amend --no-edit
    undo = reset --soft HEAD~1
    
    # Diff
    diffc = diff --cached
    diffw = diff --word-diff
    diffstat = diff --stat
    
    # Remote
    remotes = remote -v
    upstream = !git rev-parse --abbrev-ref --symbolic-full-name @{u}
    
    # Cleanup
    cleanup = !git branch --merged | grep -v '\\*\\|master\\|main\\|develop' | xargs -n 1 git branch -d
    prune-remote = remote prune origin
    
    # Useful combinations
    save = !git add -A && git commit -m 'SAVEPOINT'
    wip = !git add -u && git commit -m 'WIP'
    unwip = reset HEAD~1
    undo = reset --soft HEAD~1
    wipe = !git add -A && git commit -qm 'WIPE SAVEPOINT' && git reset HEAD~1 --hard
```

### Shell Aliases (Zsh)

Add these to your `~/.zshrc`:

```bash
# Navigation
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias ~='cd ~'
alias -- -='cd -'

# List with details
alias ll='ls -lah'
alias la='ls -A'
alias l='ls -CF'
alias ls='ls -G'  # macOS

# Find files
alias ff='find . -name'
alias ffi='find . -iname'

# Git shortcuts
alias g='git'
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias gd='git diff'
alias gb='git branch'
alias gco='git checkout'
alias glog='git log --oneline --graph --all --decorate'

# Development
alias ni='npm install'
alias ns='npm start'
alias nt='npm test'
alias nb='npm run build'
alias nd='npm run dev'

# Python
alias py='python3'
alias pip='pip3'
alias venv='python3 -m venv'
alias activate='source venv/bin/activate'

# Docker
alias d='docker'
alias dc='docker-compose'
alias dps='docker ps'
alias dpa='docker ps -a'
alias di='docker images'
alias dex='docker exec -it'
alias drm='docker rm'
alias drmi='docker rmi'

# Utilities
alias c='clear'
alias h='history'
alias hg='history | grep'
alias psg='ps aux | grep'
alias killg='killall -9'

# macOS
alias showfiles='defaults write com.apple.finder AppleShowAllFiles YES; killall Finder'
alias hidefiles='defaults write com.apple.finder AppleShowAllFiles NO; killall Finder'
alias lock='/System/Library/CoreServices/Menu\ Extras/User.menu/Contents/Resources/CGSession -suspend'
alias brewup='brew update && brew upgrade && brew cleanup'
```

### Shell Functions

Add these to your `~/.zshrc`:

```bash
# Git Helpers
gcm() {
    git add -A
    git commit -m "$1"
}

gcb() {
    git checkout -b "$1"
}

gpu() {
    git push -u origin "$(git branch --show-current)"
}

glogf() {
    git log --oneline --name-status "$@"
}

gfind() {
    git log --all --grep="$1"
}

# File Operations
mkcd() {
    mkdir -p "$1" && cd "$1"
}

extract() {
    if [ -f "$1" ]; then
        case "$1" in
            *.tar.bz2)   tar xjf "$1"     ;;
            *.tar.gz)    tar xzf "$1"     ;;
            *.bz2)       bunzip2 "$1"     ;;
            *.rar)       unrar x "$1"     ;;
            *.gz)        gunzip "$1"      ;;
            *.tar)       tar xf "$1"      ;;
            *.tbz2)      tar xjf "$1"     ;;
            *.tgz)       tar xzf "$1"     ;;
            *.zip)       unzip "$1"       ;;
            *.Z)         uncompress "$1"  ;;
            *.7z)        7z x "$1"       ;;
            *)           echo "'$1' cannot be extracted via extract()" ;;
        esac
    else
        echo "'$1' is not a valid file"
    fi
}

# Development Helpers
port() {
    lsof -i :"$1"
}

killport() {
    lsof -ti :"$1" | xargs kill -9
}

note() {
    local file="$HOME/notes/$(date +%Y-%m-%d).md"
    mkdir -p "$HOME/notes"
    echo "# $(date +'%Y-%m-%d %H:%M:%S')" >> "$file"
    echo "$@" >> "$file"
    echo "" >> "$file"
    $EDITOR "$file"
}
```

### User-Level Cursor Commands

Create `~/.cursor/commands/` for commands available across ALL projects:

#### `code_review.md`
```markdown
Review this code for:
- Functionality and edge cases
- Security issues (validation, paths, secrets)
- Performance optimizations
- Code quality and conventions
- Test coverage
- Documentation

Provide specific, actionable feedback.
```

#### `explain_code.md`
```markdown
Explain this code in detail:
- What it does
- How it works
- Why it's structured this way
- Potential issues or improvements
- Related patterns in the codebase
```

#### `refactor_code.md`
```markdown
Refactor this code to:
- Improve readability
- Follow project conventions
- Optimize performance
- Add proper error handling
- Improve type safety

Keep functionality identical, only improve structure.
```

#### `write_tests.md`
```markdown
Write comprehensive tests for this code:
- Success cases
- Error cases
- Edge cases (null, empty, boundaries)
- Invalid inputs
- Integration scenarios

Use project testing patterns and conventions.
```

#### `debug_issue.md`
```markdown
Help debug this issue:
- Analyze error messages
- Check common causes
- Suggest fixes
- Add logging if needed
- Test the solution
```

#### `optimize_performance.md`
```markdown
Optimize this code for performance:
- Identify bottlenecks
- Suggest improvements
- Add caching where appropriate
- Optimize algorithms
- Reduce unnecessary operations
```

#### `security_review.md`
```markdown
Review this code for security:
- Input validation
- Path traversal risks
- Command injection risks
- Secret exposure
- Permission checks
- Authentication/authorization

Provide specific recommendations.
```

---

## Command Overlaps

### Summary

There are **5 overlapping command pairs** between user-level (`~/.cursor/commands/`) and project-level (`.cursor/commands/`) commands:

1. ✅ **Exact filename match**: `add_docs.md` - **RESOLVED** (user-level removed)
2. 🔄 **Functional overlap**: `review_pr.md` ↔ `code_review.md`
3. 🔄 **Functional overlap**: `jules_test.md` ↔ `write_tests.md`
4. 🔄 **Functional overlap**: `safe_refactor.md` ↔ `refactor_code.md`
5. 🔄 **Functional overlap**: `security_audit.md` ↔ `security_review.md`

### How Cursor Handles Overlaps

**Project-level commands take precedence** over user-level commands when there's a filename match.

- If both `.cursor/commands/add_docs.md` and `~/.cursor/commands/add_docs.md` exist, Cursor uses the **project-level** one.
- For different filenames with similar purposes, both appear in the command list.

### Recommendations

**Keep both sets** - They serve different contexts:
- **Project commands**: More specific, project-aware, use project rules
- **User commands**: Generic, work across all projects, no project-specific references

**Use project commands** in this repo for best results.

**Use user commands** in other projects where project-specific ones don't exist.

---

## Quick Reference

### Most Used Commands

```bash
# Git
gst          # git status
gco -b new   # git checkout -b new
gcm "msg"    # git commit -m "msg"
gp           # git push
gl           # git pull
glog         # git log --oneline --graph

# Navigation
..           # cd ..
ll           # ls -lah
ff "name"    # find . -name "name"

# Development
ni           # npm install
ns           # npm start
nt           # npm test
nd           # npm run dev

# Utilities
c            # clear
h            # history
hg "term"    # history | grep "term"
```

### Cursor Commands

```bash
# Project commands (type / in Chat)
/impl_add_tool      # Add tool end-to-end
/review_pr          # Review code systematically
/jules_test         # Write comprehensive tests
/safe_refactor      # Create refactor plan
/perf_fix_spawn     # Fix spawn-based tests

# User commands (type / in Chat)
/code_review        # Generic code review
/explain_code       # Explain code in detail
/refactor_code      # Generic refactoring
/write_tests        # Generic test writing
/debug_issue        # Debug problems
/optimize_performance # Performance optimization
/security_review    # Generic security review
```

---

## Related Documentation

- `.cursor/rules/` - All MDC rules
- `.cursor/commands/` - Project-level commands
- `~/.cursor/commands/` - User-level commands
- `docs/GIT_WORKFLOW.md` - Git workflow guide
- `docs/TESTING.md` - Testing guide

---

## Next Steps

1. ✅ Create the recommended project commands
2. ✅ Test each command
3. ✅ Set up external documentation indexing
4. ✅ Use Plan Mode for large refactors
5. ✅ Use Background Agents for parallel tasks
6. ✅ Set up Bugbot (once PR flow is stable)

**Expected Impact**: 10-50x improvement in development speed for common tasks, better consistency through role-based prompts.

