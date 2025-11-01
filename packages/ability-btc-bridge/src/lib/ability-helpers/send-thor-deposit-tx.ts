import type { ethers } from 'ethers';

import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

import { THOR_ROUTER_ABI } from '../config';

export interface SendThorDepositParams {
  provider: ethers.providers.JsonRpcProvider;
  chainId: number;
  pkpPublicKey: string;
  pkpEthAddress: string;
  thorRouterAddress: string;
  vaultAddress: string;
  tokenAddress: string;
  amount: string;
  memo: string;
  expiration: number;
  alchemyGasSponsor?: boolean;
  alchemyGasSponsorApiKey?: string;
  alchemyGasSponsorPolicyId?: string;
}

/**
 * Send THORChain depositWithExpiry transaction
 */
export async function sendThorDepositTx(params: SendThorDepositParams): Promise<string> {
  const {
    provider,
    chainId,
    pkpPublicKey,
    pkpEthAddress,
    thorRouterAddress,
    vaultAddress,
    tokenAddress,
    amount,
    memo,
    expiration,
    alchemyGasSponsor,
    alchemyGasSponsorApiKey,
    alchemyGasSponsorPolicyId,
  } = params;

  console.log('[sendThorDepositTx] Executing THORChain deposit transaction');

  const abi = THOR_ROUTER_ABI;
  const functionName = 'depositWithExpiry';
  const args = [vaultAddress, tokenAddress, amount, memo, expiration];

  // Use gas sponsorship if enabled and all required parameters are provided
  if (alchemyGasSponsor && alchemyGasSponsorApiKey && alchemyGasSponsorPolicyId) {
    console.log('[sendThorDepositTx] Using EIP-7702 gas sponsorship');

    try {
      return await laUtils.transaction.handler.sponsoredGasContractCall({
        pkpPublicKey,
        abi,
        contractAddress: thorRouterAddress,
        functionName,
        args,
        chainId,
        eip7702AlchemyApiKey: alchemyGasSponsorApiKey,
        eip7702AlchemyPolicyId: alchemyGasSponsorPolicyId,
      });
    } catch (error) {
      console.error('[sendThorDepositTx] EIP-7702 deposit transaction failed:', error);
      throw error;
    }
  }

  // Use regular transaction without gas sponsorship
  try {
    return await laUtils.transaction.handler.contractCall({
      provider,
      pkpPublicKey,
      callerAddress: pkpEthAddress,
      abi,
      contractAddress: thorRouterAddress,
      functionName,
      args,
      chainId,
      overrides: {
        value: '0',
      },
    });
  } catch (error) {
    console.error('[sendThorDepositTx] THORChain deposit transaction failed:', error);
    throw error;
  }
}
