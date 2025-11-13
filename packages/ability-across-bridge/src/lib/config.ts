// Across Protocol Configuration
export const ACROSS_CHAIN_IDS = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  bsc: 56,
} as const;

export type SupportedChainKey = keyof typeof ACROSS_CHAIN_IDS;

export const ACROSS_SPOKE_POOLS = {
  base: '0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64' as const,
  ethereum: '0x4D9079Bb4165aeb4084c526a32695dCfd2F77381' as const,
  arbitrum: '0xe35e9842fceaCA96570B734083f4a58e8F7C5f2A' as const,
  bsc: '0x4e8E101924eDE233C13e2D8622DC8aED2872d505' as const,
} as const;

// USDC token addresses per chain
export const USDC_TOKEN_ADDRESSES = {
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const,
  bsc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as const,
} as const;

// USDC decimals per chain
export const USDC_TOKEN_DECIMALS = {
  arbitrum: 6,
  base: 6,
  ethereum: 6,
  bsc: 18,
} as const;

export function getUsdcTokenDecimals(chainKey: SupportedChainKey): number {
  const decimals = USDC_TOKEN_DECIMALS[chainKey];
  if (decimals === undefined) {
    throw new Error(`USDC decimals not configured for chain: ${chainKey}`);
  }
  return decimals;
}

// Across API endpoints
export const ACROSS_API_ENDPOINTS = {
  suggestedFees: 'https://app.across.to/api/suggested-fees',
  depositStatus: 'https://indexer.api.across.to/deposit/status',
} as const;

// Across integrator ID and delimiter
export const ACROSS_INTEGRATOR_ID = '0x00a6';
export const ACROSS_DELIMITER = '1dc0de';
