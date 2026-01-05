/**
 * Validate input for tool calling.
 * @param {string} input - Input text.
 * @returns {string|null} Error message or null.
 */
export function validateToolInput(input: string): string | null {
    if (!input || typeof input !== 'string') {
        return 'Error: Input must be a string.';
    }
    if (input.trim().length === 0) {
        return 'Error: Input cannot be empty.';
    }

    // Check for command patterns that are missing required content
    const colonPatterns = [
        { pattern: /^remember:\s*$/, error: 'Error: remember: requires text to remember.' },
        { pattern: /^recall:\s*$/, error: 'Error: recall: requires a search query.' },
    ];

    for (const { pattern, error } of colonPatterns) {
        if (pattern.test(input.trim())) {
            return error;
        }
    }

    // Check for single-word commands that need more args
    const singleWordInvalid = [
        'task',
        'memory',
        'run',
        'read',
        'write',
        'create',
        'save',
        'cat',
        'show',
        'remind',
    ];
    const trimmed = input.trim();
    if (singleWordInvalid.includes(trimmed.toLowerCase())) {
        return `Error: '${trimmed}' command requires additional arguments.`;
    }

    // 'read' without a path
    if (/^(read\s+file|read|cat|show\s+me|show)\s*$/i.test(trimmed)) {
        return 'Error: read command requires a file path.';
    }

    // 'write' without path and content
    if (/^(write|write\s+to|create\s+file|create|save)\s*$/i.test(trimmed)) {
        return 'Error: command requires additional arguments.';
    }

    // 'write' without path and content
    if (/^write\s+\S+\s*$/i.test(trimmed)) {
        return 'Error: write command requires path and content.';
    }

    // Only 'list', 'list files', 'list <status> tasks', 'list my tasks' are valid list patterns
    const listMatch = trimmed.match(/^list\s+(.+)$/i);
    if (listMatch) {
        const rest = listMatch[1].trim().toLowerCase();
        // Valid patterns: 'files', 'open tasks', 'done tasks', 'all tasks', 'my tasks', etc.
        const validListPatterns = /^(files?|(open|done|all|closed|my)\s+tasks?|memories)$/i;
        if (!validListPatterns.test(rest)) {
            // If it's not a valid list pattern, we let it through if it might be a heuristic match
            // but for simple list commands we want to be strict.
            if (rest.split(' ').length < 3) {
                return `Error: Invalid list command. Use 'list', 'list files', or 'list <status> tasks'.`;
            }
        }
    }

    return null;
}
