# Vincent Ability: Molten Swap

## Overview

The Molten Swap Ability enables Vincent Apps to swap tokens on the CoreDAO chain using Molten DEX (a Uniswap V4 fork). This ability provides token swapping functionality with automatic approval handling and supports both approve and swap actions.

## Key Features

- **Molten DEX Integration**: Uses Molten DEX router for token swaps on CoreDAO
- **Separate Actions**: Supports both approve and swap actions for flexible workflows
- **Automatic Token Validation**: Validates that tokens are supported by Molten DEX
- **Automatic Approval**: Handles ERC20 approvals before swapping
- **Minimum Output Protection**: Supports minimum output amount for slippage protection
- **CoreDAO Only**: Exclusively works on CoreDAO chain (Chain ID: 1116)

## Supported Tokens

The ability supports the following tokens on CoreDAO:

- **USDT**: `0x900101d06a7426441ae63e9ab3b9b0f63be145f1` (6 decimals)
- **USDC**: `0xa4151b2b3e269645181dccf2d426ce75fcbdeca9` (6 decimals)
- **wBTC**: `0x5832f53d147b3d6cd4578b9cbd62425c7ea9d0bd` (8 decimals)
- **wCORE**: `0x191e94fa59739e188dce837f7f6978d84727ad01` (18 decimals)
- **vltCORE**: `0x3093304eCE0F35969B580CbD155a1357829870f2` (18 decimals)
- **ASX**: `0xB28B43209d9de61306172Af0320f4f55e50E2f29` (18 decimals)

Tokens can be referenced by either their address or symbol (e.g., `'USDC'` or `'0xa4151b2b3e269645181dccf2d426ce75fcbdeca9'`).

## Installation

```bash
npm install @vaultlayer/vincent-ability-molten-swap
# or
pnpm add @vaultlayer/vincent-ability-molten-swap
# or
yarn add @vaultlayer/vincent-ability-molten-swap
```

## Basic Usage

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-molten-swap';

// Swap USDC for USDT on Molten DEX
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'swap',
    tokenIn: 'USDC',
    tokenOut: 'USDT',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amountIn: '100.5', // 100.5 USDC
    amountOutMinimum: '99.0', // Minimum 99 USDT expected
    rpcUrl: 'https://rpc.coredao.org', // Optional
  },
});

// Approve USDC for swapping (separate action)
const approvalResult = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'approve',
    tokenIn: 'USDC',
    tokenOut: 'USDT', // Required but not used for approve action
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Required but not used for approve action
    amountIn: '1000', // Amount to approve
    rpcUrl: 'https://rpc.coredao.org',
  },
});
```

## Parameters

### Required Parameters

#### action

- **Type**: `'approve' | 'swap'`
- **Description**: Whether to perform an ERC20 approval or a swap operation
- **Note**: Approval must be done before swapping (unless sufficient allowance already exists)

#### tokenIn

- **Type**: `string`
- **Description**: Input token address or symbol
- **Example**: `'USDC'` or `'0xa4151b2b3e269645181dccf2d426ce75fcbdeca9'`
- **Validation**: Must be a supported token address or symbol

#### tokenOut

- **Type**: `string`
- **Description**: Output token address or symbol
- **Example**: `'USDT'` or `'0x900101d06a7426441ae63e9ab3b9b0f63be145f1'`
- **Validation**: Must be a supported token address or symbol
- **Note**: Required for swap action, may be unused for approve action

#### recipient

- **Type**: `string`
- **Description**: Recipient address for the swapped tokens
- **Example**: `'0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'`
- **Validation**: Must be a valid Ethereum address
- **Note**: Required for swap action, may be unused for approve action

#### amountIn

- **Type**: `string`
- **Description**: Input amount as a decimal string
- **Example**: `'100.5'` (100.5 tokens)
- **Note**: Decimals are handled automatically based on token type

### Optional Parameters

#### amountOutMinimum

- **Type**: `string`
- **Description**: Minimum output amount as a decimal string for slippage protection
- **Default**: `'0'`
- **Example**: `'99.0'` (minimum 99 tokens expected)
- **Note**: Use this to protect against excessive slippage

#### rpcUrl

- **Type**: `string`
- **Description**: RPC URL for CoreDAO chain (optional, defaults to `https://rpc.coredao.org`)
- **Example**: `'https://rpc.coredao.org'`

## Contract Addresses

### Molten DEX Contracts (CoreDAO)

- **Factory**: `0x74EfE55beA4988e7D92D03EFd8ddB8BF8b7bD597`
- **Router**: `0x832933BA44658C50ae6152039Cd30A6f4C2432b1`
- **Quoter**: `0x20dA24b5FaC067930Ced329A3457298172510Fe7`
- **NonfungiblePositionManager**: `0x1F98431c8aD98523631AE4a59f267346ea31F984`
- **Chain ID**: `1116`
- **Block Explorer**: `https://scan.coredao.org`

## How It Works

1. **Precheck Phase**:

   - Validates native token balance (for gas fees)
   - Validates `tokenIn` is supported by Molten DEX
   - Validates `tokenOut` is supported by Molten DEX (for swap action)
   - Checks ERC20 balance of `tokenIn`
   - Checks ERC20 allowance for Molten router
   - Returns current allowance status

2. **Execute Phase (approve action)**:

   - Checks current allowance for Molten router
   - If sufficient, returns success without transaction
   - If insufficient, sends approval transaction with MaxUint256
   - Returns approval transaction hash

3. **Execute Phase (swap action)**:
   - Validates tokens are supported
   - Ensures allowance is sufficient (fails if not)
   - Builds swap parameters with recipient and minimum output
   - Executes swap transaction via Molten router
   - Returns swap transaction hash

## Approval Handling

This ability uses a two-step approval pattern:

- **Separate Actions**: Approval and swap are separate actions
- **Flexible Workflow**: Approve once, swap multiple times
- **Max Approval**: Approves `MaxUint256` to minimize approval transactions
- **Reusable**: Once approved, can swap multiple times without re-approving

## Error Handling

The ability will fail gracefully with descriptive error messages for:

- Unsupported token addresses or symbols
- Insufficient token balance
- Insufficient allowance (when swapping without approval)
- Insufficient native token balance (for gas)
- Invalid recipient address
- Swap transaction failures

## Examples

### Approve Tokens for Swapping

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'approve',
    tokenIn: 'USDC',
    tokenOut: 'USDT', // Required parameter but not used for approve
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Required parameter but not used for approve
    amountIn: '1000', // Approve enough for multiple swaps
  },
});

console.log('Approval tx hash:', result.approvalTxHash);
console.log('Current allowance:', result.currentAllowance);
```

### Swap USDC to USDT

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'swap',
    tokenIn: 'USDC',
    tokenOut: 'USDT',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amountIn: '100',
    amountOutMinimum: '99', // 1% slippage tolerance
  },
});

console.log('Swap tx hash:', result.swapTxHash);
```

### Swap Using Token Addresses

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'swap',
    tokenIn: '0xa4151b2b3e269645181dccf2d426ce75fcbdeca9', // USDC address
    tokenOut: '0x5832f53d147b3d6cd4578b9cbd62425c7ea9d0bd', // wBTC address
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amountIn: '1000',
    amountOutMinimum: '0.001', // Minimum wBTC expected
  },
});
```

### Swap with Custom RPC

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'swap',
    tokenIn: 'wCORE',
    tokenOut: 'vltCORE',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amountIn: '50',
    rpcUrl: 'https://custom-rpc.coredao.org',
  },
});
```

## Response Format

### Success Response (swap action)

```typescript
{
  swapTxHash: '0x...', // Transaction hash
  approvalTxHash: undefined, // No approval needed
  currentAllowance: undefined,
  requiredAllowance: undefined
}
```

### Success Response (approve action)

```typescript
{
  approvalTxHash: '0x...', // Transaction hash (if new approval created)
  swapTxHash: undefined,
  currentAllowance: '115792089237316195423570985008687907853269984665640564039457584007913129639935', // MaxUint256
  requiredAllowance: '1000000000' // Requested amount
}
```

### Error Response

```typescript
{
  reason: 'Token with address "0x..." is not supported by Molten DEX on CoreDAO';
}
```

## Use Cases

- Token swaps on CoreDAO via Molten DEX
- DeFi portfolio management on CoreDAO
- Liquidity provision preparation
- Multi-token workflows on CoreDAO
- Automated trading strategies

## Security Considerations

- **Token Validation**: Only allows swaps between supported tokens
- **Approval Pattern**: Separate approval step provides additional control
- **Max Approval**: Approves MaxUint256 - ensure you trust the Molten router
- **Slippage Protection**: Use `amountOutMinimum` to protect against excessive slippage
- **Chain Specific**: Only works on CoreDAO chain (Chain ID: 1116)

## Limitations

- **CoreDAO Only**: This ability only works on CoreDAO chain
- **Supported Tokens Only**: Can only swap between pre-configured supported tokens
- **No Gas Sponsorship**: Gas sponsorship (EIP-7702) is not supported on CoreDAO
- **Requires Approval**: Must approve tokens before swapping (unless sufficient allowance exists)

## Related Packages

- [@lit-protocol/vincent-ability-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-ability-sdk) - SDK for building Vincent Abilities
- [@lit-protocol/vincent-scaffold-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-scaffold-sdk) - Transaction utilities

## License

MIT
