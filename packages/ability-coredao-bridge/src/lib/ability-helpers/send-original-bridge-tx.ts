import type {UnsignedTransaction} from 'ethers';

import { ethers  } from 'ethers';

import { populateTransaction, sponsoredGasRawTransaction } from '@lit-protocol/vincent-ability-sdk';

import type { SupportedChainKey } from '../config';

declare const Lit: {
  Actions: {
    runOnce: (
      params: {
        waitForResponse: boolean;
        name: string;
      },
      callback: () => Promise<string>,
    ) => Promise<string>;
    signAndCombineEcdsa: (params: {
      toSign: Uint8Array;
      publicKey: string;
      sigName: string;
    }) => Promise<string>;
  };
};

/**
 * Sign a transaction using PKP
 */
async function signTx(pkpPublicKey: string, tx: ethers.UnsignedTransaction, sigName: string) {
  const publicKeyForLit = pkpPublicKey.replace(/^0x/, '');
  console.log(`[signOriginalBridgeTx] Signing using PKP Public Key: ${publicKeyForLit}`);

  const unsignedSerializedTx = ethers.utils.serializeTransaction(tx);
  const txHash = ethers.utils.keccak256(unsignedSerializedTx);
  console.log('[signOriginalBridgeTx] Tx hash:', txHash);

  const signatureResponse = await Lit.Actions.signAndCombineEcdsa({
    toSign: ethers.utils.arrayify(txHash),
    publicKey: publicKeyForLit,
    sigName,
  });

  const { r, s, v } = JSON.parse(signatureResponse);
  const ethersJoinedSignature = ethers.utils.joinSignature({
    r: '0x' + r.substring(2),
    s: '0x' + s,
    v: v,
  });

  const signedSerializedTx = ethers.utils.serializeTransaction(tx, ethersJoinedSignature);
  console.log('[signOriginalBridgeTx] Signed serialized tx:', signedSerializedTx);

  return signedSerializedTx;
}

/**
 * Send LayerZero v1 Original Token Bridge transaction (Base/Arbitrum -> CoreDAO)
 */
export async function sendOriginalBridgeTx({
  rpcUrl,
  chainId,
  pkpEthAddress,
  pkpPublicKey,
  bridgeAddress,
  tokenAddress,
  amountLD,
  toAddress,
  nativeFee,
  sourceChain,
  alchemyGasSponsor,
  alchemyGasSponsorApiKey,
  alchemyGasSponsorPolicyId,
}: {
  rpcUrl: string;
  chainId: number;
  pkpEthAddress: string;
  pkpPublicKey: string;
  bridgeAddress: string;
  tokenAddress: string;
  amountLD: string;
  toAddress: string;
  nativeFee: bigint;
  sourceChain: SupportedChainKey;
  alchemyGasSponsor?: boolean;
  alchemyGasSponsorApiKey?: string;
  alchemyGasSponsorPolicyId?: string;
}): Promise<string> {
  console.log('[sendOriginalBridgeTx] Building Original Token Bridge transaction');

  // Prepare bridge parameters
  const token = tokenAddress;
  const amount = amountLD;
  const to = toAddress;
  const refundAddress = pkpEthAddress;
  const zroPaymentAddress = ethers.constants.AddressZero;
  const adapterParams = '0x';

  // Encode the bridge function call data
  const bridgeAbi = [
    'function bridge(address token, uint256 amountLD, address to, tuple(address refundAddress,address zroPaymentAddress) callParams, bytes adapterParams) payable',
  ];
  const iface = new ethers.utils.Interface(bridgeAbi);
  const functionArgs = [token, amount, to, [refundAddress, zroPaymentAddress], adapterParams];

  const callData = iface.encodeFunctionData('bridge', functionArgs);
  console.log('[sendOriginalBridgeTx] Call data:', callData.slice(0, 100) + '...');

  // Use gas sponsorship if enabled and all required parameters are provided
  if (alchemyGasSponsor && alchemyGasSponsorApiKey && alchemyGasSponsorPolicyId) {
    console.log('[sendOriginalBridgeTx] Using EIP-7702 gas sponsorship');

    if (sourceChain === 'coreDao') {
      throw new Error('Alchemy gas sponsorship is not supported on CoreDAO chain');
    }

    try {
      return await sponsoredGasRawTransaction({
        pkpPublicKey,
        to: bridgeAddress,
        value: nativeFee.toString(),
        data: callData,
        chainId,
        eip7702AlchemyApiKey: alchemyGasSponsorApiKey,
        eip7702AlchemyPolicyId: alchemyGasSponsorPolicyId,
      });
    } catch (error) {
      console.error('[sendOriginalBridgeTx] EIP-7702 bridge transaction failed:', error);
      throw error;
    }
  }

  // Use regular transaction without gas sponsorship
  console.log('[sendOriginalBridgeTx] Estimating gas for bridge transaction');

  const populateTxResponse = await Lit.Actions.runOnce(
    { waitForResponse: true, name: '[sendOriginalBridgeTx] Bridge tx gas estimation' },
    async () => {
      try {
        return JSON.stringify({
          status: 'success',
          populatedTransaction: await populateTransaction({
            to: bridgeAddress,
            from: pkpEthAddress,
            value: nativeFee.toString(),
            data: callData,
            rpcUrl,
            chainId,
          }),
        });
      } catch (error) {
        return JSON.stringify({
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  const parsedPopulateTxResponse = JSON.parse(populateTxResponse);
  if (parsedPopulateTxResponse.status === 'error') {
    throw new Error(
      `[sendOriginalBridgeTx] Error populating transaction: ${parsedPopulateTxResponse.error}`,
    );
  }
  const { populatedTransaction }: { populatedTransaction: UnsignedTransaction } =
    parsedPopulateTxResponse;

  const signedTx = await signTx(pkpPublicKey, populatedTransaction, 'originalBridgeSig');

  console.log('[sendOriginalBridgeTx] Broadcasting bridge transaction');
  const txResponse = await Lit.Actions.runOnce(
    { waitForResponse: true, name: 'originalBridgeTxSender' },
    async () => {
      try {
        const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl);
        const receipt = await provider.sendTransaction(signedTx);
        return JSON.stringify({
          status: 'success',
          txHash: receipt.hash,
        });
      } catch (error) {
        return JSON.stringify({
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  const parsedTxResponse = JSON.parse(txResponse);
  if (parsedTxResponse.status === 'error') {
    throw new Error(
      `[sendOriginalBridgeTx] Error broadcasting transaction: ${parsedTxResponse.error}`,
    );
  }
  const { txHash } = parsedTxResponse;
  console.log('[sendOriginalBridgeTx] Bridge transaction broadcasted:', txHash);

  return txHash;
}
