// Across Protocol Configuration
export const ACROSS_CHAIN_IDS = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
} as const;

export const ACROSS_SPOKE_POOLS = {
  base: '0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64' as const,
  ethereum: '0x4D9079Bb4165aeb4084c526a32695dCfd2F77381' as const,
  arbitrum: '0xe35e9842fceaCA96570B734083f4a58e8F7C5f2A' as const,
} as const;

// USDC token addresses per chain
export const USDC_TOKEN_ADDRESSES = {
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const,
} as const;

// USDC decimals (standard is 6)
export const USDC_DECIMALS = 6;

// Across API endpoints
export const ACROSS_API_ENDPOINTS = {
  suggestedFees: 'https://app.across.to/api/suggested-fees',
  depositStatus: 'https://indexer.api.across.to/deposit/status',
} as const;

// Across integrator ID and delimiter
export const ACROSS_INTEGRATOR_ID = '0x00a6';
export const ACROSS_DELIMITER = '1dc0de';

// Supported chain keys
export type SupportedChainKey = keyof typeof ACROSS_CHAIN_IDS;
