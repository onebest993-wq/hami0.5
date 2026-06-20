// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import { useAutoSync } from '@/app/hooks/useAutoSync';
import { storageCache } from '@/app/utils/storageCache';
import {
    EXECUTION_FILES_STORAGE_KEY,
    loadExecutionFilesRaw,
    saveExecutionFilesRaw,
} from '@/app/utils/executionFilesStorage';
import {
    generateExecutionDossierId,
    removeExecutionStorageBundleAsync,
    seedFreshExecutionDossierStorage,
} from '@/app/utils/executionStorageKeys';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { purgeExpiredExecutionsFromTrash, stripExecutionTrashFields } from '@/app/utils/executionTrash';
import {
    pruneOrphanedBridgeEvents,
    removeAllBridgedEventsForEntity,
    syncExecutionFileToCalendar,
} from '@/app/services/calendarDossierSync';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import { prefetchArchivePortal, prefetchExecutionDashboard } from '@/app/utils/lazyComponents';
import logger from '@/app/utils/logger';
import {
    coerceActiveFileTarget,
    coerceExecutionFilePreserveId,
} from '@/app/components/lawyer/LawyerDashboardParts/utils';

const EXECUTION_FILES_KEY = EXECUTION_FILES_STORAGE_KEY;

type ActiveDossier = FileData | ExecutionFile | null;

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
    const [executionFiles, setExecutionFiles] = useState<ExecutionFile[]>([]);
    useAutoSave(EXECUTION_FILES_KEY, executionFiles, 2_000, localAutoSave);

    useEffect(() => {
        const checkPrivacyMode = () => {
            const primary = storageCache.get(EXECUTION_FILES_KEY);
            const rawList: unknown[] = Array.isArray(primary) ? primary : loadExecutionFilesRaw();
            if (!Array.isArray(primary) && rawList.length > 0) {
                storageCache.set(EXECUTION_FILES_KEY, rawList);
            }

            const coerced = rawList.map(coerceExecutionFilePreserveId);
            const validFiles = purgeExpiredExecutionsFromTrash(
                coerced.filter(
                    (file) =>
                        file && (String(file.fileNumber || '').trim() || String(file.caseNo || '').trim()),
                ),
            );

            if (validFiles.length !== coerced.length) {
                logger.info(
                    `🔧 [LawyerDashboard] Cleaned ${coerced.length - validFiles.length} invalid files from storage`,
                );
            }

            storageCache.set(EXECUTION_FILES_KEY, validFiles);
            setExecutionFiles(validFiles);
        };

        checkPrivacyMode();
    }, []);

    const reloadExecutionFiles = useCallback(() => {
        const rawList: unknown[] = loadExecutionFilesRaw();
        const coerced = rawList.map(coerceExecutionFilePreserveId);
        const validFiles = purgeExpiredExecutionsFromTrash(
            coerced.filter(
                (file) =>
                    file && (String(file.fileNumber || '').trim() || String(file.caseNo || '').trim()),
            ),
        );
        storageCache.set(EXECUTION_FILES_KEY, validFiles);
        setExecutionFiles(validFiles);
        return validFiles;
    }, []);

    const { syncNow: syncExecutionFiles, isSyncing: isSyncingExecution } = useAutoSync(
        'execution-files',
        executionFiles,
        {
            enabled: true,
            interval: 30 * 60 * 1000,
            saveOnChange: true,
        },
    );

    useEffect(() => {
        if (archiveType !== 'execution') return;
        prefetchArchivePortal();
        prefetchExecutionDashboard();
        setExecutionFiles((prev) => {
            const next = purgeExpiredExecutionsFromTrash(prev);
            return next.length < prev.length ? next : prev;
        });
    }, [archiveType]);

    const calendarUserId = resolveCalendarUserId(userId ?? authUserId ?? null);

    const moveExecutionToTrash = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setExecutionFiles((prev) => {
                const next = prev.map((f) => {
                    const fId = String(f.id ?? '');
                    return fId === idStr
                        ? { ...f, executionTrashDeletedAt: new Date().toISOString() }
                        : f;
                });
                saveExecutionFilesRaw(next);
                storageCache.set(EXECUTION_FILES_KEY, next);
                return next;
            });
            setActiveFile((cur) => {
                if (!cur) return null;
                return String(cur.id ?? '') === idStr ? null : cur;
            });
            void removeAllBridgedEventsForEntity('execution', fileId, calendarUserId);
            void pruneOrphanedBridgeEvents(calendarUserId);
            unpinWorkspaceItem(fileId, 'execution');
            void refreshAppAlerts();
        },
        [calendarUserId, refreshAppAlerts, setActiveFile],
    );

    const restoreExecutionFromTrash = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setExecutionFiles((prev) => {
                const next = prev.map((f) =>
                    String(f.id) !== idStr ? f : stripExecutionTrashFields(f),
                );
                saveExecutionFilesRaw(next);
                storageCache.set(EXECUTION_FILES_KEY, next);
                const restored = next.find((f) => String(f.id) === idStr);
                if (restored) {
                    syncExecutionFileToCalendar(restored as unknown as Record<string, unknown>, userId);
                }
                return next;
            });
        },
        [userId],
    );

    const permanentlyDeleteExecutions = useCallback(
        (ids: Array<string | number>) => {
            const idSet = new Set(ids.map(String));
            void (async () => {
                for (const id of idSet) {
                    await removeExecutionStorageBundleAsync(id);
                    useExecutionDashboardStore.getState().purgeDossierScopedState(id);
                    void removeAllBridgedEventsForEntity('execution', id, userId);
                }
            })();
            setExecutionFiles((prev) => {
                const next = prev.filter((f) => !idSet.has(String(f.id)));
                saveExecutionFilesRaw(next);
                storageCache.set(EXECUTION_FILES_KEY, next);
                return next;
            });
            setActiveFile((cur) => (cur && idSet.has(String(cur?.id)) ? null : cur));
            void pruneOrphanedBridgeEvents(userId);
        },
        [setActiveFile, userId],
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
            useExecutionDashboardStore.getState().resetStore();
            setExecutionFiles((prev) => {
                const next = [fileWithId, ...prev];
                saveExecutionFilesRaw(next);
                storageCache.set(EXECUTION_FILES_KEY, next);
                return next;
            });

            setIsExecutionModalOpen(false);
            setArchiveType(null);
            setActiveFile(fileWithId);
        },
        [setActiveFile, setArchiveType],
    );

    const handleUpdateExecutionFile = useCallback(
        (updatedFile: ExecutionFile) => {
            setExecutionFiles((prev) =>
                prev.map((f) => {
                    if (String(f.id) !== String(updatedFile.id)) return f;
                    const merged: ExecutionFile = { ...f, ...updatedFile };
                    if (
                        f.executionTrashDeletedAt != null &&
                        !Object.prototype.hasOwnProperty.call(updatedFile, 'executionTrashDeletedAt')
                    ) {
                        merged.executionTrashDeletedAt = f.executionTrashDeletedAt;
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
                }),
            );
            setActiveFile((prev) => {
                if (!prev || String(prev.id) !== String(updatedFile.id)) return prev;
                const merged = { ...prev, ...updatedFile } as ExecutionFile;
                return prev.type === 'execution' ? coerceActiveFileTarget(merged) : merged;
            });
            syncExecutionFileToCalendar(updatedFile as unknown as Record<string, unknown>, userId);
            void refreshAppAlerts();
        },
        [refreshAppAlerts, setActiveFile, userId],
    );

    const openExecutionArchiveFile = useCallback(
        (f: unknown): boolean => {
            if (!f || typeof f !== 'object' || (f as { type?: string }).type !== 'execution') return false;
            prefetchExecutionDashboard();
            setActiveFile(coerceExecutionFilePreserveId(f as ExecutionFile));
            return true;
        },
        [setActiveFile],
    );

    return {
        executionFiles,
        setExecutionFiles,
        reloadExecutionFiles,
        syncExecutionFiles,
        isSyncingExecution,
        moveExecutionToTrash,
        restoreExecutionFromTrash,
        permanentlyDeleteExecutions,
        isExecutionModalOpen,
        setIsExecutionModalOpen,
        handleAddExecutionFile,
        handleUpdateExecutionFile,
        openExecutionArchiveFile,
    };
}
