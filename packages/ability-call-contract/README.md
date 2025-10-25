# Vincent Ability: EVM Call Contract

## Overview

The EVM Call Contract Ability enables Vincent Apps to call any smart contract function with flexible parameter encoding and optional gas sponsorship. This ability provides a generic interface for interacting with blockchain smart contracts while maintaining security through policy enforcement.

## Key Features

- **Generic Contract Calls**: Call any contract function with any parameters
- **Flexible Parameter Encoding**: Support both standard arrays and base64-encoded complex tuples
- **Gas Sponsorship**: Optional EIP-7702 gas sponsorship via Alchemy
- **Multi-chain Support**: Works across any EVM-compatible blockchain
- **Call Data Appending**: Support for appending custom hex data for tracking or bridge integrations
- **Policy Integration**: Works with [@vaultlayer/vincent-policy-call-contract-whitelist](../policy-call-contract-whitelist/) for access control

## Installation

```bash
npm install @vaultlayer/vincent-ability-call-contract
# or
pnpm add @vaultlayer/vincent-ability-call-contract
# or
yarn add @vaultlayer/vincent-ability-call-contract
```

## Basic Usage

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-call-contract';

// Execute a simple ERC20 transfer
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    functionAbi: 'function transfer(address to, uint256 amount) returns (bool)',
    functionName: 'transfer',
    functionArgs: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', '1000000'],
    chain: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
  },
});
```

## Parameters

### Required Parameters

#### contractAddress

- **Type**: `string`
- **Description**: The contract address to call (must be a valid Ethereum address)
- **Example**: `'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'`

#### functionAbi

- **Type**: `string`
- **Description**: The ABI fragment of the contract function (human-readable format)
- **Example**: `'function transfer(address to, uint256 amount) returns (bool)'`

#### functionName

- **Type**: `string`
- **Description**: The name of the function to call
- **Example**: `'transfer'`

#### functionArgs (or functionArgsBase64)

- **Type**: `any[]` or `string`
- **Description**: Function arguments - either as a standard array or base64-encoded for complex tuples
- **Example**: `['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', '1000000']`

#### chain

- **Type**: `string`
- **Description**: The chain name of the blockchain network
- **Example**: `'ethereum'`, `'base'`, `'polygon'`

#### chainId

- **Type**: `number`
- **Description**: The chain ID of the blockchain network
- **Example**: `1` (Ethereum), `8453` (Base), `137` (Polygon)

#### rpcUrl

- **Type**: `string`
- **Description**: RPC URL used for precheck validations
- **Example**: `'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY'`

### Optional Parameters

#### value

- **Type**: `string`
- **Description**: The ETH value (in wei) to send with the transaction
- **Example**: `'1000000000000000000'` (1 ETH)
- **Default**: `'0'`

#### appendToCallData

- **Type**: `string`
- **Description**: Additional hex data to append to the transaction call data (useful for tracking identifiers or bridge integrations)
- **Example**: `'0xabcd1234'`

#### alchemyGasSponsor

- **Type**: `boolean`
- **Description**: Whether to use Alchemy's gas sponsorship (EIP-7702)
- **Default**: `false`

#### alchemyGasSponsorApiKey

- **Type**: `string`
- **Description**: Alchemy API key for gas sponsorship (required if `alchemyGasSponsor` is `true`)

#### alchemyGasSponsorPolicyId

- **Type**: `string`
- **Description**: Alchemy gas policy ID for sponsorship (required if `alchemyGasSponsor` is `true`)

## Advanced Usage

### Using Complex Function Arguments

For complex tuples or large numbers, use base64-encoded arguments:

```typescript
import { encodeFunctionArgsBase64 } from '@vaultlayer/vincent-ability-call-contract/helpers';

// Encode complex arguments
const complexArgs = [
  {
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: BigInt('1000000000000000000'),
    data: '0xabcd',
  },
];

const encodedArgs = encodeFunctionArgsBase64(complexArgs);

// Use in ability call
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    contractAddress: '0x...',
    functionAbi: 'function complexTransfer(tuple(address recipient, uint256 amount, bytes data))',
    functionName: 'complexTransfer',
    functionArgsBase64: encodedArgs,
    // ... other params
  },
});
```

### With Gas Sponsorship

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    functionAbi: 'function transfer(address to, uint256 amount)',
    functionName: 'transfer',
    functionArgs: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', '1000000'],
    chain: 'base',
    chainId: 8453,
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    // Gas sponsorship
    alchemyGasSponsor: true,
    alchemyGasSponsorApiKey: 'YOUR_ALCHEMY_API_KEY',
    alchemyGasSponsorPolicyId: 'YOUR_POLICY_ID',
  },
});
```

### With Call Data Appending

Useful for bridge integrations or tracking:

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    contractAddress: '0x...',
    functionAbi: 'function bridgeTokens(address token, uint256 amount, uint256 destinationChainId)',
    functionName: 'bridgeTokens',
    functionArgs: ['0x...', '1000000', '137'],
    chain: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    // Append tracking data
    appendToCallData: '0xabcd1234', // Must be validated by policy if vlCallContractAllowedCallDataPrefixes is set
  },
});
```

## Response Format

### Success Response

```typescript
{
  txHash: '0x...', // Transaction hash
  contractAddress: '0x...', // Contract that was called
  functionName: 'transfer', // Function that was called
  value: '0', // ETH value sent (optional)
  timestamp: 1234567890, // Unix timestamp
}
```

### Error Response

```typescript
{
  error: 'Error message describing what went wrong';
}
```

## Policy Configuration

This ability works with the Call Contract Whitelist Policy:

```typescript
import { createVincentAbilityPolicy } from '@lit-protocol/vincent-ability-sdk';
import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-call-contract-whitelist';

const CallContractPolicy = createVincentAbilityPolicy({
  abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    contractAddress: 'contractAddress',
    functionName: 'functionName',
    chain: 'chain',
    value: 'value',
    appendToCallData: 'appendToCallData',
    // ... other mappings
  },
});
```

## Use Cases

1. **DeFi Operations**: Interact with lending protocols, DEXs, and yield farms
2. **Token Management**: Handle ERC20/ERC721/ERC1155 operations
3. **Bridge Integrations**: Execute cross-chain bridge transactions with call data
4. **DAO Governance**: Execute governance proposals and votes
5. **Multi-step Workflows**: Chain multiple contract interactions

## Security Considerations

- **Policy Enforcement**: Always use appropriate policies to control which contracts and functions can be called
- **Value Limits**: Set maximum ETH values in policies to prevent large transfers
- **Gas Sponsorship**: Only enable when needed and with proper policy restrictions
- **Call Data Validation**: Use `vlCallContractAllowedCallDataPrefixes` in policies to control appended data

## Related Packages

- [@vaultlayer/vincent-policy-call-contract-whitelist](../policy-call-contract-whitelist/) - Policy for access control
- [@lit-protocol/vincent-ability-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-ability-sdk) - SDK for building Vincent Abilities
- [@lit-protocol/vincent-scaffold-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-scaffold-sdk) - Transaction utilities

## Migration from Old Tools

If you're migrating from `@lit-protocol/aw-tool-vl-call-contract`, the main changes are:

1. **Authentication**: Now uses Vincent delegation system instead of PKP-specific auth
2. **Gas Sponsorship**: New Alchemy EIP-7702 support via `alchemyGasSponsor*` parameters
3. **Policy System**: Uses Vincent policies instead of old aw-tool policy validation
4. **Parameter Names**: Same parameters maintained for backward compatibility

All existing parameters (`functionArgs`, `functionArgsBase64`, `appendToCallData`, `value`, etc.) are supported.
