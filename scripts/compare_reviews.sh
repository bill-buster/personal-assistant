#!/bin/bash

# Compare results from all code review tools
# Runs pattern matching and ESLint, then compares results

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/.review-results"

cd "$PROJECT_ROOT"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "🔍 Running Code Reviews..."
echo ""

# 1. Pattern Matching Review
echo "1️⃣  Running Pattern Matching Review..."
npm run review > "$OUTPUT_DIR/pattern-matching.txt" 2>&1 || true
PATTERN_ISSUES=$(grep -c "Total issues:" "$OUTPUT_DIR/pattern-matching.txt" || echo "0")
echo "   ✅ Pattern matching complete"

# 2. ESLint Review
echo "2️⃣  Running ESLint Review..."
npm run review:eslint > "$OUTPUT_DIR/eslint.txt" 2>&1 || true
ESLINT_ISSUES=$(grep -c "Total issues:" "$OUTPUT_DIR/eslint.txt" || echo "0")
echo "   ✅ ESLint complete"

# 3. Check for SonarQube
if command -v sonar-scanner &> /dev/null; then
    echo "3️⃣  Running SonarQube..."
    # Check if sonar-project.properties exists
    if [ ! -f "$PROJECT_ROOT/sonar-project.properties" ]; then
        echo "   ⚠️  sonar-project.properties not found, creating..."
        # Will be created by the script
    fi
    sonar-scanner > "$OUTPUT_DIR/sonarqube.txt" 2>&1 || true
    echo "   ✅ SonarQube complete"
    echo "   💡 Note: SonarQube server may need to be running (http://localhost:9000)"
else
    echo "3️⃣  SonarQube: Not installed (run ./scripts/install_sonarqube.sh)"
fi

# 4. Check for CodeQL
if command -v codeql &> /dev/null; then
    echo "4️⃣  Running CodeQL..."
    cd "$PROJECT_ROOT"
    codeql database create "$OUTPUT_DIR/codeql-db" --language=javascript --source-root=. --overwrite > "$OUTPUT_DIR/codeql-create.txt" 2>&1 || true
    if [ -d "$OUTPUT_DIR/codeql-db" ]; then
        codeql database analyze "$OUTPUT_DIR/codeql-db" --format=csv --output="$OUTPUT_DIR/codeql-results.csv" > "$OUTPUT_DIR/codeql-analyze.txt" 2>&1 || true
        echo "   ✅ CodeQL complete"
    else
        echo "   ⚠️  CodeQL database creation failed (check codeql-create.txt)"
    fi
else
    echo "4️⃣  CodeQL: Not installed (run ./scripts/install_codeql.sh)"
fi

echo ""
echo "📊 Comparison Summary"
echo "===================="
echo ""

# Extract key metrics
echo "Pattern Matching:"
grep -A 5 "Summary:" "$OUTPUT_DIR/pattern-matching.txt" | head -6 || echo "  No results"
echo ""

echo "ESLint:"
grep -A 5 "Summary:" "$OUTPUT_DIR/eslint.txt" | head -6 || echo "  No results"
echo ""

if [ -f "$OUTPUT_DIR/sonarqube.txt" ]; then
    echo "SonarQube:"
    tail -20 "$OUTPUT_DIR/sonarqube.txt" || echo "  No results"
    echo ""
fi

if [ -f "$OUTPUT_DIR/codeql-results.csv" ]; then
    echo "CodeQL:"
    echo "  Results saved to: $OUTPUT_DIR/codeql-results.csv"
    wc -l "$OUTPUT_DIR/codeql-results.csv" || echo "  No results"
    echo ""
fi

echo "📁 Full results saved to: $OUTPUT_DIR/"
echo ""
echo "💡 View results:"
echo "   cat $OUTPUT_DIR/pattern-matching.txt"
echo "   cat $OUTPUT_DIR/eslint.txt"

