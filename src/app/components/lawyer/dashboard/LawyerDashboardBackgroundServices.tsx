// @ts-nocheck
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { User } from '@supabase/supabase-js';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useCloudSync } from '@/app/hooks/useCloudSync';
import { useRealtime } from '@/app/hooks/useRealtime';
import { useAppAlerts } from '@/app/hooks/useAppAlerts';
import { PushNotificationService } from '@/app/services/PushNotificationService';
import { debug } from '@/app/utils/debug';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { useCloudSyncStatusStore } from '@/app/services/cloudSync/cloudSyncStatusStore';

export type LawyerDashboardBackgroundServicesProps = {
    user: User;
    syncNotesOn: boolean;
    syncFilesOn: boolean;
    syncExecutionOn: boolean;
    pushAllowed: boolean;
    files: FileData[];
    executionFiles: unknown[];
    criminalCases: unknown[];
    globalNotes: unknown[];
    fieldTasks: LegalTask[];
    lawyerId: string;
    onAlerts: (payload: {
        alerts: SecretaryAlert[];
        loading: boolean;
        error: string | null;
        refresh: () => void;
    }) => void;
    onNotesSynced: (merged: unknown[]) => void;
    onLawsuitFilesSynced: (merged: FileData[]) => void;
    mergeNotesStores: (synced: unknown[]) => void;
    syncExecutionFilesNowRef: MutableRefObject<() => void>;
    syncLawsuitFilesNowRef: MutableRefObject<() => void>;
    syncNotesNowRef: MutableRefObject<() => void>;
    refreshAppAlertsRef: MutableRefObject<() => void>;
};

/**
 * خدمات الخلفية: مزامنة سحابية + realtime + تنبيهات السكرتير.
 * تُحمَّل في chunk منفصل بعد مرحلة interactive.
 */
export default function LawyerDashboardBackgroundServices(props: LawyerDashboardBackgroundServicesProps) {
    const {
        user,
        syncNotesOn,
        syncFilesOn,
        syncExecutionOn,
        pushAllowed,
        files,
        executionFiles,
        criminalCases,
        globalNotes,
        fieldTasks,
        lawyerId,
        onAlerts,
        onNotesSynced,
        onLawsuitFilesSynced,
        mergeNotesStores,
        syncExecutionFilesNowRef,
        syncLawsuitFilesNowRef,
        syncNotesNowRef,
        refreshAppAlertsRef,
    } = props;

    const advancedServicesOnceRef = useRef(false);
    const realtimeSyncTimersRef = useRef<Partial<Record<'notes' | 'lawsuit' | 'execution', number>>>({});

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
        localKey: EXECUTION_FILES_STORAGE_KEY,
        syncInterval: 300_000,
        enabled: !!user && syncExecutionOn,
        onSyncError: (error) => debug.warn('[LawyerDashboard] sync execution skipped:', error),
    });

    useEffect(() => {
        useCloudSyncStatusStore.getState().setSignedIn(Boolean(user?.id));
    }, [user?.id]);

    useEffect(() => {
        const store = useCloudSyncStatusStore.getState();
        store.registerSyncHandler('notes', () => syncNotesNowRef.current());
        store.registerSyncHandler('lawsuit', () => syncLawsuitFilesNowRef.current());
        store.registerSyncHandler('execution', () => syncExecutionFilesNowRef.current());
    }, [syncNotesNowRef, syncLawsuitFilesNowRef, syncExecutionFilesNowRef]);

    const { alerts, loading, error, refresh, refreshLight } = useAppAlerts({
        lawyerId,
        files,
        executionFiles,
        criminalCases,
        notes: globalNotes,
        fieldTasks,
        deferUntilIdle: true,
    });

    const onAlertsRef = useRef(onAlerts);
    onAlertsRef.current = onAlerts;
    const lastAlertsPayloadRef = useRef<{
        alerts: SecretaryAlert[];
        loading: boolean;
        error: string | null;
    } | null>(null);

    useEffect(() => {
        const prev = lastAlertsPayloadRef.current;
        if (
            prev &&
            prev.loading === loading &&
            prev.error === error &&
            prev.alerts.length === alerts.length &&
            prev.alerts.every((a, i) => a.id === alerts[i]?.id)
        ) {
            return;
        }
        lastAlertsPayloadRef.current = { alerts, loading, error };
        onAlertsRef.current({ alerts, loading, error, refresh });
    }, [alerts, loading, error, refresh]);

    syncExecutionFilesNowRef.current = () => void syncExecutionFilesNow();
    syncLawsuitFilesNowRef.current = () => void syncLawsuitFilesNow();
    syncNotesNowRef.current = () => void syncNotesNow();
    refreshAppAlertsRef.current = () => void refresh();

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
        [syncNotesOn, syncFilesOn, syncExecutionOn],
    );

    useRealtime({
        userId: user?.id ?? '',
        enabled: Boolean(user?.id),
        showToasts: true,
        onExecutionUpdate: async (payload) => {
            scheduleRealtimeSync('execution', () => {
                void syncExecutionFilesNow();
                void refreshLight();
            });
            if (payload.eventType === 'INSERT' && payload.new) {
                await PushNotificationService.notifyNewExecution(payload.new.case_no || 'جديد');
            }
        },
        onLawsuitUpdate: async (payload) => {
            scheduleRealtimeSync('lawsuit', () => {
                void syncLawsuitFilesNow();
                void refreshLight();
            });
            if (payload.eventType === 'INSERT' && payload.new) {
                await PushNotificationService.notifyNewLawsuit(payload.new.case_no || 'جديد');
            }
        },
        onNoteUpdate: async () => {
            scheduleRealtimeSync('notes', () => {
                void syncNotesNow();
                void refreshLight();
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
    }, [user, pushAllowed]);

    return null;
}
