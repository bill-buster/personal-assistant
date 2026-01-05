#!/bin/bash
# Preflight: Full verification before commit/push
set -e

cd "$(dirname "$0")/.."

echo "🚀 Running preflight checks..."
echo ""

echo "0/6 Cleanup generated files..."
./scripts/cleanup_generated.sh > /dev/null 2>&1 || true
echo "   ✓ Cleanup done"
echo ""

echo "1/6 Format check..."
npm run format:check > /dev/null 2>&1 || {
    echo "   ⚠️  Formatting issues found. Run: npm run fix"
    npm run format:check
    exit 1
}
echo "   ✓ Format check passed"
echo ""

echo "2/6 Lint..."
npm run lint
echo "   ✓ Lint passed"
echo ""

echo "3/6 Type check..."
npx tsc --noEmit
echo "   ✓ Type check passed"
echo ""

echo "4/6 Build..."
npm run build
echo "   ✓ Build passed"
echo ""

echo "5/6 Leak check..."
./scripts/leak-check.sh
echo ""

echo "6/6 Smoke test..."
./scripts/smoke-test.sh
echo ""

echo "================================"
echo "✅ All preflight checks passed!"
echo "================================"

