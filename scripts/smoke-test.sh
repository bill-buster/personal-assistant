#!/bin/bash
# Smoke test: proves the assistant runs standalone without orchestrator
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
cd "$REPO_DIR"

# Use local data dir for test isolation
export ASSISTANT_BASE_DIR="$REPO_DIR"
export ASSISTANT_DATA_DIR="$REPO_DIR/.assistant-data"
mkdir -p "$ASSISTANT_DATA_DIR"

# Create permissions file to allow basic commands
cat > "$ASSISTANT_DATA_DIR/permissions.json" << 'EOF'
{
  "version": 1,
  "allow_paths": ["./", "~/"],
  "allow_commands": ["ls", "pwd", "cat", "du"],
  "require_confirmation_for": [],
  "deny_tools": []
}
EOF
export ASSISTANT_PERMISSIONS_PATH="$ASSISTANT_DATA_DIR/permissions.json"

echo "🧪 Personal Assistant Smoke Test"
echo "================================"

echo ""
echo "1. CLI starts..."
node dist/app/cli.js --help > /dev/null
echo "   ✓ CLI help works"

echo ""
echo "2. Run one tool (pwd)..."
RESULT=$(node dist/app/cli.js run pwd --mock 2>&1)
echo "   ✓ run_cmd works"

echo ""
echo "3. Write one memory..."
node dist/app/cli.js remember "Smoke test memory entry" --mock > /dev/null
echo "   ✓ remember works"

echo ""
echo "4. Read memory back..."
RESULT=$(node dist/app/cli.js recall "smoke test" --mock 2>&1)
if echo "$RESULT" | grep -q "Smoke test memory"; then
    echo "   ✓ recall found the memory"
else
    echo "   ✗ FAIL: memory not found in recall"
    echo "   Result was: $RESULT"
    exit 1
fi

echo ""
echo "5. Write one task..."
node dist/app/cli.js task add "Smoke test task" --mock > /dev/null
echo "   ✓ task add works"

echo ""
echo "6. Read task back..."
RESULT=$(node dist/app/cli.js task list --mock 2>&1)
if echo "$RESULT" | grep -q "Smoke test task"; then
    echo "   ✓ task list found the task"
else
    echo "   ✗ FAIL: task not found"
    echo "   Result was: $RESULT"
    exit 1
fi

echo ""
echo "7. Check for root leakage..."
# Exclude: .assistant-data/, node_modules/, dist/, src/evals/ (test fixtures)
LEAKED=$(find . -maxdepth 3 -type f \( -name "memory.json" -o -name "tasks.jsonl" -o -name "reminders.jsonl" -o -name "audit.jsonl" \) \
    ! -path "./.assistant-data/*" ! -path "./node_modules/*" ! -path "./dist/*" ! -path "./src/evals/*" 2>/dev/null || true)
if [ -n "$LEAKED" ]; then
    echo "   ✗ FAIL: runtime data files leaked outside .assistant-data/"
    echo "   Found: $LEAKED"
    exit 1
else
    echo "   ✓ No root leakage detected"
fi

echo ""
echo "================================"
echo "✅ NEW REPO IS ALIVE"
echo ""

# Cleanup
rm -rf "$ASSISTANT_DATA_DIR"

