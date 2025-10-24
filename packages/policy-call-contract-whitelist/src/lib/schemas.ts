import { ethers } from 'ethers';
import { z } from 'zod';

/**
 * Ability parameters schema - defines what the ability sends to the policy
 */
export const abilityParamsSchema = z.object({
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
      'The base64+hexlify encoded arguments to pass to the function when args complex tuples',
    ),
  value: z.string().optional().describe('The ETH value (in wei) to send with the transaction'),
  appendToCallData: z
    .string()
    .optional()
    .describe(
      'Additional hex data to append to the transaction call data (e.g., for tracking identifiers). Must start with an allowed prefix defined in the policy',
    ),
  chain: z.string().min(1).describe('The chain name of the blockchain network'),
  chainId: z.number().describe('The chain ID of the blockchain network'),
});

/**
 * User parameters schema - defines the policy configuration set by the user
 */
export const userParamsSchema = z.object({
  vlCallContractMaxValue: z
    .string()
    .refine(
      (val) => {
        try {
          const bn = ethers.BigNumber.from(val);
          return !bn.isNegative();
        } catch {
          return false;
        }
      },
      { message: 'Invalid amount format. Must be a non-negative integer.' },
    )
    .describe('Maximum ETH value (in wei) allowed to be sent with the transaction'),
  vlCallContractAllowedContracts: z
    .array(z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'))
    .describe('Array of allowed contract addresses. Empty array means all contracts are allowed'),
  vlCallContractAllowedFunctions: z
    .array(z.string())
    .describe('Array of allowed function names. Empty array means all functions are allowed'),
  vlCallContractAllowedChains: z
    .array(z.string())
    .describe('Array of allowed chain names. Empty array means all chains are allowed'),
  vlCallContractAllowedCallDataPrefixes: z
    .array(z.string())
    .optional()
    .describe(
      'Optional array of allowed hex prefixes for appendToCallData. If defined, appendToCallData must start with one of these prefixes',
    ),
});

/**
 * Precheck allow result schema
 */
export const precheckAllowResultSchema = z.object({
  contractAddress: z.string().describe('The contract address that was validated'),
  functionName: z.string().describe('The function name that was validated'),
  chain: z.string().describe('The chain that was validated'),
  value: z.string().describe('The ETH value that was validated'),
  appendToCallDataValidated: z.boolean().describe('Whether appendToCallData was validated'),
});

/**
 * Precheck deny result schema
 */
export const precheckDenyResultSchema = z.object({
  reason: z.string().describe('The reason for denying the precheck'),
  contractAddress: z.string().optional().describe('The contract address that was rejected'),
  functionName: z.string().optional().describe('The function name that was rejected'),
  chain: z.string().optional().describe('The chain that was rejected'),
  value: z.string().optional().describe('The ETH value that was rejected'),
});

/**
 * Evaluate allow result schema
 */
export const evalAllowResultSchema = z.object({
  contractAddress: z.string().describe('The contract address that was validated'),
  functionName: z.string().describe('The function name that was validated'),
  chain: z.string().describe('The chain that was validated'),
  value: z.string().describe('The ETH value that was validated'),
  appendToCallDataValidated: z.boolean().describe('Whether appendToCallData was validated'),
});

/**
 * Evaluate deny result schema
 */
export const evalDenyResultSchema = z.object({
  reason: z.string().describe('The reason for denying the evaluation'),
  contractAddress: z.string().optional().describe('The contract address that was rejected'),
  functionName: z.string().optional().describe('The function name that was rejected'),
  chain: z.string().optional().describe('The chain that was rejected'),
  value: z.string().optional().describe('The ETH value that was rejected'),
});
