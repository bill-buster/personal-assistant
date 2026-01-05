# MDC Rules Portability Guide

## Overview

This document explains whether and how Cursor's MDC (Markdown Configuration) rules can be used with other AI coding assistants like Gemini Kodex, Cursor Cloud, Antigravity, and other platforms.

## What Are MDC Rules?

MDC rules are Markdown files with YAML frontmatter that define:

- **Project conventions** (coding standards, architecture patterns)
- **Tool usage patterns** (how to implement features)
- **Error handling** (error codes and patterns)
- **Testing policies** (when and how to test)
- **Security patterns** (permission enforcement)
- **Documentation requirements**

Format example:

```markdown
---
description: Brief description
globs: ['src/**/*.ts']
alwaysApply: true
---

# Rule Content

Markdown content with code examples, patterns, and guidelines.
```

## Platform Compatibility

### ✅ Cursor (Desktop & Cloud)

**Status**: Native support

- **Directory**: `.cursor/rules/`
- **Format**: `.mdc` files with YAML frontmatter
- **Activation**:
    - `alwaysApply: true` - Always included in context
    - `globs: ["pattern"]` - Applied when matching files are open
    - Manual reference via `@rules/filename`

**Current Rules in This Project**:

- `core.mdc` - Core conventions (always applied)
- `agents.mdc` - Agent patterns
- `tools.mdc` - Tool implementation patterns
- `testing.mdc` - Test writing patterns
- `errors.mdc` - Error handling patterns
- And 13 more specialized rules

### 🔄 Google Antigravity

**Status**: Adaptable (similar concept, different format)

**Antigravity's Rule System**:

- **Directory**: `.agent/rules/` (instead of `.cursor/rules/`)
- **Format**: Markdown files (similar structure)
- **Activation**: Automatic, file-based, or manual invocation
- **Architecture**: Agent-first with multi-surface support

**How to Adapt**:

1. Copy `.cursor/rules/*.mdc` to `.agent/rules/`
2. Convert YAML frontmatter to Antigravity's format (if needed)
3. Test rule activation and context inclusion

**Benefits**:

- ✅ Consistent coding standards across platforms
- ✅ Same architectural patterns
- ✅ Unified error handling
- ✅ Shared testing policies

**Limitations**:

- May need format adjustments for frontmatter
- Activation mechanisms may differ
- Some Cursor-specific features won't apply

### 🔄 Gemini Kodex

**Status**: Potentially compatible (format may need adjustment)

**Research Findings**:

- Gemini Kodex supports custom configurations
- Markdown-based rule systems are common
- Directory structure may differ

**How to Adapt**:

1. Create `.gemini/` or `.kodex/rules/` directory
2. Copy MDC files (may need frontmatter conversion)
3. Verify rule recognition and context inclusion

**Recommendation**: Test with a single rule first (e.g., `core.mdc`) to verify compatibility.

### 🔄 Other AI Coding Assistants

**Status**: Format is portable, implementation varies

**Common Patterns**:

- Most modern AI assistants support markdown-based rules
- YAML frontmatter is widely recognized
- Directory conventions vary by platform

**Platforms to Test**:

- **GitHub Copilot**: Uses `.github/copilot/` directory
- **Codeium**: May support similar rule formats
- **Tabnine**: Custom configuration files
- **Sourcegraph Cody**: `.cody/` directory

## Benefits of Using MDC Rules Across Platforms

### 1. Consistency

**Problem**: Different AI assistants may suggest different patterns for the same task.

**Solution**: Shared MDC rules ensure:

- Same coding conventions across all platforms
- Consistent error handling patterns
- Unified testing approaches
- Standardized documentation requirements

**Example**:

```markdown
# In core.mdc (shared across platforms)

## Import Conventions

1. Node built-ins with 'node:' prefix
2. External packages
3. Internal imports (relative paths only)
```

### 2. Knowledge Transfer

**Problem**: Project-specific patterns need to be re-learned for each platform.

**Solution**: MDC rules document:

- Architecture decisions
- Design patterns
- Tool usage guidelines
- Security constraints

**Example**:

```markdown
# In tools.mdc (shared)

## Tool Handler Pattern

- Always return ToolResult
- Use makeError() for errors
- Include debug info
```

### 3. Quality Improvement

**Problem**: Without rules, AI assistants may:

- Suggest inconsistent patterns
- Miss project-specific constraints
- Ignore security requirements
- Skip documentation

**Solution**: MDC rules enforce:

- Code quality standards
- Security patterns
- Documentation requirements
- Testing policies

### 4. Reduced Context Switching

**Problem**: Switching between platforms requires re-explaining project structure.

**Solution**: MDC rules provide:

- Persistent context
- Self-documenting patterns
- Reusable guidelines

## How to Port MDC Rules

### Step 1: Identify Target Platform

Determine:

- Directory structure (`.cursor/`, `.agent/`, `.gemini/`, etc.)
- File format requirements
- Activation mechanisms
- Frontmatter support

### Step 2: Copy and Adapt

```bash
# Example: Porting to Antigravity
mkdir -p .agent/rules
cp .cursor/rules/*.mdc .agent/rules/

# Review and adjust frontmatter if needed
```

### Step 3: Test Rule Activation

1. **Start with one rule**: Test `core.mdc` first
2. **Verify context inclusion**: Check if rules appear in AI context
3. **Test behavior**: Ask AI to follow a rule pattern
4. **Expand gradually**: Add more rules as compatibility is confirmed

### Step 4: Platform-Specific Adjustments

**May Need Changes**:

- YAML frontmatter format
- Directory paths in examples
- Platform-specific tool names
- Activation triggers

**Example Adaptation**:

```markdown
# Original (Cursor)

---

globs: ["src/**/*.ts"]
alwaysApply: false

---

# Adapted (Antigravity)

---

patterns: ["src/**/*.ts"]
autoApply: false

---
```

## Recommended Rules to Port

### High Priority (Universal Value)

1. **`core.mdc`** - Architecture and conventions
    - Import patterns
    - Type definitions
    - Code style
    - File naming

2. **`errors.mdc`** - Error handling patterns
    - Error codes
    - Error structure
    - Error propagation

3. **`testing.mdc`** - Testing patterns
    - Test structure
    - Test naming
    - Test organization

4. **`security.mdc`** - Security patterns
    - Permission checks
    - Path validation
    - Command sanitization

### Medium Priority (Project-Specific)

5. **`tools.mdc`** - Tool implementation
6. **`routing.mdc`** - Intent routing
7. **`storage.mdc`** - Data persistence
8. **`git.mdc`** - Git workflows

### Low Priority (Platform-Specific)

9. **`test_policy.mdc`** - When to run tests (may need platform-specific logic)
10. **`providers.mdc`** - LLM provider patterns (if applicable)

## Platform-Specific Considerations

### Antigravity

**Strengths**:

- Agent-first architecture aligns with rule-based guidance
- Multi-surface support (editor, terminal, browser)
- Supports multiple AI models (Gemini, Claude, GPT)

**Adaptation Notes**:

- Rules may need agent-specific sections
- Consider multi-agent collaboration patterns
- Test with different model backends

### Gemini Kodex

**Strengths**:

- Google's Gemini models
- Strong code understanding
- Integration with Google ecosystem

**Adaptation Notes**:

- Verify markdown parsing
- Test YAML frontmatter support
- Check context window limits

### Cursor Cloud

**Strengths**:

- Same format as desktop Cursor
- Cloud-based collaboration
- Shared rule repositories

**Adaptation Notes**:

- Rules should work without changes
- Consider team-wide rule sharing
- Version control for rules

## Testing Rule Portability

### Test Checklist

- [ ] Rules are recognized by target platform
- [ ] Rules appear in AI context when relevant
- [ ] AI follows rule patterns correctly
- [ ] File globs/patterns work as expected
- [ ] Always-apply rules are included
- [ ] Code examples render correctly
- [ ] Cross-references between rules work

### Test Commands

```bash
# Test rule recognition
# Ask AI: "What are the import conventions for this project?"

# Test rule application
# Ask AI: "Add a new tool following the project patterns"

# Test rule consistency
# Compare AI suggestions across platforms
```

## Limitations and Challenges

### Format Differences

**Challenge**: Different platforms may use different frontmatter formats.

**Solution**: Create platform-specific versions or use a converter script.

### Activation Mechanisms

**Challenge**: Rules may activate differently (always, file-based, manual).

**Solution**: Document platform-specific activation in rule comments.

### Context Window Limits

**Challenge**: Too many rules may exceed context limits.

**Solution**:

- Use `alwaysApply: false` for most rules
- Apply rules selectively via globs
- Prioritize essential rules

### Platform-Specific Features

**Challenge**: Some rules reference Cursor-specific features.

**Solution**:

- Make rules platform-agnostic where possible
- Use conditional sections for platform-specific content
- Document platform requirements

## Best Practices

### 1. Keep Rules Platform-Agnostic

```markdown
# ✅ Good: Platform-agnostic

## Import Conventions

Use 'node:' prefix for Node.js built-ins.

# ❌ Bad: Platform-specific

## Cursor Import Conventions

Use 'node:' prefix (Cursor feature).
```

### 2. Document Platform Requirements

```markdown
---
description: Core conventions
platforms: [cursor, antigravity, kodex]
notes: 'May need frontmatter adjustment for Antigravity'
---
```

### 3. Version Control Rules

```bash
# Rules should be in git
git add .cursor/rules/
git commit -m "Add MDC rules for project conventions"
```

### 4. Test Across Platforms

Regularly test rules on:

- Primary platform (Cursor)
- Secondary platforms (Antigravity, etc.)
- Verify consistency

### 5. Update Rules Together

When updating rules:

- Update all platform copies
- Test on each platform
- Document any platform-specific changes

## Conclusion

**Yes, MDC rules can improve functionality across different AI coding assistants**, but:

1. **Format is portable**: Markdown with YAML frontmatter is widely supported
2. **Adaptation may be needed**: Directory structure and activation vary
3. **Benefits are significant**: Consistency, quality, and knowledge transfer
4. **Start small**: Test with one rule, expand gradually

**Recommended Approach**:

1. Start with `core.mdc` (highest value)
2. Test on target platform
3. Adapt format if needed
4. Gradually port more rules
5. Maintain platform-specific copies if necessary

**Expected Improvements**:

- ✅ More consistent code suggestions
- ✅ Better adherence to project patterns
- ✅ Reduced need to re-explain conventions
- ✅ Higher code quality across platforms
- ✅ Faster onboarding for new team members

## Related Documentation

- [Cursor Rules Documentation](https://cursor.sh/docs)
- [Antigravity Documentation](https://antigravity.im/documentation)
- Project-specific rules in `.cursor/rules/`

## Questions or Issues?

If you encounter issues porting rules:

1. Check platform documentation for rule format
2. Test with minimal rule first
3. Verify context inclusion
4. Document platform-specific requirements
