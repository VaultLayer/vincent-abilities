import type {SupportedChainKey, SupportedRouteInfo, BridgeType} from '../config';

import {
  
  LZ_V1_BRIDGE_ADDRESSES,
  
  
  LZ_V1_CHAIN_IDS
} from '../config';

/**
 * Check if a route is supported for CoreDAO bridging via LayerZero v1
 * Returns information about the bridge type and addresses needed
 */
export function isCoredaoRouteSupported(
  sourceChain: SupportedChainKey,
  destinationChain: SupportedChainKey,
): SupportedRouteInfo {
  // Base/Arbitrum -> CoreDAO: Original Token Bridge
  if ((sourceChain === 'base' || sourceChain === 'arbitrum') && destinationChain === 'coreDao') {
    const bridgeAddress = LZ_V1_BRIDGE_ADDRESSES[sourceChain].originalTokenBridge;
    return {
      supported: true,
      bridgeType: 'original' as BridgeType,
      bridgeAddress,
      destinationLzV1ChainId: LZ_V1_CHAIN_IDS.coreDao,
    };
  }

  // CoreDAO -> Base/Arbitrum/Ethereum: Wrapped Token Bridge
  if (
    sourceChain === 'coreDao' &&
    (destinationChain === 'base' ||
      destinationChain === 'arbitrum' ||
      destinationChain === 'ethereum')
  ) {
    const bridgeAddress = LZ_V1_BRIDGE_ADDRESSES.coreDao.wrappedTokenBridge;
    const destinationLzV1ChainId = LZ_V1_CHAIN_IDS[destinationChain];
    return {
      supported: true,
      bridgeType: 'wrapped' as BridgeType,
      bridgeAddress,
      destinationLzV1ChainId,
    };
  }

  // Route not supported
  return {
    supported: false,
    bridgeType: null,
    bridgeAddress: null,
    destinationLzV1ChainId: null,
  };
}
