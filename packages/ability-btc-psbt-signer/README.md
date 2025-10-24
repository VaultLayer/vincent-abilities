# Vincent Ability: Bitcoin PSBT Signer

A Vincent Ability that signs Bitcoin PSBTs using PKP-derived Bitcoin keys.

## Overview

This ability allows Vincent Apps to sign Bitcoin transactions through PSBTs (Partially Signed Bitcoin Transactions). It derives Bitcoin keys from the PKP's public key and signs transactions without requiring wrapped keys.

## Features

- Signs Bitcoin PSBTs using PKP-derived keys
- Supports both testnet and mainnet Bitcoin networks
- Handles CLTV (CheckLockTimeVerify) timelock scripts for staked Bitcoin
- Broadcasts signed transactions to Bitcoin network
- Integrates with Vincent's policy system for output validation

## Usage

### Ability Parameters

```typescript
{
  psbtBase64: string,                    // Base64 encoded PSBT to sign
  btcNetwork: 'testnet' | 'livenet',     // Bitcoin network
  isRedeemTx?: boolean                   // Whether this is a redeem transaction (default: false)
}
```

### Precheck Response

```typescript
{
  inputCount: number,        // Number of inputs in the PSBT
  outputCount: number,       // Number of outputs in the PSBT
  isRedeemTx: boolean,       // Whether this is a redeem transaction
  cltvChecksPassed?: boolean // Whether CLTV lock time checks passed (if redeem tx)
}
```

### Execute Response

```typescript
{
  txHash: string,      // Bitcoin transaction hash
  inputCount: number,  // Number of inputs that were signed
  outputCount: number, // Number of outputs in the transaction
  btcNetwork: string   // Bitcoin network the transaction was broadcasted to
}
```

## Integration

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-btc-psbt-signer';

// Use in your Vincent App
const result = await vincentApp.executeAbility({
  ability: bundledVincentAbility,
  abilityParams: {
    psbtBase64: 'cHNidP8BAH0CAAAA...',
    btcNetwork: 'testnet',
    isRedeemTx: false,
  },
});
```

## Policy Integration

This ability works with the `@vaultlayer/vincent-policy-btc-outputs` policy to validate output addresses:

```typescript
import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-btc-outputs';

// The policy ensures only whitelisted addresses can receive funds
const policyParams = {
  allowedOutputs: [
    'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
  ],
};
```

## Bitcoin Key Derivation

The ability derives Bitcoin keys from the PKP's Ethereum public key:

1. Takes the PKP's uncompressed public key (132 hex characters)
2. Converts it to a compressed public key (33 bytes)
3. Derives a P2WPKH (native SegWit) Bitcoin address
4. Uses this key for signing PSBT inputs

## CLTV Support

For staked Bitcoin transactions (`isRedeemTx: true`):

- Validates that CLTV lock times have passed
- Uses specialized script finalization for timelock scripts
- Supports both single-sig and multi-sig CLTV scripts

## Transaction Broadcasting

Signed transactions are broadcasted to Bitcoin network using:

- **Mainnet**: mempool.space, blockstream.info
- **Testnet**: mempool.space/testnet, blockstream.info/testnet

The ability includes retry logic and validates transaction hashes.

## Dependencies

- `bitcoinjs-lib@^6.1.7` - Bitcoin library for PSBT handling
- `@noble/secp256k1@^2.2.3` - Cryptographic functions
- `@noble/hashes@^1.7.1` - Hash functions
- `bip66@^2.0.0` - Bitcoin signature encoding
- `bip174@^2.1.1` - PSBT format support
- `buffer@^6.0.3` - Buffer polyfill

## Security Considerations

- Keys are derived deterministically from PKP public key
- No private key storage or transmission required
- All outputs validated by policy before signing
- CLTV timelock validation prevents premature redemption
- Transaction broadcasting includes retry logic and validation
