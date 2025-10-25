import { z } from 'zod';

export const abilityParamsSchema = z.object({
  psbtBase64: z.string().describe('The base64 encoded PSBT to be evaluated'),
  btcNetwork: z.enum(['testnet', 'livenet']).describe('The Bitcoin network (testnet or livenet)'),
  stakingLockTime: z
    .number()
    .optional()
    .describe('The lockTime for staking transactions (Unix timestamp)'),
});

export const userParamsSchema = z.object({
  allowedOutputs: z.array(z.string()).describe('Array of allowed Bitcoin output addresses'),
});

export const precheckAllowResultSchema = z.object({
  outputCount: z.number().describe('Number of outputs in the PSBT'),
  allowedOutputs: z.array(z.string()).describe('List of allowed output addresses'),
  pkpBtcAddress: z.string().describe('The PKP derived Bitcoin address'),
});

export const precheckDenyResultSchema = z.object({
  reason: z.string().describe('The reason for denying the precheck'),
  outputCount: z.number().optional().describe('Number of outputs in the PSBT'),
  disallowedOutputs: z.array(z.string()).optional().describe('List of disallowed output addresses'),
  pkpBtcAddress: z.string().optional().describe('The PKP derived Bitcoin address'),
});

export const evalAllowResultSchema = z.object({
  outputCount: z.number().describe('Number of outputs in the PSBT'),
  allowedOutputs: z.array(z.string()).describe('List of allowed output addresses'),
  pkpBtcAddress: z.string().describe('The PKP derived Bitcoin address'),
});

export const evalDenyResultSchema = z.object({
  reason: z.string().describe('The reason for denying the evaluation'),
  outputCount: z.number().optional().describe('Number of outputs in the PSBT'),
  disallowedOutputs: z.array(z.string()).optional().describe('List of disallowed output addresses'),
  pkpBtcAddress: z.string().optional().describe('The PKP derived Bitcoin address'),
});
