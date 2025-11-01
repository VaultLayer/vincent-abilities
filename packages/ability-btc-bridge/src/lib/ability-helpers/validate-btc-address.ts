/**
 * Validate Bitcoin address format
 */
export function validateBtcAddress(address: string, btcNetwork: 'testnet' | 'livenet'): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  if (btcNetwork === 'livenet') {
    // Mainnet addresses
    return (
      address.startsWith('1') || // P2PKH
      address.startsWith('3') || // P2SH
      (address.startsWith('bc1') && address.length >= 14 && address.length <= 74) // Bech32 (P2WPKH and P2WSH)
    );
  } else {
    // Testnet addresses
    return (
      address.startsWith('m') || // P2PKH
      address.startsWith('n') || // P2PKH
      address.startsWith('2') || // P2SH
      (address.startsWith('tb1') && address.length >= 14 && address.length <= 74) // Bech32 (P2WPKH and P2WSH)
    );
  }
}
