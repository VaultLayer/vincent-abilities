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

const { MISSING_PKP_TOKEN_ID, APP_NOT_DELEGATED_TO_DELEGATEE } = KNOWN_ERRORS;

// Contract constants
export const VINCENT_TOOL_POLICIES_CONTRACT = '0xa3a602F399E9663279cdF63a290101cB6560A87e';
export const VINCENT_TOOL_POLICIES_CONTRACT_RPC_URL = 'https://yellowstone-rpc.litprotocol.com';
export const LIT_CHAIN_ID = 175188;

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-unpermit-app' as const,
  abilityParamsSchema: abilityParamsSchema,
  abilityDescription:
    'Allows an agent to revoke its own app permissions, useful for cleaning up after completing tasks',
  supportedPolicies: supportedPoliciesForAbility([]), // No policies

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { fail, succeed, delegation }) => {
    // Get PKP tokenId from delegation context
    const pkpTokenId = delegation.delegatorPkpInfo.tokenId;
    if (!pkpTokenId) {
      return fail({
        error: 'Vault PKP tokenId is required for unpermit operation',
        reason: MISSING_PKP_TOKEN_ID,
      });
    }

    const delegateeAddress = delegation.delegateeAddress;
    if (!delegateeAddress) {
      return fail({
        error: 'Delegatee address is required for unpermit operation',
        reason: APP_NOT_DELEGATED_TO_DELEGATEE,
      });
    }

    // Verify that the app is delegated to the delegateeAddress and get app info
    const provider = new ethers.providers.JsonRpcProvider(VINCENT_TOOL_POLICIES_CONTRACT_RPC_URL);

    try {
      // Call getAppByDelegatee to get the app delegated to this delegatee
      // Note: This function reverts if:
      // 1. delegatee is address(0) - ZeroAddressNotAllowed
      // 2. delegatee is not registered (appId == 0) - DelegateeNotRegistered
      const getAppByDelegateeAbi = [
        'function getAppByDelegatee(address delegatee) view returns (tuple(uint40 id, bool isDeleted, address manager, uint24 latestVersion, address[] delegatees) app)',
      ];
      const contract = new ethers.Contract(
        VINCENT_TOOL_POLICIES_CONTRACT,
        getAppByDelegateeAbi,
        provider,
      );

      const app = await contract.getAppByDelegatee(delegateeAddress);

      // If the call succeeds, we know:
      // - delegatee is not address(0)
      // - delegatee is registered (appId != 0)

      // Check if app is deleted
      if (app.isDeleted) {
        return fail({
          error: `App is deleted for delegatee ${delegateeAddress}`,
          reason: APP_NOT_DELEGATED_TO_DELEGATEE,
        });
      }

      // Get appId from the app - safely convert to number
      // Handle both BigNumber and regular number types
      let appId: number;
      if (app.id && typeof app.id.toNumber === 'function') {
        appId = app.id.toNumber();
      } else if (app.id && typeof app.id.toString === 'function') {
        appId = Number(app.id.toString());
      } else {
        appId = Number(app.id);
      }

      // Verify the delegatee address is in the delegatees array
      const delegatees = app.delegatees.map((addr: string) => addr.toLowerCase());
      if (!delegatees.includes(delegateeAddress.toLowerCase())) {
        return fail({
          error: `Delegatee ${delegateeAddress} is not in the delegatees list for app ID ${appId}`,
          reason: APP_NOT_DELEGATED_TO_DELEGATEE,
        });
      }

      // Get the permitted app version for this PKP token and app
      const getPermittedAppVersionAbi = [
        'function getPermittedAppVersionForPkp(uint256 pkpTokenId, uint40 appId) view returns (uint24)',
      ];
      const permittedVersionContract = new ethers.Contract(
        VINCENT_TOOL_POLICIES_CONTRACT,
        getPermittedAppVersionAbi,
        provider,
      );

      const permittedAppVersion = await permittedVersionContract.getPermittedAppVersionForPkp(
        pkpTokenId.toString(),
        appId,
      );

      // Safely convert appVersion to number
      let appVersion: number;
      if (permittedAppVersion && typeof permittedAppVersion.toNumber === 'function') {
        appVersion = permittedAppVersion.toNumber();
      } else if (permittedAppVersion && typeof permittedAppVersion.toString === 'function') {
        appVersion = Number(permittedAppVersion.toString());
      } else {
        appVersion = Number(permittedAppVersion);
      }

      // Check if there's actually a permitted version (0 means no version is permitted)
      if (appVersion === 0) {
        return fail({
          error: `No app version is currently permitted for PKP ${pkpTokenId.toString()} and app ID ${appId}`,
          reason: APP_NOT_DELEGATED_TO_DELEGATEE,
        });
      }

      console.log(
        '[@vaultlayer/vincent-ability-unpermit-app/precheck] ✅ App is delegated to delegatee',
        {
          appId,
          appVersion,
          delegateeAddress,
        },
      );

      return succeed({
        pkpTokenId: pkpTokenId.toString(),
        appId,
        appVersion,
      });
    } catch (error) {
      console.error(
        '[@vaultlayer/vincent-ability-unpermit-app/precheck] Error verifying app delegation:',
        error,
      );

      // Check if the error is a revert indicating delegatee is not registered
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('DelegateeNotRegistered') ||
        errorMessage.includes('ZeroAddressNotAllowed') ||
        errorMessage.includes('execution reverted')
      ) {
        return fail({
          error: `Delegatee ${delegateeAddress} is not registered or associated with any app`,
          reason: APP_NOT_DELEGATED_TO_DELEGATEE,
        });
      }

      return fail({
        error:
          error instanceof Error
            ? `Failed to verify app delegation: ${error.message}`
            : 'Failed to verify app delegation: Unknown error',
        reason: APP_NOT_DELEGATED_TO_DELEGATEE,
      });
    }
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation }) => {
    try {
      // Get PKP tokenId from delegation context
      const pkpTokenId = delegation.delegatorPkpInfo.tokenId;
      if (!pkpTokenId) {
        return fail({
          error: 'Vault PKP tokenId is required for unpermit operation',
        });
      }

      const delegateeAddress = delegation.delegateeAddress;
      if (!delegateeAddress) {
        return fail({
          error: 'Delegatee address is required for unpermit operation',
        });
      }

      console.log(
        '[@vaultlayer/vincent-ability-unpermit-app/execute] Executing Unpermit App Version',
        {
          delegateeAddress,
        },
      );

      console.log(
        '[@vaultlayer/vincent-ability-unpermit-app/execute] PKP Token ID:',
        pkpTokenId.toString(),
      );

      // Get provider
      const provider = new ethers.providers.JsonRpcProvider(VINCENT_TOOL_POLICIES_CONTRACT_RPC_URL);

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

      // Get app info from delegatee to obtain appId
      const getAppByDelegateeAbi = [
        'function getAppByDelegatee(address delegatee) view returns (tuple(uint40 id, bool isDeleted, address manager, uint24 latestVersion, address[] delegatees) app)',
      ];
      const contract = new ethers.Contract(
        VINCENT_TOOL_POLICIES_CONTRACT,
        getAppByDelegateeAbi,
        provider,
      );

      const app = await contract.getAppByDelegatee(delegateeAddress);

      // Check if app is deleted
      if (app.isDeleted) {
        return fail({
          error: `App is deleted for delegatee ${delegateeAddress}`,
        });
      }

      // Safely convert appId to number
      let appId: number;
      if (app.id && typeof app.id.toNumber === 'function') {
        appId = app.id.toNumber();
      } else if (app.id && typeof app.id.toString === 'function') {
        appId = Number(app.id.toString());
      } else {
        appId = Number(app.id);
      }

      // Get the permitted app version for this PKP token and app
      const getPermittedAppVersionAbi = [
        'function getPermittedAppVersionForPkp(uint256 pkpTokenId, uint40 appId) view returns (uint24)',
      ];
      const permittedVersionContract = new ethers.Contract(
        VINCENT_TOOL_POLICIES_CONTRACT,
        getPermittedAppVersionAbi,
        provider,
      );

      const permittedAppVersion = await permittedVersionContract.getPermittedAppVersionForPkp(
        pkpTokenId.toString(),
        appId,
      );

      // Safely convert appVersion to number
      let appVersion: number;
      if (permittedAppVersion && typeof permittedAppVersion.toNumber === 'function') {
        appVersion = permittedAppVersion.toNumber();
      } else if (permittedAppVersion && typeof permittedAppVersion.toString === 'function') {
        appVersion = Number(permittedAppVersion.toString());
      } else {
        appVersion = Number(permittedAppVersion);
      }

      // Check if there's actually a permitted version (0 means no version is permitted)
      if (appVersion === 0) {
        return fail({
          error: `No app version is currently permitted for PKP ${pkpTokenId.toString()} and app ID ${appId}`,
        });
      }

      console.log('[@vaultlayer/vincent-ability-unpermit-app/execute] App info retrieved:', {
        appId,
        appVersion,
        delegateeAddress,
      });

      // Prepare contract call
      const functionName = 'unPermitAppVersion';
      const functionAbi =
        'function unPermitAppVersion(uint256 pkpTokenId, uint40 appId, uint24 appVersion)';
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
