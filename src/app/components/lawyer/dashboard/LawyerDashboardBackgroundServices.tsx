// @ts-nocheck
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
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
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { useCloudSyncStatusStore } from '@/app/services/cloudSync/cloudSyncStatusStore';
import {
    getBackgroundServicesDeferMs,
    scheduleIdleWork,
} from '@/app/runtime/mobileRuntimePolicy';

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

type AlertsBackgroundRuntimeProps = Pick<
    LawyerDashboardBackgroundServicesProps,
    | 'lawyerId'
    | 'files'
    | 'executionFiles'
    | 'criminalCases'
    | 'globalNotes'
    | 'fieldTasks'
    | 'onAlerts'
    | 'refreshAppAlertsRef'
> & {
    refreshAlertsLightRef: MutableRefObject<() => void>;
};

function AlertsBackgroundRuntime({
    lawyerId,
    files,
    executionFiles,
    criminalCases,
    globalNotes,
    fieldTasks,
    onAlerts,
    refreshAppAlertsRef,
    refreshAlertsLightRef,
}: AlertsBackgroundRuntimeProps) {
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

    refreshAppAlertsRef.current = () => void refresh();
    refreshAlertsLightRef.current = () => void refreshLight();

    return null;
}

type AdvancedBackgroundRuntimeProps = Pick<
    LawyerDashboardBackgroundServicesProps,
    | 'user'
    | 'syncNotesOn'
    | 'syncFilesOn'
    | 'syncExecutionOn'
    | 'pushAllowed'
    | 'onNotesSynced'
    | 'onLawsuitFilesSynced'
    | 'mergeNotesStores'
    | 'syncExecutionFilesNowRef'
    | 'syncLawsuitFilesNowRef'
    | 'syncNotesNowRef'
> & {
    refreshAlertsLightRef: MutableRefObject<() => void>;
};

function AdvancedBackgroundRuntime({
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
}: AdvancedBackgroundRuntimeProps) {
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
                refreshAlertsLightRef.current();
            });
            if (payload.eventType === 'INSERT' && payload.new) {
                await PushNotificationService.notifyNewExecution(payload.new.case_no || 'جديد');
            }
        },
        onLawsuitUpdate: async (payload) => {
            scheduleRealtimeSync('lawsuit', () => {
                void syncLawsuitFilesNow();
                refreshAlertsLightRef.current();
            });
            if (payload.eventType === 'INSERT' && payload.new) {
                await PushNotificationService.notifyNewLawsuit(payload.new.case_no || 'جديد');
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
    }, [user, pushAllowed]);

    return null;
}

/**
 * خدمات الخلفية: تنبيهات خفيفة أولاً، ثم مزامنة/Realtime/Push بعد idle متأخر.
 * تُحمَّل في chunk منفصل بعد استقرار shell الأساسية.
 */
export default function LawyerDashboardBackgroundServices(props: LawyerDashboardBackgroundServicesProps) {
    const [advancedServicesReady, setAdvancedServicesReady] = useState(false);
    const refreshAlertsLightRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        props.syncExecutionFilesNowRef.current = () => undefined;
        props.syncLawsuitFilesNowRef.current = () => undefined;
        props.syncNotesNowRef.current = () => undefined;
        props.refreshAppAlertsRef.current = () => undefined;
    }, [
        props.refreshAppAlertsRef,
        props.syncExecutionFilesNowRef,
        props.syncLawsuitFilesNowRef,
        props.syncNotesNowRef,
    ]);

    useEffect(() => {
        if (!props.user?.id) {
            setAdvancedServicesReady(false);
            return;
        }

        const delay = getBackgroundServicesDeferMs();
        const cancelIdle = scheduleIdleWork(
            () => setAdvancedServicesReady(true),
            {
                minDelayMs: delay,
                timeoutMs: Math.max(delay + 8_000, 12_000),
            },
        );

        return () => cancelIdle();
    }, [props.user?.id]);

    return (
        <>
            <AlertsBackgroundRuntime
                lawyerId={props.lawyerId}
                files={props.files}
                executionFiles={props.executionFiles}
                criminalCases={props.criminalCases}
                globalNotes={props.globalNotes}
                fieldTasks={props.fieldTasks}
                onAlerts={props.onAlerts}
                refreshAppAlertsRef={props.refreshAppAlertsRef}
                refreshAlertsLightRef={refreshAlertsLightRef}
            />
            {advancedServicesReady ? (
                <AdvancedBackgroundRuntime
                    user={props.user}
                    syncNotesOn={props.syncNotesOn}
                    syncFilesOn={props.syncFilesOn}
                    syncExecutionOn={props.syncExecutionOn}
                    pushAllowed={props.pushAllowed}
                    onNotesSynced={props.onNotesSynced}
                    onLawsuitFilesSynced={props.onLawsuitFilesSynced}
                    mergeNotesStores={props.mergeNotesStores}
                    syncExecutionFilesNowRef={props.syncExecutionFilesNowRef}
                    syncLawsuitFilesNowRef={props.syncLawsuitFilesNowRef}
                    syncNotesNowRef={props.syncNotesNowRef}
                    refreshAlertsLightRef={refreshAlertsLightRef}
                />
            ) : null}
        </>
    );
}
