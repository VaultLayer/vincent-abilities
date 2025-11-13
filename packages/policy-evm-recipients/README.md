# Vincent Policy: EVM Recipients Whitelist

A Vincent Policy that validates EVM transaction recipient addresses against a whitelist of allowed addresses.

## Overview

This policy ensures that EVM transfers (both native ETH and ERC20 tokens) can only send funds to pre-approved addresses. It automatically includes the PKP's Ethereum address in the allowed list, ensuring the PKP can always receive funds back to itself.

## Features

- Validates recipient addresses for EVM transfers
- Automatically allows the PKP's Ethereum address
- Works with both native ETH and ERC20 token transfers
- Integrates with Vincent's policy system for secure execution

## Usage

### Policy Parameters

```typescript
{
  allowedRecipients: string[] // Array of allowed EVM addresses
}
```

### Ability Parameters

```typescript
{
  to: string; // The recipient Ethereum address
}
```

## Integration

This policy is designed to work with the `@vaultlayer/vincent-ability-evm-send` ability:

```typescript
import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-evm-recipients';
import { createVincentAbilityPolicy } from '@lit-protocol/vincent-ability-sdk';

const EvmRecipientsPolicy = createVincentAbilityPolicy({
  abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    to: 'to',
  },
});
```

## Security

- The policy automatically includes the PKP's Ethereum address from its PKP info
- All recipient addresses are validated against the whitelist
- The PKP's own address is always allowed to ensure it can receive funds

## Dependencies

- `@lit-protocol/vincent-ability-sdk` - Vincent framework integration
- `zod` - Schema validation and type safety
