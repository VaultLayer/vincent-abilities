# How Vincent Abilities Work

Vincent Abilities are modular, executable functions that define what operations your App can perform on behalf of users. This guide explains their structure, lifecycle, and implementation details.

## Ability Lifecycle

Vincent Abilities execute in two phases to ensure reliability and security:

<Steps>
  <Step title="Precheck">
    Runs locally to validate that execution will likely succeed. This also runs `precheck` on the Vincent Policies to ensure they are valid as well
  </Step>

  <Step title="Execute">
    Runs in the Lit Action environment to perform the actual operation. Policies also run their `evaluate` function here
  </Step>
</Steps>

<Note>
  Only if all policies return `allow` results will your Ability's function execute. After successful execution, the Ability can optionally call Policy commit functions to update state.
</Note>

## Defining Your Ability

<ParamField path="packageName" type="string" required>
  The npm package name of your Ability (e.g., `@your-org/ability-name`)
</ParamField>

<ParamField path="abilityDescription" type="string" required>
  A clear description of what your Ability does
</ParamField>

<ParamField path="abilityParamsSchema" type="ZodSchema" required>
  Zod schema defining the input parameters your Ability requires
</ParamField>

<ParamField path="supportedPolicies" type="SupportedPolicies" required>
  Array of supported Vincent Policies, created with `supportedPoliciesForAbility()`
</ParamField>

<ParamField path="precheckSuccessSchema" type="ZodSchema">
  Zod schema for successful precheck return values
</ParamField>

<ParamField path="precheckFailSchema" type="ZodSchema">
  Zod schema for failed precheck return values
</ParamField>

<ParamField path="precheck" type="function" required>
  Async function that validates execution will likely succeed

  <Expandable title="function signature">
    ```typescript  theme={null}
    (params: { abilityParams }, context: AbilityContext) => Promise<PrecheckResult>
    ```
  </Expandable>
</ParamField>

<ParamField path="executeSuccessSchema" type="ZodSchema">
  Zod schema for successful execution return values
</ParamField>

<ParamField path="executeFailSchema" type="ZodSchema">
  Zod schema for failed execution return values
</ParamField>

<ParamField path="execute" type="function" required>
  Async function that performs the actual Ability operation

  <Expandable title="function signature">
    ```typescript  theme={null}
    (params: { abilityParams }, context: AbilityContext) => Promise<ExecuteResult>
    ```
  </Expandable>
</ParamField>

## Creating Vincent Abilities

Vincent Abilities are created using `createVincentAbility` from the Vincent Ability SDK:

```typescript theme={null}
import { createVincentAbility } from '@lit-protocol/vincent-ability-sdk';

export const vincentAbility = createVincentAbility({
  packageName: '@your-org/ability-name',
  abilityDescription: 'What this ability does',

  abilityParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([]),

  precheckSuccessSchema,
  precheckFailSchema,
  precheck: async ({ abilityParams }, abilityContext) => {
    // Validation logic
  },

  executeSuccessSchema,
  executeFailSchema,
  execute: async ({ abilityParams }, abilityContext) => {
    // Main execution logic
  },
});
```

## Example Implementation

<Accordion title="Full Token Transfer Ability">
  ```typescript  theme={null}
  import {
    createVincentAbility,
    createVincentAbilityPolicy,
    supportedPoliciesForAbility,
  } from '@lit-protocol/vincent-ability-sdk';
  import { bundledVincentPolicy } from '@lit-protocol/vincent-policy-spending-limit';
  import { z } from 'zod';

const abilityParamsSchema = z.object({
tokenAddress: z.string(),
amountToSend: z.number(),
recipientAddress: z.string(),
});

const SpendingLimitPolicy = createVincentAbilityPolicy({
abilityParamsSchema,
bundledVincentPolicy,
abilityParameterMappings: {
tokenAddress: 'tokenAddress',
amountToSend: 'amount',
},
});

export const vincentAbility = createVincentAbility({
packageName: '@example/token-transfer-ability',
abilityDescription: 'Transfer ERC20 tokens to a recipient address',

    abilityParamsSchema,
    supportedPolicies: supportedPoliciesForAbility([SpendingLimitPolicy]),

    precheckSuccessSchema: z.object({
      tokenBalance: z.number(),
      estimatedGas: z.number(),
    }),
    precheckFailSchema: z.object({
      reason: z.string(),
      currentBalance: z.number().optional(),
      requiredAmount: z.number().optional(),
    }),

    executeSuccessSchema: z.object({
      transferTransactionHash: z.string(),
      spendTransactionHash: z.string().optional(),
    }),
    executeFailSchema: z.object({
      error: z.string(),
      errorCode: z.string().optional(),
    }),

    precheck: async ({ abilityParams }, abilityContext) => {
      // Validation logic here
    },

    execute: async ({ abilityParams }, abilityContext) => {
      // Execution logic here
    },

});

````
</Accordion>

## Deep Dive Guides

<CardGroup cols={2}>
<Card title="Parameter Schemas" icon="code" href="/ability/parameter-schemas">
  Define and validate your Ability's input parameters
</Card>

<Card title="Supporting Policies" icon="shield" href="/ability/supporting-policies">
  Integrate Vincent Policies with your Ability
</Card>

<Card title="Precheck Function" icon="check" href="/ability/precheck-function">
  Implement validation logic before execution
</Card>

<Card title="Execute Function" icon="play" href="/ability/execute-function">
  Write your main execution logic
</Card>
</CardGroup>


# Quick Start

## Create Your Ability

<Steps>
<Step title="Copy the Template">
  ```bash  theme={null}
  # Replace 'my-ability' with your desired package name
  mkdir -p packages/my-ability
  rsync -a --exclude='node_modules/' --exclude='dist/' \
    packages/ability-native-send/ packages/my-ability/
  ```
</Step>

<Step title="Update Package Configuration">
  **1. Edit `packages/my-ability/package.json`:**

  ```json  theme={null}
  {
    "name": "@your-org/my-ability",
    "version": "0.0.1",
    "description": "Your ability description here"
  }
  ```

  **2. Edit `packages/my-ability/project.json`:**

  Replace all occurrences of `ability-native-send` with `my-ability`:

  * `"name": "my-ability"`
  * `"sourceRoot": "packages/my-ability/src"`
  * `"cwd": "packages/my-ability"` (all instances)
  * `"input": "packages/my-ability/src/generated"`
  * `"outputPath": "packages/my-ability/dist"`
  * `"main": "packages/my-ability/src/index.ts"`
  * `"tsConfig": "packages/my-ability/tsconfig.lib.json"`
  * All asset paths

  **3. Edit `packages/my-ability/tsconfig.lib.json`:**

  Remove the policy-counter reference if not using it:

  ```json  theme={null}
  {
    "references": []  // Remove policy-counter reference
  }
  ```

  **4. Update `nx.json` in repository root:**

  Add your package to the release projects:

  ```json  theme={null}
  {
    "release": {
      "projects": ["ability-native-send", "policy-counter", "test-e2e", "my-ability"]
    }
  }
  ```
</Step>

<Step title="Update the Main Index File">
  Edit `packages/my-ability/src/index.ts`:

  Update the comment to reflect your ability name.
</Step>

<Step title="Update Jest Configuration">
  Edit `packages/my-ability/jest.config.js`:

  ```javascript  theme={null}
  module.exports = {
    displayName: '@your-org/my-ability', // Update this
    // ... rest of config
  };
  ```
</Step>

<Step title="Define Your Ability Logic">
  Edit `packages/my-ability/src/lib/vincent-ability.ts`:

  ```typescript  theme={null}
  export const vincentAbility = createVincentAbility({
    packageName: '@your-org/my-ability',
    abilityDescription: 'What your ability does',

    // There are other configurations here, not covered in the Quick Start.
    // Please read the other guides for more details.

    // Validation - runs locally
    precheck: async ({ abilityParams }, { fail, succeed }) => {
      // Validate inputs, check balances, etc.
      return succeed({ /* validation passed */ });
    },

    // Execution - runs in Lit Action environment
    execute: async ({ abilityParams }, { fail, succeed }) => {
      // Your ability's main logic
      // Has access to sign with user's PKP wallet
      return succeed({ /* result data */ });
    }
  });
  ```
</Step>

<Step title="Build and Test">
  ```bash  theme={null}
  pnpm install
  pnpm nx build my-ability
  pnpm test-e2e
  ```
</Step>

<Step title="Deploy to IPFS">
  ```bash  theme={null}
  pnpm nx action:deploy my-ability
  ```

  Your Ability is now deployed and ready to be used by Vincent Apps!
</Step>

<Step title="Publish Your Ability">
  When you're prepared, you can publish the Ability to `npm`. This will make it publishable
  in the Vincent Registry.

  ```bash  theme={null}
  cd packages/my-ability
  pnpm publish
  ```
</Step>

<Step title="Register in Vincent Registry">
  See the [Publishing Guide](/ability/publishing) for details on registering your Ability in the Vincent Registry.
</Step>
</Steps>

## Quick Commands

<ParamField path="build" type="command">
`pnpm nx build my-ability` - Build your Ability package
</ParamField>

<ParamField path="test" type="command">
`pnpm test-e2e` - Run end-to-end tests with the Vincent system
</ParamField>

<ParamField path="deploy" type="command">
`pnpm nx action:deploy my-ability` - Deploy to IPFS via Pinata
</ParamField>

<ParamField path="clean" type="command">
`pnpm clean` - Remove build artifacts
</ParamField>

## What's Next?

<CardGroup cols={3}>
<Card title="Ability Structure" icon="code" href="/ability/explaining-abilities">
  Learn how Abilities work under the hood
</Card>

<Card title="Example Abilities" icon="github" href="https://github.com/LIT-Protocol/vincent-starter-kit/tree/main/packages">
  Study the included examples
</Card>

<Card title="Integration Guide" icon="link" href="/ability/policy/explaining-policies">
  Connect Abilites with Policies
</Card>
</CardGroup>
````
