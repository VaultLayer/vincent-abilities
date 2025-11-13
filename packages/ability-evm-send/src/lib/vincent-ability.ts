import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-evm-recipients';

import {
  createVincentAbility,
  createVincentAbilityPolicy,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';
import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

import type { LitNamespace } from '../Lit';

import { ERC20_ABI, getErc20Contract, ethers } from './helpers';
import { commitAllowedPolicies } from './helpers/commit-allowed-policies';
import { executeOperation } from './helpers/execute-operation';
import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
} from './schemas';

declare const Lit: typeof LitNamespace;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Helper to determine if transfer is native
function isNativeTransfer(tokenAddress?: string): boolean {
  return !tokenAddress || tokenAddress === ZERO_ADDRESS;
}

const EvmRecipientsPolicy = createVincentAbilityPolicy({
  abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    to: 'to',
  },
});

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-evm-send' as const,
  abilityDescription: 'Ability to send native ETH or ERC20 tokens to EVM addresses' as const,
  abilityParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([EvmRecipientsPolicy]),

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail, delegation }) => {
    console.log('[@vaultlayer/vincent-ability-evm-send/precheck] 🔍 Starting validation');
    console.log('[@vaultlayer/vincent-ability-evm-send/precheck] 📋 params:', {
      abilityParams,
    });

    const {
      to,
      amount,
      tokenAddress,
      rpcUrl,
      alchemyGasSponsor,
      alchemyGasSponsorApiKey,
      alchemyGasSponsorPolicyId,
    } = abilityParams;

    const isNative = isNativeTransfer(tokenAddress);

    // Validate EIP-7702 gas sponsorship
    if (alchemyGasSponsor && (!alchemyGasSponsorApiKey || !alchemyGasSponsorPolicyId)) {
      return fail({
        error:
          '[@vaultlayer/vincent-ability-evm-send/precheck] Alchemy gas sponsor is enabled, but missing Alchemy API key or policy ID',
      });
    }

    // Validate RPC URL
    if (!rpcUrl) {
      return fail({
        error: '[@vaultlayer/vincent-ability-evm-send/precheck] RPC URL is required for precheck',
      });
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const delegatorAddress = delegation.delegatorPkpInfo.ethAddress;

    if (isNative) {
      // Native ETH transfer validation
      const nativeBalance = await provider.getBalance(delegatorAddress);
      const amountInWei = ethers.utils.parseEther(amount);

      if (nativeBalance.lt(amountInWei)) {
        return fail({
          error: `[@vaultlayer/vincent-ability-evm-send/precheck] ❌ Insufficient native balance. Need ${amount} ETH, but only have ${ethers.utils.formatEther(nativeBalance)} ETH`,
        });
      }

      return succeed({
        addressValid: true,
        amountValid: true,
        estimatedGas: '21000', // Standard ETH transfer gas
        userBalance: nativeBalance.toString(),
        isNative: true,
      });
    } else {
      // ERC20 token transfer validation
      if (!tokenAddress) {
        return fail({
          error: 'Token address is required for ERC20 transfers',
        });
      }
      const erc20Contract = getErc20Contract(provider, tokenAddress);
      const tokenDecimals = await erc20Contract.decimals();
      console.log(
        '[@vaultlayer/vincent-ability-evm-send/precheck] 🔢 Using token decimals:',
        tokenDecimals,
      );

      const tokenAmountInSmallestUnit = ethers.utils.parseUnits(amount, tokenDecimals);
      console.log(
        '[@vaultlayer/vincent-ability-evm-send/precheck] 💰 Transfer amount in smallest unit:',
        tokenAmountInSmallestUnit.toString(),
      );

      // Check token balance
      const userBalance = await erc20Contract.balanceOf(delegatorAddress);
      console.log(
        '[@vaultlayer/vincent-ability-evm-send/precheck] 💰 User balance in smallest unit:',
        ethers.utils.formatUnits(userBalance, tokenDecimals),
      );

      if (userBalance.lt(tokenAmountInSmallestUnit)) {
        return fail({
          error: `[@vaultlayer/vincent-ability-evm-send/precheck] ❌ Insufficient token balance. Need ${ethers.utils.formatUnits(tokenAmountInSmallestUnit, tokenDecimals)} tokens, but only have ${ethers.utils.formatUnits(userBalance, tokenDecimals)} tokens`,
        });
      }

      // Estimate transfer gas and check there is enough
      const estimatedGas = await erc20Contract.estimateGas.transfer(to, tokenAmountInSmallestUnit, {
        from: delegatorAddress,
      });
      console.log(
        '[@vaultlayer/vincent-ability-evm-send/precheck] 💰 Estimated gas:',
        estimatedGas.toString(),
      );

      const nativeBalance = await provider.getBalance(delegatorAddress);
      if (!alchemyGasSponsor && nativeBalance.lt(estimatedGas)) {
        return fail({
          error: `[@vaultlayer/vincent-ability-evm-send/precheck] ❌ Insufficient gas for ERC20 transfer. Need ${estimatedGas.toString()} gas, but only have ${nativeBalance.toString()} gas`,
        });
      }

      return succeed({
        addressValid: true,
        amountValid: true,
        estimatedGas: estimatedGas.toString(),
        userBalance: userBalance.toString(),
        isNative: false,
      });
    }
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation, policiesContext }) => {
    try {
      const {
        to,
        amount,
        tokenAddress,
        chain,
        rpcUrl,
        alchemyGasSponsor,
        alchemyGasSponsorApiKey,
        alchemyGasSponsorPolicyId,
      } = abilityParams;

      const isNative = isNativeTransfer(tokenAddress);

      console.log('[@vaultlayer/vincent-ability-evm-send/execute] 🚀 Executing EVM Send Ability', {
        to,
        amount,
        tokenAddress,
        chain,
        isNative,
      });

      if (alchemyGasSponsor && (!alchemyGasSponsorApiKey || !alchemyGasSponsorPolicyId)) {
        return fail({
          error:
            '[@vaultlayer/vincent-ability-evm-send/execute] Alchemy gas sponsor is enabled, but missing Alchemy API key or policy ID',
        });
      }

      let txHash: string;

      if (isNative) {
        // Native ETH transfer
        const finalRpcUrl = rpcUrl || 'https://yellowstone-rpc.litprotocol.com/';
        const provider = new ethers.providers.JsonRpcProvider(finalRpcUrl);
        const pkpPublicKey = delegation.delegatorPkpInfo.publicKey;

        console.log('[@vaultlayer/vincent-ability-evm-send/execute] Using RPC URL:', finalRpcUrl);

        txHash = await laUtils.transaction.handler.nativeSend({
          provider,
          pkpPublicKey,
          amount,
          to,
        });

        console.log('[@vaultlayer/vincent-ability-evm-send/execute] Native send successful', {
          txHash,
          to,
          amount,
        });
      } else {
        // ERC20 token transfer
        if (!tokenAddress) {
          return fail({
            error: 'Token address is required for ERC20 transfers',
          });
        }
        let provider: ethers.providers.JsonRpcProvider;
        try {
          provider = new ethers.providers.JsonRpcProvider(await Lit.Actions.getRpcUrl({ chain }));
        } catch (error) {
          console.error('[@vaultlayer/vincent-ability-evm-send/execute] Provider error:', error);
          throw new Error('Unable to obtain blockchain provider for transfer operations');
        }
        const { chainId } = await provider.getNetwork();
        const erc20Contract = getErc20Contract(provider, tokenAddress);

        console.log('[@vaultlayer/vincent-ability-evm-send/execute] ⛓️ Using Chain:', chain);

        // Get decimals
        const tokenDecimals = await erc20Contract.decimals();
        console.log(
          '[@vaultlayer/vincent-ability-evm-send/execute] 🔢 Using token decimals:',
          tokenDecimals,
        );

        // Parse amount to token units using decimals
        const tokenAmountInSmallestUnit = ethers.utils.parseUnits(amount, tokenDecimals);
        console.log(
          '[@vaultlayer/vincent-ability-evm-send/execute] 💰 Transfer amount in smallest unit:',
          tokenAmountInSmallestUnit.toString(),
        );

        // Prepare contract call data for ERC-20 transfer
        const contractCallData = {
          provider,
          pkpPublicKey: delegation.delegatorPkpInfo.publicKey,
          callerAddress: delegation.delegatorPkpInfo.ethAddress,
          contractAddress: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [to, tokenAmountInSmallestUnit],
          chainId,
          alchemyGasSponsor,
          alchemyGasSponsorApiKey,
          alchemyGasSponsorPolicyId,
        };

        console.log(
          '[@vaultlayer/vincent-ability-evm-send/execute] 🔧 Full contractCallData:',
          JSON.stringify(contractCallData, null, 2),
        );

        console.log(
          '[@vaultlayer/vincent-ability-evm-send/execute] 🚀 Attempting contract call...',
        );

        // Execute the ERC-20 transfer using laUtils
        txHash = await executeOperation(contractCallData);

        console.log(
          '[@vaultlayer/vincent-ability-evm-send/execute] ✅ Contract call completed, txHash:',
          txHash,
        );
      }

      // Commit policy changes
      const policyCommitResults = await commitAllowedPolicies(
        policiesContext,
        '[@vaultlayer/vincent-ability-evm-send/execute]',
      );

      console.log(
        '[@vaultlayer/vincent-ability-evm-send/execute] ✅ Policy commit results:',
        policyCommitResults,
      );

      console.log('[@vaultlayer/vincent-ability-evm-send/execute] ✅ Transfer successful', {
        txHash,
        to,
        amount,
        tokenAddress,
        isNative,
      });

      return succeed({
        txHash,
        to,
        amount,
        tokenAddress,
        timestamp: Date.now(),
        isNative,
      });
    } catch (error) {
      console.error('[@vaultlayer/vincent-ability-evm-send/execute] ❌ Transfer failed', error);

      let errorMessage = '[@vaultlayer/vincent-ability-evm-send/execute] ❌ Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = `[@vaultlayer/vincent-ability-evm-send/execute] ❌ ${error.message}`;
      }

      return fail({
        error: errorMessage,
      });
    }
  },
});
