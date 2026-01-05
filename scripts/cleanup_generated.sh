#!/bin/bash

# Cleanup generated test files that shouldn't be committed

echo "Cleaning up generated test files..."

# Remove temporary test generation files
rm -f src/tools/test_tool*.ts
rm -f src/tools/e2e_test*.ts  
rm -f src/tools/TestTool*.ts

# Remove duplicate test files (if any)
find src/tools -name "*_tools_tools.test.ts" -type f -delete 2>/dev/null

echo "✓ Cleaned up generated test files"
echo ""
echo "Remaining files to review:"
git status --short | grep -E "\.(ts|js|json|md)$" | grep -v "node_modules\|dist\|coverage" | head -20

