import { ACROSS_API_ENDPOINTS } from '../config';

// Across API response interface
export interface AcrossFeeData {
  capitalFeePct: string;
  capitalFeeTotal: string;
  relayGasFeePct: string;
  relayGasFeeTotal: string;
  relayFeePct: string;
  relayFeeTotal: string;
  lpFeePct: string;
  timestamp: string;
  isAmountTooLow: boolean;
  quoteBlock: string;
  exclusiveRelayer: string;
  exclusivityDeadline: string;
  spokePoolAddress: string;
  destinationSpokePoolAddress: string;
  fillDeadline: string;
  outputAmount: string;
  limits?: {
    minDeposit: string;
    maxDeposit: string;
    maxDepositInstant: string;
    maxDepositShortDelay: string;
    recommendedDepositInstant: string;
  };
  inputToken: {
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
  };
  outputToken: {
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
  };
}

/**
 * Get suggested fees from Across API
 */
export async function getAcrossSuggestedFees(
  inputToken: string,
  outputToken: string,
  originChainId: number,
  destinationChainId: number,
  amount: string,
  recipient: string,
): Promise<AcrossFeeData> {
  const url = `${ACROSS_API_ENDPOINTS.suggestedFees}?inputToken=${inputToken}&outputToken=${outputToken}&originChainId=${originChainId}&destinationChainId=${destinationChainId}&amount=${amount}&recipient=${recipient}&skipAmountLimit=true&allowUnmatchedDecimals=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data as AcrossFeeData;
  } catch (error) {
    console.error('Failed to get Across suggested fees:', error);
    throw new Error(
      `Failed to get Across suggested fees: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
