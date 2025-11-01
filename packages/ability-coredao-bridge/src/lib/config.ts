// LayerZero v1 Configuration
export const LZ_V1_CHAIN_IDS = {
  base: 184,
  arbitrum: 110,
  coreDao: 153,
  ethereum: 101,
} as const;

// LayerZero v1 Bridge Addresses
export const LZ_V1_BRIDGE_ADDRESSES = {
  base: {
    originalTokenBridge: '0x84FB2086Fed7b3c9b3a4Bc559f60fFaA91507879' as const,
  },
  arbitrum: {
    originalTokenBridge: '0x29d096cd18c0da7500295f082da73316d704031a' as const,
  },
  coreDao: {
    wrappedTokenBridge: '0xA4218e1F39DA4AaDaC971066458Db56e901bcbdE' as const,
  },
} as const;

// Standard chain IDs
export const STANDARD_CHAIN_IDS = {
  base: 8453,
  arbitrum: 42161,
  coreDao: 1116,
  ethereum: 1,
} as const;

// USDC token addresses per chain
export const USDC_TOKEN_ADDRESSES = {
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const,
  coreDao: '0xa4151b2b3e269645181dccf2d426ce75fcbdeca9' as const,
} as const;

// USDC decimals (standard is 6)
export const USDC_DECIMALS = 6;

// Supported chain keys for CoreDAO bridging
export type SupportedChainKey = keyof typeof LZ_V1_CHAIN_IDS;

// Supported routes (source -> destination)
export const SUPPORTED_ROUTES = [
  'base->coreDao',
  'coreDao->base',
  'arbitrum->coreDao',
  'coreDao->arbitrum',
  'coreDao->ethereum',
] as const;

export type BridgeType = 'original' | 'wrapped';

export interface SupportedRouteInfo {
  supported: boolean;
  bridgeType: BridgeType | null;
  bridgeAddress: string | null;
  destinationLzV1ChainId: number | null;
}
