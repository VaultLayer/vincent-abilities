# Vincent Policy: Send Policy Counter

A Vincent Policy that tracks and limits the number of native token sends per time window using an on-chain counter contract.

## Overview

The Send Policy Counter provides rate limiting functionality for Vincent Abilities by tracking the number of executions per PKP within configurable time windows. It uses an on-chain smart contract to maintain reliable state and prevent double-spending.

## Features

- Tracks the number of sends executed by a PKP using a smart contract
- Enforces maximum send limits within configurable time windows
- Prevents double-spending by committing counts before transaction execution
- Automatically resets counters when time windows expire
- Integrates seamlessly with Native Send ability
- Uses on-chain storage for reliable state management

## Installation

```bash
npm install @vaultlayer/vincent-send-policy-counter
# or
pnpm add @vaultlayer/vincent-send-policy-counter
# or
yarn add @vaultlayer/vincent-send-policy-counter
```

## Usage

### Basic Policy Setup

```typescript
import { bundledVincentPolicy } from '@vaultlayer/vincent-send-policy-counter';
import { createVincentAbilityPolicy } from '@lit-protocol/vincent-ability-sdk';

const SendLimitPolicy = createVincentAbilityPolicy({
  abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    to: 'to', // Maps ability's 'to' parameter to policy
  },
});
```

### With Native Send Ability

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-native-send';
import { bundledVincentPolicy } from '@vaultlayer/vincent-send-policy-counter';

// Execute ability with rate limiting
const result = await executeAbility({
  ability: bundledVincentAbility,
  policy: SendLimitPolicy,
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

### User Parameters (Policy Configuration)

#### maxSends

- **Type**: `number`
- **Required**: Yes
- **Description**: Maximum number of sends allowed within the time window
- **Example**: `10`, `100`, `5`

#### timeWindowSeconds

- **Type**: `number`
- **Required**: Yes
- **Description**: Duration of the counting window in seconds
- **Example**: `3600` (1 hour), `86400` (1 day), `300` (5 minutes)

### Ability Parameters (Mapped from Ability)

#### to

- **Type**: `string`
- **Description**: The recipient's address (mapped from ability)
- **Example**: `'0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'`

## Policy Phases

### 1. Precheck Phase

Validates if the PKP has remaining sends in the current time window.

**Allow Response:**

```typescript
{
  currentCount: 3,        // Number of sends already made
  maxSends: 10,          // Maximum allowed sends
  remainingSends: 7,     // Sends still available
  timeWindowSeconds: 3600 // Window duration
}
```

**Deny Response:**

```typescript
{
  reason: "Send limit exceeded. Maximum 10 sends per 3600 seconds. Try again in 1800 seconds.",
  currentCount: 10,      // Current count (at limit)
  maxSends: 10,         // Maximum allowed
  secondsUntilReset: 1800 // Time until reset
}
```

### 2. Evaluate Phase

Double-checks the send limit before execution to prevent race conditions.

**Allow Response:**

```typescript
{
  currentCount: 3,        // Current count
  maxSends: 10,          // Maximum allowed
  remainingSends: 7,     // Remaining sends
  timeWindowSeconds: 3600 // Window duration
}
```

**Deny Response:**

```typescript
{
  reason: "Send limit exceeded during evaluation. Maximum 10 sends per 3600 seconds. Try again in 1800 seconds.",
  currentCount: 10,      // Current count
  maxSends: 10,         // Maximum allowed
  timeWindowSeconds: 3600,
  secondsUntilReset: 1800 // Time until reset
}
```

### 3. Commit Phase

Records the send on-chain and updates the counter.

**Allow Response:**

```typescript
{
  recorded: true,        // Successfully recorded
  newCount: 4,          // Updated count
  remainingSends: 6     // Remaining sends after commit
}
```

## Configuration Examples

### Daily Limit (24 hours)

```typescript
{
  maxSends: 50,         // 50 sends per day
  timeWindowSeconds: 86400 // 24 hours
}
```

### Hourly Limit

```typescript
{
  maxSends: 10,         // 10 sends per hour
  timeWindowSeconds: 3600 // 1 hour
}
```

### High-frequency Limit (5 minutes)

```typescript
{
  maxSends: 3,          // 3 sends per 5 minutes
  timeWindowSeconds: 300 // 5 minutes
}
```

### Weekly Limit

```typescript
{
  maxSends: 100,        // 100 sends per week
  timeWindowSeconds: 604800 // 7 days
}
```

## Use Cases

### Rate Limiting

- **API Protection**: Prevent abuse of payment APIs
- **User Limits**: Implement per-user spending limits
- **System Protection**: Prevent automated attacks

### Spending Controls

- **Daily Limits**: Set maximum daily spending amounts
- **Transaction Frequency**: Control how often users can send
- **Security Measures**: Add extra protection for high-value operations

### Business Logic

- **Subscription Limits**: Limit usage for subscription tiers
- **Trial Periods**: Restrict functionality during trial periods
- **Compliance**: Meet regulatory requirements for transaction limits

## Smart Contract Integration

The policy uses an on-chain counter contract deployed on the Yellowstone testnet:

- **Contract Address**: Defined in `counterSignatures.address`
- **Function**: `increment()` - Records a new send
- **Storage**: Maintains per-PKP counters with timestamps
- **Reset Logic**: Automatically resets when time windows expire

## Security Features

- **Double-spend Prevention**: Commits to policy state before transaction execution
- **On-chain Storage**: Uses smart contract for tamper-proof state
- **Time Window Validation**: Prevents manipulation of time-based limits
- **PKP-specific Counters**: Each PKP has independent counters
- **Atomic Operations**: Policy commit and ability execution are coordinated

## Error Handling

The policy handles various error scenarios:

- **Network Issues**: Graceful handling of RPC failures
- **Contract Errors**: Proper error reporting for contract calls
- **Time Window Edge Cases**: Handles time window transitions
- **Counter Overflow**: Prevents integer overflow issues

## Dependencies

- `@lit-protocol/vincent-ability-sdk` - Vincent framework
- `@lit-protocol/vincent-scaffold-sdk` - Transaction utilities
- `ethers@5.8.0` - Ethereum library
- `zod` - Schema validation

## Related Packages

- [@vaultlayer/vincent-ability-native-send](../ability-native-send/) - Native send ability
- [@lit-protocol/vincent-ability-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-ability-sdk) - SDK for building Vincent Policies
- [@lit-protocol/vincent-scaffold-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-scaffold-sdk) - Transaction utilities
