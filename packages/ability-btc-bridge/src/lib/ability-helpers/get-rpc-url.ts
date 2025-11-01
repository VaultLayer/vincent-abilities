import type { SupportedChainKey } from '../config';

// Declare Lit global for Lit Action environment
declare const Lit: {
  Actions: {
    getRpcUrl: (params: { chain: string }) => Promise<string>;
  };
};

// Mapping from our chain keys to Lit chain names
const LIT_CHAIN_NAME_MAP: Record<SupportedChainKey, string> = {
  base: 'base',
  ethereum: 'ethereum',
};

// Default RPC URLs as fallback
const DEFAULT_RPC_URLS: Record<SupportedChainKey, string> = {
  base: 'https://mainnet.base.org',
  ethereum: 'https://eth.llamarpc.com',
};

/**
 * Get RPC URL for a chain, using Lit's RPC resolution if available
 * Falls back to hardcoded defaults if not found
 */
export async function getRpcUrl(chainKey: SupportedChainKey): Promise<string> {
  const litChainName = LIT_CHAIN_NAME_MAP[chainKey];

  // Try to use Lit's RPC URL resolution
  try {
    const rpcUrl = await Lit.Actions.getRpcUrl({ chain: litChainName });
    if (rpcUrl) {
      console.log(`[getRpcUrl] Using Lit RPC URL for ${chainKey} (${litChainName}): ${rpcUrl}`);
      return rpcUrl;
    }
  } catch (error) {
    console.warn(
      `[getRpcUrl] Failed to get RPC URL from Lit for ${litChainName}, using fallback:`,
      error,
    );
  }

  // Fallback to hardcoded defaults
  const fallbackRpcUrl = DEFAULT_RPC_URLS[chainKey];
  console.log(`[getRpcUrl] Using fallback RPC URL for ${chainKey}: ${fallbackRpcUrl}`);
  return fallbackRpcUrl;
}
