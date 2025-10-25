import { z } from 'zod';

export const abilityParamsSchema = z.object({
  psbtBase64: z.string().describe('The base64 encoded PSBT to be signed'),
  btcNetwork: z.enum(['testnet', 'livenet']).describe('The Bitcoin network (testnet or livenet)'),
  isRedeemTx: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether this is a redeem transaction for staked Bitcoin (CLTV timelock)'),
  stakingLockTime: z
    .number()
    .optional()
    .describe('The lockTime for staking transactions (Unix timestamp)'),
});

export const precheckSuccessSchema = z.object({
  inputCount: z.number().describe('Number of inputs in the PSBT'),
  outputCount: z.number().describe('Number of outputs in the PSBT'),
  isRedeemTx: z.boolean().describe('Whether this is a redeem transaction'),
  cltvChecksPassed: z
    .boolean()
    .optional()
    .describe('Whether CLTV lock time checks passed (if redeem tx)'),
});

export const precheckFailSchema = z.object({
  error: z.string().describe('A string containing the error message if the precheck failed'),
});

export const executeSuccessSchema = z.object({
  txHash: z
    .string()
    .describe('The Bitcoin transaction hash of the signed and broadcasted transaction'),
  inputCount: z.number().describe('Number of inputs that were signed'),
  outputCount: z.number().describe('Number of outputs in the transaction'),
  btcNetwork: z.string().describe('The Bitcoin network the transaction was broadcasted to'),
});

export const executeFailSchema = z.object({
  error: z.string().describe('A string containing the error message if the execution failed'),
});
