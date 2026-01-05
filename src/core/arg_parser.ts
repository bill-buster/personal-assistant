
/**
 * distinct argument parsing logic shared across CLI tools.
 *
 * @param {string[]} argv - The arguments array (usually process.argv.slice(2))
 * @param {Object} options - Configuration for the parser
 * @param {string[]} [options.valueFlags=[]] - List of flags that require a value (e.g. 'intent' for --intent)
 * @param {string[]} [options.booleanFlags=[]] - List of flags that are boolean toggles (e.g. 'help' for --help)
 * @returns {Object} Result object containing parsed flags, input parts, and any error
 */
interface ParserOptions {
  valueFlags?: string[];
  booleanFlags?: string[];
}

interface ParserResult {
  flags: Record<string, string | boolean>;
  positionals: string[];
  error: string | null;
  rawInput: string;
}

/**
 * distinct argument parsing logic shared across CLI tools.
 *
 * @param {string[]} argv - The arguments array (usually process.argv.slice(2))
 * @param {Object} options - Configuration for the parser
 * @param {string[]} [options.valueFlags=[]] - List of flags that require a value (e.g. 'intent' for --intent)
 * @param {string[]} [options.booleanFlags=[]] - List of flags that are boolean toggles (e.g. 'help' for --help)
 * @returns {Object} Result object containing parsed flags, input parts, and any error
 */
export function parseArgs(argv: string[], options: ParserOptions = {}): ParserResult {
  const valueFlags = new Set(options.valueFlags || []);
  const booleanFlags = new Set(options.booleanFlags || []);
  const flags: Record<string, string | boolean> = {};
  const positionals = [];
  let error = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const flagName = arg.slice(2);

      // Handle --flag=value
      if (flagName.includes('=')) {
        const [key, ...valueParts] = flagName.split('=');
        const value = valueParts.join('=');

        if (valueFlags.has(key)) {
          if (!value) {
            error = `Error: --${key} requires a value.`;
            break;
          }
          flags[key] = value;
          continue;
        }
        // If it's a known boolean flag but has a value, strictly it's usually ignored or treated as true, 
        // but let's stick to the previous simple logic: check if key is in booleanFlags ?
        if (booleanFlags.has(key)) {
          // Technically --bool=true/false isn't handled in original code, 
          // original code often just checked `arg === '--flag'`.
          // But let's support generic parsing: if it's boolean, we treat it as set.
          flags[key] = true;
          continue;
        }

      } else {
        // Handle --flag value or --flag
        if (valueFlags.has(flagName)) {
          const value = argv[i + 1];
          if (!value) {
            error = `Error: --${flagName} requires a value.`;
            break;
          }
          flags[flagName] = value;
          i += 1;
          continue;
        }

        if (booleanFlags.has(flagName)) {
          flags[flagName] = true;
          continue;
        }
      }
    }

    // If we're here, it's a positional argument or unknown flag (treated as positional in original code usually?)
    // Original code: `inputParts.push(arg)` if not matched.
    positionals.push(arg);
  }

  return {
    flags,
    positionals,
    error,
    rawInput: positionals.join(' ').trim(),
  };
}

/**
 * Parse a command string into arguments, respecting quoted strings.
 * Supports double quotes ("...") and single quotes ('...').
 * Returns {ok: true, args: string[]} or {ok: false, error: string}.
 * 
 * @param {string} input - The command string to parse
 * @returns {Object} Result object with ok flag and either args array or error message
 */
export function parseShellArgs(input: string): { ok: true; args: string[] } | { ok: false; error: string } {
  const args: string[] = [];
  let current = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (inDoubleQuote) {
      if (char === '"') {
        inDoubleQuote = false;
      } else {
        current += char;
      }
    } else if (inSingleQuote) {
      if (char === "'") {
        inSingleQuote = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inDoubleQuote = true;
    } else if (char === "'") {
      inSingleQuote = true;
    } else if (/\s/.test(char)) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
    i++;
  }

  // Check for unterminated quotes
  if (inDoubleQuote) {
    return { ok: false, error: 'Unterminated double quote in command.' };
  }
  if (inSingleQuote) {
    return { ok: false, error: 'Unterminated single quote in command.' };
  }

  // Push final argument if any
  if (current.length > 0) {
    args.push(current);
  }

  return { ok: true, args };
}

/**
 * Quote a shell argument if it contains spaces or special characters.
 * This is the inverse of parseShellArgs - it properly quotes arguments
 * so they can be safely joined and re-parsed.
 * 
 * @param {string} arg - The argument to quote
 * @returns {string} The quoted argument
 */
function quoteShellArg(arg: string): string {
  // If the argument contains spaces, quotes, or other special characters, quote it
  if (/[\s"']/.test(arg)) {
    // Escape any double quotes and wrap in double quotes
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return arg;
}

/**
 * Reconstruct a command string from cmd and args, properly quoting arguments.
 * This ensures that arguments with spaces are preserved when the command
 * is later parsed by parseShellArgs.
 * 
 * @param {string} cmd - The command name
 * @param {string[]} args - The command arguments
 * @returns {string} The properly quoted command string
 */
export function buildShellCommand(cmd: string, args: string[]): string {
  if (args.length === 0) {
    return cmd;
  }
  const quotedArgs = args.map(quoteShellArg);
  return `${cmd} ${quotedArgs.join(' ')}`;
}

