import { z } from 'zod';

export const KNOWN_ERRORS = {
  MISSING_PKP_TOKEN_ID: 'MISSING_PKP_TOKEN_ID',
  APP_NOT_DELEGATED_TO_DELEGATEE: 'APP_NOT_DELEGATED_TO_DELEGATEE',
} as const;

/**
 * Tool parameters schema - defines the input parameters for the unpermit app ability
 * No parameters needed - appId and appVersion are derived from the delegatee's app
 */
export const abilityParamsSchema = z.object({});

/**
 * Precheck success result schema
 */
export const precheckSuccessSchema = z.object({
  pkpTokenId: z.string(),
  appId: z.number(),
  appVersion: z.number(),
});

/**
 * Precheck failure result schema
 */
export const precheckFailSchema = z.object({
  reason: z.union([
    z.literal(KNOWN_ERRORS['MISSING_PKP_TOKEN_ID']),
    z.literal(KNOWN_ERRORS['APP_NOT_DELEGATED_TO_DELEGATEE']),
  ]),
  error: z.string(),
});

/**
 * Execute success result schema
 */
export const executeSuccessSchema = z.object({
  txHash: z.string(),
  pkpTokenId: z.string(),
  appId: z.number(),
  appVersion: z.number(),
  timestamp: z.number(),
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
