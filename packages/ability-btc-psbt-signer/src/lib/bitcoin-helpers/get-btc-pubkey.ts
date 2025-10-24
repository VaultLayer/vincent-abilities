import { ProjectivePoint } from '@noble/secp256k1';

/**
 * Compresses an Ethereum public key if it's in uncompressed format.
 *
 * @param ethPubKey - The Ethereum public key as a hex string (expected length: 132 characters, including '0x').
 * @returns The compressed public key as a Buffer.
 * @throws Error if the input key is invalid or in an unsupported format.
 */
export function getBtcPubkey(ethPubKey: string): Buffer {
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
