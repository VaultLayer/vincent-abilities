# Vincent Ability: CoreDAO Bridge

## Overview

The CoreDAO Bridge Ability enables Vincent Apps to bridge USDC tokens between CoreDAO and other EVM chains (Base, Arbitrum, Ethereum) using LayerZero v1 protocol. This ability provides secure cross-chain transfers with automatic approval handling and fee estimation.

## Key Features

- **LayerZero v1 Integration**: Uses LayerZero's cross-chain messaging for secure bridging
- **Bidirectional Bridging**: Support for bridging TO and FROM CoreDAO
- **Automatic Approval**: Automatically handles ERC20 approvals before bridging
- **Fee Estimation**: On-chain LayerZero v1 fee estimation
- **Gas Sponsorship**: Optional EIP-7702 gas sponsorship on Base, Arbitrum, and Ethereum (NOT CoreDAO)
- **Multi-chain Support**: CoreDAO, Base, Arbitrum, Ethereum

## Supported Routes

- **Base ↔ CoreDAO**: Original Token Bridge / Wrapped Token Bridge
- **Arbitrum ↔ CoreDAO**: Original Token Bridge / Wrapped Token Bridge
- **CoreDAO → Ethereum**: Wrapped Token Bridge only

## Installation

```bash
npm install @vaultlayer/vincent-ability-coredao-bridge
# or
pnpm add @vaultlayer/vincent-ability-coredao-bridge
# or
yarn add @vaultlayer/vincent-ability-coredao-bridge
```

## Basic Usage

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-coredao-bridge';

// Bridge USDC from Base to CoreDAO
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    sourceChain: 'base',
    destinationChain: 'coreDao',
    amount: '100.5', // 100.5 USDC
    rpcUrl: 'https://mainnet.base.org',
  },
});

// Bridge USDC from CoreDAO to Arbitrum
const result2 = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    sourceChain: 'coreDao',
    destinationChain: 'arbitrum',
    amount: '50',
    rpcUrl: 'https://rpc.coredao.org',
  },
});
```

## Parameters

### Required Parameters

#### sourceChain

- **Type**: `'base' | 'arbitrum' | 'ethereum' | 'coreDao'`
- **Description**: Source chain for the bridge operation

#### destinationChain

- **Type**: `'base' | 'arbitrum' | 'ethereum' | 'coreDao'`
- **Description**: Destination chain for the bridge operation

#### amount

- **Type**: `string`
- **Description**: Amount of USDC to bridge as a decimal string
- **Example**: `'100.5'` (100.5 USDC)

### Optional Parameters

#### rpcUrl

- **Type**: `string`
- **Description**: RPC URL for the source chain (optional, will use default if not provided)
- **Example**: `'https://mainnet.base.org'`

#### alchemyGasSponsor

- **Type**: `boolean`
- **Description**: Whether to use Alchemy's gas sponsorship (EIP-7702)
- **Default**: `false`
- **Note**: NOT supported on CoreDAO chain

#### alchemyGasSponsorApiKey

- **Type**: `string`
- **Description**: Alchemy API key for gas sponsorship (required if `alchemyGasSponsor` is `true`)

#### alchemyGasSponsorPolicyId

- **Type**: `string`
- **Description**: Alchemy gas policy ID for sponsorship (required if `alchemyGasSponsor` is `true`)

## Bridge Types

### Original Token Bridge

Used for bridging **TO** CoreDAO from Base or Arbitrum:

- Contract: Original Token Bridge on source chain
- Function: `bridge(address token, uint256 amountLD, address to, tuple(address refundAddress,address zroPaymentAddress) callParams, bytes adapterParams) payable`

### Wrapped Token Bridge

Used for bridging **FROM** CoreDAO to Base, Arbitrum, or Ethereum:

- Contract: CoreDAO Wrapped Token Bridge
- Function: `bridge(address localToken, uint16 remoteChainId, uint256 amount, address to, bool unwrapWeth, tuple(address refundAddress,address zroPaymentAddress) callParams, bytes adapterParams) payable`

## Contract Addresses

### LayerZero v1 Bridge Contracts

- **Base Original Token Bridge**: `0x84FB2086Fed7b3c9b3a4Bc559f60fFaA91507879`
- **Arbitrum Original Token Bridge**: `0x29d096cd18c0da7500295f082da73316d704031a`
- **CoreDAO Wrapped Token Bridge**: `0xA4218e1F39DA4AaDaC971066458Db56e901bcbdE`

### USDC Token Addresses

- **Base**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Arbitrum**: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- **Ethereum**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- **CoreDAO**: `0xa4151b2b3e269645181dccf2d426ce75fcbdeca9`

## How It Works

1. **Precheck Phase**:

   - Validates route is supported
   - Checks native token balance (if not using gas sponsorship)
   - Verifies USDC balance meets required amount
   - Estimates LayerZero v1 bridge fees
   - Checks USDC allowance for bridge contract

2. **Execute Phase**:
   - Ensures USDC approval (sends approval tx if needed with MaxUint256)
   - Estimates LayerZero v1 bridge fees on-chain
   - Executes bridge transaction with appropriate LayerZero v1 contract
   - Returns transaction hash immediately

## Gas Sponsorship

Gas sponsorship via Alchemy (EIP-7702) is supported on:

- ✅ Base
- ✅ Arbitrum
- ✅ Ethereum
- ❌ CoreDAO (NOT supported)

If attempting to use gas sponsorship on CoreDAO, the ability will fail during precheck.

## Approval Handling

Unlike some bridge abilities, this ability uses an inline approval pattern:

- Single "bridge" action
- Approval happens automatically before bridging if needed
- Approves `MaxUint256` to minimize approval transactions
- Reuses existing approval if sufficient

## Differences from Across Bridge

| Feature             | CoreDAO Bridge                                     | Across Bridge                   |
| ------------------- | -------------------------------------------------- | ------------------------------- |
| **Protocol**        | LayerZero v1                                       | Across Protocol                 |
| **Routes**          | Base↔CoreDAO, Arbitrum↔CoreDAO, CoreDAO→Ethereum | Base↔Arbitrum↔Ethereum        |
| **Fee Model**       | On-chain contract call                             | API-driven                      |
| **Approval**        | Inline (single action)                             | Separate approve/bridge actions |
| **Gas Sponsorship** | Partial (not on CoreDAO)                           | Full support                    |
| **Speed**           | 5-15 minutes                                       | 2-5 minutes                     |

## Error Handling

The ability will fail gracefully with descriptive error messages for:

- Unsupported routes
- Insufficient USDC balance
- Insufficient gas balance
- Invalid chain configuration
- Gas sponsorship on CoreDAO
- Bridge transaction failures

## Examples

### Bridge from Base to CoreDAO

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    sourceChain: 'base',
    destinationChain: 'coreDao',
    amount: '100',
  },
});

console.log('Bridge tx hash:', result.bridgeTxHash);
```

### Bridge from CoreDAO to Arbitrum with Gas Sponsorship

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    sourceChain: 'coreDao',
    destinationChain: 'arbitrum',
    amount: '50',
    // Note: Gas sponsorship not supported on CoreDAO
    alchemyGasSponsor: false,
  },
});
```

### Bridge from Arbitrum to CoreDAO with Gas Sponsorship

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    sourceChain: 'arbitrum',
    destinationChain: 'coreDao',
    amount: '75',
    alchemyGasSponsor: true,
    alchemyGasSponsorApiKey: 'YOUR_API_KEY',
    alchemyGasSponsorPolicyId: 'YOUR_POLICY_ID',
  },
});
```

## License

MIT
