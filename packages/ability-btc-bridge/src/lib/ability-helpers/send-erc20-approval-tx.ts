import type { ethers } from 'ethers';

import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

import { ERC20_ABI } from './get-erc20-contract';

export const sendErc20ApprovalTx = async ({
  provider,
  chainId,
  pkpPublicKey,
  pkpEthAddress,
  erc20TokenAddress,
  spenderAddress,
  allowanceAmount,
  alchemyGasSponsor,
  alchemyGasSponsorApiKey,
  alchemyGasSponsorPolicyId,
}: {
  provider?: ethers.providers.JsonRpcProvider;
  chainId: number;
  pkpPublicKey: string;
  pkpEthAddress: string;
  erc20TokenAddress: string;
  spenderAddress: string;
  allowanceAmount: string;
  alchemyGasSponsor?: boolean;
  alchemyGasSponsorApiKey?: string;
  alchemyGasSponsorPolicyId?: string;
}): Promise<string> => {
  console.log('[sendErc20ApprovalTx] Executing ERC20 Approval transaction');

  const abi = ERC20_ABI;
  const functionName = 'approve';
  const args = [spenderAddress, allowanceAmount];

  // Use gas sponsorship if enabled and all required parameters are provided
  if (alchemyGasSponsor && alchemyGasSponsorApiKey && alchemyGasSponsorPolicyId) {
    console.log('[sendErc20ApprovalTx] Using EIP-7702 gas sponsorship');

    try {
      return await laUtils.transaction.handler.sponsoredGasContractCall({
        pkpPublicKey,
        abi,
        contractAddress: erc20TokenAddress,
        functionName,
        args,
        chainId,
        eip7702AlchemyApiKey: alchemyGasSponsorApiKey,
        eip7702AlchemyPolicyId: alchemyGasSponsorPolicyId,
      });
    } catch (error) {
      console.error('[sendErc20ApprovalTx] EIP-7702 approval transaction failed:', error);
      throw error;
    }
  }

  // Use regular transaction without gas sponsorship
  if (!provider) {
    throw new Error('Provider is required for non-sponsored transactions');
  }

  try {
    return await laUtils.transaction.handler.contractCall({
      provider,
      pkpPublicKey,
      callerAddress: pkpEthAddress,
      abi,
      contractAddress: erc20TokenAddress,
      functionName,
      args,
      chainId,
      overrides: {
        value: '0',
      },
    });
  } catch (error) {
    console.error('[sendErc20ApprovalTx] ERC20 approval transaction failed:', error);
    throw error;
  }
};
