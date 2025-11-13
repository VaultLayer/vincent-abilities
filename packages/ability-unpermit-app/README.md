# Vincent Ability: Unpermit App

A Vincent Ability that allows an agent to revoke its own app permissions, useful for cleaning up after completing tasks.

## Overview

The Unpermit App Ability allows an agent to revoke its own app permissions by automatically unpermitting the currently permitted app version. This is useful for cleaning up permissions after the app completes its intended task, ensuring the agent can only use the app when explicitly needed.

## Features

- Automatically derives app ID and version from the delegatee
- Unpermits the currently permitted app version for the agent
- Validates that the app is delegated to the delegatee
- Calls the Lit Vincent Tool Policies contract directly
- Uses PKP-derived keys for secure transaction signing
- No policies required - simple and straightforward

## Installation

```bash
npm install @vaultlayer/vincent-ability-unpermit-app
# or
pnpm add @vaultlayer/vincent-ability-unpermit-app
# or
yarn add @vaultlayer/vincent-ability-unpermit-app
```

## Usage

### Basic Usage

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-unpermit-app';

// Unpermit the currently permitted app version
// No parameters needed - app ID and version are derived automatically
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {},
});
```

## Parameters

This ability requires no parameters. The app ID and version are automatically derived from:

- The delegatee's address (via `getAppByDelegatee`)
- The currently permitted app version for the PKP token (via `getPermittedAppVersionForPkp`)

## Response Format

### Success Response

```typescript
{
  txHash: '0x...',           // Transaction hash
  pkpTokenId: '123456',      // PKP token ID used
  appId: 1,                  // App ID that was unpermitted
  appVersion: 1,             // App version that was unpermitted
  timestamp: 1234567890      // Unix timestamp
}
```

### Precheck Response

```typescript
{
  pkpTokenId: '123456', // PKP token ID
  appId: 1,             // App ID
  appVersion: 1         // App version
}
```

### Error Response

```typescript
{
  error: 'Vault PKP tokenId is required for unpermit operation',
  reason: 'MISSING_PKP_TOKEN_ID'
}
```

## Contract Details

### Contract Address

- **Contract**: `0xa3a602F399E9663279cdF63a290101cB6560A87e`
- **Chain**: Yellowstone (Lit Protocol)
- **Chain ID**: `175188`
- **Function**: `unPermitAppVersion(uint256 pkpTokenId, uint256 appId, uint256 appVersion)`

## Use Cases

- **Permission Cleanup**: Automatically revoke permissions after completing a task
- **Security**: Ensure agents only retain permissions when actively needed
- **Self-Management**: Allow agents to clean up their own permissions
- **Temporary Access**: Grant permissions for specific operations, then automatically revoke

## Security Considerations

- **Delegatee Validation**: Verifies the app is actually delegated to the delegatee address
- **Permission Verification**: Confirms a permitted version exists before attempting to unpermit
- **PKP Token ID Validation**: Ensures PKP token ID is available before execution
- **Chain ID Verification**: Ensures correct chain before executing
- **PKP Security**: Uses PKP-derived keys for secure transaction signing

## Dependencies

- `@lit-protocol/vincent-ability-sdk` - Vincent framework
- `@lit-protocol/vincent-scaffold-sdk` - Transaction utilities
- `ethers@5.8.0` - Ethereum library
- `zod` - Schema validation

## Related Packages

- [@lit-protocol/vincent-ability-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-ability-sdk) - SDK for building Vincent Abilities
- [@lit-protocol/vincent-scaffold-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-scaffold-sdk) - Transaction utilities
