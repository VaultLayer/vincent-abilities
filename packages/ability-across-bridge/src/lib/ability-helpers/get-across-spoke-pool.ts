import type {SupportedChainKey} from '../config';

import { ACROSS_SPOKE_POOLS  } from '../config';

export function getAcrossSpokePool(chainKey: SupportedChainKey): string {
  const spokePool = ACROSS_SPOKE_POOLS[chainKey];
  if (!spokePool) {
    throw new Error(`Unsupported chain for Across SpokePool: ${chainKey}`);
  }
  return spokePool;
}
