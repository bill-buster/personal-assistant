#!/bin/bash

# Scheduled code review script - runs comprehensive reviews overnight
# Designed to be called by cron or cloud agents

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

# Build if needed
if [ ! -d "dist" ] || [ ! -f "dist/scripts/eslint_review.js" ]; then
    echo "Building project..."
    npm run build
fi

echo "🔍 Running Overnight Code Reviews..."
echo "Started: $(date)"
echo ""

# 1. ESLint Review (Primary - Type Safety)
echo "1️⃣  Running ESLint Review (Type Safety)..."
npm run review:eslint > .review-results/overnight-eslint.txt 2>&1 || true
echo "   ✅ ESLint complete"

# 2. Pattern Matching Review (Secondary - Code Quality)
echo "2️⃣  Running Pattern Matching Review (Code Quality)..."
npm run review > .review-results/overnight-pattern.txt 2>&1 || true
echo "   ✅ Pattern matching complete"

# 3. CodeQL Review (Security - Weekly)
DAY_OF_WEEK=$(date +%u)  # 1-7, Monday=1
if [ "$DAY_OF_WEEK" = "1" ]; then  # Run on Mondays
    echo "3️⃣  Running CodeQL Review (Security - Weekly)..."
    if command -v codeql &> /dev/null; then
        mkdir -p .review-results
        codeql database create .review-results/codeql-db --language=javascript --source-root=. --overwrite > .review-results/codeql-create.txt 2>&1 || true
        if [ -d ".review-results/codeql-db" ]; then
            codeql database analyze .review-results/codeql-db codeql/javascript-queries --format=csv --output=.review-results/overnight-codeql.csv > .review-results/codeql-analyze.txt 2>&1 || true
            echo "   ✅ CodeQL complete"
        fi
    else
        echo "   ⚠️  CodeQL not installed (skip)"
    fi
else
    echo "3️⃣  CodeQL: Skipped (runs weekly on Mondays)"
fi

# 4. SonarQube Review (Optional - if configured)
if command -v sonar-scanner &> /dev/null && [ -f "sonar-project.properties" ]; then
    echo "4️⃣  Running SonarQube Review..."
    sonar-scanner > .review-results/overnight-sonarqube.txt 2>&1 || true
    echo "   ✅ SonarQube complete"
else
    echo "4️⃣  SonarQube: Not configured (skip)"
fi

echo ""
echo "📊 Review Summary:"
echo "=================="
echo ""

# Extract summaries
if [ -f ".review-results/overnight-eslint.txt" ]; then
    echo "ESLint:"
    grep -A 5 "Summary:" .review-results/overnight-eslint.txt | head -6 || echo "  No results"
    echo ""
fi

if [ -f ".review-results/overnight-pattern.txt" ]; then
    echo "Pattern Matching:"
    grep -A 5 "Summary:" .review-results/overnight-pattern.txt | head -6 || echo "  No results"
    echo ""
fi

if [ -f ".review-results/overnight-codeql.csv" ]; then
    echo "CodeQL:"
    ISSUE_COUNT=$(wc -l < .review-results/overnight-codeql.csv 2>/dev/null || echo "0")
    echo "  Issues found: $((ISSUE_COUNT - 1))"  # Subtract header
    echo ""
fi

echo "📁 Full results saved to: .review-results/"
echo "Completed: $(date)"

