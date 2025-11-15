import { z } from 'zod';

/**
 * Aave operation types
 */
export enum AaveOperation {
  SUPPLY = 'supply',
  BORROW = 'borrow',
  WITHDRAW = 'withdraw',
  REPAY = 'repay',
}

/**
 * Ability parameters schema - defines the input parameters for the Aave ability
 */
export const abilityParamsSchema = z.object({
  operation: z
    .nativeEnum(AaveOperation)
    .describe('The Aave operation to perform (supply, borrow, withdraw, repay)'),
  assetSymbol: z
    .string()
    .describe('The symbol of the asset to interact with (e.g., "USDC", "WETH")'),
  chain: z
    .string()
    .describe(
      'The blockchain network where the Aave pool is deployed (e.g., "ethereum", "arbitrum", "base")',
    ),
  amount: z
    .string()
    .regex(/^\d+$/, 'Invalid amount format')
    .describe(
      'The amount of tokens to supply/borrow/withdraw/repay, as a string without decimal point. Ex: 2123456 for 2.123456 USDC (6 decimals)',
    ),
  rateMode: z
    .number()
    .int()
    .min(1)
    .max(2)
    .optional()
    .describe('Interest rate mode: 1 for stable, 2 for variable (default: 2 for borrow/repay)'),
  rpcUrl: z.string().optional().describe('RPC URL used for precheck validations'),
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
  operationValid: z.boolean().describe('Whether the requested operation is valid'),
  assetValid: z.boolean().describe('Whether the specified asset symbol is valid for the chain'),
  poolValid: z.boolean().describe('Whether the Aave pool address is valid'),
  amountValid: z.boolean().describe('Whether the specified amount is valid'),
  userBalance: z
    .string()
    .optional()
    .describe(
      "The user's current balance of the underlying asset without decimal point. Ex: 2123456 for 2.123456 USDC (6 decimals)",
    ),
  allowance: z
    .string()
    .optional()
    .describe(
      'The current allowance approved for the pool contract without decimal point. Ex: 2123456 for 2.123456 USDC (6 decimals)',
    ),
  suppliedBalance: z
    .string()
    .optional()
    .describe("The user's current supplied balance in Aave (aToken balance)"),
  borrowedBalance: z.string().optional().describe("The user's current borrowed balance in Aave"),
  estimatedGas: z.string().describe('Estimated gas cost for the operation in wei'),
  poolAddress: z.string().describe('The Aave pool contract address'),
  assetAddress: z.string().describe('The underlying asset contract address'),
  assetDecimals: z.number().describe('The number of decimals for the asset'),
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
  txHash: z.string().describe('The transaction or user op hash of the executed operation'),
  operation: z.nativeEnum(AaveOperation).describe('The Aave operation that was executed'),
  assetSymbol: z.string().describe('The symbol of the asset involved'),
  amount: z
    .string()
    .describe(
      'The amount of tokens involved in the operation without decimal point. Ex: 2123456 for 2.123456 USDC (6 decimals)',
    ),
  chain: z.string().describe('The chain where the operation was executed'),
  poolAddress: z.string().describe('The Aave pool contract address'),
  assetAddress: z.string().describe('The underlying asset contract address'),
  approvalTxHash: z
    .string()
    .optional()
    .describe('Transaction hash for approval transaction if one was needed'),
});

/**
 * Execute failure result schema
 */
export const executeFailSchema = z.object({
  error: z.string().describe('A string containing the error message if the execution failed.'),
});
