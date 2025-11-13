import { z } from 'zod';

/**
 * Ability parameters schema - defines the input parameters for unified EVM send ability
 */
export const abilityParamsSchema = z.object({
  to: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
    .describe("The recipient's Ethereum address. On 0x123... format"),
  amount: z
    .string()
    .regex(/^\d*\.?\d+$/, 'Invalid amount format')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0')
    .describe('The amount to transfer, as a string (supports decimals. Example: 1.23)'),
  tokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token contract address')
    .optional()
    .describe(
      'The ERC-20 token contract address to transfer. If missing or zero address, performs native ETH transfer',
    ),
  chain: z.string().describe('The blockchain network (e.g., base, ethereum)'),
  rpcUrl: z.string().describe('RPC URL used for precheck validations'),
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
});

/**
 * Precheck success result schema
 */
export const precheckSuccessSchema = z.object({
  addressValid: z.boolean().describe('Whether the recipient address is valid'),
  amountValid: z.boolean().describe('Whether the specified amount is valid'),
  estimatedGas: z.string().describe('Estimated gas cost for the transfer'),
  userBalance: z.string().describe('The user balance'),
  isNative: z.boolean().describe('Whether this is a native ETH transfer'),
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
  txHash: z.string().describe('The transaction hash of the executed transfer'),
  to: z.string().describe('The recipient address of the transfer'),
  amount: z.string().describe('The amount transferred'),
  tokenAddress: z
    .string()
    .optional()
    .describe('The ERC-20 token contract address used for the transfer (if applicable)'),
  timestamp: z.number().describe('The Unix timestamp when the transfer was executed'),
  isNative: z.boolean().describe('Whether this was a native ETH transfer'),
});

/**
 * Execute failure result schema
 */
export const executeFailSchema = z.object({
  error: z.string().describe('A string containing the error message if the execution failed.'),
});
