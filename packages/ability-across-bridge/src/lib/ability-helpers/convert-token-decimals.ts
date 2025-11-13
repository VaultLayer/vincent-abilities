import { ethers } from 'ethers';

export function convertTokenDecimals(
  amount: ethers.BigNumber,
  fromDecimals: number,
  toDecimals: number,
): ethers.BigNumber {
  if (fromDecimals === toDecimals) {
    return amount;
  }

  if (fromDecimals > toDecimals) {
    const factor = ethers.BigNumber.from(10).pow(fromDecimals - toDecimals);
    return amount.div(factor);
  }

  const factor = ethers.BigNumber.from(10).pow(toDecimals - fromDecimals);
  return amount.mul(factor);
}
