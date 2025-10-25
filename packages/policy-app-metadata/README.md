# Vincent Policy: App Metadata

## Overview

The App Metadata Policy provides a mechanism to store application metadata (`vlMetadata`) alongside Vincent Abilities. This policy allows applications to attach custom metadata in JSON format that gets stored with the policy configuration, enabling rich metadata storage for application discovery and management.

This Vincent Policy is designed to work with the [@vaultlayer/vincent-ability-app-metadata](../ability-app-metadata/) ability to provide metadata storage capabilities.

## Key Features

- **Metadata Storage**: Store custom JSON metadata with policies via `vlMetadata` parameter
- **App ID Validation**: Ensures app IDs are positive integers for proper identification
- **Flexible Metadata**: Accept any JSON-stringified data for application-specific information
- **Optional Configuration**: Metadata storage is optional - policy works with or without it
- **Simple Integration**: Easy to use with minimal configuration required

## How It Works

The App Metadata Policy provides two main functions:

1. **App ID Validation**: Validates that the provided `appId` is a positive integer
2. **Metadata Storage**: Stores the `vlMetadata` parameter (JSON string) with the policy for later retrieval

The policy allows execution when the app ID is valid, and the metadata (if provided) gets stored with the policy configuration.

## Example Configuration

```typescript
const policyConfig = {
  // Optional: Store application metadata as a JSON string
  vlMetadata: JSON.stringify({
    name: 'My Vincent App',
    description: 'A sample application using Vincent abilities',
    version: '1.0.0',
    author: 'Developer Name',
    website: 'https://myapp.com',
    capabilities: ['deploy', 'manage', 'monitor'],
    tags: ['defi', 'ethereum', 'automation'],
  }),
};
```

## Parameters

### vlMetadata (Optional)

- **Type**: `string`
- **Required**: No
- **Description**: JSON-stringified metadata to store with the policy
- **Example**: `JSON.stringify({ name: "My App", version: "1.0.0" })`
- **Format**: Must be a valid JSON string

### appId (From Ability)

- **Type**: `number`
- **Required**: Yes (from ability parameters)
- **Description**: The application ID to validate
- **Example**: `123`
- **Validation**: Must be a positive integer greater than 0

## Usage Example

```typescript
import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-app-metadata';
import { createVincentAbilityPolicy } from '@lit-protocol/vincent-ability-sdk';

const AppMetadataPolicy = createVincentAbilityPolicy({
  abilityParamsSchema: myAbilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    appId: 'appId',
  },
});

// Configure with metadata
const policyConfig = {
  vlMetadata: JSON.stringify({
    name: 'DeFi Portfolio Manager',
    description: 'Manages DeFi positions across multiple protocols',
    version: '2.1.0',
    features: ['portfolio-tracking', 'yield-optimization', 'risk-management'],
  }),
};
```

## Policy Behavior

### Allow Conditions

The policy will allow execution when:

- `appId` is provided and is a positive integer
- `vlMetadata` is either not provided or is a valid JSON string

### Deny Conditions

The policy will deny execution when:

- `appId` is missing, not a number, or is zero/negative
- `vlMetadata` is provided but is not a valid JSON string

## Response Format

### Allow Response

```typescript
{
  allow: true,
  appIdValid: true
}
```

### Deny Response

```typescript
{
  allow: false,
  reason: 'App ID must be a positive integer',
  appId: 0
}
```

## Metadata Examples

### Basic App Information

```json
{
  "name": "My Vincent App",
  "description": "Application description",
  "version": "1.0.0"
}
```

### Rich Application Metadata

```json
{
  "name": "DeFi Yield Optimizer",
  "description": "Automatically optimizes yield farming strategies",
  "version": "3.2.1",
  "author": "DeFi Labs",
  "website": "https://defilabs.com",
  "capabilities": ["yield-farming", "liquidity-provision", "portfolio-rebalancing"],
  "supportedChains": ["ethereum", "polygon", "arbitrum"],
  "tags": ["defi", "yield", "automation"],
  "category": "financial",
  "riskLevel": "medium"
}
```

### Integration Metadata

```json
{
  "name": "Bridge Monitor",
  "description": "Monitors cross-chain bridge operations",
  "integrations": {
    "bridges": ["stargate", "hop", "synapse"],
    "chains": ["ethereum", "polygon", "avalanche"],
    "tokens": ["USDC", "USDT", "ETH"]
  },
  "monitoring": {
    "alerts": true,
    "dashboard": "https://monitor.bridgeapp.com",
    "webhook": "https://api.bridgeapp.com/webhooks"
  }
}
```

## Use Cases

1. **Application Discovery**: Store app information for discovery and cataloging
2. **Version Management**: Track application versions and update information
3. **Capability Documentation**: Document what the application can do
4. **Integration Metadata**: Store information about supported chains, tokens, protocols
5. **User Interface**: Provide metadata for building dynamic UIs
6. **Analytics**: Track application usage and performance metrics
7. **Compliance**: Store regulatory or compliance-related information

## Security Considerations

- **JSON Validation**: Ensure `vlMetadata` is valid JSON to prevent parsing errors
- **Size Limits**: Be mindful of metadata size limits in the Vincent system
- **Sensitive Data**: Avoid storing sensitive information in metadata
- **Input Validation**: Always validate app IDs to prevent invalid lookups

## Related Packages

- [@vaultlayer/vincent-ability-app-metadata](../ability-app-metadata/) - The ability that uses this policy
- [@lit-protocol/vincent-ability-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-ability-sdk) - SDK for building Vincent Abilities and Policies
