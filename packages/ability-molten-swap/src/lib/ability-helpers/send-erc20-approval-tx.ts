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
}: {
  provider: ethers.providers.JsonRpcProvider;
  chainId: number;
  pkpPublicKey: string;
  pkpEthAddress: string;
  erc20TokenAddress: string;
  spenderAddress: string;
  allowanceAmount: string;
}): Promise<string> => {
  console.log('[sendErc20ApprovalTx] Executing ERC20 Approval transaction');

  const abi = ERC20_ABI;
  const functionName = 'approve';
  const args = [spenderAddress, allowanceAmount];

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
