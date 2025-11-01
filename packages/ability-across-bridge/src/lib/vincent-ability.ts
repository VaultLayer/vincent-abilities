import { ethers } from 'ethers';

import {
  createVincentAbility,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';

import type {
  CheckNativeTokenBalanceResultSuccess,
  CheckErc20AllowanceResultFailure,
  CheckErc20BalanceResultFailure,
  CheckNativeTokenBalanceResultFailure} from './types';

import { checkErc20Balance, checkErc20Allowance, checkNativeTokenBalance } from './ability-checks';
import {
  getAcrossSpokePool,
  getUsdcTokenAddress,
  isAcrossRouteSupported,
  getAcrossSuggestedFees,
  buildDepositParams,
  sendErc20ApprovalTx,
  sendAcrossDepositTx,
  getRpcUrl,
} from './ability-helpers';
import { ACROSS_CHAIN_IDS, USDC_DECIMALS } from './config';
import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
} from './schemas';
import {
  AbilityAction
} from './types';

// Declare Lit global for Lit Action environment
declare const Lit: {
  Actions: {
    getRpcUrl: (params: { chain: string }) => Promise<string>;
  };
};

export const bigintReplacer = (key: any, value: any) => {
  return typeof value === 'bigint' ? value.toString() : value;
};

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-across-bridge' as const,
  abilityDescription:
    'Bridges USDC across chains using Across Protocol via SpokePool contracts' as const,

  abilityParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([]),

  executeSuccessSchema,
  executeFailSchema,

  precheckSuccessSchema,
  precheckFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    console.log(
      'Prechecking AcrossBridgeAbility',
      JSON.stringify(abilityParams, bigintReplacer, 2),
    );

    const { action, sourceChain, destinationChain, amount, rpcUrl, alchemyGasSponsor } =
      abilityParams;

    // Validate route is supported
    if (!isAcrossRouteSupported(sourceChain, destinationChain)) {
      return fail({
        reason: `Route from ${sourceChain} to ${destinationChain} is not supported by Across Protocol. Supported routes: Base ↔ Arbitrum ↔ Ethereum`,
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
    const sourceChainId = ACROSS_CHAIN_IDS[sourceChain];
    if (network.chainId !== sourceChainId) {
      return fail({
        reason: `RPC URL chain ID (${network.chainId}) does not match source chain ID (${sourceChainId}) for ${sourceChain}`,
      });
    }
    const delegatorPkpAddress = delegatorPkpInfo.ethAddress;

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

    // 4. Get SpokePool address for source chain
    const spokePoolAddress = getAcrossSpokePool(sourceChain);

    // 5. Check USDC allowance for SpokePool
    const checkErc20AllowanceResult = await checkErc20Allowance({
      provider,
      tokenAddress: usdcTokenAddress,
      owner: delegatorPkpAddress,
      spender: spokePoolAddress,
      requiredAllowance: requiredUsdcAmount,
    });

    // 6. If action is approve, return current allowance info
    if (action === AbilityAction.Approve) {
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
        spokePoolAddress,
      });
    }

    // 7. If action is bridge and allowance is insufficient, return failure
    if (action === AbilityAction.Bridge && !checkErc20AllowanceResult.success) {
      const failure = checkErc20AllowanceResult as CheckErc20AllowanceResultFailure;
      return fail({
        reason: failure.reason,
      });
    }

    // 8. Fetch Across API fees (optional, with fallback)
    let estimatedOutputAmount: string | undefined;
    try {
      const originChainId = ACROSS_CHAIN_IDS[sourceChain];
      const destinationChainId = ACROSS_CHAIN_IDS[destinationChain];
      const inputToken = usdcTokenAddress;
      const outputToken = getUsdcTokenAddress(destinationChain);

      const feeData = await getAcrossSuggestedFees(
        inputToken,
        outputToken,
        originChainId,
        destinationChainId,
        requiredUsdcAmount.toString(),
        delegatorPkpAddress,
      );

      if (feeData && feeData.outputAmount && BigInt(feeData.outputAmount) > 0) {
        estimatedOutputAmount = ethers.utils.formatUnits(feeData.outputAmount, USDC_DECIMALS);
      }
    } catch (error) {
      console.warn('Failed to fetch Across API fees, will use fallback estimation:', error);
      // Use fallback estimation (9970/10000 = 30bps fee)
      estimatedOutputAmount = ethers.utils.formatUnits(
        requiredUsdcAmount.mul(9970).div(10000),
        USDC_DECIMALS,
      );
    }

    // 9. Return success with validation results
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
      spokePoolAddress,
      estimatedOutputAmount,
    });
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    console.log('Executing AcrossBridgeAbility', JSON.stringify(abilityParams, bigintReplacer, 2));

    const {
      action,
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
      if (!isAcrossRouteSupported(sourceChain, destinationChain)) {
        return fail({
          reason: `Route from ${sourceChain} to ${destinationChain} is not supported by Across Protocol`,
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
      const sourceChainId = ACROSS_CHAIN_IDS[sourceChain];
      if (network.chainId !== sourceChainId) {
        return fail({
          reason: `RPC URL chain ID (${network.chainId}) does not match source chain ID (${sourceChainId}) for ${sourceChain}`,
        });
      }
      const originChainId = ACROSS_CHAIN_IDS[sourceChain];
      const destinationChainId = ACROSS_CHAIN_IDS[destinationChain];
      const usdcTokenAddress = getUsdcTokenAddress(sourceChain);
      const outputTokenAddress = getUsdcTokenAddress(destinationChain);
      const spokePoolAddress = getAcrossSpokePool(sourceChain);
      const requiredUsdcAmount = ethers.utils.parseUnits(amount, USDC_DECIMALS);

      // 1. Handle approval action
      let approvalTxHash: string | undefined;
      let approvalTxUserOperationHash: string | undefined;

      if (action === AbilityAction.Approve) {
        const checkErc20AllowanceResult = await checkErc20Allowance({
          provider,
          tokenAddress: usdcTokenAddress,
          owner: delegatorPkpInfo.ethAddress,
          spender: spokePoolAddress,
          requiredAllowance: requiredUsdcAmount,
        });

        if (checkErc20AllowanceResult.success) {
          console.log(
            `Sufficient allowance already exists for spender ${spokePoolAddress}, skipping approval transaction. Current allowance: ${ethers.utils.formatUnits(
              checkErc20AllowanceResult.currentAllowance,
              USDC_DECIMALS,
            )}`,
          );

          return succeed({
            currentAllowance: ethers.utils.formatUnits(
              checkErc20AllowanceResult.currentAllowance,
              USDC_DECIMALS,
            ),
            requiredAllowance: ethers.utils.formatUnits(
              checkErc20AllowanceResult.requiredAllowance,
              USDC_DECIMALS,
            ),
            approvalTxHash: undefined,
            approvalTxUserOperationHash: undefined,
          });
        } else {
          const failure = checkErc20AllowanceResult as CheckErc20AllowanceResultFailure;
          if (failure.reason.includes('insufficient ERC20 allowance for spender')) {
            const txHash = await sendErc20ApprovalTx({
              provider,
              chainId: originChainId,
              pkpEthAddress: delegatorPkpInfo.ethAddress,
              pkpPublicKey: delegatorPkpInfo.publicKey,
              spenderAddress: spokePoolAddress,
              allowanceAmount: requiredUsdcAmount.toString(),
              erc20TokenAddress: usdcTokenAddress,
              alchemyGasSponsor,
              alchemyGasSponsorApiKey,
              alchemyGasSponsorPolicyId,
            });

            if (alchemyGasSponsor) {
              approvalTxUserOperationHash = txHash;
            } else {
              approvalTxHash = txHash;
            }

            return succeed({
              approvalTxHash,
              approvalTxUserOperationHash,
              currentAllowance: ethers.utils.formatUnits(failure.currentAllowance, USDC_DECIMALS),
              requiredAllowance: ethers.utils.formatUnits(failure.requiredAllowance, USDC_DECIMALS),
            });
          } else {
            return fail({
              reason: failure.reason,
            });
          }
        }
      }

      // 2. Handle bridge action
      let bridgeTxHash: string | undefined;
      let bridgeTxUserOperationHash: string | undefined;
      let estimatedOutputAmount: string | undefined;

      if (action === AbilityAction.Bridge) {
        // Ensure approval exists (send approval if needed)
        const checkErc20AllowanceResult = await checkErc20Allowance({
          provider,
          tokenAddress: usdcTokenAddress,
          owner: delegatorPkpInfo.ethAddress,
          spender: spokePoolAddress,
          requiredAllowance: requiredUsdcAmount,
        });

        if (!checkErc20AllowanceResult.success) {
          const failure = checkErc20AllowanceResult as CheckErc20AllowanceResultFailure;
          if (failure.reason.includes('insufficient ERC20 allowance for spender')) {
            console.log('Insufficient allowance, sending approval transaction...');
            const txHash = await sendErc20ApprovalTx({
              provider,
              chainId: originChainId,
              pkpEthAddress: delegatorPkpInfo.ethAddress,
              pkpPublicKey: delegatorPkpInfo.publicKey,
              spenderAddress: spokePoolAddress,
              allowanceAmount: requiredUsdcAmount.toString(),
              erc20TokenAddress: usdcTokenAddress,
              alchemyGasSponsor,
              alchemyGasSponsorApiKey,
              alchemyGasSponsorPolicyId,
            });

            if (alchemyGasSponsor) {
              approvalTxUserOperationHash = txHash;
            } else {
              approvalTxHash = txHash;
            }
          } else {
            return fail({
              reason: failure.reason,
            });
          }
        }

        // Fetch Across API fees
        let feeData;
        try {
          feeData = await getAcrossSuggestedFees(
            usdcTokenAddress,
            outputTokenAddress,
            originChainId,
            destinationChainId,
            requiredUsdcAmount.toString(),
            delegatorPkpInfo.ethAddress,
          );

          // Validate fee data
          if (feeData && feeData.outputAmount && BigInt(feeData.outputAmount) > 0) {
            estimatedOutputAmount = ethers.utils.formatUnits(feeData.outputAmount, USDC_DECIMALS);
          }
        } catch (error) {
          console.warn('Failed to fetch Across API fees, using fallback estimation:', error);
          feeData = undefined;
        }

        // Build deposit parameters
        const depositParams = await buildDepositParams(requiredUsdcAmount, !!feeData, feeData);

        if (!estimatedOutputAmount) {
          estimatedOutputAmount = ethers.utils.formatUnits(
            depositParams.outputAmount,
            USDC_DECIMALS,
          );
        }

        // Send deposit transaction
        const txHash = await sendAcrossDepositTx({
          rpcUrl: finalRpcUrl,
          chainId: originChainId,
          pkpEthAddress: delegatorPkpInfo.ethAddress,
          pkpPublicKey: delegatorPkpInfo.publicKey,
          spokePoolAddress,
          depositor: delegatorPkpInfo.ethAddress,
          recipient: delegatorPkpInfo.ethAddress, // Always use delegator as recipient
          inputToken: usdcTokenAddress,
          outputToken: outputTokenAddress,
          inputAmount: requiredUsdcAmount.toString(),
          outputAmount: depositParams.outputAmount.toString(),
          destinationChainId,
          exclusiveRelayer: depositParams.exclusiveRelayer,
          quoteTimestamp: depositParams.quoteTimestamp,
          fillDeadline: depositParams.fillDeadline,
          exclusivityDeadline: depositParams.exclusivityDeadline,
          message: '0x',
          alchemyGasSponsor,
          alchemyGasSponsorApiKey,
          alchemyGasSponsorPolicyId,
        });

        if (alchemyGasSponsor) {
          bridgeTxUserOperationHash = txHash;
        } else {
          bridgeTxHash = txHash;
        }
      }

      // 3. Return success with transaction hashes
      return succeed({
        bridgeTxHash,
        bridgeTxUserOperationHash,
        approvalTxHash,
        approvalTxUserOperationHash,
        sourceChain,
        destinationChain,
        amount,
        estimatedOutputAmount,
      });
    } catch (error) {
      console.error('AcrossBridgeAbility execution failed:', error);

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
