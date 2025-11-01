import type {SupportedChainKey} from '../config';

import { LZ_V1_CHAIN_IDS  } from '../config';

export function getLzV1ChainId(chainKey: SupportedChainKey): number {
  const chainId = LZ_V1_CHAIN_IDS[chainKey];
  if (!chainId) {
    throw new Error(`Unsupported chain for LayerZero v1: ${chainKey}`);
  }
  return chainId;
}
