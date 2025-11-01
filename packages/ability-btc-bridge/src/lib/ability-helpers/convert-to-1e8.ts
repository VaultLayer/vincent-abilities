import { ethers } from 'ethers';

/**
 * Convert token amounts to THORChain's 1e8 base format
 */
export async function ldTo1e8({
  provider,
  token,
  amountLD,
}: {
  provider: ethers.providers.Provider;
  token: string;
  amountLD: ethers.BigNumber;
}): Promise<ethers.BigNumber> {
  const erc = new ethers.Contract(token, ['function decimals() view returns (uint8)'], provider);
  const dec = await erc.decimals();

  if (dec === 8) {
    return amountLD; // already in 1e8
  }

  if (dec > 8) {
    const div = ethers.BigNumber.from(10).pow(dec - 8);
    return amountLD.div(div);
  } else {
    const mul = ethers.BigNumber.from(10).pow(8 - dec);
    return amountLD.mul(mul);
  }
}
