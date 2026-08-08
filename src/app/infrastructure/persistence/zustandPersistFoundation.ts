import { createJSONStorage } from 'zustand/middleware';
import { debug } from '@/app/utils/debug';
import { sentryCaptureException } from '@/app/observability/sentryClient';
import { defaultPersistWipeGuard } from '@/app/services/securePersistStorage';

/** خط أساس موحّد لمتاجر Zustand غير الجزائي — ارفع عند تغيير شكل الحمولة. */
export const FOUNDATION_STORE_PERSIST_V1 = 1;

export type FoundationPersistMeta = {
    area: string;
    storageKey: string;
    version: number;
};

/** يفكّ غلاف zustand { state } إن وُجد. */
export function unwrapPersistedSlice<T extends Record<string, unknown>>(
    persisted: unknown,
): Partial<T> {
    if (!persisted || typeof persisted !== 'object') return {};
    const root = persisted as Record<string, unknown>;
    const inner = root.state;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        return inner as Partial<T>;
    }
    return root as Partial<T>;
}

export function createPersistRehydrateReporter(meta: FoundationPersistMeta) {
    return () => (_state: unknown, error: unknown) => {
        if (!error) return;
        debug.error(`[${meta.area}] فشل استرجاع الحالة المحفوظة`, error);
        void sentryCaptureException(error, {
            area: meta.area,
            phase: 'rehydrate',
            persistVersion: meta.version,
            storeKey: meta.storageKey,
        });
    };
}

/** تخزين JSON مع حارس المسح — يعمل على localStorage أو أي StateStorage. */
export function createGuardedJSONStorage<S>(
    backend: () => Storage,
    wipeGuard = defaultPersistWipeGuard,
) {
    return createJSONStorage<S>(() => ({
        getItem: (name) => backend().getItem(name),
        setItem: (name, value) => {
            const existing = backend().getItem(name);
            if (wipeGuard(value, existing, name)) return;
            backend().setItem(name, value);
        },
        removeItem: (name) => backend().removeItem(name),
    }));
}
