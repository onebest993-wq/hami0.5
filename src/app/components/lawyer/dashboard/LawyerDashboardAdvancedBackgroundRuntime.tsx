import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { User } from '@supabase/supabase-js';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { useCloudSync } from '@/app/hooks/useCloudSync';
import { useRealtime } from '@/app/hooks/useRealtime';
import { PushNotificationService } from '@/app/services/PushNotificationService';
import { debug } from '@/app/utils/debug';
import { STORAGE_KEYS } from '@/app/utils/constants';
import {
    bindExecutionFilesStorageOwnerLite,
    resolveExecutionFilesStorageKeyLite,
} from '@/app/utils/executionFilesStorageOwnerLite';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { useCloudSyncStatusStore } from '@/app/services/cloudSync/cloudSyncStatusStore';

export type LawyerDashboardAdvancedBackgroundRuntimeProps = {
    user: User;
    syncNotesOn: boolean;
    syncFilesOn: boolean;
    syncExecutionOn: boolean;
    pushAllowed: boolean;
    onNotesSynced: (merged: unknown[]) => void;
    onLawsuitFilesSynced: (merged: FileData[]) => void;
    mergeNotesStores: (synced: unknown[]) => void;
    syncExecutionFilesNowRef: MutableRefObject<() => void>;
    syncLawsuitFilesNowRef: MutableRefObject<() => void>;
    syncNotesNowRef: MutableRefObject<() => void>;
    refreshAlertsLightRef: MutableRefObject<() => void>;
};

export function LawyerDashboardAdvancedBackgroundRuntime({
    user,
    syncNotesOn,
    syncFilesOn,
    syncExecutionOn,
    pushAllowed,
    onNotesSynced,
    onLawsuitFilesSynced,
    mergeNotesStores,
    syncExecutionFilesNowRef,
    syncLawsuitFilesNowRef,
    syncNotesNowRef,
    refreshAlertsLightRef,
}: LawyerDashboardAdvancedBackgroundRuntimeProps) {
    const advancedServicesOnceRef = useRef(false);
    const realtimeSyncTimersRef = useRef<Partial<Record<'notes' | 'lawsuit' | 'execution', number>>>({});
    const executionLocalKey = bindExecutionFilesStorageOwnerLite(user?.id ?? null);

    useEffect(() => {
        const uid = user?.id ?? null;
        void import('@/app/utils/executionFilesStorage')
            .then((m) => {
                m.bindExecutionFilesStorageOwner(uid);
            })
            .catch(() => undefined);
    }, [user?.id]);

    const { syncNow: syncNotesNow } = useCloudSync({
        localKey: STORAGE_KEYS.LAWYER_NOTES,
        syncInterval: 180_000,
        enabled: !!user && syncNotesOn,
        onSyncSuccess: () => {
            const synced = persistenceRepository.load<unknown[]>(STORAGE_KEYS.LAWYER_NOTES);
            mergeNotesStores(synced ?? []);
            onNotesSynced(synced ?? []);
        },
        onSyncError: (error) => debug.warn('[LawyerDashboard] sync notes skipped:', error),
    });

    const { syncNow: syncLawsuitFilesNow } = useCloudSync({
        localKey: STORAGE_KEYS.LAWYER_FILES,
        syncInterval: 240_000,
        enabled: !!user && syncFilesOn,
        onSyncSuccess: () => {
            const merged = persistenceRepository.load<FileData[]>(STORAGE_KEYS.LAWYER_FILES);
            if (Array.isArray(merged)) onLawsuitFilesSynced(merged);
        },
        onSyncError: (error) => debug.warn('[LawyerDashboard] sync lawsuit skipped:', error),
    });

    const { syncNow: syncExecutionFilesNow } = useCloudSync({
        localKey: executionLocalKey || resolveExecutionFilesStorageKeyLite(user?.id),
        syncInterval: 300_000,
        enabled: !!user && syncExecutionOn,
        onSyncError: (error) => debug.warn('[LawyerDashboard] sync execution skipped:', error),
    });

    useEffect(() => {
        useCloudSyncStatusStore.getState().setSignedIn(Boolean(user?.id));
    }, [user?.id]);

    useEffect(() => {
        const store = useCloudSyncStatusStore.getState();
        store.registerSyncHandler('notes', async () => {
            syncNotesNowRef.current();
        });
        store.registerSyncHandler('lawsuit', async () => {
            syncLawsuitFilesNowRef.current();
        });
        store.registerSyncHandler('execution', async () => {
            syncExecutionFilesNowRef.current();
        });
    }, [syncExecutionFilesNowRef, syncLawsuitFilesNowRef, syncNotesNowRef]);

    const scheduleRealtimeSync = useCallback(
        (bucket: 'notes' | 'lawsuit' | 'execution', fn: () => void) => {
            const allowed =
                bucket === 'notes' ? syncNotesOn : bucket === 'lawsuit' ? syncFilesOn : syncExecutionOn;
            if (!allowed) return;
            const prev = realtimeSyncTimersRef.current[bucket];
            if (prev !== undefined) window.clearTimeout(prev);
            realtimeSyncTimersRef.current[bucket] = window.setTimeout(() => {
                delete realtimeSyncTimersRef.current[bucket];
                fn();
            }, 4_000);
        },
        [syncExecutionOn, syncFilesOn, syncNotesOn],
    );

    useRealtime({
        userId: user?.id ?? '',
        enabled: Boolean(user?.id),
        showToasts: true,
        onExecutionUpdate: async (payload) => {
            scheduleRealtimeSync('execution', () => {
                void syncExecutionFilesNow();
                refreshAlertsLightRef.current();
            });
            if (payload.eventType === 'INSERT' && payload.new) {
                const row = payload.new as Record<string, unknown>;
                await PushNotificationService.notifyNewExecution(String(row.case_no ?? 'جديد'));
            }
        },
        onLawsuitUpdate: async (payload) => {
            scheduleRealtimeSync('lawsuit', () => {
                void syncLawsuitFilesNow();
                refreshAlertsLightRef.current();
            });
            if (payload.eventType === 'INSERT' && payload.new) {
                const row = payload.new as Record<string, unknown>;
                await PushNotificationService.notifyNewLawsuit(String(row.case_no ?? 'جديد'));
            }
        },
        onNoteUpdate: async () => {
            scheduleRealtimeSync('notes', () => {
                void syncNotesNow();
                refreshAlertsLightRef.current();
            });
        },
    });

    useEffect(() => {
        return () => {
            for (const id of Object.values(realtimeSyncTimersRef.current)) {
                if (id !== undefined) window.clearTimeout(id);
            }
            realtimeSyncTimersRef.current = {};
        };
    }, []);

    useEffect(() => {
        if (!user) return;
        if (advancedServicesOnceRef.current) return;
        advancedServicesOnceRef.current = true;

        void (async () => {
            if (!pushAllowed) return;
            try {
                await PushNotificationService.initialize();
            } catch (e) {
                debug.error('[LawyerDashboard] Push init failed:', e);
            }
        })();
    }, [pushAllowed, user]);

    return null;
}
