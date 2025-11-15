import type { ThorQuoteResponse } from '../types';

import { THORCHAIN_API_ENDPOINTS, QUOTE_TOLERANCE_BPS, LIQUIDITY_TOLERANCE_BPS } from '../config';

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

export interface GetThorQuoteParams {
  fromAsset: string;
  toAsset: string;
  amount1e8: string;
  destination?: string;
  toleranceBps?: number;
  affiliate?: string;
  affiliateBps?: number;
  streamingInterval?: number;
  liquidityToleranceBps?: number;
}

/**
 * Get THORChain quote for a swap
 */
export async function getThorQuote(params: GetThorQuoteParams): Promise<ThorQuoteResponse> {
  const {
    fromAsset,
    toAsset,
    amount1e8,
    destination,
    toleranceBps = QUOTE_TOLERANCE_BPS,
    affiliate = 'vl',
    affiliateBps = 10, // 10 bps is 0.1%
    streamingInterval = 1,
    liquidityToleranceBps = LIQUIDITY_TOLERANCE_BPS,
  } = params;

  try {
    const url = new URL(THORCHAIN_API_ENDPOINTS.quote);
    url.searchParams.set('from_asset', fromAsset);
    url.searchParams.set('to_asset', toAsset);
    url.searchParams.set('amount', String(amount1e8));
    if (destination) {
      url.searchParams.set('destination', destination);
    }
    url.searchParams.set('affiliate', affiliate);
    url.searchParams.set('affiliate_bps', String(affiliateBps));
    url.searchParams.set('streaming_interval', String(streamingInterval));
    url.searchParams.set('liquidity_tolerance_bps', String(liquidityToleranceBps));
    url.searchParams.set('tolerance_bps', String(toleranceBps));

    // Use runOnce to ensure deterministic execution across Lit nodes
    const quoteResponseJson = await Lit.Actions.runOnce(
      { waitForResponse: true, name: 'getThorQuote' },
      async () => {
        const response = await fetch(url.toString(), { timeout: 15000 });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          return JSON.stringify({
            error: true,
            status: response.status,
            message: `THORChain quote API error (${response.status}): ${errorText}. Request: ${fromAsset} -> ${toAsset}, amount: ${amount1e8}`,
          });
        }

        const data: ThorQuoteResponse = await response.json();

        if (!data?.memo) {
          // Log the full response for debugging
          console.error('THORChain quote response missing memo:', JSON.stringify(data, null, 2));
          return JSON.stringify({
            error: true,
            message: `No memo returned from THOR /quote. Response: ${JSON.stringify(data)}. Request: ${fromAsset} -> ${toAsset}, amount: ${amount1e8}`,
            data,
          });
        }

        return JSON.stringify({ error: false, data });
      },
    );

    const quoteResponse = JSON.parse(quoteResponseJson);

    if (quoteResponse.error) {
      throw new Error(quoteResponse.message || 'Unknown error from THORChain quote API');
    }

    return quoteResponse.data as ThorQuoteResponse;
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
