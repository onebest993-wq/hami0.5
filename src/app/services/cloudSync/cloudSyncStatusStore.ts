import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { CloudSyncBucket } from '@/app/services/cloudSyncEngine';
import { resolveSyncBucket } from '@/app/services/cloudSyncEngine';

export type CloudSyncBucketId = Extract<CloudSyncBucket, 'notes' | 'lawsuit' | 'execution'>;

export type CloudSyncBucketStatus = {
    isSyncing: boolean;
    lastSyncTime: number | null;
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    syncError: string | null;
};

type CloudSyncStatusStoreState = {
    signedIn: boolean;
    isOnline: boolean;
    buckets: Record<CloudSyncBucketId, CloudSyncBucketStatus>;
    syncNowHandlers: Partial<Record<CloudSyncBucketId, () => Promise<void>>>;
    setSignedIn: (signedIn: boolean) => void;
    setOnline: (isOnline: boolean) => void;
    reportBucket: (bucket: CloudSyncBucketId, partial: Partial<CloudSyncBucketStatus>) => void;
    registerSyncHandler: (bucket: CloudSyncBucketId, fn: () => Promise<void>) => void;
    syncAllNow: () => Promise<{ ok: boolean; skipped: boolean; failed: boolean }>;
};

const emptyBucket = (): CloudSyncBucketStatus => ({
    isSyncing: false,
    lastSyncTime: null,
    syncStatus: 'idle',
    syncError: null,
});

const BUCKET_ORDER: CloudSyncBucketId[] = ['notes', 'lawsuit', 'execution'];

export function mapLocalKeyToCloudSyncBucket(localKey: string): CloudSyncBucketId | null {
    const bucket = resolveSyncBucket(localKey);
    if (bucket === 'notes' || bucket === 'lawsuit' || bucket === 'execution') return bucket;
    return null;
}

type AggregateCloudSyncRuntime = {
    isSyncing: boolean;
    lastSyncTime: number | null;
    lastError: string | null;
    isOnline: boolean;
    signedIn: boolean;
};

export function selectAggregateCloudSyncRuntime(state: CloudSyncStatusStoreState): AggregateCloudSyncRuntime {
    const buckets = BUCKET_ORDER.map((id) => state.buckets[id]);
    const isSyncing = buckets.some((b) => b.isSyncing);
    const lastSyncTime = buckets.reduce((max, b) => Math.max(max, b.lastSyncTime ?? 0), 0);
    const errorBucket = [...buckets].reverse().find((b) => b.syncError);
    return {
        isSyncing,
        lastSyncTime: lastSyncTime > 0 ? lastSyncTime : null,
        lastError: errorBucket?.syncError ?? null,
        isOnline: state.isOnline,
        signedIn: state.signedIn,
    };
}

export const useCloudSyncStatusStore = create<CloudSyncStatusStoreState>((set, get) => ({
    signedIn: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    buckets: {
        notes: emptyBucket(),
        lawsuit: emptyBucket(),
        execution: emptyBucket(),
    },
    syncNowHandlers: {},
    setOnline: (isOnline) =>
        set((s) => (s.isOnline === isOnline ? s : { isOnline })),
    setSignedIn: (signedIn) =>
        set((s) => (s.signedIn === signedIn ? s : { signedIn })),
    reportBucket: (bucket, partial) =>
        set((s) => {
            const prev = s.buckets[bucket];
            const next = { ...prev, ...partial };
            if (
                prev.isSyncing === next.isSyncing &&
                prev.lastSyncTime === next.lastSyncTime &&
                prev.syncStatus === next.syncStatus &&
                prev.syncError === next.syncError
            ) {
                return s;
            }
            return {
                buckets: {
                    ...s.buckets,
                    [bucket]: next,
                },
            };
        }),
    registerSyncHandler: (bucket, fn) =>
        set((s) => {
            if (s.syncNowHandlers[bucket] === fn) return s;
            return {
                syncNowHandlers: { ...s.syncNowHandlers, [bucket]: fn },
            };
        }),
    syncAllNow: async () => {
        const { runCloudSyncAllNow } = await import('@/app/services/cloudSync/runCloudSyncAllNow');
        return runCloudSyncAllNow();
    },
}));

/**
 * اشتراك آمن — المنتقي يعيد كائناً جديداً كل استدعاء؛ بلا مقارنة ضحلة
 * يدخل React في Maximum update depth عبر useSyncExternalStore.
 */
export function useAggregateCloudSyncRuntime(): AggregateCloudSyncRuntime {
    return useCloudSyncStatusStore(useShallow(selectAggregateCloudSyncRuntime));
}

export { BUCKET_ORDER };
