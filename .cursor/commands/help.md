# /help
Lists available project slash commands and suggests which one to run next.

## Instructions
1) Read the directory: `.cursor/commands/`
2) Print a categorized list of commands (name → 1-line description).
3) For each command, include:
   - When to use it
   - What it outputs/changes
4) Suggest the "next best command" based on the user's last message.

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

