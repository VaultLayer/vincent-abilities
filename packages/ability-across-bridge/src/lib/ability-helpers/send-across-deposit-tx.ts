import type {UnsignedTransaction} from 'ethers';

import { ethers  } from 'ethers';

import { populateTransaction, sponsoredGasRawTransaction } from '@lit-protocol/vincent-ability-sdk';

import { ACROSS_DELIMITER, ACROSS_INTEGRATOR_ID } from '../config';

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

// Across SpokePool depositV3 ABI
export const ACROSS_SPOKE_POOL_ABI = [
  'function depositV3(address depositor,address recipient,address inputToken,address outputToken,uint256 inputAmount,uint256 outputAmount,uint256 destinationChainId,address exclusiveRelayer,uint32 quoteTimestamp,uint32 fillDeadline,uint32 exclusivityDeadline,bytes message) external',
] as const;

/**
 * Sign a transaction using PKP
 */
async function signTx(pkpPublicKey: string, tx: ethers.UnsignedTransaction, sigName: string) {
  // Remove 0x prefix if it exists, Lit expects a hex string without 0x prefix
  const publicKeyForLit = pkpPublicKey.replace(/^0x/, '');
  console.log(`[signTx] Signing using PKP Public Key: ${publicKeyForLit}`);

  const unsignedSerializedTx = ethers.utils.serializeTransaction(tx);
  const txHash = ethers.utils.keccak256(unsignedSerializedTx);
  console.log('[signTx] Tx hash:', txHash);

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
  console.log('[signTx] Signed serialized tx:', signedSerializedTx);

  return signedSerializedTx;
}

/**
 * Send Across depositV3 transaction with delimiter and integrator ID appended to call data
 * Note: The delimiter (1dc0de) and integrator ID (00a6) are appended to the transaction call data,
 * NOT to any function parameters (including the message param).
 */
export async function sendAcrossDepositTx({
  rpcUrl,
  chainId,
  pkpEthAddress,
  pkpPublicKey,
  spokePoolAddress,
  depositor,
  recipient,
  inputToken,
  outputToken,
  inputAmount,
  outputAmount,
  destinationChainId,
  exclusiveRelayer,
  quoteTimestamp,
  fillDeadline,
  exclusivityDeadline,
  message = '0x',
  gasBufferPercentage,
  baseFeePerGasBufferPercentage,
  alchemyGasSponsor,
  alchemyGasSponsorApiKey,
  alchemyGasSponsorPolicyId,
}: {
  rpcUrl: string;
  chainId: number;
  pkpEthAddress: string;
  pkpPublicKey: string;
  spokePoolAddress: string;
  depositor: string;
  recipient: string;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  destinationChainId: number;
  exclusiveRelayer: string;
  quoteTimestamp: number;
  fillDeadline: number;
  exclusivityDeadline: number;
  message?: string;
  gasBufferPercentage?: number;
  baseFeePerGasBufferPercentage?: number;
  alchemyGasSponsor?: boolean;
  alchemyGasSponsorApiKey?: string;
  alchemyGasSponsorPolicyId?: string;
}): Promise<string> {
  console.log('[sendAcrossDepositTx] Building depositV3 transaction');

  // Encode the function call data
  const iface = new ethers.utils.Interface(ACROSS_SPOKE_POOL_ABI);
  const functionArgs = [
    depositor,
    recipient,
    inputToken,
    outputToken,
    inputAmount,
    outputAmount,
    destinationChainId.toString(),
    exclusiveRelayer,
    quoteTimestamp.toString(),
    fillDeadline.toString(),
    exclusivityDeadline.toString(),
    message,
  ];

  let callData = iface.encodeFunctionData('depositV3', functionArgs);

  // Append delimiter (1dc0de) + integrator ID (00a6) to call data
  // Remove 0x prefix from integrator ID for appending
  const integratorIdHex = ACROSS_INTEGRATOR_ID.slice(2); // Remove 0x prefix
  const delimiterWithIntegratorId = `${ACROSS_DELIMITER}${integratorIdHex}`;

  // Ensure callData has 0x prefix
  if (!callData.startsWith('0x')) {
    callData = `0x${callData}`;
  }

  // Append delimiter + integrator ID to call data (NOT to function params)
  callData = `${callData}${delimiterWithIntegratorId}`;

  console.log('[sendAcrossDepositTx] Call data with delimiter:', callData.slice(0, 100) + '...');

  // Use gas sponsorship if enabled and all required parameters are provided
  if (alchemyGasSponsor && alchemyGasSponsorApiKey && alchemyGasSponsorPolicyId) {
    console.log('[sendAcrossDepositTx] Using EIP-7702 gas sponsorship');

    if (!alchemyGasSponsorApiKey || !alchemyGasSponsorPolicyId) {
      throw new Error(
        '[sendAcrossDepositTx] Alchemy gas sponsor is enabled, but API key or policy ID is not provided.',
      );
    }

    try {
      return await sponsoredGasRawTransaction({
        pkpPublicKey,
        to: spokePoolAddress,
        value: '0',
        data: callData,
        chainId,
        eip7702AlchemyApiKey: alchemyGasSponsorApiKey,
        eip7702AlchemyPolicyId: alchemyGasSponsorPolicyId,
      });
    } catch (error) {
      console.error('[sendAcrossDepositTx] EIP-7702 deposit transaction failed:', error);
      throw error;
    }
  }

  // Use regular transaction without gas sponsorship
  console.log('[sendAcrossDepositTx] Estimating gas for Across deposit transaction');

  const populateTxResponse = await Lit.Actions.runOnce(
    { waitForResponse: true, name: '[sendAcrossDepositTx] Across deposit tx gas estimation' },
    async () => {
      try {
        return JSON.stringify({
          status: 'success',
          populatedTransaction: await populateTransaction({
            to: spokePoolAddress,
            from: pkpEthAddress,
            value: '0',
            data: callData,
            rpcUrl,
            chainId,
            gasBufferPercentage,
            baseFeePerGasBufferPercentage,
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
      `[sendAcrossDepositTx] Error populating transaction for deposit: ${parsedPopulateTxResponse.error}`,
    );
  }
  const { populatedTransaction }: { populatedTransaction: UnsignedTransaction } =
    parsedPopulateTxResponse;

  const signedDepositTx = await signTx(pkpPublicKey, populatedTransaction, 'acrossDepositSig');

  console.log('[sendAcrossDepositTx] Broadcasting Across deposit transaction');
  const depositTxResponse = await Lit.Actions.runOnce(
    { waitForResponse: true, name: 'acrossDepositTxSender' },
    async () => {
      try {
        const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl);
        const receipt = await provider.sendTransaction(signedDepositTx);
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

  const parsedDepositTxResponse = JSON.parse(depositTxResponse);
  if (parsedDepositTxResponse.status === 'error') {
    throw new Error(
      `[sendAcrossDepositTx] Error broadcasting Across deposit transaction: ${parsedDepositTxResponse.error}`,
    );
  }
  const { txHash } = parsedDepositTxResponse;
  console.log('[sendAcrossDepositTx] Across deposit transaction broadcasted:', txHash);

  return txHash;
}
