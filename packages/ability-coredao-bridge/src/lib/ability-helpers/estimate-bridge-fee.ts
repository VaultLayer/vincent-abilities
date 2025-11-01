import { ethers } from 'ethers';

import type { BridgeType } from '../config';

interface BridgeFeeEstimate {
  nativeFee: bigint;
  lzTokenFee: bigint;
}

/**
 * Estimate LayerZero v1 bridge fees using contract calls
 */
export async function estimateBridgeFee({
  provider,
  bridgeAddress,
  bridgeType,
  destinationLzV1ChainId,
}: {
  provider: ethers.providers.Provider;
  bridgeAddress: string;
  bridgeType: BridgeType;
  destinationLzV1ChainId?: number;
}): Promise<BridgeFeeEstimate> {
  const adapterParams = '0x';

  if (bridgeType === 'original') {
    // Original Token Bridge fee estimation (for Base/Arbitrum -> CoreDAO)
    const estimateBridgeFeeAbi = [
      {
        inputs: [
          { name: 'useZro', type: 'bool' },
          { name: 'adapterParams', type: 'bytes' },
        ],
        name: 'estimateBridgeFee',
        outputs: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'zroFee', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    ];

    const contract = new ethers.Contract(bridgeAddress, estimateBridgeFeeAbi, provider);
    const [nativeFee, lzTokenFee] = await contract.estimateBridgeFee(false, adapterParams);

    return {
      nativeFee: nativeFee.toBigInt(),
      lzTokenFee: lzTokenFee.toBigInt(),
    };
  } else {
    // Wrapped Token Bridge fee estimation (for CoreDAO -> Base/Arbitrum/Ethereum)
    if (!destinationLzV1ChainId) {
      throw new Error('destinationLzV1ChainId is required for wrapped token bridge');
    }

    const estimateBridgeFeeAbi = [
      {
        inputs: [
          { name: 'dstEid', type: 'uint16' },
          { name: 'payInLzToken', type: 'bool' },
          { name: 'adapterParams', type: 'bytes' },
        ],
        name: 'estimateBridgeFee',
        outputs: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    ];

    const contract = new ethers.Contract(bridgeAddress, estimateBridgeFeeAbi, provider);
    const [nativeFee, lzTokenFee] = await contract.estimateBridgeFee(
      destinationLzV1ChainId,
      false,
      adapterParams,
    );

    return {
      nativeFee: nativeFee.toBigInt(),
      lzTokenFee: lzTokenFee.toBigInt(),
    };
  }
}
