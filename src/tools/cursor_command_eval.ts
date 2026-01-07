/**
 * Tool to evaluate Cursor custom commands.
 * Analyzes command files and tracks indirect usage patterns.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { z } from 'zod';
import type { ExecutorContext, ToolResult } from '../core/types';
import { makeError, makeDebug } from '../core';
import { CommandLogger } from '../core/command_log';

export const CursorCommandEvalSchema = z.object({
    command_name: z.string().optional(), // Specific command to evaluate, or all if not provided
    project_only: z.boolean().optional().default(false), // Only evaluate project commands
});

export type CursorCommandEvalArgs = z.infer<typeof CursorCommandEvalSchema>;

interface CommandFile {
    name: string;
    path: string;
    content: string;
    type: 'project' | 'user';
    metadata?: {
        mentions?: string[]; // Tools/patterns mentioned in command
        complexity?: 'simple' | 'medium' | 'complex';
        has_steps?: boolean;
        has_examples?: boolean;
    };
}

interface CommandUsage {
    command_name: string;
    indirect_usage_count: number; // Times command patterns appear in assistant logs
    last_used?: string;
    success_rate?: number;
    related_tools?: string[]; // Tools that were used after command execution
}

/**
 * Find all Cursor command files.
 */
function findCommandFiles(projectOnly: boolean = false): CommandFile[] {
    const commands: CommandFile[] = [];

    // Project commands
    const projectCommandsDir = path.join(process.cwd(), '.cursor', 'commands');
    if (fs.existsSync(projectCommandsDir)) {
        const files = fs.readdirSync(projectCommandsDir);
        for (const file of files) {
            if (file.endsWith('.md')) {
                const filePath = path.join(projectCommandsDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                commands.push({
                    name: file.replace('.md', ''),
                    path: filePath,
                    content,
                    type: 'project',
                    metadata: analyzeCommand(content),
                });
            }
        }
    }

    // User commands (if not project-only)
    if (!projectOnly) {
        const userCommandsDir = path.join(os.homedir(), '.cursor', 'commands');
        if (fs.existsSync(userCommandsDir)) {
            const files = fs.readdirSync(userCommandsDir);
            for (const file of files) {
                if (file.endsWith('.md')) {
                    const filePath = path.join(userCommandsDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    commands.push({
                        name: file.replace('.md', ''),
                        path: filePath,
                        content,
                        type: 'user',
                        metadata: analyzeCommand(content),
                    });
                }
            }
        }
    }

    return commands;
}

/**
 * Analyze command content to extract metadata.
 */
function analyzeCommand(content: string): CommandFile['metadata'] {
    const metadata: CommandFile['metadata'] = {
        mentions: [],
        complexity: 'simple',
        has_steps: false,
        has_examples: false,
    };

    // Extract tool mentions (patterns like `tool_name`, `handleTool`, etc.)
    const toolPatterns = [
        /`([a-z_]+)`/g, // Backticked tool names
        /handle([A-Z][a-zA-Z]+)/g, // Handler function names
        /([a-z_]+)_tools/g, // Tool file patterns
    ];

    for (const pattern of toolPatterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
            if (match[1] && !metadata.mentions?.includes(match[1])) {
                metadata.mentions?.push(match[1]);
            }
        }
    }

    // Check for step indicators
    if (content.includes('[STEP') || content.match(/\d+\.\s+\[/)) {
        metadata.has_steps = true;
    }

    // Check for examples
    if (content.includes('## Example') || content.includes('```')) {
        metadata.has_examples = true;
    }

    // Determine complexity
    const lineCount = content.split('\n').length;
    if (lineCount > 100) {
        metadata.complexity = 'complex';
    } else if (lineCount > 50) {
        metadata.complexity = 'medium';
    }

    return metadata;
}

/**
 * Find indirect usage patterns in assistant logs.
 */
function findIndirectUsage(
    commandName: string,
    commandContent: string,
    commandLogger: CommandLogger
): CommandUsage {
    const logs = commandLogger.readLogs();
    const usage: CommandUsage = {
        command_name: commandName,
        indirect_usage_count: 0,
        related_tools: [],
    };

    // Extract key patterns from command content
    const keyTerms = extractKeyTerms(commandContent);

    // Search logs for patterns that suggest command usage
    for (const log of logs) {
        const input = log.input.toLowerCase();
        const toolName = log.tool_name;

        // Check if log input contains key terms from command
        const matches = keyTerms.some(term => input.includes(term.toLowerCase()));

        if (matches) {
            usage.indirect_usage_count++;
            if (toolName && !usage.related_tools?.includes(toolName)) {
                usage.related_tools?.push(toolName);
            }

            // Track last usage
            if (!usage.last_used || log.ts > usage.last_used) {
                usage.last_used = log.ts;
            }

            // Track success rate
            if (log.tool_success !== undefined) {
                // This is a simplified heuristic
            }
        }
    }

    return usage;
}

/**
 * Extract key terms from command content.
 */
function extractKeyTerms(content: string): string[] {
    const terms: string[] = [];

    // Extract command name
    const commandMatch = content.match(/^#\s+(.+)$/m);
    if (commandMatch) {
        terms.push(commandMatch[1]);
    }

    // Extract role mentions
    const roleMatches = content.matchAll(/role\.([a-z_]+)\.mdc/g);
    for (const match of roleMatches) {
        terms.push(match[1]);
    }

    // Extract tool names mentioned
    const toolMatches = content.matchAll(/`([a-z_]+)`/g);
    for (const match of toolMatches) {
        terms.push(match[1]);
    }

    // Extract action verbs (simplified)
    const actionVerbs = ['add', 'create', 'implement', 'review', 'test', 'fix', 'refactor'];
    for (const verb of actionVerbs) {
        if (content.toLowerCase().includes(verb)) {
            terms.push(verb);
        }
    }

    return [...new Set(terms)]; // Remove duplicates
}

/**
 * Evaluate Cursor custom commands.
 */
export function handleCursorCommandEval(
    args: CursorCommandEvalArgs,
    context: ExecutorContext
): ToolResult {
    const startTime = Date.now();

    try {
        const commandLogger = new CommandLogger(path.join(context.baseDir, 'command_log.jsonl'));

        // Find command files
        const commandFiles = findCommandFiles(args.project_only || false);

        if (commandFiles.length === 0) {
            return {
                ok: true,
                result: {
                    message: 'No Cursor command files found',
                    commands: [],
                    summary: {
                        total: 0,
                        project: 0,
                        user: 0,
                    },
                },
                _debug: makeDebug({ path: 'cursor_command_eval', start: startTime }),
            };
        }

        // Filter by command name if specified
        const filteredCommands = args.command_name
            ? commandFiles.filter(c => c.name === args.command_name)
            : commandFiles;

        if (filteredCommands.length === 0) {
            return {
                ok: false,
                error: makeError('NOT_FOUND', `Command "${args.command_name}" not found`),
                _debug: makeDebug({ path: 'cursor_command_eval', start: startTime }),
            };
        }

        // Evaluate each command
        const evaluations = filteredCommands.map(cmd => {
            const usage = findIndirectUsage(cmd.name, cmd.content, commandLogger);

            return {
                name: cmd.name,
                type: cmd.type,
                path: cmd.path,
                metadata: cmd.metadata,
                usage,
                evaluation: {
                    has_documentation: cmd.content.length > 100,
                    has_examples: cmd.metadata?.has_examples || false,
                    has_steps: cmd.metadata?.has_steps || false,
                    complexity: cmd.metadata?.complexity || 'simple',
                    indirect_usage_count: usage.indirect_usage_count,
                    last_used: usage.last_used,
                    related_tools: usage.related_tools || [],
                },
            };
        });

        // Calculate summary
        const summary = {
            total: commandFiles.length,
            project: commandFiles.filter(c => c.type === 'project').length,
            user: commandFiles.filter(c => c.type === 'user').length,
            evaluated: evaluations.length,
            with_usage: evaluations.filter(e => e.usage.indirect_usage_count > 0).length,
            with_examples: evaluations.filter(e => e.evaluation.has_examples).length,
            with_steps: evaluations.filter(e => e.evaluation.has_steps).length,
        };

        return {
            ok: true,
            result: {
                commands: evaluations,
                summary,
                recommendations: generateRecommendations(evaluations),
            },
            _debug: makeDebug({ path: 'cursor_command_eval', start: startTime }),
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            ok: false,
            error: makeError('EXEC_ERROR', `Failed to evaluate commands: ${message}`),
            _debug: makeDebug({ path: 'cursor_command_eval', start: startTime }),
        };
    }
}

interface CommandEvaluation {
    name: string;
    type: 'project' | 'user';
    path: string;
    metadata?: CommandFile['metadata'];
    usage: CommandUsage;
    evaluation: {
        has_documentation: boolean;
        has_examples: boolean;
        has_steps: boolean;
        complexity: string;
        indirect_usage_count: number;
        last_used?: string;
        related_tools: string[];
    };
}

/**
 * Generate recommendations based on command evaluations.
 */
function generateRecommendations(evaluations: CommandEvaluation[]): string[] {
    const recommendations: string[] = [];

    // Commands with no usage
    const unused = evaluations.filter(e => e.usage.indirect_usage_count === 0);
    if (unused.length > 0) {
        recommendations.push(
            `${unused.length} command(s) have no detected usage: ${unused.map(e => e.name).join(', ')}. Consider reviewing if they're still needed.`
        );
    }

    // Commands without examples
    const noExamples = evaluations.filter(e => !e.evaluation.has_examples);
    if (noExamples.length > 0) {
        recommendations.push(
            `${noExamples.length} command(s) lack examples: ${noExamples.map(e => e.name).join(', ')}. Adding examples improves usability.`
        );
    }

    // Commands without steps
    const noSteps = evaluations.filter(
        e => !e.evaluation.has_steps && e.evaluation.complexity !== 'simple'
    );
    if (noSteps.length > 0) {
        recommendations.push(
            `${noSteps.length} complex command(s) lack step-by-step instructions: ${noSteps.map(e => e.name).join(', ')}. Consider adding structured steps.`
        );
    }

    // Commands with high complexity but low usage
    const complexUnused = evaluations.filter(
        e => e.evaluation.complexity === 'complex' && e.usage.indirect_usage_count === 0
    );
    if (complexUnused.length > 0) {
        recommendations.push(
            `${complexUnused.length} complex command(s) are unused: ${complexUnused.map(e => e.name).join(', ')}. Consider simplifying or removing.`
        );
    }

    if (recommendations.length === 0) {
        recommendations.push('All commands look good! No immediate recommendations.');
    }

    return recommendations;
}
