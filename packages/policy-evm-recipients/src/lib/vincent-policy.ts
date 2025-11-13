import { createVincentPolicy } from '@lit-protocol/vincent-ability-sdk';

import {
  evalAllowResultSchema,
  evalDenyResultSchema,
  precheckAllowResultSchema,
  precheckDenyResultSchema,
  abilityParamsSchema,
  userParamsSchema,
} from './schemas';

export const vincentPolicy = createVincentPolicy({
  packageName: '@vaultlayer/vincent-policy-evm-recipients' as const,

  abilityParamsSchema,
  userParamsSchema,

  precheckAllowResultSchema,
  precheckDenyResultSchema,

  evalAllowResultSchema,
  evalDenyResultSchema,

  precheck: async (
    { abilityParams, userParams },
    { allow, deny, delegation: { delegatorPkpInfo } },
  ) => {
    try {
      const { to } = abilityParams;
      const { allowedRecipients } = userParams;

      // Build final allowed list: user's allowedRecipients + delegator's ethAddress
      let finalAllowedRecipients = allowedRecipients;
      if (allowedRecipients.length === 0) {
        finalAllowedRecipients = [delegatorPkpInfo.ethAddress];
      } else if (!allowedRecipients.includes(delegatorPkpInfo.ethAddress)) {
        finalAllowedRecipients = allowedRecipients.concat(delegatorPkpInfo.ethAddress);
      }

      // Check if the recipient address is in the allowed list
      if (!finalAllowedRecipients.includes(to)) {
        return deny({
          reason: `Recipient address ${to} is not in the allowed recipients list`,
          recipient: to,
          allowedRecipients: finalAllowedRecipients,
          delegatorEthAddress: delegatorPkpInfo.ethAddress,
        });
      }

      return allow({
        recipient: to,
        allowedRecipients: finalAllowedRecipients,
        delegatorEthAddress: delegatorPkpInfo.ethAddress,
      });
    } catch (error) {
      console.error('Policy precheck error:', error);
      return deny({
        reason: error instanceof Error ? error.message : 'Unknown error during precheck',
      });
    }
  },

  evaluate: async (
    { abilityParams, userParams },
    { allow, deny, delegation: { delegatorPkpInfo } },
  ) => {
    try {
      const { to } = abilityParams;
      const { allowedRecipients } = userParams;

      // Build final allowed list: user's allowedRecipients + delegator's ethAddress
      let finalAllowedRecipients = allowedRecipients;
      if (allowedRecipients.length === 0) {
        finalAllowedRecipients = [delegatorPkpInfo.ethAddress];
      } else if (!allowedRecipients.includes(delegatorPkpInfo.ethAddress)) {
        finalAllowedRecipients = allowedRecipients.concat(delegatorPkpInfo.ethAddress);
      }

      // Check if the recipient address is in the allowed list
      if (!finalAllowedRecipients.includes(to)) {
        return deny({
          reason: `Recipient address ${to} is not in the allowed recipients list`,
          recipient: to,
          allowedRecipients: finalAllowedRecipients,
          delegatorEthAddress: delegatorPkpInfo.ethAddress,
        });
      }

      return allow({
        recipient: to,
        allowedRecipients: finalAllowedRecipients,
        delegatorEthAddress: delegatorPkpInfo.ethAddress,
      });
    } catch (error) {
      console.error('Policy evaluation error:', error);
      return deny({
        reason: error instanceof Error ? error.message : 'Unknown error during evaluation',
      });
    }
  },
});
