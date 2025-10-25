# Vincent Ability: App Metadata

## Overview

The App Metadata Ability enables Vincent Apps to fetch tools and policies associated with a specific application ID. This ability provides a way to discover and retrieve the available capabilities for any registered application in the Vincent ecosystem.

## Key Features

- **App Discovery**: Fetch tools and policies for any valid app ID
- **PKP Integration**: Uses PKP token ID for secure access control
- **Tool Retrieval**: Get all available tools for an application
- **Policy Retrieval**: Get all associated policies for an application
- **Validation**: Built-in validation for app ID parameters
- **Policy Integration**: Works with [@vaultlayer/vincent-policy-app-metadata](../policy-app-metadata/) for access control

## Installation

```bash
npm install @vaultlayer/vincent-ability-app-metadata
# or
pnpm add @vaultlayer/vincent-ability-app-metadata
# or
yarn add @vaultlayer/vincent-ability-app-metadata
```

## Basic Usage

```typescript
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-app-metadata';

// Fetch tools and policies for app ID 123
const result = await executeAbility({
  ability: bundledVincentAbility,
  params: {
    appId: 123,
  },
});
```

## Parameters

### Required Parameters

#### appId

- **Type**: `number`
- **Description**: The application ID to fetch tools and policies for
- **Example**: `123`
- **Validation**: Must be a positive integer greater than 0

## Response Format

### Success Response

```typescript
{
  toolsAndPolicies: {
    tools: [
      {
        id: 'tool-1',
        name: 'Example Tool',
        description: 'A sample tool',
        // ... other tool properties
      }
    ],
    policies: [
      {
        id: 'policy-1',
        name: 'Example Policy',
        description: 'A sample policy',
        // ... other policy properties
      }
    ]
  },
  appId: 123
}
```

### Error Response

```typescript
{
  error: 'Error message describing what went wrong';
}
```

## Advanced Usage

### With Policy Validation

```typescript
import { createVincentAbilityPolicy } from '@lit-protocol/vincent-ability-sdk';
import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-app-metadata';
import { bundledVincentAbility } from '@vaultlayer/vincent-ability-app-metadata';

// Create policy for app metadata validation
const AppMetadataPolicy = createVincentAbilityPolicy({
  abilityParamsSchema: myAbilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    appId: 'appId',
  },
});

// Execute with policy validation
const result = await executeAbility({
  ability: bundledVincentAbility,
  policy: AppMetadataPolicy,
  params: {
    appId: 123,
  },
});
```

### Error Handling

```typescript
try {
  const result = await executeAbility({
    ability: bundledVincentAbility,
    params: {
      appId: 123,
    },
  });

  if (result.success) {
    console.log('Tools:', result.toolsAndPolicies.tools);
    console.log('Policies:', result.toolsAndPolicies.policies);
  } else {
    console.error('Failed to fetch app metadata:', result.error);
  }
} catch (error) {
  console.error('Execution error:', error);
}
```

## Policy Configuration

This ability works with the App Metadata Policy:

```typescript
import { createVincentAbilityPolicy } from '@lit-protocol/vincent-ability-sdk';
import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-app-metadata';

const AppMetadataPolicy = createVincentAbilityPolicy({
  abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    appId: 'appId',
  },
});
```

## Use Cases

1. **App Discovery**: Find available tools and policies for any registered application
2. **Dynamic UI**: Build interfaces that adapt based on available capabilities
3. **Integration Testing**: Verify that apps have the expected tools and policies
4. **Documentation Generation**: Automatically generate docs from app metadata
5. **Access Control**: Check what capabilities are available before attempting operations

## Security Considerations

- **PKP Authentication**: Uses PKP token ID for secure access control
- **App ID Validation**: Validates app IDs to prevent invalid lookups
- **Policy Enforcement**: Works with policies to control access to app metadata
- **Error Handling**: Provides secure error messages without exposing sensitive information

## Related Packages

- [@vaultlayer/vincent-policy-app-metadata](../policy-app-metadata/) - Policy for app metadata validation
- [@lit-protocol/vincent-ability-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-ability-sdk) - SDK for building Vincent Abilities
- [@lit-protocol/vincent-scaffold-sdk](https://www.npmjs.com/package/@lit-protocol/vincent-scaffold-sdk) - Transaction utilities

## Migration Notes

If you're migrating from other app discovery mechanisms:

1. **Authentication**: Now uses Vincent delegation system with PKP integration
2. **Policy System**: Uses Vincent policies for access control
3. **Response Format**: Standardized response format with tools and policies
4. **Error Handling**: Improved error handling with detailed messages

The ability maintains backward compatibility for basic app ID validation while adding new security and policy features.
