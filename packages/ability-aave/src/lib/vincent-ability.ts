import { ethers } from 'ethers';

import {
  createVincentAbility,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';

import { executeAaveOperation, executeApproval, getErc20Contract } from './ability-helpers';
import { getAaveConfig } from './config';
import { getAavePoolAddress, getAaveAssetBySymbol } from './helpers/aave-helpers';
import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
  AaveOperation,
} from './schemas';

// Declare Lit global for Lit Action environment
declare const Lit: {
  Actions: {
    getRpcUrl: (params: { chain: string }) => Promise<string>;
  };
};

/**
 * Get RPC URL for a chain, using Lit's RPC resolution if available
 */
async function getRpcUrl(chain: string, providedRpcUrl?: string): Promise<string> {
  if (providedRpcUrl) {
    return providedRpcUrl;
  }

  try {
    const rpcUrl = await Lit.Actions.getRpcUrl({ chain });
    if (rpcUrl) {
      return rpcUrl;
    }
  } catch (error) {
    console.warn(`Failed to get RPC URL from Lit for ${chain}:`, error);
  }

  // Fallback to config
  const config = getAaveConfig(chain as any);
  return config.rpcUrl;
}

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-aave' as const,
  abilityDescription:
    'Supply, borrow, withdraw, or repay assets on Aave protocol using the IPool contract' as const,
  abilityParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([]),

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    try {
      console.log('[@vaultlayer/vincent-ability-aave/precheck] Starting precheck');
      console.log('[@vaultlayer/vincent-ability-aave/precheck] params:', {
        abilityParams,
      });

      const { operation, assetSymbol, chain, amount, rateMode, rpcUrl, alchemyGasSponsor } =
        abilityParams;

      if (!rpcUrl && !alchemyGasSponsor) {
        return fail({
          error:
            '[@vaultlayer/vincent-ability-aave/precheck] RPC URL is required for precheck when gas sponsorship is not enabled',
        });
      }

      // Get RPC URL
      const finalRpcUrl = await getRpcUrl(chain, rpcUrl);
      const provider = new ethers.providers.StaticJsonRpcProvider(finalRpcUrl);
      const { chainId } = await provider.getNetwork();

      // Validate Alchemy gas sponsorship is not used for coreDao
      if (chain === 'coreDao' && alchemyGasSponsor) {
        return fail({
          error:
            '[@vaultlayer/vincent-ability-aave/precheck] Alchemy gas sponsorship is not supported for coreDao chain',
        });
      }

      // Get Aave config and validate chain
      let aaveConfig;
      try {
        aaveConfig = getAaveConfig(chain as any);
      } catch (error) {
        return fail({
          error: `[@vaultlayer/vincent-ability-aave/precheck] Unsupported chain: ${chain}`,
        });
      }

      // Validate chain ID matches
      if (chainId !== aaveConfig.chainId) {
        return fail({
          error: `[@vaultlayer/vincent-ability-aave/precheck] RPC URL chain ID (${chainId}) does not match expected chain ID (${aaveConfig.chainId}) for ${chain}`,
        });
      }

      // Get pool address
      const poolAddress = getAavePoolAddress(chain as any);
      if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
        return fail({
          error: `[@vaultlayer/vincent-ability-aave/precheck] Aave pool not available on chain: ${chain}`,
        });
      }

      // Get asset info
      const assetInfo = getAaveAssetBySymbol(chain as any, assetSymbol);
      if (!assetInfo || !assetInfo.underlying) {
        return fail({
          error: `[@vaultlayer/vincent-ability-aave/precheck] Asset ${assetSymbol} not found on chain ${chain}`,
        });
      }

      const assetAddress = assetInfo.underlying;
      const assetDecimals = assetInfo.decimals || 18;

      // Get addresses
      const pkpAddress = delegatorPkpInfo.ethAddress;

      // Get contracts
      const assetContract = getErc20Contract(assetAddress, provider);
      const poolContract = new ethers.Contract(
        poolAddress,
        [
          'function balanceOf(address account) external view returns (uint256)',
          'function scaledBalanceOf(address user) external view returns (uint256)',
        ],
        provider,
      );

      // Parse amount
      const requestedAmount = ethers.utils.parseUnits(amount, assetDecimals);

      // Get balances and allowances
      let userBalance: ethers.BigNumber;
      let allowance: ethers.BigNumber;
      let suppliedBalance: ethers.BigNumber | undefined;
      let borrowedBalance: ethers.BigNumber | undefined;

      try {
        [userBalance, allowance] = await Promise.all([
          assetContract.balanceOf(pkpAddress),
          assetContract.allowance(pkpAddress, poolAddress),
        ]);

        // Get aToken balance if available
        if (assetInfo.aToken) {
          try {
            const aTokenContract = getErc20Contract(assetInfo.aToken, provider);
            suppliedBalance = await aTokenContract.balanceOf(pkpAddress);
          } catch (error) {
            console.warn('Failed to get aToken balance:', error);
          }
        }

        // Get debt token balance if available (for borrow/repay operations)
        if (
          (operation === AaveOperation.BORROW || operation === AaveOperation.REPAY) &&
          assetInfo.variableDebtToken
        ) {
          try {
            const debtTokenContract = getErc20Contract(assetInfo.variableDebtToken, provider);
            borrowedBalance = await debtTokenContract.balanceOf(pkpAddress);
          } catch (error) {
            console.warn('Failed to get debt token balance:', error);
          }
        }
      } catch (error) {
        return fail({
          error: `[@vaultlayer/vincent-ability-aave/precheck] Failed to read contract state: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }

      // Operation-specific validations
      switch (operation) {
        case AaveOperation.SUPPLY:
          if (userBalance.lt(requestedAmount)) {
            return fail({
              error: `[@vaultlayer/vincent-ability-aave/precheck] Insufficient balance. Required: ${ethers.utils.formatUnits(
                requestedAmount,
                assetDecimals,
              )}, Available: ${ethers.utils.formatUnits(userBalance, assetDecimals)}`,
            });
          }
          if (allowance.lt(requestedAmount)) {
            return fail({
              error:
                '[@vaultlayer/vincent-ability-aave/precheck] Insufficient allowance. Approval transaction will be needed before supply.',
            });
          }
          break;

        case AaveOperation.BORROW:
          if (!rateMode) {
            return fail({
              error:
                '[@vaultlayer/vincent-ability-aave/precheck] rateMode is required for borrow operation',
            });
          }
          // Note: Borrow validation would require checking collateral health, which is complex
          // We'll let the transaction fail if the user doesn't have enough collateral
          break;

        case AaveOperation.WITHDRAW:
          if (suppliedBalance && suppliedBalance.lt(requestedAmount)) {
            return fail({
              error: `[@vaultlayer/vincent-ability-aave/precheck] Insufficient supplied balance. Required: ${ethers.utils.formatUnits(
                requestedAmount,
                assetDecimals,
              )}, Available: ${ethers.utils.formatUnits(suppliedBalance, assetDecimals)}`,
            });
          }
          break;

        case AaveOperation.REPAY:
          if (!rateMode) {
            return fail({
              error:
                '[@vaultlayer/vincent-ability-aave/precheck] rateMode is required for repay operation',
            });
          }
          if (userBalance.lt(requestedAmount)) {
            return fail({
              error: `[@vaultlayer/vincent-ability-aave/precheck] Insufficient balance for repay. Required: ${ethers.utils.formatUnits(
                requestedAmount,
                assetDecimals,
              )}, Available: ${ethers.utils.formatUnits(userBalance, assetDecimals)}`,
            });
          }
          if (allowance.lt(requestedAmount)) {
            return fail({
              error:
                '[@vaultlayer/vincent-ability-aave/precheck] Insufficient allowance. Approval transaction will be needed before repay.',
            });
          }
          break;
      }

      // Estimate gas for the operation
      let estimatedGas = ethers.BigNumber.from(0);
      if (!alchemyGasSponsor) {
        try {
          switch (operation) {
            case AaveOperation.SUPPLY:
              estimatedGas = await poolContract.estimateGas.supply(
                assetAddress,
                requestedAmount,
                pkpAddress,
                0,
                {
                  from: pkpAddress,
                },
              );
              // If allowance is insufficient, add approval gas estimate
              if (allowance.lt(requestedAmount)) {
                const approvalGas = await assetContract.estimateGas.approve(
                  poolAddress,
                  ethers.constants.MaxUint256,
                  {
                    from: pkpAddress,
                  },
                );
                estimatedGas = estimatedGas.add(approvalGas);
              }
              break;
            case AaveOperation.BORROW:
              if (rateMode) {
                estimatedGas = await poolContract.estimateGas.borrow(
                  assetAddress,
                  requestedAmount,
                  rateMode,
                  0,
                  pkpAddress,
                  {
                    from: pkpAddress,
                  },
                );
              }
              break;
            case AaveOperation.WITHDRAW:
              estimatedGas = await poolContract.estimateGas.withdraw(
                assetAddress,
                requestedAmount,
                pkpAddress,
                {
                  from: pkpAddress,
                },
              );
              break;
            case AaveOperation.REPAY:
              if (rateMode) {
                estimatedGas = await poolContract.estimateGas.repay(
                  assetAddress,
                  requestedAmount,
                  rateMode,
                  pkpAddress,
                  {
                    from: pkpAddress,
                  },
                );
                // If allowance is insufficient, add approval gas estimate
                if (allowance.lt(requestedAmount)) {
                  const approvalGas = await assetContract.estimateGas.approve(
                    poolAddress,
                    ethers.constants.MaxUint256,
                    {
                      from: pkpAddress,
                    },
                  );
                  estimatedGas = estimatedGas.add(approvalGas);
                }
              }
              break;
          }
        } catch (error) {
          console.warn('Gas estimation failed, using default:', error);
          estimatedGas = ethers.BigNumber.from(200000); // Default estimate
        }
      }

      // Validation passed
      const successResult = {
        operationValid: true,
        assetValid: true,
        poolValid: true,
        amountValid: true,
        userBalance: userBalance.toString(),
        allowance: allowance.toString(),
        suppliedBalance: suppliedBalance?.toString(),
        borrowedBalance: borrowedBalance?.toString(),
        estimatedGas: estimatedGas.toString(),
        poolAddress,
        assetAddress,
        assetDecimals,
      };

      console.log(
        '[@vaultlayer/vincent-ability-aave/precheck] Validation successful:',
        successResult,
      );

      return succeed(successResult);
    } catch (error) {
      console.error('[@vaultlayer/vincent-ability-aave/precheck] Error:', error);
      return fail({
        error: `[@vaultlayer/vincent-ability-aave/precheck] Validation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    try {
      const {
        operation,
        assetSymbol,
        chain,
        amount,
        rateMode,
        rpcUrl,
        alchemyGasSponsor,
        alchemyGasSponsorApiKey,
        alchemyGasSponsorPolicyId,
      } = abilityParams;

      console.log('[@vaultlayer/vincent-ability-aave/execute] Executing Aave Ability', {
        operation,
        assetSymbol,
        chain,
        amount,
      });

      if (alchemyGasSponsor && (!alchemyGasSponsorApiKey || !alchemyGasSponsorPolicyId)) {
        return fail({
          error:
            '[@vaultlayer/vincent-ability-aave/execute] Alchemy gas sponsor is enabled, but missing Alchemy API key or policy ID',
        });
      }

      // Validate Alchemy gas sponsorship is not used for coreDao
      if (chain === 'coreDao' && alchemyGasSponsor) {
        return fail({
          error:
            '[@vaultlayer/vincent-ability-aave/execute] Alchemy gas sponsorship is not supported for coreDao chain',
        });
      }

      // Get RPC URL
      const finalRpcUrl = await getRpcUrl(chain, rpcUrl);
      const provider = new ethers.providers.StaticJsonRpcProvider(finalRpcUrl);
      const { chainId } = await provider.getNetwork();

      // Get Aave config and pool address
      getAaveConfig(chain as any); // Validate chain is supported
      const poolAddress = getAavePoolAddress(chain as any);
      const assetInfo = getAaveAssetBySymbol(chain as any, assetSymbol);

      if (!assetInfo || !assetInfo.underlying) {
        return fail({
          error: `[@vaultlayer/vincent-ability-aave/execute] Asset ${assetSymbol} not found on chain ${chain}`,
        });
      }

      const assetAddress = assetInfo.underlying;
      const assetDecimals = assetInfo.decimals || 18;

      // Parse amount
      const parsedAmount = ethers.utils.parseUnits(amount, assetDecimals).toString();

      // Get contracts for allowance checking
      const assetContract = getErc20Contract(assetAddress, provider);
      const pkpAddress = delegatorPkpInfo.ethAddress;

      // Check and handle approvals for supply and repay operations
      let approvalTxHash: string | undefined;

      if (operation === AaveOperation.SUPPLY || operation === AaveOperation.REPAY) {
        const allowance = await assetContract.allowance(pkpAddress, poolAddress);
        const maxUint256 = ethers.BigNumber.from('2').pow(256).sub(1);

        if (allowance.lt(parsedAmount)) {
          console.log(
            '[@vaultlayer/vincent-ability-aave/execute] Approval needed, executing approval...',
          );
          approvalTxHash = await executeApproval({
            tokenAddress: assetAddress,
            spenderAddress: poolAddress,
            amount: maxUint256.toString(),
            chainId,
            pkpInfo: delegatorPkpInfo,
            provider,
            alchemyGasSponsor,
            alchemyGasSponsorApiKey,
            alchemyGasSponsorPolicyId,
          });
          console.log(
            '[@vaultlayer/vincent-ability-aave/execute] Approval transaction hash:',
            approvalTxHash,
          );
        }
      }

      // Execute the main Aave operation
      const txHash = await executeAaveOperation({
        operation,
        poolAddress,
        assetAddress,
        amount: parsedAmount,
        chainId,
        pkpInfo: delegatorPkpInfo,
        provider,
        rateMode:
          rateMode ||
          (operation === AaveOperation.BORROW || operation === AaveOperation.REPAY ? 2 : undefined),
        alchemyGasSponsor,
        alchemyGasSponsorApiKey,
        alchemyGasSponsorPolicyId,
      });

      const result = {
        txHash,
        operation,
        assetSymbol,
        amount,
        chain,
        poolAddress,
        assetAddress,
        approvalTxHash,
      };

      console.log('[@vaultlayer/vincent-ability-aave/execute] Aave operation successful', result);

      return succeed(result);
    } catch (error) {
      console.error('[@vaultlayer/vincent-ability-aave/execute] Aave operation failed', error);

      return fail({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },
});
