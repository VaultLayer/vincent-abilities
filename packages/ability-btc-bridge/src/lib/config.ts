// THORChain Bridge Configuration
export const CHAIN_IDS = {
  base: 8453,
  ethereum: 1,
} as const;

export const WRAPPED_BTC_TOKEN_ADDRESSES = {
  base: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as const, // cbBTC
  ethereum: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' as const, // WBTC
} as const;

// USDC token addresses
export const USDC_TOKEN_ADDRESSES = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const, // USDC on Base
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const, // USDC on Ethereum
} as const;

// Both cbBTC and WBTC have 8 decimals
export const BTC_TOKEN_DECIMALS = 8;
// USDC has 6 decimals
export const USDC_TOKEN_DECIMALS = 6;

// THORChain API endpoints
export const THORCHAIN_API_ENDPOINTS = {
  inboundAddresses: 'https://thornode.ninerealms.com/thorchain/inbound_addresses',
  quote: 'https://thornode.ninerealms.com/thorchain/quote/swap',
} as const;

// THORChain Router ABI (minimal for depositWithExpiry)
export const THOR_ROUTER_ABI = [
  'function depositWithExpiry(address payable vault, address asset, uint256 amount, string calldata memo, uint256 expiration) external payable',
];

// Minimum bridge amounts
export const MIN_BRIDGE_AMOUNT = 0.001; // 0.001 BTC for cbBTC/wBTC
export const MIN_USDC_BRIDGE_AMOUNT = 5; // $5 USDC minimum

// Quote tolerance in basis points (50 bps = 0.5%)
export const QUOTE_TOLERANCE_BPS = 50;
// Liquidity tolerance in basis points (100 bps = 1%)
export const LIQUIDITY_TOLERANCE_BPS = 100;

// Deposit expiration time in seconds (20 minutes)
export const DEPOSIT_EXPIRATION_SECONDS = 20 * 60;

// Supported chain keys
export type SupportedChainKey = keyof typeof CHAIN_IDS;
