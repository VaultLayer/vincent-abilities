import { z } from 'zod';

/**
 * Ability parameters schema - defines the input parameters for the contract call ability
 */
export const abilityParamsSchema = z
  .object({
    contractAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address')
      .describe('The contract address to call'),
    functionAbi: z.string().min(1).describe('The ABI fragment of the contract function'),
    functionName: z.string().min(1).describe('The name of the function to call'),
    functionArgs: z
      .array(z.any())
      .optional()
      .describe('An array of arguments to pass to the function'),
    functionArgsBase64: z
      .string()
      .optional()
      .describe(
        'The base64+hexlify encoded arguments to pass to the function when args are complex tuples',
      ),
    value: z
      .string()
      .optional()
      .describe('The ETH value (in wei) to send with the transaction. Optional.'),
    appendToCallData: z
      .string()
      .optional()
      .describe(
        'Additional hex data to append to the transaction call data (e.g., for tracking identifiers). Must start with an allowed prefix defined in the policy. Optional.',
      ),
    chain: z.string().min(1).describe('The chain name of the blockchain network'),
    chainId: z.number().describe('The chain ID of the blockchain network'),
    rpcUrl: z.string().url().describe('RPC URL used for precheck validations'),
    // Gas sponsorship parameters for EIP-7702
    alchemyGasSponsor: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to use Alchemy's gas sponsorship (EIP-7702)"),
    alchemyGasSponsorApiKey: z
      .string()
      .optional()
      .describe('Alchemy API key for gas sponsorship (required if alchemyGasSponsor is true)'),
    alchemyGasSponsorPolicyId: z
      .string()
      .optional()
      .describe('Alchemy gas policy ID for sponsorship (required if alchemyGasSponsor is true)'),
  })
  .refine((data) => data.functionArgs !== undefined || data.functionArgsBase64 !== undefined, {
    message: 'Either functionArgs or functionArgsBase64 must be provided',
    path: ['functionArgs'],
  });

/**
 * Precheck success result schema
 */
export const precheckSuccessSchema = z.object({
  contractAddressValid: z.boolean().describe('Whether the contract address is valid'),
  functionAbiValid: z.boolean().describe('Whether the function ABI is valid'),
  functionArgsValid: z.boolean().describe('Whether the function arguments are valid'),
  estimatedGas: z.string().describe('Estimated gas cost for the contract call'),
  nativeBalance: z.string().describe('The native token balance of the caller'),
});

/**
 * Precheck failure result schema
 */
export const precheckFailSchema = z.object({
  error: z.string().describe('A string containing the error message if the precheck failed.'),
});

/**
 * Execute success result schema
 */
export const executeSuccessSchema = z.object({
  txHash: z.string().describe('The transaction hash of the executed contract call'),
  contractAddress: z.string().describe('The contract address that was called'),
  functionName: z.string().describe('The function name that was called'),
  value: z.string().optional().describe('The ETH value sent with the transaction'),
  timestamp: z.number().describe('The Unix timestamp when the call was executed'),
});

/**
 * Execute failure result schema
 */
export const executeFailSchema = z.object({
  error: z.string().describe('A string containing the error message if the execution failed.'),
});
