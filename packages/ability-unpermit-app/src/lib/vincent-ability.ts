import { ethers } from 'ethers';

import {
  createVincentAbility,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';
import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
  KNOWN_ERRORS,
} from './schemas';

// Declare Lit global for Lit Action environment
declare const Lit: {
  Actions: {
    getRpcUrl: (params: { chain: string }) => Promise<string>;
  };
};

const { MISSING_PKP_TOKEN_ID, INVALID_APP_ID, INVALID_APP_VERSION } = KNOWN_ERRORS;

// Contract constants
export const VINCENT_TOOL_POLICIES_CONTRACT = '0x78Cd1d270Ff12BA55e98BDff1f3646426E25D932';
export const VINCENT_TOOL_POLICIES_CONTRACT_RPC_URL = 'https://yellowstone-rpc.litprotocol.com';
export const LIT_CHAIN_ID = 175188;

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-unpermit-app' as const,
  abilityParamsSchema: abilityParamsSchema,
  abilityDescription:
    'Unpermit an app version for a delegatee by calling the Lit contracts directly',
  supportedPolicies: supportedPoliciesForAbility([]), // No policies

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { fail, succeed, delegation }) => {
    const { appId, appVersion } = abilityParams;

    // Get PKP tokenId from delegation context
    const pkpTokenId = delegation.delegatorPkpInfo.tokenId;
    if (!pkpTokenId) {
      return fail({
        error: 'Vault PKP tokenId is required for unpermit operation',
        reason: MISSING_PKP_TOKEN_ID,
      });
    }

    // Validate appId
    if (!appId || appId <= 0) {
      return fail({
        error: `Invalid app ID: ${appId}`,
        reason: INVALID_APP_ID,
      });
    }

    // Validate appVersion
    if (!appVersion || appVersion <= 0) {
      return fail({
        error: `Invalid app version: ${appVersion}`,
        reason: INVALID_APP_VERSION,
      });
    }

    return succeed({
      pkpTokenId: pkpTokenId.toString(),
      appId,
      appVersion,
    });
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation }) => {
    try {
      const { appId, appVersion } = abilityParams;

      console.log(
        '[@vaultlayer/vincent-ability-unpermit-app/execute] Executing Unpermit App Version',
        {
          appId,
          appVersion,
        },
      );

      // Get PKP tokenId from delegation context
      const pkpTokenId = delegation.delegatorPkpInfo.tokenId;
      if (!pkpTokenId) {
        return fail({
          error: 'Vault PKP tokenId is required for unpermit operation',
        });
      }

      console.log(
        '[@vaultlayer/vincent-ability-unpermit-app/execute] PKP Token ID:',
        pkpTokenId.toString(),
      );

      // Get provider
      let provider: ethers.providers.JsonRpcProvider;
      try {
        const rpcUrl = await Lit.Actions.getRpcUrl({ chain: 'yellowstone' });
        provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      } catch (error) {
        console.error('[@vaultlayer/vincent-ability-unpermit-app/execute] Provider error:', error);
        // Fallback to default RPC URL
        provider = new ethers.providers.JsonRpcProvider(VINCENT_TOOL_POLICIES_CONTRACT_RPC_URL);
      }

      const { chainId: networkChainId } = await provider.getNetwork();

      // Verify chain ID matches
      if (networkChainId !== LIT_CHAIN_ID) {
        return fail({
          error: `[@vaultlayer/vincent-ability-unpermit-app/execute] Chain ID mismatch. Expected ${LIT_CHAIN_ID}, got ${networkChainId}`,
        });
      }

      console.log(
        '[@vaultlayer/vincent-ability-unpermit-app/execute] ⛓️ Using Chain: yellowstone (Chain ID:',
        networkChainId,
        ')',
      );

      // Prepare contract call
      const functionName = 'unPermitAppVersion';
      const functionAbi = 'function unPermitAppVersion(uint256,uint256,uint256)';
      const functionArgs = [pkpTokenId.toString(), appId, appVersion];

      console.log('[@vaultlayer/vincent-ability-unpermit-app/execute] Contract call parameters:', {
        contractAddress: VINCENT_TOOL_POLICIES_CONTRACT,
        functionName,
        functionArgs,
      });

      // Get PKP's public key from the delegation context
      const pkpPublicKey = delegation.delegatorPkpInfo.publicKey;
      const callerAddress = delegation.delegatorPkpInfo.ethAddress;

      // Execute the contract call
      const txHash = await laUtils.transaction.handler.contractCall({
        provider,
        pkpPublicKey,
        callerAddress,
        abi: [functionAbi],
        contractAddress: VINCENT_TOOL_POLICIES_CONTRACT,
        functionName,
        args: functionArgs,
        chainId: networkChainId,
        overrides: {
          value: '0',
        },
      });

      console.log(
        '[@vaultlayer/vincent-ability-unpermit-app/execute] ✅ Unpermit app version successful',
        {
          txHash,
          pkpTokenId: pkpTokenId.toString(),
          appId,
          appVersion,
        },
      );

      return succeed({
        txHash,
        pkpTokenId: pkpTokenId.toString(),
        appId,
        appVersion,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(
        '[@vaultlayer/vincent-ability-unpermit-app/execute] Unpermit app version failed',
        error,
      );

      return fail({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },
});
