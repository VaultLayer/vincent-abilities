import { ProjectivePoint } from '@noble/secp256k1';
import * as bitcoin from 'bitcoinjs-lib';

import { createVincentPolicy } from '@lit-protocol/vincent-ability-sdk';

import {
  evalAllowResultSchema,
  evalDenyResultSchema,
  precheckAllowResultSchema,
  precheckDenyResultSchema,
  abilityParamsSchema,
  userParamsSchema,
} from './schemas';

/**
 * Compresses an Ethereum public key if it's in uncompressed format.
 */
function getBtcPubkey(ethPubKey: string): Buffer {
  // Check for uncompressed Ethereum public key (0x + 130 hex characters = 132 characters)
  if (ethPubKey.length === 132) {
    if (!ethPubKey.startsWith('0x')) {
      throw new Error('Invalid Ethereum public key');
    }
    // Remove the "0x" prefix and parse the hex to a Point
    const hexKey = ethPubKey.slice(2);
    const point = ProjectivePoint.fromHex(hexKey);
    // Return the compressed representation (33 bytes)
    const compressedPoint = point.toRawBytes(true);
    return Buffer.from(compressedPoint);
  }

  throw new Error('Unsupported public key format for compression');
}

export const vincentPolicy = createVincentPolicy({
  packageName: '@vaultlayer/vincent-policy-btc-outputs' as const,

  abilityParamsSchema,
  userParamsSchema,

  precheckAllowResultSchema,
  precheckDenyResultSchema,

  evalAllowResultSchema,
  evalDenyResultSchema,

  precheck: async (
    { abilityParams, userParams },
    { allow, deny, delegation: { delegatorPkpInfo } },
  ) => {
    try {
      const { psbtBase64, btcNetwork } = abilityParams;
      const { allowedOutputs } = userParams;

      // Derive PKP Bitcoin address
      const btcPubKey = getBtcPubkey(delegatorPkpInfo.publicKey);
      const btcNetworkObj =
        btcNetwork === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
      const { address: pkpBtcAddress } = bitcoin.payments.p2wpkh({
        pubkey: btcPubKey,
        network: btcNetworkObj,
      });

      if (!pkpBtcAddress) {
        return deny({
          reason: 'Unable to derive Bitcoin address from PKP public key',
        });
      }

      // Parse PSBT
      const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
      const txOutputs = psbt.txOutputs;

      // Ensure that at least the derived pkpBtcAddress is allowed
      let finalAllowedOutputs = allowedOutputs;
      if (allowedOutputs.length === 0) {
        finalAllowedOutputs = [pkpBtcAddress];
      } else if (!allowedOutputs.includes(pkpBtcAddress)) {
        finalAllowedOutputs = allowedOutputs.concat(pkpBtcAddress);
      }

      // Check all outputs to ensure they are allowed
      const disallowedOutputs: string[] = [];
      txOutputs.forEach((output) => {
        const derivedAddress = bitcoin.address.fromOutputScript(output.script, btcNetworkObj);
        if (!finalAllowedOutputs.includes(derivedAddress)) {
          disallowedOutputs.push(derivedAddress);
        }
      });

      if (disallowedOutputs.length > 0) {
        return deny({
          reason: `Output addresses not on the allowed list: ${disallowedOutputs.join(', ')}`,
          outputCount: txOutputs.length,
          disallowedOutputs,
          pkpBtcAddress,
        });
      }

      return allow({
        outputCount: txOutputs.length,
        allowedOutputs: finalAllowedOutputs,
        pkpBtcAddress,
      });
    } catch (error) {
      console.error('Policy precheck error:', error);
      return deny({
        reason: error instanceof Error ? error.message : 'Unknown error during precheck',
      });
    }
  },

  evaluate: async (
    { abilityParams, userParams },
    { allow, deny, delegation: { delegatorPkpInfo } },
  ) => {
    try {
      const { psbtBase64, btcNetwork } = abilityParams;
      const { allowedOutputs } = userParams;

      // Derive PKP Bitcoin address
      const btcPubKey = getBtcPubkey(delegatorPkpInfo.publicKey);
      const btcNetworkObj =
        btcNetwork === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
      const { address: pkpBtcAddress } = bitcoin.payments.p2wpkh({
        pubkey: btcPubKey,
        network: btcNetworkObj,
      });

      if (!pkpBtcAddress) {
        return deny({
          reason: 'Unable to derive Bitcoin address from PKP public key',
        });
      }

      // Parse PSBT
      const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
      const txOutputs = psbt.txOutputs;

      // Ensure that at least the derived pkpBtcAddress is allowed
      let finalAllowedOutputs = allowedOutputs;
      if (allowedOutputs.length === 0) {
        finalAllowedOutputs = [pkpBtcAddress];
      } else if (!allowedOutputs.includes(pkpBtcAddress)) {
        finalAllowedOutputs = allowedOutputs.concat(pkpBtcAddress);
      }

      // Check all outputs to ensure they are allowed
      const disallowedOutputs: string[] = [];
      txOutputs.forEach((output) => {
        const derivedAddress = bitcoin.address.fromOutputScript(output.script, btcNetworkObj);
        if (!finalAllowedOutputs.includes(derivedAddress)) {
          disallowedOutputs.push(derivedAddress);
        }
      });

      if (disallowedOutputs.length > 0) {
        return deny({
          reason: `Output addresses not on the allowed list: ${disallowedOutputs.join(', ')}`,
          outputCount: txOutputs.length,
          disallowedOutputs,
          pkpBtcAddress,
        });
      }

      return allow({
        outputCount: txOutputs.length,
        allowedOutputs: finalAllowedOutputs,
        pkpBtcAddress,
      });
    } catch (error) {
      console.error('Policy evaluation error:', error);
      return deny({
        reason: error instanceof Error ? error.message : 'Unknown error during evaluation',
      });
    }
  },
});
