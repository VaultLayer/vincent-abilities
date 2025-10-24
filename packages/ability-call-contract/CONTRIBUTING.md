# Contributing to Vincent Ability Call Contract

This document provides guidelines for contributing to the Vincent Ability Call Contract project.

## Overview

This ability enables generic smart contract interactions with flexible parameter encoding and optional gas sponsorship.

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
nx test ability-call-contract
```

### Building the Lit Action

Build the ability:

```bash
nx run ability-call-contract:action:build
```

This command:

- Compiles TypeScript to JavaScript
- Bundles the Lit Action code
- Generates metadata files

### Deploying

Deploy to IPFS:

```bash
nx run ability-call-contract:action:deploy
```

This uploads the bundled Lit Action to IPFS via Pinata and returns the IPFS CID.

## Project Structure

```
src/
├── index.ts                    # Package entry point
└── lib/
    ├── helpers/
    │   ├── commit-allowed-policies.ts  # Policy commit helper
    │   ├── decode-function-args.ts     # Base64 args decoder
    │   ├── execute-operation.ts        # Transaction executor
    │   └── index.ts                    # Helper exports
    ├── lit-action.ts          # Lit Action entry point
    ├── schemas.ts             # Zod schemas for validation
    └── vincent-ability.ts     # Main ability logic
```

## Adding Features

When adding new features to the ability:

1. Update `schemas.ts` to include new parameters
2. Update `vincent-ability.ts` to implement the feature in precheck and execute
3. Update helper functions if needed
4. Update tests to cover new functionality
5. Update README.md with documentation

## Helper Functions

### decode-function-args.ts

Handles encoding/decoding of base64+hexlify function arguments for complex tuples.

### execute-operation.ts

Handles both regular and gas-sponsored contract call execution.

### commit-allowed-policies.ts

Commits policy state changes after successful execution.

## Testing Locally

Test with the policy:

```bash
# Build both ability and policy
nx run-many --target=build --projects=ability-call-contract,policy-call-contract-whitelist

# Run end-to-end tests
nx test test-e2e
```

## Gas Sponsorship Testing

To test gas sponsorship:

1. Set up an Alchemy account and create a gas policy
2. Use the API key and policy ID in your test parameters
3. Set `alchemyGasSponsor: true`

## Publishing

The ability is published to npm automatically via CI/CD when a new release is created.

To publish manually:

```bash
cd packages/ability-call-contract
pnpm publish
```

## Questions?

For questions or issues, please open an issue on the repository.
