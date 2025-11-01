# Vincent Ability: Unpermit App

A Vincent Ability that unpermits an app version for a delegatee by calling the Lit contracts directly.

## Overview

The Unpermit App Ability enables Vincent Apps to revoke permissions for a specific app version by calling the `unPermitAppVersion` function on the Lit Vincent Tool Policies contract. This allows apps to remove permissions that were previously granted to a specific app version.

## Features

- Unpermits an app version for a delegatee
- Calls the Lit Vincent Tool Policies contract directly
- Validates app ID and app version before execution
- Uses PKP-derived keys for transaction signing
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

// Unpermit an app version
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    appId: 1, // App ID (positive integer)
    appVersion: 1, // App version (positive integer)
  },
});
```

## Parameters

### Required Parameters

#### appId

- **Type**: `number`
- **Description**: The ID of the app to unpermit (must be a positive integer)
- **Example**: `1`, `2`, `42`

#### appVersion

- **Type**: `number`
- **Description**: The version of the app to unpermit (must be a positive integer)
- **Example**: `1`, `2`, `10`

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

- **Contract**: `0x78Cd1d270Ff12BA55e98BDff1f3646426E25D932`
- **Chain**: Yellowstone (Lit Protocol)
- **Chain ID**: `175188`
- **Function**: `unPermitAppVersion(uint256 pkpTokenId, uint256 appId, uint256 appVersion)`

## Use Cases

- **Permission Management**: Remove permissions for specific app versions
- **Security Revocation**: Quickly revoke access when needed
- **Version Control**: Manage permissions per app version
- **Access Control**: Fine-grained control over app permissions

## Security Considerations

- **PKP Token ID Validation**: Ensures PKP token ID is available before execution
- **App ID Validation**: Validates app ID is a positive integer
- **App Version Validation**: Validates app version is a positive integer
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
