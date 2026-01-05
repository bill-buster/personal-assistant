#!/bin/bash
# Memory profiling helper script

set -e

echo "🧠 Memory Profiling"
echo "==================="
echo ""

# Build first
echo "📦 Building..."
npm run build

# Check if command provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/memory-profile.sh <command>"
    echo ""
    echo "Examples:"
    echo "  ./scripts/memory-profile.sh demo"
    echo "  ./scripts/memory-profile.sh 'task list'"
    exit 1
fi

echo "🚀 Running with memory profiling..."
echo "💡 Send SIGUSR2 to the process to generate heap snapshot"
echo "   Example: kill -SIGUSR2 <PID>"
echo ""

# Run with heap snapshot support
node --heapsnapshot-signal=SIGUSR2 dist/app/cli.js "$@"

echo ""
echo "✅ Heap snapshots saved as *.heapsnapshot"
echo "💡 Open in Chrome DevTools: chrome://inspect"

