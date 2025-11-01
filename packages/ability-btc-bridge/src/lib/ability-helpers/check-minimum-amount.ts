import { MIN_BRIDGE_AMOUNT } from '../config';

/**
 * Check if amount meets minimum requirement
 */
export function checkMinimumAmount(amountStr: string): { valid: boolean; error?: string } {
  const amountNum = parseFloat(amountStr);

  if (amountNum <= MIN_BRIDGE_AMOUNT) {
    return {
      valid: false,
      error: `Amount too small for THORChain bridge. Your amount: ${amountStr}, Minimum required: ${MIN_BRIDGE_AMOUNT}`,
    };
  }

  return { valid: true };
}
