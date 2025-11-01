import type { ethers } from 'ethers';

import type { CheckNativeTokenBalanceResult } from '../types';

export const checkNativeTokenBalance = async ({
  provider,
  pkpEthAddress,
}: {
  provider: ethers.providers.Provider;
  pkpEthAddress: string;
}): Promise<CheckNativeTokenBalanceResult> => {
  const ethBalance = await provider.getBalance(pkpEthAddress);

  if (ethBalance.isZero()) {
    return {
      success: false,
      reason: `pkpEthAddress (${pkpEthAddress}) has zero native token balance (BtcBridgeAbilityPrecheck)`,
    };
  }

  return {
    success: true,
    ethBalance,
  };
};
