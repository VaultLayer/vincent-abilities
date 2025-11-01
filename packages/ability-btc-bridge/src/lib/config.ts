// THORChain Bridge Configuration
export const CHAIN_IDS = {
  base: 8453,
  ethereum: 1,
} as const;

export const WRAPPED_BTC_TOKEN_ADDRESSES = {
  base: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as const, // cbBTC
  ethereum: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' as const, // WBTC
} as const;

// Both cbBTC and WBTC have 8 decimals
export const BTC_TOKEN_DECIMALS = 8;

// THORChain API endpoints
export const THORCHAIN_API_ENDPOINTS = {
  inboundAddresses: 'https://thornode.ninerealms.com/thorchain/inbound_addresses',
  quote: 'https://thornode.ninerealms.com/thorchain/quote/swap',
} as const;

// THORChain Router ABI (minimal for depositWithExpiry)
export const THOR_ROUTER_ABI = [
  'function depositWithExpiry(address payable vault, address asset, uint256 amount, string calldata memo, uint256 expiration) external payable',
];

// Minimum bridge amount (0.001 BTC)
export const MIN_BRIDGE_AMOUNT = 0.001;

// Quote tolerance in basis points (50 bps = 0.5%)
export const QUOTE_TOLERANCE_BPS = 50;

// Deposit expiration time in seconds (20 minutes)
export const DEPOSIT_EXPIRATION_SECONDS = 20 * 60;

// Supported chain keys
export type SupportedChainKey = keyof typeof CHAIN_IDS;
