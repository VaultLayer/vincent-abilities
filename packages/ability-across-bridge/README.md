# Vincent Ability: Across Bridge

## Overview

The Across Bridge Ability enables Vincent Apps to bridge USDC tokens across EVM chains (Base, Arbitrum, Ethereum) using the Across Protocol. This ability provides fast, secure cross-chain transfers with automatic approval handling and fee estimation.

## Key Features

- **Across Protocol Integration**: Uses Across Protocol's SpokePool contracts for secure bridging
- **Bidirectional Bridging**: Support for bridging between Base, Arbitrum, and Ethereum
- **Automatic Approval**: Separates approval and bridge operations for flexible workflows
- **Fee Estimation**: API-driven fee estimation via Across API
- **Gas Sponsorship**: Optional EIP-7702 gas sponsorship on all supported chains
- **Multi-chain Support**: Base, Arbitrum, Ethereum

## Supported Routes

- **Base ↔ Arbitrum**: Via Across Protocol SpokePool
- **Base ↔ Ethereum**: Via Across Protocol SpokePool
- **Arbitrum ↔ Ethereum**: Via Across Protocol SpokePool

## Installation

```bash
npm install @vaultlayer/vincent-ability-across-bridge
# or
pnpm add @vaultlayer/vincent-ability-across-bridge
# or
yarn add @vaultlayer/vincent-ability-across-bridge
```

## Basic Usage

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-across-bridge';

// Bridge USDC from Base to Arbitrum
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'bridge',
    sourceChain: 'base',
    destinationChain: 'arbitrum',
    amount: '100.5', // 100.5 USDC
    rpcUrl: 'https://mainnet.base.org',
  },
});

// Approve USDC for bridging (separate action)
const approvalResult = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'approve',
    sourceChain: 'base',
    destinationChain: 'arbitrum',
    amount: '100.5',
    rpcUrl: 'https://mainnet.base.org',
  },
});
```

## Parameters

### Required Parameters

#### action

- **Type**: `'approve' | 'bridge'`
- **Description**: Whether to perform an ERC20 approval or a bridge operation
- **Note**: Approval must be done before bridging (unless sufficient allowance already exists)

#### sourceChain

- **Type**: `'base' | 'arbitrum' | 'ethereum'`
- **Description**: Source chain for the bridge operation

#### destinationChain

- **Type**: `'base' | 'arbitrum' | 'ethereum'`
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

#### alchemyGasSponsorApiKey

- **Type**: `string`
- **Description**: Alchemy API key for gas sponsorship (required if `alchemyGasSponsor` is `true`)

#### alchemyGasSponsorPolicyId

- **Type**: `string`
- **Description**: Alchemy gas policy ID for sponsorship (required if `alchemyGasSponsor` is `true`)

## Contract Addresses

### Across SpokePool Contracts

- **Base SpokePool**: `0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64`
- **Arbitrum SpokePool**: `0xe35e9842fceaCA96570B734083f4a58e8F7C5f2A`
- **Ethereum SpokePool**: `0x4D9079Bb4165aeb4084c526a32695dCfd2F77381`

### USDC Token Addresses

- **Base**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Arbitrum**: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- **Ethereum**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

## How It Works

1. **Precheck Phase**:

   - Validates route is supported by Across Protocol
   - Checks native token balance (if not using gas sponsorship)
   - Verifies USDC balance meets required amount
   - Queries Across API for fee estimation
   - Checks USDC allowance for SpokePool contract

2. **Execute Phase (approve action)**:

   - Checks current USDC allowance
   - Sends approval transaction if needed (approves MaxUint256)
   - Returns approval transaction hash

3. **Execute Phase (bridge action)**:
   - Ensures USDC approval (fails if insufficient allowance)
   - Queries Across API for suggested fees
   - Builds deposit parameters with Across integrator ID
   - Executes deposit transaction via SpokePool contract
   - Returns bridge transaction hash immediately

## Gas Sponsorship

Gas sponsorship via Alchemy (EIP-7702) is supported on all chains:

- ✅ Base
- ✅ Arbitrum
- ✅ Ethereum

When enabled, transactions are sent as user operations and do not require native token balance.

## Approval Handling

This ability uses a two-step approval pattern:

- **Separate Actions**: Approval and bridge are separate actions
- **Flexible Workflow**: Approve once, bridge multiple times
- **Max Approval**: Approves `MaxUint256` to minimize approval transactions
- **Reusable**: Once approved, can bridge multiple times without re-approving

## Differences from CoreDAO Bridge

| Feature             | Across Bridge                   | CoreDAO Bridge                                     |
| ------------------- | ------------------------------- | -------------------------------------------------- |
| **Protocol**        | Across Protocol                 | LayerZero v1                                       |
| **Routes**          | Base↔Arbitrum↔Ethereum        | Base↔CoreDAO, Arbitrum↔CoreDAO, CoreDAO→Ethereum |
| **Fee Model**       | API-driven                      | On-chain contract call                             |
| **Approval**        | Separate approve/bridge actions | Inline (single action)                             |
| **Gas Sponsorship** | Full support                    | Partial (not on CoreDAO)                           |
| **Speed**           | 2-5 minutes                     | 5-15 minutes                                       |

## Error Handling

The ability will fail gracefully with descriptive error messages for:

- Unsupported routes
- Insufficient USDC balance
- Insufficient allowance (when bridging without approval)
- Insufficient gas balance (when not using gas sponsorship)
- Invalid chain configuration
- Bridge transaction failures

## Examples

### Approve USDC for Bridging

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'approve',
    sourceChain: 'base',
    destinationChain: 'arbitrum',
    amount: '1000', // Approve enough for multiple bridges
  },
});

console.log('Approval tx hash:', result.approvalTxHash);
```

### Bridge USDC from Base to Arbitrum

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'bridge',
    sourceChain: 'base',
    destinationChain: 'arbitrum',
    amount: '100',
  },
});

console.log('Bridge tx hash:', result.bridgeTxHash);
console.log('Estimated output:', result.estimatedOutputAmount);
```

### Bridge with Gas Sponsorship

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'bridge',
    sourceChain: 'arbitrum',
    destinationChain: 'ethereum',
    amount: '50',
    alchemyGasSponsor: true,
    alchemyGasSponsorApiKey: 'YOUR_API_KEY',
    alchemyGasSponsorPolicyId: 'YOUR_POLICY_ID',
  },
});

console.log('User operation hash:', result.bridgeTxUserOperationHash);
```

## API Endpoints

The ability uses the following Across Protocol API endpoints:

- **Suggested Fees**: `https://app.across.to/api/suggested-fees`
- **Deposit Status**: `https://indexer.api.across.to/deposit/status`

No API keys are required - these are public endpoints.

## Response Format

### Success Response (bridge action)

```typescript
{
  bridgeTxHash: '0x...', // Transaction hash
  bridgeTxUserOperationHash: '0x...', // User operation hash (if gas sponsored)
  sourceChain: 'base',
  destinationChain: 'arbitrum',
  amount: '100',
  estimatedOutputAmount: '99.8' // After fees
}
```

### Success Response (approve action)

```typescript
{
  approvalTxHash: '0x...', // Transaction hash
  approvalTxUserOperationHash: '0x...', // User operation hash (if gas sponsored)
  currentAllowance: '0',
  requiredAllowance: '115792089237316195423570985008687907853269984665640564039457584007913129639935' // MaxUint256
}
```

## Use Cases

- Cross-chain DeFi operations
- Multi-chain portfolio management
- Cross-chain payments and remittances
- Arbitrage opportunities across chains
- Liquidity management across ecosystems

## Security Considerations

- **Approval Pattern**: Separate approval step provides additional control
- **Max Approval**: Approves MaxUint256 - ensure you trust the SpokePool contracts
- **Route Validation**: Only supports Across Protocol routes
- **Balance Checks**: Validates sufficient balance before bridging
- **Gas Sponsorship**: Use with caution and proper policy restrictions

## License

MIT
