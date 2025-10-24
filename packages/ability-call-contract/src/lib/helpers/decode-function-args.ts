import { ethers } from 'ethers';

/**
 * Decodes base64+hexlify encoded function arguments
 * This is needed for complex tuples that can't be easily passed as JSON arrays
 *
 * @param functionArgsBase64 - The base64+hexlify encoded function arguments
 * @returns Decoded function arguments array
 */
export function decodeFunctionArgsBase64(functionArgsBase64: string): unknown[] {
  try {
    // Convert hexlified string back to UTF-8 bytes
    const utf8Bytes = ethers.utils.arrayify(functionArgsBase64);
    const b64 = ethers.utils.toUtf8String(utf8Bytes);

    // Decode base64 to JSON string
    const json = Buffer.from(b64, 'base64').toString('utf8');

    // Parse JSON, converting numeric strings back to BigInt where appropriate
    const parsed = JSON.parse(json, (_key, value) => {
      if (typeof value === 'string' && /^-?\d+$/.test(value)) {
        // string of digits, treat as BigInt
        try {
          return BigInt(value);
        } catch {
          return value;
        }
      }
      return value;
    });

    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to decode functionArgsBase64: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Encodes function arguments to base64+hexlify format
 * This is useful for testing or converting complex arguments
 *
 * @param functionArgs - The function arguments to encode
 * @returns Base64+hexlify encoded function arguments
 */
export function encodeFunctionArgsBase64(functionArgs: unknown): string {
  // Convert any BigInt → string
  const json = JSON.stringify(functionArgs, (_key, val) =>
    typeof val === 'bigint' ? val.toString() : val,
  );

  const b64 = Buffer.from(json, 'utf8').toString('base64');
  const utf8Bytes = ethers.utils.toUtf8Bytes(b64);
  return ethers.utils.hexlify(utf8Bytes);
}
