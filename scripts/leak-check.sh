#!/bin/bash
# Leak check: Fails if runtime data files appear outside allowed locations
set -e

cd "$(dirname "$0")/.."

echo "🔍 Checking for data file leakage..."

# Runtime data files that should NEVER appear in repo root or dist
LEAKED=$(find . -maxdepth 3 -type f \( \
    -name "memory.json" \
    -o -name "tasks.jsonl" \
    -o -name "reminders.jsonl" \
    -o -name "audit.jsonl" \
    -o -name "contacts.jsonl" \
    -o -name "calendar.jsonl" \
  \) \
  ! -path "./.assistant-data/*" \
  ! -path "./node_modules/*" \
  ! -path "./dist/*" \
  ! -path "./src/evals/*" \
  2>/dev/null || true)

if [ -n "$LEAKED" ]; then
    echo "❌ FAIL: Runtime data files leaked into repo!"
    echo ""
    echo "Found:"
    echo "$LEAKED"
    echo ""
    echo "These files should only exist in ~/.assistant-data/ or .assistant-data/"
    exit 1
fi

# Check dist/ for leakage too
DIST_LEAKED=$(find ./dist -type f \( \
    -name "memory.json" \
    -o -name "*.jsonl" \
  \) 2>/dev/null | grep -v "evals" || true)

if [ -n "$DIST_LEAKED" ]; then
    echo "❌ FAIL: Runtime data files leaked into dist/!"
    echo ""
    echo "Found:"
    echo "$DIST_LEAKED"
    exit 1
fi

echo "✅ No data leakage detected"

