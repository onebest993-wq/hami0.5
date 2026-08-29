import { debug } from '@/app/utils/debug';
import { sentryCaptureException } from '@/app/observability/sentryClient';

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
