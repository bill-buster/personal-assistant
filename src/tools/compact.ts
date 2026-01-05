import { ToolSpec } from '../core/types';

/**
 * Format tools as compact TypeScript declarations.
 * Reduces token usage by ~40-60% compared to JSON Schema.
 */
export function formatToolsCompact(tools: Record<string, ToolSpec>): string {
    return Object.entries(tools)
        .map(([name, spec]) => {
            const args = Object.entries(spec.parameters)
                .map(([paramName, param]) => {
                    const optional = !spec.required.includes(paramName);
                    // Use enum values if available for more precision
                    const type = param.enum
                        ? param.enum.map(v => `'${v}'`).join(' | ')
                        : param.type;
                    return `${paramName}${optional ? '?' : ''}: ${type}`;
                })
                .join(', ');

            return `// ${spec.description}\nfunction ${name}(${args}): any;`;
        })
        .join('\n\n');
}
