interface ParserResult {
    tool?: { name: string; args: Record<string, unknown> };
    error?: string;
}

/**
 * Parse memory-related commands.
 * @param {string} input - Cleaned input text.
 * @returns {Object|null} Result object or null if no match.
 */
export function parseMemoryCommand(input: string): ParserResult | null {
    // 1. "remember <text>"
    if (input.startsWith('remember ')) {
        const text = input.slice(9).trim();
        if (!text) return { error: 'Error: remember requires text.' };
        return { tool: { name: 'remember', args: { text } } };
    }

    // 2. "recall <query>"
    if (input.startsWith('recall ')) {
        const query = input.slice(7).trim();
        if (!query) return { error: 'Error: recall requires a query.' };
        return { tool: { name: 'recall', args: { query } } };
    }

    // 3. "mem(ory) add <text>"
    const memAddMatch = input.match(/^(mem|memory) add (.+)$/i);
    if (memAddMatch) {
        return { tool: { name: 'memory_add', args: { text: memAddMatch[2].trim() } } };
    }

    // 4. "mem(ory) search <query>"
    const memSearchMatch = input.match(/^(mem|memory) search (.+)$/i);
    if (memSearchMatch) {
        // Check for --limit and --offset
        let query = memSearchMatch[2].trim();
        const limitMatch = query.match(/--limit\s+(\d+)/);
        const offsetMatch = query.match(/--offset\s+(\d+)/);
        let limit = 5;
        let offset = 0;

        if (limitMatch) {
            limit = parseInt(limitMatch[1], 10);
            query = query.replace(limitMatch[0], '');
        }
        if (offsetMatch) {
            offset = parseInt(offsetMatch[1], 10);
            query = query.replace(offsetMatch[0], '');
        }
        query = query.trim();

        return { tool: { name: 'memory_search', args: { query, limit, offset } } };
    }

    return null;
}
