import { cleanupCalendarForUser } from '@/app/services/calendarDossierSync';
import { invalidateCalendarEventsCache } from '@/app/services/calendar/calendarEventsCache';

const RECONCILE_STATE_KEY = 'hami:calendar:reconcile-state:v1';
const FULL_RECONCILE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FINGERPRINT_CHANGE_COOLDOWN_MS = 5 * 60 * 1000;

type ReconcileState = {
    fingerprint: string;
    lastFullAt: number;
};

type ReconcileStore = Record<string, ReconcileState>;

const inFlightByUser = new Map<string, Promise<boolean>>();

function readStore(): ReconcileStore {
    if (typeof localStorage === 'undefined') return {};
    try {
        const raw = localStorage.getItem(RECONCILE_STATE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? (parsed as ReconcileStore) : {};
    } catch {
        return {};
    }
}

function writeState(userId: string, state: ReconcileState): void {
    if (typeof localStorage === 'undefined') return;
    try {
        const store = readStore();
        store[userId] = state;
        localStorage.setItem(RECONCILE_STATE_KEY, JSON.stringify(store));
    } catch {
        /* ignore */
    }
}

export function shouldRunCalendarReconcile(
    userId: string,
    dossierFingerprint: string,
    now = Date.now(),
): boolean {
    if (!userId) return false;
    const state = readStore()[userId];
    if (!state) return true;
    if (now - state.lastFullAt >= FULL_RECONCILE_INTERVAL_MS) return true;
    if (state.fingerprint !== dossierFingerprint && now - state.lastFullAt >= FINGERPRINT_CHANGE_COOLDOWN_MS) {
        return true;
    }
    return false;
}

/** للاختبارات */
export function resetCalendarReconcileStateForTests(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(RECONCILE_STATE_KEY);
    inFlightByUser.clear();
}

/**
 * reconcile عميق فقط عند الحاجة:
 * - أول مرة
 * - تغيّر fingerprint الإضابير (بعد cooldown 5 د)
 * - مرّ 24 ساعة من آخر reconcile
 */
export async function runSmartCalendarReconcileIfNeeded(
    userId: string,
    dossierFingerprint: string,
): Promise<boolean> {
    if (!userId) return false;
    if (!shouldRunCalendarReconcile(userId, dossierFingerprint)) return false;

    const existing = inFlightByUser.get(userId);
    if (existing) return existing;

    const job = (async (): Promise<boolean> => {
        if (!shouldRunCalendarReconcile(userId, dossierFingerprint)) return false;
        await cleanupCalendarForUser(userId);
        writeState(userId, { fingerprint: dossierFingerprint, lastFullAt: Date.now() });
        invalidateCalendarEventsCache(userId);
        return true;
    })();

    inFlightByUser.set(userId, job);
    try {
        return await job;
    } finally {
        if (inFlightByUser.get(userId) === job) {
            inFlightByUser.delete(userId);
        }
    }
}
