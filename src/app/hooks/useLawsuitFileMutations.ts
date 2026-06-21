import { useCallback } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    applyLawsuitArchive,
    applyLawsuitHardDeleteFilter,
    applyLawsuitPermanentDelete,
    applyLawsuitRestoreFromArchive,
    applyLawsuitRestoreFromTrash,
    applyLawsuitSoftDelete,
    applyLawsuitTrash,
    findLawsuitFile,
    persistLawsuitFiles,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import {
    pruneOrphanedBridgeEvents,
    removeAllBridgedEventsForEntity,
    syncLawsuitFileToCalendar,
} from '@/app/services/calendarDossierSync';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';

type ActiveFile = FileData | ExecutionFile | null;

type UseLawsuitFileMutationsOptions = {
    files: FileData[];
    setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
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
            setFiles((prev) => {
                const next = persistLawsuitFiles(applyLawsuitTrash(prev, fileId));
                return next;
            });
            setActiveFile((cur) => (cur && String(cur.id) === idStr ? null : cur));
            void removeAllBridgedEventsForEntity('lawsuit', fileId, calendarUid);
            void pruneOrphanedBridgeEvents(calendarUid);
            void refreshAppAlerts();
        },
        [calendarUid, refreshAppAlerts, setActiveFile, setFiles],
    );

    const restoreLawsuitFromTrash = useCallback(
        (fileId: string | number) => {
            setFiles((prev) => {
                const next = applyLawsuitRestoreFromTrash(prev, fileId);
                persistLawsuitFiles(next);
                const restored = findLawsuitFile(next, fileId);
                if (restored) {
                    syncLawsuitFileToCalendar(restored as unknown as Record<string, unknown>, userId);
                }
                return next;
            });
        },
        [setFiles, userId],
    );

    const archiveLawsuit = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setFiles((prev) => persistLawsuitFiles(applyLawsuitArchive(prev, fileId)));
            setActiveFile((cur) => (cur && String(cur.id) === idStr ? null : cur));
            void removeAllBridgedEventsForEntity('lawsuit', fileId, calendarUid);
            void pruneOrphanedBridgeEvents(calendarUid);
            void refreshAppAlerts();
        },
        [calendarUid, refreshAppAlerts, setActiveFile, setFiles],
    );

    const restoreArchivedLawsuit = useCallback(
        (fileId: string | number) => {
            setFiles((prev) => {
                const next = applyLawsuitRestoreFromArchive(prev, fileId);
                persistLawsuitFiles(next);
                const restored = findLawsuitFile(next, fileId);
                if (restored) {
                    syncLawsuitFileToCalendar(restored as unknown as Record<string, unknown>, userId);
                }
                return next;
            });
        },
        [setFiles, userId],
    );

    const permanentlyDeleteLawsuits = useCallback(
        (ids: Array<string | number>) => {
            const idSet = new Set(ids.map(String));
            idSet.forEach((id) => {
                void removeAllBridgedEventsForEntity('lawsuit', id, userId);
            });
            setFiles((prev) => persistLawsuitFiles(applyLawsuitPermanentDelete(prev, ids)));
            setActiveFile((cur) => (cur && idSet.has(String(cur?.id)) ? null : cur));
            void pruneOrphanedBridgeEvents(userId);
        },
        [setActiveFile, setFiles, userId],
    );

    /** لا حذف تلقائي من سلة المهملات — فقط حذف دائم بقرار المستخدم */

    const handleDeleteFile = useCallback(
        (fileToDelete: FileData) => {
            const isHardDelete = fileToDelete.status === 'deleted';
            if (isHardDelete) {
                void removeAllBridgedEventsForEntity('lawsuit', fileToDelete.id, userId);
                setFiles((prev) => persistLawsuitFiles(applyLawsuitHardDeleteFilter(prev, fileToDelete.id)));
            } else {
                const updated = applyLawsuitSoftDelete(fileToDelete);
                setFiles((prev) => prev.map((f) => (f.id === fileToDelete.id ? updated : f)));
                void removeAllBridgedEventsForEntity('lawsuit', fileToDelete.id, userId);
            }
            try {
                void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                    AuditLog.civil.archived({
                        caseId: fileToDelete.id,
                        caseNo: fileToDelete.caseNo || `#${fileToDelete.id}`,
                    });
                });
            } catch {
                /* silent */
            }
            unpinWorkspaceForDeletedFile(fileToDelete);
            void refreshAppAlerts();
        },
        [refreshAppAlerts, setFiles, unpinWorkspaceForDeletedFile, userId],
    );

    const handleRestoreFile = useCallback(
        (fileToRestore: FileData) => {
            const updated: FileData = { ...fileToRestore, status: 'active', deletedAt: undefined };
            setFiles((prev) => prev.map((f) => (f.id === fileToRestore.id ? updated : f)));
            setActiveFile(updated);
            try {
                void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                    AuditLog.civil.statusChanged({
                        caseId: fileToRestore.id,
                        caseNo: fileToRestore.caseNo || `#${fileToRestore.id}`,
                        fromStatus: 'محذوف',
                        toStatus: 'نشط',
                    });
                });
            } catch {
                /* silent */
            }
            void refreshAppAlerts();
        },
        [refreshAppAlerts, setActiveFile, setFiles],
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
