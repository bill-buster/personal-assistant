# How Cursor Commands Access Selected Code

## Short Answer

**Cursor automatically injects context** when you use a command. The command file itself is just a prompt template - Cursor handles all the context injection behind the scenes.

## How It Works

### 1. Command Files Are Just Prompts

Your command files (like `refactor_code.md`) are **plain markdown prompts**. They don't contain special syntax to access code - they're just instructions.

**Example**: `~/.cursor/commands/refactor_code.md`
```markdown
Refactor this code to:
- Improve readability
- Follow project conventions
- Optimize performance
- Add proper error handling
- Improve type safety

Keep functionality identical, only improve structure.
```

Notice: **No special syntax** to access selected code. It's just a prompt.

### 2. Cursor Automatically Injects Context

When you use a command (e.g., `/refactor_code`), Cursor **automatically includes**:

1. **Selected code** (if any text is selected)
2. **Current file** (the file you're viewing)
3. **Open files** (other tabs you have open)
4. **Cursor position** (where your cursor is in the file)
5. **Project context** (relevant files, rules, etc.)

This happens **automatically** - you don't need to do anything special in your command file.

### 3. How to Use It

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

## What Gets Included Automatically

Cursor's context injection includes:

### Always Included
- ✅ Selected text (if any)
- ✅ Current file (file you're viewing)
- ✅ Cursor position
- ✅ Project rules (`.cursor/rules/*.mdc`)
- ✅ Project commands (`.cursor/commands/*.md`)

### Conditionally Included
- ✅ Open files (if relevant to the command)
- ✅ Related files (if Cursor detects relationships)
- ✅ Recent changes (if relevant)
- ✅ Error messages (if any in the file)

## Writing Effective Commands

### ✅ Good: Assume Context is Available

```markdown
Review this code for:
- Functionality and edge cases
- Security issues
- Performance optimizations

Provide specific, actionable feedback.
```

**Why it works**: Cursor automatically includes "this code" (selected code or code at cursor).

### ❌ Bad: Don't Try to Access Code Manually

```markdown
Review the code in the selected text:
- [Don't try to reference selected code explicitly]
- [Cursor handles this automatically]
```

**Why it doesn't work**: You can't manually access the selection - Cursor does it automatically.

### ✅ Good: Be Specific About What You Want

```markdown
Refactor this code to:
- Improve readability
- Follow project conventions
- Optimize performance

Keep functionality identical, only improve structure.
```

**Why it works**: "this code" refers to whatever Cursor includes (selected, cursor position, or open files).

## Examples

### Example 1: Code Review

**Command**: `/code_review`

**What you do**:
1. Select a function
2. Type `/code_review` in Chat
3. Send

**What Cursor does**:
- Includes the selected function
- Includes the file it's from
- Includes project rules
- Sends to AI: `[Review prompt] + [Selected function] + [Context]`

**What AI receives**:
```
Review this code for:
- Functionality and edge cases
- Security issues
- Performance optimizations

[Automatically injected: Selected function code]
[Automatically injected: File context]
[Automatically injected: Project rules]
```

### Example 2: Refactoring

**Command**: `/refactor_code`

**What you do**:
1. Place cursor in a function (no selection)
2. Type `/refactor_code` in Chat
3. Send

**What Cursor does**:
- Detects code at cursor position
- Includes the function/block
- Includes the file
- Sends to AI: `[Refactor prompt] + [Code at cursor] + [Context]`

**What AI receives**:
```
Refactor this code to:
- Improve readability
- Follow project conventions
- Optimize performance

[Automatically injected: Function at cursor]
[Automatically injected: File context]
[Automatically injected: Project rules]
```

### Example 3: Explaining Code

**Command**: `/explain_code`

**What you do**:
1. Select multiple lines
2. Type `/explain_code` in Chat
3. Send

**What Cursor does**:
- Includes all selected lines
- Includes surrounding context
- Includes file and project context
- Sends to AI: `[Explain prompt] + [Selected code] + [Context]`

## Tips

### 1. Trust Cursor's Context Detection

Cursor is smart about what to include. You don't need to:
- Reference "selected code" explicitly
- Specify file paths
- Manually include context

Just write your prompt as if the code is already there.

### 2. Be Clear About Intent

Your command should clearly state what you want:

```markdown
# ✅ Good - Clear intent
Refactor this code to improve readability.

# ❌ Bad - Vague
Make this better.
```

### 3. Reference Project Rules

If your command should follow project rules, mention them:

```markdown
Review this code using the checklist in code_review.mdc:
- Functionality
- Security
- Performance
```

Cursor will automatically include the referenced rule file.

### 4. Use "This Code" Language

Commands work best when they use natural language:

- ✅ "Refactor **this code**"
- ✅ "Review **this code**"
- ✅ "Explain **this code**"
- ✅ "Add tests for **this code**"

Cursor knows "this code" = whatever is selected or at cursor.

## How It Differs from VS Code Extensions

In VS Code extensions (like the one in this project), you **manually** access selected code:

```typescript
const editor = vscode.window.activeTextEditor;
const selection = editor.document.getText(editor.selection);
```

**In Cursor commands**: You don't need to do this - Cursor handles it automatically.

## Summary

1. **Command files are just prompts** - no special syntax needed
2. **Cursor automatically injects context** - selected code, files, rules, etc.
3. **Write commands naturally** - use "this code" language
4. **Trust Cursor's context detection** - it's smart about what to include
5. **Be specific about intent** - clear prompts work better

The magic happens **automatically** - you just write the prompt, and Cursor handles the rest!

