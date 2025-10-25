import { z } from 'zod';

/**
 * Ability parameters schema - defines the input parameters for the ability
 */
export const abilityParamsSchema = z.object({
  appId: z.number().int().positive().describe('The application ID to fetch tools and policies for'),
});

/**
 * Precheck success result schema
 */
export const precheckSuccessSchema = z.object({
  appIdValid: z.boolean(),
});

/**
 * Precheck failure result schema
 */
export const precheckFailSchema = z.object({
  error: z.string(),
  reason: z.string(),
});

/**
 * Execute success result schema
 */
export const executeSuccessSchema = z.object({
  toolsAndPolicies: z.array(z.any()),
  appId: z.number(),
});

/**
 * Execute failure result schema
 */
export const executeFailSchema = z.object({
  error: z.string(),
});

// Type exports
export type AbilityParams = z.infer<typeof abilityParamsSchema>;
export type PrecheckSuccess = z.infer<typeof precheckSuccessSchema>;
export type PrecheckFail = z.infer<typeof precheckFailSchema>;
export type ExecuteSuccess = z.infer<typeof executeSuccessSchema>;
export type ExecuteFail = z.infer<typeof executeFailSchema>;
