#!/bin/bash
# Performance profiling helper script

set -e

echo "🔬 Performance Profiling"
echo "========================"
echo ""

# Build first
echo "📦 Building..."
npm run build

# Check if command provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/profile.sh <command>"
    echo ""
    echo "Examples:"
    echo "  ./scripts/profile.sh demo"
    echo "  ./scripts/profile.sh 'task list'"
    echo "  ./scripts/profile.sh 'remember test'"
    exit 1
fi

# Run with profiling
echo "🚀 Running with CPU profiling..."
node --prof dist/app/cli.js "$@"

# Find the isolate log file
LOG_FILE=$(ls -t isolate-*.log 2>/dev/null | head -n 1)

if [ -z "$LOG_FILE" ]; then
    echo "❌ No profile log file found"
    exit 1
fi

echo ""
echo "📊 Analyzing profile..."
node --prof-process "$LOG_FILE" > profile.txt

echo ""
echo "✅ Profile saved to profile.txt"
echo "📈 Top functions:"
echo ""
head -n 30 profile.txt

echo ""
echo "💡 Tip: View full profile with: cat profile.txt"

