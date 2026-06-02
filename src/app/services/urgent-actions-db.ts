/**
 * تخزين الطلبات المستعجلة — محلي 100% افتراضياً (صفر kv-proxy حتى تفعيل VITE_URGENT_CLOUD_SYNC=true)
 */
import { SecureAPIClient, getCurrentAccessToken } from './SecureAPIClient';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import SecureStoreService from './SecureStoreService';

async function urgentKvHeaders(): Promise<Record<string, string>> {
    const token = await getCurrentAccessToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token ?? publicAnonKey}`,
        'apikey': publicAnonKey,
    };
}

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba`;
const CLOUD_KV_TIMEOUT_MS = 6_000;
const CLOUD_PUSH_DEBOUNCE_MS = 3_000;

/** افتراضياً: لا شبكة — هذا يوقف عاصفة الـ 409 طلب */
const CLOUD_SYNC_ENABLED = import.meta.env.VITE_URGENT_CLOUD_SYNC === 'true';

export function uuidv4(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label}: timeout`)), ms);
        promise
            .then((v) => {
                clearTimeout(timer);
                resolve(v);
            })
            .catch((e) => {
                clearTimeout(timer);
                reject(e);
            });
    });
}

const kv = {
    async set(key: string, value: unknown) {
        if (!CLOUD_SYNC_ENABLED) return;
        const headers = await urgentKvHeaders();
        await withTimeout(
            SecureAPIClient.fetchSecure(`${SERVER_URL}/kv-proxy`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'set', key, value }),
            }),
            CLOUD_KV_TIMEOUT_MS,
            'kv.set',
        );
    },
    async get(key: string) {
        if (!CLOUD_SYNC_ENABLED) return null;
        const headers = await urgentKvHeaders();
        return await withTimeout(
            SecureAPIClient.fetchSecure(`${SERVER_URL}/kv-proxy`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'get', key }),
            }),
            CLOUD_KV_TIMEOUT_MS,
            'kv.get',
        );
    },
};

export type UrgentActionsState = {
    schemaVersion: 1;
    userId: string;
    updatedAt: string;
    cases: unknown[];
};

const URGENT_ACTIONS_LOCAL_KEY_PREFIX = 'hami:urgentActions:v1:';
const DEV_FALLBACK_USER_ID = 'dev-user-uuid-1';

const memoryCache = new Map<string, UrgentActionsState>();
const cloudPushTimers = new Map<string, ReturnType<typeof setTimeout>>();
let cloudPullInFlight: string | null = null;

function getUrgentActionsLocalKey(userId: string) {
    return `${URGENT_ACTIONS_LOCAL_KEY_PREFIX}${userId}`;
}

function readLocalStorageRaw(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function parseUrgentActionsRaw(raw: string | null, expectedUserId: string): UrgentActionsState | null {
    if (!raw) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const s = parsed as Partial<UrgentActionsState>;
        if (!Array.isArray(s.cases)) return null;
        return {
            schemaVersion: 1,
            userId: expectedUserId,
            updatedAt: String(s.updatedAt ?? ''),
            cases: s.cases,
        };
    } catch {
        return null;
    }
}

function pickRicherState(a: UrgentActionsState | null, b: UrgentActionsState | null): UrgentActionsState | null {
    if (!a) return b;
    if (!b) return a;
    if (b.cases.length > a.cases.length) return b;
    if (a.cases.length > b.cases.length) return a;
    const aTime = Number.isFinite(Date.parse(a.updatedAt)) ? Date.parse(a.updatedAt) : 0;
    const bTime = Number.isFinite(Date.parse(b.updatedAt)) ? Date.parse(b.updatedAt) : 0;
    return bTime >= aTime ? b : a;
}

async function loadStateForKey(storageKey: string, logicalUserId: string): Promise<UrgentActionsState | null> {
    let fromSecure: UrgentActionsState | null = null;
    try {
        fromSecure = parseUrgentActionsRaw(await SecureStoreService.getItem(storageKey), logicalUserId);
    } catch {
        /* localStorage fallback below */
    }
    const fromLs = parseUrgentActionsRaw(readLocalStorageRaw(storageKey), logicalUserId);
    return pickRicherState(fromSecure, fromLs);
}

async function loadLocalUrgentActionsState(userId: string): Promise<UrgentActionsState | null> {
    const key = getUrgentActionsLocalKey(userId);
    let best = await loadStateForKey(key, userId);

    if ((!best || best.cases.length === 0) && userId !== DEV_FALLBACK_USER_ID) {
        const devKey = getUrgentActionsLocalKey(DEV_FALLBACK_USER_ID);
        const devBest = await loadStateForKey(devKey, DEV_FALLBACK_USER_ID);
        if (devBest && devBest.cases.length > 0) {
            const migrated: UrgentActionsState = {
                ...devBest,
                userId,
                updatedAt: new Date().toISOString(),
            };
            await saveLocalUrgentActionsState(userId, migrated);
            return migrated;
        }
    }

    return best;
}

async function saveLocalUrgentActionsState(userId: string, state: UrgentActionsState): Promise<void> {
    const key = getUrgentActionsLocalKey(userId);
    const payload = JSON.stringify(state);
    memoryCache.set(userId, state);
    // نسخة متزامنة في localStorage — ضرورية لإعادة التحميل وعدم فقدان الإضابير عند المغادرة
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(key, payload);
        } catch {
            /* quota / private mode */
        }
    }
    try {
        await SecureStoreService.setItem(key, payload);
    } catch {
        /* localStorage أعلاه يكفي للاستمرارية */
    }
}

function scheduleCloudPush(userId: string): void {
    if (!CLOUD_SYNC_ENABLED || typeof window === 'undefined') return;
    const prev = cloudPushTimers.get(userId);
    if (prev) clearTimeout(prev);
    cloudPushTimers.set(
        userId,
        setTimeout(() => {
            cloudPushTimers.delete(userId);
            const state = memoryCache.get(userId);
            if (!state) return;
            void kv.set(`urgentActions:${userId}:state`, state).catch(() => undefined);
        }, CLOUD_PUSH_DEBOUNCE_MS),
    );
}

async function ensureMemoryState(userId: string): Promise<UrgentActionsState> {
    const cached = memoryCache.get(userId);
    if (cached) return cached;
    const local = await loadLocalUrgentActionsState(userId);
    const state: UrgentActionsState =
        local ?? {
            schemaVersion: 1,
            userId,
            updatedAt: new Date().toISOString(),
            cases: [],
        };
    memoryCache.set(userId, state);
    return state;
}

function mergeRemoteState(local: UrgentActionsState | null, remote: UrgentActionsState): UrgentActionsState {
    if (!local) return remote;
    const rTime = Number.isFinite(Date.parse(remote.updatedAt)) ? Date.parse(remote.updatedAt) : 0;
    const lTime = Number.isFinite(Date.parse(local.updatedAt)) ? Date.parse(local.updatedAt) : 0;
    return rTime >= lTime ? remote : local;
}

export const UrgentActionsDB = {
    isCloudEnabled: () => CLOUD_SYNC_ENABLED,

    async getState(userId: string): Promise<UrgentActionsState | null> {
        return ensureMemoryState(userId);
    },

    async syncFromCloud(userId: string): Promise<UrgentActionsState | null> {
        const local = await ensureMemoryState(userId);
        if (!CLOUD_SYNC_ENABLED) return local;
        if (cloudPullInFlight === userId) return local;

        cloudPullInFlight = userId;
        try {
            const remote = await kv.get(`urgentActions:${userId}:state`);
            if (remote && typeof remote === 'object') {
                const r0 = remote as Partial<UrgentActionsState>;
                if (r0.userId === userId && Array.isArray(r0.cases)) {
                    const r: UrgentActionsState = {
                        schemaVersion: 1,
                        userId,
                        updatedAt: String(r0.updatedAt ?? ''),
                        cases: r0.cases,
                    };
                    const merged = mergeRemoteState(local, r);
                    await saveLocalUrgentActionsState(userId, merged);
                    return merged;
                }
            }
        } catch {
            /* local-first */
        } finally {
            cloudPullInFlight = null;
        }
        return local;
    },

    async saveState(userId: string, cases: unknown[]): Promise<void> {
        const state: UrgentActionsState = {
            schemaVersion: 1,
            userId,
            updatedAt: new Date().toISOString(),
            cases: Array.isArray(cases) ? cases : [],
        };
        await saveLocalUrgentActionsState(userId, state);
        scheduleCloudPush(userId);
    },

    async patchCase(userId: string, caseId: string, patch: Record<string, unknown>): Promise<void> {
        const state = await ensureMemoryState(userId);
        const nextCases = state.cases.map((c) => {
            if (!c || typeof c !== 'object') return c;
            const row = c as Record<string, unknown>;
            if (row.id !== caseId) return c;
            return { ...row, ...patch };
        });
        await this.saveState(userId, nextCases);
    },

    invalidateCache(userId: string): void {
        memoryCache.delete(userId);
        const t = cloudPushTimers.get(userId);
        if (t) clearTimeout(t);
        cloudPushTimers.delete(userId);
    },
};
