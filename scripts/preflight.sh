#!/bin/bash
# Preflight: Full verification before commit/push
set -e

cd "$(dirname "$0")/.."

echo "🚀 Running preflight checks..."
echo ""

echo "1/5 Lint..."
npm run lint
echo "   ✓ Lint passed"
echo ""

echo "2/5 Type check..."
npx tsc --noEmit
echo "   ✓ Type check passed"
echo ""

echo "3/5 Build..."
npm run build
echo "   ✓ Build passed"
echo ""

echo "4/5 Leak check..."
./scripts/leak-check.sh
echo ""

echo "5/5 Smoke test..."
./scripts/smoke-test.sh
echo ""

echo "================================"
echo "✅ All preflight checks passed!"
echo "================================"

