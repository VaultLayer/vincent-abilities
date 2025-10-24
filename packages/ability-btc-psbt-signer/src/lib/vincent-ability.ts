import { bundledVincentPolicy } from '@vaultlayer/vincent-policy-btc-outputs';
import * as bitcoin from 'bitcoinjs-lib';

import {
  createVincentAbility,
  createVincentAbilityPolicy,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';

import {
  getBtcPubkey,
  getBtcSignature,
  pushTx,
  parseCLTVScript,
  finalCLTVScripts,
} from './bitcoin-helpers';
import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
} from './schemas';

declare const Lit: {
  Actions: {
    runOnce: (
      params: { waitForResponse: boolean; name: string },
      callback: () => Promise<unknown>,
    ) => Promise<string>;
  };
};

const BtcOutputsPolicy = createVincentAbilityPolicy({
  abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    psbtBase64: 'psbtBase64',
    btcNetwork: 'btcNetwork',
  },
});

export const vincentAbility = createVincentAbility({
  packageName: '@vaultlayer/vincent-ability-btc-psbt-signer' as const,
  abilityDescription:
    'Sign a Bitcoin PSBT using a Vincent Agent Wallet with PKP-derived Bitcoin keys.' as const,
  abilityParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([BtcOutputsPolicy]),

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail }) => {
    const { psbtBase64, isRedeemTx } = abilityParams;

    try {
      const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
      console.log(
        `[@vaultlayer/vincent-ability-btc-psbt-signer/precheck] PSBT parsed with ${psbt.inputCount} inputs and ${psbt.txOutputs.length} outputs`,
      );

      const cltvChecksPassed = true;

      if (isRedeemTx) {
        const currentUnixTime = Math.floor(Date.now() / 1000);
        for (let i = 0; i < psbt.inputCount; i++) {
          const input = psbt.data.inputs[i];
          const script = input.redeemScript || input.witnessScript;
          if (!script) {
            return fail({
              error: `[@vaultlayer/vincent-ability-btc-psbt-signer/precheck] Missing redeem or witness script for input ${i}`,
            });
          }

          const { options } = parseCLTVScript({
            cltvScript: script,
            witness: !!input.witnessScript,
          });

          if (options.lockTime > currentUnixTime) {
            return fail({
              error: `[@vaultlayer/vincent-ability-btc-psbt-signer/precheck] Input ${i} is timelocked until ${new Date(
                options.lockTime * 1000,
              ).toISOString()}, current time is ${new Date(currentUnixTime * 1000).toISOString()}`,
            });
          }
        }
      }

      return succeed({
        inputCount: psbt.inputCount,
        outputCount: psbt.txOutputs.length,
        isRedeemTx,
        cltvChecksPassed,
      });
    } catch (error) {
      return fail({
        error: `[@vaultlayer/vincent-ability-btc-psbt-signer/precheck] Failed to decode PSBT: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation: { delegatorPkpInfo } }) => {
    const { psbtBase64, btcNetwork, isRedeemTx } = abilityParams;
    const { publicKey } = delegatorPkpInfo;

    try {
      // Derive Bitcoin pubkey from PKP public key
      const btcPubKey = getBtcPubkey(publicKey);

      const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
      console.log(
        `[@vaultlayer/vincent-ability-btc-psbt-signer/execute] PSBT parsed with ${psbt.inputCount} inputs`,
      );

      // Sign each input
      for (let i = 0; i < psbt.inputCount; i++) {
        await psbt.signInputAsync(i, {
          publicKey: btcPubKey,
          sign: async (hash: Buffer): Promise<Buffer> => {
            return await getBtcSignature(publicKey, hash);
          },
        });

        // Finalize the input
        if (isRedeemTx) {
          psbt.finalizeInput(i, finalCLTVScripts);
        } else {
          psbt.finalizeInput(i);
        }
      }

      // Extract transaction
      const txHex = psbt.extractTransaction().toHex();

      // Broadcast transaction with retry logic
      let txId: string | null = null;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          txId = await Lit.Actions.runOnce(
            { waitForResponse: true, name: 'btcTxSender' },
            async () => {
              return await pushTx(txHex, btcNetwork);
            },
          );

          // Validate Bitcoin transaction hash (64 hex characters)
          if (txId && typeof txId === 'string' && /^[a-fA-F0-9]{64}$/.test(txId)) {
            console.log(
              `[@vaultlayer/vincent-ability-btc-psbt-signer/execute] Bitcoin TxId: ${txId}`,
            );
            break;
          } else {
            console.warn(
              `[@vaultlayer/vincent-ability-btc-psbt-signer/execute] Attempt ${attempt}: Invalid txId: ${txId}`,
            );
            if (attempt === maxRetries) {
              throw new Error(`Failed to get valid transaction hash after ${maxRetries} attempts`);
            }
            txId = null;
          }
        } catch (err) {
          console.error(
            `[@vaultlayer/vincent-ability-btc-psbt-signer/execute] Attempt ${attempt} failed:`,
            err,
          );
          if (attempt === maxRetries) {
            throw err;
          }
          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }

      if (!txId) {
        throw new Error('Failed to get valid transaction hash');
      }

      return succeed({
        txHash: txId,
        inputCount: psbt.inputCount,
        outputCount: psbt.txOutputs.length,
        btcNetwork,
      });
    } catch (error) {
      return fail({
        error: `[@vaultlayer/vincent-ability-btc-psbt-signer/execute] Failed to sign and broadcast Bitcoin transaction: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});
