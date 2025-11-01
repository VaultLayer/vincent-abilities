import type { ThorInboundAddress } from '../types';

import { THORCHAIN_API_ENDPOINTS } from '../config';

// Declare fetch if not available (for browser environments)
declare const fetch: any;

export interface ThorInboundResult {
  router: string;
  vault: string;
}

/**
 * Fetch THORChain inbound addresses for a given chain
 */
export async function fetchThorInbound(chainKey: 'BASE' | 'ETH'): Promise<ThorInboundResult> {
  try {
    const response = await fetch(THORCHAIN_API_ENDPOINTS.inboundAddresses, { timeout: 15000 });
    if (!response.ok) {
      throw new Error(`THORChain API error: ${response.status}`);
    }

    const data: ThorInboundAddress[] = await response.json();
    const entry = Array.isArray(data) ? data.find((x) => x.chain === chainKey) : null;

    if (!entry) {
      throw new Error(`No THOR inbound for ${chainKey}`);
    }

    if (entry.halted) {
      throw new Error(`THOR inbound for ${chainKey} is HALTED`);
    }

    if ((chainKey === 'BASE' || chainKey === 'ETH') && !entry.router) {
      throw new Error(`No THOR router for ${chainKey} (required for ERC-20)`);
    }

    return {
      router: entry.router,
      vault: entry.address,
    };
  } catch (error) {
    console.error('[fetchThorInbound] Error fetching THORChain inbound addresses:', error);
    throw error;
  }
}
