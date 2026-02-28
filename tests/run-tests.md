# Running Tests

## Prerequisites

Make sure you have vitest installed:

```bash
npm install -D vitest
```

## Run All Tests

```bash
npm test
```

Or with vitest directly:

```bash
npx vitest
```

## Run Specific Test Files

```bash
npx vitest blueprint-validator.test.ts
npx vitest blueprint-execution.test.ts
```

## Run Tests in Watch Mode

```bash
npx vitest --watch
```

## Run Tests with Coverage

```bash
npx vitest --coverage
```

## Test Structure

- `blueprint-validator.test.ts` - Tests for blueprint validation rules
- `blueprint-execution.test.ts` - Tests for block execution logic and serialization

## What's Being Tested

### Validator Tests
- Basic blueprint validation (name, empty blocks)
- Duplicate block ID detection
- Block-specific configuration validation
- Parent-child relationship validation
- Nesting depth limits
- Selector requirements based on context
- Warning generation for potential issues

### Execution Tests
- Block factory creation from JSON
- Serialization/deserialization
- Parent-child relationship maintenance
- Blueprint operations (add, remove, reorder)
- Scope handling
- Configuration validation
