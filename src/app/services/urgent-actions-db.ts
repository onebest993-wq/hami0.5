/**
 * تخزين الطلبات المستعجلة — محلي 100% افتراضياً.
 * السحابة: VITE_URGENT_CLOUD_SYNC + مزامنة العمل، عبر lawyerCloudKv لا عميل KV موازٍ.
 */
import { lawyerCloudKv } from '@/app/services/cloud/lawyerCloudKv';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import {
    persistSecurePayloadWhenReady,
    readSecureOrDrainLegacySync,
    readSecurePayloadWhenReady,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

const CLOUD_PUSH_DEBOUNCE_MS = 3_000;

/** افتراضياً: لا شبكة — هذا يوقف عاصفة الـ 409 طلب */
const CLOUD_SYNC_ENABLED = import.meta.env.VITE_URGENT_CLOUD_SYNC === 'true';

function canReachUrgentCloud(): boolean {
    return CLOUD_SYNC_ENABLED && isLawyerWorkCloudLive();
}

export function uuidv4(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

async function urgentCloudSet(key: string, value: unknown): Promise<void> {
    if (!canReachUrgentCloud()) return;
    await lawyerCloudKv.set(key, value);
}

async function urgentCloudGet(key: string): Promise<unknown> {
    if (!canReachUrgentCloud()) return null;
    return lawyerCloudKv.get(key);
}

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

async function loadStateForKey(storageKey: string, logicalUserId: string): Promise<UrgentActionsState | null> {
    try {
        const raw = await readSecurePayloadWhenReady(storageKey);
        return parseUrgentActionsRaw(raw, logicalUserId);
    } catch {
        return null;
    }
}

async function loadLocalUrgentActionsState(userId: string): Promise<UrgentActionsState | null> {
    const key = getUrgentActionsLocalKey(userId);
    let best = await loadStateForKey(key, userId);

    // ترحيل مخزن المطوّر فقط في DEV — لا يُخلط بيانات تجريبية مع حساب حقيقي في الإنتاج
    if (
        import.meta.env.DEV === true &&
        (!best || best.cases.length === 0) &&
        userId !== DEV_FALLBACK_USER_ID
    ) {
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
    writeSecureAndClearLegacySync(key, payload);
    await persistSecurePayloadWhenReady(key, payload, { skipIfUnchanged: false });
}

function scheduleCloudPush(userId: string): void {
    if (!canReachUrgentCloud() || typeof window === 'undefined') return;
    const prev = cloudPushTimers.get(userId);
    if (prev) clearTimeout(prev);
    cloudPushTimers.set(
        userId,
        setTimeout(() => {
            cloudPushTimers.delete(userId);
            const state = memoryCache.get(userId);
            if (!state) return;
            void urgentCloudSet(`urgentActions:${userId}:state`, state).catch(() => undefined);
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

    /**
     * قراءة فورية من الذاكرة أو الكاش المشفّر / ترحيل مرآة قديمة.
     * تُدفئ الذاكرة حتى لا يعيد getState فكّ التشفير في نفس الجلسة.
     */
    peekState(userId: string): UrgentActionsState | null {
        const cached = memoryCache.get(userId);
        if (cached) return cached;
        const fromStore = parseUrgentActionsRaw(
            readSecureOrDrainLegacySync(getUrgentActionsLocalKey(userId)),
            userId,
        );
        if (fromStore) memoryCache.set(userId, fromStore);
        return fromStore;
    },

    async getState(userId: string): Promise<UrgentActionsState | null> {
        return ensureMemoryState(userId);
    },

    async syncFromCloud(userId: string): Promise<UrgentActionsState | null> {
        const local = await ensureMemoryState(userId);
        if (!canReachUrgentCloud()) return local;
        if (cloudPullInFlight === userId) return local;

        cloudPullInFlight = userId;
        try {
            const remote = await urgentCloudGet(`urgentActions:${userId}:state`);
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
