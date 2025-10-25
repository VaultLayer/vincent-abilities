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
 * Redeem script types for CLTV parsing
 */
enum RedeemScriptType {
  PUBLIC_KEY_SCRIPT = 1,
  PUBLIC_KEY_HASH_SCRIPT,
  MULTI_SIG_SCRIPT,
  MULTI_SIG_HASH_SCRIPT,
}

/**
 * CLTV script options
 */
type CLTVScriptOptions = {
  lockTime: number;
  pubkeys?: string | Buffer[];
  pubkey?: string | Buffer;
  m?: number;
  n?: number;
  witness?: boolean;
  network?: bitcoin.Network;
};

/**
 * Check if a script is an OP_RETURN script
 */
function isOPReturnScript(script: Buffer): boolean {
  return script.length > 0 && script[0] === bitcoin.script.OPS.OP_RETURN;
}

/**
 * Validate if a transaction is a valid staking transaction
 */
function isValidStakingTransaction(
  psbt: bitcoin.Psbt,
  btcNetworkObj: bitcoin.Network,
  pkpBtcAddress: string,
  btcPubKey: Buffer,
  stakingLockTime: number,
): { isValid: boolean; reason?: string; lockTime?: number } {
  const txOutputs = psbt.txOutputs;

  // Check if we have exactly 2 or 3 outputs
  if (txOutputs.length < 2 || txOutputs.length > 3) {
    return { isValid: false, reason: 'Staking transaction must have 2 or 3 outputs' };
  }

  // Check output 0: CLTV timelock script
  const firstOutput = txOutputs[0];
  const firstOutputAddress = bitcoin.address.fromOutputScript(firstOutput.script, btcNetworkObj);

  // Check if it's a P2SH or P2WSH address (wrapping CLTV script)
  const isP2SH = firstOutputAddress.startsWith('3') || firstOutputAddress.startsWith('2');
  const isP2WSH = firstOutputAddress.startsWith('bc1') && firstOutputAddress.length === 62;

  if (!isP2SH && !isP2WSH) {
    return {
      isValid: false,
      reason: 'First output must be a P2SH or P2WSH address (CLTV timelock)',
    };
  }

  // For staking transactions, we need to validate that the first output address
  // can be created from a CLTV script with the PKP's public key and a future lockTime
  // We'll try to create the expected CLTV script and see if it matches the output address

  let expectedCLTVScript: Buffer;
  let isWitness = false;

  // Build CLTV script: lockTime OP_CHECKLOCKTIMEVERIFY OP_DROP <pubkey> OP_CHECKSIG
  // Use the actual stakingLockTime provided by the user

  // Validate that the lockTime is in the future
  const currentTime = Math.floor(Date.now() / 1000);
  if (stakingLockTime <= currentTime) {
    return {
      isValid: false,
      reason: `Staking lockTime ${stakingLockTime} must be in the future (current: ${currentTime})`,
    };
  }

  // Try P2PK CLTV script first (most common for staking)
  try {
    const cltvScript = Buffer.concat([
      bitcoin.script.compile([
        bitcoin.script.number.encode(stakingLockTime),
        bitcoin.script.OPS.OP_CHECKLOCKTIMEVERIFY,
        bitcoin.script.OPS.OP_DROP,
      ]),
      bitcoin.script.compile([btcPubKey, bitcoin.script.OPS.OP_CHECKSIG]),
    ]);

    // Try P2SH wrapping
    const p2shPayment = bitcoin.payments.p2sh({
      redeem: { output: cltvScript },
      network: btcNetworkObj,
    });

    if (p2shPayment.address === firstOutputAddress) {
      expectedCLTVScript = cltvScript;
      isWitness = false;
    } else {
      // Try P2WSH wrapping
      const p2wshPayment = bitcoin.payments.p2wsh({
        redeem: { output: cltvScript },
        network: btcNetworkObj,
      });

      if (p2wshPayment.address === firstOutputAddress) {
        expectedCLTVScript = cltvScript;
        isWitness = true;
      } else {
        return {
          isValid: false,
          reason: 'First output address does not match expected CLTV script with PKP public key',
        };
      }
    }

    // Since we successfully matched the address with our expected CLTV script,
    // we know it contains the PKP's public key and uses a future lockTime
    // The validation above confirms:
    // 1. The first output address can be created from a CLTV script with the PKP's public key
    // 2. The script structure is correct (P2PK CLTV script)
    // 3. The lockTime used in validation is in the future

    // Check output 1: OP_RETURN script with value 0
    const secondOutput = txOutputs[1];
    if (secondOutput.value !== 0) {
      return { isValid: false, reason: 'Second output (OP_RETURN) must have value 0' };
    }

    if (!isOPReturnScript(secondOutput.script)) {
      return { isValid: false, reason: 'Second output must be an OP_RETURN script' };
    }

    // Check output 2 (if exists): Must be to pkpBtcAddress
    if (txOutputs.length === 3) {
      const thirdOutput = txOutputs[2];
      const thirdOutputAddress = bitcoin.address.fromOutputScript(
        thirdOutput.script,
        btcNetworkObj,
      );
      if (thirdOutputAddress !== pkpBtcAddress) {
        return {
          isValid: false,
          reason: `Third output (change) must go to PKP Bitcoin address: ${pkpBtcAddress}`,
        };
      }
    }

    return { isValid: true, lockTime: stakingLockTime };
  } catch (error) {
    return {
      isValid: false,
      reason: `Failed to validate CLTV script: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

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
      const { psbtBase64, btcNetwork, stakingLockTime } = abilityParams;
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

      // First check if this is a staking transaction (only if stakingLockTime is provided)
      let stakingValidation = { isValid: false };
      if (stakingLockTime !== undefined) {
        stakingValidation = isValidStakingTransaction(
          psbt,
          btcNetworkObj,
          pkpBtcAddress,
          btcPubKey,
          stakingLockTime,
        );
      }

      if (stakingValidation.isValid) {
        // This is a valid staking transaction, allow it
        return allow({
          outputCount: txOutputs.length,
          allowedOutputs: [pkpBtcAddress], // For staking, we only allow the PKP address
          pkpBtcAddress,
        });
      }

      // If not a staking transaction, fall back to regular output validation
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
      const { psbtBase64, btcNetwork, stakingLockTime } = abilityParams;
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

      // First check if this is a staking transaction (only if stakingLockTime is provided)
      let stakingValidation = { isValid: false };
      if (stakingLockTime !== undefined) {
        stakingValidation = isValidStakingTransaction(
          psbt,
          btcNetworkObj,
          pkpBtcAddress,
          btcPubKey,
          stakingLockTime,
        );
      }

      if (stakingValidation.isValid) {
        // This is a valid staking transaction, allow it
        return allow({
          outputCount: txOutputs.length,
          allowedOutputs: [pkpBtcAddress], // For staking, we only allow the PKP address
          pkpBtcAddress,
        });
      }

      // If not a staking transaction, fall back to regular output validation
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
