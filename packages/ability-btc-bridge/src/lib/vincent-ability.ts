import { ProjectivePoint } from '@noble/secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
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
  getRpcUrl,
  getWrappedBtcToken,
  fetchThorInbound,
  getThorQuote,
  ldTo1e8,
  checkMinimumAmount,
  sendErc20ApprovalTx,
  sendThorDepositTx,
} from './ability-helpers';
import { CHAIN_IDS, DEPOSIT_EXPIRATION_SECONDS, BTC_TOKEN_DECIMALS } from './config';
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

/**
 * Compresses an Ethereum public key if it's in uncompressed format.
 */
function getBtcPubkey(ethPubKey: string): Buffer {
  if (ethPubKey.length === 132) {
    if (!ethPubKey.startsWith('0x')) {
      throw new Error('Invalid Ethereum public key');
    }
    const hexKey = ethPubKey.slice(2);
    const point = ProjectivePoint.fromHex(hexKey);
    const compressedPoint = point.toRawBytes(true);
    return Buffer.from(compressedPoint);
  }
  throw new Error('Unsupported public key format for compression');
}

// Policy removed - no policy integration currently
const BtcBridgePolicy = null;

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-btc-bridge' as const,
  abilityDescription:
    'Bridges wrapped Bitcoin (cbBTC or WBTC) to native Bitcoin using THORChain' as const,

  abilityParamsSchema,
  supportedPolicies: BtcBridgePolicy
    ? supportedPoliciesForAbility([BtcBridgePolicy])
    : supportedPoliciesForAbility([]),

  executeSuccessSchema,
  executeFailSchema,

  precheckSuccessSchema,
  precheckFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    console.log('Prechecking BtcBridgeAbility', JSON.stringify(abilityParams, bigintReplacer, 2));

    const { action, sourceChain, amount, btcNetwork, rpcUrl, alchemyGasSponsor } = abilityParams;

    // Get RPC URL
    let finalRpcUrl: string;
    if (rpcUrl) {
      finalRpcUrl = rpcUrl;
    } else {
      finalRpcUrl = await getRpcUrl(sourceChain);
    }

    const provider = new ethers.providers.StaticJsonRpcProvider(finalRpcUrl);

    // Validate chain ID
    const network = await provider.getNetwork();
    const sourceChainId = CHAIN_IDS[sourceChain];
    if (network.chainId !== sourceChainId) {
      return fail({
        reason: `RPC URL chain ID (${network.chainId}) does not match source chain ID (${sourceChainId}) for ${sourceChain}`,
      });
    }

    const delegatorPkpAddress = delegatorPkpInfo.ethAddress;

    // Check minimum amount
    const minCheck = checkMinimumAmount(amount);
    if (!minCheck.valid) {
      return fail({
        reason: minCheck.error || 'Amount below minimum requirement',
      });
    }

    // Derive PKP Bitcoin address for destination
    const btcPubKey = getBtcPubkey(delegatorPkpInfo.publicKey);
    const btcNetworkObj =
      btcNetwork === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    const { address: pkpBtcAddress } = bitcoin.payments.p2wpkh({
      pubkey: btcPubKey,
      network: btcNetworkObj,
    });

    if (!pkpBtcAddress) {
      return fail({
        reason: 'Unable to derive Bitcoin address from PKP public key',
      });
    }

    // Always use PKP address as destination
    const destinationBtcAddress = pkpBtcAddress;

    // Check native token balance (if not using Alchemy gas sponsor)
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

    // Get wrapped BTC token address
    const tokenInfo = getWrappedBtcToken(sourceChain);
    const requiredTokenAmount = ethers.utils.parseUnits(amount, tokenInfo.decimals);

    // Check wrapped BTC balance
    const checkErc20BalanceResult = await checkErc20Balance({
      provider,
      pkpEthAddress: delegatorPkpAddress,
      tokenAddress: tokenInfo.address,
      requiredTokenAmount,
    });
    if (!checkErc20BalanceResult.success) {
      const failure = checkErc20BalanceResult as CheckErc20BalanceResultFailure;
      return fail({
        reason: failure.reason,
        tokenAddress: failure.tokenAddress,
        requiredTokenAmount: ethers.utils.formatUnits(
          failure.requiredTokenAmount,
          BTC_TOKEN_DECIMALS,
        ),
        tokenBalance: ethers.utils.formatUnits(failure.tokenBalance, BTC_TOKEN_DECIMALS),
      });
    }

    // Fetch THORChain inbound addresses
    const thorChainKey = sourceChain === 'base' ? 'BASE' : 'ETH';
    const thorInbound = await fetchThorInbound(thorChainKey);

    // Check allowance for THORChain router
    const checkErc20AllowanceResult = await checkErc20Allowance({
      provider,
      tokenAddress: tokenInfo.address,
      owner: delegatorPkpAddress,
      spender: thorInbound.router,
      requiredAllowance: requiredTokenAmount,
    });

    // If action is approve, return current allowance info
    if (action === AbilityAction.Approve) {
      return succeed({
        nativeTokenBalance: checkNativeTokenBalanceResultSuccess?.ethBalance.toString(),
        wrappedBtcBalance: ethers.utils.formatUnits(
          checkErc20BalanceResult.tokenBalance,
          BTC_TOKEN_DECIMALS,
        ),
        currentAllowance: ethers.utils.formatUnits(
          checkErc20AllowanceResult.currentAllowance,
          BTC_TOKEN_DECIMALS,
        ),
        requiredAllowance: ethers.utils.formatUnits(
          checkErc20AllowanceResult.requiredAllowance,
          BTC_TOKEN_DECIMALS,
        ),
        thorRouterAddress: thorInbound.router,
        pkpBtcAddress,
      });
    }

    // If action is bridge and allowance is insufficient, return failure
    if (action === AbilityAction.Bridge && !checkErc20AllowanceResult.success) {
      const failure = checkErc20AllowanceResult as CheckErc20AllowanceResultFailure;
      return fail({
        reason: failure.reason,
        tokenAddress: failure.tokenAddress,
        requiredAllowance: ethers.utils.formatUnits(failure.requiredAllowance, BTC_TOKEN_DECIMALS),
        currentAllowance: ethers.utils.formatUnits(failure.currentAllowance, BTC_TOKEN_DECIMALS),
      });
    }

    // Fetch THORChain quote
    let estimatedOutputAmount: string | undefined;
    let thorQuoteMemo: string | undefined;
    try {
      const amount1e8 = await ldTo1e8({
        provider,
        token: tokenInfo.address,
        amountLD: requiredTokenAmount,
      });

      const fromAsset =
        sourceChain === 'base'
          ? `BASE.CBBTC-${tokenInfo.address}`
          : `ETH.WBTC-${tokenInfo.address}`;

      const quote = await getThorQuote({
        fromAsset,
        toAsset: 'BTC.BTC',
        amount1e8: amount1e8.toString(),
        destination: destinationBtcAddress,
      });

      if (quote.expected_amount_out) {
        estimatedOutputAmount = ethers.utils.formatUnits(
          quote.expected_amount_out,
          BTC_TOKEN_DECIMALS,
        );
      }
      thorQuoteMemo = quote.memo;
    } catch (error) {
      console.warn('Failed to fetch THORChain quote:', error);
      // Don't fail precheck if quote fails, just don't provide estimate
    }

    return succeed({
      nativeTokenBalance: checkNativeTokenBalanceResultSuccess?.ethBalance.toString(),
      wrappedBtcBalance: ethers.utils.formatUnits(
        checkErc20BalanceResult.tokenBalance,
        BTC_TOKEN_DECIMALS,
      ),
      currentAllowance: ethers.utils.formatUnits(
        checkErc20AllowanceResult.currentAllowance,
        BTC_TOKEN_DECIMALS,
      ),
      requiredAllowance: ethers.utils.formatUnits(
        checkErc20AllowanceResult.requiredAllowance,
        BTC_TOKEN_DECIMALS,
      ),
      thorRouterAddress: thorInbound.router,
      estimatedOutputAmount,
      thorQuoteMemo,
      pkpBtcAddress,
    });
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    console.log('Executing BtcBridgeAbility', JSON.stringify(abilityParams, bigintReplacer, 2));

    const {
      action,
      sourceChain,
      amount,
      btcNetwork,
      rpcUrl,
      alchemyGasSponsor,
      alchemyGasSponsorApiKey,
      alchemyGasSponsorPolicyId,
    } = abilityParams;

    try {
      // Get RPC URL
      let finalRpcUrl: string;
      if (rpcUrl) {
        finalRpcUrl = rpcUrl;
      } else {
        finalRpcUrl = await getRpcUrl(sourceChain);
      }

      const provider = new ethers.providers.StaticJsonRpcProvider(finalRpcUrl);

      // Validate chain ID
      const network = await provider.getNetwork();
      const sourceChainId = CHAIN_IDS[sourceChain];
      if (network.chainId !== sourceChainId) {
        return fail({
          reason: `RPC URL chain ID (${network.chainId}) does not match source chain ID (${sourceChainId}) for ${sourceChain}`,
        });
      }

      const tokenInfo = getWrappedBtcToken(sourceChain);
      const requiredTokenAmount = ethers.utils.parseUnits(amount, tokenInfo.decimals);

      // Derive PKP Bitcoin address
      const btcPubKey = getBtcPubkey(delegatorPkpInfo.publicKey);
      const btcNetworkObj =
        btcNetwork === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
      const { address: pkpBtcAddress } = bitcoin.payments.p2wpkh({
        pubkey: btcPubKey,
        network: btcNetworkObj,
      });

      if (!pkpBtcAddress) {
        return fail({
          reason: 'Unable to derive Bitcoin address from PKP public key',
        });
      }

      // Always use PKP address as destination
      const destinationBtcAddress = pkpBtcAddress;

      // Handle approval action
      let approvalTxHash: string | undefined;
      let approvalTxUserOperationHash: string | undefined;

      if (action === AbilityAction.Approve) {
        const thorChainKey = sourceChain === 'base' ? 'BASE' : 'ETH';
        const thorInbound = await fetchThorInbound(thorChainKey);

        const checkErc20AllowanceResult = await checkErc20Allowance({
          provider,
          tokenAddress: tokenInfo.address,
          owner: delegatorPkpInfo.ethAddress,
          spender: thorInbound.router,
          requiredAllowance: requiredTokenAmount,
        });

        if (checkErc20AllowanceResult.success) {
          console.log(
            `Sufficient allowance already exists for spender ${thorInbound.router}, skipping approval transaction.`,
          );

          return succeed({
            currentAllowance: ethers.utils.formatUnits(
              checkErc20AllowanceResult.currentAllowance,
              BTC_TOKEN_DECIMALS,
            ),
            requiredAllowance: ethers.utils.formatUnits(
              checkErc20AllowanceResult.requiredAllowance,
              BTC_TOKEN_DECIMALS,
            ),
            approvalTxHash: undefined,
            approvalTxUserOperationHash: undefined,
          });
        } else {
          const failure = checkErc20AllowanceResult as CheckErc20AllowanceResultFailure;
          if (failure.reason.includes('insufficient ERC20 allowance for spender')) {
            const txHash = await sendErc20ApprovalTx({
              provider,
              chainId: sourceChainId,
              pkpEthAddress: delegatorPkpInfo.ethAddress,
              pkpPublicKey: delegatorPkpInfo.publicKey,
              spenderAddress: thorInbound.router,
              allowanceAmount: requiredTokenAmount.toString(),
              erc20TokenAddress: tokenInfo.address,
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
              currentAllowance: ethers.utils.formatUnits(
                failure.currentAllowance,
                BTC_TOKEN_DECIMALS,
              ),
              requiredAllowance: ethers.utils.formatUnits(
                failure.requiredAllowance,
                BTC_TOKEN_DECIMALS,
              ),
            });
          } else {
            return fail({
              reason: failure.reason,
            });
          }
        }
      }

      // Handle bridge action
      let bridgeTxHash: string | undefined;
      let bridgeTxUserOperationHash: string | undefined;
      let estimatedOutputBtc: string | undefined;
      let thorMemo: string | undefined;

      if (action === AbilityAction.Bridge) {
        const thorChainKey = sourceChain === 'base' ? 'BASE' : 'ETH';
        const thorInbound = await fetchThorInbound(thorChainKey);

        // Ensure approval exists
        const checkErc20AllowanceResult = await checkErc20Allowance({
          provider,
          tokenAddress: tokenInfo.address,
          owner: delegatorPkpInfo.ethAddress,
          spender: thorInbound.router,
          requiredAllowance: requiredTokenAmount,
        });

        if (!checkErc20AllowanceResult.success) {
          const failure = checkErc20AllowanceResult as CheckErc20AllowanceResultFailure;
          if (failure.reason.includes('insufficient ERC20 allowance for spender')) {
            console.log('Insufficient allowance, sending approval transaction...');
            const txHash = await sendErc20ApprovalTx({
              provider,
              chainId: sourceChainId,
              pkpEthAddress: delegatorPkpInfo.ethAddress,
              pkpPublicKey: delegatorPkpInfo.publicKey,
              spenderAddress: thorInbound.router,
              allowanceAmount: requiredTokenAmount.toString(),
              erc20TokenAddress: tokenInfo.address,
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

        // Get THORChain quote
        const amount1e8 = await ldTo1e8({
          provider,
          token: tokenInfo.address,
          amountLD: requiredTokenAmount,
        });

        const fromAsset =
          sourceChain === 'base'
            ? `BASE.CBBTC-${tokenInfo.address}`
            : `ETH.WBTC-${tokenInfo.address}`;

        const quote = await getThorQuote({
          fromAsset,
          toAsset: 'BTC.BTC',
          amount1e8: amount1e8.toString(),
          destination: destinationBtcAddress,
        });

        if (!quote.memo || !quote.memo.startsWith('SWAP:BTC.BTC:')) {
          throw new Error(
            `Unexpected THOR memo for ${sourceChain} wrapped BTC swap: ${quote.memo}`,
          );
        }

        if (quote.expected_amount_out) {
          estimatedOutputBtc = ethers.utils.formatUnits(
            quote.expected_amount_out,
            BTC_TOKEN_DECIMALS,
          );
        }
        thorMemo = quote.memo;

        // Calculate expiration
        const expiration = Math.floor(Date.now() / 1000) + DEPOSIT_EXPIRATION_SECONDS;

        // Send deposit transaction
        const txHash = await sendThorDepositTx({
          provider,
          chainId: sourceChainId,
          pkpPublicKey: delegatorPkpInfo.publicKey,
          pkpEthAddress: delegatorPkpInfo.ethAddress,
          thorRouterAddress: thorInbound.router,
          vaultAddress: thorInbound.vault,
          tokenAddress: tokenInfo.address,
          amount: requiredTokenAmount.toString(),
          memo: thorMemo,
          expiration,
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

      return succeed({
        bridgeTxHash,
        bridgeTxUserOperationHash,
        approvalTxHash,
        approvalTxUserOperationHash,
        sourceChain,
        destinationBtcAddress,
        amount,
        estimatedOutputBtc,
        thorMemo,
      });
    } catch (error) {
      console.error('BtcBridgeAbility execution failed:', error);

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
