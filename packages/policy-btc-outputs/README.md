# Vincent Policy: Bitcoin Output Whitelist

A Vincent Policy that validates Bitcoin transaction outputs against a whitelist of allowed addresses.

## Overview

This policy ensures that Bitcoin PSBTs can only send funds to pre-approved addresses. It automatically includes the PKP's derived Bitcoin address in the allowed list, ensuring the PKP can always receive funds back to itself.

## Features

- Validates all output addresses in a Bitcoin PSBT
- Automatically allows the PKP's derived Bitcoin address
- Supports both testnet and mainnet Bitcoin networks
- Integrates with Vincent's policy system for secure execution

## Usage

### Policy Parameters

```typescript
{
  allowedOutputs: string[] // Array of allowed Bitcoin addresses
}
```

### Ability Parameters

```typescript
{
  psbtBase64: string,           // Base64 encoded PSBT
  btcNetwork: 'testnet' | 'livenet'  // Bitcoin network
}
```

## Integration

This policy is designed to work with the `@vaultlayer/vincent-ability-btc-psbt-signer` ability:

```typescript
import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-btc-outputs';
import { createVincentAbilityPolicy } from '@lit-protocol/vincent-ability-sdk';

const BtcOutputsPolicy = createVincentAbilityPolicy({
  abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    psbtBase64: 'psbtBase64',
    btcNetwork: 'btcNetwork',
  },
});
```

## Security

- The policy automatically derives the PKP's Bitcoin address from its public key
- All output addresses are validated against the whitelist
- The PKP's own address is always allowed to ensure it can receive funds
- Supports both P2WPKH (native SegWit) address derivation

## Dependencies

- `bitcoinjs-lib@^6.1.7` - Bitcoin library for PSBT parsing and address derivation
- `@noble/secp256k1@^2.2.3` - Cryptographic functions for key operations
- `@lit-protocol/vincent-ability-sdk` - Vincent framework integration
