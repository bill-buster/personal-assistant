# /help
Lists available project slash commands and suggests which one to run next.

## Instructions
1) Try to read the directory: `.cursor/commands/`
2) If directory listing fails, fall back to reading `.cursor/commands/README.md` for the canonical command list
3) Print a categorized list of commands (name → 1-line description).
4) For each command, include:
   - When to use it
   - What it outputs/changes
5) Suggest the "next best command" based on the user's last message.

## Output format
### Commands
- /<command_name> — <one-line description>
  - Use when: <trigger>
  - Produces: <artifacts/changes>

### Common workflows
- "Add a new tool" → /implement_and_review_tool
- "Fix a bunch of issues" → /fix_all_issues
- "Write tests" → <your test command>


This stays accurate even if the command set changes, because it reads the folder at runtime.

