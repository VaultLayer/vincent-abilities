import { z } from 'zod';

export const KNOWN_ERRORS = {
  INVALID_APP_ID: 'INVALID_APP_ID',
  INVALID_APP_VERSION: 'INVALID_APP_VERSION',
  MISSING_PKP_TOKEN_ID: 'MISSING_PKP_TOKEN_ID',
} as const;

/**
 * Tool parameters schema - defines the input parameters for the unpermit app ability
 */
export const abilityParamsSchema = z.object({
  appId: z.number().int().positive('App ID must be a positive integer'),
  appVersion: z.number().int().positive('App version must be a positive integer'),
});

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
    z.literal(KNOWN_ERRORS['INVALID_APP_ID']),
    z.literal(KNOWN_ERRORS['INVALID_APP_VERSION']),
    z.literal(KNOWN_ERRORS['MISSING_PKP_TOKEN_ID']),
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
