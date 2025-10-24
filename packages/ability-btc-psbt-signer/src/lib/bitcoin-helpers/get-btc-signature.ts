declare const Lit: {
  Actions: {
    signAndCombineEcdsa: (params: {
      toSign: Buffer;
      publicKey: string;
      sigName: string;
    }) => Promise<string>;
  };
};

function stripPrefix(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const isCompressedPrefix =
    clean.length === 66 && (clean.startsWith('02') || clean.startsWith('03'));
  return isCompressedPrefix ? clean.slice(2) : clean;
}

/**
 * Signs the PSBT using the PKP's public key.
 * @param pkpPublicKey - The PKP's public key.
 * @param hash - The hash to sign.
 * @returns The signature as a Buffer.
 */
export const getBtcSignature = async (pkpPublicKey: string, hash: Buffer): Promise<Buffer> => {
  const pkForLit = pkpPublicKey.startsWith('0x') ? pkpPublicKey.slice(2) : pkpPublicKey;
  console.log(`getBtcSignature with hash:`, hash.toString('hex'));

  // Get the signature as a JSON string.
  const sigStr = await Lit.Actions.signAndCombineEcdsa({
    toSign: hash,
    publicKey: pkForLit,
    sigName: `btcSig-${hash.toString('hex').slice(3)}`,
  });
  // Parse the JSON signature.
  let parsedSig: { r: string; s: string; v?: number };
  try {
    parsedSig = JSON.parse(sigStr);
  } catch (e) {
    console.error('Error parsing signature JSON:', e);
    throw e;
  }
  //console.log(`Signature: ${sigStr}`);
  const signatureBuf = Buffer.from(stripPrefix(parsedSig.r) + stripPrefix(parsedSig.s), 'hex');
  return signatureBuf;
};
