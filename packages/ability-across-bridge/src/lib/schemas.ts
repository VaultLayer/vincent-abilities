import { z } from 'zod';

export const abilityParamsSchema = z.object({
  action: z
    .enum(['approve', 'bridge'])
    .describe(
      'Dictates whether to perform an ERC20 approval or a bridge operation using Across Protocol',
    ),
  sourceChain: z
    .enum(['base', 'arbitrum', 'ethereum'])
    .describe('Source chain for the bridge operation'),
  destinationChain: z
    .enum(['base', 'arbitrum', 'ethereum'])
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

export const precheckSuccessSchema = z.object({
  nativeTokenBalance: z
    .string()
    .optional()
    .describe('The balance of the native token used for gas fees'),
  usdcBalance: z.string().describe('The balance of USDC token'),
  currentAllowance: z.string().describe('The current allowance of USDC for the SpokePool'),
  requiredAllowance: z.string().describe('The required allowance of USDC for the SpokePool'),
  spokePoolAddress: z
    .string()
    .describe('The SpokePool contract address that will be used for the bridge'),
  estimatedOutputAmount: z.string().optional().describe('Estimated output amount after fees'),
});

export const precheckFailSchema = z.object({
  reason: z.string().describe('The reason the precheck failed'),
  spokePoolAddress: z
    .string()
    .optional()
    .describe('The SpokePool contract address that will be used for the bridge'),
  tokenAddress: z.string().optional().describe('The address of the USDC token'),
  requiredTokenAmount: z.string().optional().describe('The required amount of USDC for the bridge'),
  tokenBalance: z.string().optional().describe('The balance of USDC token'),
  currentAllowance: z
    .string()
    .optional()
    .describe('The current allowance of USDC for the SpokePool'),
  requiredAllowance: z
    .string()
    .optional()
    .describe('The required allowance of USDC for the SpokePool'),
});

export const executeSuccessSchema = z.object({
  bridgeTxHash: z.string().optional().describe('The hash of the bridging transaction'),
  bridgeTxUserOperationHash: z
    .string()
    .optional()
    .describe('The hash of the user operation that was executed (if gas sponsored)'),
  approvalTxHash: z
    .string()
    .optional()
    .describe(
      'Transaction hash if a new approval was created, undefined if existing approval was used',
    ),
  approvalTxUserOperationHash: z
    .string()
    .optional()
    .describe('The hash of the approval user operation (if gas sponsored)'),
  sourceChain: z.string().optional().describe('Source chain of the bridge'),
  destinationChain: z.string().optional().describe('Destination chain of the bridge'),
  amount: z.string().optional().describe('Amount bridged'),
  estimatedOutputAmount: z.string().optional().describe('Estimated output amount after fees'),
  currentAllowance: z
    .string()
    .optional()
    .describe('The current allowance of USDC for the SpokePool (when action is approve)'),
  requiredAllowance: z
    .string()
    .optional()
    .describe('The required allowance of USDC for the SpokePool (when action is approve)'),
});

export const executeFailSchema = z.object({
  reason: z.string().optional().describe('The reason the execution failed'),
  errorCode: z.string().optional().describe('Optional error code'),
});
