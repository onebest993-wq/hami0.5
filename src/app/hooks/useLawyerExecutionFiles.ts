// @ts-nocheck

import { useCallback, useEffect, useState } from 'react';

import type { Dispatch, SetStateAction } from 'react';

import type { ExecutionFile } from '@/app/types/execution';

import type { FileData } from '@/app/components/lawyer/LawyerShared';

import { useAutoSave } from '@/app/hooks/useAutoSave';

import { storageCache } from '@/app/utils/storageCache';

import { PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';

import {

    EXECUTION_FILES_STORAGE_KEY,

    loadExecutionFilesRaw,

    saveExecutionFilesRaw,

} from '@/app/utils/executionFilesStorage';

import { reconcileExecutionDossierStorageAsync, exposeExecutionReconcileForDev } from '@/app/utils/executionDossierStorageReconcile';

import { readExecutionFilesBootstrap } from '@/app/utils/executionFilesBootstrap';

import { markExecutionDossierTombstones } from '@/app/utils/executionDossierTombstones';

import {
    applyExecutionTrashLifecyclePatch,
    collectExecutionCascadeIds,
    mergeExecutionFilesPreservingLifecycle,
} from '@/app/utils/executionLifecycleMutations';

import { loadDossierCollectionAsync } from '@/app/services/dossierPersistence/dossierPersistenceService';

import {

    generateExecutionDossierId,

    removeExecutionStorageBundleAsync,

    seedFreshExecutionDossierStorage,

} from '@/app/utils/executionStorageKeys';

import {
    purgeExecutionDossierScopedState,
    resetExecutionDashboardStore,
} from '@/app/stores/executionDashboardStoreLazy';

import { stripExecutionTrashFields, stripExecutionArchiveFields } from '@/app/utils/executionTrash';

import {

    pruneOrphanedBridgeEvents,

    removeAllBridgedEventsForEntity,

    syncExecutionFileToCalendar,

} from '@/app/services/calendarDossierSync';

import { resolveCalendarUserId } from '@/app/services/calendarBridge';

import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';

import { prefetchArchivePortal, warmExecutionWorkspace } from '@/app/utils/lazyComponents';

import {

    coerceActiveFileTarget,

    coerceExecutionFilePreserveId,

} from '@/app/components/lawyer/LawyerDashboardParts/utils';



const EXECUTION_FILES_KEY = EXECUTION_FILES_STORAGE_KEY;



type ActiveDossier = FileData | ExecutionFile | null;



/** إبقاء أي إضبارة لها معرّف — لا حذف صامت لغياب fileNumber/caseNo */

function normalizeExecutionFiles(rawList: unknown[]): ExecutionFile[] {

    return rawList

        .map(coerceExecutionFilePreserveId)

        .filter((file) => file && String(file.id ?? '').trim());

}



export type LawyerArchiveOverlay =

    | 'client_requests'

    | 'all'

    | 'deleted'

    | 'lawsuit'

    | 'transaction'

    | 'execution'

    | null;



export type UseLawyerExecutionFilesParams = {

    localAutoSave: boolean;

    userId?: string | null;

    authUserId?: string | null;

    refreshAppAlerts: () => void;

    setActiveFile: Dispatch<SetStateAction<ActiveDossier>>;

    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;

    archiveType: LawyerArchiveOverlay;

};



export function useLawyerExecutionFiles({

    localAutoSave,

    userId,

    authUserId,

    refreshAppAlerts,

    setActiveFile,

    setArchiveType,

    archiveType,

}: UseLawyerExecutionFilesParams) {

    const [executionFiles, setExecutionFiles] = useState<ExecutionFile[]>(() =>
        normalizeExecutionFiles(readExecutionFilesBootstrap()),
    );

    const [storageHydrated, setStorageHydrated] = useState(false);



    useAutoSave(EXECUTION_FILES_KEY, executionFiles, PERSIST_DEBOUNCE_MS.HEAVY, localAutoSave, storageHydrated);



    useEffect(() => {
        exposeExecutionReconcileForDev();
    }, []);

    useEffect(() => {

        let cancelled = false;

        void (async () => {

            await loadDossierCollectionAsync('execution');

            if (cancelled) return;

            await reconcileExecutionDossierStorageAsync();

            const rawList = loadExecutionFilesRaw();

            if (cancelled) return;

            const validFiles = normalizeExecutionFiles(rawList);

            setExecutionFiles((prev) => mergeExecutionFilesPreservingLifecycle(prev, validFiles));

            storageCache.set(EXECUTION_FILES_KEY, validFiles);

            setStorageHydrated(true);

        })();

        return () => {

            cancelled = true;

        };

    }, []);



    const reloadExecutionFiles = useCallback(() => {
        void (async () => {
            await reconcileExecutionDossierStorageAsync();
            const rawList: unknown[] = loadExecutionFilesRaw();
            const validFiles = normalizeExecutionFiles(rawList);
            storageCache.set(EXECUTION_FILES_KEY, validFiles);
            setExecutionFiles((prev) => mergeExecutionFilesPreservingLifecycle(prev, validFiles));
        })();
    }, []);



    useEffect(() => {

        if (archiveType !== 'execution') return;

        const syncList = normalizeExecutionFiles(loadExecutionFilesRaw());
        if (syncList.length > 0) {
            setExecutionFiles((prev) => mergeExecutionFilesPreservingLifecycle(prev, syncList));
            storageCache.set(EXECUTION_FILES_KEY, syncList);
        }

        void reconcileExecutionDossierStorageAsync().then(() => {
            reloadExecutionFiles();
        });

        prefetchArchivePortal();
        warmExecutionWorkspace();

    }, [archiveType, reloadExecutionFiles]);



    const calendarUserId = resolveCalendarUserId(userId ?? authUserId ?? null);



    const persistExecutionList = useCallback((next: ExecutionFile[]) => {

        storageCache.set(EXECUTION_FILES_KEY, next);

        saveExecutionFilesRaw(next);

    }, []);



    const moveExecutionToTrash = useCallback(

        (fileId: string | number) => {

            const deletedAt = new Date().toISOString();
            let cascadeIds: string[] = [];

            setExecutionFiles((prev) => {

                cascadeIds = collectExecutionCascadeIds(prev, fileId);
                const cascadeSet = new Set(cascadeIds);

                const next = prev.map((f) => {

                    if (!cascadeSet.has(String(f.id ?? ''))) return f;

                    const row = stripExecutionArchiveFields(f as Record<string, unknown>);

                    return {
                        ...row,
                        executionTrashDeletedAt: deletedAt,
                    } as ExecutionFile;

                });

                persistExecutionList(next);

                for (const id of cascadeIds) {
                    applyExecutionTrashLifecyclePatch(id, deletedAt);
                }

                return next;

            });

            const idSet = new Set(cascadeIds.length > 0 ? cascadeIds : [String(fileId)]);

            setActiveFile((cur) => {

                if (!cur) return null;

                return idSet.has(String(cur.id ?? '')) ? null : cur;

            });

            for (const id of idSet) {
                unpinWorkspaceItem(id, 'execution');
            }

            queueMicrotask(() => {

                for (const id of idSet) {
                    void removeAllBridgedEventsForEntity('execution', id, calendarUserId);
                }

                void pruneOrphanedBridgeEvents(calendarUserId);
                void refreshAppAlerts();

            });

        },

        [calendarUserId, persistExecutionList, refreshAppAlerts, setActiveFile],

    );



    const restoreExecutionFromTrash = useCallback(

        (fileId: string | number) => {

            const idStr = String(fileId);

            setExecutionFiles((prev) => {

                const next = prev.map((f) =>

                    String(f.id) !== idStr ? f : stripExecutionTrashFields(f),

                );

                persistExecutionList(next);

                const restored = next.find((f) => String(f.id) === idStr);

                if (restored) {

                    syncExecutionFileToCalendar(restored as unknown as Record<string, unknown>, userId);

                }

                return next;

            });

        },

        [persistExecutionList, userId],

    );

    const archiveExecution = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setExecutionFiles((prev) => {
                const next = prev.map((f) =>
                    String(f.id) === idStr
                        ? {
                              ...stripExecutionTrashFields(f as Record<string, unknown>),
                              executionArchivedAt: new Date().toISOString(),
                          }
                        : f,
                );
                persistExecutionList(next);
                return next;
            });
            setActiveFile((cur) => (cur && String(cur.id ?? '') === idStr ? null : cur));
            void removeAllBridgedEventsForEntity('execution', fileId, calendarUserId);
            void pruneOrphanedBridgeEvents(calendarUserId);
            unpinWorkspaceItem(fileId, 'execution');
            void refreshAppAlerts();
        },
        [calendarUserId, persistExecutionList, refreshAppAlerts, setActiveFile],
    );

    const restoreArchivedExecution = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setExecutionFiles((prev) => {
                const next = prev.map((f) =>
                    String(f.id) !== idStr ? f : stripExecutionArchiveFields(f as Record<string, unknown>),
                );
                persistExecutionList(next);
                const restored = next.find((f) => String(f.id) === idStr);
                if (restored) {
                    syncExecutionFileToCalendar(restored as unknown as Record<string, unknown>, userId);
                }
                return next;
            });
        },
        [persistExecutionList, userId],
    );

    const permanentlyDeleteExecutions = useCallback(

        (ids: Array<string | number>) => {

            let expandedIds: string[] = [];

            setExecutionFiles((prev) => {

                const idSet = new Set<string>();
                for (const rawId of ids) {
                    for (const id of collectExecutionCascadeIds(prev, rawId)) {
                        idSet.add(id);
                    }
                }
                expandedIds = [...idSet];
                if (expandedIds.length === 0) return prev;

                markExecutionDossierTombstones(expandedIds);

                const next = prev.filter((f) => !idSet.has(String(f.id)));

                persistExecutionList(next);

                return next;

            });

            if (expandedIds.length === 0) return;

            const idSet = new Set(expandedIds);

            setActiveFile((cur) => (cur && idSet.has(String(cur?.id)) ? null : cur));

            for (const id of idSet) {
                unpinWorkspaceItem(id, 'execution');
            }

            queueMicrotask(() => {

                void (async () => {

                    for (const id of idSet) {

                        await removeExecutionStorageBundleAsync(id);

                        await purgeExecutionDossierScopedState(id);

                        void removeAllBridgedEventsForEntity('execution', id, userId);

                    }

                    void pruneOrphanedBridgeEvents(userId);

                })();

            });

        },

        [persistExecutionList, setActiveFile, userId],

    );



    const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);



    const handleAddExecutionFile = useCallback(

        (newFile: Record<string, unknown>) => {

            const dossierId = generateExecutionDossierId();

            const fileWithId = coerceActiveFileTarget({

                ...newFile,

                type: 'execution',

                id: dossierId,

            });

            seedFreshExecutionDossierStorage(fileWithId as unknown as Record<string, unknown>);

            void resetExecutionDashboardStore().then(() => {
                setExecutionFiles((prev) => {
                    const next = [fileWithId, ...prev];
                    persistExecutionList(next);
                    return next;
                });

                setIsExecutionModalOpen(false);
                setArchiveType(null);
                setActiveFile(fileWithId);
            });

        },

        [persistExecutionList, setActiveFile, setArchiveType],

    );



    const handleUpdateExecutionFile = useCallback(

        (updatedFile: ExecutionFile) => {

            setExecutionFiles((prev) => {

                const next = prev.map((f) => {

                    if (String(f.id) !== String(updatedFile.id)) return f;

                    const merged: ExecutionFile = { ...f, ...updatedFile };

                    if (

                        f.executionTrashDeletedAt != null &&

                        !Object.prototype.hasOwnProperty.call(updatedFile, 'executionTrashDeletedAt')

                    ) {

                        merged.executionTrashDeletedAt = f.executionTrashDeletedAt;

                    }

                    if (

                        f.executionArchivedAt != null &&

                        !Object.prototype.hasOwnProperty.call(updatedFile, 'executionArchivedAt')

                    ) {

                        merged.executionArchivedAt = f.executionArchivedAt;

                    }

                    if (

                        f.debtor_absence_badge_dismissed === true &&

                        !Object.prototype.hasOwnProperty.call(updatedFile, 'debtor_absence_badge_dismissed')

                    ) {

                        merged.debtor_absence_badge_dismissed = f.debtor_absence_badge_dismissed;

                    }

                    if (

                        f.debtor_absence_badge_dismissed_by_debtor != null &&

                        !Object.prototype.hasOwnProperty.call(

                            updatedFile,

                            'debtor_absence_badge_dismissed_by_debtor',

                        )

                    ) {

                        merged.debtor_absence_badge_dismissed_by_debtor =

                            f.debtor_absence_badge_dismissed_by_debtor;

                    }

                    return merged;

                });

                if (storageHydrated) {

                    persistExecutionList(next);

                }

                return next;

            });

            setActiveFile((prev) => {

                if (!prev || String(prev.id) !== String(updatedFile.id)) return prev;

                const merged = { ...prev, ...updatedFile } as ExecutionFile;

                return prev.type === 'execution' ? coerceActiveFileTarget(merged) : merged;

            });

            syncExecutionFileToCalendar(updatedFile as unknown as Record<string, unknown>, userId);

            void refreshAppAlerts();

        },

        [persistExecutionList, refreshAppAlerts, setActiveFile, storageHydrated, userId],

    );



    const openExecutionArchiveFile = useCallback(
        (f: unknown): boolean => {
            if (!f || typeof f !== 'object' || (f as { type?: string }).type !== 'execution') return false;
            warmExecutionWorkspace();
            setActiveFile(coerceExecutionFilePreserveId(f as ExecutionFile));
            return true;
        },
        [setActiveFile],
    );



    return {

        executionFiles,

        setExecutionFiles,

        reloadExecutionFiles,

        moveExecutionToTrash,

        restoreExecutionFromTrash,

        archiveExecution,

        restoreArchivedExecution,

        permanentlyDeleteExecutions,

        isExecutionModalOpen,

        setIsExecutionModalOpen,

        handleAddExecutionFile,

        handleUpdateExecutionFile,

        openExecutionArchiveFile,

        storageHydrated,

    };

}

