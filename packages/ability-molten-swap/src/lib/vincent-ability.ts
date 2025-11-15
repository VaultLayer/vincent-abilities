import { ethers } from 'ethers';

import {
  createVincentAbility,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';

import type {
  CheckErc20AllowanceResultFailure,
  CheckErc20BalanceResultFailure,
  CheckNativeTokenBalanceResultFailure,
} from './types';

import { checkErc20Balance, checkErc20Allowance, checkNativeTokenBalance } from './ability-checks';
import { getTokenInfo } from './ability-helpers/get-token-info';
import { sendErc20ApprovalTx } from './ability-helpers/send-erc20-approval-tx';
import { sendMoltenSwapTx } from './ability-helpers/send-molten-swap-tx';
import { moltenSwapConfig } from './config';
import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
} from './schemas';
import { AbilityAction, CheckNativeTokenBalanceResultSuccess } from './types';

export const bigintReplacer = (key: any, value: any) => {
  return typeof value === 'bigint' ? value.toString() : value;
};

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-molten-swap' as const,
  abilityDescription:
    'Performs a swap between two ERC20 tokens using Molten DEX on CoreDAO' as const,

  abilityParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([]),

  executeSuccessSchema,
  executeFailSchema,

  precheckSuccessSchema,
  precheckFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    console.log('Prechecking MoltenSwapAbility', JSON.stringify(abilityParams, bigintReplacer, 2));

    const { action, tokenIn, tokenOut, amountIn, amountOutMinimum, rpcUrl } = abilityParams;
    const finalRpcUrl = rpcUrl || moltenSwapConfig.rpcUrl;

    const delegatorPkpAddress = delegatorPkpInfo.ethAddress;
    const provider = new ethers.providers.StaticJsonRpcProvider(finalRpcUrl);

    // 1. Check if the delegator has a non-zero amount of native token balance to pay for gas fees
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
    // Type narrowing: we know it's success at this point
    const checkNativeTokenBalanceResultSuccess = checkNativeTokenBalanceResult;

    // 2. Validate tokenIn is supported
    const tokenInInfo = getTokenInfo(tokenIn);
    if (!tokenInInfo) {
      return fail({
        reason: `Token with address "${tokenIn}" is not supported by Molten DEX on CoreDAO`,
      });
    }

    // 3. Validate tokenOut is supported
    const tokenOutInfo = getTokenInfo(tokenOut);
    if (!tokenOutInfo) {
      return fail({
        reason: `Token with address "${tokenOut}" is not supported by Molten DEX on CoreDAO`,
      });
    }

    const requiredTokenInAmount = ethers.utils.parseUnits(amountIn, tokenInInfo.decimals);

    // 4. We retrieve the current allowance of the input token for the spender from the delegator
    const checkErc20AllowanceResult = await checkErc20Allowance({
      provider,
      tokenAddress: tokenIn,
      owner: delegatorPkpInfo.ethAddress,
      spender: moltenSwapConfig.router,
      requiredAllowance: requiredTokenInAmount,
    });

    // 5. If the ability action is approve, we return the current allowance since all
    // precheck is concerned with is whether the delegatee can call execute with the approve ability action which just needs to know if
    // the gas for the approval transaction can be paid for.
    // We return the current allowance out of convenience, so the delegatee can know if
    // the current allowance is sufficient without having to call execute.
    if (action === AbilityAction.Approve) {
      return succeed({
        nativeTokenBalance: checkNativeTokenBalanceResultSuccess.ethBalance.toString(),
        currentTokenInAllowanceForSpender: ethers.utils.formatUnits(
          checkErc20AllowanceResult.currentAllowance,
          tokenInInfo.decimals,
        ),
        requiredTokenInAllowance: ethers.utils.formatUnits(
          checkErc20AllowanceResult.requiredAllowance,
          tokenInInfo.decimals,
        ),
        spenderAddress: checkErc20AllowanceResult.spenderAddress,
      });
    }

    // 6. If the ability action is swap, and the current allowance is insufficient, we return a failure
    // because the swap cannot currently be performed.
    if (action === AbilityAction.Swap && !checkErc20AllowanceResult.success) {
      const failure = checkErc20AllowanceResult as CheckErc20AllowanceResultFailure;
      return fail({
        reason: failure.reason,
        spenderAddress: failure.spenderAddress,
        tokenAddress: failure.tokenAddress,
        requiredAllowance: ethers.utils.formatUnits(
          failure.requiredAllowance,
          tokenInInfo.decimals,
        ),
        currentAllowance: ethers.utils.formatUnits(failure.currentAllowance, tokenInInfo.decimals),
      });
    }

    // 7. At this point, the ability action is swap, and the current allowance is sufficient.
    // We now need to check if the current delegator balance of tokenIn is sufficient to perform the swap.
    const checkErc20BalanceResult = await checkErc20Balance({
      provider,
      pkpEthAddress: delegatorPkpAddress,
      tokenAddress: tokenIn,
      requiredTokenAmount: requiredTokenInAmount,
    });
    if (!checkErc20BalanceResult.success) {
      const failure = checkErc20BalanceResult as CheckErc20BalanceResultFailure;
      return fail({
        reason: failure.reason,
        tokenAddress: failure.tokenAddress,
        requiredTokenAmount: ethers.utils.formatUnits(
          failure.requiredTokenAmount,
          tokenInInfo.decimals,
        ),
        tokenBalance: ethers.utils.formatUnits(failure.tokenBalance, tokenInInfo.decimals),
      });
    }

    // 8. At this point, we know that the current allowance and
    // the delegator's balance of tokenIn are sufficient to perform the swap
    return succeed({
      nativeTokenBalance: checkNativeTokenBalanceResultSuccess.ethBalance.toString(),
      tokenInAddress: checkErc20BalanceResult.tokenAddress,
      tokenInBalance: ethers.utils.formatUnits(
        checkErc20BalanceResult.tokenBalance,
        tokenInInfo.decimals,
      ),
      currentTokenInAllowanceForSpender: ethers.utils.formatUnits(
        checkErc20AllowanceResult.currentAllowance,
        tokenInInfo.decimals,
      ),
      requiredTokenInAllowance: ethers.utils.formatUnits(
        checkErc20AllowanceResult.requiredAllowance,
        tokenInInfo.decimals,
      ),
      spenderAddress: checkErc20AllowanceResult.spenderAddress,
    });
  },
  execute: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    console.log('Executing MoltenSwapAbility', JSON.stringify(abilityParams, bigintReplacer, 2));

    const { action, tokenIn, tokenOut, amountIn, amountOutMinimum, rpcUrl } = abilityParams;

    const finalRpcUrl = rpcUrl || moltenSwapConfig.rpcUrl;
    const provider = new ethers.providers.StaticJsonRpcProvider(finalRpcUrl);

    // Get token info
    const tokenInInfo = getTokenInfo(tokenIn);
    if (!tokenInInfo) {
      return fail({
        reason: `Token with address "${tokenIn}" is not supported by Molten DEX on CoreDAO`,
      });
    }

    const requiredTokenInAmount = ethers.utils.parseUnits(amountIn, tokenInInfo.decimals);

    // 1. If the ability action is approve, we return success if allowance is sufficient, otherwise we send a new approval transaction
    let approvalTxHash: string | undefined;
    if (action === AbilityAction.Approve) {
      const checkErc20AllowanceResult = await checkErc20Allowance({
        provider,
        tokenAddress: tokenIn,
        owner: delegatorPkpInfo.ethAddress,
        spender: moltenSwapConfig.router,
        requiredAllowance: requiredTokenInAmount,
      });

      if (checkErc20AllowanceResult.success) {
        console.log(
          `Sufficient allowance already exists for spender ${moltenSwapConfig.router}, skipping approval transaction. Current allowance: ${ethers.utils.formatUnits(
            checkErc20AllowanceResult.currentAllowance,
            tokenInInfo.decimals,
          )}`,
        );

        // 1.1 Because the ability action is approve, we return success since the current allowance is sufficient,
        // and a new approval transaction is not needed.
        return succeed({
          currentAllowance: ethers.utils.formatUnits(
            checkErc20AllowanceResult.currentAllowance,
            tokenInInfo.decimals,
          ),
          requiredAllowance: ethers.utils.formatUnits(
            checkErc20AllowanceResult.requiredAllowance,
            tokenInInfo.decimals,
          ),
        });
      } else {
        const failure = checkErc20AllowanceResult as CheckErc20AllowanceResultFailure;
        if (failure.reason.includes('insufficient ERC20 allowance for spender')) {
          // 1.2 The current allowance is insufficient, so we need to send a new approval transaction
          const txHash = await sendErc20ApprovalTx({
            provider,
            chainId: moltenSwapConfig.chainId,
            pkpEthAddress: delegatorPkpInfo.ethAddress,
            pkpPublicKey: delegatorPkpInfo.publicKey,
            spenderAddress: moltenSwapConfig.router,
            allowanceAmount: requiredTokenInAmount.toString(),
            erc20TokenAddress: tokenIn,
          });

          approvalTxHash = txHash;
        } else {
          // 1.3 Some error other than insufficient allowance occurred, bail out
          return fail({
            reason: failure.reason,
          });
        }
      }
    }

    let swapTxHash: string | undefined;
    if (action === AbilityAction.Swap) {
      // 2. The ability action is swap, so we send the swap transaction
      const tokenOutInfo = getTokenInfo(tokenOut);
      if (!tokenOutInfo) {
        return fail({
          reason: `Token with address "${tokenOut}" is not supported by Molten DEX on CoreDAO`,
        });
      }

      const amountOutMinParsed = ethers.utils.parseUnits(
        amountOutMinimum || '0',
        tokenOutInfo.decimals,
      );

      const txHash = await sendMoltenSwapTx({
        provider,
        chainId: moltenSwapConfig.chainId,
        pkpEthAddress: delegatorPkpInfo.ethAddress,
        pkpPublicKey: delegatorPkpInfo.publicKey,
        tokenIn,
        tokenOut,
        amountIn: requiredTokenInAmount.toString(),
        amountOutMinimum: amountOutMinParsed.toString(),
      });

      swapTxHash = txHash;
    }

    // 3. If the ability action is:
    // - Approve, we return the approval transaction hash.
    // - Swap, we return the swap transaction hash.
    return succeed({
      approvalTxHash,
      swapTxHash,
    });
  },
});
