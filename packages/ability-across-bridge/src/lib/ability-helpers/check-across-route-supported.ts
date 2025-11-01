import type {SupportedChainKey} from '../config';

import { ACROSS_CHAIN_IDS  } from '../config';

export function isAcrossRouteSupported(
  sourceChain: SupportedChainKey,
  destinationChain: SupportedChainKey,
): boolean {
  const supportedChains = Object.keys(ACROSS_CHAIN_IDS) as SupportedChainKey[];
  return supportedChains.includes(sourceChain) && supportedChains.includes(destinationChain);
}
