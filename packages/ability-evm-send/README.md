# Vincent Ability: EVM Send

A unified Vincent Ability for secure EVM transfers supporting both native ETH and ERC20 tokens with integrated policy-based governance, balance validation, and multi-network support.

## Overview

The `evm-send` ability enables secure EVM transfers through the Vincent Framework, providing:

- Secure transfers using PKP (Programmable Key Pair) wallets
- Automatic token decimals detection for ERC20 tokens
- Policy-based governance with recipient whitelisting
- Balance validation for both native gas fees and token amounts
- Multi-network support (precheck uses rpcUrl; execute resolves RPC via the `chain` parameter)
- Real-time transaction execution with detailed logging and error handling

## Key Features

### 🌉 Unified Native and ERC20 Support

- Works with any ERC20 token or native ETH
- Automatically fetches token decimals from the contract (for ERC20)
- Token balance validation before transfer execution
- Native ETH balance validation

### 🔐 PKP-Based Security

- Uses Lit Protocol's PKP wallets for secure transaction signing
- Delegated execution with proper permission validation
- No private key exposure during transaction execution

### 🚦 Policy Integration

- Integrated with `evm-recipients` policy for recipient whitelisting
- Recipient address validation against allowlist
- Delegator's ETH address automatically included in allowlist

### 🌐 Multi-Network Support

- Precheck uses the provided RPC URL (rpcUrl)
- Execute resolves RPC via the `chain` parameter using Lit Actions
- Works with any EVM-compatible network

### ✅ Comprehensive Validation

- Ethereum address format validation for recipient and token contract (if ERC20)
- Amount validation (must be a positive decimal string)
- RPC URL required for precheck
- Native balance check for gas fees
- Token balance check before transfer

## Parameters

All functions accept the following parameters:

| Parameter                   | Type      | Description                                                                                                                                 |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `rpcUrl`                    | `string`  | RPC URL used during precheck validations                                                                                                    |
| `chain`                     | `string`  | Lit [supported EVM chain name](https://developer.litprotocol.com/resources/supported-chains) used during execute (e.g., 'base', 'ethereum') |
| `to`                        | `string`  | Recipient address (0x...)                                                                                                                   |
| `tokenAddress`              | `string`  | ERC-20 token contract address (0x...) - optional, omit or use zero address for native ETH transfers                                         |
| `amount`                    | `string`  | Amount in human-readable string (e.g., "1.23")                                                                                              |
| `alchemyGasSponsor`         | `boolean` | Whether to use Alchemy's gas sponsorship (EIP-7702)                                                                                         |
| `alchemyGasSponsorApiKey`   | `string`  | Alchemy API key for gas sponsorship (required if alchemyGasSponsor is true)                                                                 |
| `alchemyGasSponsorPolicyId` | `string`  | Alchemy gas policy ID for sponsorship (required if alchemyGasSponsor is true)                                                               |

## Usage Examples

### Native ETH Transfer

```typescript
const transferParams = {
  rpcUrl: 'https://base.llamarpc.com',
  chain: 'base',
  to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  amount: '0.05', // No tokenAddress means native ETH
};
```

### USDC Transfer on Base Network

```typescript
const transferParams = {
  rpcUrl: 'https://base.llamarpc.com',
  chain: 'base',
  to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
  amount: '10.50',
};
```

### Using Zero Address for Native Transfer

```typescript
const transferParams = {
  rpcUrl: 'https://base.llamarpc.com',
  chain: 'base',
  to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  tokenAddress: '0x0000000000000000000000000000000000000000', // Zero address = native ETH
  amount: '0.1',
};
```

## Execution Flow

### 1. Precheck Phase

- Validates recipient address format
- Validates token contract address format (if ERC20)
- Validates transfer amount (positive, reasonable limits)
- Validates token decimals (0-18 range) if ERC20
- Validates RPC URL format (if provided)
- Validates chain ID (if provided)
- Checks native ETH balance for gas fees
- Checks token balance if ERC20
- Returns validation status

### 2. Execute Phase

- Connects to specified chain
- Retrieves PKP public key from delegation context
- Converts PKP public key to Ethereum address
- Parses token amount using retrieved number of decimals (if ERC20)
- Executes transfer (native or ERC20)
- Triggers policy commit phase
- Returns transaction hash and metadata

## Policy Integration

The ability automatically integrates with the `evm-recipients` policy:

- **Precheck**: Validates ability parameters
- **Execute**: Performs the actual transfer
- **Policy Evaluate**: Validates recipient is in allowlist
- **Policy Commit**: Records the transaction

### Policy Configuration

```typescript
// Example: Allow transfers to specific addresses
const policyConfig = {
  allowedRecipients: [
    '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    '0x8ba1f109551bD432803012645Hac136c80842C',
  ],
};
```

Note: The delegator's ETH address is automatically added to the allowed recipients list.

## Error Handling

The ability provides detailed error messages for various failure scenarios:

### Address Validation Errors

```
"Invalid recipient address format"
"Invalid token contract address format"
```

### Amount Validation Errors

```
"Invalid amount format or amount must be greater than 0"
"Amount too large (maximum 1,000,000 tokens per transaction)"
```

### Balance Validation Errors

```
"Insufficient native balance for gas. Need 0.0001 ETH, but only have 0.00005 ETH"
"Insufficient token balance. Need 100.0 tokens, but only have 50.0 tokens"
```

### Network Errors

```
"Invalid RPC URL format"
"Unable to obtain blockchain provider for transfer operations"
"PKP public key not available from delegation context"
```

### Transaction Errors

```
"Unknown error occurred"
```

## Response Format

### Success Response

```typescript
{
  txHash: "0x...",
  to: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  amount: "10.50",
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  // if ERC20, omitted if native
  timestamp: 1703123456789,
  isNative: true  // or false if ERC20
}
```

### Error Response

```typescript
{
  error: 'Detailed error message';
}
```

## Development

### Building

```bash
npm install
npm run build
```

### Testing

This ability is tested through the Vincent E2E testing framework:

- `npm run vincent:e2e:evm-send` - Tests both native and ERC20 transfers

### Architecture

The ability follows the Vincent two-phase execution model:

1. **Precheck** - Parameter validation outside Lit Actions
2. **Execute** - Transaction execution within Lit Actions

## Security Considerations

- **Balance validation**: Comprehensive checks for both native gas fees and token balances
- **PKP security**: Uses Lit Protocol's secure PKP system
- **Policy enforcement**: Integrated recipient whitelisting prevents unauthorized transfers
- **Network validation**: RPC URL and chain validation prevents malicious endpoints

## Supported Networks

- **Base Mainnet** (Chain ID: 8453)
- **Ethereum Mainnet** (Chain ID: 1)
- **Polygon** (Chain ID: 137)
- **Arbitrum** (Chain ID: 42161)
- **Any EVM-compatible network supported by Lit**

### Popular Token Addresses

#### Base Network

- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **WETH**: `0x4200000000000000000000000000000000000006`

#### Ethereum Mainnet

- **USDC**: `0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8`
- **USDT**: `0xdAC17F958D2ee523a2206206994597C13D831ec7`

## Dependencies

- `@lit-protocol/vincent-scaffold-sdk` - Core Vincent framework
- `@lit-protocol/vincent-ability-sdk` - Ability development framework
- `@vaultlayer/vincent-policy-evm-recipients` - EVM recipient whitelisting policy
- `ethers.js` - Blockchain interaction
- `zod` - Schema validation and type safety
