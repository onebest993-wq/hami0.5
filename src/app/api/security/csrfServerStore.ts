/**
 * Server-side CSRF token registry (Redis → Supabase → memory).
 * Binds CSRF token to authenticated subject (sub).
 *
 * Memory is pinned on globalThis so Vite SSR HMR / duplicate module graphs
 * share the same registry in non-production.
 */

import { toBase64Url } from '@/app/security/wifeRequestSigningShared.ts';
import { getSupabaseAdminClient } from './supabaseAdminClient.ts';
import { wifeRedisJson } from './wifeRedisRest.ts';
import { getWifeEnv, hasWifeRedisConfig, isWifeProduction } from './wifeStoreEnv.ts';
import { wifeTimingSafeEqual } from './wifeTimingSafe.ts';

const DEFAULT_CSRF_TABLE = 'wife_csrf_store';
const CSRF_TTL_MS = 24 * 60 * 60 * 1000;
const MEMORY_STORE_KEY = '__hamiWifeCsrfMemoryStore';

type CsrfMemoryRow = { token: string; expiresAtMs: number };

function getMemoryStore(): Map<string, CsrfMemoryRow> {
    const g = globalThis as typeof globalThis & {
        [MEMORY_STORE_KEY]?: Map<string, CsrfMemoryRow>;
    };
    if (!g[MEMORY_STORE_KEY]) {
        g[MEMORY_STORE_KEY] = new Map();
    }
    return g[MEMORY_STORE_KEY];
}

function redisKey(sub: string): string {
    return encodeURIComponent(`wife:csrf:${sub}`);
}

function pruneMemory(nowMs: number): void {
    const memoryStore = getMemoryStore();
    for (const [sub, row] of memoryStore.entries()) {
        if (row.expiresAtMs <= nowMs) memoryStore.delete(sub);
    }
}

async function persistToken(sub: string, token: string, expiresAtMs: number): Promise<boolean> {
    if (hasWifeRedisConfig()) {
        try {
            const ttlMs = Math.max(60_000, expiresAtMs - Date.now());
            const res = await wifeRedisJson(
                `/set/${redisKey(sub)}/${encodeURIComponent(token)}?PX=${ttlMs}`,
                'POST',
            );
            if (res.ok) return true;
        } catch {
            if (isWifeProduction()) return false;
        }
    }

    const admin = getSupabaseAdminClient();
    if (admin) {
        try {
            const table = getWifeEnv('WIFE_CSRF_TABLE') || DEFAULT_CSRF_TABLE;
            const { error } = await admin.from(table).upsert(
                { sub, token, expires_at_ms: expiresAtMs },
                { onConflict: 'sub' },
            );
            if (!error) return true;
        } catch {
            if (isWifeProduction()) return false;
        }
    }

    if (isWifeProduction()) return false;
    getMemoryStore().set(sub, { token, expiresAtMs });
    return true;
}

async function readToken(sub: string): Promise<string | null> {
    const nowMs = Date.now();
    pruneMemory(nowMs);

    if (hasWifeRedisConfig()) {
        try {
            const res = await wifeRedisJson(`/get/${redisKey(sub)}`);
            if (res.ok && typeof res.result === 'string' && res.result) return res.result;
        } catch {
            if (isWifeProduction()) return null;
        }
    }

    const admin = getSupabaseAdminClient();
    if (admin) {
        try {
            const table = getWifeEnv('WIFE_CSRF_TABLE') || DEFAULT_CSRF_TABLE;
            const { data, error } = await admin
                .from(table)
                .select('token, expires_at_ms')
                .eq('sub', sub)
                .maybeSingle();
            if (!error && data && Number(data.expires_at_ms) > nowMs) {
                return String(data.token ?? '');
            }
        } catch {
            if (isWifeProduction()) return null;
        }
    }

    const cached = getMemoryStore().get(sub);
    if (cached && cached.expiresAtMs > nowMs) return cached.token;
    return null;
}

export function generateCsrfTokenValue(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
}

export async function issueCsrfTokenForSubject(sub: string): Promise<string | null> {
    if (!sub) return null;
    const token = generateCsrfTokenValue();
    const expiresAtMs = Date.now() + CSRF_TTL_MS;
    const ok = await persistToken(sub, token, expiresAtMs);
    return ok ? token : null;
}

export async function invalidateCsrfForSubject(sub: string): Promise<void> {
    if (!sub) return;
    getMemoryStore().delete(sub);

    if (hasWifeRedisConfig()) {
        try {
            await wifeRedisJson(`/del/${redisKey(sub)}`, 'POST');
        } catch {
            /* best effort */
        }
    }

    const admin = getSupabaseAdminClient();
    if (admin) {
        try {
            const table = getWifeEnv('WIFE_CSRF_TABLE') || DEFAULT_CSRF_TABLE;
            await admin.from(table).delete().eq('sub', sub);
        } catch {
            /* best effort */
        }
    }
}

export async function readCsrfTokenForSubject(sub: string): Promise<string | null> {
    if (!sub) return null;
    const token = await readToken(sub);
    return token && token.length > 0 ? token : null;
}

export async function validateCsrfForSubject(sub: string, token: string): Promise<boolean> {
    if (!sub || !token) return false;
    const expected = await readToken(sub);
    if (!expected) return false;
    return wifeTimingSafeEqual(expected, token);
}

export function resetCsrfServerStoreForTests(): void {
    getMemoryStore().clear();
}
