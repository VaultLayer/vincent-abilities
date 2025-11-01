import type * as EthersNamespace from 'ethers';

// Declare ethers globally for vincent-scaffold-sdk type compatibility
declare global {
  const ethers: typeof EthersNamespace;
}

export {};
