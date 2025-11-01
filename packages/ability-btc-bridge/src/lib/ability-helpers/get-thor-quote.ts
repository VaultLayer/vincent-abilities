import type { ThorQuoteResponse } from '../types';

import { THORCHAIN_API_ENDPOINTS, QUOTE_TOLERANCE_BPS } from '../config';

// Declare fetch if not available (for browser environments)
declare const fetch: any;

export interface GetThorQuoteParams {
  fromAsset: string;
  toAsset: string;
  amount1e8: string;
  destination: string;
  toleranceBps?: number;
}

/**
 * Get THORChain quote for a swap
 */
export async function getThorQuote(params: GetThorQuoteParams): Promise<ThorQuoteResponse> {
  const { fromAsset, toAsset, amount1e8, destination, toleranceBps = QUOTE_TOLERANCE_BPS } = params;

  try {
    const url = new URL(THORCHAIN_API_ENDPOINTS.quote);
    url.searchParams.set('from_asset', fromAsset);
    url.searchParams.set('to_asset', toAsset);
    url.searchParams.set('amount', String(amount1e8));
    url.searchParams.set('destination', destination);
    url.searchParams.set('tolerance_bps', String(toleranceBps));

    const response = await fetch(url.toString(), { timeout: 15000 });
    const data: ThorQuoteResponse = await response.json();

    if (!data?.memo) {
      throw new Error('No memo returned from THOR /quote');
    }

    return data;
  } catch (error: any) {
    // Handle specific THORChain error messages
    if (error.response?.status === 500 || error.response?.status === 400) {
      if (error.response?.data?.message) {
        const message = error.response.data.message;

        if (message.includes('outbound amount does not meet requirements')) {
          const match = message.match(
            /outbound amount does not meet requirements \((\d+)\/(\d+)\)/,
          );
          if (match) {
            const actualAmount = parseInt(match[1]);
            const requiredAmount = parseInt(match[2]);
            const shortfall = requiredAmount - actualAmount;
            throw new Error(
              `Amount too small for Thorchain swap! Your amount: ${actualAmount} units (1e8 base), Required minimum: ${requiredAmount} units (1e8 base), Shortfall: ${shortfall} units (1e8 base), Try increasing your swap amount by at least ${(shortfall / 1e8).toFixed(8)} tokens`,
            );
          }
        }

        if (message.includes('emit asset') && message.includes('less than price limit')) {
          const match = message.match(/emit asset (\d+) less than price limit (\d+)/);
          if (match) {
            const emitAmount = parseInt(match[1]);
            const priceLimit = parseInt(match[2]);
            throw new Error(
              `Swap amount results in insufficient output! Expected output: ${emitAmount} units, Minimum required: ${priceLimit} units, This usually means the swap amount is too small to cover fees and minimums. Try increasing your swap amount significantly.`,
            );
          }
        }
      }
    }

    throw error;
  }
}
