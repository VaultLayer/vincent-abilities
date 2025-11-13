import { z } from 'zod';

export const abilityParamsSchema = z.object({
  to: z
    .string()
    .min(1, 'Recipient address cannot be empty')
    .describe("The recipient's Ethereum address the underlying ability will send to."),
});

export const userParamsSchema = z.object({
  allowedRecipients: z.array(z.string()).describe('Array of allowed EVM recipient addresses'),
});

export const precheckAllowResultSchema = z.object({
  recipient: z.string().describe('The validated recipient address'),
  allowedRecipients: z.array(z.string()).describe('List of allowed recipient addresses'),
  delegatorEthAddress: z.string().describe('The delegator PKP Ethereum address'),
});

export const precheckDenyResultSchema = z.object({
  reason: z.string().describe('The reason for denying the precheck'),
  recipient: z.string().optional().describe('The recipient address that was rejected'),
  allowedRecipients: z.array(z.string()).optional().describe('List of allowed recipient addresses'),
  delegatorEthAddress: z.string().optional().describe('The delegator PKP Ethereum address'),
});

export const evalAllowResultSchema = z.object({
  recipient: z.string().describe('The validated recipient address'),
  allowedRecipients: z.array(z.string()).describe('List of allowed recipient addresses'),
  delegatorEthAddress: z.string().describe('The delegator PKP Ethereum address'),
});

export const evalDenyResultSchema = z.object({
  reason: z.string().describe('The reason for denying the evaluation'),
  recipient: z.string().optional().describe('The recipient address that was rejected'),
  allowedRecipients: z.array(z.string()).optional().describe('List of allowed recipient addresses'),
  delegatorEthAddress: z.string().optional().describe('The delegator PKP Ethereum address'),
});
