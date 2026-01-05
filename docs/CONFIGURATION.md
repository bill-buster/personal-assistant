# Configuration Guide

Complete reference for configuring the Personal Assistant.

## Configuration File

Location: `~/.assistant/config.json`

### Basic Example

```json
{
    "defaultProvider": "groq",
    "apiKeys": {
        "groq": "your-groq-api-key"
    }
}
```

### Full Example

```json
{
    "version": 1,
    "defaultProvider": "groq",
    "apiKeys": {
        "groq": "your-groq-api-key",
        "openrouter": "your-openrouter-api-key"
    },
    "models": {
        "groq": "llama-3.1-70b-versatile",
        "openrouter": "anthropic/claude-3.5-sonnet"
    },
    "historyLimit": 20,
    "compactToolSchemas": true,
    "maxReadSize": 1048576,
    "maxWriteSize": 10485760,
    "maxRetries": 3,
    "storage": {
        "baseDir": "~/.assistant-data"
    }
}
```

## Configuration Options

### Provider Settings

#### `defaultProvider`

- **Type**: `string`
- **Values**: `"groq"`, `"openrouter"`, `"mock"`
- **Description**: Default LLM provider to use
- **Default**: `"groq"`

#### `apiKeys`

- **Type**: `object`
- **Description**: API keys for each provider
- **Example**:
    ```json
    {
        "groq": "gsk_...",
        "openrouter": "sk-or-..."
    }
    ```

#### `models`

- **Type**: `object`
- **Description**: Model overrides per provider
- **Example**:
    ```json
    {
        "groq": "llama-3.1-70b-versatile",
        "openrouter": "anthropic/claude-3.5-sonnet"
    }
    ```

### Behavior Settings

#### `historyLimit`

- **Type**: `number`
- **Range**: 1-50
- **Description**: Maximum number of messages to keep in conversation history
- **Default**: Not set (uses provider default)

#### `compactToolSchemas`

- **Type**: `boolean`
- **Description**: Use compact tool schema format (reduces token usage)
- **Default**: `false`

#### `maxRetries`

- **Type**: `number`
- **Range**: 1-10
- **Description**: Maximum number of retry attempts for LLM API calls
- **Default**: Not set (uses provider default)

### File Operation Limits

#### `maxReadSize`

- **Type**: `number`
- **Description**: Maximum file size that can be read (in bytes)
- **Default**: `1048576` (1 MB)

#### `maxWriteSize`

- **Type**: `number`
- **Description**: Maximum file size that can be written (in bytes)
- **Default**: `10485760` (10 MB)

### Storage Settings

#### `storage.baseDir`

- **Type**: `string`
- **Description**: Base directory for data storage
- **Default**: `~/.assistant-data`
- **Note**: Can be overridden with `ASSISTANT_DATA_DIR` environment variable

## Environment Variables

Environment variables override config file settings.

### Provider Configuration

| Variable             | Description        | Example     |
| -------------------- | ------------------ | ----------- |
| `GROQ_API_KEY`       | Groq API key       | `gsk_...`   |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-...` |
| `DEFAULT_PROVIDER`   | Default provider   | `groq`      |

### Directory Configuration

| Variable                     | Description            | Default                         |
| ---------------------------- | ---------------------- | ------------------------------- |
| `ASSISTANT_DATA_DIR`         | Data storage directory | `~/.assistant-data`             |
| `ASSISTANT_CONFIG_DIR`       | Config directory       | `~/.assistant`                  |
| `ASSISTANT_PERMISSIONS_PATH` | Permissions file path  | `~/.assistant/permissions.json` |

### Test Configuration

| Variable           | Description                     | Default         |
| ------------------ | ------------------------------- | --------------- |
| `TEST_PARALLEL`    | Enable parallel test execution  | `1` (enabled)   |
| `TEST_MAX_WORKERS` | Number of parallel test workers | `4`             |
| `TEST_SKIP_CACHE`  | Skip test result cache          | `0` (use cache) |
| `TEST_MAX_MEM`     | Memory limit per test (MB)      | `256`           |
| `TEST_DIST`        | Run tests from dist directory   | `0`             |

### Development Configuration

| Variable   | Description            | Default |
| ---------- | ---------------------- | ------- |
| `NODE_ENV` | Environment mode       | -       |
| `VERBOSE`  | Enable verbose logging | -       |

## Permissions Configuration

Location: `~/.assistant/permissions.json` (or path specified by `ASSISTANT_PERMISSIONS_PATH`)

### Example

```json
{
    "version": 1,
    "allow_paths": ["./", "~/"],
    "allow_commands": ["ls", "pwd", "cat", "du"],
    "require_confirmation_for": [],
    "deny_tools": []
}
```

### Options

- **`allow_paths`**: Array of allowed file paths (supports `./`, `~/`)
- **`allow_commands`**: Array of allowed shell commands
- **`require_confirmation_for`**: Array of tools requiring confirmation
- **`deny_tools`**: Array of tool names to deny

## Priority Order

Configuration is loaded in this priority order (highest to lowest):

1. **Environment variables** (override everything)
2. **Config file** (`~/.assistant/config.json`)
3. **Hardcoded defaults**

## Examples

### Minimal Configuration

```bash
# Just set API key via environment variable
export GROQ_API_KEY=your-key
assistant remember "test"
```

### Custom Data Directory

```bash
# Store data in custom location
export ASSISTANT_DATA_DIR=/custom/path/data
assistant remember "test"
```

### Development with Mock Provider

```bash
# Use mock provider (no API calls)
assistant remember "test" --mock
```

### Multiple Providers

```json
{
    "defaultProvider": "groq",
    "apiKeys": {
        "groq": "gsk_...",
        "openrouter": "sk-or-..."
    }
}
```

Then switch providers in REPL:

```
> /provider openrouter
Switched to openrouter.
```

## Troubleshooting

### Config File Not Found

The assistant will use defaults if the config file doesn't exist. Create `~/.assistant/config.json` to customize.

### Invalid Configuration

If the config file has invalid JSON or schema violations, the assistant will:

1. Log an error
2. Fall back to defaults
3. Continue operation

### Environment Variable Override

To verify which config is being used:

```bash
assistant doctor
```

This shows:

- Config directory location
- Data directory location
- Provider configuration
- API key status (without exposing keys)
