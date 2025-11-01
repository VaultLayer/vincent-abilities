import type {UnsignedTransaction} from 'ethers';

import { ethers  } from 'ethers';

import { populateTransaction } from '@lit-protocol/vincent-ability-sdk';

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
  console.log(`[sendWrappedBridgeTx] Signing using PKP Public Key: ${publicKeyForLit}`);

  const unsignedSerializedTx = ethers.utils.serializeTransaction(tx);
  const txHash = ethers.utils.keccak256(unsignedSerializedTx);
  console.log('[sendWrappedBridgeTx] Tx hash:', txHash);

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
  console.log('[sendWrappedBridgeTx] Signed serialized tx:', signedSerializedTx);

  return signedSerializedTx;
}

/**
 * Send LayerZero v1 Wrapped Token Bridge transaction (CoreDAO -> Base/Arbitrum/Ethereum)
 */
export async function sendWrappedBridgeTx({
  rpcUrl,
  chainId,
  pkpEthAddress,
  pkpPublicKey,
  bridgeAddress,
  tokenAddress,
  destinationLzV1ChainId,
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
  destinationLzV1ChainId: number;
  amountLD: string;
  toAddress: string;
  nativeFee: bigint;
  sourceChain: SupportedChainKey;
  alchemyGasSponsor?: boolean;
  alchemyGasSponsorApiKey?: string;
  alchemyGasSponsorPolicyId?: string;
}): Promise<string> {
  console.log('[sendWrappedBridgeTx] Building Wrapped Token Bridge transaction');

  // Prepare bridge parameters
  const localToken = tokenAddress;
  const remoteChainId = destinationLzV1ChainId;
  const amount = amountLD;
  const to = toAddress;
  const unwrapWeth = false; // false for USDC
  const refundAddress = pkpEthAddress;
  const zroPaymentAddress = ethers.constants.AddressZero;
  const adapterParams = '0x';

  // Encode the bridge function call data
  const bridgeAbi = [
    'function bridge(address localToken, uint16 remoteChainId, uint256 amount, address to, bool unwrapWeth, tuple(address refundAddress,address zroPaymentAddress) callParams, bytes adapterParams) payable',
  ];
  const iface = new ethers.utils.Interface(bridgeAbi);
  const functionArgs = [
    localToken,
    remoteChainId,
    amount,
    to,
    unwrapWeth,
    [refundAddress, zroPaymentAddress],
    adapterParams,
  ];

  const callData = iface.encodeFunctionData('bridge', functionArgs);
  console.log('[sendWrappedBridgeTx] Call data:', callData.slice(0, 100) + '...');

  // Gas sponsorship is not supported on CoreDAO (sourceChain should always be coreDao for wrapped bridge)
  // So we always use regular transactions
  console.log(
    '[sendWrappedBridgeTx] Estimating gas for bridge transaction (CoreDAO does not support gas sponsorship)',
  );

  const populateTxResponse = await Lit.Actions.runOnce(
    { waitForResponse: true, name: '[sendWrappedBridgeTx] Bridge tx gas estimation' },
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
      `[sendWrappedBridgeTx] Error populating transaction: ${parsedPopulateTxResponse.error}`,
    );
  }
  const { populatedTransaction }: { populatedTransaction: UnsignedTransaction } =
    parsedPopulateTxResponse;

  const signedTx = await signTx(pkpPublicKey, populatedTransaction, 'wrappedBridgeSig');

  console.log('[sendWrappedBridgeTx] Broadcasting bridge transaction');
  const txResponse = await Lit.Actions.runOnce(
    { waitForResponse: true, name: 'wrappedBridgeTxSender' },
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
      `[sendWrappedBridgeTx] Error broadcasting transaction: ${parsedTxResponse.error}`,
    );
  }
  const { txHash } = parsedTxResponse;
  console.log('[sendWrappedBridgeTx] Bridge transaction broadcasted:', txHash);

  return txHash;
}
