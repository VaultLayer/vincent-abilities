import type {SupportedChainKey} from '../config';

import { LZ_V1_BRIDGE_ADDRESSES  } from '../config';

/**
 * Get the appropriate bridge contract address based on source and destination chains
 */
export function getBridgeAddress(
  sourceChain: SupportedChainKey,
  destinationChain: SupportedChainKey,
): string {
  // If bridging TO CoreDAO, use Original Token Bridge on source chain
  if (destinationChain === 'coreDao' && (sourceChain === 'base' || sourceChain === 'arbitrum')) {
    return LZ_V1_BRIDGE_ADDRESSES[sourceChain].originalTokenBridge;
  }

  // If bridging FROM CoreDAO, use Wrapped Token Bridge on CoreDAO
  if (sourceChain === 'coreDao') {
    return LZ_V1_BRIDGE_ADDRESSES.coreDao.wrappedTokenBridge;
  }

  throw new Error(`Unsupported bridge route: ${sourceChain} -> ${destinationChain}`);
}
