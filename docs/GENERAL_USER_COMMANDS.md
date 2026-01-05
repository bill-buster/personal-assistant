# General User Commands & Aliases

Essential commands, aliases, and shortcuts for daily development work across all projects.

## Table of Contents

1. [Git Aliases](#git-aliases)
2. [Shell Aliases (Zsh)](#shell-aliases-zsh)
3. [Shell Functions](#shell-functions)
4. [Cursor User-Level Commands](#cursor-user-level-commands)
5. [macOS-Specific Commands](#macos-specific-commands)
6. [Quick Reference](#quick-reference)

---

## Git Aliases

Add these to your `~/.gitconfig`:

```bash
# View current aliases
git config --global --list | grep alias

# Add aliases (one at a time)
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'
```

### Essential Git Aliases

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

### Advanced Git Aliases

```ini
[alias]
    # Show what changed in a commit
    show = show --stat --pretty=fuller
    
    # Find commits by message
    find = !git log --all --grep="$1"
    
    # Show file history
    filelog = log --follow --
    
    # Show who changed a file
    blame-who = blame -w -M -C -C -C
    
    # Create a new branch from current
    new = checkout -b
    
    # Delete merged branches
    cleanup = !git branch --merged | grep -v '\\*\\|master\\|main\\|develop' | xargs -n 1 git branch -d
    
    # Show uncommitted changes
    changes = diff --name-status -r
    
    # Show what's in staging
    staged = diff --cached
    
    # Quick commit with message
    quick = !git add -A && git commit -m
    
    # Undo last commit (keep changes)
    undo = reset --soft HEAD~1
    
    # Undo last commit (discard changes)
    reset-hard = reset --hard HEAD~1
```

---

## Shell Aliases (Zsh)

Add these to your `~/.zshrc`:

### Navigation

```bash
# Quick directory navigation
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias ~='cd ~'
alias -- -='cd -'

# List with details
alias ll='ls -lah'
alias la='ls -A'
alias l='ls -CF'
alias ls='ls --color=auto'  # Linux
alias ls='ls -G'            # macOS

# Find files
alias ff='find . -name'
alias ffi='find . -iname'
```

### File Operations

```bash
# Safer operations
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

# Quick edits
alias e='$EDITOR'
alias v='vim'
alias n='nvim'

# View files
alias cat='bat'  # If you have bat installed
alias less='less -R'
alias more='less'
```

### Git Shortcuts

```bash
# Quick git
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
```

### Development

```bash
# Node/npm
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

# Process management
alias psg='ps aux | grep'
alias killg='killall -9'
```

### System Info

```bash
# Disk usage
alias du='du -h'
alias df='df -h'
alias dus='du -sh * | sort -h'

# Memory
alias meminfo='free -h'  # Linux
alias meminfo='vm_stat'  # macOS

# Network
alias ping='ping -c 5'
alias ports='netstat -tulanp'  # Linux
alias ports='lsof -i -P -n | grep LISTEN'  # macOS
```

### Utilities

```bash
# Quick operations
alias c='clear'
alias h='history'
alias hg='history | grep'
alias path='echo $PATH | tr ":" "\n"'

# Time
alias now='date +"%T"'
alias nowdate='date +"%Y-%m-%d"'

# Weather (if you have curl)
alias weather='curl wttr.in'
```

---

## Shell Functions

More powerful than aliases - add to `~/.zshrc`:

### Git Helpers

```bash
# Quick commit with message
gcm() {
    git add -A
    git commit -m "$1"
}

# Create branch and switch
gcb() {
    git checkout -b "$1"
}

# Push current branch
gpu() {
    git push -u origin "$(git branch --show-current)"
}

# Show git log with file changes
glogf() {
    git log --oneline --name-status "$@"
}

# Find in git history
gfind() {
    git log --all --grep="$1"
}
```

### File Operations

```bash
# Create directory and cd into it
mkcd() {
    mkdir -p "$1" && cd "$1"
}

# Extract any archive
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

# Find and delete
findrm() {
    find . -name "$1" -type f -delete
}

# Quick backup
backup() {
    cp "$1" "${1}.backup"
}
```

### Development Helpers

```bash
# Create new project directory
newproj() {
    mkdir -p "$1" && cd "$1" && git init
}

# Quick server
serve() {
    local port="${1:-8000}"
    python3 -m http.server "$port"
}

# Find process using port
port() {
    lsof -i :"$1"
}

# Kill process on port
killport() {
    lsof -ti :"$1" | xargs kill -9
}

# Quick note
note() {
    local file="$HOME/notes/$(date +%Y-%m-%d).md"
    mkdir -p "$HOME/notes"
    echo "# $(date +'%Y-%m-%d %H:%M:%S')" >> "$file"
    echo "$@" >> "$file"
    echo "" >> "$file"
    $EDITOR "$file"
}
```

### System Helpers

```bash
# Quick search
grepf() {
    grep -r "$1" . --color=always
}

# Directory size
dsize() {
    du -sh "$1" 2>/dev/null || du -sh .
}

# Top processes by CPU
topcpu() {
    ps aux | sort -rk 3,3 | head -n 11
}

# Top processes by memory
topmem() {
    ps aux | sort -rk 4,4 | head -n 11
}

# Weather
weather() {
    curl -s "wttr.in/$1?format=3"
}
```

---

## Cursor User-Level Commands

Create `~/.cursor/commands/` for commands available across ALL projects:

### 1. `code_review.md`

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

### 2. `explain_code.md`

```markdown
Explain this code in detail:
- What it does
- How it works
- Why it's structured this way
- Potential issues or improvements
- Related patterns in the codebase
```

### 3. `refactor_code.md`

```markdown
Refactor this code to:
- Improve readability
- Follow project conventions
- Optimize performance
- Add proper error handling
- Improve type safety

Keep functionality identical, only improve structure.
```

### 4. `write_tests.md`

```markdown
Write comprehensive tests for this code:
- Success cases
- Error cases
- Edge cases (null, empty, boundaries)
- Invalid inputs
- Integration scenarios

Use project testing patterns and conventions.
```

### 5. `add_docs.md`

```markdown
Add documentation for this code:
- JSDoc/TSDoc comments for functions
- README updates if needed
- Usage examples
- Parameter descriptions
- Return value descriptions
```

### 6. `debug_issue.md`

```markdown
Help debug this issue:
- Analyze error messages
- Check common causes
- Suggest fixes
- Add logging if needed
- Test the solution
```

### 7. `optimize_performance.md`

```markdown
Optimize this code for performance:
- Identify bottlenecks
- Suggest improvements
- Add caching where appropriate
- Optimize algorithms
- Reduce unnecessary operations
```

### 8. `security_review.md`

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

## macOS-Specific Commands

### System

```bash
# Show/hide hidden files
alias showfiles='defaults write com.apple.finder AppleShowAllFiles YES; killall Finder'
alias hidefiles='defaults write com.apple.finder AppleShowAllFiles NO; killall Finder'

# Lock screen
alias lock='/System/Library/CoreServices/Menu\ Extras/User.menu/Contents/Resources/CGSession -suspend'

# Empty trash
alias emptytrash='rm -rf ~/.Trash/*'

# Quick look
alias ql='qlmanage -p'

# Copy public IP
alias myip='curl -s https://api.ipify.org'

# Copy local IP
alias localip='ipconfig getifaddr en0'
```

### Homebrew

```bash
alias brewup='brew update && brew upgrade && brew cleanup'
alias brewdeps='brew deps --installed --tree'
alias brewleaves='brew leaves'
```

### Xcode

```bash
alias xcode='open -a Xcode'
alias sim='open -a Simulator'
```

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

### Setup Script

Save this as `setup-aliases.sh` and run it:

```bash
#!/bin/bash

# Git aliases
echo "Setting up git aliases..."
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.lg 'log --color --graph --pretty=format:"%C(yellow)%h%Creset -%C(red)%d%Creset %s %C(green)(%cr) %C(bold blue)<%an>%Creset" --abbrev-commit'

# Add to .zshrc
echo "Adding aliases to ~/.zshrc..."
cat >> ~/.zshrc << 'EOF'

# === Custom Aliases ===
alias ..='cd ..'
alias ...='cd ../..'
alias ll='ls -lah'
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
alias c='clear'
alias h='history'
alias hg='history | grep'
EOF

echo "Done! Restart your terminal or run: source ~/.zshrc"
```

---

## Tips

1. **Start Small**: Add a few aliases at a time, get used to them
2. **Be Consistent**: Use the same aliases across projects
3. **Document**: Keep a cheat sheet (this file!)
4. **Test**: Make sure aliases don't conflict with existing commands
5. **Version Control**: Consider versioning your dotfiles

## Related

- [Cursor Custom Commands Setup](./CURSOR_CUSTOM_COMMANDS_SETUP.md) - Project-specific commands
- [Cursor Optimization Guide](./CURSOR_OPTIMIZATION_GUIDE.md) - Cursor-specific optimizations

