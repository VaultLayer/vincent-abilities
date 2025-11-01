import { ethers } from 'ethers';

import {
  createVincentAbility,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';

import type {
  CheckNativeTokenBalanceResultSuccess,
  CheckErc20BalanceResultFailure,
  CheckNativeTokenBalanceResultFailure,
} from './types';

import { checkErc20Balance, checkErc20Allowance, checkNativeTokenBalance } from './ability-checks';
import {
  getBridgeAddress,
  getUsdcTokenAddress,
  isCoredaoRouteSupported,
  getLzV1ChainId,
  estimateBridgeFee,
  sendErc20ApprovalTx,
  sendOriginalBridgeTx,
  sendWrappedBridgeTx,
  getRpcUrl,
} from './ability-helpers';
import { STANDARD_CHAIN_IDS, USDC_DECIMALS } from './config';
import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
} from './schemas';

export const bigintReplacer = (key: any, value: any) => {
  return typeof value === 'bigint' ? value.toString() : value;
};

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-coredao-bridge' as const,
  abilityDescription:
    'Bridges USDC to/from CoreDAO using LayerZero v1 protocol via Original Token Bridge and Wrapped Token Bridge contracts' as const,

  abilityParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([]),

  executeSuccessSchema,
  executeFailSchema,

  precheckSuccessSchema,
  precheckFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    console.log(
      'Prechecking CoredaoBridgeAbility',
      JSON.stringify(abilityParams, bigintReplacer, 2),
    );

    const { sourceChain, destinationChain, amount, rpcUrl, alchemyGasSponsor } = abilityParams;

    // Validate route is supported
    const routeInfo = isCoredaoRouteSupported(sourceChain, destinationChain);
    if (!routeInfo.supported) {
      return fail({
        reason: `Route from ${sourceChain} to ${destinationChain} is not supported by CoreDAO LayerZero v1 bridge. Supported routes: Base↔CoreDAO, Arbitrum↔CoreDAO, CoreDAO→Ethereum`,
      });
    }

    // Get RPC URL (use provided or resolve via Lit's chain config)
    let finalRpcUrl: string;
    if (rpcUrl) {
      finalRpcUrl = rpcUrl;
    } else {
      finalRpcUrl = await getRpcUrl(sourceChain);
    }

    const provider = new ethers.providers.StaticJsonRpcProvider(finalRpcUrl);

    // Validate that RPC URL chain ID matches source chain
    const network = await provider.getNetwork();
    const sourceChainId = STANDARD_CHAIN_IDS[sourceChain];
    if (network.chainId !== sourceChainId) {
      return fail({
        reason: `RPC URL chain ID (${network.chainId}) does not match source chain ID (${sourceChainId}) for ${sourceChain}`,
      });
    }
    const delegatorPkpAddress = delegatorPkpInfo.ethAddress;

    // Validate gas sponsorship is not enabled on CoreDAO
    if (alchemyGasSponsor && sourceChain === 'coreDao') {
      return fail({
        reason:
          'Alchemy gas sponsorship is not supported on CoreDAO chain. Please set alchemyGasSponsor to false for CoreDAO bridges.',
      });
    }

    // 1. If alchemyGasSponsor is not enabled, check native token balance for gas
    let checkNativeTokenBalanceResultSuccess: CheckNativeTokenBalanceResultSuccess | undefined;
    if (!alchemyGasSponsor) {
      const checkNativeTokenBalanceResult = await checkNativeTokenBalance({
        provider,
        pkpEthAddress: delegatorPkpAddress,
      });
      if (!checkNativeTokenBalanceResult.success) {
        const failure = checkNativeTokenBalanceResult as CheckNativeTokenBalanceResultFailure;
        return fail({
          reason: failure.reason,
        });
      }
      checkNativeTokenBalanceResultSuccess = checkNativeTokenBalanceResult;
    }

    // 2. Get USDC token address for source chain
    const usdcTokenAddress = getUsdcTokenAddress(sourceChain);
    const requiredUsdcAmount = ethers.utils.parseUnits(amount, USDC_DECIMALS);

    // 3. Check USDC balance
    const checkErc20BalanceResult = await checkErc20Balance({
      provider,
      pkpEthAddress: delegatorPkpAddress,
      tokenAddress: usdcTokenAddress,
      requiredTokenAmount: requiredUsdcAmount,
    });
    if (!checkErc20BalanceResult.success) {
      const failure = checkErc20BalanceResult as CheckErc20BalanceResultFailure;
      return fail({
        reason: failure.reason,
        tokenAddress: failure.tokenAddress,
        requiredTokenAmount: ethers.utils.formatUnits(failure.requiredTokenAmount, USDC_DECIMALS),
        tokenBalance: ethers.utils.formatUnits(failure.tokenBalance, USDC_DECIMALS),
      });
    }

    // 4. Get bridge address
    const bridgeAddress = getBridgeAddress(sourceChain, destinationChain);

    // 5. Check USDC allowance for bridge contract
    const checkErc20AllowanceResult = await checkErc20Allowance({
      provider,
      tokenAddress: usdcTokenAddress,
      owner: delegatorPkpAddress,
      spender: bridgeAddress,
      requiredAllowance: requiredUsdcAmount,
    });

    // 6. Estimate bridge fees
    let estimatedFees: string | undefined;
    try {
      const feeEstimate = await estimateBridgeFee({
        provider,
        bridgeAddress,
        bridgeType: routeInfo.bridgeType!,
        destinationLzV1ChainId: routeInfo.destinationLzV1ChainId!,
      });
      estimatedFees = ethers.utils.formatEther(feeEstimate.nativeFee);
    } catch (error) {
      console.warn('Failed to estimate bridge fees, will estimate during execution:', error);
      // Continue without estimated fees
    }

    // 7. Return success with validation results
    return succeed({
      nativeTokenBalance: checkNativeTokenBalanceResultSuccess?.ethBalance.toString(),
      usdcBalance: ethers.utils.formatUnits(checkErc20BalanceResult.tokenBalance, USDC_DECIMALS),
      currentAllowance: ethers.utils.formatUnits(
        checkErc20AllowanceResult.currentAllowance,
        USDC_DECIMALS,
      ),
      requiredAllowance: ethers.utils.formatUnits(
        checkErc20AllowanceResult.requiredAllowance,
        USDC_DECIMALS,
      ),
      bridgeAddress,
      estimatedFees,
      bridgeType: routeInfo.bridgeType!,
    });
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    console.log('Executing CoredaoBridgeAbility', JSON.stringify(abilityParams, bigintReplacer, 2));

    const {
      sourceChain,
      destinationChain,
      amount,
      rpcUrl,
      alchemyGasSponsor,
      alchemyGasSponsorApiKey,
      alchemyGasSponsorPolicyId,
    } = abilityParams;

    try {
      // Validate route is supported
      const routeInfo = isCoredaoRouteSupported(sourceChain, destinationChain);
      if (!routeInfo.supported) {
        return fail({
          reason: `Route from ${sourceChain} to ${destinationChain} is not supported by CoreDAO LayerZero v1 bridge`,
        });
      }

      // Get RPC URL (use provided or resolve via Lit's chain config)
      let finalRpcUrl: string;
      if (rpcUrl) {
        finalRpcUrl = rpcUrl;
      } else {
        finalRpcUrl = await getRpcUrl(sourceChain);
      }

      const provider = new ethers.providers.StaticJsonRpcProvider(finalRpcUrl);

      // Validate that RPC URL chain ID matches source chain
      const network = await provider.getNetwork();
      const sourceChainId = STANDARD_CHAIN_IDS[sourceChain];
      if (network.chainId !== sourceChainId) {
        return fail({
          reason: `RPC URL chain ID (${network.chainId}) does not match source chain ID (${sourceChainId}) for ${sourceChain}`,
        });
      }

      const usdcTokenAddress = getUsdcTokenAddress(sourceChain);
      const bridgeAddress = getBridgeAddress(sourceChain, destinationChain);
      const requiredUsdcAmount = ethers.utils.parseUnits(amount, USDC_DECIMALS);

      // 1. Ensure USDC approval for bridge contract (inline, not separate action)
      let approvalTxHash: string | undefined;

      const checkErc20AllowanceResult = await checkErc20Allowance({
        provider,
        tokenAddress: usdcTokenAddress,
        owner: delegatorPkpInfo.ethAddress,
        spender: bridgeAddress,
        requiredAllowance: requiredUsdcAmount,
      });

      if (!checkErc20AllowanceResult.success) {
        console.log('Insufficient allowance, sending approval transaction...');
        approvalTxHash = await sendErc20ApprovalTx({
          provider,
          chainId: sourceChainId,
          pkpEthAddress: delegatorPkpInfo.ethAddress,
          pkpPublicKey: delegatorPkpInfo.publicKey,
          erc20TokenAddress: usdcTokenAddress,
          spenderAddress: bridgeAddress,
          allowanceAmount: ethers.constants.MaxUint256.toString(), // Approve max to simplify
          sourceChain,
          alchemyGasSponsor,
          alchemyGasSponsorApiKey,
          alchemyGasSponsorPolicyId,
        });
      }

      // 2. Estimate bridge fees
      const feeEstimate = await estimateBridgeFee({
        provider,
        bridgeAddress,
        bridgeType: routeInfo.bridgeType!,
        destinationLzV1ChainId: routeInfo.destinationLzV1ChainId!,
      });

      // 3. Execute bridge transaction
      let bridgeTxHash: string;

      if (routeInfo.bridgeType === 'original') {
        // Original Token Bridge: Base/Arbitrum -> CoreDAO
        bridgeTxHash = await sendOriginalBridgeTx({
          rpcUrl: finalRpcUrl,
          chainId: sourceChainId,
          pkpEthAddress: delegatorPkpInfo.ethAddress,
          pkpPublicKey: delegatorPkpInfo.publicKey,
          bridgeAddress,
          tokenAddress: usdcTokenAddress,
          amountLD: requiredUsdcAmount.toString(),
          toAddress: delegatorPkpInfo.ethAddress,
          nativeFee: feeEstimate.nativeFee,
          sourceChain,
          alchemyGasSponsor,
          alchemyGasSponsorApiKey,
          alchemyGasSponsorPolicyId,
        });
      } else {
        // Wrapped Token Bridge: CoreDAO -> Base/Arbitrum/Ethereum
        const destinationLzV1ChainId = getLzV1ChainId(destinationChain);
        bridgeTxHash = await sendWrappedBridgeTx({
          rpcUrl: finalRpcUrl,
          chainId: sourceChainId,
          pkpEthAddress: delegatorPkpInfo.ethAddress,
          pkpPublicKey: delegatorPkpInfo.publicKey,
          bridgeAddress,
          tokenAddress: usdcTokenAddress,
          destinationLzV1ChainId,
          amountLD: requiredUsdcAmount.toString(),
          toAddress: delegatorPkpInfo.ethAddress,
          nativeFee: feeEstimate.nativeFee,
          sourceChain,
          alchemyGasSponsor,
          alchemyGasSponsorApiKey,
          alchemyGasSponsorPolicyId,
        });
      }

      // 4. Return success with transaction hashes
      return succeed({
        bridgeTxHash,
        approvalTxHash,
        sourceChain,
        destinationChain,
        amount,
        bridgeType: routeInfo.bridgeType!,
      });
    } catch (error) {
      console.error('CoredaoBridgeAbility execution failed:', error);

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return fail({
        reason: errorMessage,
      });
    }
  },
});
