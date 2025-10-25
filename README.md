# Vincent Starter Kit

A complete example repository for Vincent Ability and Policy authors. This monorepo uses Nx and pnpm and includes:

- **Example Abilities:**
  - An example Vincent Ability that sends native tokens
  - A Bitcoin PSBT signer ability for signing Bitcoin transactions
  - A generic call contract ability for EVM smart contract interactions
- **Example Policies:**
  - An example Vincent Policy that counts ability executions
  - A Bitcoin output whitelist policy for validating Bitcoin transaction outputs
  - A call contract whitelist policy for controlling smart contract interactions
- **End-to-end tests** that automatically build, deploy, and exercise the example abilities and policies

### See detailed documentation / guides at [docs.heyvincent.ai](https://docs.heyvincent.ai)

## Requirements

- Node.js: ^20.19.4
- pnpm: 10.7.0 (managed via Corepack)

### Using Corepack to use pnpm

This repo is configured to use pnpm and enforces it in the preinstall step. If you do not have pnpm set up, use Corepack:

```bash
# Enable Corepack globally (ships with Node 16.9+)
corepack enable

# Ensure npm & pnpm shims are enabled
corepack enable npm
corepack enable pnpm

# Or run the helper script from the repo root
pnpm run use-corepack
```

Notes:

- The repo sets "packageManager": "pnpm@10.7.0" in package.json. Corepack will automatically provision that version.
- The preinstall script scripts/check-packagemanager.sh verifies Node and Corepack are available and enforces pnpm via `npx only-allow pnpm`.

## Scripts

Root-level scripts you will commonly use:

| Script       | What it does                                            | Notes                                                                   |
| ------------ | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| preinstall   | Ensures Node + Corepack are available and enforces pnpm | Runs automatically during `pnpm install`                                |
| build        | nx run-many -t build                                    | Builds all packages (includes action bundling via Nx deps)              |
| test         | nx run-many -t test                                     | Runs unit tests (if any)                                                |
| test-e2e     | nx run-many -t test-e2e                                 | Builds + deploys the example Ability & Policy, then runs Jest E2E tests |
| reset-e2e    | Moves packages/test-e2e/.env.test-e2e to a .backup file | Useful to re-run bootstrap for a new env                                |
| lint         | nx run-many -t lint                                     | Lints all packages                                                      |
| typecheck    | nx run-many -t typecheck                                | Types checks all packages                                               |
| clean        | nx reset and per-project clean                          | Removes build artifacts and node_modules in projects                    |
| prepare      | husky                                                   | Git hooks setup                                                         |
| use-corepack | corepack enable ...                                     | Quickly enables pnpm via Corepack                                       |
| reset        | pnpm clean && pnpm install                              | Full reinstall                                                          |
| hard-build   | pnpm reset && pnpm build                                | Clean reinstall and build                                               |
| bootstrap    | tsx ./src/bin/bootstrap.ts                              | Interactive environment setup (see Bootstrap flow)                      |

Project-level Nx targets you may find useful (run via pnpm nx ...):

| Target        | Project(s)                                                                                                                              | What it does                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| action:build  | ability-native-send, ability-btc-psbt-signer, ability-call-contract, policy-counter, policy-btc-outputs, policy-call-contract-whitelist | Bundles the Lit Action code for the Ability/Policy            |
| action:deploy | ability-native-send, ability-btc-psbt-signer, ability-call-contract, policy-counter, policy-btc-outputs, policy-call-contract-whitelist | Builds (if needed) and deploys the Lit Action code            |
| build         | all                                                                                                                                     | TypeScript build (depends on action:build where applicable)   |
| test-e2e      | test-e2e                                                                                                                                | Depends on deploying the Abilities & Policies, then runs Jest |

## Packages in this repository

### Abilities

| Package                                     | Path                             | Purpose                                                                                                                                                        |
| ------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @vaultlayer/vincent-ability-native-send     | packages/ability-native-send     | An example Vincent Ability that sends native tokens to a user. Demonstrates Ability authoring, bundling, and deployment.                                       |
| @vaultlayer/vincent-ability-btc-psbt-signer | packages/ability-btc-psbt-signer | Signs Bitcoin PSBTs using PKP-derived Bitcoin keys. Supports testnet/mainnet, CLTV timelocks, and transaction broadcasting. Works with btc-outputs policy.     |
| @vaultlayer/vincent-ability-call-contract   | packages/ability-call-contract   | Generic smart contract interaction ability for EVM chains. Supports flexible parameter encoding, optional gas sponsorship (EIP-7702), and call data appending. |

### Policies

| Package                                            | Path                                    | Purpose                                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @vaultlayer/vincent-send-policy-counter            | packages/policy-counter                 | An example Vincent Policy that counts the number of times an Ability is executed. Demonstrates Policy authoring, bundling, and deployment.                        |
| @vaultlayer/vincent-policy-btc-outputs             | packages/policy-btc-outputs             | Validates Bitcoin transaction outputs against a whitelist of allowed addresses. Automatically includes PKP's derived Bitcoin address. Works with btc-psbt-signer. |
| @vaultlayer/vincent-policy-call-contract-whitelist | packages/policy-call-contract-whitelist | Provides granular access control for smart contract interactions. Enforces whitelists for contracts, functions, chains, value limits, and call data prefixes.     |

### Testing

| Package                           | Path              | Purpose                                                                                                                                                  |
| --------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @lit-protocol/vincent-example-e2e | packages/test-e2e | Private package with end-to-end tests. It orchestrates building and deploying the example Abilities & Policies and then runs integration tests via Jest. |

## Package Details

### Native Send Ability

The Native Send Ability (`@vaultlayer/vincent-ability-native-send`) enables Vincent Apps to send native ETH tokens to any Ethereum address.

**Key Features:**

- Sends native ETH tokens to any valid Ethereum address
- Validates sufficient balance before execution
- Supports custom RPC URLs (defaults to Yellowstone testnet)
- Integrates with Send Limit Counter policy for usage tracking
- Uses PKP-derived keys for transaction signing

**Parameters:**

- `to`: Ethereum address to send tokens to (required)
- `amount`: Amount of ETH to send as a string (required)
- `rpcUrl`: RPC URL for the blockchain network (optional, defaults to Yellowstone)

**Use Cases:**

- Simple ETH transfers between addresses
- Payment systems and remittances
- DeFi protocol interactions requiring ETH
- Multi-signature wallet operations
- Automated payment workflows

**Policy Integration:**
Works with the `@vaultlayer/vincent-send-policy-counter` policy to track and limit the number of sends per time window.

See the [full documentation](packages/ability-native-send/README.md) for detailed usage examples.

### Bitcoin PSBT Signer Ability

The Bitcoin PSBT Signer (`@vaultlayer/vincent-ability-btc-psbt-signer`) enables Vincent Apps to sign Bitcoin transactions through PSBTs (Partially Signed Bitcoin Transactions).

**Key Features:**

- Derives Bitcoin keys from PKP's public key (no wrapped keys needed)
- Supports both testnet and mainnet Bitcoin networks
- Handles CLTV (CheckLockTimeVerify) timelock scripts for staked Bitcoin
- Broadcasts signed transactions to Bitcoin network
- Integrates with Bitcoin Output Whitelist policy

**Use Cases:**

- Bitcoin wallet applications
- Staked Bitcoin management with timelock support
- Bitcoin payment systems
- Cross-chain Bitcoin bridges

See the [full documentation](packages/ability-btc-psbt-signer/README.md) for detailed usage examples.

### Call Contract Ability

The Call Contract Ability (`@vaultlayer/vincent-ability-call-contract`) provides a generic interface for interacting with any EVM smart contract.

**Key Features:**

- Call any smart contract function with flexible parameters
- Support for complex tuples via base64 encoding
- Optional EIP-7702 gas sponsorship via Alchemy
- Multi-chain support (Ethereum, Base, Polygon, etc.)
- Call data appending for tracking or bridge integrations
- Integrates with Call Contract Whitelist policy

**Use Cases:**

- DeFi operations (lending, DEXs, yield farms)
- Token management (ERC20, ERC721, ERC1155)
- Bridge integrations with call data tracking
- DAO governance and voting
- Multi-step contract workflows

See the [full documentation](packages/ability-call-contract/README.md) for detailed usage examples.

### Bitcoin Output Whitelist Policy

The Bitcoin Output Whitelist Policy (`@vaultlayer/vincent-policy-btc-outputs`) validates that Bitcoin transaction outputs only go to approved addresses.

**Key Features:**

- Validates all PSBT output addresses against whitelist
- Automatically allows PKP's derived Bitcoin address
- Supports both testnet and mainnet networks
- Works seamlessly with Bitcoin PSBT Signer ability

### Call Contract Whitelist Policy

The Call Contract Whitelist Policy (`@vaultlayer/vincent-policy-call-contract-whitelist`) provides granular access control for smart contract interactions.

**Key Features:**

- Contract address whitelisting
- Function name whitelisting
- Multi-chain control
- Transaction value limits
- Call data prefix validation

**Configuration Options:**

- `vlCallContractMaxValue`: Maximum ETH value in wei
- `vlCallContractAllowedContracts`: Array of allowed contract addresses
- `vlCallContractAllowedFunctions`: Array of allowed function names
- `vlCallContractAllowedChains`: Array of allowed blockchain networks
- `vlCallContractAllowedCallDataPrefixes`: Optional hex prefixes for appended data

See the [full documentation](packages/policy-call-contract-whitelist/README.md) for detailed configuration examples.

### Send Policy Counter

The Send Policy Counter (`@vaultlayer/vincent-send-policy-counter`) tracks and limits the number of native token sends per time window using an on-chain counter contract.

**Key Features:**

- Tracks the number of sends executed by a PKP using a smart contract
- Enforces maximum send limits within configurable time windows
- Prevents double-spending by committing counts before transaction execution
- Automatically resets counters when time windows expire
- Integrates seamlessly with Native Send ability
- Uses on-chain storage for reliable state management

**User Parameters:**

- `maxSends`: Maximum number of sends allowed within the time window (positive integer)
- `timeWindowSeconds`: Duration of the counting window in seconds (positive integer)

**Policy Phases:**

1. **Precheck**: Validates if the PKP has remaining sends in the current window
2. **Evaluate**: Double-checks the send limit before execution
3. **Commit**: Records the send on-chain and updates the counter

**Response Data:**

- `currentCount`: Number of sends already made in the current window
- `remainingSends`: Number of sends still allowed before hitting the limit
- `secondsUntilReset`: Time remaining until the counter resets (when denied)

**Use Cases:**

- Rate limiting for payment applications
- Preventing abuse in automated systems
- Implementing daily/monthly spending limits
- Security controls for high-value transactions
- API rate limiting for blockchain operations

See the [full documentation](packages/policy-counter/README.md) for detailed configuration examples.

## Bootstrap flow

The bootstrap script guides you through configuring the repo for the first time and preparing the E2E environment.

Command:

```bash
pnpm bootstrap
```

What happens:

1. Pinata JWT setup
   - A Pinata JWT is required for e2e tests and for publishing Vincent Abilities and Policies to the Registry.
   - You will be prompted to obtain a Pinata JWT from https://app.pinata.cloud/developers/api-keys.
   - The JWT you provide will be stored in a root-level .env as `PINATA_JWT`. Tooling will use this to authenticate with Pinata.
   - If you already have a .env file, the script will skip this step.
2. Funder environment setup for E2E
   - You must fund a wallet with testLPX on the LIT testnet (Yellowstone). You can fund your wallet using the faucet as https://chronicle-yellowstone-faucet.getlit.dev/
   - Once you have funded your wallet, you must provide its private key for usage by tooling in the repository.
   - The bootstrap process creates additional test private keys (app manager, app delegatee, agent wallet PKP owner) and stores those keys in packages/test-e2e/.env.test-e2e

Notes:

- If a root .env already exists, the Pinata JWT step is skipped.
- If packages/test-e2e/.env.test-e2e already exists, bootstrap aborts with an error so you don’t overwrite your private keys. Use `pnpm reset-e2e` to back up the existing .env.test-e2e file, and re-run bootstrap.

## Quick start

It is recommended to use Corepack to ensure pnpm is used for the repository's package management. If you use a different package manager, you may experience problematic behavior.

1. Verify your version of corepack and ensure you are on > 0.31.0
   ```bash
   corepack -v
   npm install -g corepack@latest
   ```
2. Enable Corepack:
   ```bash
   corepack enable && corepack enable pnpm
   ```
3. Run bootstrap to build and configure the repository :
   ```bash
   pnpm bootstrap
   ```
4. Run the example end-to-end test flow:
   ```bash
   pnpm test-e2e
   ```
