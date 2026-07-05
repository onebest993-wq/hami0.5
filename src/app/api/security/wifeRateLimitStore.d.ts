/**
 * Distributed rate limiting for WIFE (Redis → in-memory fallback).
 */
/** Default WIFE verify budget — overridden per scope in wifeValidator.checkRateLimit */
export declare const DEFAULT_MAX_REQUESTS = 250;
/**
 * Returns true when request is allowed under rate limit budget.
 */
export declare function consumeRateLimitSlot(subjectKey: string, options?: {
    scope?: string;
    maxRequests?: number;
    windowMs?: number;
}): Promise<boolean>;
export declare function resetWifeRateLimitStoreForTests(): void;
