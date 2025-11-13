# Vincent Ability Aave

A Vincent Ability to interact with Aave protocol (supply, borrow, withdraw, repay) from a Vincent app on behalf of the delegator.

## Overview

The Vincent Ability Aave is part of the Vincent Abilities ecosystem and is built using the Vincent Ability SDK. It allows
Vincent apps to interact with Aave protocol on behalf of users, enabling seamless integration with DeFi lending and borrowing
operations.

## Features

- Supply assets to Aave pools
- Borrow assets from Aave pools
- Withdraw supplied assets from Aave
- Repay borrowed assets to Aave
- Support for multiple chains including Ethereum, Arbitrum, Base, Polygon, Optimism, Avalanche, BSC, and CoreDAO
- Automatic ERC20 approval handling for supply and repay operations
- Optional Alchemy gas sponsorship (EIP-7702)

## Installation

```bash
npm install @vaultlayer/vincent-ability-aave
```

## Usage

This ability can be used in Vincent apps to interact with Aave protocol:

```typescript
import { getVincentAbilityClient } from '@lit-protocol/vincent-app-sdk/abilityClient';
import { bundledVincentAbility, AaveOperation } from '@vaultlayer/vincent-ability-aave';

// One of delegatee signers from your app's Vincent Dashboard
const delegateeSigner = new ethers.Wallet('YOUR_DELEGATEE_PRIVATE_KEY');

// Initialize the Vincent Ability Client
const abilityClient = getVincentAbilityClient({
  ethersSigner: delegateeSigner,
  bundledVincentAbility,
});
const delegatorPkpEthAddress = '0x09182301238'; // The delegator PKP Eth Address

// Supply assets to Aave
const abilityParams = {
  operation: AaveOperation.SUPPLY, // 'supply', 'borrow', 'withdraw', or 'repay'
  assetSymbol: 'USDC', // The asset symbol (e.g., 'USDC', 'WETH')
  chain: 'base', // The chain where the Aave pool is deployed
  amount: '1000000', // Amount as string without decimal point (e.g., '1000000' for 1 USDC with 6 decimals)
};

// Run precheck to see if ability should be executed
const precheckResult = await client.precheck(abilityParams, {
  delegatorPkpEthAddress,
});

if (precheckResult.success === true) {
  // Execute the Vincent Ability
  const executeResult = await client.execute(abilityParams, {
    delegatorPkpEthAddress,
  });

  // ...ability has executed, you can check `executeResult` for details
}
```

## Prerequisites

Before executing Aave operations, ensure that:

1. For supply operations: The user has approved the Aave pool to spend their tokens (approval is handled automatically if needed)
2. For borrow operations: The user has sufficient collateral in Aave
3. For withdraw operations: The user has sufficient supplied balance in Aave
4. For repay operations: The user has approved the Aave pool to spend their tokens (approval is handled automatically if needed)
5. The user has delegated permission to the Vincent app to execute operations

Note: The ability can subsidize gas for the user using Alchemy. If not doing so, the user will also have to pay for the gas.

## Aave Operations

The ability supports the following operations on Aave protocol:

- **SUPPLY** - Supply assets to Aave pools to earn interest
- **BORROW** - Borrow assets from Aave pools using collateral
- **WITHDRAW** - Withdraw supplied assets from Aave pools
- **REPAY** - Repay borrowed assets to Aave pools

## Parameters

| Parameter                   | Type                                            | Required | Description                                                                                                 |
| --------------------------- | ----------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `operation`                 | `"supply" \| "borrow" \| "withdraw" \| "repay"` | ✅       | The Aave operation to perform                                                                               |
| `assetSymbol`               | `string`                                        | ✅       | The symbol of the asset (e.g., "USDC", "WETH")                                                              |
| `chain`                     | `string`                                        | ✅       | Chain identifier (e.g., "ethereum", "arbitrum", "base")                                                     |
| `amount`                    | `string`                                        | ✅       | Amount as string in units, no decimal places (assets for supply/withdraw/repay, borrowed amount for borrow) |
| `rateMode`                  | `number`                                        | ❌       | Interest rate mode: 1 for stable, 2 for variable (default: 2 for borrow/repay)                              |
| `recipient`                 | `string`                                        | ❌       | Recipient address for withdraw operation (optional, defaults to delegator address)                          |
| `rpcUrl`                    | `string`                                        | ❌       | Custom RPC URL (for precheck validation)                                                                    |
| `alchemyGasSponsor`         | `boolean`                                       | ❌       | Whether to use Alchemy's gas sponsorship (EIP-7702). Not supported for coreDao chain.                       |
| `alchemyGasSponsorApiKey`   | `string`                                        | ❌       | Alchemy API key for gas sponsorship (required if alchemyGasSponsor is true)                                 |
| `alchemyGasSponsorPolicyId` | `string`                                        | ❌       | Alchemy gas policy ID for sponsorship (required if alchemyGasSponsor is true)                               |

## Supported Networks

The ability supports all chains where Aave V3 is deployed, including:

- Ethereum Mainnet
- Arbitrum
- Base
- Polygon
- Optimism
- Avalanche
- BSC (limited support)
- CoreDAO (Colend) - Note: Alchemy gas sponsorship is not supported for this chain

## Building

Run `nx build ability-aave` to build the library.

Run `nx action:build ability-aave` to build the Lit Action.

## Testing

Run `nx test ability-aave` to execute the unit tests via [Jest](https://jestjs.io).

For end-to-end testing with the Vincent SDK:

```bash
nx e2e ability-aave-e2e
```

## Deploying

Deploy the Lit Action to IPFS:

```bash
nx action:deploy ability-aave
```

## Contributing

Please see [CONTRIBUTING.md](../../../CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
