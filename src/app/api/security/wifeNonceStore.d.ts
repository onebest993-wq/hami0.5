/**
 * Distributed nonce store adapter for WIFE anti-replay protection.
 *
 * Priority:
 * 1) Redis (Upstash REST) when configured
 * 2) Supabase PostgREST table fallback
 * 3) Ephemeral in-memory fallback (development safety net)
 *
 * Notes:
 * - Redis path is atomic using SET NX PX.
 * - Supabase path expects a unique constraint on "nonce" column to enforce atomicity.
 */
/**
 * Returns true only when nonce is new and successfully persisted for TTL window.
 * Returns false for replay attempts.
 */
export declare function consumeNonceWithTtl(nonce: string, ttlMs: number): Promise<boolean>;
/** Test-only: clears in-memory nonce fallback between isolated scenarios. */
export declare function resetNonceStoreForTests(): void;
