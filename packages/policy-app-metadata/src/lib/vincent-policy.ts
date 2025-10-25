import { createVincentPolicy } from '@lit-protocol/vincent-ability-sdk';

import {
  evalAllowResultSchema,
  evalDenyResultSchema,
  precheckAllowResultSchema,
  precheckDenyResultSchema,
  abilityParamsSchema,
  userParamsSchema,
} from './schemas';

/**
 * Validates an app ID
 */
const validateAppId = (appId: number): { allow: true } | { allow: false; reason: string } => {
  if (!appId || appId <= 0) {
    return {
      allow: false,
      reason: 'App ID must be a positive integer',
    };
  }

  return { allow: true };
};

export const vincentPolicy = createVincentPolicy({
  packageName: '@vaultlayer/vincent-policy-app-metadata' as const,

  abilityParamsSchema,
  userParamsSchema,

  precheckAllowResultSchema,
  precheckDenyResultSchema,

  evalAllowResultSchema,
  evalDenyResultSchema,

  precheck: async ({ abilityParams, userParams }, { allow, deny }) => {
    try {
      const { appId } = abilityParams;

      // Validate required fields
      if (!appId) {
        return deny({
          reason: 'Missing required field: appId',
          appId: appId || 0,
        });
      }

      const validation = validateAppId(appId);

      if (!validation.allow) {
        const deniedValidation = validation as { allow: false; reason: string };
        return deny({
          reason: deniedValidation.reason,
          appId,
        });
      }

      return allow({
        appIdValid: true,
      });
    } catch (error) {
      console.error('Precheck error:', error);
      return deny({
        reason: error instanceof Error ? error.message : 'Unknown error',
        appId: abilityParams.appId || 0,
      });
    }
  },

  evaluate: async ({ abilityParams, userParams }, { allow, deny }) => {
    try {
      const { appId } = abilityParams;

      // Validate required fields
      if (!appId) {
        return deny({
          reason: 'Missing required field: appId',
          appId: appId || 0,
        });
      }

      const validation = validateAppId(appId);

      if (!validation.allow) {
        const deniedValidation = validation as { allow: false; reason: string };
        return deny({
          reason: deniedValidation.reason,
          appId,
        });
      }

      return allow({
        appIdValid: true,
      });
    } catch (error) {
      console.error('Evaluate error:', error);
      return deny({
        reason: error instanceof Error ? error.message : 'Unknown error',
        appId: abilityParams.appId || 0,
      });
    }
  },
});
