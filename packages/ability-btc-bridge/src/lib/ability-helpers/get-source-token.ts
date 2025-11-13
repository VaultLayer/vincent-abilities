import type { SupportedChainKey } from '../config';

import {
  WRAPPED_BTC_TOKEN_ADDRESSES,
  BTC_TOKEN_DECIMALS,
  USDC_TOKEN_ADDRESSES,
  USDC_TOKEN_DECIMALS,
} from '../config';

export type SourceAssetType = 'USDC' | 'cbBTC' | 'wBTC';

export interface SourceTokenInfo {
  address: string;
  decimals: number;
}

/**
 * Get source token address and decimals for a given chain and asset type
 */
export function getSourceToken(
  chainKey: SupportedChainKey,
  sourceAsset: SourceAssetType = 'cbBTC',
): SourceTokenInfo {
  if (sourceAsset === 'USDC') {
    const address = USDC_TOKEN_ADDRESSES[chainKey];
    if (!address) {
      throw new Error(`USDC is not supported on ${chainKey} chain`);
    }
    return {
      address,
      decimals: USDC_TOKEN_DECIMALS,
    };
  }

  if (sourceAsset === 'cbBTC') {
    if (chainKey !== 'base') {
      throw new Error('cbBTC is only supported on Base chain');
    }
    return {
      address: WRAPPED_BTC_TOKEN_ADDRESSES.base,
      decimals: BTC_TOKEN_DECIMALS,
    };
  }

  if (sourceAsset === 'wBTC') {
    if (chainKey !== 'ethereum') {
      throw new Error('wBTC is only supported on Ethereum chain');
    }
    return {
      address: WRAPPED_BTC_TOKEN_ADDRESSES.ethereum,
      decimals: BTC_TOKEN_DECIMALS,
    };
  }

  throw new Error(`Unknown source asset: ${sourceAsset}`);
}
