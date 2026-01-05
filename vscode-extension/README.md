# Personal Assistant VS Code Extension

VS Code extension for Personal Assistant - run commands directly from your editor.

## Features

- **Remember**: Store selected text in memory (Cmd+Shift+R)
- **Recall**: Search memory (Cmd+Shift+F)
- **Task Add**: Add task from selection (Cmd+Shift+T)
- **Command**: Run any assistant command (Cmd+Shift+A)

## Installation

### From Source

```bash
cd vscode-extension
npm install
npm run compile
```

Then in VS Code:

1. Press F5 to open Extension Development Host
2. Or package with `vsce package` and install the `.vsix` file

### Configuration

Add to your VS Code settings:

```json
{
    "personalAssistant.executablePath": "assistant",
    "personalAssistant.dataDir": ""
}
```

## Usage

### Keyboard Shortcuts

- **Cmd+Shift+A** (Mac) / **Ctrl+Shift+A** (Windows/Linux): Open command prompt
- **Cmd+Shift+R**: Remember selected text
- **Cmd+Shift+F**: Recall from memory
- **Cmd+Shift+T**: Add task from selection

### Context Menu

Right-click selected text:

- "Remember: Store selection in memory"
- "Task: Add task from selection"

### Command Palette

Press `Cmd+Shift+P` and type "Personal Assistant" to see all commands.

## Examples

### Remember Code Context

1. Select a function or comment
2. Press Cmd+Shift+R
3. Text is stored in assistant memory

### Add Task

1. Select text like "Review PR #123"
2. Press Cmd+Shift+T
3. Task is added to your todo list

### Quick Command

1. Press Cmd+Shift+A
2. Type: `remember: This function handles authentication`
3. Press Enter

## Requirements

- Personal Assistant CLI installed and available in PATH
- VS Code 1.80.0 or higher

## Development

```bash
cd vscode-extension
npm install
npm run watch  # Watch mode for development
```

Press F5 in VS Code to debug the extension.
