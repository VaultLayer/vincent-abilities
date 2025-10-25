# Vincent Ability: Native Send

A Vincent Ability that sends native ETH tokens to any Ethereum address.

## Overview

The Native Send Ability enables Vincent Apps to send native ETH tokens to any valid Ethereum address. It includes balance validation, PKP-derived key signing, and integrates with the Send Policy Counter for usage tracking and rate limiting.

## Features

- Sends native ETH tokens to any valid Ethereum address
- Validates sufficient balance before execution
- Supports custom RPC URLs (defaults to Yellowstone testnet)
- Integrates with Send Limit Counter policy for usage tracking
- Uses PKP-derived keys for transaction signing
- Prevents double-spending through policy integration

## Installation

```bash
npm install @vaultlayer/vincent-ability-native-send
# or
pnpm add @vaultlayer/vincent-ability-native-send
# or
yarn add @vaultlayer/vincent-ability-native-send
```

## Usage

### Basic Usage

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-native-send';

// Execute a native ETH send
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '0.1', // ETH amount as string
    rpcUrl: 'https://yellowstone-rpc.litprotocol.com/', // Optional
  },
});
```

### With Policy Integration

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-native-send';
import { bundledVincentPolicy } from '@vaultlayer/vincent-send-policy-counter';

// Create ability with policy
const NativeSendWithPolicy = createVincentAbilityPolicy({
  abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    to: 'to',
  },
});

// Execute with rate limiting
const result = await executeAbility({
  ability: bundledVincentAbility,
  policy: NativeSendWithPolicy,
  params: {
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '0.1',
  },
  policyParams: {
    maxSends: 10, // Maximum 10 sends
    timeWindowSeconds: 3600, // Per hour (3600 seconds)
  },
});
```

## Parameters

### Required Parameters

#### to

- **Type**: `string`
- **Description**: Ethereum address to send tokens to (must be valid 40-character hex address)
- **Example**: `'0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'`

#### amount

- **Type**: `string`
- **Description**: Amount of ETH to send (as decimal string)
- **Example**: `'0.1'`, `'1.5'`, `'0.001'`

### Optional Parameters

#### rpcUrl

- **Type**: `string`
- **Description**: RPC URL for the blockchain network
- **Default**: `'https://yellowstone-rpc.litprotocol.com/'`
- **Example**: `'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY'`

## Response Format

### Success Response

```typescript
{
  txHash: '0x...', // Transaction hash
  to: '0x...',     // Recipient address
  amount: '0.1',   // Amount sent
  timestamp: 1234567890 // Unix timestamp
}
```

### Precheck Response

```typescript
{
  availableBalance: '1000000000000000000'; // Available balance in wei
}
```

### Error Response

```typescript
{
  error: 'Delegator (0x...) does not have enough tokens to send 0.1 to 0x...',
  reason: 'INSUFFICIENT_BALANCE'
}
```

## Policy Integration

This ability works seamlessly with the `@vaultlayer/vincent-send-policy-counter` policy:

### Policy Features

- **Rate Limiting**: Control how many sends are allowed per time window
- **Double-spend Prevention**: Commits to policy state before transaction execution
- **Automatic Reset**: Counters reset when time windows expire
- **On-chain Storage**: Uses smart contract for reliable state management

### Policy Parameters

- `maxSends`: Maximum number of sends allowed (positive integer)
- `timeWindowSeconds`: Duration of counting window in seconds (positive integer)

### Policy Phases

1. **Precheck**: Validates if PKP has remaining sends in current window
2. **Evaluate**: Double-checks send limit before execution
3. **Commit**: Records the send on-chain and updates counter

## Use Cases

- **Payment Systems**: Send ETH payments to users or services
- **DeFi Operations**: Fund DeFi protocols with native ETH
- **Multi-signature Wallets**: Execute approved ETH transfers
- **Automated Workflows**: Scheduled or triggered ETH payments
- **Remittances**: Cross-border ETH transfers
- **Subscription Services**: Recurring ETH payments

## Security Considerations

- **Balance Validation**: Always checks sufficient balance before execution
- **Address Validation**: Ensures recipient addresses are valid Ethereum addresses
- **Amount Validation**: Prevents zero or negative amounts
- **Policy Enforcement**: Integrates with rate limiting to prevent abuse
- **Double-spend Prevention**: Commits to policy state before transaction execution
- **PKP Security**: Uses PKP-derived keys for secure transaction signing

## Dependencies

- `@lit-protocol/vincent-ability-sdk` - Vincent framework
- `@lit-protocol/vincent-scaffold-sdk` - Transaction utilities
- `@vaultlayer/vincent-send-policy-counter` - Rate limiting policy
- `ethers@5.8.0` - Ethereum library
- `zod` - Schema validation

## Related Packages

- [@vaultlayer/vincent-send-policy-counter](../policy-counter/) - Rate limiting policy
- [@lit-protocol/vincent-ability-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-ability-sdk) - SDK for building Vincent Abilities
- [@lit-protocol/vincent-scaffold-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-scaffold-sdk) - Transaction utilities
