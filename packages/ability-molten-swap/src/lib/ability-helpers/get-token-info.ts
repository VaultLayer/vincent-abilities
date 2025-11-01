import type {TokenInfo} from '../config';

import { moltenSwapConfig  } from '../config';

export const getTokenInfo = (tokenAddressOrSymbol: string): TokenInfo | null => {
  const token = moltenSwapConfig.tokens[tokenAddressOrSymbol];
  return token || null;
};

export const isWrappedCore = (tokenAddress: string): boolean => {
  const token = getTokenInfo(tokenAddress);
  return token?.symbol === 'wCORE';
};
