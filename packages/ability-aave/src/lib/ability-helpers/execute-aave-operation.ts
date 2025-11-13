import { ethers } from 'ethers';

import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

import { AaveOperation } from '../schemas';
import { getErc20Contract } from './get-erc20-contract';

interface PKPInfo {
  tokenId: string;
  ethAddress: string;
  publicKey: string;
}

/**
 * Aave Pool ABI - Essential methods for Aave operations
 */
export const AAVE_POOL_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'address', name: 'onBehalfOf', type: 'address' },
      { internalType: 'uint16', name: 'referralCode', type: 'uint16' },
    ],
    name: 'supply',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'interestRateMode', type: 'uint256' },
      { internalType: 'uint16', name: 'referralCode', type: 'uint16' },
      { internalType: 'address', name: 'onBehalfOf', type: 'address' },
    ],
    name: 'borrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
    ],
    name: 'withdraw',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'interestRateMode', type: 'uint256' },
      { internalType: 'address', name: 'onBehalfOf', type: 'address' },
    ],
    name: 'repay',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Execute an ERC20 approval transaction
 */
export async function executeApproval({
  tokenAddress,
  spenderAddress,
  amount,
  chainId,
  pkpInfo,
  provider,
  alchemyGasSponsor,
  alchemyGasSponsorApiKey,
  alchemyGasSponsorPolicyId,
}: {
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
  chainId: number;
  pkpInfo: PKPInfo;
  provider: ethers.providers.JsonRpcProvider;
  alchemyGasSponsor?: boolean;
  alchemyGasSponsorApiKey?: string;
  alchemyGasSponsorPolicyId?: string;
}): Promise<string> {
  const erc20Contract = getErc20Contract(tokenAddress, provider);
  const maxUint256 = ethers.BigNumber.from('2').pow(256).sub(1).toString();

  if (alchemyGasSponsor && alchemyGasSponsorApiKey && alchemyGasSponsorPolicyId) {
    return await laUtils.transaction.handler.sponsoredGasContractCall({
      abi: erc20Contract.interface.format() as any[],
      args: [spenderAddress, maxUint256],
      contractAddress: tokenAddress,
      chainId,
      functionName: 'approve',
      eip7702AlchemyApiKey: alchemyGasSponsorApiKey,
      eip7702AlchemyPolicyId: alchemyGasSponsorPolicyId,
      pkpPublicKey: pkpInfo.publicKey,
    });
  } else {
    return await laUtils.transaction.handler.contractCall({
      abi: erc20Contract.interface.format() as any[],
      args: [spenderAddress, maxUint256],
      chainId,
      contractAddress: tokenAddress,
      functionName: 'approve',
      provider,
      callerAddress: pkpInfo.ethAddress,
      pkpPublicKey: pkpInfo.publicKey,
    });
  }
}

/**
 * Execute an Aave operation (supply, borrow, withdraw, repay)
 */
export async function executeAaveOperation({
  operation,
  poolAddress,
  assetAddress,
  amount,
  chainId,
  pkpInfo,
  provider,
  rateMode,
  recipient,
  alchemyGasSponsor,
  alchemyGasSponsorApiKey,
  alchemyGasSponsorPolicyId,
}: {
  operation: AaveOperation;
  poolAddress: string;
  assetAddress: string;
  amount: string;
  chainId: number;
  pkpInfo: PKPInfo;
  provider: ethers.providers.JsonRpcProvider;
  rateMode?: number;
  recipient?: string;
  alchemyGasSponsor?: boolean;
  alchemyGasSponsorApiKey?: string;
  alchemyGasSponsorPolicyId?: string;
}): Promise<string> {
  let functionName: string;
  let args: unknown[];

  switch (operation) {
    case AaveOperation.SUPPLY:
      functionName = 'supply';
      args = [assetAddress, amount, pkpInfo.ethAddress, 0];
      break;
    case AaveOperation.BORROW:
      if (!rateMode) {
        throw new Error('rateMode is required for borrow operation');
      }
      functionName = 'borrow';
      args = [assetAddress, amount, rateMode, 0, pkpInfo.ethAddress];
      break;
    case AaveOperation.WITHDRAW:
      functionName = 'withdraw';
      args = [assetAddress, amount, recipient || pkpInfo.ethAddress];
      break;
    case AaveOperation.REPAY:
      if (!rateMode) {
        throw new Error('rateMode is required for repay operation');
      }
      functionName = 'repay';
      args = [assetAddress, amount, rateMode, pkpInfo.ethAddress];
      break;
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }

  if (alchemyGasSponsor && alchemyGasSponsorApiKey && alchemyGasSponsorPolicyId) {
    return await laUtils.transaction.handler.sponsoredGasContractCall({
      abi: AAVE_POOL_ABI as unknown as any[],
      args,
      contractAddress: poolAddress,
      chainId,
      functionName,
      eip7702AlchemyApiKey: alchemyGasSponsorApiKey,
      eip7702AlchemyPolicyId: alchemyGasSponsorPolicyId,
      pkpPublicKey: pkpInfo.publicKey,
    });
  } else {
    return await laUtils.transaction.handler.contractCall({
      abi: AAVE_POOL_ABI as unknown as any[],
      args,
      chainId,
      contractAddress: poolAddress,
      functionName,
      provider,
      callerAddress: pkpInfo.ethAddress,
      pkpPublicKey: pkpInfo.publicKey,
    });
  }
}
