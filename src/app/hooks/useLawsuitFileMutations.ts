import { useCallback } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    applyLawsuitArchiveSegments,
    applyLawsuitHardDeleteSegments,
    applyLawsuitPermanentDeleteSegments,
    applyLawsuitRestoreFromArchiveSegments,
    applyLawsuitRestoreFromTrashSegments,
    applyLawsuitSoftDelete,
    applyLawsuitTrashSegments,
    findLawsuitFile,
    findLawsuitFileInSegments,
    persistLawsuitActiveRecord,
    type LawsuitFileSegments,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import {
    pruneOrphanedBridgeEvents,
    removeAllBridgedEventsForEntity,
    syncLawsuitFileToCalendar,
} from '@/app/services/calendar/dossierSyncLazy';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';

type ActiveFile = FileData | ExecutionFile | null;

type UseLawsuitFileMutationsOptions = {
    files: FileData[];
    setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
    lawsuitSegments: LawsuitFileSegments;
    setLawsuitSegments: React.Dispatch<React.SetStateAction<LawsuitFileSegments>>;
    setActiveFile: React.Dispatch<React.SetStateAction<ActiveFile>>;
    userId?: string | null;
    authUserId?: string | null;
    refreshAppAlerts: () => void | Promise<void>;
    showLawsuitsWorkspace: boolean;
    unpinWorkspaceForDeletedFile: (file: FileData) => void;
};

export function useLawsuitFileMutations({
    files,
    setFiles,
    lawsuitSegments,
    setLawsuitSegments,
    setActiveFile,
    userId,
    authUserId,
    refreshAppAlerts,
    unpinWorkspaceForDeletedFile,
}: UseLawsuitFileMutationsOptions) {
    const calendarUid = resolveCalendarUserId(userId ?? authUserId ?? null);

    const moveLawsuitToTrash = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setLawsuitSegments((prev) => applyLawsuitTrashSegments(prev, fileId));
            setActiveFile((cur) => (cur && String(cur.id) === idStr ? null : cur));
            void removeAllBridgedEventsForEntity('lawsuit', fileId, calendarUid);
            void pruneOrphanedBridgeEvents(calendarUid);
            void refreshAppAlerts();
        },
        [calendarUid, refreshAppAlerts, setActiveFile, setLawsuitSegments],
    );

    const restoreLawsuitFromTrash = useCallback(
        (fileId: string | number) => {
            setLawsuitSegments((prev) => {
                const next = applyLawsuitRestoreFromTrashSegments(prev, fileId);
                const restored = findLawsuitFileInSegments(next, fileId);
                if (restored) {
                    syncLawsuitFileToCalendar(restored as unknown as Record<string, unknown>, userId);
                }
                return next;
            });
        },
        [setLawsuitSegments, userId],
    );

    const archiveLawsuit = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setLawsuitSegments((prev) => applyLawsuitArchiveSegments(prev, fileId));
            setActiveFile((cur) => (cur && String(cur.id) === idStr ? null : cur));
            void removeAllBridgedEventsForEntity('lawsuit', fileId, calendarUid);
            void pruneOrphanedBridgeEvents(calendarUid);
            void refreshAppAlerts();
        },
        [calendarUid, refreshAppAlerts, setActiveFile, setLawsuitSegments],
    );

    const restoreArchivedLawsuit = useCallback(
        (fileId: string | number) => {
            setLawsuitSegments((prev) => {
                const next = applyLawsuitRestoreFromArchiveSegments(prev, fileId);
                const restored = findLawsuitFileInSegments(next, fileId);
                if (restored) {
                    syncLawsuitFileToCalendar(restored as unknown as Record<string, unknown>, userId);
                }
                return next;
            });
        },
        [setLawsuitSegments, userId],
    );

    const permanentlyDeleteLawsuits = useCallback(
        (ids: Array<string | number>) => {
            const idSet = new Set(ids.map(String));
            idSet.forEach((id) => {
                void removeAllBridgedEventsForEntity('lawsuit', id, userId);
            });
            setLawsuitSegments((prev) => applyLawsuitPermanentDeleteSegments(prev, ids));
            setActiveFile((cur) => (cur && idSet.has(String(cur?.id)) ? null : cur));
            void pruneOrphanedBridgeEvents(userId);
        },
        [setActiveFile, setLawsuitSegments, userId],
    );

    const handleDeleteFile = useCallback(
        (fileToDelete: FileData) => {
            const isHardDelete = fileToDelete.status === 'deleted';
            if (isHardDelete) {
                void removeAllBridgedEventsForEntity('lawsuit', fileToDelete.id, userId);
                setLawsuitSegments((prev) => applyLawsuitHardDeleteSegments(prev, fileToDelete.id));
            } else {
                const updated = applyLawsuitSoftDelete(fileToDelete);
                setLawsuitSegments((prev) => persistLawsuitActiveRecord(updated, prev));
                void removeAllBridgedEventsForEntity('lawsuit', fileToDelete.id, userId);
            }
            unpinWorkspaceForDeletedFile(fileToDelete);
            void refreshAppAlerts();
        },
        [refreshAppAlerts, setLawsuitSegments, unpinWorkspaceForDeletedFile, userId],
    );

    const handleRestoreFile = useCallback(
        (fileToRestore: FileData) => {
            const updated: FileData = { ...fileToRestore, status: 'active', deletedAt: undefined };
            setLawsuitSegments((prev) => persistLawsuitActiveRecord(updated, prev));
            setActiveFile(updated);
            void refreshAppAlerts();
        },
        [refreshAppAlerts, setActiveFile, setLawsuitSegments],
    );

    return {
        moveLawsuitToTrash,
        restoreLawsuitFromTrash,
        archiveLawsuit,
        restoreArchivedLawsuit,
        permanentlyDeleteLawsuits,
        handleDeleteFile,
        handleRestoreFile,
    };
}
