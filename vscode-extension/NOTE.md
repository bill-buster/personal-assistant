# VS Code Extension - Status

## Current Status

**Status**: ⚠️ Experimental / Optional

This VS Code extension provides inline commands for Personal Assistant directly in VS Code.

## Features

- Remember: Store selected text in memory (Cmd+Shift+R)
- Recall: Search memory (Cmd+Shift+F)
- Task Add: Add task from selection (Cmd+Shift+T)
- Command: Run any assistant command (Cmd+Shift+A)

## Installation

### Development

```bash
cd vscode-extension
npm install
npm run compile
```

Then in VS Code:

1. Press F5 to open Extension Development Host
2. Or package with `vsce package` and install the `.vsix` file

## Note

This extension is **optional** and not required for the main CLI assistant to function.

- The CLI assistant works independently
- The extension is a convenience layer for VS Code users
- Can be removed if not needed

## Build Output

- `out/` directory is gitignored (build artifacts)
- `node_modules/` is gitignored (dependencies)
- Only source code (`src/`) and config files are committed
