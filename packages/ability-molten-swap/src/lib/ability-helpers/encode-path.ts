import { ethers } from 'ethers';

export const encodePath = (pathTokens: string[]): string => {
  let encoded = '0x';
  for (let i = 0; i < pathTokens.length; i++) {
    // Remove 0x prefix and add the address (40 chars)
    // Normalize address (checksum) then convert to lowercase
    const normalizedAddress = ethers.utils.getAddress(pathTokens[i]).toLowerCase().slice(2);
    encoded += normalizedAddress;
  }
  return encoded.toLowerCase();
};
