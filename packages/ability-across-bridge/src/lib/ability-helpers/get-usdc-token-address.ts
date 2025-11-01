import type {SupportedChainKey} from '../config';

import { USDC_TOKEN_ADDRESSES  } from '../config';

export function getUsdcTokenAddress(chainKey: SupportedChainKey): string {
  const tokenAddress = USDC_TOKEN_ADDRESSES[chainKey];
  if (!tokenAddress) {
    throw new Error(`USDC not available on chain: ${chainKey}`);
  }
  return tokenAddress;
}
