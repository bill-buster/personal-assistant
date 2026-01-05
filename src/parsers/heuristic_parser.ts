interface ParserResult {
    tool?: { name: string; args: any };
    error?: string;
}

/**
 * Heuristic parsing of natural language to tool calls.
 * Handles common aliases and descriptive commands.
 * 
 * @param {string} input - Input text.
 * @returns {Object|null} Result object or null if no match.
 */
export function parseHeuristicCommand(input: string): ParserResult | null {
    const trimmed = input.trim();

    // 0. Task Management (check before read so "show my tasks" isn't caught by "show <file>")
    // "list my tasks" / "show my tasks" (exact match)
    if (/^(?:list|show) my tasks?$/i.test(trimmed)) {
        return { tool: { name: 'task_list', args: { status: 'all' } } };
    }

    // 1. Read File Aliases
    const readMatch = trimmed.match(/^(?:read\s+file|read|cat|show\s+me|show)\s+(\S+)/i);
    if (readMatch) {
        return { tool: { name: 'read_file', args: { path: readMatch[1] } } };
    }

    // 1b. "what's in file X" / "what is in X"
    const whatsInMatch = trimmed.match(/^what(?:'s| is) in (?:file )?(\S+)/i);
    if (whatsInMatch) {
        return { tool: { name: 'read_file', args: { path: whatsInMatch[1] } } };
    }

    // 2. Write File Aliases
    const writeToMatch = trimmed.match(/^write\s+to\s+(\S+):\s*(.*)/is);
    if (writeToMatch) {
        return { tool: { name: 'write_file', args: { path: writeToMatch[1], content: writeToMatch[2] } } };
    }

    const createMatch = trimmed.match(/^create\s+(?:file\s+)?(\S+)\s+(?:with\s+)?(?:content\s+)?(.*)/is);
    if (createMatch && createMatch[1] && createMatch[2]) {
        if (trimmed.toLowerCase().includes('content') || trimmed.toLowerCase().includes('with')) {
            return { tool: { name: 'write_file', args: { path: createMatch[1], content: createMatch[2] } } };
        }
    }

    const saveToMatch = trimmed.match(/^save\s+(.*)\s+to\s+(\S+)$/is);
    if (saveToMatch) {
        return { tool: { name: 'write_file', args: { path: saveToMatch[2], content: saveToMatch[1] } } };
    }

    // 3. List Files Aliases
    if (trimmed.toLowerCase() === 'list files' || trimmed.toLowerCase() === 'list') {
        return { tool: { name: 'list_files', args: {} } };
    }

    // 4. Task Management
    const addTaskMatch = trimmed.match(/^add task (.+)/i);
    if (addTaskMatch) {
        return { tool: { name: 'task_add', args: { text: addTaskMatch[1].trim() } } };
    }

    const listTasksMatch = trimmed.match(/^list\s+(.*)\s*tasks/i);
    if (listTasksMatch) {
        let status = 'all';
        if (listTasksMatch[1].includes('open')) status = 'open';
        return { tool: { name: 'task_list', args: { status } } };
    }

    const completeTaskMatch = trimmed.match(/^(?:complete|done)\s+task\s+(\d+)/i);
    if (completeTaskMatch) {
        return { tool: { name: 'task_done', args: { id: parseInt(completeTaskMatch[1], 10) } } };
    }

    // 5. Memory Search
    const findMemMatch = trimmed.match(/^(?:find|search)\s+memory\s+(.+)/i);
    if (findMemMatch) {
        return { tool: { name: 'memory_search', args: { query: findMemMatch[1].trim() } } };
    }

    // 5b. "save this: <text>" / "note: <text>" -> remember
    const saveThisMatch = trimmed.match(/^save this[:\s]+(.+)/i);
    if (saveThisMatch) {
        return { tool: { name: 'remember', args: { text: saveThisMatch[1].trim() } } };
    }

    const noteMatch = trimmed.match(/^note[:\s]+(.+)/i);
    if (noteMatch) {
        return { tool: { name: 'remember', args: { text: noteMatch[1].trim() } } };
    }

    // 6. Communication Aliases
    const emailMatch = trimmed.match(/^(?:email\s+send|send\s+email)\s+to\s+([^:]+):\s*([^|]+)\s*\|\s*(.*)$/i);
    if (emailMatch) {
        return { tool: { name: 'email_send', args: { to: emailMatch[1].trim(), subject: emailMatch[2].trim(), body: emailMatch[3].trim() } } };
    }

    const messageMatch = trimmed.match(/^(?:text|message|msg)\s+([^:]+):\s*(.*)$/i);
    if (messageMatch) {
        return { tool: { name: 'message_send', args: { to: messageMatch[1].trim(), body: messageMatch[2].trim() } } };
    }

    // 7. Contact Aliases
    const contactSearchMatch = trimmed.match(/^(?:find|search|lookup)\s+contact\s+(.+)/i);
    if (contactSearchMatch) {
        return { tool: { name: 'contact_search', args: { query: contactSearchMatch[1].trim() } } };
    }

    // 8. Calendar Aliases
    if (trimmed.toLowerCase().match(/(?:check|show|list|what's\s+on)\s+(?:my\s+)?calendar/i)) {
        return { tool: { name: 'calendar_list', args: {} } };
    }

    // 9. Utility Tools
    // "what time is it" / "current time" / "time now"
    if (/^(?:what time is it|current time|time now|what's the time)/i.test(trimmed)) {
        return { tool: { name: 'get_time', args: {} } };
    }

    // "calculate <expression>" / "calc <expression>" / "compute"
    const calcMatch = trimmed.match(/^(?:calculate|calc|compute|eval)[:\s]+(.+)/i);
    if (calcMatch) {
        return { tool: { name: 'calculate', args: { expression: calcMatch[1].trim() } } };
    }

    return null;
}

