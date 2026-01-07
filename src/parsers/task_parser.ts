interface ParserResult {
    tool?: { name: string; args: any };
    error?: string;
}

/**
 * Parse task-related commands.
 * @param {string} input - Cleaned input text.
 * @returns {Object|null} Result object or null if no match.
 */
export function parseTaskCommand(input: string): ParserResult | null {
    // 1. "task add <text>" or "todo add <text>" or just "todo <text>" (implicit add)
    // We need to be careful not to conflict with "task list" or "task done" if "todo list" is used.

    // Explicit add: "task add ..." or "todo add ..."
    const explicitAddMatch = input.match(/^(?:task|todo)\s+add\s+(.+)$/i);
    if (explicitAddMatch) {
        return parseTaskAdd(explicitAddMatch[1]);
    }

    // Implicit add: "todo <text>" where text is NOT "list" or "done" (and not "add" obviously)
    // This is a common pattern: "todo buy milk"
    if (input.match(/^todo\s+/i)) {
        const potentialText = input.replace(/^todo\s+/i, '').trim();
        const firstWord = potentialText.split(' ')[0].toLowerCase();
        if (firstWord !== 'list' && firstWord !== 'done' && firstWord !== 'add') {
            return parseTaskAdd(potentialText);
        }
    }

    // 2. "task list [status]" or "todo list [status]"
    if (input.match(/^(?:task|todo)\s+list/i)) {
        let status = 'all';
        const statusMatch = input.match(/--status\s+(open|done|all)/);
        if (statusMatch) {
            status = statusMatch[1];
        } else {
            const trailingStatus = input.match(/^(?:task|todo)\s+list\s+(open|done|all)\b/i);
            if (trailingStatus) status = trailingStatus[1];
        }
        return { tool: { name: 'task_list', args: { status } } };
    }

    // 3. "task done <id>" or "todo done <id>"
    const doneMatch = input.match(/^(?:task|todo)\s+done\s+(\d+)$/i);
    if (doneMatch) {
        const id = parseInt(doneMatch[1], 10);
        return { tool: { name: 'task_done', args: { id } } };
    }

    // 4. "remind me to <text> in <N> seconds/minutes"
    const remindMatch1 = input.match(/^remind me to (.+) in (\d+) (second|minute|hour)s?$/i);
    const remindMatch2 = input.match(/^remind me in (\d+) (second|minute|hour)s? to (.+)$/i);

    if (remindMatch1 || remindMatch2) {
        let text, amount, unit;
        if (remindMatch1) {
            text = remindMatch1[1];
            amount = parseInt(remindMatch1[2], 10);
            unit = remindMatch1[3].toLowerCase();
        } else {
            // remindMatch2: 1=amount, 2=unit, 3=text
            amount = parseInt(remindMatch2![1], 10);
            unit = remindMatch2![2].toLowerCase();
            text = remindMatch2![3];
        }

        let seconds = amount;
        if (unit === 'minute') seconds *= 60;
        if (unit === 'hour') seconds *= 3600;

        return { tool: { name: 'reminder_add', args: { text, in_seconds: seconds } } };
    }

    return null;
}

function parseTaskAdd(text: string): ParserResult {
    if (!text) return { error: 'Error: task add requires text.' };

    let due: string | undefined;

    // Check for --due tomorrow (resolve to ISO date in America/Los_Angeles timezone)
    const dueTomorrowMatch = text.match(/--due\s+tomorrow\b/i);
    if (dueTomorrowMatch) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Format as YYYY-MM-DD in America/Los_Angeles timezone
        // 'en-CA' locale gives YYYY-MM-DD format
        due = tomorrow.toLocaleDateString('en-CA', {
            timeZone: 'America/Los_Angeles',
        });
        text = text.replace(dueTomorrowMatch[0], '');
    }

    // Check for --due YYYY-MM-DD (only if not already set by tomorrow)
    if (!due) {
        const dueMatch = text.match(/--due\s+(\d{4}-\d{2}-\d{2})/);
        if (dueMatch) {
            due = dueMatch[1];
            text = text.replace(dueMatch[0], '');
        }
    }

    const priorityMatch = text.match(/--priority\s+(low|medium|high)/);

    let cleanText = text;
    if (priorityMatch) cleanText = cleanText.replace(priorityMatch[0], '');
    cleanText = cleanText.trim();

    return {
        tool: {
            name: 'task_add',
            args: {
                text: cleanText,
                due: due,
                priority: priorityMatch ? priorityMatch[1] : undefined,
            },
        },
    };
}
