/// <reference lib="dom" />

/**
 * Returns a random RPC endpoint URL for broadcasting Bitcoin transactions
 * based on the specified network.
 */
function getRandomRpcEndpoint(network: 'livenet' | 'testnet'): string {
  const endpoints =
    network === 'livenet'
      ? ['https://mempool.space/api', 'https://blockstream.info/api']
      : ['https://mempool.space/testnet/api', 'https://blockstream.info/testnet/api'];
  // Return a random endpoint from the list.
  return endpoints[Math.floor(Math.random() * endpoints.length)];
}

/**
 * Broadcasts a Bitcoin transaction to a randomly selected free provider.
 *
 * For mempool.space and Blockstream, the API expects the raw transaction hex
 * as a plain text POST body to the /tx endpoint.
 *
 * @param txHex - The raw transaction in hex format.
 * @param network - "livenet" or "testnet" (default "livenet").
 * @returns The transaction ID as a string.
 */
export async function pushTx(
  txHex: string,
  network: 'livenet' | 'testnet' = 'livenet',
): Promise<string> {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const endpoint = getRandomRpcEndpoint(network);
    const url = `${endpoint}/tx`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: txHex,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error broadcasting transaction: ${errorText}`);
      }

      const txId = await response.text();

      // Check if txId is a valid Bitcoin transaction hash (64 character hex string)
      if (/^[a-fA-F0-9]{64}$/.test(txId.trim())) {
        return txId.trim();
      }

      throw new Error(`Invalid endpoint ${endpoint} response: ${txId}`);
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        throw error;
      }
    }
  }

  throw new Error('Failed to broadcast transaction after retries');
}
