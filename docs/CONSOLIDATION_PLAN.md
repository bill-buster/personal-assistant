**Status**: Reference-only  
**Canonical**: [docs/INDEX.md](INDEX.md) for current documentation structure

---

# Documentation Consolidation Plan

**Goal**: Reduce from 36 files to ~10-12 comprehensive files. LLMs can process long documents easily.

*This document is kept for historical reference. Current documentation organization is in [docs/INDEX.md](INDEX.md).*

## Consolidation Strategy

### Merge These Groups:

1. **All Cursor docs** (7 files) → `CURSOR_SETUP.md`
   - CURSOR_OPTIMIZATION_GUIDE.md
   - CURSOR_CUSTOM_COMMANDS_SETUP.md
   - CURSOR_COMMANDS_CONTEXT.md
   - CURSOR_INDEX_EXTERNAL_DOCS.md
   - CURSOR_INDEX_TROUBLESHOOTING.md
   - COMMAND_OVERLAP_ANALYSIS.md
   - GENERAL_USER_COMMANDS.md

2. **All Testing docs** (3 files) → `TESTING.md`
   - TESTING_STRATEGY.md
   - TESTING_COMPLETE.md
   - COVERAGE_IMPROVEMENT_PLAN.md

3. **All Git docs** (5 files) → `GIT.md`
   - GIT_WORKFLOW.md
   - QUICK_GIT_GUIDE.md
   - AUTOMATED_GIT_HOOKS.md
   - BRANCHING_STRATEGY.md
   - SETUP_REMOTE_REPO.md

4. **Code Review docs** (2 files) → `CODE_REVIEW.md`
   - CODE_REVIEW_BEST_PRACTICES.md
   - QUICK_REVIEW_GUIDE.md

5. **Security** (1 file) → `SECURITY.md`
   - SECURITY_FIXES.md (rename/expand)

### Keep As-Is:
- QUICKSTART.md
- README.md (root)
- COMMANDS.md
- WORKFLOW.md
- CONFIGURATION.md
- PLUGINS.md
- DOCKER.md
- CACHING.md
- DECISIONS.md
- MDC_RULES_PORTABILITY.md (specialized)

### Remove/Archive:
- All status/summary docs (10X_IMPROVEMENTS, STATUS_SUMMARY, TASK_LOG, etc.)
- All cleanup/analysis docs (CLEANUP_SUMMARY, DOCUMENTATION_CLEANUP_PLAN, etc.)
- Specialized optimization (ANTIGRAVITY, PARALLEL_TESTS - merge into main docs)
- STACK_DECISION.md (merge into DECISIONS.md)
- CONTINUOUS_IMPROVEMENT.md (merge into WORKFLOW.md)
- DOCUMENTATION_CHECKLIST.md (merge into WORKFLOW.md)

## Final Structure (12 files)

1. START_HERE.md - Navigation guide
2. README.md (root) - Project overview
3. QUICKSTART.md - Quick setup
4. COMMANDS.md - CLI commands
5. WORKFLOW.md - Daily workflow
6. CONFIGURATION.md - Configuration
7. **CURSOR_SETUP.md** - All Cursor (NEW - consolidated)
8. **TESTING.md** - All testing (NEW - consolidated)
9. **GIT.md** - All git (NEW - consolidated)
10. **CODE_REVIEW.md** - All code review (NEW - consolidated)
11. **SECURITY.md** - Security (NEW - renamed/expanded)
12. PLUGINS.md, DOCKER.md, CACHING.md, DECISIONS.md, MDC_RULES_PORTABILITY.md

## Benefits

- **60% fewer files** (36 → ~12)
- **All related info together** (better for LLMs)
- **Easier navigation** (fewer choices)
- **No information loss** (everything merged)

## Next Steps

Should I proceed with creating the consolidated files?

