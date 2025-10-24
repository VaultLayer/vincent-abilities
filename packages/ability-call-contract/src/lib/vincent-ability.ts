import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-call-contract-whitelist';
import { ethers } from 'ethers';

import {
  createVincentAbility,
  createVincentAbilityPolicy,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';

import { commitAllowedPolicies, decodeFunctionArgsBase64, executeOperation } from './helpers';
import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
} from './schemas';

// Declare Lit global for Lit Action environment
declare const Lit: {
  Actions: {
    getRpcUrl: (params: { chain: string }) => Promise<string>;
  };
};

const CallContractWhitelistPolicy = createVincentAbilityPolicy({
  abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    contractAddress: 'contractAddress',
    functionAbi: 'functionAbi',
    functionName: 'functionName',
    functionArgs: 'functionArgs',
    functionArgsBase64: 'functionArgsBase64',
    value: 'value',
    appendToCallData: 'appendToCallData',
    chain: 'chain',
    chainId: 'chainId',
  },
});

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-call-contract' as const,
  abilityDescription:
    'Ability to call any smart contract function with configurable whitelisting policies' as const,
  abilityParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([CallContractWhitelistPolicy]),

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail, delegation }) => {
    console.log('[@vaultlayer/vincent-ability-call-contract/precheck] 🔍 Starting validation');
    console.log('[@vaultlayer/vincent-ability-call-contract/precheck] 📋 params:', {
      abilityParams,
    });

    const {
      contractAddress,
      functionAbi,
      functionName,
      functionArgs,
      functionArgsBase64,
      value = '0',
      appendToCallData,
      rpcUrl,
      alchemyGasSponsor,
      alchemyGasSponsorApiKey,
      alchemyGasSponsorPolicyId,
    } = abilityParams;

    // Validate EIP-7702 gas sponsorship
    if (alchemyGasSponsor && (!alchemyGasSponsorApiKey || !alchemyGasSponsorPolicyId)) {
      return fail({
        error:
          '[@vaultlayer/vincent-ability-call-contract/precheck] Alchemy gas sponsor is enabled, but missing Alchemy API key or policy ID',
      });
    }

    // Validate RPC URL
    if (!rpcUrl) {
      return fail({
        error:
          '[@vaultlayer/vincent-ability-call-contract/precheck] RPC URL is required for precheck',
      });
    }

    // Validate that either functionArgs or functionArgsBase64 is provided
    if (!functionArgs && !functionArgsBase64) {
      return fail({
        error:
          '[@vaultlayer/vincent-ability-call-contract/precheck] Either functionArgs or functionArgsBase64 must be provided',
      });
    }

    // Validate appendToCallData format if provided
    if (appendToCallData) {
      const cleanAppendData = appendToCallData.startsWith('0x')
        ? appendToCallData.slice(2)
        : appendToCallData;

      // Validate hex format
      if (!/^[a-fA-F0-9]*$/.test(cleanAppendData)) {
        return fail({
          error:
            '[@vaultlayer/vincent-ability-call-contract/precheck] appendToCallData must be a valid hex string',
        });
      }
    }

    try {
      // Decode function args if base64 encoded
      const decodedArgs = functionArgsBase64
        ? decodeFunctionArgsBase64(functionArgsBase64)
        : functionArgs;

      console.log(
        '[@vaultlayer/vincent-ability-call-contract/precheck] 🔢 Using function args:',
        decodedArgs,
      );

      // Validate function ABI and encode function data
      const iface = new ethers.utils.Interface([functionAbi]);
      const encodedData = iface.encodeFunctionData(functionName, decodedArgs);

      console.log('[@vaultlayer/vincent-ability-call-contract/precheck] ✅ Function ABI is valid');
      console.log(
        '[@vaultlayer/vincent-ability-call-contract/precheck] 📦 Encoded data:',
        encodedData,
      );

      // Create provider and estimate gas
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Estimate gas for the transaction
      const estimatedGas = await provider.estimateGas({
        from: delegation.delegatorPkpInfo.ethAddress,
        to: contractAddress,
        data: encodedData,
        value: value || '0',
      });

      console.log(
        '[@vaultlayer/vincent-ability-call-contract/precheck] 💰 Estimated gas:',
        estimatedGas.toString(),
      );

      // Check native balance if not using gas sponsorship
      const nativeBalance = await provider.getBalance(delegation.delegatorPkpInfo.ethAddress);

      if (!alchemyGasSponsor && nativeBalance.lt(estimatedGas)) {
        return fail({
          error: `[@vaultlayer/vincent-ability-call-contract/precheck] ❌ Insufficient gas. Need ${estimatedGas.toString()} gas, but only have ${nativeBalance.toString()} gas`,
        });
      }

      // Precheck succeeded
      const successResult = {
        contractAddressValid: true,
        functionAbiValid: true,
        functionArgsValid: true,
        estimatedGas: estimatedGas.toString(),
        nativeBalance: nativeBalance.toString(),
      };

      console.log(
        '[@vaultlayer/vincent-ability-call-contract/precheck] ✅ Success result:',
        successResult,
      );
      return succeed(successResult);
    } catch (error) {
      console.error(
        '[@vaultlayer/vincent-ability-call-contract/precheck] ❌ Precheck failed:',
        error,
      );

      let errorMessage =
        '[@vaultlayer/vincent-ability-call-contract/precheck] ❌ Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = `[@vaultlayer/vincent-ability-call-contract/precheck] ❌ ${error.message}`;
      }

      return fail({
        error: errorMessage,
      });
    }
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation, policiesContext }) => {
    try {
      const {
        contractAddress,
        functionAbi,
        functionName,
        functionArgs,
        functionArgsBase64,
        value = '0',
        appendToCallData,
        chain,
        chainId,
        alchemyGasSponsor,
        alchemyGasSponsorApiKey,
        alchemyGasSponsorPolicyId,
      } = abilityParams;

      console.log(
        '[@vaultlayer/vincent-ability-call-contract/execute] 🚀 Executing Contract Call Ability',
        {
          contractAddress,
          functionName,
          chain,
          value,
        },
      );

      if (alchemyGasSponsor && (!alchemyGasSponsorApiKey || !alchemyGasSponsorPolicyId)) {
        return fail({
          error:
            '[@vaultlayer/vincent-ability-call-contract/execute] Alchemy gas sponsor is enabled, but missing Alchemy API key or policy ID',
        });
      }

      // Get provider
      let provider: ethers.providers.JsonRpcProvider;
      try {
        provider = new ethers.providers.JsonRpcProvider(await Lit.Actions.getRpcUrl({ chain }));
      } catch (error) {
        console.error('[@vaultlayer/vincent-ability-call-contract/execute] Provider error:', error);
        throw new Error('Unable to obtain blockchain provider for contract call operations');
      }

      const { chainId: networkChainId } = await provider.getNetwork();

      // Verify chain ID matches
      if (networkChainId !== chainId) {
        return fail({
          error: `[@vaultlayer/vincent-ability-call-contract/execute] Chain ID mismatch. Expected ${chainId}, got ${networkChainId}`,
        });
      }

      console.log('[@vaultlayer/vincent-ability-call-contract/execute] ⛓️ Using Chain:', chain);

      // Decode function args if base64 encoded
      const decodedArgs = functionArgsBase64
        ? decodeFunctionArgsBase64(functionArgsBase64)
        : functionArgs;

      console.log(
        '[@vaultlayer/vincent-ability-call-contract/execute] 🔢 Using function args:',
        decodedArgs,
      );

      // Prepare contract call data
      const contractCallData = {
        provider,
        pkpPublicKey: delegation.delegatorPkpInfo.publicKey,
        callerAddress: delegation.delegatorPkpInfo.ethAddress,
        contractAddress,
        functionAbi,
        functionName,
        args: decodedArgs ?? [],
        chainId: networkChainId,
        value,
        appendToCallData,
        alchemyGasSponsor,
        alchemyGasSponsorApiKey,
        alchemyGasSponsorPolicyId,
      };

      console.log(
        '[@vaultlayer/vincent-ability-call-contract/execute] 🔧 Full contractCallData:',
        JSON.stringify(contractCallData, null, 2),
      );

      console.log(
        '[@vaultlayer/vincent-ability-call-contract/execute] 🚀 Attempting contract call...',
      );

      // Commit policy changes to the blockchain before the transaction
      const policyCommitResults = await commitAllowedPolicies(
        policiesContext,
        '[@vaultlayer/vincent-ability-call-contract/execute]',
      );

      console.log(
        '[@vaultlayer/vincent-ability-call-contract/execute] ✅ Policy commit results:',
        policyCommitResults,
      );

      // Execute the contract call using helper
      const txHash = await executeOperation(contractCallData);

      console.log(
        '[@vaultlayer/vincent-ability-call-contract/execute] ✅ Contract call completed, txHash:',
        txHash,
      );

      console.log(
        '[@vaultlayer/vincent-ability-call-contract/execute] ✅ Contract call successful',
        {
          txHash,
          contractAddress,
          functionName,
          value,
        },
      );

      return succeed({
        txHash,
        contractAddress,
        functionName,
        value,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(
        '[@vaultlayer/vincent-ability-call-contract/execute] ❌ Contract call failed',
        error,
      );

      let errorMessage =
        '[@vaultlayer/vincent-ability-call-contract/execute] ❌ Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = `[@vaultlayer/vincent-ability-call-contract/execute] ❌ ${error.message}`;
      }

      return fail({
        error: errorMessage,
      });
    }
  },
});
