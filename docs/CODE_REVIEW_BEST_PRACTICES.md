# Code Review System: Best Practices

## Where Things Belong

### ✅ Scripts → `src/scripts/`

**Executable code** that performs actions:

- `code_review.ts` - Runs reviews, analyzes code
- `code_review_fix.ts` - Auto-fixes issues
- `refactor.ts` - Detects refactoring opportunities
- `generate_tool.ts` - Generates code

**Why**: These are executable tools, not patterns/rules.

### ✅ Patterns/Rules → `.cursor/rules/*.mdc`

**Guidelines and patterns** for AI to follow:

- `code_review.mdc` - Review checklist, patterns, examples
- `security.mdc` - Security patterns
- `errors.mdc` - Error handling patterns

**Why**: These guide AI behavior, not executable code.

## Best Practice: Separation of Concerns

### Scripts (Executable)

- **Location**: `src/scripts/`
- **Purpose**: Run analysis, generate reports, auto-fix
- **Usage**: `npm run review`, `node dist/scripts/code_review.js`
- **Examples**: ESLint, Prettier, TypeScript compiler

### Rules (AI Guidance)

- **Location**: `.cursor/rules/*.mdc`
- **Purpose**: Guide AI to follow patterns
- **Usage**: Cursor reads automatically when relevant
- **Examples**: Code style, security patterns, review checklist

## Why This Separation?

### Scripts Are:

- ✅ Executable code (TypeScript → JavaScript)
- ✅ Run via CLI (`npm run review`)
- ✅ Can be tested (`code_review.test.ts`)
- ✅ Version controlled with code
- ✅ Part of build process

### Rules Are:

- ✅ Documentation/guidelines
- ✅ Read by Cursor AI automatically
- ✅ Define patterns, not implementation
- ✅ Guide AI behavior
- ✅ Not executable

## Current Structure (Correct!)

```
src/scripts/
├── code_review.ts          # ✅ Executable review tool
├── code_review_fix.ts      # ✅ Executable auto-fix tool
└── refactor.ts             # ✅ Executable refactoring tool

.cursor/rules/
├── code_review.mdc         # ✅ Review patterns/checklist
├── security.mdc            # ✅ Security patterns
└── errors.mdc              # ✅ Error handling patterns

docs/
├── CONTINUOUS_IMPROVEMENT.md      # ✅ User guide
├── CURSOR_IMPROVEMENT_STRATEGY.md # ✅ Cursor prompts guide
└── QUICK_REVIEW_GUIDE.md          # ✅ Quick start
```

## Industry Best Practices

### Similar Tools

**ESLint**:

- **Script**: `node_modules/.bin/eslint` (executable)
- **Rules**: `.eslintrc.js` (configuration/patterns)

**Prettier**:

- **Script**: `node_modules/.bin/prettier` (executable)
- **Config**: `.prettierrc` (configuration)

**TypeScript**:

- **Script**: `node_modules/.bin/tsc` (executable)
- **Config**: `tsconfig.json` (configuration)

**Our Code Review**:

- **Script**: `src/scripts/code_review.ts` (executable) ✅
- **Rules**: `.cursor/rules/code_review.mdc` (patterns) ✅

## When to Use What

### Use Scripts When:

- ✅ Need to analyze code programmatically
- ✅ Need to generate reports
- ✅ Need to auto-fix issues
- ✅ Need to run in CI/CD
- ✅ Need to measure metrics

### Use Rules When:

- ✅ Need to guide AI behavior
- ✅ Need to define patterns
- ✅ Need to provide examples
- ✅ Need to document conventions
- ✅ Need to ensure consistency

## Integration

### Scripts Reference Rules

Scripts can reference rule files for patterns:

```typescript
// In code_review.ts
import * as fs from 'node:fs';
const rulesPath = path.join(projectRoot, '.cursor/rules/code_review.mdc');
const rules = fs.readFileSync(rulesPath, 'utf8');
// Use rules to guide analysis
```

### Rules Guide Script Usage

Rules document how to use scripts:

````markdown
# In code_review.mdc

## Running Reviews

Use the review script:

```bash
npm run review
```
````

This runs `src/scripts/code_review.ts` which checks...

```

## Conclusion

**Current structure is correct!** ✅

- **Scripts** (`src/scripts/`) = Executable tools
- **Rules** (`.cursor/rules/`) = AI guidance patterns
- **Docs** (`docs/`) = User guides

This follows industry best practices and separation of concerns.

```
