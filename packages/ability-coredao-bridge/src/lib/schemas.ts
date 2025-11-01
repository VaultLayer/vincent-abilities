import { z } from 'zod';

export const abilityParamsSchema = z.object({
  sourceChain: z
    .enum(['base', 'arbitrum', 'ethereum', 'coreDao'])
    .describe('Source chain for the bridge operation'),
  destinationChain: z
    .enum(['base', 'arbitrum', 'ethereum', 'coreDao'])
    .describe('Destination chain for the bridge operation'),
  amount: z.string().describe('Amount of USDC to bridge as decimal string'),
  rpcUrl: z
    .string()
    .url()
    .optional()
    .describe('RPC URL for the source chain (optional, will use default if not provided)'),
  alchemyGasSponsor: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether to use Alchemy's gas sponsorship (EIP-7702) - only supported on Base, Arbitrum, and Ethereum, NOT on CoreDAO",
    ),
  alchemyGasSponsorApiKey: z
    .string()
    .optional()
    .describe('Alchemy API key for gas sponsorship (required if alchemyGasSponsor is true)'),
  alchemyGasSponsorPolicyId: z
    .string()
    .optional()
    .describe('Alchemy gas policy ID for sponsorship (required if alchemyGasSponsor is true)'),
});

export const precheckSuccessSchema = z.object({
  nativeTokenBalance: z
    .string()
    .optional()
    .describe('The balance of the native token used for gas fees'),
  usdcBalance: z.string().describe('The balance of USDC token'),
  currentAllowance: z.string().describe('The current allowance of USDC for the bridge contract'),
  requiredAllowance: z.string().describe('The required allowance of USDC for the bridge contract'),
  bridgeAddress: z.string().describe('The bridge contract address that will be used'),
  estimatedFees: z.string().optional().describe('Estimated LayerZero v1 fees in native token'),
  bridgeType: z
    .enum(['original', 'wrapped'])
    .describe('Type of bridge to use (original for to CoreDAO, wrapped for from CoreDAO)'),
});

export const precheckFailSchema = z.object({
  reason: z.string().describe('The reason the precheck failed'),
  bridgeAddress: z.string().optional().describe('The bridge contract address that will be used'),
  tokenAddress: z.string().optional().describe('The address of the USDC token'),
  requiredTokenAmount: z.string().optional().describe('The required amount of USDC for the bridge'),
  tokenBalance: z.string().optional().describe('The balance of USDC token'),
  currentAllowance: z
    .string()
    .optional()
    .describe('The current allowance of USDC for the bridge contract'),
  requiredAllowance: z
    .string()
    .optional()
    .describe('The required allowance of USDC for the bridge contract'),
});

export const executeSuccessSchema = z.object({
  bridgeTxHash: z.string().describe('The hash of the bridging transaction'),
  approvalTxHash: z
    .string()
    .optional()
    .describe(
      'Transaction hash if a new approval was created, undefined if existing approval was used',
    ),
  sourceChain: z.string().describe('Source chain of the bridge'),
  destinationChain: z.string().describe('Destination chain of the bridge'),
  amount: z.string().describe('Amount bridged'),
  bridgeType: z.enum(['original', 'wrapped']).describe('Type of bridge used'),
});

export const executeFailSchema = z.object({
  reason: z.string().describe('The reason the execution failed'),
  errorCode: z.string().optional().describe('Optional error code'),
});
