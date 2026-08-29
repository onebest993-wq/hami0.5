import type { SupabaseClient } from '@supabase/supabase-js';
import { emptyHeadquartersStatus, loadHeadquartersStatus, type HeadquartersStatusPayload } from './headquartersStatus.ts';
import { raceBudget } from './promiseBudget.ts';

export const HEADQUARTERS_STATUS_CACHE_TTL_MS = 4_000;
export const HEADQUARTERS_STATUS_BUDGET_MS = 5_000;

type CacheBox = { expiresAt: number; payload: HeadquartersStatusPayload };
let cache: CacheBox | null = null;
let inflight: Promise<HeadquartersStatusPayload> | null = null;

export function resetHeadquartersStatusCacheForTests(): void {
    cache = null;
    inflight = null;
}

/**
 * تجميع طلبات النبض + مهلة صامتة.
 * fresh يتجاوز الذاكرة فقط، لا يتجاوز بوابة المقر أو حد المعدّل.
 */
export async function loadHeadquartersStatusCached(
    admin: SupabaseClient,
    opts?: {
        fresh?: boolean;
        nowMs?: number;
        load?: (client: SupabaseClient, nowMs: number) => Promise<HeadquartersStatusPayload>;
    },
): Promise<HeadquartersStatusPayload> {
    const nowMs = opts?.nowMs ?? Date.now();
    if (!opts?.fresh && cache && cache.expiresAt > nowMs) {
        return cache.payload;
    }
    if (inflight) return inflight;

    const load = opts?.load ?? loadHeadquartersStatus;
    inflight = (async () => {
        const loaded = await raceBudget(load(admin, nowMs), HEADQUARTERS_STATUS_BUDGET_MS);
        if (loaded) {
            cache = { expiresAt: Date.now() + HEADQUARTERS_STATUS_CACHE_TTL_MS, payload: loaded };
            return loaded;
        }
        if (cache) return cache.payload;
        return emptyHeadquartersStatus('down');
    })().finally(() => {
        inflight = null;
    });
    return inflight;
}
