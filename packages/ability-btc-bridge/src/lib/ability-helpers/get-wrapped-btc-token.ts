import type {SupportedChainKey} from '../config';

import { WRAPPED_BTC_TOKEN_ADDRESSES, BTC_TOKEN_DECIMALS  } from '../config';

/**
 * Get wrapped BTC token address and decimals for a given chain
 */
export function getWrappedBtcToken(chainKey: SupportedChainKey): {
  address: string;
  decimals: number;
} {
  const address = WRAPPED_BTC_TOKEN_ADDRESSES[chainKey];
  return {
    address,
    decimals: BTC_TOKEN_DECIMALS,
  };
}
