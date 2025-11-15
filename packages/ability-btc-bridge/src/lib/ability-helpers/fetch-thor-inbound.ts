import type { ThorInboundAddress } from '../types';

import { THORCHAIN_API_ENDPOINTS } from '../config';

// Declare fetch if not available (for browser environments)
declare const fetch: any;

// Declare Lit global for Lit Action environment
declare const Lit: {
  Actions: {
    runOnce: (
      params: { waitForResponse: boolean; name: string },
      fn: () => Promise<string>,
    ) => Promise<string>;
  };
};

export interface ThorInboundResult {
  router: string;
  vault: string;
}

/**
 * Fetch THORChain inbound addresses for a given chain
 */
export async function fetchThorInbound(chainKey: 'BASE' | 'ETH'): Promise<ThorInboundResult> {
  try {
    // Use runOnce to ensure deterministic execution across Lit nodes
    const inboundResponseJson = await Lit.Actions.runOnce(
      { waitForResponse: true, name: 'fetchThorInbound' },
      async () => {
        const response = await fetch(THORCHAIN_API_ENDPOINTS.inboundAddresses, { timeout: 15000 });
        if (!response.ok) {
          return JSON.stringify({
            error: true,
            message: `THORChain API error: ${response.status}`,
          });
        }

        const data: ThorInboundAddress[] = await response.json();
        const entry = Array.isArray(data) ? data.find((x) => x.chain === chainKey) : null;

        if (!entry) {
          return JSON.stringify({
            error: true,
            message: `No THOR inbound for ${chainKey}`,
          });
        }

        if (entry.halted) {
          return JSON.stringify({
            error: true,
            message: `THOR inbound for ${chainKey} is HALTED`,
          });
        }

        if ((chainKey === 'BASE' || chainKey === 'ETH') && !entry.router) {
          return JSON.stringify({
            error: true,
            message: `No THOR router for ${chainKey} (required for ERC-20)`,
          });
        }

        return JSON.stringify({
          error: false,
          router: entry.router,
          vault: entry.address,
        });
      },
    );

    const inboundResponse = JSON.parse(inboundResponseJson);

    if (inboundResponse.error) {
      throw new Error(inboundResponse.message || 'Unknown error from THORChain inbound API');
    }

    return {
      router: inboundResponse.router,
      vault: inboundResponse.vault,
    };
  } catch (error) {
    console.error('[fetchThorInbound] Error fetching THORChain inbound addresses:', error);
    throw error;
  }
}
