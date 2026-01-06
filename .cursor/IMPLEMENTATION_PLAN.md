# Implementation Plan: Command Chaining & Workflow Improvements

**Based on**: `CODEBASE_EVALUATION.md`  
**Priority**: High  
**Timeline**: 1-2 weeks

---

## Phase 1: Core Composite Commands (Week 1)

### 1.1 Create `/implement_and_review_tool` Command

**File**: `.cursor/commands/implement_and_review_tool.md`

**Purpose**: Single command that chains tool implementation → testing → review → commit

**Steps**:
1. Implement tool (reuse `impl_add_tool` logic, steps 1-7)
2. Run comprehensive tests (`jules_test` logic)
3. Run code review (`review_pr` logic)
4. Fix issues if any
5. Re-run quality checks
6. Commit if all pass
7. Post-commit review

**Estimated Impact**: Saves 3-4 manual steps per tool implementation

**Dependencies**: None (uses existing patterns)

### 1.2 Create `/help` Command

**File**: `.cursor/commands/help.md`

**Purpose**: Discover available commands and workflows

**Content**:
- List all commands with descriptions
- Show command dependencies
- Display usage examples
- Link to related commands

**Estimated Impact**: Improves discoverability, reduces learning curve

**Dependencies**: None

### 1.3 Create `workflow.mdc` Rule

**File**: `.cursor/rules/workflow.mdc`

**Purpose**: Document command chaining and workflow patterns

**Content**:
- Composite command structure
- Command chaining patterns
- State management across commands
- Error recovery patterns
- Quality gate integration

**Estimated Impact**: Guides future command creation

**Dependencies**: None

---

## Phase 2: Enhanced Workflows (Week 2)

### 2.1 Create `/fix_all_issues` Composite Command

**File**: `.cursor/commands/fix_all_issues.md`

**Purpose**: Batch fix common issues (todos + errors + docs + types)

**Steps**:
1. Find all issues (todos, throws, missing docs, any types)
2. Fix todos (`fix_todos` logic)
3. Fix errors (`fix_errors` logic)
4. Add docs (`add_docs` logic)
5. Improve types (`type_safety` logic)
6. Review changes
7. Commit if all pass

**Estimated Impact**: Saves time on cleanup tasks

**Dependencies**: Existing fix commands

### 2.2 Add Error Recovery Patterns

**File**: `.cursor/rules/error_recovery.mdc`

**Purpose**: Document retry, rollback, and recovery patterns

**Content**:
- Retry with backoff pattern
- Rollback on critical failure
- Partial success handling
- State recovery

**Estimated Impact**: More robust commands, less manual intervention

**Dependencies**: None

### 2.3 Enhance Command Documentation

**Updates**:
- Add "Related Commands" section to each command
- Add "Can be chained with" notes
- Update README with composite command examples

**Estimated Impact**: Better discoverability of command relationships

**Dependencies**: Phase 1 commands

---

## Implementation Details

### Composite Command Template

```markdown
You are the [Role]. Follow role.[role].mdc first, then project rules.

## Composite Command: [Name]

**Purpose**: [Clear description]

**This command chains**:
1. [Command 1] - [What it does]
2. [Command 2] - [What it does]
3. [Command 3] - [What it does]

**Steps**:

1. **[STEP 1/N]** Log: "[Description]..."
   - Execute [Command 1] logic
   - Validate result
   - Log: "Complete: [result]"
   - If error: handle or abort

2. **[STEP 2/N]** Log: "[Description]..."
   - Execute [Command 2] logic
   - Validate result
   - Log: "Complete: [result]"
   - If error: handle or abort

3. **[STEP N/N]** Log: "Finalizing..."
   - Stage files
   - Run preflight
   - Commit if all pass
   - Post-commit review

**Exit Conditions**:
- All steps complete successfully
- Critical error encountered
- User explicitly cancels

**Quality Gates**:
- [Gate 1]: [Threshold]
- [Gate 2]: [Threshold]
- [Gate 3]: [Threshold]
```

### State Management Pattern

**For sharing state between steps**:
- Use external files (like checklist pattern)
- Use `todo_write` for progress tracking
- Use environment variables for simple state
- Use JSON files for complex state

### Error Recovery Pattern

```markdown
## Error Handling

**Retry Logic**:
- Max retries: 3
- Backoff: exponential (1s, 2s, 4s)
- Retry only on retryable errors

**Rollback**:
- On critical failure: revert changes
- Save state before changes
- Restore state on failure

**Partial Success**:
- Continue if non-critical errors
- Log all errors
- Report partial success
```

---

## Testing Strategy

### For Each Composite Command

1. **Test Success Path**: All steps complete successfully
2. **Test Error Path**: Handle errors at each step
3. **Test Partial Success**: Some steps succeed, some fail
4. **Test Rollback**: Verify state recovery on failure
5. **Test Quality Gates**: Verify gates block when needed

---

## Success Metrics

### Quantitative
- **Time Saved**: Measure time per workflow before/after
- **Error Rate**: Track failures and manual interventions
- **Command Usage**: Track which commands are used most

### Qualitative
- **User Feedback**: Are workflows easier?
- **Discoverability**: Can users find commands?
- **Reliability**: Do commands work consistently?

---

## Rollout Plan

### Week 1: Core Commands
- Day 1-2: Create `/implement_and_review_tool`
- Day 3: Create `/help`
- Day 4: Create `workflow.mdc`
- Day 5: Test and refine

### Week 2: Enhanced Workflows
- Day 1-2: Create `/fix_all_issues`
- Day 3: Add error recovery patterns
- Day 4: Enhance documentation
- Day 5: Test and refine

### Week 3: Polish
- Gather feedback
- Fix issues
- Update documentation
- Create examples

---

## Risk Mitigation

### Risks
1. **Complexity**: Composite commands may be too complex
   - **Mitigation**: Start simple, add complexity incrementally
   - **Fallback**: Keep individual commands available

2. **State Management**: Sharing state may be error-prone
   - **Mitigation**: Use simple file-based state (proven pattern)
   - **Fallback**: Manual state management if needed

3. **Error Recovery**: Rollback may not work perfectly
   - **Mitigation**: Test thoroughly, use git for rollback
   - **Fallback**: Manual rollback instructions

4. **User Adoption**: Users may not use composite commands
   - **Mitigation**: Make them discoverable via `/help`
   - **Fallback**: Individual commands still work

---

## Next Steps

1. ✅ Review this plan
2. ✅ Create `/implement_and_review_tool` command
3. ✅ Test with real tool implementation
4. ✅ Gather feedback
5. ✅ Iterate and improve

---

**Status**: 📋 Planned  
**Owner**: TBD  
**Timeline**: 1-2 weeks  
**Priority**: High

