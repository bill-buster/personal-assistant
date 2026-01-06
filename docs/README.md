# Documentation Index

> **⚠️ This file is deprecated. See [INDEX.md](INDEX.md) for the current documentation index.**

This directory contains all project documentation. Use [INDEX.md](INDEX.md) to find what you need.

---

**Status**: Deprecated  
**Canonical**: [docs/INDEX.md](INDEX.md)

---

*The content below is kept for reference but may be outdated. Please use [INDEX.md](INDEX.md) instead.*

## 🚀 Getting Started

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [QUICKSTART.md](QUICKSTART.md) | Quick setup and first steps | First time setup |
| [README.md](../README.md) | Main project overview | Start here |
| [COMMANDS.md](COMMANDS.md) | All CLI commands reference | Using the CLI |
| [CONFIGURATION.md](CONFIGURATION.md) | Configuration options | Setting up config |

## 🎯 Cursor IDE Setup

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [CURSOR_OPTIMIZATION_GUIDE.md](CURSOR_OPTIMIZATION_GUIDE.md) | Complete Cursor setup guide | Setting up Cursor |
| [CURSOR_CUSTOM_COMMANDS_SETUP.md](CURSOR_CUSTOM_COMMANDS_SETUP.md) | How to create custom commands | Creating `/` commands |
| [CURSOR_COMMANDS_CONTEXT.md](CURSOR_COMMANDS_CONTEXT.md) | How commands access code context | Understanding commands |
| [CURSOR_INDEX_EXTERNAL_DOCS.md](CURSOR_INDEX_EXTERNAL_DOCS.md) | External docs indexing | Indexing external docs |
| [CURSOR_INDEX_TROUBLESHOOTING.md](CURSOR_INDEX_TROUBLESHOOTING.md) | Troubleshooting Cursor issues | Fixing Cursor problems |
| [COMMAND_OVERLAP_ANALYSIS.md](COMMAND_OVERLAP_ANALYSIS.md) | User vs project command overlaps | Understanding command conflicts |
| [GENERAL_USER_COMMANDS.md](GENERAL_USER_COMMANDS.md) | General aliases and commands | Setting up shell/git aliases |

## 🔧 Development

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [WORKFLOW.md](WORKFLOW.md) | Development workflow | Daily development |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Testing approach | Writing tests |
| [TESTING_COMPLETE.md](TESTING_COMPLETE.md) | Test implementation status | Checking test coverage |
| [COVERAGE_IMPROVEMENT_PLAN.md](COVERAGE_IMPROVEMENT_PLAN.md) | Test coverage plan | Improving coverage |
| [CODE_REVIEW_BEST_PRACTICES.md](CODE_REVIEW_BEST_PRACTICES.md) | Code review guidelines | Reviewing code |
| [QUICK_REVIEW_GUIDE.md](QUICK_REVIEW_GUIDE.md) | Quick review checklist | Quick code review |

## 🚢 Git & Version Control

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Git workflow, setup, and conventions | Using git |
| [QUICK_GIT_GUIDE.md](QUICK_GIT_GUIDE.md) | Quick git reference | Git quick reference |
| [AUTOMATED_GIT_HOOKS.md](AUTOMATED_GIT_HOOKS.md) | Git hooks setup and automation | Setting up hooks |
| [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) | Branching conventions | Creating branches |
| [SETUP_REMOTE_REPO.md](SETUP_REMOTE_REPO.md) | Remote repository setup | Setting up remote |

## 🏗️ Architecture & Decisions

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [DECISIONS.md](DECISIONS.md) | Architecture decisions | Understanding design |
| [STACK_DECISION.md](STACK_DECISION.md) | Technology stack choices | Why these technologies |
| [MDC_RULES_PORTABILITY.md](MDC_RULES_PORTABILITY.md) | MDC rules portability | Porting rules to other projects |

## ⚡ Performance & Optimization

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [CACHING.md](CACHING.md) | Caching strategies | Understanding caching |
| [ANTIGRAVITY_OPTIMIZATION_GUIDE.md](ANTIGRAVITY_OPTIMIZATION_GUIDE.md) | Antigravity optimization | Optimizing with Antigravity |
| [PARALLEL_TESTS.md](PARALLEL_TESTS.md) | Parallel test execution | Running tests in parallel |

## 🔒 Security

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [SECURITY_FIXES.md](SECURITY_FIXES.md) | Security fixes and improvements | Security updates |

## 🐳 Docker

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [DOCKER.md](DOCKER.md) | Docker setup and usage | Using Docker |

## 📦 Plugins & Extensions

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [PLUGINS.md](PLUGINS.md) | Plugin system | Creating/using plugins |

## 📊 Status & Summaries

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [TASK_LOG.md](TASK_LOG.md) | Task tracking | Tracking tasks |
| [STATUS_SUMMARY.md](docs/STATUS_SUMMARY.md) | Project status | Current state |
| [STATUS_SUMMARY.md](STATUS_SUMMARY.md) | Project status overview | Current project state |


## 📋 Checklists

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [DOCUMENTATION_CHECKLIST.md](DOCUMENTATION_CHECKLIST.md) | Documentation checklist | Ensuring docs are complete |
| [CONTINUOUS_IMPROVEMENT.md](CONTINUOUS_IMPROVEMENT.md) | Continuous improvement plan | Ongoing improvements |

## 🗂️ Organization Notes

### Cleanup Completed (2025-01-05)

**Removed redundant/historical files**:
- `GIT_SETUP_SUMMARY.md` → Merged into `GIT_WORKFLOW.md`
- `GIT_AUTOMATION_SUMMARY.md` → Merged into `AUTOMATED_GIT_HOOKS.md`
- `COMMIT_STATUS.md` - Historical commit tracking (outdated)
- `REVIEW_SUMMARY.md` - Historical review snapshot (outdated)
- `TESTING_SUMMARY.md` - Redundant with `TESTING_COMPLETE.md`
- `100X_IMPLEMENTATION_SUMMARY.md` - Redundant with `STATUS_SUMMARY.md`
- `TESTING_100X_FEATURES.md` - Redundant with `TESTING_COMPLETE.md`
- `TEST_GENERATION_FIX.md` - Historical fix documentation
- `TEST_GENERATION_MULTIPLE_HANDLERS.md` - Historical implementation detail

**Result**: Reduced from 44 to 35 documentation files, eliminated redundancy

### Essential Documents (Must Read)

1. **README.md** (project root) - Start here
2. **QUICKSTART.md** - Get started quickly
3. **COMMANDS.md** - All available commands
4. **CURSOR_OPTIMIZATION_GUIDE.md** - Cursor setup
5. **WORKFLOW.md** - Daily workflow

### Maintenance Needed

- Some summary documents may be outdated
- Test coverage documents need periodic updates
- Status documents should be refreshed regularly

## Quick Links by Task

### "I want to..."

- **...get started**: [QUICKSTART.md](QUICKSTART.md) → [README.md](../README.md)
- **...set up Cursor**: [CURSOR_OPTIMIZATION_GUIDE.md](CURSOR_OPTIMIZATION_GUIDE.md)
- **...use the CLI**: [COMMANDS.md](COMMANDS.md)
- **...write tests**: [TESTING_STRATEGY.md](TESTING_STRATEGY.md)
- **...review code**: [CODE_REVIEW_BEST_PRACTICES.md](CODE_REVIEW_BEST_PRACTICES.md)
- **...understand architecture**: [DECISIONS.md](DECISIONS.md)
- **...set up git**: [GIT_WORKFLOW.md](GIT_WORKFLOW.md)
- **...optimize performance**: [CACHING.md](CACHING.md)
- **...create a plugin**: [PLUGINS.md](PLUGINS.md)
- **...use Docker**: [DOCKER.md](DOCKER.md)

## Contributing

When adding new documentation:

1. Add it to this index
2. Follow the naming convention: `UPPERCASE_WITH_UNDERSCORES.md`
3. Update relevant sections
4. Add to appropriate "Quick Links" section

