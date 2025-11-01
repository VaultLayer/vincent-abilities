import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-app-metadata';
import { ethers } from 'ethers';

import {
  createVincentAbility,
  createVincentAbilityPolicy,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';

import { fetchAbilitiesAndPolicies } from './helpers/fetchToolsAndPolicies';
import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
} from './schemas';

const AppMetadataPolicy = createVincentAbilityPolicy({
  abilityParamsSchema: abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    appId: 'appId',
  },
});

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-app-metadata' as const,
  abilityParamsSchema: abilityParamsSchema,
  abilityDescription: 'Fetch tools and policies for an app ID',
  supportedPolicies: supportedPoliciesForAbility([AppMetadataPolicy]),

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { fail, succeed }) => {
    const { appId } = abilityParams;

    // Basic validation - check that appId is provided and positive
    if (!appId || appId <= 0) {
      return fail({
        error: 'Invalid app ID',
        reason: 'appId must be a positive integer',
      });
    }

    return succeed({ appIdValid: true });
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation }) => {
    try {
      const { appId } = abilityParams;

      console.log(
        '[@vaultlayer/vincent-ability-app-metadata/execute] Fetching tools and policies',
        {
          appId,
        },
      );

      // Get PKP token ID from delegation context
      const pkpTokenId = delegation.delegatorPkpInfo.tokenId;

      // Fetch abilities and policies
      const toolsAndPolicies = await fetchAbilitiesAndPolicies(pkpTokenId, appId);

      console.log('[@vaultlayer/vincent-ability-app-metadata/execute] Fetch successful');

      return succeed({
        toolsAndPolicies,
        appId,
      });
    } catch (error) {
      console.error('[@vaultlayer/vincent-ability-app-metadata/execute] Fetch failed', error);

      return fail({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },
});
