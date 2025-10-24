import type { PsbtInput } from 'bip174/src/lib/interfaces';

import * as bitcoin from 'bitcoinjs-lib';
import { witnessStackToScriptWitness } from 'bitcoinjs-lib/src/psbt/psbtutils';

const network = bitcoin.networks.testnet;
type PublicKey = string | Buffer;
const OPS = bitcoin.script.OPS;

export enum RedeemScriptType {
  PUBLIC_KEY_SCRIPT = 1,
  PUBLIC_KEY_HASH_SCRIPT,
  MULTI_SIG_SCRIPT,
  MULTI_SIG_HASH_SCRIPT,
}

export const Script = {
  //<pubKey> OP_CHECKSIG
  P2PK: ({ pubkey }: { pubkey: PublicKey }) => {
    const { output } = bitcoin.payments.p2pk({
      pubkey: Buffer.from(pubkey.toString('hex'), 'hex'),
      network,
    });
    if (!output) {
      throw new Error('failed to build P2PK script');
    }
    return output;
  },
  //OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
  P2PKH: ({ pubkey }: { pubkey: PublicKey }) => {
    const { output } = bitcoin.payments.p2pkh({
      pubkey: Buffer.from(pubkey.toString('hex'), 'hex'),
      network,
    });

    if (!output) {
      throw new Error('failed to build P2PKH script');
    }
    return output;
  },
  //OP_HASH160 <scriptHash> OP_EQUAL
  P2SH: ({ hash }: { hash: Buffer | string }) => {
    const { output } = bitcoin.payments.p2sh({
      hash: Buffer.from(hash.toString('hex'), 'hex'),
      network,
    });
    if (!output) {
      throw new Error('failed to build P2SH script');
    }
    return output;
  },
  //OP_<M> <pubKey>...<pubKey> OP_<N> OP_CHECKMULTISIG
  P2MS: ({ pubkeys, m = 1, n }: { pubkeys: PublicKey[]; m?: number; n: number }) => {
    const buffers: Buffer[] = [];
    pubkeys.map((pubkey: PublicKey) => buffers.push(Buffer.from(pubkey.toString('hex'), 'hex')));
    const { output } = bitcoin.payments.p2ms({
      pubkeys: buffers,
      m,
      n,
    });
    if (!output) {
      throw new Error('failed to build P2MS script');
    }
    return output;
  },
  P2WPHK: () => {
    // Placeholder for P2WPKH implementation
    throw new Error('P2WPHK not implemented');
  },

  EMBED: (hex: string) => {
    if (!(hex.length > 0)) throw new Error('invalid data in hex');
    const embed = bitcoin.payments.embed({
      data: [Buffer.from(hex, 'hex')],
      network: network,
    });
    if (!embed.output) {
      throw new Error('failed to build EMBED script');
    }
    return embed.output;
  },
};

export type CLTVScriptOptions = {
  lockTime: number;
  pubkeys?: PublicKey[];
  pubkey?: PublicKey;
  m?: number;
  n?: number;
  witness?: boolean;
  network?: bitcoin.Network;
};

export function parseCLTVScript({
  cltvScript,
  witness,
}: {
  cltvScript: string | Buffer;
  witness: boolean;
}): {
  options: CLTVScriptOptions;
  type: RedeemScriptType;
} {
  const unlockScript = Buffer.from(cltvScript.toString('hex'), 'hex');
  const OPS = bitcoin.script.OPS;
  const options: CLTVScriptOptions = {
    lockTime: 0,
    witness,
  };
  let redeemScriptType = RedeemScriptType.PUBLIC_KEY_SCRIPT;

  try {
    const decompiled = bitcoin.script.decompile(unlockScript);
    if (
      decompiled &&
      decompiled.length > 4 &&
      decompiled[1] === OPS.OP_CHECKLOCKTIMEVERIFY &&
      decompiled[2] === OPS.OP_DROP
    ) {
      const firstElement = decompiled[0];
      if (!Buffer.isBuffer(firstElement)) {
        throw new Error('Expected Buffer for lockTime');
      }
      options.lockTime = bitcoin.script.number.decode(firstElement);
      if (decompiled[decompiled.length - 1] === OPS.OP_CHECKMULTISIG && decompiled.length > 5) {
        const n = +decompiled[decompiled.length - 6] - OPS.OP_RESERVED;
        const m = +decompiled[3] - OPS.OP_RESERVED;
        const publicKeys: Buffer[] = decompiled.slice(4, 4 + n) as Buffer[];
        let isValidatePublicKey = true;
        publicKeys.forEach((key: Buffer) => {
          if (key.length !== 33) {
            isValidatePublicKey = false;
          }
        });
        if (m < n && isValidatePublicKey) {
          redeemScriptType = RedeemScriptType.MULTI_SIG_SCRIPT;
          options.n = n;
          options.m = m;
          options.pubkeys = publicKeys;
        }
      } else if (decompiled[decompiled.length - 1] === OPS.OP_CHECKSIG) {
        if (decompiled.length === 5) {
          redeemScriptType = RedeemScriptType.PUBLIC_KEY_SCRIPT;
          options.pubkey = decompiled[3] as Buffer;
        } else if (
          decompiled.length === 8 &&
          decompiled[3] === OPS.OP_DUP &&
          decompiled[4] === OPS.OP_HASH160 &&
          decompiled[6] === OPS.OP_EQUALVERIFY
        ) {
          redeemScriptType = RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT;
        }
      }
    }
    return {
      options,
      type: redeemScriptType,
    };
  } catch (error: unknown) {
    throw new Error(
      `Check MultisigScript: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export const finalCLTVScripts = (
  inputIndex: number,
  input: PsbtInput,
  script: Buffer,
  isSegwit: boolean,
  isP2SH: boolean,
  isP2WSH: boolean,
) => {
  try {
    const { options, type } = parseCLTVScript({
      cltvScript: script,
      witness: isSegwit || isP2WSH,
    });
    console.log(
      `finalCLTVScripts with inputIndex: ${inputIndex}, script: ${script.toString(
        'hex',
      )}, isSegwit: ${isSegwit}, isP2SH: ${isP2SH}, isP2WSH: ${isP2WSH}`,
    );
    console.log(`parseCLTVScript options:`, JSON.stringify(options));
    console.log(`parseCLTVScript type:`, type);
    const isMultisig =
      type === RedeemScriptType.MULTI_SIG_HASH_SCRIPT || type === RedeemScriptType.MULTI_SIG_SCRIPT;
    const { m } = options;

    const sigNumber = input.partialSig?.length ?? 0;

    if (!input.partialSig || !input.partialSig.length) {
      throw new Error(`Tx was not fully signed`);
    }

    if ((isMultisig && m !== undefined && sigNumber !== m) || sigNumber < 1) {
      throw new Error(`Tx using multi-sig should have at least ${m ?? 1} signed`);
    }

    const sigScript: (Buffer | number)[] = [];

    switch (type) {
      case RedeemScriptType.MULTI_SIG_SCRIPT: {
        sigScript.push(OPS.OP_0);
        for (let i = 0; i < sigNumber; i += 1) {
          sigScript.push(input.partialSig[i].signature);
        }
        break;
      }
      case RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT: {
        sigScript.push(input.partialSig[0].signature);
        sigScript.push(input.partialSig[0].pubkey);
        break;
      }
      case RedeemScriptType.PUBLIC_KEY_SCRIPT: {
        sigScript.push(input.partialSig[0].signature);
        break;
      }
      default:
        throw new Error('Failed to create script');
    }

    const paymentParams = {
      redeem: {
        input: bitcoin.script.compile(sigScript),
        output: script,
        network,
      },
      network,
    };
    const payment = isP2WSH
      ? bitcoin.payments.p2wsh(paymentParams)
      : bitcoin.payments.p2sh(paymentParams);

    return {
      finalScriptSig: payment.input,
      finalScriptWitness:
        payment.witness && payment.witness.length > 0
          ? witnessStackToScriptWitness(payment.witness)
          : undefined,
    };
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};
