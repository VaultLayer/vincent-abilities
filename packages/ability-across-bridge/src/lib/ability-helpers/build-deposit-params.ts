import { ethers } from 'ethers';

import type { AcrossFeeData } from './get-across-fees';

import { convertTokenDecimals } from './convert-token-decimals';

export interface DepositParams {
  outputAmount: ethers.BigNumber;
  quoteTimestamp: number;
  fillDeadline: number;
  exclusiveRelayer: string;
  exclusivityDeadline: number;
}

/**
 * Build Across deposit parameters for USDC bridging
 */
export async function buildDepositParams(
  inputAmount: ethers.BigNumber,
  inputTokenDecimals: number,
  outputTokenDecimals: number,
  useApiFees = true,
  feeData?: AcrossFeeData,
): Promise<DepositParams> {
  if (useApiFees && feeData && feeData.outputAmount && BigInt(feeData.outputAmount) > 0) {
    // Use API-provided fees
    return {
      outputAmount: ethers.BigNumber.from(feeData.outputAmount),
      quoteTimestamp: parseInt(feeData.timestamp, 10),
      fillDeadline: parseInt(feeData.fillDeadline, 10),
      exclusiveRelayer: feeData.exclusiveRelayer,
      exclusivityDeadline: Number(feeData.exclusivityDeadline),
    };
  } else {
    // Fallback to static estimation
    const currentTime = Math.floor(Date.now() / 1000);
    const fillBuffer = 3600; // 1 hour buffer

    // Conservative 30 bps fee estimate (9970/10000)
    const discountedInputAmount = inputAmount.mul(9970).div(10000);
    const outputAmount = convertTokenDecimals(
      discountedInputAmount,
      inputTokenDecimals,
      outputTokenDecimals,
    );

    return {
      outputAmount,
      quoteTimestamp: currentTime,
      fillDeadline: currentTime + fillBuffer,
      exclusiveRelayer: ethers.constants.AddressZero,
      exclusivityDeadline: 0,
    };
  }
}
