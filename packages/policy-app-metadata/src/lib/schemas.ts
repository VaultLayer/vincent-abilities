import { z } from 'zod';

/**
 * Ability parameters schema - defines what the ability sends to the policy
 */
export const abilityParamsSchema = z.object({
  appId: z.number().int().positive().describe('The application ID to fetch tools and policies for'),
});

/**
 * User parameters schema - defines the policy configuration set by the user
 */
export const userParamsSchema = z.object({
  vlMetadata: z
    .string()
    .optional()
    .describe(
      'Optional metadata to store with the policy. This should be a JSON stringify string.',
    ),
});

/**
 * Precheck allow result schema
 */
export const precheckAllowResultSchema = z.object({
  appIdValid: z.boolean().describe('Whether the app ID was validated'),
});

/**
 * Precheck deny result schema
 */
export const precheckDenyResultSchema = z.object({
  reason: z.string().describe('The reason for denying the precheck'),
  appId: z.number().optional().describe('The app ID that was rejected'),
});

/**
 * Evaluate allow result schema
 */
export const evalAllowResultSchema = z.object({
  appIdValid: z.boolean().describe('Whether the app ID was validated'),
});

/**
 * Evaluate deny result schema
 */
export const evalDenyResultSchema = z.object({
  reason: z.string().describe('The reason for denying the evaluation'),
  appId: z.number().optional().describe('The app ID that was rejected'),
});
