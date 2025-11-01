import { z } from 'zod';

export const abilityParamsSchema = z.object({
  action: z
    .enum(['approve', 'swap'])
    .describe('Dictates whether to perform an ERC20 approval or a swap on Molten DEX'),
  tokenIn: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address')
    .describe('Input token address'),
  tokenOut: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address')
    .describe('Output token address'),
  recipient: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address')
    .describe('Recipient address for the swap'),
  amountIn: z.string().describe('Input amount as decimal string'),
  amountOutMinimum: z
    .string()
    .optional()
    .default('0')
    .describe('Minimum output amount as decimal string (defaults to 0)'),
  rpcUrl: z.string().url().optional().describe('RPC URL (defaults to CoreDAO RPC if not provided)'),
});

export const precheckSuccessSchema = z.object({
  nativeTokenBalance: z
    .string()
    .describe('The balance of the native token used for gas fees')
    .optional(),
  tokenInAddress: z
    .string()
    .describe('The address of the input token used for the swap')
    .optional(),
  tokenInBalance: z
    .string()
    .describe('The balance of the input token used for the swap')
    .optional(),
  currentTokenInAllowanceForSpender: z
    .string()
    .describe('The current allowance of the input token used for the swap'),
  spenderAddress: z.string().describe('The Molten router address that will be used for the swap'),
  requiredTokenInAllowance: z
    .string()
    .describe('The required allowance of the input token for the swap for the ERC20 spender')
    .optional(),
});

export const precheckFailSchema = z.object({
  reason: z.string().describe('The reason the precheck failed'),
  spenderAddress: z
    .string()
    .describe('The Molten router address that will be used to spend the ERC20 token')
    .optional(),
  tokenAddress: z.string().describe('The address of the input token for the swap').optional(),
  requiredTokenAmount: z
    .string()
    .describe('The required amount of the input token for the swap')
    .optional(),
  tokenBalance: z.string().describe('The balance of the input token used for the swap').optional(),
  currentAllowance: z
    .string()
    .describe('The current allowance of the input token used for the swap for the ERC20 spender')
    .optional(),
  requiredAllowance: z
    .string()
    .describe('The required allowance of the input token used for the swap for the ERC20 spender')
    .optional(),
});

export const executeFailSchema = z.object({
  reason: z.string().optional().describe('The reason the execution failed'),
});

export const executeSuccessSchema = z.object({
  swapTxHash: z.string().describe('The hash of the swapping transaction on Molten').optional(),
  approvalTxHash: z
    .string()
    .optional()
    .describe(
      'Transaction hash if a new approval was created, undefined if existing approval was used',
    ),
  currentAllowance: z
    .string()
    .describe('The current allowance of the input token used for the swap for the ERC20 spender')
    .optional(),
  requiredAllowance: z
    .string()
    .describe('The required allowance of the input token used for the swap for the ERC20 spender')
    .optional(),
});
