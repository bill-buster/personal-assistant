/**
 * VS Code extension for Personal Assistant
 * Provides inline commands in the editor.
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CursorCommandLogger } from './cursor_command_log';

const execAsync = promisify(exec);

interface AssistantConfig {
    executablePath: string;
    dataDir?: string;
}

function getConfig(): AssistantConfig {
    const config = vscode.workspace.getConfiguration('personalAssistant');
    return {
        executablePath: config.get<string>('executablePath', 'assistant'),
        dataDir: config.get<string>('dataDir', ''),
    };
}

function buildCommand(cmd: string, args: string[], config: AssistantConfig): string {
    let command = config.executablePath;
    if (config.dataDir) {
        command = `ASSISTANT_DATA_DIR="${config.dataDir}" ${command}`;
    }
    return `${command} ${cmd} ${args.map(a => `"${a}"`).join(' ')}`;
}

async function runAssistant(command: string, args: string[]): Promise<string> {
    const config = getConfig();
    const fullCommand = buildCommand(command, args, config);

    try {
        const { stdout, stderr } = await execAsync(fullCommand, {
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(),
        });

        if (stderr) {
            console.error('[Assistant]', stderr);
        }

        return stdout.trim();
    } catch (error: any) {
        const message = error.stderr || error.message || 'Unknown error';
        throw new Error(`Assistant command failed: ${message}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Personal Assistant extension is now active!');

    // Initialize command logger
    // Note: VS Code API doesn't provide onDidExecuteCommand in version 1.80.0
    // We only track our own commands explicitly with success/failure
    const commandLogger = new CursorCommandLogger();

    // Remember command
    const rememberCommand = vscode.commands.registerCommand(
        'personal-assistant.remember',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            const selection = editor.document.getText(editor.selection);
            if (!selection.trim()) {
                vscode.window.showErrorMessage('No text selected');
                return;
            }

            const startTime = Date.now();
            try {
                await runAssistant('remember', [selection]);
                const duration = Date.now() - startTime;
                commandLogger.logCommand('personal-assistant.remember', true, undefined, {
                    commandTitle: 'Remember: Store selection in memory',
                    category: 'assistant',
                    durationMs: duration,
                    context: {
                        activeFile: editor?.document.fileName,
                        selection: selection.substring(0, 100), // Truncate for logging
                        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                    },
                });
                vscode.window.showInformationMessage(
                    `✓ Remembered: ${selection.substring(0, 50)}...`
                );
            } catch (error: any) {
                const duration = Date.now() - startTime;
                commandLogger.logCommand('personal-assistant.remember', false, error.message, {
                    commandTitle: 'Remember: Store selection in memory',
                    category: 'assistant',
                    durationMs: duration,
                    context: {
                        activeFile: editor?.document.fileName,
                        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                    },
                });
                vscode.window.showErrorMessage(`Failed to remember: ${error.message}`);
            }
        }
    );

    // Recall command
    const recallCommand = vscode.commands.registerCommand('personal-assistant.recall', async () => {
        const query = await vscode.window.showInputBox({
            prompt: 'What would you like to recall?',
            placeHolder: 'Enter search query...',
        });

        if (!query) {
            return;
        }

        const startTime = Date.now();
        try {
            const result = await runAssistant('recall', [query, '--human']);
            const duration = Date.now() - startTime;
            commandLogger.logCommand('personal-assistant.recall', true, undefined, {
                commandTitle: 'Recall: Search memory',
                category: 'assistant',
                durationMs: duration,
            });
            vscode.window.showInformationMessage(result || 'No results found');
        } catch (error: any) {
            const duration = Date.now() - startTime;
            commandLogger.logCommand('personal-assistant.recall', false, error.message, {
                commandTitle: 'Recall: Search memory',
                category: 'assistant',
                durationMs: duration,
            });
            vscode.window.showErrorMessage(`Failed to recall: ${error.message}`);
        }
    });

    // Task add command
    const taskAddCommand = vscode.commands.registerCommand(
        'personal-assistant.taskAdd',
        async () => {
            const editor = vscode.window.activeTextEditor;
            let text = '';

            if (editor) {
                const selection = editor.document.getText(editor.selection);
                if (selection.trim()) {
                    text = selection.trim();
                }
            }

            if (!text) {
                const input = await vscode.window.showInputBox({
                    prompt: 'Enter task description',
                    placeHolder: 'Task text...',
                });
                if (!input) {
                    return;
                }
                text = input;
            }

            const startTime = Date.now();
            const activeEditor = vscode.window.activeTextEditor;
            try {
                await runAssistant('task', ['add', text]);
                const duration = Date.now() - startTime;
                commandLogger.logCommand('personal-assistant.taskAdd', true, undefined, {
                    commandTitle: 'Task: Add task from selection',
                    category: 'assistant',
                    durationMs: duration,
                    context: {
                        activeFile: activeEditor?.document.fileName,
                        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                    },
                });
                vscode.window.showInformationMessage(`✓ Task added: ${text.substring(0, 50)}...`);
            } catch (error: any) {
                const duration = Date.now() - startTime;
                commandLogger.logCommand('personal-assistant.taskAdd', false, error.message, {
                    commandTitle: 'Task: Add task from selection',
                    category: 'assistant',
                    durationMs: duration,
                    context: {
                        activeFile: activeEditor?.document.fileName,
                        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                    },
                });
                vscode.window.showErrorMessage(`Failed to add task: ${error.message}`);
            }
        }
    );

    // General command (Cmd+Shift+A)
    const commandCommand = vscode.commands.registerCommand(
        'personal-assistant.command',
        async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Assistant command',
                placeHolder:
                    'e.g., "remember: This function handles auth" or "task add: Review PR"',
            });

            if (!input) {
                return;
            }

            const startTime = Date.now();
            const activeEditor = vscode.window.activeTextEditor;
            try {
                // Parse input - if it starts with "remember:", "task add:", etc., route accordingly
                let command = 'spike';
                let args: string[] = [];

                if (input.startsWith('remember:')) {
                    command = 'remember';
                    args = [input.substring(9).trim()];
                } else if (input.startsWith('recall:')) {
                    command = 'recall';
                    args = [input.substring(7).trim(), '--human'];
                } else if (input.startsWith('task add:')) {
                    command = 'task';
                    args = ['add', input.substring(9).trim()];
                } else {
                    // Use router mode - pass through to assistant
                    const result = await runAssistant('', [input, '--human']);
                    const duration = Date.now() - startTime;
                    commandLogger.logCommand('personal-assistant.command', true, undefined, {
                        commandTitle: 'Assistant: Run command',
                        category: 'assistant',
                        durationMs: duration,
                        context: {
                            activeFile: activeEditor?.document.fileName,
                            workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                        },
                    });
                    vscode.window.showInformationMessage(result || 'Command completed');
                    return;
                }

                const result = await runAssistant(command, args);
                const duration = Date.now() - startTime;
                commandLogger.logCommand('personal-assistant.command', true, undefined, {
                    commandTitle: 'Assistant: Run command',
                    category: 'assistant',
                    durationMs: duration,
                    context: {
                        activeFile: activeEditor?.document.fileName,
                        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                    },
                });
                vscode.window.showInformationMessage(result || 'Command completed');
            } catch (error: any) {
                const duration = Date.now() - startTime;
                commandLogger.logCommand('personal-assistant.command', false, error.message, {
                    commandTitle: 'Assistant: Run command',
                    category: 'assistant',
                    durationMs: duration,
                    context: {
                        activeFile: activeEditor?.document.fileName,
                        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                    },
                });
                vscode.window.showErrorMessage(`Command failed: ${error.message}`);
            }
        }
    );

    context.subscriptions.push(rememberCommand, recallCommand, taskAddCommand, commandCommand);
}

export function deactivate() {
    // Cleanup if needed
}
