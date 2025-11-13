import * as bitcoin from 'bitcoinjs-lib';

import { getBtcPubkey } from './get-btc-pubkey';

/**
 * Derives a Bitcoin address (P2WPKH) from a PKP public key.
 *
 * @param pkpPublicKey - The PKP's Ethereum public key as a hex string (expected length: 132 characters, including '0x').
 * @param network - The Bitcoin network ('testnet' or 'livenet').
 * @returns The derived Bitcoin address as a string.
 * @throws Error if the input key is invalid or address derivation fails.
 */
export function getBtcAddress(pkpPublicKey: string, network: 'testnet' | 'livenet'): string {
  const btcPubKey = getBtcPubkey(pkpPublicKey);
  const btcNetworkObj = network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: btcPubKey,
    network: btcNetworkObj,
  });

  if (!address) {
    throw new Error('Unable to derive Bitcoin address from PKP public key');
  }

  return address;
}
