import type { SourceAssetType } from './get-source-token';

import { MIN_BRIDGE_AMOUNT, MIN_USDC_BRIDGE_AMOUNT } from '../config';

/**
 * Check if amount meets minimum requirement based on source asset type
 */
export function checkMinimumAmount(
  amountStr: string,
  sourceAsset?: SourceAssetType,
): { valid: boolean; error?: string } {
  const amountNum = parseFloat(amountStr);
  const minAmount = sourceAsset === 'USDC' ? MIN_USDC_BRIDGE_AMOUNT : MIN_BRIDGE_AMOUNT;
  const assetName = sourceAsset === 'USDC' ? 'USDC' : 'BTC';

  if (amountNum <= minAmount) {
    return {
      valid: false,
      error: `Amount too small for THORChain bridge. Your amount: ${amountStr} ${assetName}, Minimum required: ${minAmount} ${assetName}`,
    };
  }

  return { valid: true };
}
