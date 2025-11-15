import type { ethers } from 'ethers';

import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

import { moltenSwapConfig } from '../config';
import { encodePath } from './encode-path';
import { getTokenInfo } from './get-token-info';

export const sendMoltenSwapTx = async ({
  provider,
  pkpEthAddress,
  pkpPublicKey,
  tokenIn,
  tokenOut,
  amountIn,
  amountOutMinimum,
  chainId,
}: {
  provider: ethers.providers.JsonRpcProvider;
  pkpEthAddress: string;
  pkpPublicKey: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMinimum: string;
  chainId: number;
}): Promise<string> => {
  // Build swap path: tokenIn -> tokenOut
  const pathTokens = [tokenIn, tokenOut];
  const encodedPath = encodePath(pathTokens);

  // Create deadline (current timestamp + 600 seconds)
  const deadline = Math.floor(Date.now() / 1000) + 600;

  // Prepare function arguments for exactInput
  // exactInput((bytes,address,uint256,uint256,uint256)) external payable returns (uint256)
  const exactInputAbi =
    'function exactInput((bytes,address,uint256,uint256,uint256)) external payable returns (uint256)';

  const abi = [exactInputAbi];
  const functionName = 'exactInput';
  // Always use the delegator's address as recipient for security
  const args = [[encodedPath, pkpEthAddress, deadline, amountIn, amountOutMinimum]];

  // Determine value: if tokenIn is wCORE, send native CORE as value
  const tokenInInfo = getTokenInfo(tokenIn);
  const isWrappedCore = tokenInInfo?.symbol === 'wCORE';
  const value = isWrappedCore ? amountIn : '0';

  console.log(
    `[sendMoltenSwapTx] Executing Molten swap. Value: ${value}, TokenIn: ${tokenInInfo?.symbol || tokenIn}`,
  );

  try {
    return await laUtils.transaction.handler.contractCall({
      provider,
      pkpPublicKey,
      callerAddress: pkpEthAddress,
      abi,
      contractAddress: moltenSwapConfig.router,
      functionName,
      args,
      chainId,
      overrides: {
        value,
      },
    });
  } catch (error) {
    console.error('[sendMoltenSwapTx] Molten swap transaction failed:', error);
    throw error;
  }
};
