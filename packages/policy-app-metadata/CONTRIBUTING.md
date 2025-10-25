# Contributing to Vincent Policy Call Contract Whitelist

This document provides guidelines for contributing to the Vincent Policy Call Contract Whitelist project.

## Overview

This policy provides access control for generic smart contract calls through whitelisting of contracts, functions, chains, and value limits.

## Setup

1. Follow the global setup instructions in the repository root [CONTRIBUTING.md](../../../CONTRIBUTING.md).
2. Install dependencies:
   ```bash
   pnpm install
   ```

## Development Workflow

### Testing

Run tests:

```bash
nx test policy-call-contract-whitelist
```

### Building the Lit Action

Build the policy:

```bash
nx run policy-call-contract-whitelist:action:build
```

This command:

- Compiles TypeScript to JavaScript
- Bundles the Lit Action code
- Generates metadata files

### Deploying

Deploy to IPFS:

```bash
nx run policy-call-contract-whitelist:action:deploy
```

This uploads the bundled Lit Action to IPFS via Pinata and returns the IPFS CID.

## Project Structure

```
src/
├── index.ts                    # Package entry point
├── inputUiSchema.json          # UI schema for policy configuration
└── lib/
    ├── lit-action.ts          # Lit Action entry point
    ├── schemas.ts             # Zod schemas for validation
    └── vincent-policy.ts      # Main policy logic
```

## Adding Features

When adding new features to the policy:

1. Update `schemas.ts` to include new validation rules
2. Update `vincent-policy.ts` to implement the validation logic
3. Update `inputUiSchema.json` for UI configuration
4. Update tests to cover new functionality
5. Update README.md with documentation

## Testing Locally

Test with the ability:

```bash
# Build both policy and ability
nx run-many --target=build --projects=policy-call-contract-whitelist,ability-call-contract

# Run end-to-end tests
nx test test-e2e
```

## Publishing

The policy is published to npm automatically via CI/CD when a new release is created.

To publish manually:

```bash
cd packages/policy-call-contract-whitelist
pnpm publish
```

## Questions?

For questions or issues, please open an issue on the repository.
