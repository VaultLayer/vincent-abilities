# Vincent Ability: Bitcoin Bridge

## Overview

The Bitcoin Bridge Ability enables Vincent Apps to bridge wrapped Bitcoin (cbBTC on Base or WBTC on Ethereum) to native Bitcoin using THORChain. This ability provides secure cross-chain Bitcoin transfers with automatic approval handling and fee estimation.

## Key Features

- **THORChain Integration**: Uses THORChain's router contracts for Bitcoin bridging
- **Wrapped Bitcoin Support**: Supports cbBTC on Base and WBTC on Ethereum
- **Native Bitcoin Output**: Always bridges to PKP-derived Bitcoin address
- **PKP Address Derivation**: Automatically derives Bitcoin address from PKP public key
- **Automatic Approval**: Separates approval and bridge operations for flexible workflows
- **Gas Sponsorship**: Optional EIP-7702 gas sponsorship on Base and Ethereum

## Supported Routes

- **Base → Bitcoin**: Bridge cbBTC to native Bitcoin
- **Ethereum → Bitcoin**: Bridge WBTC to native Bitcoin

## Installation

```bash
npm install @vaultlayer/vincent-ability-btc-bridge
# or
pnpm add @vaultlayer/vincent-ability-btc-bridge
# or
yarn add @vaultlayer/vincent-ability-btc-bridge
```

## Basic Usage

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-btc-bridge';

// Bridge cbBTC from Base to native Bitcoin
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'bridge',
    sourceChain: 'base',
    amount: '0.1', // 0.1 cbBTC
    btcNetwork: 'livenet', // or 'testnet'
    rpcUrl: 'https://mainnet.base.org',
  },
});

// Approve wrapped BTC for bridging (separate action)
const approvalResult = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'approve',
    sourceChain: 'base',
    amount: '1.0',
    btcNetwork: 'livenet',
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

- **Type**: `'base' | 'ethereum'`
- **Description**: Source chain for the bridge operation

#### amount

- **Type**: `string`
- **Description**: Amount of wrapped BTC to bridge as a decimal string
- **Example**: `'0.1'` (0.1 BTC)
- **Minimum**: 0.001 BTC

#### btcNetwork

- **Type**: `'testnet' | 'livenet'`
- **Description**: The Bitcoin network to bridge to

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

### Wrapped Bitcoin Token Addresses

- **Base cbBTC**: `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf`
- **Ethereum WBTC**: `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599`

Both tokens have 8 decimals (standard Bitcoin decimals).

## How It Works

1. **Precheck Phase**:

   - Validates source chain is supported
   - Checks native token balance (if not using gas sponsorship)
   - Verifies wrapped BTC balance meets required amount (minimum 0.001 BTC)
   - Validates Bitcoin destination address format
   - Queries THORChain for inbound address and quote
   - Checks wrapped BTC allowance for THORChain router
   - Derives PKP Bitcoin address if destination not provided

2. **Execute Phase (approve action)**:

   - Checks current wrapped BTC allowance
   - Sends approval transaction if needed (approves MaxUint256)
   - Returns approval transaction hash

3. **Execute Phase (bridge action)**:
   - Ensures wrapped BTC approval (fails if insufficient allowance)
   - Fetches THORChain inbound address and quote
   - Validates quote tolerance (within 50 bps of expected)
   - Builds THORChain memo with destination address
   - Executes deposit transaction via THORChain router
   - Returns bridge transaction hash immediately

## THORChain Integration

The ability interacts with THORChain through:

- **API Endpoints**:
  - Inbound Addresses: `https://thornode.ninerealms.com/thorchain/inbound_addresses`
  - Quote: `https://thornode.ninerealms.com/thorchain/quote/swap`
- **Router Contract**: Uses THORChain's router for deposits
- **Quote Tolerance**: Validates quotes are within 0.5% of expected amount

## Gas Sponsorship

Gas sponsorship via Alchemy (EIP-7702) is supported on:

- ✅ Base
- ✅ Ethereum

When enabled, transactions are sent as user operations and do not require native token balance.

## Approval Handling

This ability uses a two-step approval pattern:

- **Separate Actions**: Approval and bridge are separate actions
- **Flexible Workflow**: Approve once, bridge multiple times
- **Max Approval**: Approves `MaxUint256` to minimize approval transactions
- **Reusable**: Once approved, can bridge multiple times without re-approving

## PKP Bitcoin Address Derivation

The ability can automatically derive a Bitcoin address from the PKP's public key:

- Uses secp256k1 public key compression
- Derives P2WPKH (native SegWit) address
- Supports both testnet and mainnet
- Automatically included in allowed outputs by policy

## Policy Integration

This ability works with the Bitcoin Bridge Policy:

- Validates destination Bitcoin address against allowed outputs
- Automatically includes PKP-derived Bitcoin address in allowed list
- Supports custom whitelist of allowed Bitcoin addresses
- Prevents bridging to unauthorized addresses

## Error Handling

The ability will fail gracefully with descriptive error messages for:

- Unsupported source chains
- Insufficient wrapped BTC balance
- Amount below minimum (0.001 BTC)
- Invalid Bitcoin address format
- Insufficient allowance (when bridging without approval)
- Insufficient gas balance (when not using gas sponsorship)
- THORChain quote validation failures
- Bridge transaction failures

## Examples

### Approve Wrapped BTC for Bridging

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'approve',
    sourceChain: 'base',
    amount: '1.0',
    btcNetwork: 'livenet',
  },
});

console.log('Approval tx hash:', result.approvalTxHash);
```

### Bridge to PKP Bitcoin Address

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'bridge',
    sourceChain: 'base',
    amount: '0.1',
    btcNetwork: 'livenet',
  },
});

console.log('Bridge tx hash:', result.bridgeTxHash);
console.log('Estimated output BTC:', result.estimatedOutputBtc);
```

### Bridge with Gas Sponsorship

```typescript
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    action: 'bridge',
    sourceChain: 'base',
    amount: '0.1',
    btcNetwork: 'livenet',
    alchemyGasSponsor: true,
    alchemyGasSponsorApiKey: 'YOUR_API_KEY',
    alchemyGasSponsorPolicyId: 'YOUR_POLICY_ID',
  },
});

console.log('User operation hash:', result.bridgeTxUserOperationHash);
```

## Response Format

### Success Response (bridge action)

```typescript
{
  bridgeTxHash: '0x...', // Transaction hash
  bridgeTxUserOperationHash: '0x...', // User operation hash (if gas sponsored)
  sourceChain: 'base',
  destinationBtcAddress: 'bc1q...',
  amount: '0.1',
  estimatedOutputBtc: '0.0995', // After fees
  thorMemo: '=:BTC.BTC:bc1q...' // THORChain memo
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

- Convert wrapped Bitcoin to native Bitcoin
- Withdraw Bitcoin from DeFi protocols
- Cross-chain Bitcoin management
- Bitcoin custody and self-custody workflows
- Multi-chain Bitcoin portfolio management

## Security Considerations

- **Minimum Amount**: 0.001 BTC minimum prevents dust attacks
- **Address Validation**: Validates Bitcoin address format before bridging
- **Policy Enforcement**: Use Bitcoin Bridge Policy to restrict destination addresses
- **Quote Validation**: Validates THORChain quotes are within tolerance
- **PKP Security**: Uses PKP-derived keys for secure transaction signing
- **Approval Pattern**: Separate approval step provides additional control

## Related Packages

- [@lit-protocol/vincent-ability-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-ability-sdk) - SDK for building Vincent Abilities
- [@lit-protocol/vincent-scaffold-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-scaffold-sdk) - Transaction utilities

## License

MIT
