# Vincent Policy: Call Contract Whitelist

## Overview

The Call Contract Whitelist Policy provides granular access control for generic smart contract interactions by enforcing whitelists for contracts, functions, chains, and transaction values. This policy ensures that Vincent Apps can only execute approved contract calls.

This Vincent Policy is designed to work with the [@vaultlayer/vincent-ability-call-contract](../ability-call-contract/) ability to provide flexible control over which contract calls can be executed.

## Key Features

- **Contract Whitelisting**: Restrict calls to specific contract addresses
- **Function Whitelisting**: Control which functions can be called by name
- **Multi-chain Support**: Configure allowed blockchain networks
- **Value Limits**: Set maximum ETH value that can be sent with transactions
- **Call Data Validation**: Optional validation of appended call data using hex prefixes

## How It Works

The Call Contract Whitelist Policy validates contract calls against a configured set of rules:

1. **Contract Validation**: Checks if the target contract address is in the allowed list
2. **Function Validation**: Verifies the function name is whitelisted
3. **Chain Validation**: Ensures the blockchain network is permitted
4. **Value Validation**: Confirms the ETH value doesn't exceed the maximum
5. **Call Data Validation**: If `appendToCallData` is provided, validates it starts with an allowed prefix
6. **Result**: Returns an allow or deny decision with detailed information

## Example Configuration

```typescript
const policyConfig = {
  // Maximum ETH value in wei (e.g., 1 ETH = 1000000000000000000)
  vlCallContractMaxValue: '1000000000000000000',

  // Allowed contract addresses (empty array allows all contracts)
  vlCallContractAllowedContracts: [
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  ],

  // Allowed function names (empty array allows all functions)
  vlCallContractAllowedFunctions: ['transfer', 'approve', 'deposit', 'withdraw'],

  // Allowed chain names (empty array allows all chains)
  vlCallContractAllowedChains: ['ethereum', 'base', 'polygon'],

  // Optional: Allowed hex prefixes for appendToCallData
  vlCallContractAllowedCallDataPrefixes: [
    '0xabcd', // Example tracking prefix
    '0x1234', // Another tracking prefix
  ],
};
```

## Configuration Options

### vlCallContractMaxValue

- **Type**: `string`
- **Required**: Yes
- **Description**: Maximum ETH value (in wei) that can be sent with the transaction
- **Example**: `'1000000000000000000'` (1 ETH)

### vlCallContractAllowedContracts

- **Type**: `string[]`
- **Required**: Yes
- **Description**: Array of allowed contract addresses. Empty array means all contracts are allowed
- **Example**: `['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2']`

### vlCallContractAllowedFunctions

- **Type**: `string[]`
- **Required**: Yes
- **Description**: Array of allowed function names. Empty array means all functions are allowed
- **Example**: `['transfer', 'approve']`

### vlCallContractAllowedChains

- **Type**: `string[]`
- **Required**: Yes
- **Description**: Array of allowed chain names. Empty array means all chains are allowed
- **Example**: `['ethereum', 'base', 'polygon']`

### vlCallContractAllowedCallDataPrefixes

- **Type**: `string[]`
- **Required**: No
- **Description**: Optional array of allowed hex prefixes for `appendToCallData`. If defined, any `appendToCallData` must start with one of these prefixes
- **Example**: `['0xabcd', '0x1234']`

## Usage Example

```typescript
import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-call-contract-whitelist';
import { createVincentAbilityPolicy } from '@lit-protocol/vincent-ability-sdk';

const CallContractPolicy = createVincentAbilityPolicy({
  abilityParamsSchema: myAbilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    contractAddress: 'contractAddress',
    functionName: 'functionName',
    chain: 'chain',
    value: 'value',
    // ... other mappings
  },
});
```

## Use Cases

1. **DeFi Integrations**: Allow specific DEX or lending protocol interactions
2. **Token Operations**: Restrict to specific token contracts and operations
3. **Bridge Operations**: Control cross-chain bridge interactions with call data validation
4. **Multi-chain Apps**: Manage which chains can be used for contract calls
5. **Value-limited Operations**: Ensure transactions don't exceed a maximum ETH value

## Security Considerations

- **Empty Arrays**: Empty whitelist arrays (`[]`) allow all items of that type. Use with caution
- **Checksummed Addresses**: Contract addresses are automatically checksummed for validation
- **Function Names**: Uses function names (not selectors) for more readable configuration
- **Call Data Prefixes**: Use `vlCallContractAllowedCallDataPrefixes` to control appended data for tracking or bridge integrations

## Related Packages

- [@vaultlayer/vincent-ability-call-contract](../ability-call-contract/) - The ability that uses this policy
- [@lit-protocol/vincent-ability-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-ability-sdk) - SDK for building Vincent Abilities and Policies
