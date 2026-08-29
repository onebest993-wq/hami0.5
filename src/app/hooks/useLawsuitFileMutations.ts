import { useCallback } from 'react';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    applyLawsuitArchiveSegments,
    applyLawsuitPermanentDeleteSegments,
    applyLawsuitRestoreFromArchiveSegments,
    applyLawsuitRestoreFromTrashSegments,
    applyLawsuitTrashSegments,
    findLawsuitFileInSegments,
    type LawsuitFileSegments,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import {
    pruneOrphanedBridgeEvents,
    removeAllBridgedEventsForEntity,
    syncLawsuitFileToCalendar,
} from '@/app/services/calendar/dossierSyncLazy';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { SupabaseService } from '@/app/services/SupabaseService';
import { isLiveCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';
import { scheduleRevokeLawsuitCaseShares } from '@/app/services/caseShare/caseShareDossierRevocation';
import { markLawsuitDossierTombstone } from '@/app/utils/lawsuitDossierTombstones';
import { commitLawsuitPersistOrWarn } from '@/app/hooks/lawsuitCommitWarn';

type ActiveFile = FileData | ExecutionFile | null;

type UseLawsuitFileMutationsOptions = {
    setLawsuitSegments: React.Dispatch<React.SetStateAction<LawsuitFileSegments>>;
    setActiveFile: React.Dispatch<React.SetStateAction<ActiveFile>>;
    userId?: string | null;
    authUserId?: string | null;
    refreshAppAlerts: () => void | Promise<void>;
    unpinWorkspaceForDeletedFile: (file: FileData) => void;
};

export function useLawsuitFileMutations({
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
            void commitLawsuitPersistOrWarn('النقل إلى المهملات', [fileId]);
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
            void commitLawsuitPersistOrWarn('الاستعادة من المهملات', [fileId]);
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
            void commitLawsuitPersistOrWarn('الأرشفة', [fileId]);
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
            void commitLawsuitPersistOrWarn('الاستعادة من الأرشيف', [fileId]);
        },
        [setLawsuitSegments, userId],
    );

    const permanentlyDeleteLawsuits = useCallback(
        (ids: Array<string | number>) => {
            const idSet = new Set(ids.map(String));
            idSet.forEach((id) => {
                void removeAllBridgedEventsForEntity('lawsuit', id, calendarUid);
                markLawsuitDossierTombstone(id);
                if (calendarUid) {
                    scheduleRevokeLawsuitCaseShares(calendarUid, id);
                }
                if (typeof id === 'string' || Number.isFinite(Number(id))) {
                    const externalId = String(id);
                    if (isLiveCloudSyncBucketEnabled('files')) {
                        void SupabaseService.deleteLawsuitFile(externalId).catch(() => undefined);
                    }
                }
            });
            setLawsuitSegments((prev) => applyLawsuitPermanentDeleteSegments(prev, ids));
            setActiveFile((cur) => (cur && idSet.has(String(cur?.id)) ? null : cur));
            void pruneOrphanedBridgeEvents(calendarUid);
            void commitLawsuitPersistOrWarn('الحذف النهائي', ids);
        },
        [calendarUid, setActiveFile, setLawsuitSegments],
    );

    const handleDeleteFile = useCallback(
        (fileToDelete: FileData) => {
            const idStr = String(fileToDelete.id);
            const isHardDelete = fileToDelete.status === 'deleted';
            if (isHardDelete) {
                void removeAllBridgedEventsForEntity('lawsuit', fileToDelete.id, calendarUid);
                markLawsuitDossierTombstone(fileToDelete.id);
                if (calendarUid) {
                    scheduleRevokeLawsuitCaseShares(calendarUid, fileToDelete.id);
                }
                if (isLiveCloudSyncBucketEnabled('files')) {
                    void SupabaseService.deleteLawsuitFile(idStr).catch(() => undefined);
                }
                setLawsuitSegments((prev) =>
                    applyLawsuitPermanentDeleteSegments(prev, [fileToDelete.id]),
                );
                void commitLawsuitPersistOrWarn('الحذف النهائي', [fileToDelete.id]);
            } else {
                setLawsuitSegments((prev) => applyLawsuitTrashSegments(prev, fileToDelete.id));
                setActiveFile((cur) => (cur && String(cur?.id) === idStr ? null : cur));
                void removeAllBridgedEventsForEntity('lawsuit', fileToDelete.id, calendarUid);
                void pruneOrphanedBridgeEvents(calendarUid);
                void commitLawsuitPersistOrWarn('النقل إلى المهملات', [fileToDelete.id]);
            }
            unpinWorkspaceForDeletedFile(fileToDelete);
            void refreshAppAlerts();
        },
        [calendarUid, refreshAppAlerts, setActiveFile, setLawsuitSegments, unpinWorkspaceForDeletedFile],
    );

    const handleRestoreFile = useCallback(
        (fileToRestore: FileData) => {
            setLawsuitSegments((prev) => {
                const next = applyLawsuitRestoreFromTrashSegments(prev, fileToRestore.id);
                const restored = findLawsuitFileInSegments(next, fileToRestore.id);
                if (restored) {
                    setActiveFile(restored);
                    syncLawsuitFileToCalendar(restored as unknown as Record<string, unknown>, userId);
                }
                return next;
            });
            void refreshAppAlerts();
            void commitLawsuitPersistOrWarn('الاستعادة من المهملات', [fileToRestore.id]);
        },
        [refreshAppAlerts, setActiveFile, setLawsuitSegments, userId],
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
